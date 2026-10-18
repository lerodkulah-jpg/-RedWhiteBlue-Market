"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentAccount } from "@/app/lib/auth/account";
import type { FormState } from "@/app/lib/auth/form-state";
import { createSellerTrialIdentityFingerprint } from "@/app/lib/seller-subscriptions";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createStorageAdminClient } from "@/app/lib/supabase/storage-admin";

const bucketName = "seller-verification-private";
const maxDocumentBytes = 5 * 1024 * 1024;
const POLICY_VERSION = "2026-10-18-v1";

const formSchema = z.object({
  applicationId: z.string().uuid().optional().or(z.literal("")),
  intent: z.enum(["draft", "submit"]),
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  phone: z.string().trim().max(30),
  personalCountry: z.string().trim().max(80),
  personalCity: z.string().trim().max(80),
  businessType: z.enum(["individual", "registered_business", "company"]),
  storeName: z.string().trim().max(120),
  storeDescription: z.string().trim().max(2000),
  operatingCountry: z.string().trim().max(80),
  operatingCity: z.string().trim().max(80),
  businessAddress: z.string().trim().max(200),
  registrationNumber: z.string().trim().max(100),
  productCategories: z.array(z.string().trim().min(1).max(60)).max(20),
  productSources: z.string().trim().max(1000),
  sellerMethod: z.enum(["manufacture", "distribute", "resell"]),
  deliveryMethods: z.string().trim().max(500),
  processingTime: z.string().trim().max(120),
  authenticity: z.boolean(),
  identityDocumentType: z.enum(["national_id", "passport", "drivers_license"]),
  identityIssuingCountry: z.string().trim().max(80),
  registrationIssuingCountry: z.string().trim().max(80),
  terms: z.boolean(),
  privacyNotice: z.boolean(),
  prohibitedProducts: z.boolean(),
  refunds: z.boolean(),
  antiFraud: z.boolean(),
  accurateListings: z.boolean(),
});

type VerificationDocument = {
  file: File;
  type: "national_id" | "passport" | "drivers_license" | "business_registration";
  issuingCountry: string;
  extension: string;
  contentType: "image/jpeg" | "image/png" | "application/pdf";
};

function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Review the application details and try again.";
}

function getDocumentFile(formData: FormData, name: string) {
  const value = formData.get(name);
  if (value === null || (value instanceof File && value.size === 0)) {
    return { file: null, error: null };
  }
  if (!(value instanceof File)) {
    return { file: null, error: "Choose a valid document file." };
  }
  if (value.size > maxDocumentBytes) {
    return { file: null, error: "Each verification document must be 5 MB or smaller." };
  }
  return { file: value, error: null };
}

async function verifyDocument(
  file: File,
  type: VerificationDocument["type"],
  issuingCountry: string,
): Promise<VerificationDocument | null> {
  if (!issuingCountry || issuingCountry.length > 80) {
    return null;
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { file, type, issuingCountry, extension: "jpg", contentType: "image/jpeg" };
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
    return { file, type, issuingCountry, extension: "png", contentType: "image/png" };
  }
  if (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d
  ) {
    return { file, type, issuingCountry, extension: "pdf", contentType: "application/pdf" };
  }
  return null;
}

function readApplication(formData: FormData) {
  return formSchema.safeParse({
    applicationId: formData.get("applicationId") || "",
    intent: formData.get("intent"),
    firstName: formData.get("firstName") || "",
    lastName: formData.get("lastName") || "",
    phone: formData.get("phone") || "",
    personalCountry: formData.get("personalCountry") || "",
    personalCity: formData.get("personalCity") || "",
    businessType: formData.get("businessType") || "individual",
    storeName: formData.get("storeName") || "",
    storeDescription: formData.get("storeDescription") || "",
    operatingCountry: formData.get("operatingCountry") || "",
    operatingCity: formData.get("operatingCity") || "",
    businessAddress: formData.get("businessAddress") || "",
    registrationNumber: formData.get("registrationNumber") || "",
    productCategories: formData.getAll("productCategories"),
    productSources: formData.get("productSources") || "",
    sellerMethod: formData.get("sellerMethod") || "resell",
    deliveryMethods: formData.get("deliveryMethods") || "",
    processingTime: formData.get("processingTime") || "",
    authenticity: formData.get("authenticity") === "on",
    identityDocumentType: formData.get("identityDocumentType") || "national_id",
    identityIssuingCountry: formData.get("identityIssuingCountry") || "",
    registrationIssuingCountry: formData.get("registrationIssuingCountry") || "",
    terms: formData.get("terms") === "on",
    privacyNotice: formData.get("privacyNotice") === "on",
    prohibitedProducts: formData.get("prohibitedProducts") === "on",
    refunds: formData.get("refunds") === "on",
    antiFraud: formData.get("antiFraud") === "on",
    accurateListings: formData.get("accurateListings") === "on",
  });
}

function makePayload(data: z.infer<typeof formSchema>) {
  return {
    personal: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      country: data.personalCountry,
      city: data.personalCity,
    },
    business: {
      storeName: data.storeName,
      description: data.storeDescription,
      businessType: data.businessType,
      country: data.operatingCountry,
      city: data.operatingCity,
      address: data.businessAddress,
      registrationNumber: data.registrationNumber,
      categories: data.productCategories,
    },
    operations: {
      productSources: data.productSources,
      sellerMethod: data.sellerMethod,
      deliveryMethods: data.deliveryMethods,
      processingTime: data.processingTime,
      authenticity: data.authenticity,
    },
    payout: { verificationStatus: "unavailable" },
    agreements: {
      sellerTerms: data.terms,
      privacyNotice: data.privacyNotice,
      prohibitedProducts: data.prohibitedProducts,
      refunds: data.refunds,
      antiFraud: data.antiFraud,
      accurateListings: data.accurateListings,
      version: POLICY_VERSION,
    },
  };
}

export async function saveSellerVerificationApplicationAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getCurrentAccount();
  if (!account.configured || !account.user) {
    return { status: "error", message: "Sign in before applying to become a seller." };
  }
  if (account.profile?.role !== "buyer") {
    return { status: "error", message: "This account is not eligible to start a seller application." };
  }
  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.email_confirmed_at) {
    return { status: "error", message: "Verify your account email before applying to sell." };
  }

  const parsed = readApplication(formData);
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }
  const data = parsed.data;
  const isSubmitting = data.intent === "submit";
  if (isSubmitting) {
    const validation = z.object({
      firstName: z.string().trim().min(1, "Enter your legal first name.").max(80),
      lastName: z.string().trim().min(1, "Enter your legal last name.").max(80),
      phone: z.string().trim().min(5, "Enter a valid phone number.").max(30),
      personalCountry: z.string().trim().min(2, "Enter your country of residence.").max(80),
      personalCity: z.string().trim().min(2, "Enter your city or general location.").max(80),
      storeName: z.string().trim().min(2, "Enter a proposed store name.").max(120),
      storeDescription: z.string().trim().min(20, "Describe your store in at least 20 characters.").max(2000),
      operatingCountry: z.string().trim().min(2, "Enter your operating country.").max(80),
      operatingCity: z.string().trim().min(2, "Enter your operating city.").max(80),
      productCategories: z.array(z.string()).min(1, "Choose at least one product category.").max(20),
      productSources: z.string().trim().min(5, "Describe where your products come from.").max(1000),
      deliveryMethods: z.string().trim().min(3, "Describe your delivery methods.").max(500),
      processingTime: z.string().trim().min(2, "Enter your expected processing time.").max(120),
      authenticity: z.literal(true, { error: "Confirm that your listings will be lawful and authentic." }),
      identityIssuingCountry: z.string().trim().min(2, "Choose the identity document's issuing country.").max(80),
      terms: z.literal(true, { error: "Accept the Seller Terms and Conditions." }),
      privacyNotice: z.literal(true, { error: "Acknowledge the identity-data privacy notice." }),
      prohibitedProducts: z.literal(true, { error: "Acknowledge the Prohibited Products Policy." }),
      refunds: z.literal(true, { error: "Acknowledge the refund and dispute rules." }),
      antiFraud: z.literal(true, { error: "Acknowledge the anti-fraud requirements." }),
      accurateListings: z.literal(true, { error: "Confirm that your application information is accurate." }),
    }).safeParse(data);
    if (!validation.success) {
      return { status: "error", message: validationMessage(validation.error) };
    }
    if (
      data.businessType !== "individual" &&
      !data.registrationNumber &&
      data.businessType === "company"
    ) {
      return { status: "error", message: "Enter the company registration number when available." };
    }
  }

  const identityFile = getDocumentFile(formData, "identityDocument");
  const registrationFile = getDocumentFile(formData, "registrationDocument");
  if (identityFile.error || registrationFile.error) {
    return { status: "error", message: identityFile.error ?? registrationFile.error! };
  }
  const documents: VerificationDocument[] = [];
  if (identityFile.file) {
    const verified = await verifyDocument(
      identityFile.file,
      data.identityDocumentType,
      data.identityIssuingCountry,
    );
    if (!verified) {
      return {
        status: "error",
        message: "Identity documents must be valid JPEG, PNG, or PDF files and include an issuing country.",
      };
    }
    documents.push(verified);
  }
  if (registrationFile.file) {
    const verified = await verifyDocument(
      registrationFile.file,
      "business_registration",
      data.registrationIssuingCountry || data.operatingCountry,
    );
    if (!verified) {
      return {
        status: "error",
        message: "Business documents must be valid JPEG, PNG, or PDF files and include an issuing country.",
      };
    }
    documents.push(verified);
  }

  const payload = makePayload(data);
  const draftResult = await supabase.rpc("save_seller_verification_application", {
    p_application_id: data.applicationId || null,
    p_data: payload,
    p_documents: [],
    p_submit: false,
  });
  if (draftResult.error || typeof draftResult.data !== "string") {
    return {
      status: "error",
      message: draftResult.error?.message ?? "Unable to save the application draft.",
    };
  }
  const applicationId = draftResult.data;
  const uploadedPaths: string[] = [];
  const documentMetadata: {
    document_type: VerificationDocument["type"];
    issuing_country: string;
    storage_path: string;
    content_type: VerificationDocument["contentType"];
    size_bytes: number;
  }[] = [];

  if (documents.length) {
    const storageAdmin = createStorageAdminClient();
    if (!storageAdmin) {
      return {
        status: "error",
        message: "Private document storage is not configured. Set SUPABASE_SERVICE_ROLE_KEY on the server before uploading verification documents.",
      };
    }
    for (const document of documents) {
      const path = `${account.user.id}/${applicationId}/${randomUUID()}.${document.extension}`;
      const { error } = await storageAdmin.storage.from(bucketName).upload(path, document.file, {
        contentType: document.contentType,
        upsert: false,
      });
      if (error) {
        const cleanup = uploadedPaths.length
          ? await storageAdmin.storage.from(bucketName).remove(uploadedPaths)
          : { error: null };
        return {
          status: "error",
          message: cleanup.error
            ? `Document upload failed and cleanup was incomplete: ${error.message}; ${cleanup.error.message}`
            : `Document upload failed: ${error.message}`,
        };
      }
      uploadedPaths.push(path);
      documentMetadata.push({
        document_type: document.type,
        issuing_country: document.issuingCountry,
        storage_path: path,
        content_type: document.contentType,
        size_bytes: document.file.size,
      });
    }
  }

  if (isSubmitting || documentMetadata.length) {
    const result = await supabase.rpc("save_seller_verification_application", {
      p_application_id: applicationId,
      p_data: payload,
      p_documents: documentMetadata,
      p_submit: isSubmitting,
    });
    if (result.error) {
      if (uploadedPaths.length) {
        const storageAdmin = createStorageAdminClient();
        const cleanup = storageAdmin
          ? await storageAdmin.storage.from(bucketName).remove(uploadedPaths)
          : { error: null };
        if (cleanup.error) {
          return {
            status: "error",
            message: `Application update failed (${result.error.message}); private document cleanup also failed (${cleanup.error.message}).`,
          };
        }
      }
      return { status: "error", message: result.error.message };
    }
  }

  revalidatePath("/sell");
  if (isSubmitting) {
    redirect("/sell?submitted=1");
  }
  redirect("/sell?saved=1");
}

export async function reviewSellerVerificationAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const account = await getCurrentAccount();
  if (!account.configured || !account.user || account.profile?.role !== "administrator") {
    return { status: "error", message: "Administrator access is required." };
  }
  const parsed = z.object({
    applicationId: z.string().uuid(),
    status: z.enum(["under_review", "action_required", "approved", "rejected", "suspended"]),
    reason: z.string().trim().max(1000),
  }).safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    reason: formData.get("reason") || "",
  });
  if (!parsed.success) {
    return { status: "error", message: validationMessage(parsed.error) };
  }
  if (
    ["action_required", "rejected", "suspended"].includes(parsed.data.status) &&
    parsed.data.reason.length < 3
  ) {
    return { status: "error", message: "Provide a reason of at least 3 characters for this decision." };
  }
  const checkOutcomes = {
    identity: formData.get("check_identity") === "on",
    business: formData.get("check_business") === "on",
    store_name: formData.get("check_store_name") === "on",
    operations: formData.get("check_operations") === "on",
    agreements: formData.get("check_agreements") === "on",
  };
  let trialIdentityFingerprint: string | null = null;
  if (parsed.data.status === "approved") {
    const identityNumber = formData.get("verified_identity_number");
    if (typeof identityNumber !== "string") {
      return {
        status: "error",
        message: "Read the identity number from the reviewed identity document.",
      };
    }
    try {
      trialIdentityFingerprint =
        createSellerTrialIdentityFingerprint(identityNumber);
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The verified identity could not be protected for trial enforcement.",
      };
    }
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("review_seller_verification_application", {
    p_application_id: parsed.data.applicationId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
    p_check_outcomes: checkOutcomes,
    p_duplicate_trial_reviewed:
      formData.get("duplicate_trial_reviewed") === "on",
    p_trial_identity_fingerprint: trialIdentityFingerprint,
  });
  if (error) {
    return { status: "error", message: error.message };
  }
  revalidatePath("/admin/sellers");
  revalidatePath("/admin/dashboard");
  revalidatePath("/sell");
  revalidatePath("/seller", "layout");
  revalidatePath("/dashboard", "page");
  return { status: "success", message: "Verification decision saved." };
}

export async function registerSellerTrialIdentityAction(
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
      applicationId: z.string().uuid(),
      identityNumber: z.string().trim().min(4).max(128),
    })
    .safeParse({
      applicationId: formData.get("applicationId"),
      identityNumber: formData.get("verified_identity_number"),
    });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter the identity number from the reviewed document.",
    };
  }

  let identityFingerprint: string;
  try {
    identityFingerprint = createSellerTrialIdentityFingerprint(
      parsed.data.identityNumber,
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "The verified identity could not be protected for trial enforcement.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: application, error: applicationError } = await supabase
    .from("seller_verification_applications")
    .select("user_id, status")
    .eq("id", parsed.data.applicationId)
    .maybeSingle();
  if (applicationError) {
    return {
      status: "error",
      message: `Unable to verify the seller application: ${applicationError.message}`,
    };
  }
  if (!application || application.status !== "approved") {
    return {
      status: "error",
      message: "Only an approved seller's reviewed identity can be registered.",
    };
  }

  const { error } = await supabase.rpc("register_seller_trial_identity", {
    p_seller_id: application.user_id,
    p_identity_fingerprint: identityFingerprint,
  });
  if (error) {
    return { status: "error", message: error.message };
  }

  revalidatePath("/admin/sellers");
  return {
    status: "success",
    message: "Verified identity fingerprint registered for trial prevention.",
  };
}

export async function createVerificationDocumentLinkAction(
  documentId: string,
): Promise<{ url: string | null; error: string | null }> {
  const account = await getCurrentAccount();
  if (!account.configured || !account.user || account.profile?.role !== "administrator") {
    return { url: null, error: "Administrator access is required to review identity documents." };
  }
  if (!z.string().uuid().safeParse(documentId).success) {
    return { url: null, error: "Invalid verification document." };
  }
  const storageAdmin = createStorageAdminClient();
  if (!storageAdmin) {
    return { url: null, error: "Private document storage is not configured on the server." };
  }
  const supabase = await createServerSupabaseClient();
  const { data: document, error: documentError } = await supabase
    .from("seller_verification_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (documentError || !document?.storage_path) {
    return { url: null, error: "The verification document is unavailable." };
  }
  const { data, error } = await storageAdmin.storage
    .from(bucketName)
    .createSignedUrl(document.storage_path, 60);
  if (error || !data?.signedUrl) {
    return { url: null, error: error?.message ?? "Unable to create a temporary review link." };
  }
  return { url: data.signedUrl, error: null };
}
