import Link from "next/link";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { ProductListingForm } from "@/app/components/sell/product-listing-form";
import { SellerApplicationForm } from "@/app/components/account/forms";
import { getCurrentAccount } from "@/app/lib/auth/account";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export default function SellPage() {
  return (
    <Suspense
      fallback={
        <SellPageShell>
          <p aria-busy="true" className="text-sm font-semibold text-slate-500">
            Loading seller options…
          </p>
        </SellPageShell>
      }
    >
      <SellPageContent />
    </Suspense>
  );
}

async function SellPageContent() {
  const account = await getCurrentAccount();

  if (!account.configured) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#102d58]">
          Seller access is being set up
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Supabase is not configured yet. Add the project URL and publishable
          key to <code>.env.local</code> to enable account registration.
        </p>
      </SellPageShell>
    );
  }

  if (!account.user) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#102d58]">
          Start selling on RedWhiteBlue Market
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in or create a buyer account before requesting seller access.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75]"
        >
          Sign in to continue
        </Link>
      </SellPageShell>
    );
  }

  if (account.profileError || !account.profile) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#102d58]">
          Seller access is unavailable
        </h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
          {account.profileError ??
            "Your profile could not be found. Apply the Supabase database migration and try again."}
        </p>
      </SellPageShell>
    );
  }

  if (account.profile.role === "administrator") {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#102d58]">
          Administrator account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Seller applications are managed from the administrator dashboard.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75]"
        >
          Review seller applications
        </Link>
      </SellPageShell>
    );
  }

  if (account.profile.role === "seller") {
    const supabase = await createServerSupabaseClient();
    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (categoriesError) {
      return (
        <SellPageShell>
          <h1 className="text-3xl font-black text-[#102d58]">
            Listing tools are unavailable
          </h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
            Unable to load product categories: {categoriesError.message}
          </p>
        </SellPageShell>
      );
    }

    return (
      <SellPageShell>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
          Seller account
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#102d58]">
          Prepare a product listing
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your listing will be reviewed by an administrator before it appears
          in the public marketplace.
        </p>
        <Link
          href="/dashboard/products"
          className="mt-5 inline-flex text-sm font-bold text-[#102d58] hover:underline"
        >
          Manage your listings
        </Link>
        <div className="mt-7">
          <ProductListingForm categories={categories ?? []} />
        </div>
      </SellPageShell>
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data: application, error } = await supabase
    .from("seller_applications")
    .select("status")
    .eq("user_id", account.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#102d58]">
          Seller access is unavailable
        </h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
          {error.message}
        </p>
      </SellPageShell>
    );
  }

  return (
    <SellPageShell>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
        Seller registration
      </p>
      <h1 className="mt-2 text-3xl font-black text-[#102d58]">
        Apply to sell on RedWhiteBlue Market
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Tell us how buyers can identify and contact you. Seller access is
        reviewed before listing tools are enabled.
      </p>

      {application?.status === "pending" ? (
        <p
          role="status"
          className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          Your seller request is under review. We will enable seller access
          after an administrator reviews it.
        </p>
      ) : (
        <div className="mt-7">
          {application?.status === "rejected" && (
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              Your previous request was not approved. You may update your
              details and submit a new request.
            </p>
          )}
          <SellerApplicationForm
            values={{
              displayName: account.profile.display_name ?? "",
              phone: account.profile.phone ?? "",
              location: account.profile.location ?? "",
            }}
          />
        </div>
      )}
    </SellPageShell>
  );
}

function SellPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm font-semibold text-[#102d58] hover:underline"
        >
          ← Back to marketplace
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          {children}
        </section>
      </div>
    </main>
  );
}
