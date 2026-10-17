"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";
import { MessageComposer } from "@/app/components/messages/message-composer";
import { MessageNotificationPermission } from "@/app/components/messages/message-notification-permission";

export type ThreadMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function MessageThread({
  conversationId,
  currentUserId,
  isSeller,
  productName,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  isSeller: boolean;
  productName: string;
  initialMessages: ThreadMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [connectionStatus, setConnectionStatus] = useState("Connecting…");
  const [notification, setNotification] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as ThreadMessage;
          setMessages((current) =>
            current.some((item) => item.id === message.id)
              ? current
              : [...current, message].sort((a, b) =>
                  a.created_at.localeCompare(b.created_at),
                ),
          );

          if (message.sender_id !== currentUserId) {
            setNotification("New message received.");
            if (
              document.visibilityState === "hidden" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("New marketplace message", {
                body: `You have a new message about ${productName}.`,
              });
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("Live");
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionStatus("Reconnecting…");
        } else {
          setConnectionStatus("Connecting…");
        }
      });

    return () => {
      initialized.current = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, productName]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
        <p
          role="status"
          className={`text-xs font-semibold ${
            connectionStatus === "Live" ? "text-green-700" : "text-slate-500"
          }`}
        >
          {connectionStatus === "Live" ? "● Live updates on" : connectionStatus}
        </p>
        <MessageNotificationPermission />
      </div>
      <div
        ref={threadRef}
        aria-live="polite"
        className="max-h-[60vh] min-h-48 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:p-6"
      >
        {messages.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
            Start the conversation by asking a question about this listing.
          </p>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            return (
              <article
                key={message.id}
                className={`max-w-[90%] rounded-2xl p-4 shadow-sm sm:max-w-[80%] ${
                  isOwnMessage
                    ? "ml-auto bg-[#102d58] text-white"
                    : "bg-white text-slate-800"
                }`}
              >
                <p className="mb-1 text-xs font-bold opacity-75">
                  {isOwnMessage ? "You" : isSeller ? "Buyer" : "Seller"}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                  {message.body}
                </p>
                <time
                  dateTime={message.created_at}
                  className="mt-2 block text-right text-[10px] opacity-70"
                >
                  {new Date(message.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </article>
            );
          })
        )}
      </div>
      {notification && (
        <p
          role="status"
          className="border-t border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-[#102d58] sm:px-6"
        >
          {notification}
        </p>
      )}
      <div className="border-t border-slate-100 p-4 sm:p-6">
        <MessageComposer conversationId={conversationId} />
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Keep communication respectful. Never share passwords or verification
          codes, and avoid advance payments to unverified sellers.
        </p>
      </div>
    </>
  );
}
