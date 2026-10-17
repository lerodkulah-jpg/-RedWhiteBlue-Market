"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startListingConversationAction } from "@/app/actions/messages";
import { initialFormState } from "@/app/lib/auth/form-state";

function StartButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-7 w-full rounded-xl bg-[#e52b3b] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Opening conversation…" : "Message seller"}
    </button>
  );
}

export function StartConversationForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(
    startListingConversationAction,
    initialFormState,
  );

  return (
    <form action={action}>
      <input type="hidden" name="productId" value={productId} />
      <StartButton />
      {state.status === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}
