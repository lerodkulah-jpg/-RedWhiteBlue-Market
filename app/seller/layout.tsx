import { Suspense, type ReactNode } from "react";
import { SellerWorkspaceShell } from "@/app/components/workspace/seller-workspace-shell";
import { requireSellerAccount } from "@/app/lib/auth/account";
import {
  getSellerSubscriptionDisplay,
  getSellerSubscription,
  type SellerTrialReminder,
} from "@/app/lib/seller-subscriptions";
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
  const [{ data, error }, subscriptionResult, remindersResult, unread] =
    await Promise.all([
    supabase
      .from("seller_profiles")
      .select("display_name, business_name")
      .eq("user_id", account.user!.id)
      .maybeSingle(),
    getSellerSubscription(supabase, account.user!.id),
    supabase
      .from("seller_trial_reminders")
      .select("days_before_expiry, created_at")
      .eq("seller_id", account.user!.id)
      .order("created_at", { ascending: false })
      .limit(3),
    getSellerUnreadMessageCount(),
  ]);
  if (error) {
    throw new Error(`Unable to load seller workspace: ${error.message}`);
  }
  if (subscriptionResult.error) {
    throw new Error(
      `Unable to load seller subscription: ${subscriptionResult.error.message}`,
    );
  }
  if (remindersResult.error) {
    throw new Error(
      `Unable to load seller trial reminders: ${remindersResult.error.message}`,
    );
  }
  const name = data?.display_name || account.profile?.display_name || "Seller";
  const storeName = data?.business_name?.trim() || name;
  const subscription = getSellerSubscriptionDisplay(subscriptionResult.data);
  const trialReminders = (remindersResult.data ?? []) as SellerTrialReminder[];

  return (
    <SellerWorkspaceShell
      userId={account.user!.id}
      name={name}
      storeName={storeName}
      unreadCount={unread.count}
      unreadCountError={unread.error}
      subscription={subscription}
      trialReminders={trialReminders}
    >
      {children}
    </SellerWorkspaceShell>
  );
}
