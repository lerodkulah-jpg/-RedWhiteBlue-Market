"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentAccount } from "@/app/lib/auth/account";
import type { FormState } from "@/app/lib/auth/form-state";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

const uuidSchema = z.string().uuid();

function actionError(code: string | undefined, fallback: string) {
  if (code === "42501") {
    return "Sign in with a verified email address to use marketplace messages.";
  }
  if (code === "P0002") {
    return "This listing or conversation is no longer available.";
  }
  if (code === "P0001") {
    return "You have sent several messages recently. Please wait a minute and try again.";
  }
  if (code === "22023") {
    return "Messages must contain between 1 and 2000 characters.";
  }
  return fallback;
}

export async function startListingConversationAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const productId = uuidSchema.safeParse(formData.get("productId"));
  if (!productId.success) {
    return { status: "error", message: "This listing cannot be messaged." };
  }

  const account = await getCurrentAccount();
  if (!account.configured || !account.user) {
    return {
      status: "error",
      message: "Sign in with a verified account to contact the seller.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: conversationId, error } = await supabase.rpc(
    "start_listing_conversation",
    { p_product_id: productId.data },
  );

  if (error || !conversationId) {
    return {
      status: "error",
      message: actionError(
        error?.code,
        error?.message ?? "Unable to start a conversation. Please try again.",
      ),
    };
  }

  redirect(`/messages/${conversationId}`);
}

export async function sendConversationMessageAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      conversationId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    })
    .safeParse({
      conversationId: formData.get("conversationId"),
      body: formData.get("body"),
    });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a message of 1 to 2000 characters.",
    };
  }

  const account = await getCurrentAccount();
  if (!account.configured || !account.user) {
    return {
      status: "error",
      message: "Sign in with a verified account to send messages.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("send_conversation_message", {
    p_conversation_id: parsed.data.conversationId,
    p_body: parsed.data.body,
  });

  if (error) {
    return {
      status: "error",
      message: actionError(
        error.code,
        "Unable to send your message. Please try again.",
      ),
    };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { status: "success", message: "Message sent." };
}
