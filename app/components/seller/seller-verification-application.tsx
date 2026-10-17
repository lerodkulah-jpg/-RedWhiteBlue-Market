"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ChevronLeft, ChevronRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { saveSellerVerificationApplicationAction } from "@/app/actions/seller-verification";
import { initialFormState } from "@/app/lib/auth/form-state";

type ApplicationRecord = {
  id: string;
  reference: string;
  status: string;
  personal_data: Record<string, unknown>;
  business_data: Record<string, unknown>;
  operations_data: Record<string, unknown>;
  applicant_message: string | null;
  submitted_at: string | null;
};

type Props = {
  email: string;
  displayName: string;
  phone: string;
  location: string;
  application: ApplicationRecord | null;
  documentTypes: string[];
  savedNotice?: boolean;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[#d4e0f0] bg-white px-3.5 py-3 text-sm text-[#102d58] outline-none transition placeholder:text-slate-400 focus:border-[#0866f5] focus:ring-2 focus:ring-blue-100";
const steps = [
  "Personal",
  "Store",
  "Identity",
  "Operations",
  "Payouts",
  "Agreements",
];
const categories = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Beauty & Health",
  "Sports & Outdoors",
  "Vehicles",
  "Property",
  "Food & Groceries",
  "Agriculture",
  "Services",
  "Other",
];

function fieldValue(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return typeof value === "string" ? value : "";
}

function fieldArray(data: Record<string, unknown> | undefined, key: string) {
  const value = data?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : [];
}

function ApplicationSubmit({
  intent,
  children,
}: {
  intent: "draft" | "submit";
  children: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={`rounded-xl px-5 py-3 text-sm font-bold transition disabled:cursor-wait disabled:opacity-60 ${
        intent === "submit"
          ? "bg-[#0866f5] text-white hover:bg-blue-700"
          : "border border-[#cbd8e8] bg-white text-[#08275a] hover:bg-blue-50"
      }`}
    >
      {pending ? "Saving securely…" : children}
    </button>
  );
}

function StatusPanel({
  application,
  documentTypes,
}: {
  application: ApplicationRecord;
  documentTypes: string[];
}) {
  const statusText: Record<string, { title: string; detail: string; color: string }> = {
    draft: {
      title: "Draft saved",
      detail: "Continue your application whenever you are ready.",
      color: "border-blue-200 bg-blue-50 text-blue-950",
    },
    pending_review: {
      title: "Application submitted",
      detail: "Your application is in the verification queue. Seller tools stay locked until approval.",
      color: "border-amber-200 bg-amber-50 text-amber-950",
    },
    under_review: {
      title: "Application under review",
      detail: "Our verification team is reviewing the information you submitted.",
      color: "border-blue-200 bg-blue-50 text-blue-950",
    },
    action_required: {
      title: "More information needed",
      detail: application.applicant_message || "Update your application and submit the requested information.",
      color: "border-orange-200 bg-orange-50 text-orange-950",
    },
    approved: {
      title: "Seller application approved",
      detail: "Your seller tools are enabled. Payouts remain unavailable until a supported payment provider verifies your account.",
      color: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    rejected: {
      title: "Application not approved",
      detail: application.applicant_message || "Review the feedback, correct your application, and submit it again.",
      color: "border-red-200 bg-red-50 text-red-950",
    },
    suspended: {
      title: "Seller account suspended",
      detail: application.applicant_message || "Seller tools and payouts are disabled. Contact marketplace support for assistance.",
      color: "border-red-200 bg-red-50 text-red-950",
    },
  };
  const status = statusText[application.status] ?? statusText.draft;
  return (
    <section className="mt-6 space-y-4">
      <div className={`rounded-2xl border p-5 ${status.color}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider">{status.title}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">{status.detail}</p>
          </div>
          <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-bold">
            Ref: {application.reference}
          </span>
        </div>
        {application.submitted_at && (
          <p className="mt-3 text-xs opacity-75">
            Submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(application.submitted_at))}
          </p>
        )}
        {application.status === "approved" && (
          <Link
            href="/seller/dashboard"
            className="mt-4 inline-flex rounded-lg bg-[#0866f5] px-4 py-2.5 text-sm font-bold text-white"
          >
            Open seller workspace
          </Link>
        )}
      </div>
      {documentTypes.length > 0 && (
        <p className="text-xs text-slate-500">
          Private documents on file: {documentTypes.join(", ")}. Document contents are visible only to authorized verification staff.
        </p>
      )}
    </section>
  );
}

export function SellerVerificationApplication({
  email,
  displayName,
  phone,
  location,
  application,
  documentTypes,
  savedNotice = false,
}: Props) {
  if (application && !["draft", "action_required", "rejected"].includes(application.status)) {
    return (
      <StatusPanel application={application} documentTypes={documentTypes} />
    );
  }
  return (
    <>
      {application && (
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
          Draft reference: <strong>{application.reference}</strong>
          {application.status !== "draft" && (
            <span className="ml-2">· Correction requested: {application.applicant_message}</span>
          )}
        </div>
      )}
      {savedNotice && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Your draft was saved securely.
        </p>
      )}
      <VerificationForm
        email={email}
        displayName={displayName}
        phone={phone}
        location={location}
        application={application}
        documentTypes={documentTypes}
      />
      {application && documentTypes.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Previously uploaded private documents: {documentTypes.join(", ")}. Add replacement files if requested.
        </p>
      )}
    </>
  );
}

function VerificationForm({
  email,
  displayName,
  phone,
  location,
  application,
  documentTypes,
}: {
  email: string;
  displayName: string;
  phone: string;
  location: string;
  application: ApplicationRecord | null;
  documentTypes: string[];
}) {
  const [step, setStep] = useState(0);
  const [state, action] = useActionState(
    saveSellerVerificationApplicationAction,
    initialFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [reviewSummary, setReviewSummary] = useState<Record<string, string> | null>(null);
  const personal = application?.personal_data;
  const business = application?.business_data;
  const operations = application?.operations_data;
  const priorName = fieldValue(personal, "firstName") || displayName.trim().split(/\s+/)[0] || "";
  const priorLastName = fieldValue(personal, "lastName") || displayName.trim().split(/\s+/).slice(1).join(" ");
  const selectedCategories = fieldArray(business, "categories");
  const correctionMode = application?.status === "action_required" || application?.status === "rejected";

  return (
    <form
      ref={formRef}
      action={action}
      encType="multipart/form-data"
      onChange={() => setReviewSummary(null)}
      className="mt-6"
    >
      <input type="hidden" name="applicationId" value={application?.id ?? ""} />
      <div className="rounded-2xl border border-[#dce8f8] bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-3 text-[#0866f5]">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2 className="font-black text-[#08275a]">Secure seller application</h2>
              <p className="mt-1 text-xs text-slate-500">Your information is encrypted in transit and restricted to you and authorized reviewers.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <LockKeyhole size={13} /> Private verification
          </span>
        </div>

        <ol aria-label="Application progress" className="mb-7 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {steps.map((title, index) => (
            <li key={title}>
              <button
                type="button"
                onClick={() => {
                  setReviewSummary(null);
                  setStep(index);
                }}
                aria-current={step === index ? "step" : undefined}
                className={`w-full rounded-lg px-2 py-2 text-[10px] font-bold ${
                  step === index
                    ? "bg-[#0866f5] text-white"
                    : index < step
                      ? "bg-blue-50 text-[#0866f5]"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {index < step ? <Check size={12} className="mr-1 inline" /> : `${index + 1}. `}
                {title}
              </button>
            </li>
          ))}
        </ol>

        {correctionMode && application?.applicant_message && (
          <p className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950">
            Requested correction: {application.applicant_message}
          </p>
        )}

        <fieldset hidden={step !== 0} className="space-y-4">
          <legend className="text-lg font-black text-[#08275a]">1. Personal information</legend>
          <p className="text-xs leading-5 text-slate-500">Use the name on your identity document. We use this information to verify your seller account.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Legal first name
              <input name="firstName" autoComplete="given-name" maxLength={80} defaultValue={fieldValue(personal, "firstName") || priorName} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">Legal last name
              <input name="lastName" autoComplete="family-name" maxLength={80} defaultValue={fieldValue(personal, "lastName") || priorLastName} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">Verified account email
              <input type="email" value={fieldValue(personal, "email") || email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </label>
            <label className="text-xs font-bold text-slate-700">Phone number with country code
              <input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="+231…" defaultValue={fieldValue(personal, "phone") || phone} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">Country of residence
              <input name="personalCountry" autoComplete="country-name" maxLength={80} defaultValue={fieldValue(personal, "country") || "Liberia"} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">City or general location
              <input name="personalCity" autoComplete="address-level2" maxLength={80} defaultValue={fieldValue(personal, "city") || location.split(",")[0]?.trim() || ""} className={inputClass} />
            </label>
          </div>
        </fieldset>

        <fieldset hidden={step !== 1} className="space-y-4">
          <legend className="text-lg font-black text-[#08275a]">2. Business and store information</legend>
          <p className="text-xs leading-5 text-slate-500">Store names are checked for availability. Registration details are requested only when applicable to your business type.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Proposed store name
              <input name="storeName" maxLength={120} defaultValue={fieldValue(business, "storeName")} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">Business type
              <select name="businessType" defaultValue={fieldValue(business, "businessType") || "individual"} className={inputClass}>
                <option value="individual">Individual seller</option>
                <option value="registered_business">Registered business</option>
                <option value="company">Company</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Store description
              <textarea name="storeDescription" rows={3} maxLength={2000} defaultValue={fieldValue(business, "description")} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">Country of operation
              <input name="operatingCountry" maxLength={80} defaultValue={fieldValue(business, "country") || "Liberia"} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700">City of operation
              <input name="operatingCity" maxLength={80} defaultValue={fieldValue(business, "city")} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Business address (only as needed for verification)
              <input name="businessAddress" maxLength={200} defaultValue={fieldValue(business, "address")} className={inputClass} />
            </label>
            <label className="text-xs font-bold text-slate-700 sm:col-span-2">Business registration number (if applicable)
              <input name="registrationNumber" maxLength={100} defaultValue={fieldValue(business, "registrationNumber")} className={inputClass} />
            </label>
          </div>
          <fieldset>
            <legend className="text-xs font-bold text-slate-700">Product categories</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {categories.map((category) => (
                <label key={category} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700">
                  <input type="checkbox" name="productCategories" value={category} defaultChecked={selectedCategories.includes(category)} />
                  {category}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-bold text-slate-700">Business registration document (optional where not applicable)
            <input name="registrationDocument" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#0866f5]`} />
          </label>
          <label className="block text-xs font-semibold text-slate-500">Issuing country for registration document
            <input name="registrationIssuingCountry" maxLength={80} defaultValue={fieldValue(business, "country") || "Liberia"} className={inputClass} />
          </label>
        </fieldset>

        <fieldset hidden={step !== 2} className="space-y-4">
          <legend className="text-lg font-black text-[#08275a]">3. Identity verification</legend>
          <p className="text-xs leading-5 text-slate-500">Upload one valid identity document. Files are kept in a private bucket and are not accessible from public listing pages. Do not upload payment credentials.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-700">Document type
              <select name="identityDocumentType" defaultValue="national_id" className={inputClass}>
                <option value="national_id">National identity card</option>
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver&apos;s license</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-700">Issuing country
              <input name="identityIssuingCountry" maxLength={80} defaultValue="Liberia" className={inputClass} />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-700">Identity document (JPEG, PNG, or PDF; up to 5 MB)
            <input name="identityDocument" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#0866f5]`} />
          </label>
        </fieldset>

        <fieldset hidden={step !== 3} className="space-y-4">
          <legend className="text-lg font-black text-[#08275a]">4. Store operations and authenticity</legend>
          <label className="block text-xs font-bold text-slate-700">Where do your products come from?
            <textarea name="productSources" rows={3} maxLength={1000} defaultValue={fieldValue(operations, "productSources")} className={inputClass} />
          </label>
          <fieldset>
            <legend className="text-xs font-bold text-slate-700">How will you source or make products?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(["manufacture", "distribute", "resell"] as const).map((method) => (
                <label key={method} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-xs capitalize text-slate-700">
                  <input type="radio" name="sellerMethod" value={method} defaultChecked={fieldValue(operations, "sellerMethod") === method || (!fieldValue(operations, "sellerMethod") && method === "resell")} />
                  {method}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-bold text-slate-700">Delivery methods
            <textarea name="deliveryMethods" rows={2} maxLength={500} placeholder="Pickup, local delivery, courier…" defaultValue={fieldValue(operations, "deliveryMethods")} className={inputClass} />
          </label>
          <label className="block text-xs font-bold text-slate-700">Expected order-processing time
            <input name="processingTime" maxLength={120} placeholder="For example, 1–2 business days" defaultValue={fieldValue(operations, "processingTime")} className={inputClass} />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
            <input type="checkbox" name="authenticity" className="mt-1" defaultChecked={operations?.authenticity === true} />
            I will offer lawful products, describe listings accurately, and provide proof of authenticity for restricted or branded products when legally required.
          </label>
        </fieldset>

        <fieldset hidden={step !== 4} className="space-y-4">
          <legend className="text-lg font-black text-[#08275a]">5. Payout verification</legend>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-950">Payout verification is not currently available</p>
            <p className="mt-2 text-xs leading-5 text-amber-900">
              No payout provider or verified payout-account integration is configured for this marketplace yet. This application will not ask for bank passwords, card security codes, or account credentials. Payouts remain disabled until a supported provider can verify ownership.
            </p>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Seller approval and payout verification are separate decisions. Approval does not represent a verified payout account or guarantee that withdrawals are enabled.
          </p>
        </fieldset>

        <fieldset hidden={step !== 5} className="space-y-4">
          <legend className="text-lg font-black text-[#08275a]">6. Review and security agreements</legend>
          <p className="text-xs leading-5 text-slate-500">Read each policy before checking its box. Consent is not selected in advance. Accepted policy versions and the server-side acceptance time are recorded at submission.</p>
          <div className="space-y-2">
            {[
              ["terms", "Seller Terms and Conditions", "/policies/seller-terms"],
              ["privacyNotice", "Privacy and identity-data processing notice", "/policies/privacy"],
              ["prohibitedProducts", "Prohibited Products Policy", "/policies/prohibited-products"],
              ["refunds", "Refund, cancellation, and dispute rules", "/policies/refunds"],
              ["antiFraud", "Anti-fraud and anti-counterfeit requirements", "/policies/anti-fraud"],
            ].map(([name, title, href]) => (
              <label key={name} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs leading-5 text-slate-700">
                <input type="checkbox" name={name} className="mt-1" />
                <span>I acknowledge the <a href={href} target="_blank" rel="noreferrer" className="font-bold text-[#0866f5] underline">{title}</a>.</span>
              </label>
            ))}
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs leading-5 text-slate-700">
              <input type="checkbox" name="accurateListings" className="mt-1" />
              I confirm the information in this application is accurate, and I will keep product descriptions, stock, prices, and fulfillment information truthful and current.
            </label>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <strong className="text-[#08275a]">Application review:</strong> Your verified email, application data, identity document, and policy acknowledgements will be available only to you and authorized verification staff. Do not include identity document numbers in free-text fields.
          </div>
        </fieldset>

        {step === 5 && reviewSummary && (
          <section aria-label="Application review summary" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-black text-[#08275a]">Review your application</h3>
            <dl className="mt-3 grid gap-x-5 gap-y-2 text-xs sm:grid-cols-2">
              {Object.entries(reviewSummary).map(([label, value]) => (
                <div key={label} className="border-b border-blue-100 pb-2">
                  <dt className="font-bold text-slate-600">{label}</dt>
                  <dd className="mt-0.5 break-words text-slate-800">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[10px] leading-4 text-slate-600">
              Check the information above before submitting. Identity file contents are not displayed in this summary.
            </p>
          </section>
        )}

        {state.message && (
          <p role={state.status === "error" ? "alert" : "status"} className={`mt-5 rounded-xl px-4 py-3 text-sm leading-6 ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
            {state.message}
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex gap-2">
            <button type="button" onClick={() => { setReviewSummary(null); setStep((current) => Math.max(0, current - 1)); }} disabled={step === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-[#08275a] disabled:opacity-40">
              <ChevronLeft size={16} /> Previous
            </button>
            {step < steps.length - 1 && (
              <button type="button" onClick={() => { setReviewSummary(null); setStep((current) => Math.min(steps.length - 1, current + 1)); }} className="inline-flex items-center gap-1 rounded-xl bg-[#08275a] px-4 py-3 text-sm font-bold text-white">
                Continue <ChevronRight size={16} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ApplicationSubmit intent="draft">Save draft</ApplicationSubmit>
            {step === steps.length - 1 && (
              reviewSummary ? (
                <ApplicationSubmit intent="submit">Submit for verification</ApplicationSubmit>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const formData = formRef.current ? new FormData(formRef.current) : null;
                    if (!formData) return;
                    const value = (name: string) => String(formData.get(name) ?? "");
                    const selectedCategories = formData.getAll("productCategories").map(String);
                    const identityFile = formData.get("identityDocument");
                    setReviewSummary({
                      "Legal name": `${value("firstName")} ${value("lastName")}`.trim(),
                      "Verified account email": email,
                      "Store name": value("storeName"),
                      "Business type": value("businessType").replaceAll("_", " "),
                      "Operating location": `${value("operatingCity")}, ${value("operatingCountry")}`.trim(),
                      "Product categories": selectedCategories.join(", "),
                      "Product sourcing": value("productSources"),
                      "Delivery and processing": `${value("deliveryMethods")} · ${value("processingTime")}`,
                      "Identity document": identityFile instanceof File && identityFile.size > 0
                        ? `${value("identityDocumentType").replaceAll("_", " ")} file selected`
                        : documentTypes.length > 0
                          ? "Previously uploaded document on file"
                          : "No identity document selected",
                    });
                  }}
                  className="rounded-xl bg-[#0866f5] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Review Application
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
