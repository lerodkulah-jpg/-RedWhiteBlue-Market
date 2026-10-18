"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  Dumbbell,
  Heart,
  HeartPulse,
  House,
  Laptop,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  Shirt,
  ShoppingBasket,
  Sprout,
  Store,
  Truck,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { ProductPhoto } from "@/app/components/product-photo";
import { MarketBrand } from "@/app/components/market-brand";
import { PwaInstallButton } from "@/app/components/pwa-install-button";
import { toggleFavoriteAction } from "@/app/actions/products";
import { signOutAction } from "@/app/actions/auth";
import type { MarketplaceSeller } from "@/app/lib/marketplace";
import { formatPrice, type MarketplaceListing } from "@/app/lib/products";

const categoryIcons: Record<string, LucideIcon> = {
  Electronics: Laptop,
  Fashion: Shirt,
  Vehicles: CarFront,
  "Home & Living": House,
  Property: House,
  "Food & Groceries": ShoppingBasket,
  "Food & Grocery": ShoppingBasket,
  "Beauty & Health": HeartPulse,
  Beauty: HeartPulse,
  "Sports & Outdoors": Dumbbell,
  Jobs: BriefcaseBusiness,
  Agriculture: Sprout,
  Services: Wrench,
  Other: Store,
};

const trustPoints = [
  { icon: ShieldCheck, title: "Secure accounts", detail: "Protected sign-in and private conversations." },
  { icon: BadgeCheck, title: "Approved sellers", detail: "Seller access is reviewed before listings go live." },
  { icon: MessageCircle, title: "Talk to sellers", detail: "Ask questions before arranging a purchase." },
  { icon: MapPin, title: "Liberia-wide", detail: "Browse published listings from local sellers." },
];

export default function HomeMarketplace({
  listings,
  categoryNames,
  sellers,
  initialFavorites,
  userId,
  userName,
  loadError,
  usingSamples,
}: {
  listings: MarketplaceListing[];
  categoryNames: string[];
  sellers: MarketplaceSeller[];
  initialFavorites: string[];
  userId: string | null;
  userName: string | null;
  loadError: string | null;
  usingSamples: boolean;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [currencyFilter, setCurrencyFilter] = useState<"all" | "USD" | "LRD">("all");
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "price-low" | "price-high">("newest");
  const [activeSeller, setActiveSeller] = useState<string | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [notice, setNotice] = useState("");
  const [isSavingFavorite, startSavingFavorite] = useTransition();
  const router = useRouter();
  const categories = [...new Set(categoryNames)].map((name) => ({
    name,
    icon: categoryIcons[name] ?? Store,
  }));

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minimumPrice === "" ? null : Number(minimumPrice);
    const maximum = maximumPrice === "" ? null : Number(maximumPrice);
    const filtered = listings.filter((product) => {
      const matchesCategory =
        activeCategory === "All Products" || product.category === activeCategory;
      const matchesCurrency =
        currencyFilter === "all" || product.currency === currencyFilter;
      const matchesPrice =
        (minimum === null && maximum === null) ||
        (currencyFilter !== "all" &&
          product.price !== null &&
          (minimum === null || product.price >= minimum) &&
          (maximum === null || product.price <= maximum));
      const matchesLocation =
        !locationFilter ||
        product.location.toLowerCase().includes(locationFilter.trim().toLowerCase());
      const matchesSeller = !activeSeller || product.sellerId === activeSeller;
      const matchesSearch =
        !query ||
        [product.name, product.category, product.location, product.seller].some(
          (value) => value.toLowerCase().includes(query),
        );
      return (
        matchesCategory &&
        matchesCurrency &&
        matchesPrice &&
        matchesLocation &&
        matchesSeller &&
        matchesSearch
      );
    });
    if (sortOrder === "price-low") {
      filtered.sort(
        (a, b) =>
          a.currency.localeCompare(b.currency) ||
          (a.price === null ? (b.price === null ? 0 : 1) : b.price === null ? -1 : a.price - b.price),
      );
    } else if (sortOrder === "price-high") {
      filtered.sort(
        (a, b) =>
          a.currency.localeCompare(b.currency) ||
          (a.price === null ? (b.price === null ? 0 : 1) : b.price === null ? -1 : b.price - a.price),
      );
    } else if (filtered.some((product) => product.createdAt)) {
      filtered.sort(
        (a, b) =>
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    }
    return filtered;
  }, [
    search,
    activeCategory,
    currencyFilter,
    listings,
    minimumPrice,
    maximumPrice,
    locationFilter,
    activeSeller,
    sortOrder,
  ]);

  function toggleFavorite(id: string) {
    if (
      !userId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
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
    setActiveSeller(null);
    setMobileMenu(false);
    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const hasPriceRange = minimumPrice !== "" || maximumPrice !== "";

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <MarketBrand size={40} large />

          <nav className="hidden items-center gap-4 text-xs font-bold text-slate-600 md:flex lg:gap-6 lg:text-sm">
            <a href="#home" className="flex items-center gap-1.5 text-[#102d58] hover:text-[#e52b3b]">
              <House size={15} /> Home
            </a>
            <a href="#products" className="flex items-center gap-1.5 hover:text-[#e52b3b]">
              <ShoppingBasket size={15} /> Shop
            </a>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-[#e52b3b]">
                <PackageCheck size={15} /> Categories <ChevronDown size={13} className="transition group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 top-full z-50 mt-3 grid w-64 grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {categories.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectCategory(name)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#102d58]"
                  >
                    <Icon size={15} /> {name}
                  </button>
                ))}
              </div>
            </details>
            <Link href="/sell" className="flex items-center gap-1.5 hover:text-[#e52b3b]">
              <Store size={15} /> Sell
            </Link>
            <a href="#help-support" className="flex items-center gap-1.5 hover:text-[#e52b3b]">
              <CircleHelp size={15} /> Help
            </a>
          </nav>

          <div className="hidden items-center gap-1 sm:flex">
            <a
              href="#market-search"
              aria-label="Search products"
              className="rounded-full p-2.5 text-[#102d58] transition hover:bg-slate-100"
            >
              <Search size={19} />
            </a>
            {userId ? (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#102d58] hover:bg-slate-100 sm:text-sm">
                  <UserRound size={16} />
                  <span className="max-w-28 truncate">{userName || "My account"}</span>
                  <ChevronDown size={14} className="transition group-open:rotate-180" />
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <Link href="/account" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">My account</Link>
                  <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Dashboard</Link>
                  <Link href="/messages" className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">My messages</Link>
                  <form action={signOutAction}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50">
                      <LogOut size={15} /> Sign out
                    </button>
                  </form>
                </div>
              </details>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-full px-3 py-2 text-xs font-bold text-[#102d58] transition hover:bg-slate-100 sm:text-sm"
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-full bg-[#102d58] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-950 sm:text-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenu((open) => !open)}
            className="rounded-lg border border-slate-200 p-2.5 text-[#102d58] sm:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileMenu && (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 sm:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm font-semibold">
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#home" onClick={() => setMobileMenu(false)}>Home</a>
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#products" onClick={() => setMobileMenu(false)}>Shop</a>
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#categories" onClick={() => setMobileMenu(false)}>Categories</a>
              <Link className="rounded-lg p-3 hover:bg-slate-50" href="/sell" onClick={() => setMobileMenu(false)}>Sell on RedWhiteBlue</Link>
              <a className="rounded-lg p-3 hover:bg-slate-50" href="#help-support" onClick={() => setMobileMenu(false)}>Help and support</a>
              {userId ? (
                <>
                  <Link className="rounded-lg p-3 hover:bg-slate-50" href="/account" onClick={() => setMobileMenu(false)}>My account</Link>
                  <Link className="rounded-lg p-3 hover:bg-slate-50" href="/messages" onClick={() => setMobileMenu(false)}>My messages</Link>
                  <form action={signOutAction}>
                    <button type="submit" className="w-full rounded-lg p-3 text-left text-red-700 hover:bg-red-50">Sign out</button>
                  </form>
                </>
              ) : (
                <>
                  <Link className="rounded-lg p-3 hover:bg-slate-50" href="/auth/login" onClick={() => setMobileMenu(false)}>Login</Link>
                  <Link className="rounded-lg p-3 text-[#e52b3b] hover:bg-slate-50" href="/auth/signup" onClick={() => setMobileMenu(false)}>Sign Up</Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      <section
        id="home"
        className="relative isolate overflow-hidden bg-[#082c5b] text-white"
      >
        <Image
          src="/images/monrovia-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="pointer-events-none -z-20 object-contain object-top sm:object-cover sm:object-center"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-[#061d45]/45 via-[#062b56]/65 to-[#082c5b] sm:bg-linear-to-r sm:from-[#061d45]/80 sm:via-[#062b56]/45 sm:to-transparent" />
        <div className="absolute inset-0 -z-10 bg-[#061d45]/20" />
        <div className="mx-auto flex min-h-0 max-w-7xl flex-col items-stretch px-4 py-7 sm:min-h-107.5 sm:flex-row sm:items-center sm:px-6 sm:py-12 lg:min-h-110 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-3 text-xs font-semibold text-blue-100 sm:text-sm">
              Buy <span className="mx-1 text-white/60">›</span> Sell <span className="mx-1 text-white/60">›</span> Support Liberia
            </p>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
              Everything You Need
              <br />
              in <span className="text-[#ff4452]">One Place</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
              Discover great products, trusted sellers, and local finds on
              RedWhiteBlue Market — Liberia&apos;s growing online marketplace.
            </p>
            <form
              id="market-search"
              className="mt-5 flex max-w-2xl flex-col gap-1.5 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/50 sm:flex-row sm:items-center sm:rounded-full"
              onSubmit={(event) => {
                event.preventDefault();
                document.getElementById("products")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 pl-3 text-[#102d58]">
                <Search aria-hidden="true" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search products, services, or categories..."
                  aria-label="Search products, services, or categories"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-500 sm:text-sm"
                />
              </label>
              <label className="sr-only" htmlFor="hero-category">Search in category</label>
              <select
                id="hero-category"
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="mx-1 rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-[#102d58] outline-none focus:ring-2 focus:ring-blue-200 sm:mx-0 sm:max-w-40 sm:bg-white sm:text-sm"
              >
                <option value="All Products">All categories</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-xl bg-[#0747b8] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#063a96] sm:rounded-full sm:px-7 sm:text-sm"
              >
                Search
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#products"
                className="inline-flex items-center gap-2 rounded-full bg-[#e52b3b] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-red-700 sm:text-sm"
              >
                Start Shopping <ArrowRight size={15} />
              </a>
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 sm:text-sm"
              >
                Become a Seller <Store size={15} />
              </Link>
              <PwaInstallButton />
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium text-white sm:text-xs">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} /> Secure accounts</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck size={15} /> Approved sellers</span>
              <span className="inline-flex items-center gap-1.5"><Truck size={15} /> Delivery arranged with sellers</span>
            </div>
          </div>
          <div className="absolute bottom-7 right-8 hidden -rotate-6 text-right lg:block">
            <p className="font-serif text-3xl font-bold italic leading-tight text-white drop-shadow-lg">
              Buy Local
              <br />
              Build Liberia
            </p>
            <span className="ml-auto mt-2 block h-1 w-28 rotate-[-8deg] rounded-full bg-[#e52b3b]" />
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight text-[#102d58] sm:text-2xl">Shop by Category</h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">Find exactly what you&apos;re looking for.</p>
          </div>
          <button
            type="button"
            onClick={() => selectCategory("All Products")}
            className="shrink-0 text-xs font-bold text-[#0645b3] hover:text-[#e52b3b] sm:text-sm"
          >
            View All <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10">
          {categories.map((category) => (
            <button
              key={category.name}
              type="button"
              onClick={() => selectCategory(category.name)}
              className={`flex min-h-20.5 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:min-h-24 ${
                activeCategory === category.name
                  ? "border-blue-200 bg-blue-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <category.icon aria-hidden="true" size={27} strokeWidth={1.7} className="text-[#0645b3]" />
              <span className="text-[10px] font-bold leading-tight text-[#102d58] sm:text-xs">{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="products" className="scroll-mt-20 bg-[#f8fafc] py-7 sm:py-9">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#102d58] sm:text-2xl">Explore Products</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {usingSamples ? "Sample listings to preview the marketplace." : "Published listings from local sellers across Liberia."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All Products");
                setActiveSeller(null);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                activeCategory === "All Products" ? "bg-[#102d58] text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              All
            </button>
            {categories.slice(0, 5).map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => {
                  setActiveCategory(category.name);
                  setActiveSeller(null);
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  activeCategory === category.name ? "bg-[#102d58] text-white" : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-5">
            <label className="col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 sm:col-span-1">
              <span className="text-[10px] font-semibold text-slate-500">Currency</span>
              <select
                id="currency"
                value={currencyFilter}
                onChange={(event) => setCurrencyFilter(event.target.value as "all" | "USD" | "LRD")}
                className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#102d58] outline-none"
                aria-label="Filter by currency"
              >
                <option value="all">All</option>
                <option value="USD">USD ($)</option>
                <option value="LRD">LRD (L$)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-500">Min</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={minimumPrice}
                onChange={(event) => setMinimumPrice(event.target.value)}
                placeholder="Any"
                aria-label="Minimum price"
                className="w-full min-w-0 bg-transparent text-xs text-[#102d58] outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-500">Max</span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={maximumPrice}
                onChange={(event) => setMaximumPrice(event.target.value)}
                placeholder="Any"
                aria-label="Maximum price"
                className="w-full min-w-0 bg-transparent text-xs text-[#102d58] outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <MapPin size={14} className="shrink-0 text-slate-500" />
              <input
                type="search"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                placeholder="Location"
                aria-label="Filter by location"
                className="w-full min-w-0 bg-transparent text-xs text-[#102d58] outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <ArrowDownWideNarrow size={14} className="shrink-0 text-slate-500" />
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as "newest" | "price-low" | "price-high")}
                aria-label="Sort products"
                className="w-full min-w-0 bg-transparent text-xs font-semibold text-[#102d58] outline-none"
              >
                <option value="newest">Newest</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>

          {search && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs">
              <p className="text-slate-600">Results for <strong>&quot;{search}&quot;</strong></p>
              <button type="button" onClick={() => setSearch("")} className="font-bold text-[#e52b3b]">Clear search ×</button>
            </div>
          )}
          {hasPriceRange && currencyFilter === "all" && (
            <p role="status" className="mt-2 text-xs text-amber-800">
              Choose USD or LRD to filter prices; currencies are not mixed.
            </p>
          )}
          {activeSeller && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2 text-xs text-[#102d58]">
              <span>Showing this seller&apos;s listings</span>
              <button type="button" onClick={() => setActiveSeller(null)} className="font-bold hover:text-[#e52b3b]">Clear seller filter ×</button>
            </div>
          )}

          {loadError ? (
            <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              Unable to load marketplace listings: {loadError}
            </p>
          ) : filteredProducts.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className={`relative flex aspect-4/3 items-center justify-center bg-linear-to-br ${product.color}`}>
                    <ProductPhoto
                      src={product.imageUrl}
                      alt={product.name}
                      fallback={product.emoji}
                      imageClassName="h-full w-full object-cover"
                      fallbackClassName="select-none text-5xl transition duration-300 group-hover:scale-110 sm:text-6xl"
                    />
                    {product.featured && !usingSamples && (
                      <span className="absolute bottom-2 left-2 rounded-md bg-[#e52b3b] px-2 py-1 text-[9px] font-bold text-white">Featured</span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      aria-label={favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                      aria-pressed={favorites.includes(product.id)}
                      disabled={isSavingFavorite}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#102d58] shadow-sm transition hover:scale-110"
                    >
                      <Heart size={16} fill={favorites.includes(product.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-500">{product.category}</p>
                    <h3 className="mt-1 min-h-8 text-[11px] font-bold leading-4 text-[#102d58] sm:text-xs">{product.name}</h3>
                    <p className="mt-1 text-sm font-black text-[#0645b3] sm:text-base">
                      {product.price === null
                        ? "Contact seller for price"
                        : formatPrice(product.price, product.currency)}
                    </p>
                    <p className="mt-2 truncate text-[10px] font-semibold text-slate-700">{product.seller}</p>
                    <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-slate-500">
                      <MapPin size={11} /> {product.location}
                    </p>
                    {product.sellerId && (
                      <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-emerald-700">
                        <BadgeCheck size={11} /> Approved seller
                      </p>
                    )}
                    <Link
                      href={`/products/${product.id}`}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#102d58] py-2 text-center text-[10px] font-bold text-[#102d58] transition hover:bg-[#102d58] hover:text-white sm:text-xs"
                    >
                      {usingSamples ? "View sample details" : "View & message seller"} <ArrowRight size={12} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <Search aria-hidden="true" size={30} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-lg font-bold text-[#102d58]">No products found</h3>
              <p className="mt-1 text-sm text-slate-500">Try another search or select a different category.</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All Products");
                  setActiveSeller(null);
                  setCurrencyFilter("all");
                  setMinimumPrice("");
                  setMaximumPrice("");
                  setLocationFilter("");
                }}
                className="mt-4 rounded-lg bg-[#102d58] px-4 py-2 text-sm font-bold text-white hover:bg-blue-950"
              >
                Show all products
              </button>
            </div>
          )}
          {!loadError && (
            <p className="mt-3 text-right text-[10px] text-slate-500">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? "listing" : "listings"}
            </p>
          )}
          {usingSamples && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">
              <strong>Sample listings:</strong> Connect Supabase and apply the database migrations to display approved seller listings. Confirm prices and details with sellers.
            </p>
          )}
        </div>
      </section>

      {!usingSamples && !loadError && (
        <section id="trusted-sellers" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#e52b3b]">Local businesses</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#102d58] sm:text-2xl">Trusted Sellers in Liberia</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Approved sellers with published products on the marketplace.</p>
            </div>
            {sellers.length > 0 && (
              <button
                type="button"
                onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                className="text-xs font-bold text-[#0645b3] hover:text-[#e52b3b]"
              >
                Browse listings <ArrowRight size={14} className="ml-1 inline" />
              </button>
            )}
          </div>
          {sellers.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sellers.map((seller) => {
                const initials = seller.name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("");
                return (
                  <article key={seller.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-[#102d58]">
                      {initials || <Store size={19} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-[#102d58]">{seller.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <BadgeCheck size={13} /> Approved seller
                      </p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">
                        <MapPin size={11} className="mr-1 inline" />{seller.location}
                        <span className="mx-1.5">·</span>
                        {seller.productCount} published {seller.productCount === 1 ? "listing" : "listings"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSeller(seller.id);
                        setActiveCategory("All Products");
                        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="shrink-0 rounded-lg border border-[#102d58] px-3 py-2 text-[10px] font-bold text-[#102d58] transition hover:bg-[#102d58] hover:text-white"
                    >
                      View listings
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              There are no approved sellers with published listings yet. Check back soon.
            </p>
          )}
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div className="flex min-h-36 items-center justify-between gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-[#0870d1] to-[#0746a9] p-4 text-white shadow-sm sm:p-5">
          <div className="relative z-10">
            <h2 className="max-w-xs text-base font-black leading-tight sm:text-lg">Grow Your Business with RedWhiteBlue Market</h2>
            <p className="mt-2 max-w-52 text-[10px] leading-4 text-blue-100 sm:text-xs">Reach more customers and showcase your products across Liberia.</p>
            <div className="mt-2 space-y-1 text-[9px] font-semibold text-white/90">
              <p><Check size={11} className="mr-1 inline" /> Easy product management</p>
              <p><Check size={11} className="mr-1 inline" /> A local audience for your business</p>
            </div>
            <Link href="/sell" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#0645b3] hover:bg-blue-50">Start Selling Today <ArrowRight size={12} /></Link>
          </div>
          <Store aria-hidden="true" size={47} className="shrink-0 text-white/80" />
        </div>
        <div className="flex min-h-36 items-center justify-between gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-[#ec1732] to-[#c60c25] p-4 text-white shadow-sm sm:p-5">
          <div>
            <h2 className="text-base font-black sm:text-lg">Delivery, agreed together</h2>
            <p className="mt-2 max-w-52 text-[10px] leading-4 text-rose-100 sm:text-xs">Message the seller to confirm availability, pickup or delivery options, timing, and any delivery fee.</p>
            <a href="#how-it-works" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#c60c25] hover:bg-rose-50">How it works <ArrowRight size={12} /></a>
          </div>
          <Truck aria-hidden="true" size={45} className="shrink-0 text-white/85" />
        </div>
        <div className="flex min-h-36 items-center justify-between gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-[#071b53] to-[#123d8e] p-4 text-white shadow-sm sm:p-5">
          <div>
            <h2 className="text-base font-black sm:text-lg">Payment is arranged with the seller</h2>
            <p className="mt-2 max-w-52 text-[10px] leading-4 text-blue-100 sm:text-xs">Online checkout and in-app payment are not enabled. Agree on a safe payment method directly with the seller before committing.</p>
            <a href="#help-support" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#102d58] hover:bg-blue-50">Shopping guidance <ArrowRight size={12} /></a>
          </div>
          <ShieldCheck aria-hidden="true" size={43} className="shrink-0 text-white/85" />
        </div>
      </section>

      <section aria-label="Marketplace values" className="border-y border-slate-100 bg-[#f7f9fc]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-200 px-4 sm:grid-cols-4 sm:divide-y-0 sm:px-6 lg:px-8">
          {trustPoints.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-center gap-2.5 px-2 py-4 sm:px-4">
              <Icon aria-hidden="true" size={21} className="shrink-0 text-[#102d58]" />
              <div>
                <p className="text-[10px] font-black text-[#102d58] sm:text-xs">{title}</p>
                <p className="mt-0.5 text-[9px] leading-3 text-slate-500 sm:text-[10px]">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e52b3b]">Simple and local</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#102d58]">How it works</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Browse local listings, message sellers with questions, and arrange a transaction that works for you.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Search, title: "Find a product", detail: "Explore categories or search for what you need." },
              { icon: MessageCircle, title: "Message the seller", detail: "Ask about the item, price, and availability." },
              { icon: Truck, title: "Agree on the details", detail: "Arrange pickup, delivery, and payment directly." },
            ].map((step, index) => (
              <article key={step.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <step.icon aria-hidden="true" size={24} className="text-[#0645b3]" />
                  <span className="text-xs font-black text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#102d58]">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="help-support" className="scroll-mt-20 border-y border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <CircleHelp size={24} className="mt-1 shrink-0 text-[#0645b3]" />
            <div>
              <h2 className="text-lg font-black text-[#102d58]">Help and support</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Need help with an account or seller application? Visit your account or seller page. For a listing, contact the seller through its details page.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={userId ? "/account" : "/auth/login"} className="rounded-lg border border-[#102d58] px-4 py-2.5 text-xs font-bold text-[#102d58] transition hover:bg-white">
              Account help
            </Link>
            <Link href="/sell" className="rounded-lg bg-[#102d58] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-950">
              Seller help
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#071b3a] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-9 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <MarketBrand light size={42} />
            <p className="mt-2 max-w-sm text-xs leading-5 text-blue-200">
              A Liberia-focused marketplace to discover local products and connect directly with approved sellers.
            </p>
            <p className="mt-3 text-xs font-semibold text-white">Liberia Buys. Liberia Sells. Liberia Grows.</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Shop</h2>
            <nav aria-label="Shop categories" className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-blue-200">
              {categories.slice(0, 8).map((category) => (
                <button key={category.name} type="button" onClick={() => selectCategory(category.name)} className="text-left hover:text-white">
                  {category.name}
                </button>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Sell and support</h2>
            <nav aria-label="Seller and support links" className="mt-3 flex flex-col items-start gap-2 text-xs text-blue-200">
              <Link href="/sell" className="hover:text-white">Sell on RedWhiteBlue</Link>
              <a href="#trusted-sellers" className="hover:text-white">Trusted sellers</a>
              <a href="#help-support" className="hover:text-white">Help and support</a>
              <a href="#how-it-works" className="hover:text-white">How it works</a>
            </nav>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Your account</h2>
            <nav aria-label="Account links" className="mt-3 flex flex-col items-start gap-2 text-xs text-blue-200">
              <Link href={userId ? "/account" : "/auth/login"} className="hover:text-white">{userId ? "My account" : "Login"}</Link>
              {!userId && <Link href="/auth/signup" className="hover:text-white">Create an account</Link>}
              {userId && <Link href="/messages" className="hover:text-white">My messages</Link>}
              <Link href="/dashboard" className="hover:text-white">Seller dashboard</Link>
            </nav>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-4 text-center text-[10px] text-blue-200">© 2026 RedWhiteBlue Market. Built with pride for Liberia.</p>
      </footer>

      {notice && (
        <div role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:bottom-6">
          <span aria-hidden="true" className="text-xl">ℹ️</span>
          <p className="flex-1 text-sm leading-6 text-slate-700">{notice}</p>
          <button
            type="button"
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
