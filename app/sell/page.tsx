import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { MarketBrand } from "@/app/components/market-brand";
import { SellerVerificationApplication } from "@/app/components/seller/seller-verification-application";
import { getCurrentAccount } from "@/app/lib/auth/account";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

type SellSearchParams = Promise<{ submitted?: string; saved?: string }>;

export default function SellPage({
  searchParams,
}: {
  searchParams: SellSearchParams;
}) {
  return (
    <Suspense
      fallback={
        <SellPageShell>
          <p aria-busy="true" className="text-sm font-semibold text-slate-500">
            Loading secure seller verification…
          </p>
        </SellPageShell>
      }
    >
      <SellPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SellPageContent({
  searchParams,
}: {
  searchParams: SellSearchParams;
}) {
  const params = await searchParams;
  const account = await getCurrentAccount();

  if (!account.configured) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#08275a]">Seller verification is unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Configure Supabase and apply the database migrations to enable secure seller applications.
        </p>
      </SellPageShell>
    );
  }

  if (!account.user) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#08275a]">Become a Verified Seller</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in or create a buyer account before starting seller verification.
        </p>
        <Link href="/auth/login" className="mt-6 inline-flex rounded-xl bg-[#0866f5] px-5 py-3 text-sm font-bold text-white">
          Sign in to continue
        </Link>
      </SellPageShell>
    );
  }

  if (account.profileError || !account.profile) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#08275a]">Seller verification is unavailable</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
          {account.profileError ?? "Your account profile could not be loaded."}
        </p>
      </SellPageShell>
    );
  }

  if (account.profile.role === "administrator") {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#08275a]">Administrator account</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Seller applications are reviewed in the protected admin workspace.</p>
        <Link href="/admin/sellers" className="mt-6 inline-flex rounded-xl bg-[#0866f5] px-5 py-3 text-sm font-bold text-white">
          Review seller applications
        </Link>
      </SellPageShell>
    );
  }

  const supabase = await createServerSupabaseClient();
  const [
    { data: application, error: applicationError },
    { data: authData, error: authError },
    { data: legacyApplication },
  ] = await Promise.all([
    supabase
      .from("seller_verification_applications")
      .select("id, reference, status, personal_data, business_data, operations_data, applicant_message, submitted_at")
      .eq("user_id", account.user.id)
      .maybeSingle(),
    supabase.auth.getUser(),
    supabase
      .from("seller_applications")
      .select("status")
      .eq("user_id", account.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (applicationError) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#08275a]">Seller verification is unavailable</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
          Unable to load your private verification record: {applicationError.message}
        </p>
      </SellPageShell>
    );
  }

  const documentResult = application
    ? await supabase
        .from("seller_verification_documents")
        .select("document_type")
        .eq("application_id", application.id)
    : { data: [], error: null };

  if (documentResult.error) {
    return (
      <SellPageShell>
        <h1 className="text-3xl font-black text-[#08275a]">Seller verification is unavailable</h1>
        <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
          Unable to load your private document records: {documentResult.error.message}
        </p>
      </SellPageShell>
    );
  }

  return (
    <SellPageShell>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0142f]">Seller onboarding</p>
      <h1 className="mt-2 text-3xl font-black text-[#08275a]">Become a Verified Seller</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Help us protect buyers and sellers by verifying your identity and store information.
      </p>
      {legacyApplication?.status === "pending" && !application && (
        <p className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
          Your earlier basic seller request needs to be completed through this secure verification workflow before it can be reviewed.
        </p>
      )}
      {authError || !authData.user?.email_confirmed_at ? (
        <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Verify your account email before submitting a seller application. We use the verified email already associated with your account.
        </p>
      ) : null}
      <SellerVerificationApplication
        email={authData.user?.email ?? ""}
        displayName={account.profile.display_name ?? ""}
        phone={account.profile.phone ?? ""}
        location={account.profile.location ?? ""}
        application={application as {
          id: string;
          reference: string;
          status: string;
          personal_data: Record<string, unknown>;
          business_data: Record<string, unknown>;
          operations_data: Record<string, unknown>;
          applicant_message: string | null;
          submitted_at: string | null;
        } | null}
        documentTypes={(documentResult.data ?? []).map((item) => item.document_type)}
        savedNotice={params.saved === "1"}
      />
      {params.submitted === "1" && (
        <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          Your application was submitted for review. Approval is subject to verification; seller tools remain restricted until approval.
        </p>
      )}
    </SellPageShell>
  );
}

function SellPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f3f7fd] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MarketBrand size={40} />
          <Link href="/" className="text-sm font-semibold text-[#08275a] hover:underline">
            ← Back to marketplace
          </Link>
        </div>
        <section className="mt-6 rounded-3xl border border-[#dce8f8] bg-white p-6 shadow-sm sm:p-9">
          {children}
        </section>
      </div>
    </main>
  );
}
