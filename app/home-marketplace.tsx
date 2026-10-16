
"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPrice, type MarketplaceListing } from "@/app/lib/products";
import { toggleFavoriteAction } from "@/app/actions/products";
import { ProductPhoto } from "@/app/components/product-photo";

const categoryIcons: Record<string, string> = {
  "All Products": "🛍️",
  Electronics: "📱",
  Fashion: "👕",
  Vehicles: "🚗",
  "Home & Living": "🏠",
  Property: "🏡",
  "Food & Grocery": "🥬",
  Beauty: "💄",
  Agriculture: "🌱",
  Services: "🧰",
  Other: "📦",
};

export default function Home({
  listings,
  categoryNames,
  initialFavorites,
  userId,
  loadError,
  usingSamples,
}: {
  listings: MarketplaceListing[];
  categoryNames: string[];
  initialFavorites: string[];
  userId: string | null;
  loadError: string | null;
  usingSamples: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "USD" | "LRD">("all");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const [notice, setNotice] = useState("");
  const [isSavingFavorite, startSavingFavorite] = useTransition();
  const router = useRouter();
  const categories = [
    { name: "All Products", icon: categoryIcons["All Products"] },
    ...categoryNames.map((name) => ({
      name,
      icon: categoryIcons[name] ?? categoryIcons.Other,
    })),
  ];

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter((product) => {
      const matchesCategory =
        activeCategory === "All Products" ||
        product.category === activeCategory;
      const matchesCurrency =
        currencyFilter === "all" || product.currency === currencyFilter;

      const matchesSearch =
        !query ||
        [
          product.name,
          product.category,
          product.location,
          product.seller,
        ].some((value) => value.toLowerCase().includes(query));

      return matchesCategory && matchesCurrency && matchesSearch;
    });
  }, [search, activeCategory, currencyFilter, listings]);

  function toggleFavorite(id: string) {
    if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      setNotice("Sign in to save published listings to your favorites.");
      return;
    }

    startSavingFavorite(async () => {
      const result = await toggleFavoriteAction(id);
      if (!result.success) {
        setNotice(result.message ?? "Unable to update favorites.");
        return;
      }

      setFavorites((current) =>
        result.isFavorite
          ? [...new Set([...current, id])]
          : current.filter((favoriteId) => favoriteId !== id),
      );
      router.refresh();
    });
  }

  function selectCategory(category: string) {
    setActiveCategory(category);
    setMobileMenu(false);
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Announcement bar */}
      <div className="bg-[#102d58] px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
        <span className="mr-2">🇱🇷</span>
        Proudly serving Liberia — Shop local, support local!
      </div>

      {/* Brand header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="#" className="flex shrink-0 items-center gap-2.5">
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-[#102d58] text-2xl shadow-sm">
              <span className="absolute left-0 top-0 h-1/3 w-full bg-[#e52b3b]" />
              <span className="absolute bottom-0 left-0 h-1/3 w-full bg-white" />
              <span className="relative z-10">★</span>
            </div>
            <div>
              <div className="text-base font-black tracking-tight sm:text-xl">
                <span className="text-[#102d58]">RedWhiteBlue</span>
                <span className="text-[#e52b3b]"> Market</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-slate-500 sm:text-xs">
                Liberia&apos;s Marketplace
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex">
            <a href="#home" className="text-[#102d58] hover:text-[#e52b3b]">
              Home
            </a>
            <a href="#categories" className="hover:text-[#e52b3b]">
              Categories
            </a>
            <a href="#products" className="hover:text-[#e52b3b]">
              Marketplace
            </a>
            <a href="#how-it-works" className="hover:text-[#e52b3b]">
              How it works
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href={userId ? "/dashboard" : "/auth/login"}
              className="rounded-xl px-3 py-2 text-sm font-bold text-[#102d58] hover:bg-slate-100"
            >
              {userId ? "Dashboard" : "Sign in"}
            </Link>
            {!userId && (
              <Link
                href="/auth/signup"
                className="rounded-xl px-3 py-2 text-sm font-bold text-[#102d58] hover:bg-slate-100"
              >
                Sign up
              </Link>
            )}
            <Link
              href="/sell"
              className="rounded-xl bg-[#e52b3b] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              + Sell an item
            </Link>
          </div>

          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>

        {mobileMenu && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm font-semibold">
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#home" onClick={() => setMobileMenu(false)}>Home</a>
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#categories" onClick={() => setMobileMenu(false)}>Categories</a>
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#products" onClick={() => setMobileMenu(false)}>Marketplace</a>
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a>
              <Link className="rounded-lg p-3 hover:bg-slate-50" href={userId ? "/dashboard" : "/auth/login"} onClick={() => setMobileMenu(false)}>{userId ? "Dashboard" : "Sign in"}</Link>
              {!userId && <Link className="rounded-lg p-3 hover:bg-slate-50" href="/auth/signup" onClick={() => setMobileMenu(false)}>Sign up</Link>}
              <Link className="mt-2 rounded-lg bg-[#e52b3b] p-3 text-left text-white" href="/sell" onClick={() => setMobileMenu(false)}>+ Sell an item</Link>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden bg-[#102d58]">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-red-500/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white sm:text-sm">
              <span>🇱🇷</span>
              <span>Made for Liberia. Open to every Liberian.</span>
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-[1.12] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Liberia&apos;s marketplace.
              <span className="mt-2 block text-[#ff5967]">
                Your next great find.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-blue-100 sm:text-lg">
              Buy, sell, and discover amazing deals from local sellers across
              Liberia. One marketplace. Endless possibilities.
            </p>

            <form
              className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                document.getElementById("products")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              <span className="hidden items-center pl-3 text-xl sm:flex">
                🔎
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="What are you looking for?"
                aria-label="Search products"
                className="min-w-0 flex-1 rounded-xl px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#e52b3b] px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Search products
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-blue-100 sm:text-sm">
              <span>✓ Easy discovery</span>
              <span>✓ Local sellers</span>
              <span>✓ Liberia-wide listings</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -right-3 -top-3 h-full w-full rounded-4xl border-2 border-[#e52b3b]/60 sm:-right-5 sm:-top-5" />
            <div className="relative overflow-hidden rounded-4xl bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    The local marketplace
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[#102d58]">
                    Discover something great
                  </h2>
                </div>
                <span className="text-3xl">🛍️</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: "📱", name: "Electronics", color: "bg-blue-50" },
                  { icon: "👟", name: "Fashion", color: "bg-rose-50" },
                  { icon: "🏡", name: "Property", color: "bg-green-50" },
                  { icon: "🚲", name: "Vehicles", color: "bg-amber-50" },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => selectCategory(item.name)}
                    className={`${item.color} rounded-2xl p-4 text-left transition hover:-translate-y-1 hover:shadow-md`}
                  >
                    <span className="text-3xl">{item.icon}</span>
                    <p className="mt-3 text-sm font-bold text-[#102d58]">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Explore listings →
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#102d58] p-4 text-white">
                <span className="text-3xl">🤝</span>
                <div>
                  <p className="text-sm font-bold">Support local businesses</p>
                  <p className="mt-1 text-xs text-blue-100">
                    Help Liberia grow, one purchase at a time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { icon: "🇱🇷", title: "Built for Liberia", text: "Local products and communities" },
            { icon: "📍", title: "Find it nearby", text: "Discover sellers by location" },
            { icon: "🤝", title: "Buy and sell", text: "Connect with local sellers" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-[#102d58]">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
              Browse and discover
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102d58] sm:text-3xl">
              Shop by category
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Find exactly what you need.
            </p>
          </div>
          <button
            onClick={() => selectCategory("All Products")}
            className="text-sm font-bold text-[#102d58] hover:text-[#e52b3b]"
          >
            View all products →
          </button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category) => {
            const active = activeCategory === category.name;

            return (
              <button
                key={category.name}
                onClick={() => selectCategory(category.name)}
                className={`flex min-h-28 flex-col items-center justify-center rounded-2xl border p-3 text-center transition hover:-translate-y-1 hover:shadow-md ${
                  active
                    ? "border-[#102d58] bg-[#102d58] text-white shadow-md"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                }`}
              >
                <span className="text-3xl">{category.icon}</span>
                <span className="mt-3 text-xs font-bold leading-4">
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Products */}
      <section id="products" className="scroll-mt-24 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
                Find your next favorite
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102d58] sm:text-3xl">
                Explore the marketplace
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {usingSamples
                  ? "Sample listings from across Liberia."
                  : "Published listings from sellers across Liberia."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="currency" className="text-sm font-semibold text-slate-600">
                Filter by currency
              </label>
              <select
                id="currency"
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value as "all" | "USD" | "LRD")}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-[#102d58] outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All currencies</option>
                <option value="USD">USD ($)</option>
                <option value="LRD">LRD (L$)</option>
              </select>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  activeCategory === category.name
                    ? "bg-[#102d58] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-[#102d58]"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {search && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">
                Results for <strong>&quot;{search}&quot;</strong>
              </p>
              <button
                onClick={() => setSearch("")}
                className="text-sm font-bold text-[#e52b3b]"
              >
                Clear search ✕
              </button>
            </div>
          )}

          <p className="mt-5 text-xs text-slate-500">
            Showing {filteredProducts.length}{" "}
            {filteredProducts.length === 1 ? "listing" : "listings"}
          </p>

          {loadError ? (
            <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              Unable to load marketplace listings: {loadError}
            </p>
          ) : filteredProducts.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                >
                  <div
                    className={`relative flex aspect-4/3 items-center justify-center bg-linear-to-br ${product.color}`}
                  >
                    <ProductPhoto
                      src={product.imageUrl}
                      alt={product.name}
                      fallback={product.emoji}
                      imageClassName="h-full w-full object-cover"
                      fallbackClassName="select-none text-6xl transition duration-300 group-hover:scale-110 sm:text-7xl"
                    />

                    <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[10px] font-bold text-[#102d58] shadow-sm sm:left-3 sm:top-3">
                      {product.condition}
                    </span>

                    {product.featured && (
                      <span className="absolute bottom-2 left-2 rounded-md bg-[#e52b3b] px-2 py-1 text-[10px] font-bold text-white sm:bottom-3 sm:left-3">
                        Featured
                      </span>
                    )}

                    <button
                      onClick={() => toggleFavorite(product.id)}
                      aria-label={
                        favorites.includes(product.id)
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      aria-pressed={favorites.includes(product.id)}
                      disabled={isSavingFavorite}
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow-sm transition hover:scale-110 sm:right-3 sm:top-3"
                    >
                      {favorites.includes(product.id) ? "❤️" : "♡"}
                    </button>
                  </div>

                  <div className="p-3 sm:p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
                      {product.category}
                    </p>
                    <h3 className="mt-1.5 min-h-10 text-sm font-bold leading-5 text-slate-800 sm:text-base">
                      {product.name}
                    </h3>

                    <p className="mt-2 text-lg font-black text-[#102d58] sm:text-xl">
                      {formatPrice(product.price, product.currency)}
                    </p>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="truncate text-xs font-semibold text-slate-600">
                        🏪 {product.seller}
                      </p>
                      <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-4 text-slate-400 sm:text-xs">
                        <span>📍</span>
                        <span>{product.location}</span>
                      </p>
                    </div>

                    <Link
                      href={`/products/${product.id}`}
                      className="mt-4 block w-full rounded-xl border border-[#102d58] py-2.5 text-center text-xs font-bold text-[#102d58] transition hover:bg-[#102d58] hover:text-white sm:text-sm"
                    >
                      View details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-16 text-center">
              <span className="text-5xl">🔎</span>
              <h3 className="mt-4 text-lg font-bold text-[#102d58]">
                No products found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search or select a different category.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All Products");
                }}
                className="mt-5 rounded-xl bg-[#e52b3b] px-5 py-3 text-sm font-bold text-white hover:bg-red-700"
              >
                Show all products
              </button>
            </div>
          )}

          {usingSamples && (
            <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              <strong>Sample listings:</strong> Connect Supabase and apply the
              database migrations to display approved seller listings. Prices
              and product details should be confirmed with sellers.
            </p>
          )}
        </div>
      </section>

      {/* Seller call to action */}
      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 overflow-hidden rounded-3xl bg-[#102d58] p-6 text-white sm:p-10 lg:flex-row lg:items-center lg:p-12">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-300">
              Your business belongs here
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
              Have something to sell?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">
              Bring your products to a marketplace designed for Liberia.
              Connect with buyers and help local businesses grow.
            </p>
          </div>
          <Link
            href="/sell"
            className="shrink-0 rounded-xl bg-[#e52b3b] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-red-700"
          >
            Start selling →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
              Simple and straightforward
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102d58] sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              A simple way to discover products and connect with local sellers.
            </p>
          </div>

          <div className="mt-9 grid gap-5 sm:grid-cols-3">
            {[
              {
                number: "01",
                icon: "🔍",
                title: "Find a product",
                text: "Browse categories or search for items you need.",
              },
              {
                number: "02",
                icon: "📍",
                title: "Find a seller",
                text: "Check the listing and the seller's location.",
              },
              {
                number: "03",
                icon: "🤝",
                title: "Connect and buy",
                text: "Contact the seller to discuss the item and arrange a safe transaction.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="text-sm font-black text-red-300">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#102d58]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#091e3d] text-white">
        <div className="mx-auto grid max-w-7xl gap-9 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="md:col-span-2">
            <a href="#home" className="inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl text-[#102d58]">
                ★
              </span>
              <span className="text-lg font-black">
                RedWhiteBlue <span className="text-red-400">Market</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-200">
              A marketplace concept dedicated to helping Liberians discover
              products and connect with local sellers.
            </p>
            <p className="mt-4 text-sm font-semibold text-white">
              🇱🇷 Liberia Buys. Liberia Sells. Liberia Grows.
            </p>
          </div>

          <div>
            <h3 className="font-bold">Explore</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-blue-200">
              <a href="#categories" className="hover:text-white">Categories</a>
              <a href="#products" className="hover:text-white">Marketplace</a>
              <a href="#how-it-works" className="hover:text-white">How it works</a>
            </div>
          </div>

          <div>
            <h3 className="font-bold">Our mission</h3>
            <p className="mt-4 text-sm leading-6 text-blue-200">
              Support local commerce, make products easier to discover, and
              create new opportunities for businesses throughout Liberia.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-blue-200">
          &copy; 2026 RedWhiteBlue Market. Built with pride for Liberia.
        </div>
      </footer>

      {/* Feedback messages */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:bottom-6"
        >
          <span className="text-xl">ℹ️</span>
          <p className="flex-1 text-sm leading-6 text-slate-700">{notice}</p>
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
            className="rounded-lg px-2 py-1 font-bold text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  );
}
