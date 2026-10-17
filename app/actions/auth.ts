"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentAccount } from "@/app/lib/auth/account";
import type { FormState } from "@/app/lib/auth/form-state";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

const setupMessage =
  "Supabase is not configured yet. Add the project URL and publishable key to .env.local.";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254);

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(128, "Password must be 128 characters or fewer.");

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters for your display name.")
    .max(80),
  phone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(120).optional(),
});

function getAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return configuredUrl.replace(/\/$/, "");
}

function validationError(error: z.ZodError) {
  return { status: "error" as const, message: error.issues[0]?.message ?? "Check the form fields." };
}

export async function signUpAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: setupMessage };
  }

  const parsed = z
    .object({
      displayName: profileSchema.shape.displayName,
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string(),
    })
    .superRefine(({ password, confirmPassword }, context) => {
      if (password !== confirmPassword) {
        context.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Passwords do not match.",
        });
      }
    })
    .safeParse({
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/account`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "Account created. Check your email to verify your address before signing in.",
  };
}

export async function signInAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: setupMessage };
  }

  const parsed = z
    .object({ email: emailSchema, password: passwordSchema })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: "Unable to sign in. Check your email and password." };
  }

  return {
    status: "success",
    message: "Signed in. Opening your account…",
    redirectTo: "/account",
  };
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Unable to sign out: ${error.message}`);
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function sendPasswordResetAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: setupMessage };
  }

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "If an account uses that email, a password reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: setupMessage };
  }

  const parsed = z
    .object({ password: passwordSchema, confirmPassword: z.string() })
    .superRefine(({ password, confirmPassword }, context) => {
      if (password !== confirmPassword) {
        context.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Passwords do not match.",
        });
      }
    })
    .safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

  if (!parsed.success) {
    return validationError(parsed.error);
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return { status: "error", message: "Your recovery link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: error.message };
  }

  return {
    status: "success",
    message: "Password updated. Opening your account…",
    redirectTo: "/account",
  };
}

export async function updateProfileAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getCurrentAccount();
  if (!account.configured) {
    return { status: "error", message: setupMessage };
  }
  if (!account.user) {
    return { status: "error", message: "Sign in before updating your profile." };
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    phone: formData.get("phone") || undefined,
    location: formData.get("location") || undefined,
  });
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      phone: parsed.data.phone || null,
      location: parsed.data.location || null,
    })
    .eq("id", account.user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/account");
  return { status: "success", message: "Profile saved." };
}
