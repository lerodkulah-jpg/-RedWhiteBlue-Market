"use client";

import { useState } from "react";

type PermissionState = NotificationPermission | "unsupported";

export function MessageNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState>("default");

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(await Notification.requestPermission());
  }

  if (permission === "granted") {
    return (
      <p className="text-xs font-medium text-green-700">
        Browser notifications enabled
      </p>
    );
  }
  if (permission === "denied") {
    return (
      <p className="text-xs text-slate-500">
        Browser notifications are blocked in your browser settings.
      </p>
    );
  }
  if (permission === "unsupported") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={enableNotifications}
      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-[#102d58] hover:bg-slate-50"
    >
      Enable browser notifications
    </button>
  );
}
