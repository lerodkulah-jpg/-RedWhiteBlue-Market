import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  BadgeDollarSign,
  Boxes,
  CircleHelp,
  Edit3,
  Eye,
  MapPin,
  MessageCircle,
  Plus,
  ShoppingCart,
  Store,
  Wallet,
} from "lucide-react";
import { ProductPhoto } from "@/app/components/product-photo";
import { requireSellerAccount } from "@/app/lib/auth/account";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import {
  getExactCount,
  getSellerConversations,
  getSellerProducts,
  SELLER_SECTIONS,
  type SellerSection,
} from "@/app/lib/workspaces";
import { formatPrice } from "@/app/lib/products";

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
}>;

function valueString(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0, 100);
}

function readPage(value: string | string[] | undefined) {
  const parsed = Number(valueString(value));
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#c4d5ec] bg-[#fbfdff] px-5 py-10 text-center">
      <Activity size={23} className="mx-auto text-slate-300" />
      <h2 className="mt-2 text-xs font-bold text-slate-700">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-[10px] leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dce8f8] bg-white p-4 shadow-[0_2px_12px_rgba(8,39,90,0.04)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#08275a]">{title}</h2>
          {description && (
            <p className="mt-1 text-[10px] text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  color: string;
  href?: string;
}) {
  const contents = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500">{title}</span>
        <span className={`rounded-lg p-2 ${color}`}><Icon size={16} /></span>
      </div>
      <p className="mt-2 text-xl font-black tracking-tight text-[#08275a]">{value}</p>
      <p className="mt-1 text-[9px] text-slate-500">{note}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-[#dce8f8] bg-white p-4 shadow-[0_2px_12px_rgba(8,39,90,0.04)] transition hover:-translate-y-0.5 hover:shadow-md">
      {contents}
    </Link>
  ) : (
    <div className="rounded-xl border border-[#dce8f8] bg-white p-4 shadow-[0_2px_12px_rgba(8,39,90,0.04)]">
      {contents}
    </div>
  );
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0866f5]">Seller workspace</p>
        <h1 className="mt-1 text-xl font-black text-[#08275a]">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

async function SellerSectionContent({
  section,
  searchParams,
}: {
  section: SellerSection;
  searchParams: SearchParams;
}) {
  const account = await requireSellerAccount();
  const sellerId = account.user!.id;
  const params = await searchParams;
  const search = valueString(params.q);
  const page = readPage(params.page);
  const supabase = await createServerSupabaseClient();

  if (section === "dashboard") {
    const [products, activeProducts, conversations] = await Promise.all([
      getSellerProducts(sellerId, 6),
      getExactCount(supabase, "products", [
        { column: "seller_id", operator: "eq", value: sellerId },
        { column: "moderation_status", operator: "eq", value: "published" },
      ]),
      getSellerConversations(sellerId),
    ]);
    const countsUnavailable = products.count === null || activeProducts.count === null;
    const sellerName = account.profile?.display_name || "Seller";

    return (
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-3">
          <section
            className="relative flex min-h-[112px] items-center overflow-hidden rounded-xl bg-[#08275a] bg-cover bg-[center_44%] px-4 py-4 text-white shadow-sm sm:min-h-[132px] sm:px-6"
            style={{ backgroundImage: "linear-gradient(90deg, rgba(5, 25, 58, .94) 0%, rgba(5, 25, 58, .72) 54%, rgba(5, 25, 58, .14) 100%), url('/images/monrovia-hero.webp')" }}
          >
            <div className="relative z-10 max-w-xl">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200">Seller dashboard</p>
              <h1 className="mt-1 text-lg font-black tracking-tight sm:text-2xl">Welcome back, {sellerName}!</h1>
              <p className="mt-1 text-[10px] text-blue-50 sm:text-xs">Here&apos;s what&apos;s happening with your store today.</p>
              <Link href="/dashboard/products/new" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0866f5] px-3 py-2 text-[9px] font-bold text-white shadow-sm transition hover:bg-blue-700">
                <Plus size={13} /> Add a product
              </Link>
            </div>
            <span aria-label="Liberian flag" role="img" className="absolute right-4 top-3 text-3xl drop-shadow-lg sm:right-6 sm:text-4xl">🇱🇷</span>
          </section>

          {(products.error || conversations.error || activeProducts.error) && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-800">
              Unable to load some seller data: {products.error || conversations.error || activeProducts.error?.message}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 2xl:grid-cols-4">
            <MetricCard title="Total Sales" value="—" note="Verified payments are not configured" icon={Wallet} color="bg-blue-50 text-[#0866f5]" href="/seller/earnings" />
            <MetricCard title="Total Orders" value="—" note="Order tracking is not configured" icon={ShoppingCart} color="bg-violet-50 text-violet-600" href="/seller/orders" />
            <MetricCard title="Active Products" value={activeProducts.error ? "—" : String(activeProducts.count ?? 0)} note={countsUnavailable ? "Listing count unavailable" : `${products.count} total listings`} icon={Boxes} color="bg-emerald-50 text-emerald-600" href="/seller/products" />
            <MetricCard title="Store Views" value="—" note="Listing view analytics are not configured" icon={Eye} color="bg-rose-50 text-rose-600" href="/seller/analytics" />
          </div>

          <div className="grid gap-3 2xl:grid-cols-[1.25fr_0.9fr]">
            <Panel
              title="Sales Overview"
              description="Verified sales data for your store"
              action={<span className="rounded-md border border-[#dce8f8] px-2 py-1 text-[9px] font-semibold text-slate-500">Last 7 days</span>}
            >
              <div className="flex min-h-[168px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dce8f8] bg-[#fbfdff] px-4 py-6 text-center">
                <BarChart3 size={23} className="text-[#9bb5d8]" />
                <h3 className="mt-2 text-[11px] font-bold text-slate-700">Sales analytics are not available yet</h3>
                <p className="mt-1 max-w-sm text-[9px] leading-4 text-slate-500">A verified order and payment ledger is needed before sales trends, order value, or period comparisons can be calculated.</p>
              </div>
              <div className="mt-3 grid grid-cols-3 divide-x divide-[#edf2fa]">
                {["Total sales", "Total orders", "Average order"].map((label) => (
                  <div key={label} className="px-2 text-center first:pl-0 last:pr-0">
                    <p className="text-[8px] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-black text-[#08275a]">—</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Recent Orders"
              description="Orders for your store"
              action={<Link href="/seller/orders" className="text-[9px] font-bold text-[#0866f5]">View all →</Link>}
            >
              <EmptyPanel title="Order tracking is not configured" description="No order or checkout records exist in the current database. Customer names, totals, and fulfillment statuses are not fabricated." />
            </Panel>
          </div>

          <Panel
            title="My Products"
            description="Actual listings from your seller account. Inventory quantities and product views are not currently tracked."
            action={
              <div className="flex items-center gap-3">
                <Link href="/seller/products" className="text-[9px] font-bold text-[#0866f5]">View all →</Link>
                <Link href="/dashboard/products" className="text-[9px] font-bold text-[#0866f5]">Manage listings</Link>
                <Link href="/dashboard/products/new" className="inline-flex items-center gap-1 rounded-lg bg-[#0866f5] px-2.5 py-1.5 text-[9px] font-bold text-white hover:bg-blue-700"><Plus size={12} /> Add New</Link>
              </div>
            }
          >
            {products.error ? (
              <p role="alert" className="text-xs text-red-700">{products.error}</p>
            ) : products.data.length ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-3">
                {products.data.map((product) => (
                  <article key={product.id} className="overflow-hidden rounded-lg border border-[#dce8f8] bg-white">
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-[#f3f7fd]">
                      <ProductPhoto src={product.imageUrl} alt={product.name} fallback="🛍️" imageClassName="h-full w-full object-cover" fallbackClassName="text-3xl" />
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-1 text-[8px] font-bold capitalize text-[#08275a]">{product.moderation_status.replaceAll("_", " ")}</span>
                      <Link href={`/dashboard/products/${product.id}/edit`} aria-label={`Edit ${product.name}`} className="absolute right-1.5 top-1.5 rounded-full bg-white p-1.5 text-[#0866f5] shadow-sm hover:bg-blue-50">
                        <Edit3 size={12} />
                      </Link>
                    </div>
                    <div className="p-2">
                      <h3 className="truncate text-[9px] font-bold text-[#08275a]">{product.name}</h3>
                      <p className="mt-1 text-[10px] font-black text-[#0866f5]">{formatPrice(Number(product.price), product.currency)}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-[8px] text-slate-500"><MapPin size={10} />{product.location}</p>
                      <Link href={`/dashboard/products/${product.id}/edit`} className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-[#dce8f8] py-1.5 text-[8px] font-bold text-[#0866f5] hover:bg-blue-50">Edit listing <ArrowRight size={10} /></Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel title="No products yet" description="Create a listing to start building your store. Products displayed here come only from your own seller account." />
            )}
          </Panel>

          <div className="grid gap-3 2xl:grid-cols-3">
            <Panel title="Sales & Earnings" description="Verified financial records only" action={<Link href="/seller/earnings" className="text-[9px] font-bold text-[#0866f5]">Details →</Link>}>
              <div className="grid grid-cols-2 gap-2">
                {["This week", "This month", "Total earnings", "Pending balance"].map((label) => (
                  <div key={label} className="rounded-lg bg-[#f7faff] p-2.5">
                    <p className="text-[8px] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-black text-[#08275a]">—</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[8px] leading-4 text-slate-500">No verified payment or payout ledger is configured.</p>
            </Panel>
            <Panel title="Recent Messages" action={<Link href="/seller/messages" className="text-[9px] font-bold text-[#0866f5]">View all →</Link>}>
              {conversations.error ? (
                <p role="alert" className="text-xs text-red-700">{conversations.error}</p>
              ) : conversations.data.length ? (
                <ul className="divide-y divide-[#edf2fa]">
                  {conversations.data.slice(0, 4).map((conversation) => (
                    <li key={conversation.id}>
                      <Link href={`/messages/${conversation.id}`} className="flex items-center gap-2 py-2 hover:bg-blue-50">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0866f5]"><MessageCircle size={13} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[9px] font-bold text-[#08275a]">{conversation.product_name}</span>
                          <span className="mt-0.5 block truncate text-[8px] text-slate-500">{conversation.latestMessage ? `${conversation.latestSenderId === sellerId ? "You" : "Buyer"}: ${conversation.latestMessage}` : "Conversation started"}</span>
                        </span>
                        {conversation.unreadCount > 0 && <span className="rounded-full bg-[#f0142f] px-1.5 py-0.5 text-[8px] font-bold text-white">{conversation.unreadCount}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyPanel title="No conversations yet" description="Buyer messages about your listings will appear here." />
              )}
            </Panel>
            <Panel title="Top-Selling Products" description="Based on completed, verified sales">
              <EmptyPanel title="No verified sales records" description="Product rankings, units sold, and sales revenue appear after paid order records are integrated." />
            </Panel>
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-[84px]">
          <Panel title="Quick Actions">
            <div className="space-y-2">
              <Link href="/dashboard/products/new" className="flex items-center gap-2 rounded-lg bg-[#0866f5] px-3 py-2.5 text-[9px] font-bold text-white hover:bg-blue-700"><Plus size={14} /> Add New Product</Link>
              <Link href="/dashboard/products" className="flex items-center gap-2 rounded-lg border border-[#dce8f8] bg-blue-50/50 px-3 py-2.5 text-[9px] font-bold text-[#08275a] hover:bg-blue-50"><Boxes size={14} /> Manage Products</Link>
              <Link href="/seller/orders" className="flex items-center gap-2 rounded-lg border border-[#dce8f8] bg-blue-50/50 px-3 py-2.5 text-[9px] font-bold text-[#08275a] hover:bg-blue-50"><ShoppingCart size={14} /> View Orders</Link>
              <Link href="/seller/settings" className="flex items-center gap-2 rounded-lg border border-[#dce8f8] bg-blue-50/50 px-3 py-2.5 text-[9px] font-bold text-[#08275a] hover:bg-blue-50"><Store size={14} /> Update Store Profile</Link>
            </div>
          </Panel>

          <Panel title="Store Performance">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-[#f7faff] p-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-[#dce8f8] text-sm font-black text-slate-400">—</span>
              <div>
                <p className="text-[9px] font-bold text-[#08275a]">Seller rating</p>
                <p className="mt-1 text-[8px] text-slate-500">Reviews are not collected</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                ["On-time shipment", "Order data unavailable"],
                ["Positive reviews", "Review data unavailable"],
                ["Total reviews", "Review records unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2 border-t border-[#edf2fa] pt-2">
                  <span className="text-[8px] text-slate-500">{label}</span>
                  <span className="text-[8px] font-bold text-slate-400">— · {value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <section className="rounded-xl bg-linear-to-br from-[#08275a] to-[#0646a5] p-4 text-white shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Store size={19} /></span>
            <h2 className="mt-3 text-sm font-black">Boost Your Sales</h2>
            <p className="mt-1 text-[9px] leading-4 text-blue-100">Explore featured listings and promotion options for your store.</p>
            <Link href="/seller/promotions" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-[9px] font-bold text-[#0866f5] hover:bg-blue-50">View Marketing Options <ArrowUpRight size={11} /></Link>
            <p className="mt-2 text-[8px] text-blue-200">Paid promotions are not currently configured.</p>
          </section>

          <Panel title="Payout Information">
            <div className="flex items-center gap-2 rounded-lg bg-[#f7faff] p-3">
              <BadgeDollarSign size={18} className="text-[#0866f5]" />
              <div>
                <p className="text-[8px] text-slate-500">Available balance</p>
                <p className="mt-0.5 text-base font-black text-[#08275a]">—</p>
              </div>
            </div>
            <p className="mt-2 text-[8px] leading-4 text-slate-500">Payout requests are unavailable until verified payments and payout processing are configured.</p>
            <button type="button" disabled title="Payout processing is not configured" className="mt-3 w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-[9px] font-bold text-slate-500">Request Payout · Unavailable</button>
          </Panel>
        </aside>
      </div>
    );
  }

  if (section === "products") {
    const from = (page - 1) * 25;
    let query = supabase
      .from("products")
      .select("id, name, description, price, currency, location, moderation_status, created_at", { count: "exact" })
      .eq("seller_id", sellerId)
      .order("updated_at", { ascending: false })
      .range(from, from + 24);
    if (search) {
      query = query.ilike("name", `%${search.replace(/[%_,]/g, " ")}%`);
    }
    const [{ data, count, error }, profileResult] = await Promise.all([
      query,
      supabase.from("seller_profiles").select("display_name, business_name").eq("user_id", sellerId).maybeSingle(),
    ]);
    const products = data ?? [];
    const { data: images, error: imageError } = products.length
      ? await supabase.from("product_images").select("product_id, storage_path, position").in("product_id", products.map((product) => product.id)).order("position")
      : { data: [], error: null };
    if (profileResult.error || imageError) {
      return <SellerError message={profileResult.error?.message ?? imageError?.message ?? "Unable to load products."} />;
    }
    const imagePaths = new Map<string, string>();
    for (const image of images ?? []) {
      if (!imagePaths.has(image.product_id)) imagePaths.set(image.product_id, image.storage_path);
    }
    const paths = [...imagePaths.values()];
    const signedResult = paths.length
      ? await supabase.storage.from("product-images").createSignedUrls(paths, 300)
      : { data: [], error: null };
    if (signedResult.error) return <SellerError message={signedResult.error.message} />;
    const signedUrls = new Map((signedResult.data ?? []).flatMap((item) => item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : []));
    const storeName = profileResult.data?.business_name?.trim() || profileResult.data?.display_name || "Your store";
    return (
      <div className="space-y-4">
        <PageHeading title="My Products" description={`${storeName} · Your own listings only.`} action={<div className="flex flex-wrap gap-2"><Link href="/dashboard/products" className="rounded-lg border border-[#dce8f8] px-3 py-2.5 text-[10px] font-bold text-[#08275a]">Manage listings</Link><Link href="/dashboard/products/new" className="inline-flex items-center gap-1 rounded-lg bg-[#0866f5] px-3 py-2.5 text-[10px] font-bold text-white"><Plus size={13} /> Add product</Link></div>} />
        {error ? <SellerError message={error.message} /> : products.length ? (
          <Panel title="Your listings" description={`${count ?? "—"} listings · 25 per page`}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const path = imagePaths.get(product.id);
                return (
                  <article key={product.id} className="overflow-hidden rounded-xl border border-[#dce8f8] bg-white">
                    <div className="relative flex aspect-[16/9] items-center justify-center bg-blue-50">
                      <ProductPhoto src={path ? signedUrls.get(path) ?? null : null} alt={product.name} fallback="🛍️" imageClassName="h-full w-full object-cover" fallbackClassName="text-4xl" />
                      <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[9px] font-bold capitalize text-[#08275a]">{product.moderation_status.replaceAll("_", " ")}</span>
                    </div>
                    <div className="p-3">
                      <h2 className="text-xs font-bold text-[#08275a]">{product.name}</h2>
                      <p className="mt-1 text-xs font-black text-[#0866f5]">{formatPrice(Number(product.price), product.currency)}</p>
                      <p className="mt-1 flex items-center gap-1 text-[9px] text-slate-500"><MapPin size={11} />{product.location}</p>
                      <div className="mt-3 flex gap-2">
                        <Link href={`/dashboard/products/${product.id}/edit`} className="rounded-md border border-[#dce8f8] px-3 py-1.5 text-[9px] font-bold text-[#08275a] hover:bg-blue-50">Edit listing</Link>
                        {product.moderation_status === "published" && <Link href={`/products/${product.id}`} className="rounded-md bg-blue-50 px-3 py-1.5 text-[9px] font-bold text-[#0866f5] hover:bg-blue-100">View listing</Link>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <Pagination page={page} count={count} search={search} />
          </Panel>
        ) : <EmptyPanel title="No matching listings" description="Create a listing or try another product search." />}
      </div>
    );
  }

  if (section === "messages") {
    const conversations = await getSellerConversations(sellerId);
    return (
      <div className="space-y-4">
        <PageHeading title="Messages" description="Private conversations about your listings." action={<Link href="/messages" className="rounded-lg border border-[#dce8f8] px-3 py-2 text-[10px] font-bold text-[#08275a]">Open inbox</Link>} />
        <Panel title="Recent conversations">
          {conversations.error ? <SellerError message={conversations.error} /> : conversations.data.length ? (
            <div className="divide-y divide-[#edf2fa]">
              {conversations.data.map((conversation) => (
                <Link key={conversation.id} href={`/messages/${conversation.id}`} className="flex items-center gap-3 py-3 hover:bg-blue-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-[#0866f5]"><MessageCircle size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-[#08275a]">{conversation.product_name}</span>
                    <span className="mt-1 block truncate text-[10px] text-slate-500">{conversation.latestMessage ?? "Conversation started"}</span>
                  </span>
                  {conversation.unreadCount > 0 && <span className="rounded-full bg-[#f0142f] px-2 py-1 text-[9px] font-bold text-white">{conversation.unreadCount} new</span>}
                  <span className="text-[9px] text-slate-400">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "Africa/Monrovia" }).format(new Date(conversation.updated_at))}</span>
                </Link>
              ))}
            </div>
          ) : <EmptyPanel title="No conversations yet" description="When a buyer messages you about a listing, the conversation will appear here." />}
        </Panel>
      </div>
    );
  }

  if (section === "orders" || section === "earnings") {
    const orders = section === "orders";
    return (
      <div className="space-y-4">
        <PageHeading title={orders ? "Orders" : "Earnings"} description={orders ? "Order fulfillment for your store." : "Verified seller sales, balances, and payouts."} />
        <Panel title={orders ? "Your orders" : "Your earnings"}>
          <EmptyPanel
            title={orders ? "Order tracking is not configured" : "No verified payment records"}
            description={
              orders
                ? "The current database has no orders table or checkout workflow. Customer orders and fulfillment statuses are not available."
                : "There is no verified payment, commission, refund, or payout ledger. Financial amounts are shown as unavailable, not as fabricated totals or zero balances."
            }
          />
        </Panel>
      </div>
    );
  }

  if (section === "customers" || section === "analytics" || section === "reviews") {
    const details = {
      customers: {
        title: "Customers",
        description: "Customer information from orders associated with your store.",
        emptyTitle: "Customer records are not available",
        emptyDescription:
          "The marketplace does not have an order or customer-history table yet. No buyer identities or purchase counts are fabricated.",
      },
      analytics: {
        title: "Analytics",
        description: "Store visits and verified sales performance.",
        emptyTitle: "Store analytics are not configured",
        emptyDescription:
          "Product-view tracking and verified transaction records are not available, so visitor totals and sales comparisons cannot be calculated.",
      },
      reviews: {
        title: "Reviews",
        description: "Verified buyer feedback for your store and listings.",
        emptyTitle: "Review records are not available",
        emptyDescription:
          "Buyer reviews are not collected in the current marketplace database. Ratings and review counts are not invented.",
      },
    }[section];
    return (
      <div className="space-y-4">
        <PageHeading title={details.title} description={details.description} />
        <Panel title={details.title}>
          <EmptyPanel title={details.emptyTitle} description={details.emptyDescription} />
        </Panel>
      </div>
    );
  }

  if (section === "settings") {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("display_name, business_name, seller_type, created_at")
      .eq("user_id", sellerId)
      .maybeSingle();
    return (
      <div className="space-y-4">
        <PageHeading title="Store Settings" description="Your approved seller profile." />
        {error ? <SellerError message={error.message} /> : (
          <Panel title="Store profile">
            <dl className="grid gap-3 sm:grid-cols-2">
              <SettingValue label="Store name" value={data?.business_name?.trim() || data?.display_name || "—"} />
              <SettingValue label="Seller type" value={data?.seller_type || "—"} />
              <SettingValue label="Account name" value={account.profile?.display_name || "—"} />
              <SettingValue label="Approved since" value={data?.created_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(data.created_at)) : "—"} />
            </dl>
            <Link href="/account" className="mt-4 inline-flex items-center gap-1 rounded-lg bg-[#0866f5] px-3 py-2 text-[10px] font-bold text-white">Edit account details <ArrowRight size={12} /></Link>
          </Panel>
        )}
      </div>
    );
  }

  if (section === "promotions") {
    return (
      <div className="space-y-4">
        <PageHeading title="Promotions" description="Promoted placements and seller campaigns." />
        <Panel title="Campaigns">
          <EmptyPanel title="Seller promotions are not configured" description="Discount management, premium plans, and paid promotion features have not been set up. No sample deals or campaign amounts are shown." />
        </Panel>
      </div>
    );
  }

  if (section === "support") {
    return (
      <div className="space-y-4">
        <PageHeading title="Support" description="Find help for your seller account and listings." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/account" className="rounded-xl border border-[#dce8f8] bg-white p-4 hover:bg-blue-50">
            <CircleHelp size={20} className="text-[#0866f5]" />
            <h2 className="mt-3 text-xs font-bold text-[#08275a]">Account help</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Update your profile or review account information.</p>
          </Link>
          <Link href="/messages" className="rounded-xl border border-[#dce8f8] bg-white p-4 hover:bg-blue-50">
            <MessageCircle size={20} className="text-[#0866f5]" />
            <h2 className="mt-3 text-xs font-bold text-[#08275a]">Buyer messages</h2>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Open conversations related to your listings.</p>
          </Link>
        </div>
      </div>
    );
  }

  notFound();
}

function SettingValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#f7faff] p-3">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-xs font-semibold capitalize text-[#08275a]">{value}</dd>
    </div>
  );
}

function SellerError({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">Unable to load seller information: {message}</p>;
}

function Pagination({
  page,
  count,
  search,
}: {
  page: number;
  count: number | null;
  search: string;
}) {
  const pages = Math.max(1, Math.ceil((count ?? 0) / 25));
  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams({ page: String(nextPage) });
    if (search) params.set("q", search);
    return `/seller/products?${params.toString()}`;
  };
  return (
    <nav aria-label="Product pagination" className="mt-4 flex items-center justify-between border-t border-[#edf2fa] pt-3">
      <p className="text-[10px] text-slate-500">Page {page} of {pages}</p>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={makeHref(Math.max(1, page - 1))} className={`rounded-md border px-3 py-1.5 text-[10px] font-bold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-[#dce8f8] text-[#0866f5]"}`}>Previous</Link>
        <Link aria-disabled={page >= pages} href={makeHref(Math.min(pages, page + 1))} className={`rounded-md border px-3 py-1.5 text-[10px] font-bold ${page >= pages ? "pointer-events-none border-slate-100 text-slate-300" : "border-[#dce8f8] text-[#0866f5]"}`}>Next</Link>
      </div>
    </nav>
  );
}

export default async function SellerSectionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: SearchParams;
}) {
  const { section } = await params;
  if (!SELLER_SECTIONS.includes(section as SellerSection)) {
    notFound();
  }
  return (
    <SellerSectionContent
      section={section as SellerSection}
      searchParams={searchParams}
    />
  );
}
