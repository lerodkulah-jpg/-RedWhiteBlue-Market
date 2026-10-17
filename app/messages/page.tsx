import Link from "next/link";
import { Suspense } from "react";
import {
  ConversationList,
  type ConversationSummary,
} from "@/app/components/messages/conversation-list";
import { requireSignedInAccount } from "@/app/lib/auth/account";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

type ConversationRow = {
  id: string;
  product_id: string;
  product_name: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
};

type MessageRow = {
  conversation_id: string;
  body: string;
  created_at: string;
  sender_id: string;
};

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="min-h-screen bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500"
        >
          Loading messages…
        </main>
      }
    >
      <MessagesPageContent />
    </Suspense>
  );
}

async function MessagesPageContent() {
  const account = await requireSignedInAccount();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, product_id, product_name, buyer_id, seller_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Unable to load your conversations: ${error.message}`);
  }

  const conversations = (data ?? []) as ConversationRow[];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const { data: messageData, error: messagesError } = conversationIds.length
    ? await supabase
        .from("messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [], error: null };

  if (messagesError) {
    throw new Error(`Unable to load recent messages: ${messagesError.message}`);
  }

  const latestMessageByConversation = new Map<string, MessageRow>();
  for (const message of (messageData ?? []) as MessageRow[]) {
    if (!latestMessageByConversation.has(message.conversation_id)) {
      latestMessageByConversation.set(message.conversation_id, message);
    }
  }
  const initialConversations: ConversationSummary[] = conversations.map(
    (conversation) => ({
      ...conversation,
      latestMessage: latestMessageByConversation.get(conversation.id) ?? null,
    }),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account"
          className="text-sm font-semibold text-[#102d58] hover:underline"
        >
          ← My account
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
            Private marketplace messages
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#102d58]">
            Your conversations
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Messages are visible only to you and the other participant. Never
            send passwords, verification codes, or advance payments.
          </p>
          <ConversationList
            initialConversations={initialConversations}
            currentUserId={account.user!.id}
          />
        </section>
      </div>
    </main>
  );
}
