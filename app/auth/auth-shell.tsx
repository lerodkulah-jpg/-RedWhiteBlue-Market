import Link from "next/link";
import type { ReactNode } from "react";
import { MarketBrand } from "@/app/components/market-brand";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MarketBrand size={40} />
          <Link href="/" className="text-xs font-bold text-[#102d58] hover:text-[#e52b3b]">
            Back to marketplace
          </Link>
        </div>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e52b3b]">
            Liberia Buys. Liberia Sells. Liberia Grows.
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[#102d58]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">{footer}</div>
        </section>
      </div>
    </main>
  );
}
