"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserRound,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { MarketBrand } from "@/app/components/market-brand";
import { WorkspaceRealtime } from "@/app/components/workspace/workspace-realtime";

type SellerNavigationItem = {
  title: string;
  path: string;
  icon: LucideIcon;
  unread?: boolean;
};

const sellerNavigation: SellerNavigationItem[] = [
  { title: "Overview", path: "/seller/dashboard", icon: LayoutDashboard },
  { title: "My Products", path: "/seller/products", icon: Package },
  { title: "Add Product", path: "/dashboard/products/new", icon: ShoppingBag },
  { title: "Orders", path: "/seller/orders", icon: ShoppingCart },
  { title: "Customers", path: "/seller/customers", icon: Users },
  { title: "Store Profile", path: "/seller/settings", icon: Store },
  { title: "Marketing", path: "/seller/promotions", icon: Megaphone },
  { title: "Analytics", path: "/seller/analytics", icon: BarChart3 },
  { title: "Earnings", path: "/seller/earnings", icon: Wallet },
  { title: "Reviews", path: "/seller/reviews", icon: UserRound },
  { title: "Messages", path: "/seller/messages", icon: MessageCircle, unread: true },
  { title: "Settings", path: "/account", icon: Settings },
];

function SellerSidebar({
  storeName,
  unreadCount,
  open,
  onNavigate,
}: {
  storeName: string;
  unreadCount: number | null;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const activePath = pathname.startsWith("/dashboard/products")
    ? pathname.includes("/new")
      ? "/dashboard/products/new"
      : "/seller/products"
    : pathname;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close seller navigation"
          onClick={onNavigate}
          className="fixed inset-x-0 bottom-0 top-[68px] z-40 bg-[#071c3c]/60 md:hidden"
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-[68px] z-50 flex w-[248px] flex-col bg-[#08275a] text-white transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#fca5a5]">
              <Store size={21} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-black">Seller Dashboard</span>
              <span className="mt-1 block truncate text-[9px] text-blue-200">
                {storeName}
              </span>
            </span>
            <button
              type="button"
              onClick={onNavigate}
              aria-label="Close seller navigation"
              className="ml-auto rounded-lg p-2 text-blue-100 hover:bg-white/10 md:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <nav
          aria-label="Seller navigation"
          className="flex-1 space-y-1 overflow-y-auto px-3 py-3"
        >
          {sellerNavigation.map(({ title, path, icon: Icon, unread }) => {
            const active = activePath === path;
            return (
              <Link
                key={title}
                href={path}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-[#0866f5] text-white shadow-sm"
                    : "text-blue-50/90 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
                <span className="flex-1">{title}</span>
                {unread && unreadCount !== null && unreadCount > 0 && (
                  <span className="min-w-5 rounded-full bg-[#f0142f] px-1.5 py-0.5 text-center text-[9px] font-black text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2.5 p-3">
          <section className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg">
                🇱🇷
              </span>
              <div>
                <h2 className="text-[11px] font-black">Grow Your Business</h2>
                <p className="mt-0.5 text-[9px] text-blue-200">
                  More visibility. More local buyers.
                </p>
              </div>
            </div>
            <Link
              href="/seller/promotions"
              onClick={onNavigate}
              className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-[#f0142f] px-3 py-2 text-[9px] font-bold text-white transition hover:bg-red-700"
            >
              Upgrade to Pro <ArrowUpRight size={12} />
            </Link>
          </section>
          <section className="rounded-xl border border-white/10 bg-[#061d44] p-3">
            <div className="flex items-center gap-2">
              <CircleHelp size={16} className="text-blue-200" />
              <div>
                <h2 className="text-[10px] font-bold">Need help?</h2>
                <p className="mt-0.5 text-[9px] text-blue-200">
                  We&apos;re here to support your store.
                </p>
              </div>
            </div>
            <Link
              href="/seller/support"
              onClick={onNavigate}
              className="mt-2.5 block rounded-lg border border-blue-400/60 px-3 py-1.5 text-center text-[9px] font-bold text-white hover:bg-white/10"
            >
              Contact Support
            </Link>
          </section>
        </div>
      </aside>
    </>
  );
}

export function SellerWorkspaceShell({
  userId,
  name,
  storeName,
  unreadCount,
  unreadCountError,
  children,
}: {
  userId: string;
  name: string;
  storeName: string;
  unreadCount: number | null;
  unreadCountError: string | null;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f3f7fd] text-[#08275a]">
      <header className="sticky top-0 z-40 flex min-h-[68px] items-center gap-3 border-b border-[#dce8f8] bg-white/95 px-3 shadow-sm backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open seller navigation"
          className="rounded-lg border border-[#dce8f8] p-2 text-[#08275a] md:hidden"
        >
          <Menu size={18} />
        </button>
        <MarketBrand size={40} />
        <nav
          aria-label="Marketplace links"
          className="hidden items-center gap-3 pl-2 text-[10px] font-bold text-[#08275a] lg:flex"
        >
          <Link href="/" className="hover:text-[#0866f5]">
            Buy
          </Link>
          <Link href="/seller/dashboard" className="hover:text-[#0866f5]">
            Sell
          </Link>
          <Link href="/seller/support" className="whitespace-nowrap hover:text-[#0866f5]">
            Support Liberia
          </Link>
        </nav>

        <form
          action="/seller/products"
          method="get"
          className="relative ml-auto min-w-0 max-w-[430px] flex-1"
        >
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0866f5]"
          />
          <input
            type="search"
            name="q"
            placeholder="Search your products..."
            aria-label="Search your products"
            className="h-9 w-full rounded-lg border border-[#dce8f8] bg-[#fbfdff] pl-9 pr-3 text-[10px] text-[#08275a] outline-none placeholder:text-slate-400 focus:border-[#0866f5] focus:ring-2 focus:ring-blue-100"
          />
        </form>

        <Link
          href="/seller/messages"
          aria-label={
            unreadCount === null
              ? "Messages; unread count unavailable"
              : `Messages${unreadCount ? `, ${unreadCount} unread` : ""}`
          }
          className="relative rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-[#0866f5]"
        >
          <Bell size={18} />
          {unreadCount !== null && unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-[#f0142f] px-1 text-center text-[8px] font-black leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1 hover:bg-slate-50">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0866f5] text-[10px] font-black text-white">
              {name.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden max-w-28 sm:block">
              <span className="block truncate text-[10px] font-bold text-[#08275a]">
                {name}
              </span>
              <span className="block text-[9px] text-slate-500">Seller</span>
            </span>
            <ChevronDown
              size={12}
              className="hidden text-slate-400 transition group-open:rotate-180 sm:block"
            />
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#dce8f8] bg-white p-2 shadow-xl">
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <UserRound size={14} /> Account settings
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <LogOut size={14} /> Sign out
              </button>
            </form>
          </div>
        </details>
      </header>

      <SellerSidebar
        storeName={storeName}
        unreadCount={unreadCount}
        open={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <main className="min-h-[calc(100vh-68px)] md:ml-[248px]">
        <div className="mx-auto w-full max-w-[1700px] px-3 py-3 sm:px-5 sm:py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <WorkspaceRealtime workspace="seller" userId={userId} />
            <span className="text-[9px] font-medium text-slate-400">
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeZone: "Africa/Monrovia",
              }).format(new Date())}
            </span>
          </div>
          {unreadCountError && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-900"
            >
              Unread message totals are unavailable: {unreadCountError}. Apply
              the latest messaging migration to enable them.
            </p>
          )}
          {children}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dce8f8] bg-white px-4 py-3 text-[9px] text-slate-500 sm:px-6">
          <MarketBrand size={30} />
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/seller/support" className="hover:text-[#0866f5]">
              Help
            </Link>
            <span>🇱🇷 Proudly Liberian · © 2026</span>
          </div>
          <span>© {new Date().getFullYear()} RedWhiteBlue Market. All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
