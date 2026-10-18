import "server-only";

import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SellerSubscription = {
  id: string;
  status: "trialing" | "active" | "expired" | "suspended" | "canceled";
  plan_id: "monthly" | "yearly" | null;
  trial_started_at: string;
  trial_ends_at: string;
  current_period_ends_at: string | null;
};

export type SellerTrialReminder = {
  days_before_expiry: 7 | 3 | 1;
  created_at: string;
};

export type SellerSubscriptionDisplay = SellerSubscription & {
  status: SellerSubscription["status"] | "expired";
  trial_days_remaining: number | null;
};

export function createSellerTrialIdentityFingerprint(identityNumber: string) {
  const pepper = process.env.SELLER_TRIAL_IDENTITY_PEPPER;
  if (!pepper || Buffer.byteLength(pepper) < 32) {
    throw new Error(
      "SELLER_TRIAL_IDENTITY_PEPPER must be configured with at least 32 bytes.",
    );
  }

  const normalizedNumber = identityNumber
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (normalizedNumber.length < 4 || normalizedNumber.length > 128) {
    throw new Error("Enter the identity document number shown on the document.");
  }

  return createHmac("sha256", pepper)
    .update(`redwhiteblue-seller-trial-id-v1:${normalizedNumber}`)
    .digest("hex");
}

export async function getSellerSubscription(
  supabase: SupabaseClient,
  sellerId: string,
) {
  return supabase
    .from("seller_subscriptions")
    .select(
      "id, status, plan_id, trial_started_at, trial_ends_at, current_period_ends_at",
    )
    .eq("seller_id", sellerId)
    .maybeSingle<SellerSubscription>();
}

export function canSellerTrade(
  subscription: SellerSubscription | null,
  now = Date.now(),
) {
  if (!subscription) {
    return false;
  }
  if (subscription.status === "trialing") {
    return new Date(subscription.trial_ends_at).getTime() > now;
  }
  return (
    subscription.status === "active" &&
    subscription.current_period_ends_at !== null &&
    new Date(subscription.current_period_ends_at).getTime() > now
  );
}

export function getSellerSubscriptionDisplay(
  subscription: SellerSubscription | null,
): SellerSubscriptionDisplay | null {
  if (!subscription) {
    return null;
  }

  const now = Date.now();
  const trialExpired =
    subscription.status === "trialing" &&
    new Date(subscription.trial_ends_at).getTime() <= now;

  return {
    ...subscription,
    status: trialExpired ? "expired" : subscription.status,
    trial_days_remaining:
      subscription.status === "trialing"
        ? Math.max(
            0,
            Math.ceil(
              (new Date(subscription.trial_ends_at).getTime() - now) /
                86_400_000,
            ),
          )
        : null,
  };
}
