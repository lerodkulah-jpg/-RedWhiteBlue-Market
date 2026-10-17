import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export const ADMIN_SECTIONS = [
  "dashboard",
  "users",
  "sellers",
  "products",
  "orders",
  "payments",
  "reports",
  "marketing",
  "settings",
] as const;

export const SELLER_SECTIONS = [
  "dashboard",
  "products",
  "orders",
  "earnings",
  "messages",
  "settings",
  "promotions",
  "support",
  "customers",
  "analytics",
  "reviews",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
export type SellerSection = (typeof SELLER_SECTIONS)[number];

type CountResult = {
  count: number | null;
  error: { message: string } | null;
};

type CountFilter = {
  column: string;
  operator: "eq" | "gte" | "lt";
  value: string;
} | {
  column: string;
  operator: "in";
  value: string[];
};

export type AdminOverview = {
  totalUsers: number | null;
  totalSellers: number | null;
  totalProducts: number | null;
  pendingApplications: number | null;
  pendingProducts: number | null;
  pendingReports: number | null;
  userWeek: number | null;
  sellerWeek: number | null;
  productWeek: number | null;
  errors: string[];
};

export type SellerProductRecord = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: "USD" | "LRD";
  location: string;
  moderation_status: string;
  created_at: string;
  imageUrl: string | null;
};

export type SellerConversationRecord = {
  id: string;
  product_name: string;
  buyer_id: string;
  updated_at: string;
  latestMessage: string | null;
  latestSenderId: string | null;
  latestMessageAt: string | null;
  unreadCount: number;
};

export async function getExactCount(
  supabase: SupabaseClient,
  table: string,
  filters: CountFilter[] = [],
): Promise<CountResult> {
  let query = supabase.from(table).select("id", {
    count: "exact",
    head: true,
  });
  for (const filter of filters) {
    if (filter.operator === "in") {
      query = query.in(filter.column, filter.value);
    } else if (filter.operator === "eq") {
      query = query.eq(filter.column, filter.value);
    } else if (filter.operator === "gte") {
      query = query.gte(filter.column, filter.value);
    } else {
      query = query.lt(filter.column, filter.value);
    }
  }
  const { count, error } = await query;
  return { count, error };
}

function collectCountErrors(
  entries: Array<[string, CountResult]>,
): string[] {
  return entries.flatMap(([label, result]) =>
    result.error ? [`Unable to load ${label}: ${result.error.message}`] : [],
  );
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createServerSupabaseClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const results = await Promise.all([
    getExactCount(supabase, "profiles"),
    getExactCount(supabase, "profiles", [
      { column: "role", operator: "eq", value: "seller" },
    ]),
    getExactCount(supabase, "products"),
    getExactCount(supabase, "seller_verification_applications", [
      {
        column: "status",
        operator: "in",
        value: ["pending_review", "under_review", "action_required"],
      },
    ]),
    getExactCount(supabase, "products", [
      { column: "moderation_status", operator: "eq", value: "pending_review" },
    ]),
    getExactCount(supabase, "listing_reports", [
      { column: "status", operator: "eq", value: "pending" },
    ]),
    getExactCount(supabase, "profiles", [
      { column: "created_at", operator: "gte", value: weekAgo },
    ]),
    getExactCount(supabase, "profiles", [
      { column: "role", operator: "eq", value: "seller" },
      { column: "created_at", operator: "gte", value: weekAgo },
    ]),
    getExactCount(supabase, "products", [
      { column: "created_at", operator: "gte", value: weekAgo },
    ]),
    getExactCount(supabase, "profiles", [
      { column: "created_at", operator: "gte", value: twoWeeksAgo },
      { column: "created_at", operator: "lt", value: weekAgo },
    ]),
    getExactCount(supabase, "profiles", [
      { column: "role", operator: "eq", value: "seller" },
      { column: "created_at", operator: "gte", value: twoWeeksAgo },
      { column: "created_at", operator: "lt", value: weekAgo },
    ]),
    getExactCount(supabase, "products", [
      { column: "created_at", operator: "gte", value: twoWeeksAgo },
      { column: "created_at", operator: "lt", value: weekAgo },
    ]),
  ]);
  const [
    users,
    sellers,
    products,
    applications,
    pendingProducts,
    reports,
    newUsers,
    newSellers,
    newProducts,
    previousUsers,
    previousSellers,
    previousProducts,
  ] = results;

  return {
    totalUsers: users.count,
    totalSellers: sellers.count,
    totalProducts: products.count,
    pendingApplications: applications.count,
    pendingProducts: pendingProducts.count,
    pendingReports: reports.count,
    userWeek:
      newUsers.count === null || previousUsers.count === null
        ? null
        : newUsers.count - previousUsers.count,
    sellerWeek:
      newSellers.count === null || previousSellers.count === null
        ? null
        : newSellers.count - previousSellers.count,
    productWeek:
      newProducts.count === null || previousProducts.count === null
        ? null
        : newProducts.count - previousProducts.count,
    errors: collectCountErrors([
      ["users", users],
      ["sellers", sellers],
      ["products", products],
      ["seller applications", applications],
      ["product moderation queue", pendingProducts],
      ["listing reports", reports],
      ["user activity", newUsers],
      ["seller activity", newSellers],
      ["product activity", newProducts],
      ["previous user activity", previousUsers],
      ["previous seller activity", previousSellers],
      ["previous product activity", previousProducts],
    ]),
  };
}

export async function getRecentAdminUsers(search: string, page: number) {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * 25;
  let query = supabase
    .from("profiles")
    .select("id, display_name, location, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + 24);
  if (search) {
    query = query.or(
      `display_name.ilike.%${search.replace(/[,%()]/g, " ")}%,location.ilike.%${search.replace(/[,%()]/g, " ")}%`,
    );
  }
  const { data, count, error } = await query;
  return { data: data ?? [], count, error };
}

export async function getAdminSellers(search: string, page: number) {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * 25;
  let query = supabase
    .from("seller_profiles")
    .select(
      "user_id, display_name, business_name, seller_type, created_at, profiles!inner(role)",
      { count: "exact" },
    )
    .eq("profiles.role", "seller")
    .order("created_at", { ascending: false })
    .range(from, from + 24);
  if (search) {
    query = query.or(
      `display_name.ilike.%${search.replace(/[,%()]/g, " ")}%,business_name.ilike.%${search.replace(/[,%()]/g, " ")}%`,
    );
  }
  const { data, count, error } = await query;
  return { data: data ?? [], count, error };
}

export async function getAdminProducts(search: string, page: number) {
  const supabase = await createServerSupabaseClient();
  const from = (page - 1) * 25;
  let query = supabase
    .from("products")
    .select(
      "id, seller_id, name, price, currency, location, moderation_status, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + 24);
  if (search) {
    query = query.or(
      `name.ilike.%${search.replace(/[,%()]/g, " ")}%,location.ilike.%${search.replace(/[,%()]/g, " ")}%`,
    );
  }
  const { data, count, error } = await query;
  return { data: data ?? [], count, error };
}

export async function getSellerProducts(
  sellerId: string,
  limit = 50,
): Promise<{ data: SellerProductRecord[]; count: number | null; error: string | null }> {
  const supabase = await createServerSupabaseClient();
  const { data, count, error } = await supabase
    .from("products")
    .select(
      "id, name, description, price, currency, location, moderation_status, created_at",
      { count: "exact" },
    )
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], count: null, error: error.message };
  }

  const rows = data ?? [];
  const productIds = rows.map((product) => product.id);
  const imageResult = productIds.length
    ? await supabase
        .from("product_images")
        .select("product_id, storage_path, position")
        .in("product_id", productIds)
        .order("position")
    : { data: [], error: null };
  if (imageResult.error) {
    return { data: [], count: null, error: imageResult.error.message };
  }

  const imagePathByProduct = new Map<string, string>();
  for (const image of imageResult.data ?? []) {
    if (!imagePathByProduct.has(image.product_id)) {
      imagePathByProduct.set(image.product_id, image.storage_path);
    }
  }
  const imageUrls = await getSellerImageUrls(
    supabase,
    [...imagePathByProduct.values()],
  );
  if (imageUrls.error) {
    return { data: [], count: null, error: imageUrls.error };
  }

  return {
    data: rows.map((product) => ({
      ...product,
      imageUrl: imagePathByProduct.has(product.id)
        ? imageUrls.urls.get(imagePathByProduct.get(product.id)!) ?? null
        : null,
    })),
    count,
    error: null,
  };
}

async function getSellerImageUrls(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  paths: string[],
) {
  const urls = new Map<string, string>();
  if (paths.length === 0) return { urls, error: null };
  const { data, error } = await supabase.storage
    .from("product-images")
    .createSignedUrls(paths, 300);
  if (error) {
    return { urls, error: `Unable to load listing photos: ${error.message}` };
  }
  for (const item of data) {
    if (item.error || !item.path || !item.signedUrl) {
      return {
        urls,
        error: `Unable to load a listing photo: ${item.error ?? "Storage returned an invalid signed URL."}`,
      };
    }
    urls.set(item.path, item.signedUrl);
  }
  return { urls, error: null };
}

export async function getSellerConversations(sellerId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, product_name, buyer_id, updated_at, seller_last_read_at")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false })
    .limit(5);
  if (error || !data?.length) {
    return {
      data: [] as SellerConversationRecord[],
      error: error?.message ?? null,
    };
  }

  const conversationDetails = await Promise.all(
    data.map(async (conversation) => {
      const [latestResult, unreadResult] = await Promise.all([
        supabase
          .from("messages")
          .select("body, sender_id, created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversation.id)
          .neq("sender_id", sellerId)
          .gt("created_at", conversation.seller_last_read_at),
      ]);
      return { conversation, latestResult, unreadResult };
    }),
  );
  const messageError = conversationDetails.find(
    ({ latestResult, unreadResult }) =>
      latestResult.error || unreadResult.error,
  );
  if (messageError) {
    return {
      data: [] as SellerConversationRecord[],
      error:
        messageError.latestResult.error?.message ??
        messageError.unreadResult.error?.message ??
        "Unable to load conversation messages.",
    };
  }

  return {
    data: conversationDetails.map(
      ({ conversation, latestResult, unreadResult }) => ({
        id: conversation.id,
        product_name: conversation.product_name,
        buyer_id: conversation.buyer_id,
        updated_at: conversation.updated_at,
        latestMessage: latestResult.data?.body ?? null,
        latestSenderId: latestResult.data?.sender_id ?? null,
        latestMessageAt: latestResult.data?.created_at ?? null,
        unreadCount: unreadResult.count ?? 0,
      }),
    ),
    error: null,
  };
}

export async function getSellerUnreadMessageCount(): Promise<{
  count: number | null;
  error: string | null;
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc(
    "get_seller_unread_message_count",
  );
  if (error) {
    return { count: null, error: error.message };
  }
  const count = Number(data);
  return Number.isSafeInteger(count) && count >= 0
    ? { count, error: null }
    : { count: null, error: "The unread message total is invalid." };
}
