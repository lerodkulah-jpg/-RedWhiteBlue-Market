import Link from "next/link";
import { Suspense } from "react";
import { ProductListingForm } from "@/app/components/sell/product-listing-form";
import { requireSellerAccount } from "@/app/lib/auth/account";
import { getProductCategories } from "@/app/lib/marketplace";

export default function NewProductPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-500">
          Loading listing form…
        </main>
      }
    >
      <NewProductContent />
    </Suspense>
  );
}

async function NewProductContent() {
  await requireSellerAccount();
  let categories: Awaited<ReturnType<typeof getProductCategories>>;
  let categoryError: string | null = null;
  try {
    categories = await getProductCategories();
  } catch (error) {
    categories = [];
    categoryError =
      error instanceof Error ? error.message : "Unable to load categories.";
  }

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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
            Seller dashboard
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#102d58]">
            Create a product listing
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Submitted listings are reviewed before they become visible to buyers.
          </p>
          {categoryError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              {categoryError}
            </p>
          ) : categories.length === 0 ? (
            <p role="alert" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              No product categories are available. Apply the marketplace
              migration, then reload this page.
            </p>
          ) : (
            <div className="mt-7">
              <ProductListingForm categories={categories} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
