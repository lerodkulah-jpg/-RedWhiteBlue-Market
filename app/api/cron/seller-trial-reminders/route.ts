import { timingSafeEqual } from "node:crypto";
import { createStorageAdminClient } from "@/app/lib/supabase/storage-admin";

const reminderDays = [7, 3, 1] as const;
const dayInMilliseconds = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  const expected = cronSecret ? `Bearer ${cronSecret}` : "";
  if (
    !cronSecret ||
    Buffer.byteLength(authorization) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(authorization), Buffer.from(expected))
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createStorageAdminClient();
  if (!supabase) {
    return Response.json(
      { error: "Server-side subscription storage is not configured." },
      { status: 500 },
    );
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  let remindersCreated = 0;

  for (const daysBeforeExpiry of reminderDays) {
    const reminderDate = todayUtc + daysBeforeExpiry * dayInMilliseconds;
    const nextDay = reminderDate + dayInMilliseconds;
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("seller_subscriptions")
      .select("id, seller_id")
      .eq("status", "trialing")
      .gte("trial_ends_at", new Date(reminderDate).toISOString())
      .lt("trial_ends_at", new Date(nextDay).toISOString());

    if (subscriptionError) {
      return Response.json(
        { error: "Unable to find upcoming seller trial expirations." },
        { status: 500 },
      );
    }

    if (!subscriptions?.length) {
      continue;
    }

    const { data: created, error: reminderError } = await supabase
      .from("seller_trial_reminders")
      .upsert(
        subscriptions.map((subscription) => ({
          subscription_id: subscription.id,
          seller_id: subscription.seller_id,
          days_before_expiry: daysBeforeExpiry,
        })),
        {
          onConflict: "subscription_id,days_before_expiry",
          ignoreDuplicates: true,
        },
      )
      .select("id");

    if (reminderError) {
      return Response.json(
        { error: "Unable to record seller trial reminders." },
        { status: 500 },
      );
    }
    remindersCreated += created?.length ?? 0;
  }

  const { data: expired, error: expirationError } = await supabase
    .from("seller_subscriptions")
    .update({ status: "expired", updated_at: now.toISOString() })
    .eq("status", "trialing")
    .lte("trial_ends_at", now.toISOString())
    .select("id");

  if (expirationError) {
    return Response.json(
      { error: "Unable to expire seller trials." },
      { status: 500 },
    );
  }

  return Response.json({
    remindersCreated,
    expiredTrials: expired?.length ?? 0,
  });
}
