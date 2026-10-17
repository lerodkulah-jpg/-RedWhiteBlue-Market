"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendConversationMessageAction } from "@/app/actions/messages";
import { initialFormState } from "@/app/lib/auth/form-state";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, action] = useActionState(
    sendConversationMessageAction,
    initialFormState,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="message-body" className="sr-only">
        Your message
      </label>
      <textarea
        id="message-body"
        name="body"
        required
        minLength={1}
        maxLength={2000}
        rows={4}
        placeholder="Ask about the item, availability, or a safe way to meet."
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#102d58] focus:ring-2 focus:ring-blue-100"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm ${
            state.status === "error" ? "text-red-700" : "text-slate-500"
          }`}
        >
          {state.message}
        </p>
        <SendButton />
      </div>
    </form>
  );
}
