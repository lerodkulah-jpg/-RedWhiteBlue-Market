"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/app/lib/supabase/client";
import { MessageNotificationPermission } from "@/app/components/messages/message-notification-permission";

type RecentMessage = {
  body: string;
  created_at: string;
  sender_id: string;
};

export type ConversationSummary = {
  id: string;
  product_id: string;
  product_name: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  latestMessage: RecentMessage | null;
};

type RealtimeMessage = RecentMessage & { conversation_id: string };

export function ConversationList({
  initialConversations,
  currentUserId,
}: {
  initialConversations: ConversationSummary[];
  currentUserId: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [notification, setNotification] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Connecting…");
  const [newConversationIds, setNewConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const knownConversationIds = useRef(
    new Set(initialConversations.map((conversation) => conversation.id)),
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`message-inbox:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id?: string };
            if (deleted.id) {
              knownConversationIds.current.delete(deleted.id);
              setConversations((current) =>
                current.filter((conversation) => conversation.id !== deleted.id),
              );
            }
            return;
          }

          const updated = payload.new as Omit<
            ConversationSummary,
            "latestMessage"
          >;
          setConversations((current) => {
            const existing = current.find(
              (conversation) => conversation.id === updated.id,
            );
            knownConversationIds.current.add(updated.id);
            const next = existing
              ? current.map((conversation) =>
                  conversation.id === updated.id
                    ? { ...conversation, ...updated }
                    : conversation,
                )
              : [{ ...updated, latestMessage: null }, ...current];
            return next
              .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
              .slice(0, 50);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const message = payload.new as RealtimeMessage;
          const latestMessage = {
            body: message.body,
            created_at: message.created_at,
            sender_id: message.sender_id,
          };
          setConversations((current) => {
            const existing = current.find(
              (conversation) =>
                conversation.id === message.conversation_id,
            );
            if (!existing) {
              return current;
            }
            return [
              {
                ...existing,
                updated_at: message.created_at,
                latestMessage,
              },
              ...current.filter(
                (conversation) =>
                  conversation.id !== message.conversation_id,
              ),
            ];
          });
          if (!knownConversationIds.current.has(message.conversation_id)) {
            void supabase
              .from("conversations")
              .select(
                "id, product_id, product_name, buyer_id, seller_id, updated_at",
              )
              .eq("id", message.conversation_id)
              .maybeSingle()
              .then(({ data, error }) => {
                  if (error) {
                    setNotification(
                      "A new message arrived, but the conversation could not be loaded. Refresh your inbox.",
                    );
                    return;
                  }
                  if (!data) return;
                  knownConversationIds.current.add(data.id);
                  setConversations((latest) =>
                    latest.some((item) => item.id === data.id)
                      ? latest
                      : [
                          {
                            ...data,
                            latestMessage,
                          },
                          ...latest,
                        ]
                          .sort((a, b) =>
                            b.updated_at.localeCompare(a.updated_at),
                          )
                          .slice(0, 50),
                  );
                });
          }

          if (message.sender_id !== currentUserId) {
            setNewConversationIds((current) =>
              new Set(current).add(message.conversation_id),
            );
            setNotification("You have a new message.");
            if (
              document.visibilityState === "hidden" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("New marketplace message", {
                body: "Open your messages to read the new reply.",
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
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
        <p className="text-xs text-slate-600">
          {connectionStatus === "Live"
            ? "● Inbox updates live"
            : connectionStatus}
        </p>
        <MessageNotificationPermission />
      </div>
      {notification && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold text-[#102d58]"
        >
          {notification}
        </p>
      )}
      {conversations.length === 0 ? (
        <p className="mt-7 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
          You have no conversations yet. Open a published listing and choose
          Message seller to start one.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100">
          {conversations.map((conversation) => {
            const latest = conversation.latestMessage;
            const otherParty =
              conversation.seller_id === currentUserId ? "Buyer" : "Seller";
            const isNew = newConversationIds.has(conversation.id);
            return (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="block rounded-xl px-3 py-4 transition hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-bold text-[#102d58]">
                    {conversation.product_name}
                  </h2>
                  <span className="text-xs text-slate-500">{otherParty}</span>
                </div>
                <p
                  className={`mt-1 truncate text-sm ${
                    isNew ? "font-bold text-[#102d58]" : "text-slate-600"
                  }`}
                >
                  {latest?.body ?? "Conversation started"}
                  {isNew && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                      New
                    </span>
                  )}
                </p>
                <time
                  dateTime={latest?.created_at ?? conversation.updated_at}
                  className="mt-1 block text-xs text-slate-400"
                >
                  {new Date(
                    latest?.created_at ?? conversation.updated_at,
                  ).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "UTC",
                  })}{" "}
                  UTC
                </time>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
