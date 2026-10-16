import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { ProfileForm } from "@/app/components/account/forms";
import { requireSignedInAccount } from "@/app/lib/auth/account";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="min-h-screen bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500"
        >
          Loading account…
        </main>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}

async function AccountPageContent() {
  const account = await requireSignedInAccount();

  if (account.profileError || !account.profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <section className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 sm:p-9">
          <h1 className="text-2xl font-black text-[#102d58]">
            Unable to load your account
          </h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-red-800">
            {account.profileError ??
              "Your profile is missing. Apply the Supabase database migration, then sign in again."}
          </p>
        </section>
      </main>
    );
  }

  const roleLabel = {
    buyer: "Buyer",
    seller: "Approved seller",
    administrator: "Administrator",
  }[account.profile.role];

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
                My account
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#102d58]">
                Welcome, {account.profile.display_name ?? "Market member"}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {account.user?.email ?? "Signed-in account"} · {roleLabel}
              </p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-[#102d58] hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-7">
            <h2 className="text-lg font-bold text-[#102d58]">
              Profile information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Keep your name, phone number, and Liberia location up to date.
            </p>
            <div className="mt-5">
              <ProfileForm
                values={{
                  displayName: account.profile.display_name ?? "",
                  phone: account.profile.phone ?? "",
                  location: account.profile.location ?? "",
                }}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-7">
            {account.profile.role === "buyer" && (
              <Link
                href="/sell"
                className="rounded-xl bg-[#e52b3b] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Request seller access
              </Link>
            )}
            {account.profile.role === "seller" && (
              <Link
                href="/dashboard"
                className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75]"
              >
                Seller dashboard
              </Link>
            )}
            {account.profile.role === "administrator" && (
              <Link
                href="/admin"
                className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75]"
              >
                Administrator dashboard
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
