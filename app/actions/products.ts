"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAccount } from "@/app/lib/auth/account";
import type { FormState } from "@/app/lib/auth/form-state";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createStorageAdminClient } from "@/app/lib/supabase/storage-admin";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const verifiedImageTypes = {
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
  png: { extension: "png", contentType: "image/png" },
  webp: { extension: "webp", contentType: "image/webp" },
} as const;

const productSchema = z.object({
  name: z.string().trim().min(3, "Product name must be at least 3 characters.").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(5000),
  categoryId: z.string().uuid("Select a valid category."),
  price: z.coerce.number().finite().positive("Price must be greater than zero.").max(9999999999),
  currency: z.enum(["USD", "LRD"]),
  condition: z.enum(["new", "used", "refurbished", "fresh", "for_sale"]),
  location: z.string().trim().min(2, "Enter your location in Liberia.").max(120),
});

type VerifiedImage = {
  file: File;
  extension: string;
  contentType: string;
};

type DetectedImageType =
  (typeof verifiedImageTypes)[keyof typeof verifiedImageTypes];

async function detectImageType(file: File): Promise<DetectedImageType | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return verifiedImageTypes.jpeg;
  }
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return verifiedImageTypes.png;
  }
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return verifiedImageTypes.webp;
  }
  return null;
}

async function getImages(formData: FormData) {
  const values = formData.getAll("images");
  const files = values.filter(
    (value): value is File => value instanceof File && value.size > 0,
  );

  if (values.some((value) => !(value instanceof File))) {
    return { images: [], error: "Choose valid image files." };
  }
  if (files.length > MAX_IMAGES) {
    return { images: [], error: `Upload no more than ${MAX_IMAGES} images.` };
  }
  if (files.some((file) => file.size > MAX_IMAGE_BYTES)) {
    return { images: [], error: "Each product image must be 4 MB or smaller." };
  }

  const images: VerifiedImage[] = [];
  for (const file of files) {
    const detectedType = await detectImageType(file);
    if (!detectedType) {
      return {
        images: [],
        error: "Image contents must be a valid JPEG, PNG, or WebP file.",
      };
    }
    images.push({ file, ...detectedType });
  }

  return { images, error: null };
}

function parseProduct(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    price: formData.get("price"),
    currency: formData.get("currency"),
    condition: formData.get("condition"),
    location: formData.get("location"),
  });
}

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the listing details and try again.";
}

async function requireSeller() {
  const account = await getCurrentAccount();
  if (!account.configured) {
    return { error: "Configure Supabase before creating product listings." } as const;
  }
  if (!account.user || account.profile?.role !== "seller") {
    return { error: "An approved seller account is required to manage listings." } as const;
  }

  return { userId: account.user.id } as const;
}

async function uploadProductImages(
  supabase: NonNullable<ReturnType<typeof createStorageAdminClient>>,
  sellerId: string,
  productId: string,
  images: VerifiedImage[],
) {
  const uploadedPaths: string[] = [];
  const imageRows: {
    product_id: string;
    seller_id: string;
    storage_path: string;
    alt_text: string;
    position: number;
  }[] = [];

  for (const [position, image] of images.entries()) {
    const path = `${sellerId}/${productId}/${randomUUID()}.${image.extension}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, image.file, {
        contentType: image.contentType,
        upsert: false,
      });

    if (error) {
      const cleanup = uploadedPaths.length
        ? await supabase.storage.from("product-images").remove(uploadedPaths)
        : { error: null };
      return {
        error: cleanup.error
          ? `Image upload failed (${error.message}); cleanup also failed (${cleanup.error.message}).`
          : `Image upload failed: ${error.message}`,
        uploadedPaths,
        imageRows: [],
      };
    }

    uploadedPaths.push(path);
    imageRows.push({
      product_id: productId,
      seller_id: sellerId,
      storage_path: path,
      alt_text: `Product image ${position + 1}`,
      position,
    });
  }

  return { error: null, uploadedPaths, imageRows };
}

async function cleanupUploadedImages(
  supabase: NonNullable<ReturnType<typeof createStorageAdminClient>>,
  paths: string[],
) {
  if (paths.length === 0) {
    return null;
  }
  const { error } = await supabase.storage.from("product-images").remove(paths);
  return error?.message ?? null;
}

export async function saveProductAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const seller = await requireSeller();
  if ("error" in seller) {
    return {
      status: "error",
      message: seller.error ?? "An approved seller account is required.",
    };
  }

  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }

  const { images, error: imageError } = await getImages(formData);
  if (imageError) {
    return { status: "error", message: imageError };
  }

  const storageAdmin = createStorageAdminClient();
  if (!storageAdmin) {
    return {
      status: "error",
      message:
        "Secure image storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.categoryId)
    .maybeSingle();
  if (categoryError || !category) {
    return {
      status: "error",
      message: categoryError?.message ?? "Select an available product category.",
    };
  }

  const productId = randomUUID();
  const { error: insertError } = await supabase.from("products").insert({
    id: productId,
    seller_id: seller.userId,
    name: parsed.data.name,
    description: parsed.data.description,
    category_id: category.id,
    price: parsed.data.price,
    currency: parsed.data.currency,
    condition: parsed.data.condition,
    location: parsed.data.location,
    moderation_status: "pending_review",
  });

  if (insertError) {
    return {
      status: "error",
      message: `Listing could not be saved: ${insertError.message}`,
    };
  }

  const uploaded = await uploadProductImages(
    storageAdmin,
    seller.userId,
    productId,
    images,
  );
  if (uploaded.error) {
    const { error: productCleanupError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);
    return {
      status: "error",
      message: productCleanupError
        ? `${uploaded.error}; listing cleanup also failed (${productCleanupError.message}).`
        : uploaded.error,
    };
  }

  if (uploaded.imageRows.length > 0) {
    const { error: imageInsertError } = await supabase
      .from("product_images")
      .insert(uploaded.imageRows);
    if (imageInsertError) {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      const cleanupError = await cleanupUploadedImages(
        storageAdmin,
        uploaded.uploadedPaths,
      );
      const failures = [
        deleteError && `listing cleanup failed (${deleteError.message})`,
        cleanupError && `image cleanup failed (${cleanupError})`,
      ].filter(Boolean);
      return {
        status: "error",
        message: `Product images could not be saved: ${imageInsertError.message}${failures.length ? `; ${failures.join("; ")}` : ""}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/dashboard/products");
  return {
    status: "success",
    message: "Listing submitted for administrator review.",
    redirectTo: "/dashboard/products",
  };
}

export async function updateProductAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const seller = await requireSeller();
  if ("error" in seller) {
    return {
      status: "error",
      message: seller.error ?? "An approved seller account is required.",
    };
  }

  const productId = z.string().uuid().safeParse(formData.get("productId"));
  if (!productId.success) {
    return { status: "error", message: "Invalid product listing." };
  }

  const parsed = parseProduct(formData);
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }

  const { images, error: imageError } = await getImages(formData);
  if (imageError) {
    return { status: "error", message: imageError };
  }

  const storageAdmin = createStorageAdminClient();
  if (!storageAdmin) {
    return {
      status: "error",
      message:
        "Secure image storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const [{ data: category, error: categoryError }, { data: currentImages, error: currentImageError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id")
        .eq("id", parsed.data.categoryId)
        .maybeSingle(),
      supabase
        .from("product_images")
        .select("id")
        .eq("product_id", productId.data),
    ]);
  if (categoryError || !category || currentImageError) {
    return {
      status: "error",
      message:
        categoryError?.message ??
        currentImageError?.message ??
        "Select an available category.",
    };
  }
  if ((currentImages?.length ?? 0) + images.length > 10) {
    return { status: "error", message: "A listing can have no more than 10 images." };
  }

  const { data: product, error: updateError } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      category_id: category.id,
      price: parsed.data.price,
      currency: parsed.data.currency,
      condition: parsed.data.condition,
      location: parsed.data.location,
      moderation_status: "pending_review",
    })
    .eq("id", productId.data)
    .select("id")
    .maybeSingle();

  if (updateError || !product) {
    return {
      status: "error",
      message: updateError?.message ?? "This listing is unavailable or cannot be edited.",
    };
  }

  const uploaded = await uploadProductImages(
    storageAdmin,
    seller.userId,
    productId.data,
    images,
  );
  if (uploaded.error) {
    return {
      status: "error",
      message: `Listing details were saved, but ${uploaded.error.toLowerCase()}`,
    };
  }

  if (uploaded.imageRows.length > 0) {
    const existingCount = currentImages?.length ?? 0;
    uploaded.imageRows.forEach((image, index) => {
      image.position = existingCount + index;
    });
    const { error: imageInsertError } = await supabase
      .from("product_images")
      .insert(uploaded.imageRows);
    if (imageInsertError) {
      const cleanupError = await cleanupUploadedImages(
        storageAdmin,
        uploaded.uploadedPaths,
      );
      return {
        status: "error",
        message: cleanupError
          ? `Listing details were saved for review, but image records failed (${imageInsertError.message}) and cleanup failed (${cleanupError}).`
          : `Listing details were saved for review, but image records failed: ${imageInsertError.message}`,
      };
    }
  }

  revalidatePath("/");
  revalidatePath(`/products/${productId.data}`);
  revalidatePath("/dashboard/products");
  return {
    status: "success",
    message: "Listing updated and submitted for review.",
    redirectTo: "/dashboard/products",
  };
}

export async function markProductSoldAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const seller = await requireSeller();
  if ("error" in seller) {
    return {
      status: "error",
      message: seller.error ?? "An approved seller account is required.",
    };
  }

  const productId = z.string().uuid().safeParse(formData.get("productId"));
  if (!productId.success) {
    return { status: "error", message: "Invalid product listing." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .update({ moderation_status: "sold" })
    .eq("id", productId.data)
    .eq("seller_id", seller.userId)
    .eq("moderation_status", "published")
    .select("id")
    .maybeSingle();
  if (error || !data) {
    return {
      status: "error",
      message: error?.message ?? "Only your published listings can be marked sold.",
    };
  }

  revalidatePath("/");
  revalidatePath("/dashboard/products");
  revalidatePath(`/products/${productId.data}`);
  return { status: "success", message: "Listing marked as sold." };
}

export async function deleteProductAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const seller = await requireSeller();
  if ("error" in seller) {
    return {
      status: "error",
      message: seller.error ?? "An approved seller account is required.",
    };
  }

  const productId = z.string().uuid().safeParse(formData.get("productId"));
  if (!productId.success) {
    return { status: "error", message: "Invalid product listing." };
  }

  const storageAdmin = createStorageAdminClient();
  if (!storageAdmin) {
    return {
      status: "error",
      message:
        "Secure image storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId.data);
  if (imageError) {
    return { status: "error", message: `Unable to load listing images: ${imageError.message}` };
  }

  const { data: deletedProduct, error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId.data)
    .eq("seller_id", seller.userId)
    .select("id")
    .maybeSingle();
  if (deleteError || !deletedProduct) {
    return {
      status: "error",
      message: deleteError?.message ?? "This listing cannot be deleted.",
    };
  }

  const paths = (images ?? []).map((image) => image.storage_path as string);
  const cleanupError = await cleanupUploadedImages(storageAdmin, paths);
  revalidatePath("/");
  revalidatePath("/dashboard/products");
  revalidatePath(`/products/${productId.data}`);

  return cleanupError
    ? {
        status: "success",
        message: `Listing deleted, but one or more image files could not be removed: ${cleanupError}`,
      }
    : { status: "success", message: "Listing deleted." };
}

export async function toggleFavoriteAction(productId: string) {
  const account = await getCurrentAccount();
  if (!account.configured) {
    return { success: false, message: "Configure Supabase to save favorites." };
  }
  if (!account.user) {
    return { success: false, message: "Sign in to save favorite listings." };
  }

  const parsedId = z.string().uuid().safeParse(productId);
  if (!parsedId.success) {
    return { success: false, message: "Only published listings can be saved." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: favorite, error: lookupError } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", account.user.id)
    .eq("product_id", parsedId.data)
    .maybeSingle();
  if (lookupError) {
    return { success: false, message: lookupError.message };
  }

  if (favorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", account.user.id)
      .eq("product_id", parsedId.data);
    if (error) {
      return { success: false, message: error.message };
    }
    revalidatePath("/");
    return { success: true, isFavorite: false };
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: account.user.id,
    product_id: parsedId.data,
  });
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/");
  return { success: true, isFavorite: true };
}

export async function reviewProductAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getCurrentAccount();
  if (
    !account.configured ||
    !account.user ||
    account.profile?.role !== "administrator"
  ) {
    return { status: "error", message: "Administrator access is required." };
  }

  const parsed = z
    .object({
      productId: z.string().uuid("Invalid product listing."),
      status: z.enum(["published", "rejected"]),
    })
    .safeParse({
      productId: formData.get("productId"),
      status: formData.get("status"),
    });
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("review_product", {
    p_product_id: parsed.data.productId,
    p_status: parsed.data.status,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/dashboard/products");
  return { status: "success", message: "Product moderation decision saved." };
}

export async function reportProductAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getCurrentAccount();
  if (!account.configured) {
    return {
      status: "error",
      message: "Listing reports will be available after Supabase is configured.",
    };
  }
  if (!account.user) {
    return { status: "error", message: "Sign in to report a listing." };
  }

  const parsed = z
    .object({
      productId: z.string().uuid("Invalid product listing."),
      reason: z.enum([
        "incorrect_information",
        "prohibited_item",
        "suspected_scam",
        "other",
      ]),
      details: z.string().trim().max(1000).optional(),
    })
    .safeParse({
      productId: formData.get("productId"),
      reason: formData.get("reason"),
      details:
        formData.get("details") === ""
          ? undefined
          : formData.get("details"),
    });
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("listing_reports").insert({
    product_id: parsed.data.productId,
    reporter_id: account.user.id,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "You have already reported this listing."
          : `Unable to submit report: ${error.message}`,
    };
  }

  revalidatePath("/admin");
  return {
    status: "success",
    message: "Thank you. Your report has been sent for administrator review.",
  };
}

export async function reviewListingReportAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getCurrentAccount();
  if (
    !account.configured ||
    !account.user ||
    account.profile?.role !== "administrator"
  ) {
    return { status: "error", message: "Administrator access is required." };
  }

  const parsed = z
    .object({
      reportId: z.string().uuid("Invalid listing report."),
      status: z.enum(["handled", "dismissed"]),
    })
    .safeParse({
      reportId: formData.get("reportId"),
      status: formData.get("status"),
    });
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("review_listing_report", {
    p_report_id: parsed.data.reportId,
    p_status: parsed.data.status,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin");
  return { status: "success", message: "Listing report review saved." };
}
