"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  saveProductAction,
  updateProductAction,
} from "@/app/actions/products";
import { initialFormState } from "@/app/lib/auth/form-state";
import { ProductPhoto } from "@/app/components/product-photo";

type CategoryOption = { id: string; name: string };

export type ProductFormValues = {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  price: string;
  currency: "USD" | "LRD";
  condition: string;
  location: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#102d58] focus:ring-2 focus:ring-blue-100";

function SelectedImagePreview({
  previewUrl,
  index,
}: {
  previewUrl: string;
  index: number;
}) {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <ProductPhoto
        src={previewUrl}
        alt={`Selected product image ${index + 1} preview`}
        fallback="🖼️"
        imageClassName="h-full w-full object-cover"
        fallbackClassName="text-3xl"
      />
    </div>
  );
}

function SubmitButton({
  editing,
  disabled,
}: {
  editing: boolean;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-[#102d58] px-5 py-4 font-bold text-white transition hover:bg-[#183e75] disabled:cursor-wait disabled:opacity-70"
    >
      {pending
        ? "Saving listing…"
        : editing
          ? "Save listing changes"
          : "Submit listing for review"}
    </button>
  );
}

export function ProductListingForm({
  categories,
  values,
  existingImages = [],
}: {
  categories: CategoryOption[];
  values?: ProductFormValues;
  existingImages?: { url: string; alt: string }[];
}) {
  const action = values?.id ? updateProductAction : saveProductAction;
  const [state, formAction] = useActionState(action, initialFormState);
  const router = useRouter();
  const [selectedImages, setSelectedImages] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [imageError, setImageError] = useState("");
  const availableImageSlots = Math.max(0, 10 - existingImages.length);
  const maxNewImages = Math.min(4, availableImageSlots);

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [router, state.redirectTo]);

  useEffect(
    () => () => {
      selectedImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    [selectedImages],
  );

  return (
    <form action={formAction} className="space-y-5">
      {values?.id && (
        <input type="hidden" name="productId" value={values.id} />
      )}
      <div>
        <label className="block text-sm font-semibold" htmlFor="name">
          Product name *
        </label>
        <input
          id="name"
          name="name"
          className={inputClass}
          placeholder="e.g. Samsung Galaxy phone"
          defaultValue={values?.name}
          required
          minLength={3}
          maxLength={120}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold" htmlFor="categoryId">
            Category *
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className={inputClass}
            defaultValue={values?.categoryId ?? ""}
            required
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="condition">
            Condition *
          </label>
          <select
            id="condition"
            name="condition"
            className={inputClass}
            defaultValue={values?.condition ?? "used"}
          >
            <option value="new">New</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
            <option value="fresh">Fresh</option>
            <option value="for_sale">For sale</option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold" htmlFor="price">
            Price *
          </label>
          <input
            id="price"
            name="price"
            className={inputClass}
            type="number"
            min="0.01"
            max="9999999999"
            step="0.01"
            placeholder="e.g. 150"
            defaultValue={values?.price}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold" htmlFor="currency">
            Currency *
          </label>
          <select
            id="currency"
            name="currency"
            className={inputClass}
            defaultValue={values?.currency ?? "USD"}
          >
            <option value="USD">USD ($)</option>
            <option value="LRD">LRD (L$)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold" htmlFor="location">
          Location in Liberia *
        </label>
        <input
          id="location"
          name="location"
          className={inputClass}
          placeholder="e.g. Monrovia, Paynesville, Ganta"
          defaultValue={values?.location}
          required
          minLength={2}
          maxLength={120}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold" htmlFor="description">
          Product description *
        </label>
        <textarea
          id="description"
          name="description"
          className={inputClass}
          rows={5}
          placeholder="Describe your product, its features, and its condition..."
          defaultValue={values?.description}
          required
          minLength={10}
          maxLength={5000}
        />
      </div>

      {existingImages.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700">
            Current images
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {existingImages.map((image) => (
              <div
                key={image.url}
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
              >
                <ProductPhoto
                  src={image.url}
                  alt={image.alt}
                  fallback="🛍️"
                  imageClassName="h-full w-full object-cover"
                  fallbackClassName="text-2xl"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            New images are added to these. To remove an image, delete the
            listing and create a new one.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold" htmlFor="images">
          Product images (optional, up to {maxNewImages} new)
        </label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={maxNewImages === 0}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            setSelectedImages(
              files.map((file) => ({
                file,
                previewUrl: URL.createObjectURL(file),
              })),
            );

            if (files.length > maxNewImages) {
              setImageError(
                `Select no more than ${maxNewImages} additional images for this listing.`,
              );
            } else if (files.some((file) => file.size > 4 * 1024 * 1024)) {
              setImageError("Each image must be 4 MB or smaller.");
            } else if (
              files.some(
                (file) =>
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    file.type,
                  ),
              )
            ) {
              setImageError("Choose JPEG, PNG, or WebP image files.");
            } else {
              setImageError("");
            }
          }}
          className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#102d58]`}
        />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          JPEG, PNG, or WebP; each image must be 4 MB or smaller and each
          listing can have up to 10 images. New listings are reviewed before
          appearing publicly.
        </p>
        {maxNewImages === 0 && (
          <p className="mt-2 text-xs text-slate-500">
            This listing already has the maximum number of photos.
          </p>
        )}
        {imageError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {imageError}
          </p>
        )}
        {selectedImages.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">
              Selected image previews
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {selectedImages.map((image, index) => (
                <SelectedImagePreview
                  key={`${image.file.lastModified}-${image.file.size}-${index}`}
                  previewUrl={image.previewUrl}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-xl p-4 text-sm leading-6 ${
            state.status === "error"
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton
        editing={Boolean(values?.id)}
        disabled={Boolean(imageError)}
      />
    </form>
  );
}
