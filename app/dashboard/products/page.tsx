import Link from "next/link";
import { Suspense } from "react";
import {
  ProductManagement,
  type SellerProduct,
} from "@/app/components/sell/product-management";
import { requireSellerAccount } from "@/app/lib/auth/account";
import { getProductImageUrl } from "@/app/lib/marketplace";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export default function SellerProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-500">
          Loading your listings…
        </main>
      }
    >
      <SellerProductsContent />
    </Suspense>
  );
}

async function SellerProductsContent() {
  const account = await requireSellerAccount();
  const supabase = await createServerSupabaseClient();
  const { data: productRows, error } = await supabase
    .from("products")
    .select("id, name, price, currency, moderation_status")
    .eq("seller_id", account.user!.id)
    .order("updated_at", { ascending: false });

  const productIds = (productRows ?? []).map((product) => product.id);
  const { data: imageRows, error: imageError } = productIds.length
    ? await supabase
        .from("product_images")
        .select("product_id, storage_path, position")
        .in("product_id", productIds)
        .order("position")
    : { data: [], error: null };

  const firstImageByProductId = new Map<string, string>();
  for (const image of imageRows ?? []) {
    if (!firstImageByProductId.has(image.product_id)) {
      firstImageByProductId.set(image.product_id, image.storage_path);
    }
  }
  const products: SellerProduct[] = (productRows ?? []).map((product) => {
    const imagePath = firstImageByProductId.get(product.id);
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency as "USD" | "LRD",
      moderation_status: product.moderation_status,
      image_url: imagePath ? getProductImageUrl(imagePath) : null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-[#102d58] hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-black text-[#102d58]">
              Your product listings
            </h1>
          </div>
          <Link
            href="/dashboard/products/new"
            className="rounded-xl bg-[#e52b3b] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
          >
            + Create listing
          </Link>
        </div>
        {error || imageError ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
            Unable to load your listings: {error?.message ?? imageError?.message}
          </p>
        ) : (
          <div className="mt-7">
            <ProductManagement products={products} />
          </div>
        )}
      </div>
    </main>
  );
}
