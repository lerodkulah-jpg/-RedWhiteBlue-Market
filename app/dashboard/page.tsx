import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireSignedInAccount } from "@/app/lib/auth/account";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-500">
          Loading dashboard…
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const account = await requireSignedInAccount();

  if (account.profileError || !account.profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <section className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6">
          <h1 className="text-2xl font-black text-[#102d58]">
            Unable to load your dashboard
          </h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
            {account.profileError ??
              "Your account profile could not be found. Apply the database migrations and try again."}
          </p>
        </section>
      </main>
    );
  }

  const isSeller = account.profile.role === "seller";
  const isAdmin = account.profile.role === "administrator";
  if (isSeller) redirect("/seller/dashboard");
  if (isAdmin) redirect("/admin/dashboard");

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
            {isAdmin ? "Administrator" : isSeller ? "Seller" : "Buyer"}
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#102d58]">
            Welcome, {account.profile.display_name ?? "Market member"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isSeller
              ? "Manage your listings, submit new products, and track review status."
              : isAdmin
                ? "Review seller applications and product listings."
                : "Save favorites and request seller access when you are ready to list products."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/messages"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-[#102d58] hover:bg-slate-50"
            >
              My messages
            </Link>
            {isSeller && (
              <>
                <Link
                  href="/dashboard/products"
                  className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75]"
                >
                  Manage listings
                </Link>
                <Link
                  href="/dashboard/products/new"
                  className="rounded-xl bg-[#e52b3b] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
                >
                  Create a listing
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75]"
              >
                Open admin review
              </Link>
            )}
            {!isSeller && !isAdmin && (
              <Link
                href="/sell"
                className="rounded-xl bg-[#e52b3b] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Request seller access
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
