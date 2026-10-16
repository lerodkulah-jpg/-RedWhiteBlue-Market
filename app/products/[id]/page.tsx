import { Suspense } from "react";
import ProductDetailsPage from "./product-details-page";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="min-h-screen bg-slate-50 px-4 py-12 text-center text-sm font-semibold text-slate-500"
        >
          Loading listing details…
        </main>
      }
    >
      <ProductDetailsPage params={params} />
    </Suspense>
  );
}
