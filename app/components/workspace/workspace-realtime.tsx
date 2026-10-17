"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";

export function WorkspaceRealtime({
  workspace,
  userId,
}: {
  workspace: "admin" | "seller";
  userId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"connecting" | "live" | "offline">(
    "connecting",
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(`${workspace}-workspace:${userId}`);
    const tables =
      workspace === "admin"
        ? [
            ["profiles", undefined],
            ["seller_profiles", undefined],
            ["products", undefined],
            ["seller_applications", undefined],
            ["seller_verification_applications", undefined],
            ["listing_reports", undefined],
          ]
        : [
            ["products", `seller_id=eq.${userId}`],
            ["seller_profiles", `user_id=eq.${userId}`],
            ["conversations", `seller_id=eq.${userId}`],
            ["messages", undefined],
          ];

    for (const [table, filter] of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          if (refreshTimer) clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => router.refresh(), 250);
        },
      );
    }

    channel.subscribe((nextStatus) => {
      if (nextStatus === "SUBSCRIBED") {
        setStatus("live");
      } else if (
        nextStatus === "CHANNEL_ERROR" ||
        nextStatus === "TIMED_OUT" ||
        nextStatus === "CLOSED"
      ) {
        setStatus("offline");
      }
    });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [router, userId, workspace]);

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
        status === "live"
          ? "text-emerald-700"
          : status === "offline"
            ? "text-amber-700"
            : "text-slate-500"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          status === "live"
            ? "bg-emerald-500"
            : status === "offline"
              ? "bg-amber-500"
              : "animate-pulse bg-slate-400"
        }`}
      />
      {status === "live"
        ? "Live updates"
        : status === "offline"
          ? "Live updates unavailable"
          : "Connecting"}
    </span>
  );
}
