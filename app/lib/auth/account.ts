import "server-only";

import { notFound, redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/app/lib/supabase/config";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export type AccountRole = "buyer" | "seller" | "administrator";

export type Profile = {
  id: string;
  display_name: string | null;
  phone: string | null;
  location: string | null;
  role: AccountRole;
};

export type CurrentAccount = {
  configured: boolean;
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  profileError: string | null;
};

export async function getCurrentAccount(): Promise<CurrentAccount> {
  if (!isSupabaseConfigured()) {
    return { configured: false, user: null, profile: null, profileError: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (claimsError || !userId) {
    return { configured: true, user: null, profile: null, profileError: null };
  }

  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("id, display_name, phone, location, role")
    .eq("id", userId)
    .maybeSingle();

  return {
    configured: true,
    user: {
      id: userId,
      email: typeof claims?.email === "string" ? claims.email : null,
    },
    profile: (profileData as Profile | null) ?? null,
    profileError: error?.message ?? null,
  };
}

export async function requireSignedInAccount() {
  const account = await getCurrentAccount();

  if (!account.configured || !account.user) {
    redirect("/auth/login");
  }

  return account;
}

export async function requireAdministrator() {
  const account = await requireSignedInAccount();

  if (account.profile?.role !== "administrator") {
    notFound();
  }

  return account;
}

export async function requireSellerAccount() {
  const account = await requireSignedInAccount();

  if (account.profile?.role !== "seller") {
    redirect(
      account.profile?.role === "administrator"
        ? "/admin"
        : "/sell",
    );
  }

  return account;
}
