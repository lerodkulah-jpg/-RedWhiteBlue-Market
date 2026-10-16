import Link from "next/link";
import {
  SellerApplicationReview,
  type SellerApplication,
} from "@/app/components/admin/seller-application-review";
import {
  ProductModeration,
  type ModerationProduct,
} from "@/app/components/admin/product-moderation";
import {
  ListingReportReview,
  type ListingReport,
} from "@/app/components/admin/listing-report-review";
import { requireAdministrator } from "@/app/lib/auth/account";
import {
  getProductImageUrls,
  requireProductImageUrl,
} from "@/app/lib/marketplace";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export default async function AdminPage() {
  await requireAdministrator();
  const supabase = await createServerSupabaseClient();
  const [
    { data: applications, error: applicationsError },
    { data: productRows, error: productsError },
    { data: categoryRows, error: categoriesError },
    { data: reportRows, error: reportsError },
  ] = await Promise.all([
    supabase
      .from("seller_applications")
      .select(
        "id, display_name, phone, location, seller_type, business_name, status",
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, seller_id, name, description, category_id, price, currency, location",
      )
      .eq("moderation_status", "pending_review")
      .order("created_at", { ascending: true }),
    supabase.from("categories").select("id, name"),
    supabase
      .from("listing_reports")
      .select("id, product_id, reason, details, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const productIds = (productRows ?? []).map((product) => product.id);
  const sellerIds = [...new Set((productRows ?? []).map((product) => product.seller_id))];
  const [{ data: sellerRows, error: sellersError }, { data: imageRows, error: imagesError }] =
    productIds.length
      ? await Promise.all([
          supabase
            .from("seller_profiles")
            .select("user_id, display_name")
            .in("user_id", sellerIds),
          supabase
            .from("product_images")
            .select("product_id, storage_path, position")
            .in("product_id", productIds)
            .order("position"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];
  const categoryById = new Map(
    (categoryRows ?? []).map((category) => [category.id, category.name]),
  );
  const sellerById = new Map(
    (sellerRows ?? []).map((seller) => [seller.user_id, seller.display_name]),
  );
  const firstImageByProductId = new Map<string, string>();
  for (const image of imageRows ?? []) {
    if (!firstImageByProductId.has(image.product_id)) {
      firstImageByProductId.set(image.product_id, image.storage_path);
    }
  }
  const imageUrlByPath = await getProductImageUrls(
    [...firstImageByProductId.values()],
  );
  const pendingProducts: ModerationProduct[] = (productRows ?? []).map(
    (product) => {
      const imagePath = firstImageByProductId.get(product.id);
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency as "USD" | "LRD",
        location: product.location,
        category: categoryById.get(product.category_id) ?? "Other",
        seller: sellerById.get(product.seller_id) ?? "Local seller",
        imageUrl: imagePath
          ? requireProductImageUrl(imageUrlByPath, imagePath)
          : null,
      };
    },
  );
  const productLoadError =
    productsError?.message ??
    categoriesError?.message ??
    sellersError?.message ??
    imagesError?.message;
  const reportProductIds = [
    ...new Set((reportRows ?? []).map((report) => report.product_id)),
  ];
  const { data: reportedProducts, error: reportedProductsError } =
    reportProductIds.length
      ? await supabase
          .from("products")
          .select("id, name")
          .in("id", reportProductIds)
      : { data: [], error: null };
  const reportedProductNames = new Map(
    (reportedProducts ?? []).map((product) => [product.id, product.name]),
  );
  const listingReports: ListingReport[] = (reportRows ?? []).map((report) => ({
    id: report.id,
    product_id: report.product_id,
    reason: report.reason,
    details: report.details,
    created_at: report.created_at,
    product_name:
      reportedProductNames.get(report.product_id) ?? "Deleted listing",
  }));
  const reportLoadError =
    reportsError?.message ?? reportedProductsError?.message;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/account"
          className="text-sm font-semibold text-[#102d58] hover:underline"
        >
          ← Back to account
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
            Administrator
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#102d58]">
            Seller applications
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review applications before enabling seller access.
          </p>
          {applicationsError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              Unable to load seller applications: {applicationsError.message}
            </p>
          ) : (
            <div className="mt-7">
              <SellerApplicationReview
                applications={(applications ?? []) as SellerApplication[]}
              />
            </div>
          )}
        </section>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="text-2xl font-black text-[#102d58]">
            Product listings
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review seller submissions before publishing them to the marketplace.
          </p>
          {productLoadError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              Unable to load product listings: {productLoadError}
            </p>
          ) : (
            <div className="mt-7">
              <ProductModeration products={pendingProducts} />
            </div>
          )}
        </section>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="text-2xl font-black text-[#102d58]">
            Listing reports
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review safety and accuracy concerns submitted by verified users.
          </p>
          {reportLoadError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              Unable to load listing reports: {reportLoadError}
            </p>
          ) : (
            <div className="mt-7">
              <ListingReportReview reports={listingReports} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
