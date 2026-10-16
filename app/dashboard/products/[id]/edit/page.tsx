import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ProductListingForm,
  type ProductFormValues,
} from "@/app/components/sell/product-listing-form";
import { requireSellerAccount } from "@/app/lib/auth/account";
import { getProductCategories, getProductImageUrl } from "@/app/lib/marketplace";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

type EditProductPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditProductPage({ params }: EditProductPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-500">
          Loading listing…
        </main>
      }
    >
      <EditProductContent params={params} />
    </Suspense>
  );
}

async function EditProductContent({ params }: EditProductPageProps) {
  const [{ id }, account] = await Promise.all([params, requireSellerAccount()]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: product, error: productError }, { data: images, error: imagesError }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, category_id, price, currency, condition, location, moderation_status",
        )
        .eq("id", id)
        .eq("seller_id", account.user!.id)
        .maybeSingle(),
      supabase
        .from("product_images")
        .select("storage_path, position")
        .eq("product_id", id)
        .order("position"),
    ]);

  if (!product && !productError) {
    notFound();
  }

  let categories: Awaited<ReturnType<typeof getProductCategories>> = [];
  let categoryError: string | null = null;
  try {
    categories = await getProductCategories();
  } catch (error) {
    categoryError =
      error instanceof Error ? error.message : "Unable to load categories.";
  }

  const productValues: ProductFormValues | null = product
    ? {
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.category_id,
        price: String(product.price),
        currency: product.currency as "USD" | "LRD",
        condition: product.condition,
        location: product.location,
      }
    : null;
  const existingImages = (images ?? []).map((image, index) => ({
    url: getProductImageUrl(image.storage_path),
    alt: `Current product image ${index + 1}`,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/products"
          className="text-sm font-semibold text-[#102d58] hover:underline"
        >
          ← Your listings
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <h1 className="text-3xl font-black text-[#102d58]">Edit listing</h1>
          {productError || imagesError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              Unable to load listing: {productError?.message ?? imagesError?.message}
            </p>
          ) : product?.moderation_status === "sold" ||
            product?.moderation_status === "archived" ? (
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Sold or archived listings can no longer be edited.
            </p>
          ) : categoryError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              {categoryError}
            </p>
          ) : productValues ? (
            <div className="mt-7">
              <ProductListingForm
                categories={categories}
                values={productValues}
                existingImages={existingImages}
              />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
