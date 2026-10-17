import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  MessageThread,
  type ThreadMessage,
} from "@/app/components/messages/message-thread";
import { requireSignedInAccount } from "@/app/lib/auth/account";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

type ConversationRow = {
  id: string;
  product_name: string;
  buyer_id: string;
  seller_id: string;
};

type ConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default function ConversationPage({ params }: ConversationPageProps) {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="min-h-screen bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500"
        >
          Loading conversation…
        </main>
      }
    >
      <ConversationPageContent params={params} />
    </Suspense>
  );
}

async function ConversationPageContent({ params }: ConversationPageProps) {
  const [{ id }, account] = await Promise.all([
    params,
    requireSignedInAccount(),
  ]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const { data: conversationData, error: conversationError } = await supabase
    .from("conversations")
    .select("id, product_name, buyer_id, seller_id")
    .eq("id", id)
    .maybeSingle();

  if (conversationError) {
    throw new Error(`Unable to load conversation: ${conversationError.message}`);
  }
  if (!conversationData) {
    notFound();
  }

  const conversation = conversationData as ConversationRow;
  const { error: markReadError } = await supabase.rpc(
    "mark_conversation_read",
    { p_conversation_id: id },
  );
  if (markReadError) {
    throw new Error(`Unable to update conversation read status: ${markReadError.message}`);
  }
  const { data: messageData, error: messagesError } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (messagesError) {
    throw new Error(`Unable to load messages: ${messagesError.message}`);
  }

  const messages = ((messageData ?? []) as ThreadMessage[]).reverse();
  const isSeller = conversation.seller_id === account.user!.id;
  const otherParty = isSeller ? "buyer" : "seller";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/messages"
          className="text-sm font-semibold text-[#102d58] hover:underline"
        >
          ← All conversations
        </Link>
        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#e52b3b]">
              Private conversation with the {otherParty}
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#102d58]">
              {conversation.product_name}
            </h1>
          </header>
          <MessageThread
            conversationId={conversation.id}
            currentUserId={account.user!.id}
            isSeller={isSeller}
            productName={conversation.product_name}
            initialMessages={messages}
          />
        </section>
      </div>
    </main>
  );
}
