"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  Package,
  PanelLeftClose,
  Search,
  Settings,
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

type Workspace = "admin" | "seller";

type NavigationItem = {
  title: string;
  path: string;
  icon: LucideIcon;
};

const adminNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Users", path: "/admin/users", icon: Users },
  { title: "Sellers", path: "/admin/sellers", icon: Store },
  { title: "Products", path: "/admin/products", icon: Package },
  { title: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { title: "Payments", path: "/admin/payments", icon: CreditCard },
  { title: "Reports", path: "/admin/reports", icon: FileBarChart },
  { title: "Marketing", path: "/admin/marketing", icon: Megaphone },
  { title: "Settings", path: "/admin/settings", icon: Settings },
];

const sellerNavigation: NavigationItem[] = [
  { title: "Dashboard", path: "/seller/dashboard", icon: LayoutDashboard },
  { title: "My Products", path: "/seller/products", icon: Package },
  { title: "Orders", path: "/seller/orders", icon: ShoppingCart },
  { title: "Earnings", path: "/seller/earnings", icon: Wallet },
  { title: "Messages", path: "/seller/messages", icon: MessageCircle },
  { title: "Store Settings", path: "/seller/settings", icon: Settings },
  { title: "Promotions", path: "/seller/promotions", icon: Megaphone },
  { title: "Support", path: "/seller/support", icon: CircleHelp },
];

function Sidebar({
  workspace,
  name,
  open,
  onNavigate,
}: {
  workspace: Workspace;
  name: string;
  open: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = workspace === "admin";
  const navigation = isAdmin ? adminNavigation : sellerNavigation;
  const activePath =
    pathname === "/admin"
      ? "/admin/reports"
      : pathname === "/dashboard" || pathname.startsWith("/dashboard/products")
        ? pathname.startsWith("/dashboard/products")
          ? "/seller/products"
          : "/seller/dashboard"
        : pathname;

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onNavigate}
          className="fixed inset-0 z-40 bg-[#071c3c]/55 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${
          isAdmin
            ? "bg-[#08275a] text-white"
            : "border-r border-[#dce8f8] bg-white text-slate-700"
        }`}
      >
        <div
          className={`flex h-[68px] items-center justify-between border-b px-4 ${
            isAdmin ? "border-white/10" : "border-[#dce8f8]"
          }`}
        >
          <MarketBrand light={isAdmin} size={36} />
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="rounded-lg p-2 md:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <div className={`px-4 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] ${isAdmin ? "text-blue-200/70" : "text-slate-400"}`}>
          {isAdmin ? "Admin workspace" : "Seller workspace"}
        </div>
        <nav aria-label={`${workspace} navigation`} className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navigation.map(({ title, path, icon: Icon }) => {
            const active = activePath === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                  active
                    ? "bg-[#0866f5] text-white shadow-sm"
                    : isAdmin
                      ? "text-blue-50/85 hover:bg-white/10 hover:text-white"
                      : "text-slate-600 hover:bg-blue-50 hover:text-[#0866f5]"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="flex-1">{title}</span>
                {title === "Products" && isAdmin && <PanelLeftClose size={13} className="opacity-60" />}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${
                pathname === "/admin"
                  ? "bg-[#0866f5] text-white"
                  : "text-blue-50/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Activity size={16} /> Review queue
            </Link>
          )}
        </nav>

        {isAdmin ? (
          <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg">🇱🇷</span>
              <div>
                <p className="text-[11px] font-bold">Proudly Liberian</p>
                <p className="mt-0.5 text-[9px] text-blue-200">Buy Local · Support Local</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="m-3 rounded-xl border border-[#dce8f8] bg-[#f3f7fd] p-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0866f5] text-xs font-black text-white">
                {name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#08275a]">{name}</p>
                <p className="text-[10px] text-slate-500">Approved seller</p>
              </div>
            </div>
            <Link href="/" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#0866f5]">
              View marketplace <ChevronDown size={12} className="-rotate-90" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

export function WorkspaceShell({
  workspace,
  userId,
  name,
  children,
}: {
  workspace: Workspace;
  userId: string;
  name: string;
  children: ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = workspace === "admin";
  const basePath = isAdmin ? "/admin" : "/seller";
  const title = isAdmin ? "Super Admin" : "Seller";
  const searchPath = isAdmin ? "/admin/products" : "/seller/products";

  return (
    <div className="min-h-screen bg-[#f3f7fd] text-[#08275a]">
      <Sidebar
        workspace={workspace}
        name={name}
        open={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />
      <div className="min-h-screen md:pl-[248px]">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center gap-3 border-b border-[#dce8f8] bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg border border-[#dce8f8] p-2 text-[#08275a] md:hidden"
          >
            <Menu size={19} />
          </button>
          <form action={searchPath} method="get" className="relative min-w-0 flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              placeholder="Search users, products, orders, or anything..."
              aria-label="Search dashboard"
              className="h-10 w-full rounded-lg border border-[#dce8f8] bg-[#fbfdff] pl-9 pr-3 text-xs text-[#08275a] outline-none placeholder:text-slate-400 focus:border-[#0866f5] focus:ring-2 focus:ring-blue-100"
            />
          </form>
          <Link
            href={`${basePath}/${isAdmin ? "reports" : "messages"}`}
            aria-label={isAdmin ? "Admin reports" : "Seller messages"}
            className="relative rounded-lg p-2.5 text-slate-500 transition hover:bg-blue-50 hover:text-[#0866f5]"
          >
            <Bell size={19} />
          </Link>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white ${isAdmin ? "bg-[#0866f5]" : "bg-[#0ba875]"}`}>
                {name.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden max-w-32 sm:block">
                <span className="block truncate text-[11px] font-bold text-[#08275a]">{name}</span>
                <span className="block text-[9px] text-slate-500">{title}</span>
              </span>
              <ChevronDown size={13} className="hidden text-slate-400 transition group-open:rotate-180 sm:block" />
            </summary>
            <div className="absolute right-0 top-full z-40 mt-2 w-48 rounded-xl border border-[#dce8f8] bg-white p-2 shadow-xl">
              <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <UserRound size={14} /> Account settings
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50">
                  <LogOut size={14} /> Sign out
                </button>
              </form>
            </div>
          </details>
        </header>

        <div className="flex min-h-[calc(100vh-68px)] flex-col">
          <div className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <WorkspaceRealtime workspace={workspace} userId={userId} />
              <span className="text-[10px] font-medium text-slate-400">
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeZone: "Africa/Monrovia",
                }).format(new Date())}
              </span>
            </div>
            {children}
          </div>
          <footer className="border-t border-[#dce8f8] bg-white px-5 py-3 text-center text-[10px] text-slate-500">
            RedWhiteBlue Market · Liberia
          </footer>
        </div>
      </div>
    </div>
  );
}
