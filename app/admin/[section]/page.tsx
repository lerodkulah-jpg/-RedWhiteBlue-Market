import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Boxes,
  CircleHelp,
  Clock3,
  CreditCard,
  FileBarChart,
  FileText,
  Flag,
  Gauge,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { requireAdministrator } from "@/app/lib/auth/account";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import {
  ADMIN_SECTIONS,
  type AdminSection,
  getAdminOverview,
  getAdminProducts,
  getAdminSellers,
  getExactCount,
  getRecentAdminUsers,
} from "@/app/lib/workspaces";
import {
  SellerVerificationReview,
  type VerificationReviewRecord,
} from "@/app/components/admin/seller-verification-review";

type SearchParams = Promise<{
  q?: string | string[];
  page?: string | string[];
}>;

function safePage(value: string | string[] | undefined) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10000) : 1;
}

function safeSearch(value: string | string[] | undefined) {
  const first = Array.isArray(value) ? value[0] : value;
  return (first ?? "").trim().slice(0, 100);
}

function formatCount(count: number | null) {
  return count === null ? "—" : new Intl.NumberFormat("en-US").format(count);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "Africa/Monrovia",
  }).format(new Date(date));
}

function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#dce8f8] bg-white p-4 shadow-[0_2px_12px_rgba(8,39,90,0.04)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#08275a]">{title}</h2>
          {description && (
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function UnavailablePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#c4d5ec] bg-[#fbfdff] p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
          <CircleHelp size={17} />
        </span>
        <div>
          <h3 className="text-xs font-bold text-[#08275a]">{title}</h3>
          <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  label,
  value,
  icon: Icon,
  iconClass,
  change,
  href,
  note,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  iconClass: string;
  change?: string;
  href?: string;
  note?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium text-slate-500">
          {label}
        </span>
        <span className={`rounded-lg p-2 ${iconClass}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-2 text-xl font-black tracking-tight text-[#08275a] sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 min-h-4 text-[9px] font-medium text-slate-500">
        {change ?? note ?? "Verified activity"}
      </p>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-xl border border-[#dce8f8] bg-white p-3.5 shadow-[0_2px_12px_rgba(8,39,90,0.04)] transition hover:-translate-y-0.5 hover:shadow-md sm:p-4"
    >
      {content}
    </Link>
  ) : (
    <div className="rounded-xl border border-[#dce8f8] bg-white p-3.5 shadow-[0_2px_12px_rgba(8,39,90,0.04)] sm:p-4">
      {content}
    </div>
  );
}

function AdminDashboard({ search }: { search: string }) {
  return <AdminDashboardContent search={search} />;
}

async function AdminDashboardContent({ search }: { search: string }) {
  const supabase = await createServerSupabaseClient();
  const [overview, categoriesResult, publishedCount] = await Promise.all([
    getAdminOverview(),
    supabase.from("categories").select("id, name").order("name"),
    getExactCount(supabase, "products", [
      { column: "moderation_status", operator: "eq", value: "published" },
    ]),
  ]);

  const categories = categoriesResult.data ?? [];
  const categoryCounts = await Promise.all(
    categories.map(async (category) => {
      const result = await getExactCount(supabase, "products", [
        { column: "moderation_status", operator: "eq", value: "published" },
        { column: "category_id", operator: "eq", value: category.id },
      ]);
      return { name: category.name, count: result.count, error: result.error };
    }),
  );
  const categoryError =
    categoriesResult.error?.message ??
    categoryCounts.find((item) => item.error)?.error?.message;
  const topCategories = [...categoryCounts]
    .sort((a, b) => (b.count ?? -1) - (a.count ?? -1))
    .slice(0, 5);

  const metrics = [
    {
      label: "Total Users",
      value: formatCount(overview.totalUsers),
      icon: Users,
      iconClass: "bg-blue-50 text-[#0866f5]",
      change:
        overview.userWeek === null
          ? "Weekly change unavailable"
          : `${overview.userWeek >= 0 ? "+" : ""}${overview.userWeek} new this week`,
      href: "/admin/users",
    },
    {
      label: "Total Sellers",
      value: formatCount(overview.totalSellers),
      icon: Store,
      iconClass: "bg-emerald-50 text-emerald-600",
      change:
        overview.sellerWeek === null
          ? "Weekly change unavailable"
          : `${overview.sellerWeek >= 0 ? "+" : ""}${overview.sellerWeek} new this week`,
      href: "/admin/sellers",
    },
    {
      label: "Total Products",
      value: formatCount(overview.totalProducts),
      icon: Boxes,
      iconClass: "bg-violet-50 text-violet-600",
      change:
        overview.productWeek === null
          ? "Weekly change unavailable"
          : `${overview.productWeek >= 0 ? "+" : ""}${overview.productWeek} added this week`,
      href: "/admin/products",
    },
    {
      label: "Total Orders",
      value: "—",
      icon: ShoppingCart,
      iconClass: "bg-orange-50 text-orange-600",
      note: "Order tracking not configured",
      href: "/admin/orders",
    },
    {
      label: "Verified Revenue",
      value: "—",
      icon: Wallet,
      iconClass: "bg-rose-50 text-[#f0142f]",
      note: "Payment records not configured",
      href: "/admin/payments",
    },
  ];

  const actions = [
    { title: "Review Products", href: "/admin/products", icon: Package },
    { title: "Manage Sellers", href: "/admin/sellers", icon: Store },
    { title: "Review Reports", href: "/admin/reports", icon: FileBarChart },
    { title: "Open Review Queue", href: "/admin", icon: Activity },
  ];
  const shortcuts = [
    {
      title: "Order Fulfillment",
      subtitle: "Order processing is not configured",
      href: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      title: "Payment Management",
      subtitle: "Verified payment records unavailable",
      href: "/admin/payments",
      icon: CreditCard,
    },
    {
      title: "Seller Verification",
      subtitle: "Review pending seller applications",
      href: "/admin",
      icon: ShieldCheck,
    },
    {
      title: "System Settings",
      subtitle: "Platform configuration",
      href: "/admin/settings",
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0866f5]">
            Admin dashboard
          </p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-[#08275a] sm:text-2xl">
            Welcome back, Admin!
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Here&apos;s what&apos;s happening with your marketplace today.
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
          <Clock3 size={13} />
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeZone: "Africa/Monrovia",
          }).format(new Date())}
        </p>
      </div>

      {(overview.errors.length > 0 || categoryError || publishedCount.error) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {[
            ...overview.errors,
            categoryError && `Unable to load category totals: ${categoryError}`,
            publishedCount.error &&
              `Unable to load published listing total: ${publishedCount.error.message}`,
          ]
            .filter(Boolean)
            .join(" ")}
        </div>
      )}

      {search && (
        <form action="/admin/products" method="get" className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <p className="flex-1 self-center text-xs text-[#08275a]">
            Search all workspace records for <strong>&quot;{search}&quot;</strong>
          </p>
          <input type="hidden" name="q" value={search} />
          <button className="rounded-md bg-[#0866f5] px-3 py-1.5 text-[10px] font-bold text-white">Search products</button>
          <Link href={`/admin/users?q=${encodeURIComponent(search)}`} className="self-center text-[10px] font-bold text-[#0866f5]">Users →</Link>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <DashboardCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.45fr_1fr_1.05fr_0.9fr]">
        <Panel
          title="Sales Overview"
          description="Revenue trends require verified order and payment records."
          action={
            <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">
              No payment data
            </span>
          }
        >
          <div className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-[#dce8f8] bg-[#fbfdff] p-5 text-center">
            <div>
              <Activity size={24} className="mx-auto text-slate-300" />
              <p className="mt-2 text-xs font-bold text-slate-600">
                No verified sales data available
              </p>
              <p className="mx-auto mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                The database does not yet have an order or payment system. A
                sales chart will appear after verified transactions are
                implemented.
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Top Categories"
          description={`${formatCount(publishedCount.count)} published listings`}
          action={
            <Link href="/admin/products" className="text-[10px] font-bold text-[#0866f5]">
              View all <ArrowRight size={12} className="ml-0.5 inline" />
            </Link>
          }
        >
          {categoryError ? (
            <p role="alert" className="text-xs text-red-700">{categoryError}</p>
          ) : topCategories.length ? (
            <ol className="divide-y divide-[#edf2fa]">
              {topCategories.map((category, index) => (
                <li key={category.name} className="flex items-center gap-2.5 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[10px] font-bold text-[#0866f5]">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#08275a]">
                    {category.name}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600">
                    {formatCount(category.count)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-8 text-center text-xs text-slate-500">
              No categories are available yet.
            </p>
          )}
        </Panel>

        <Panel
          title="Recent Orders"
          description="Order management requires a verified order system."
          action={<Link href="/admin/orders" className="text-[10px] font-bold text-[#0866f5]">View all →</Link>}
        >
          <UnavailablePanel
            title="Order data is not configured"
            description="No orders table or verified checkout provider exists in this project yet. Order IDs, customers, statuses, and amounts are not shown as sample data."
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Quick Actions">
            <div className="space-y-2">
              {actions.map(({ title, href, icon: Icon }, index) => (
                <Link
                  key={title}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[10px] font-bold transition ${
                    index === 0
                      ? "border-[#0866f5] bg-[#0866f5] text-white hover:bg-blue-700"
                      : "border-[#dce8f8] bg-white text-[#08275a] hover:border-[#0866f5] hover:bg-blue-50"
                  }`}
                >
                  <Icon size={14} /> {title} <ArrowRight size={12} className="ml-auto" />
                </Link>
              ))}
            </div>
          </Panel>
          <div className="overflow-hidden rounded-xl bg-linear-to-br from-[#08275a] via-[#0d4fbd] to-[#f0142f] p-4 text-white shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇱🇷</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Proudly Liberian</span>
            </div>
            <h2 className="mt-4 text-sm font-black">Support Local Businesses</h2>
            <p className="mt-1 text-[10px] leading-4 text-white/85">
              Together we grow Liberia&apos;s economy.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map(({ title, subtitle, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-[#dce8f8] bg-white p-3.5 shadow-[0_2px_12px_rgba(8,39,90,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="rounded-lg bg-blue-50 p-2.5 text-[#0866f5]">
              <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-bold text-[#08275a]">{title}</span>
              <span className="mt-1 block truncate text-[9px] text-slate-500">{subtitle}</span>
            </span>
            <ArrowRight size={14} className="text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

async function AdminSectionPage({
  section,
  searchParams,
}: {
  section: AdminSection;
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const search = safeSearch(params.q);
  const page = safePage(params.page);
  await requireAdministrator();

  if (section === "dashboard") {
    return <AdminDashboard search={search} />;
  }

  if (section === "users") {
    const result = await getRecentAdminUsers(search, page);
    return (
      <div className="space-y-4">
        <PageHeading title="Users" description="Registered marketplace accounts. Private email addresses are not exposed by the current profile schema." />
        {result.error ? (
          <ErrorPanel message={result.error.message} />
        ) : result.data.length ? (
          <>
            <Panel title="Marketplace users" description={`${formatCount(result.count)} total accounts`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="bg-[#f7faff] text-[9px] uppercase tracking-wider text-slate-500">
                    <tr><th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Role</th><th className="px-3 py-2.5">Location</th><th className="px-3 py-2.5">Joined</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2fa]">
                    {result.data.map((user) => (
                      <tr key={user.id} className="text-slate-700">
                        <td className="px-3 py-3 font-semibold text-[#08275a]">{user.display_name || "Marketplace member"}</td>
                        <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
                        <td className="px-3 py-3">{user.location || "—"}</td>
                        <td className="px-3 py-3">{formatDate(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} count={result.count} search={search} base="/admin/users" />
            </Panel>
          </>
        ) : <EmptyPanel title="No matching accounts" description="Try another search or check back when new users register." />}
      </div>
    );
  }

  if (section === "sellers") {
    const supabase = await createServerSupabaseClient();
    const [result, applicationsResult] = await Promise.all([
      getAdminSellers(search, page),
      supabase
        .from("seller_verification_applications")
        .select("id, reference, user_id, status, personal_data, business_data, operations_data, submitted_at, updated_at, applicant_message")
        .neq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);
    const applicationIds = (applicationsResult.data ?? []).map((item) => item.id);
    const documentsResult = applicationIds.length
      ? await supabase
          .from("seller_verification_documents")
          .select("id, application_id, document_type, issuing_country, content_type, size_bytes")
          .in("application_id", applicationIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    const checksResult = applicationIds.length
      ? await supabase
          .from("seller_verification_checks")
          .select("application_id, check_type, outcome, reason")
          .in("application_id", applicationIds)
      : { data: [], error: null };
    const documentsByApplication = new Map<string, VerificationReviewRecord["documents"]>();
    for (const document of documentsResult.data ?? []) {
      const summary = {
        id: document.id,
        document_type: document.document_type,
        issuing_country: document.issuing_country,
        content_type: document.content_type,
        size_bytes: document.size_bytes,
      };
      const current = documentsByApplication.get(document.application_id) ?? [];
      current.push(summary);
      documentsByApplication.set(document.application_id, current);
    }
    const checksByApplication = new Map<string, VerificationReviewRecord["checks"]>();
    for (const check of checksResult.data ?? []) {
      const current = checksByApplication.get(check.application_id) ?? [];
      current.push({
        check_type: check.check_type,
        outcome: check.outcome,
        reason: check.reason,
      });
      checksByApplication.set(check.application_id, current);
    }
    const verificationApplications: VerificationReviewRecord[] = (
      applicationsResult.data ?? []
    ).map((application) => ({
      ...application,
      personal_data: application.personal_data as Record<string, unknown>,
      business_data: application.business_data as Record<string, unknown>,
      operations_data: application.operations_data as Record<string, unknown>,
      documents: documentsByApplication.get(application.id) ?? [],
      checks: checksByApplication.get(application.id) ?? [],
    }));
    const verificationError =
      applicationsResult.error?.message ??
      documentsResult.error?.message ??
      checksResult.error?.message;
    return (
      <div className="space-y-4">
        <PageHeading title="Seller verification" description="Review private identity and store applications before enabling seller access." />
        <Panel title="Verification applications" description="Identity documents are opened through one-minute, administrator-only links. Never copy or share document URLs.">
          {verificationError ? (
            <ErrorPanel message={`Unable to load seller verification applications: ${verificationError}`} />
          ) : (
            <SellerVerificationReview applications={verificationApplications} />
          )}
        </Panel>
        <PageHeading title="Approved sellers" description="Existing verified seller profiles." />
        {result.error ? <ErrorPanel message={result.error.message} /> : result.data.length ? (
          <>
            <Panel title="Registered sellers" description={`${formatCount(result.count)} approved sellers`}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result.data.map((seller) => (
                  <article key={seller.user_id} className="rounded-lg border border-[#dce8f8] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xs font-bold text-[#08275a]">{seller.business_name?.trim() || seller.display_name}</h2>
                        <p className="mt-1 text-[10px] text-slate-500">{seller.seller_type === "business" ? "Business seller" : "Individual seller"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Approved</span>
                    </div>
                    <p className="mt-3 text-[9px] text-slate-500">Joined {formatDate(seller.created_at)}</p>
                  </article>
                ))}
              </div>
              <Pagination page={page} count={result.count} search={search} base="/admin/sellers" />
            </Panel>
          </>
        ) : <EmptyPanel title="No matching sellers" description="Approved sellers will appear here after an administrator reviews their applications." />}
      </div>
    );
  }

  if (section === "products") {
    const result = await getAdminProducts(search, page);
    return (
      <div className="space-y-4">
        <PageHeading title="Products" description="Listing inventory and moderation status across the marketplace." action={<Link href="/admin" className="rounded-lg bg-[#0866f5] px-3 py-2 text-[10px] font-bold text-white">Open review queue</Link>} />
        {result.error ? <ErrorPanel message={result.error.message} /> : result.data.length ? (
          <Panel title="Marketplace listings" description={`${formatCount(result.count)} total product records`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-[#f7faff] text-[9px] uppercase tracking-wider text-slate-500">
                  <tr><th className="px-3 py-2.5">Product</th><th className="px-3 py-2.5">Price</th><th className="px-3 py-2.5">Location</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Created</th></tr>
                </thead>
                <tbody className="divide-y divide-[#edf2fa]">
                  {result.data.map((product) => (
                    <tr key={product.id} className="text-slate-700">
                      <td className="px-3 py-3 font-semibold text-[#08275a]">{product.name}</td>
                      <td className="px-3 py-3">{product.currency} {Number(product.price).toLocaleString("en-US")}</td>
                      <td className="px-3 py-3">{product.location}</td>
                      <td className="px-3 py-3"><RoleBadge role={product.moderation_status} /></td>
                      <td className="px-3 py-3">{formatDate(product.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} count={result.count} search={search} base="/admin/products" />
          </Panel>
        ) : <EmptyPanel title="No matching products" description="Try another search or open the moderation queue." />}
      </div>
    );
  }

  if (section === "reports") {
    const supabase = await createServerSupabaseClient();
    const [reports, applications, products] = await Promise.all([
      getExactCount(supabase, "listing_reports", [{ column: "status", operator: "eq", value: "pending" }]),
      getExactCount(supabase, "seller_verification_applications", [
        {
          column: "status",
          operator: "in",
          value: ["pending_review", "under_review", "action_required"],
        },
      ]),
      getExactCount(supabase, "products", [{ column: "moderation_status", operator: "eq", value: "pending_review" }]),
    ]);
    return (
      <div className="space-y-4">
        <PageHeading title="Reports & Review" description="Safety reports and moderation queues available in the current platform." />
        <div className="grid gap-3 sm:grid-cols-3">
          <DashboardCard label="Pending Reports" value={formatCount(reports.count)} icon={Flag} iconClass="bg-amber-50 text-amber-700" href="/admin" note="Current listing reports" />
          <DashboardCard label="Seller Applications" value={formatCount(applications.count)} icon={Store} iconClass="bg-blue-50 text-[#0866f5]" href="/admin" note="Awaiting review" />
          <DashboardCard label="Product Reviews" value={formatCount(products.count)} icon={Package} iconClass="bg-violet-50 text-violet-600" href="/admin" note="Awaiting moderation" />
        </div>
        <Panel title="Existing review tools">
          <div className="flex flex-wrap gap-2">
            <Link href="/admin" className="rounded-lg bg-[#0866f5] px-4 py-2.5 text-xs font-bold text-white">Open seller, listing &amp; report queue</Link>
          </div>
        </Panel>
      </div>
    );
  }

  if (section === "orders" || section === "payments") {
    const orders = section === "orders";
    return (
      <div className="space-y-4">
        <PageHeading title={orders ? "Orders" : "Payments"} description={orders ? "Marketplace order tracking." : "Verified transaction and payout oversight."} />
        <Panel title={orders ? "Order management" : "Payment management"}>
          <UnavailablePanel
            title={orders ? "Order records are not configured" : "Verified payments are not configured"}
            description={
              orders
                ? "This project has no orders table, order workflow, or checkout records. Order totals, customer names, fulfillment status, and transaction amounts are intentionally not fabricated."
                : "No payment provider or verified payment webhook is configured. Revenue, seller commissions, refunds, and payout balances are unavailable and are not shown as zero."
            }
          />
        </Panel>
      </div>
    );
  }

  if (section === "marketing") {
    return (
      <div className="space-y-4">
        <PageHeading title="Marketing" description="Promotional tools currently available in the marketplace." />
        <Panel title="Offers and campaigns">
          <EmptyPanel title="No campaign system is configured" description="Discounts, promotional codes, and campaign scheduling are not currently supported. No sample promotions are shown." />
        </Panel>
      </div>
    );
  }

  if (section === "settings") {
    return (
      <div className="space-y-4">
        <PageHeading title="Settings" description="Manage your administrator account and platform operations." />
        <Panel title="Account and platform">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/account" className="rounded-lg border border-[#dce8f8] p-4 hover:bg-blue-50">
              <p className="text-xs font-bold text-[#08275a]">Administrator account</p>
              <p className="mt-1 text-[10px] text-slate-500">Manage profile information and account security.</p>
            </Link>
            <Link href="/admin" className="rounded-lg border border-[#dce8f8] p-4 hover:bg-blue-50">
              <p className="text-xs font-bold text-[#08275a]">Moderation settings</p>
              <p className="mt-1 text-[10px] text-slate-500">Review seller applications, listings, and reports.</p>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  notFound();
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
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0866f5]">Admin workspace</p>
        <h1 className="mt-1 text-xl font-black text-[#08275a]">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-800">Unable to load this section: {message}</p>;
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#c4d5ec] bg-[#fbfdff] px-4 py-10 text-center">
      <FileText size={22} className="mx-auto text-slate-300" />
      <p className="mt-2 text-xs font-bold text-slate-600">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-[10px] leading-4 text-slate-500">{description}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "seller" || role === "published"
      ? "bg-emerald-50 text-emerald-700"
      : role === "administrator"
        ? "bg-violet-50 text-violet-700"
        : role.includes("pending")
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${color}`}>
      {role.replaceAll("_", " ")}
    </span>
  );
}

function Pagination({
  page,
  count,
  search,
  base,
}: {
  page: number;
  count: number | null;
  search: string;
  base: string;
}) {
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / 25));
  const href = (target: number) =>
    `${base}?${new URLSearchParams({
      ...(search ? { q: search } : {}),
      page: String(target),
    }).toString()}`;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between border-t border-[#edf2fa] pt-3">
      <p className="text-[10px] text-slate-500">
        Page {page} of {totalPages} · {formatCount(count)} records
      </p>
      <div className="flex gap-2">
        <Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={`rounded-md border px-3 py-1.5 text-[10px] font-bold ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-[#dce8f8] text-[#0866f5] hover:bg-blue-50"}`}>Previous</Link>
        <Link aria-disabled={page >= totalPages} href={href(Math.min(totalPages, page + 1))} className={`rounded-md border px-3 py-1.5 text-[10px] font-bold ${page >= totalPages ? "pointer-events-none border-slate-100 text-slate-300" : "border-[#dce8f8] text-[#0866f5] hover:bg-blue-50"}`}>Next</Link>
      </div>
    </nav>
  );
}

export default async function AdminSectionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: SearchParams;
}) {
  const { section } = await params;
  if (!ADMIN_SECTIONS.includes(section as AdminSection)) {
    notFound();
  }
  return (
    <AdminSectionPage
      section={section as AdminSection}
      searchParams={searchParams}
    />
  );
}
