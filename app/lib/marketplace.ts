import "server-only";

import {
  formatPrice,
  productCategories,
  products as sampleProducts,
  type MarketplaceListing,
} from "@/app/lib/products";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

type CategoryRow = { id: string; name: string };
type ProductRow = {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  category_id: string;
  price: number | string;
  currency: "USD" | "LRD";
  condition: string;
  location: string;
  moderation_status: string;
  created_at: string;
};
type SellerRow = {
  user_id: string;
  display_name: string;
  business_name: string | null;
};
type ProductImageRow = { product_id: string; storage_path: string; position: number };

export type MarketplaceSeller = {
  id: string;
  name: string;
  location: string;
  productCount: number;
};

export type MarketplaceData = {
  listings: MarketplaceListing[];
  categories: string[];
  sellers: MarketplaceSeller[];
  error: string | null;
  usingSamples: boolean;
};

const sampleListings: MarketplaceListing[] = sampleProducts.map((product) => ({
  id: String(product.id),
  sellerId: null,
  name: product.name,
  category:
    product.category === "Food & Grocery"
      ? "Food & Groceries"
      : product.category === "Beauty"
        ? "Beauty & Health"
        : product.category,
  price: product.price,
  currency: product.currency,
  location: product.location,
  emoji: product.emoji,
  color: product.color,
  condition: product.condition,
  seller: product.seller,
  featured: product.featured,
  description: product.description,
  imageUrl: null,
  moderationStatus: "sample",
  createdAt: null,
}));

export async function getProductImageUrls(paths: string[]) {
  const uniquePaths = [...new Set(paths)];
  const urlsByPath = new Map<string, string>();
  if (uniquePaths.length === 0) {
    return urlsByPath;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.storage
    .from("product-images")
    .createSignedUrls(uniquePaths, 300);

  if (error) {
    throw new Error(`Unable to create product image URLs: ${error.message}`);
  }

  for (const image of data) {
    if (image.error || !image.path || !image.signedUrl) {
      throw new Error(
        `Unable to create a product image URL: ${image.error ?? "Storage returned an invalid signed URL."}`,
      );
    }
    urlsByPath.set(image.path, image.signedUrl);
  }

  return urlsByPath;
}

export function requireProductImageUrl(
  urlsByPath: Map<string, string>,
  path: string,
) {
  const url = urlsByPath.get(path);
  if (!url) {
    throw new Error("Storage did not return a signed URL for a product image.");
  }
  return url;
}

export async function getProductCategories(): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error(`Unable to load product categories: ${error.message}`);
  }

  return (data ?? []) as CategoryRow[];
}

function rowToListing(
  product: ProductRow,
  categoryById: Map<string, string>,
  sellerById: Map<string, string>,
  imageByProductId: Map<string, string>,
  imageUrlByPath: Map<string, string>,
): MarketplaceListing {
  const firstImagePath = imageByProductId.get(product.id);
  return {
    id: product.id,
    sellerId: product.seller_id,
    name: product.name,
    category: categoryById.get(product.category_id) ?? "Other",
    price: Number(product.price),
    currency: product.currency,
    location: product.location,
    emoji: "🛍️",
    color: "from-slate-100 to-blue-100",
    condition: product.condition.replaceAll("_", " "),
    seller: sellerById.get(product.seller_id) ?? "Local seller",
    featured: false,
    description: product.description,
    imageUrl: firstImagePath
      ? requireProductImageUrl(imageUrlByPath, firstImagePath)
      : null,
    moderationStatus: product.moderation_status,
    createdAt: product.created_at,
  };
}

export async function getMarketplaceData(): Promise<MarketplaceData> {
  if (!isSupabaseConfigured()) {
    return {
      listings: sampleListings,
      categories: [...productCategories],
      sellers: [],
      error: null,
      usingSamples: true,
    };
  }

  const supabase = await createServerSupabaseClient();
  const [categoryResult, productResult] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    supabase
      .from("products")
      .select(
        "id, seller_id, name, description, category_id, price, currency, condition, location, moderation_status, created_at",
      )
      .eq("moderation_status", "published")
      .order("created_at", { ascending: false }),
  ]);

  if (categoryResult.error || productResult.error) {
    return {
      listings: [],
      categories: [...productCategories],
      sellers: [],
      error:
        categoryResult.error?.message ??
        productResult.error?.message ??
        "Unable to load marketplace listings.",
      usingSamples: false,
    };
  }

  const categoryRows = (categoryResult.data ?? []) as CategoryRow[];
  const productRows = (productResult.data ?? []) as ProductRow[];
  const sellerIds = [...new Set(productRows.map((product) => product.seller_id))];
  const productIds = productRows.map((product) => product.id);

  const [sellerResult, imageResult] =
    productRows.length > 0
      ? await Promise.all([
          supabase
            .from("seller_profiles")
            .select("user_id, display_name, business_name")
            .in("user_id", sellerIds),
          supabase
            .from("product_images")
            .select("product_id, storage_path, position")
            .in("product_id", productIds)
            .order("position"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  if (sellerResult.error || imageResult.error) {
    return {
      listings: [],
      categories: categoryRows.map((category) => category.name),
      sellers: [],
      error:
        sellerResult.error?.message ??
        imageResult.error?.message ??
        "Unable to load listing details.",
      usingSamples: false,
    };
  }

  const sellerById = new Map(
    ((sellerResult.data ?? []) as SellerRow[]).map((seller) => [
      seller.user_id,
      seller.business_name?.trim() || seller.display_name,
    ]),
  );
  const imageByProductId = new Map<string, string>();
  for (const image of (imageResult.data ?? []) as ProductImageRow[]) {
    if (!imageByProductId.has(image.product_id)) {
      imageByProductId.set(image.product_id, image.storage_path);
    }
  }
  const imageUrlByPath = await getProductImageUrls(
    [...imageByProductId.values()],
  );
  const categoryById = new Map(
    categoryRows.map((category) => [category.id, category.name]),
  );

  const listings = productRows.map((product) =>
      rowToListing(
        product,
        categoryById,
        sellerById,
        imageByProductId,
        imageUrlByPath,
      ),
    );

  const sellersById = new Map<string, MarketplaceSeller>();
  for (const listing of listings) {
    if (!listing.sellerId || !sellerById.has(listing.sellerId)) continue;
    const existing = sellersById.get(listing.sellerId);
    if (existing) {
      existing.productCount += 1;
      continue;
    }
    sellersById.set(listing.sellerId, {
      id: listing.sellerId,
      name: listing.seller,
      location: listing.location,
      productCount: 1,
    });
  }

  return {
    listings,
    categories: categoryRows.map((category) => category.name),
    sellers: [...sellersById.values()],
    error: null,
    usingSamples: false,
  };
}

export async function getProductDetails(productId: string) {
  if (!isSupabaseConfigured()) {
    const sample = sampleProducts.find(
      (product) => String(product.id) === productId,
    );
    if (!sample) {
      return null;
    }

    return {
      ...sample,
      id: String(sample.id),
      seller_id: null,
      imageUrl: null,
      imageUrls: [],
      featured: sample.featured,
      color: sample.color,
      emoji: sample.emoji,
      currency: sample.currency as "USD" | "LRD",
      formattedPrice: sample.price === null
        ? "Contact seller for price"
        : formatPrice(sample.price, sample.currency),
      moderationStatus: "sample",
    };
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, seller_id, name, description, category_id, price, currency, condition, location, moderation_status",
    )
    .eq("id", productId)
    .eq("moderation_status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load product details: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const product = data as ProductRow;
  const [categoryResult, sellerResult, imageResult] = await Promise.all([
    supabase.from("categories").select("id, name").eq("id", product.category_id).single(),
    supabase
      .from("seller_profiles")
      .select("user_id, display_name, business_name")
      .eq("user_id", product.seller_id)
      .single(),
    supabase
      .from("product_images")
      .select("product_id, storage_path, position")
      .eq("product_id", productId)
      .order("position"),
  ]);

  const errorMessage =
    categoryResult.error?.message ??
    sellerResult.error?.message ??
    imageResult.error?.message;
  if (errorMessage) {
    throw new Error(`Unable to load product details: ${errorMessage}`);
  }

  const images = (imageResult.data ?? []) as ProductImageRow[];
  const imageUrlByPath = await getProductImageUrls(
    images.map((image) => image.storage_path),
  );
  return {
    ...product,
    id: product.id,
    category: (categoryResult.data as CategoryRow).name,
    seller:
      (sellerResult.data as SellerRow).business_name?.trim() ||
      (sellerResult.data as SellerRow).display_name,
    price: Number(product.price),
    emoji: "🛍️",
    color: "from-slate-100 to-blue-100",
    featured: false,
    imageUrl: images[0]
      ? requireProductImageUrl(imageUrlByPath, images[0].storage_path)
      : null,
    imageUrls: images.map((image) =>
      requireProductImageUrl(imageUrlByPath, image.storage_path),
    ),
    formattedPrice: formatPrice(Number(product.price), product.currency),
    moderationStatus: product.moderation_status,
  };
}
