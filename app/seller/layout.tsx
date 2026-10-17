import { Suspense, type ReactNode } from "react";
import { SellerWorkspaceShell } from "@/app/components/workspace/seller-workspace-shell";
import { requireSellerAccount } from "@/app/lib/auth/account";
import { getSellerUnreadMessageCount } from "@/app/lib/workspaces";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export default function SellerWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f7fd] p-8 text-sm font-semibold text-slate-500">
          Verifying seller access…
        </main>
      }
    >
      <AuthorizedSellerWorkspace>{children}</AuthorizedSellerWorkspace>
    </Suspense>
  );
}

async function AuthorizedSellerWorkspace({
  children,
}: {
  children: ReactNode;
}) {
  const account = await requireSellerAccount();
  const supabase = await createServerSupabaseClient();
  const [{ data, error }, unread] = await Promise.all([
    supabase
      .from("seller_profiles")
      .select("display_name, business_name")
      .eq("user_id", account.user!.id)
      .maybeSingle(),
    getSellerUnreadMessageCount(),
  ]);
  if (error) {
    throw new Error(`Unable to load seller workspace: ${error.message}`);
  }
  const name = data?.display_name || account.profile?.display_name || "Seller";
  const storeName = data?.business_name?.trim() || name;

  return (
    <SellerWorkspaceShell
      userId={account.user!.id}
      name={name}
      storeName={storeName}
      unreadCount={unread.count}
      unreadCountError={unread.error}
    >
      {children}
    </SellerWorkspaceShell>
  );
}
