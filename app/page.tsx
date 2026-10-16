import { Suspense } from "react";
import HomeMarketplace from "@/app/home-marketplace";
import { getCurrentAccount } from "@/app/lib/auth/account";
import { getMarketplaceData } from "@/app/lib/marketplace";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

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
          initialFavorites={[]}
          userId={account.user.id}
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
      initialFavorites={initialFavorites}
      userId={account.user?.id ?? null}
      loadError={marketplace.error}
      usingSamples={marketplace.usingSamples}
    />
  );
}
