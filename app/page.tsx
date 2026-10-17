import { Suspense } from "react";
import type { Metadata } from "next";
import HomeMarketplace from "@/app/home-marketplace";
import { getCurrentAccount } from "@/app/lib/auth/account";
import { getMarketplaceData } from "@/app/lib/marketplace";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

export const metadata: Metadata = {
  title: "RedWhiteBlue Market | Liberia Buys. Liberia Sells. Liberia Grows.",
  description:
    "Shop published listings from local sellers across Liberia. Discover electronics, fashion, home goods, vehicles, property, services, and more.",
  openGraph: {
    title: "RedWhiteBlue Market",
    description:
      "Discover local products and connect with sellers across Liberia.",
  },
};

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="min-h-screen bg-slate-50 px-4 py-12 text-center text-sm font-semibold text-slate-500"
        >
          Loading marketplace…
        </main>
      }
    >
      <MarketplacePageContent />
    </Suspense>
  );
}

async function MarketplacePageContent() {
  const [marketplace, account] = await Promise.all([
    getMarketplaceData(),
    getCurrentAccount(),
  ]);

  let initialFavorites: string[] = [];
  if (account.user && marketplace.listings.length > 0) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", account.user.id);

    if (error) {
      return (
        <HomeMarketplace
          listings={marketplace.listings}
          categoryNames={marketplace.categories}
          sellers={marketplace.sellers}
          initialFavorites={[]}
          userId={account.user.id}
          userName={account.profile?.display_name ?? null}
          loadError={error.message}
          usingSamples={marketplace.usingSamples}
        />
      );
    }

    initialFavorites = (data ?? []).map((favorite) => favorite.product_id);
  }

  return (
    <HomeMarketplace
      listings={marketplace.listings}
      categoryNames={marketplace.categories}
      sellers={marketplace.sellers}
      initialFavorites={initialFavorites}
      userId={account.user?.id ?? null}
      userName={account.profile?.display_name ?? null}
      loadError={marketplace.error}
      usingSamples={marketplace.usingSamples}
    />
  );
}
