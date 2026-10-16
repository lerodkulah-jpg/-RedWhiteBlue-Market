"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteProductAction,
  markProductSoldAction,
} from "@/app/actions/products";
import { initialFormState } from "@/app/lib/auth/form-state";
import { ProductPhoto } from "@/app/components/product-photo";

export type SellerProduct = {
  id: string;
  name: string;
  price: string | number;
  currency: "USD" | "LRD";
  moderation_status: string;
  image_url: string | null;
};

function ActionButton({
  children,
  intent,
}: {
  children: string;
  intent: "delete" | "sold";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60 ${
        intent === "delete"
          ? "border border-red-200 text-red-700 hover:bg-red-50"
          : "bg-green-700 text-white hover:bg-green-800"
      }`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function ProductActions({ product }: { product: SellerProduct }) {
  const [soldState, soldAction] = useActionState(
    markProductSoldAction,
    initialFormState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteProductAction,
    initialFormState,
  );

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {product.moderation_status !== "sold" &&
        product.moderation_status !== "archived" && (
          <Link
            href={`/dashboard/products/${product.id}/edit`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-[#102d58] hover:bg-slate-50"
          >
            Edit
          </Link>
        )}
      {product.moderation_status === "published" && (
        <form action={soldAction}>
          <input type="hidden" name="productId" value={product.id} />
          <ActionButton intent="sold">Mark as sold</ActionButton>
        </form>
      )}
      <form action={deleteAction}>
        <input type="hidden" name="productId" value={product.id} />
        <ActionButton intent="delete">Delete listing</ActionButton>
      </form>
      {(soldState.message || deleteState.message) && (
        <p
          role={
            soldState.status === "error" || deleteState.status === "error"
              ? "alert"
              : "status"
          }
          className={`w-full text-xs ${
            soldState.status === "error" || deleteState.status === "error"
              ? "text-red-700"
              : "text-green-700"
          }`}
        >
          {soldState.message || deleteState.message}
        </p>
      )}
    </div>
  );
}

export function ProductManagement({
  products,
}: {
  products: SellerProduct[];
}) {
  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm leading-6 text-slate-600">
        You have no listings yet. Create a listing and submit it for review.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {products.map((product) => (
        <article
          key={product.id}
          className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5"
        >
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
            <ProductPhoto
              src={product.image_url}
              alt={product.name}
              fallback="🛍️"
              imageClassName="h-full w-full object-cover"
              fallbackClassName="text-4xl"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-[#102d58]">{product.name}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {product.moderation_status.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              {product.currency} {Number(product.price).toLocaleString("en-US")}
            </p>
            <ProductActions product={product} />
          </div>
        </article>
      ))}
    </div>
  );
}
