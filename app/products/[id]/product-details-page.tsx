
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetails } from "@/app/lib/marketplace";
import { ProductPhoto } from "@/app/components/product-photo";
import { getCurrentAccount } from "@/app/lib/auth/account";
import { ListingReportForm } from "@/app/components/products/listing-report-form";
import { StartConversationForm } from "@/app/components/messages/start-conversation-form";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailsPage({
  params,
}: ProductPageProps) {
  const { id } = await params;
  const [product, account] = await Promise.all([
    getProductDetails(id),
    getCurrentAccount(),
  ]);
  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-[#102d58] px-4 py-2 text-center text-sm font-medium text-white">
        🇱🇷 Proudly serving Liberia — Shop local, support local!
      </div>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-lg font-black text-[#102d58]">
            RedWhiteBlue <span className="text-[#e52b3b]">Market</span>
          </Link>

          <Link
            href="/#products"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-[#102d58] hover:bg-slate-50"
          >
            ← Marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <nav className="mb-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-[#e52b3b]">
            Home
          </Link>
          {" / "}
          <Link href="/#products" className="hover:text-[#e52b3b]">
            Marketplace
          </Link>
          {" / "}
          <span className="font-semibold text-[#102d58]">
            {product.name}
          </span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <section>
            <div
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-linear-to-br ${product.color}`}
            >
              <ProductPhoto
                src={product.imageUrl}
                alt={product.name}
                fallback={product.emoji}
                imageClassName="h-full w-full object-contain"
                fallbackClassName="text-9xl sm:text-[10rem]"
              />

              <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#102d58] shadow-sm">
                {product.condition}
              </span>

              {product.featured && (
                <span className="absolute bottom-4 left-4 rounded-lg bg-[#e52b3b] px-3 py-2 text-xs font-bold text-white">
                  Featured listing
                </span>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              {product.imageUrl
                ? `${product.imageUrls.length} seller image${product.imageUrls.length === 1 ? "" : "s"}`
                : "No product photos have been uploaded for this listing."}
            </p>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
              {product.category}
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#102d58] sm:text-4xl">
              {product.name}
            </h1>

            <p
              className={`mt-5 font-black text-[#102d58] ${
                product.price === null ? "text-lg" : "text-3xl"
              }`}
            >
              {product.formattedPrice}
            </p>

            <div className="my-6 border-t border-slate-100" />

            <h2 className="text-lg font-bold text-[#102d58]">
              Product description
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              {product.description}
            </p>

            <div className="my-6 border-t border-slate-100" />

            <h2 className="text-lg font-bold text-[#102d58]">
              Seller information
            </h2>

            <div className="mt-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                🏪
              </div>

              <div>
                <p className="font-bold text-slate-800">{product.seller}</p>
                <p className="mt-1 text-sm text-slate-500">
                  📍 {product.location}
                </p>
                {product.moderationStatus === "sample" && (
                  <p className="mt-2 text-xs text-slate-400">
                    Sample seller profile — not yet verified.
                  </p>
                )}
              </div>
            </div>

            {product.moderationStatus === "published" &&
            product.seller_id !== account.user?.id ? (
              account.user ? (
                <StartConversationForm productId={product.id} />
              ) : (
                <Link
                  href="/auth/login"
                  className="mt-7 block w-full rounded-xl bg-[#e52b3b] px-5 py-3.5 text-center text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Sign in to message seller
                </Link>
              )
            ) : product.seller_id === account.user?.id ? (
              <p className="mt-7 rounded-xl bg-blue-50 px-4 py-3.5 text-center text-sm font-semibold text-[#102d58]">
                This is your listing.
              </p>
            ) : (
              <p className="mt-7 rounded-xl bg-slate-100 px-4 py-3.5 text-center text-sm text-slate-600">
                Private messaging is available for published listings.
              </p>
            )}

            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              Private messages are available to signed-in, email-verified
              accounts. Secure checkout is not available; agree on a safe
              transaction before paying.
            </p>

            <Link
              href="/#products"
              className="mt-4 block w-full rounded-xl border border-[#102d58] px-5 py-3.5 text-center text-sm font-bold text-[#102d58] transition hover:bg-blue-50"
            >
              Continue shopping
            </Link>
          </section>
        </div>

        <section className="mt-12 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-950">
            Before you buy
          </h2>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            Listings are provided by sellers. Check the item, seller identity,
            ownership documents where relevant, and final price before paying.
            Meet in a public place, tell someone where you are going, and avoid
            sending advance payments to unverified sellers.
          </p>
        </section>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-[#102d58]">
            Report this listing
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Tell us if this listing appears misleading, prohibited, or
            suspicious. Reports are reviewed by an administrator.
          </p>
          <ListingReportForm
            productId={product.id}
            isConfigured={account.configured}
            isSignedIn={Boolean(account.user)}
          />
        </section>
      </div>

      <footer className="mt-8 bg-[#091e3d] px-4 py-6 text-center text-sm text-blue-200">
        &copy; 2026 RedWhiteBlue Market. Built with pride for Liberia.
      </footer>
    </main>
  );
}
