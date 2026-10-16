"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reviewProductAction } from "@/app/actions/products";
import { initialFormState } from "@/app/lib/auth/form-state";
import { ProductPhoto } from "@/app/components/product-photo";

export type ModerationProduct = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  currency: "USD" | "LRD";
  location: string;
  category: string;
  seller: string;
  imageUrl: string | null;
};

function ReviewButton({
  status,
  children,
}: {
  status: "published" | "rejected";
  children: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      name="status"
      value={status}
      disabled={pending}
      className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${
        status === "published"
          ? "bg-green-700 hover:bg-green-800"
          : "bg-red-700 hover:bg-red-800"
      }`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function ProductReviewRow({ product }: { product: ModerationProduct }) {
  const [state, action] = useActionState(reviewProductAction, initialFormState);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
          <ProductPhoto
            src={product.imageUrl}
            alt={product.name}
            fallback="🛍️"
            imageClassName="h-full w-full object-cover"
            fallbackClassName="text-4xl"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-[#102d58]">{product.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {product.category} · {product.currency}{" "}
            {Number(product.price).toLocaleString("en-US")} · {product.location}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Seller: {product.seller}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {product.description}
          </p>
        </div>
      </div>
      <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="productId" value={product.id} />
        <ReviewButton status="published">Approve and publish</ReviewButton>
        <ReviewButton status="rejected">Reject listing</ReviewButton>
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`text-sm ${
              state.status === "error" ? "text-red-700" : "text-green-700"
            }`}
          >
            {state.message}
          </p>
        )}
      </form>
    </article>
  );
}

export function ProductModeration({
  products,
}: {
  products: ModerationProduct[];
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">
        No listings are waiting for moderation.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductReviewRow key={product.id} product={product} />
      ))}
    </div>
  );
}
