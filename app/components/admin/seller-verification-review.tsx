"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { FileCheck2, FileText, ExternalLink } from "lucide-react";
import {
  createVerificationDocumentLinkAction,
  registerSellerTrialIdentityAction,
  reviewSellerVerificationAction,
} from "@/app/actions/seller-verification";
import { initialFormState } from "@/app/lib/auth/form-state";

export type VerificationDocumentSummary = {
  id: string;
  document_type: string;
  issuing_country: string;
  content_type: string;
  size_bytes: number;
};

export type VerificationReviewRecord = {
  id: string;
  reference: string;
  user_id: string;
  status: string;
  personal_data: Record<string, unknown>;
  business_data: Record<string, unknown>;
  operations_data: Record<string, unknown>;
  submitted_at: string | null;
  updated_at: string;
  applicant_message: string | null;
  possible_duplicate_trial: boolean;
  documents: VerificationDocumentSummary[];
  checks: { check_type: string; outcome: string; reason: string | null }[];
};

const verificationChecks = [
  ["check_identity", "Identity document belongs to the applicant"],
  ["check_business", "Business information and any registration evidence reviewed"],
  ["check_store_name", "Store identity is available and not misleading"],
  ["check_operations", "Product sourcing and fulfillment details reviewed"],
  ["check_agreements", "All required policy acknowledgements are recorded"],
] as const;

function DecisionButton({
  status,
  children,
  style = "primary",
}: {
  status: string;
  children: string;
  style?: "primary" | "danger" | "neutral";
}) {
  const { pending } = useFormStatus();
  const color =
    style === "danger"
      ? "bg-red-700 hover:bg-red-800"
      : style === "neutral"
        ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        : "bg-[#0866f5] hover:bg-blue-700";
  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${
        style === "neutral" ? "text-slate-700" : "text-white"
      } ${color}`}
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function PrivateDocumentLink({ document }: { document: VerificationDocumentSummary }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function openDocument() {
    setError("");
    startTransition(async () => {
      const result = await createVerificationDocumentLinkAction(document.id);
      if (result.error || !result.url) {
        setError(result.error ?? "Unable to open this document.");
        return;
      }
      window.location.assign(result.url);
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#0866f5]" />
          <span className="text-xs font-bold text-[#08275a]">{document.document_type.replaceAll("_", " ")}</span>
        </div>
        <button
          type="button"
          onClick={openDocument}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-[#0866f5] disabled:opacity-50"
        >
          {pending ? "Preparing…" : "Open securely"} <ExternalLink size={12} />
        </button>
      </div>
      <p className="mt-1 text-[10px] text-slate-500">
        Issued in {document.issuing_country} · {(document.size_bytes / 1024 / 1024).toFixed(1)} MB
      </p>
      {error && <p role="alert" className="mt-2 text-[10px] text-red-700">{error}</p>}
    </div>
  );
}

function RegisterExistingSellerIdentity({
  application,
}: {
  application: VerificationReviewRecord;
}) {
  const [state, action] = useActionState(
    registerSellerTrialIdentityAction,
    initialFormState,
  );
  const hasIdentityDocument = application.documents.some((document) =>
    ["national_id", "passport", "drivers_license"].includes(
      document.document_type,
    ),
  );

  if (!hasIdentityDocument) {
    return (
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-950">
        A current identity document is required to register this existing
        seller&apos;s trial-prevention fingerprint. Request renewed verification
        if the previous document was purged.
      </p>
    );
  }

  if (state.status === "success") {
    return (
      <p role="status" className="mt-3 text-[10px] font-semibold text-emerald-800">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <input type="hidden" name="applicationId" value={application.id} />
      <label className="block text-[10px] font-bold text-[#08275a]">
        Register existing seller&apos;s verified trial identity
        <input
          name="verified_identity_number"
          type="password"
          autoComplete="off"
          maxLength={128}
          className="mt-1 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-xs"
        />
      </label>
      <p className="mt-1 text-[9px] leading-4 text-slate-600">
        Read the number from the reviewed document. Only its keyed fingerprint
        is stored; the number is not saved.
      </p>
      <button
        type="submit"
        className="mt-2 rounded-md bg-[#0866f5] px-3 py-2 text-[10px] font-bold text-white"
      >
        Register verified identity
      </button>
      {state.status === "error" && (
        <p role="alert" className="mt-2 text-[10px] text-red-700">
          {state.message}
        </p>
      )}
    </form>
  );
}

function VerificationApplicationCard({
  application,
}: {
  application: VerificationReviewRecord;
}) {
  const [state, action] = useActionState(reviewSellerVerificationAction, initialFormState);
  const personal = application.personal_data;
  const business = application.business_data;
  const operations = application.operations_data;
  const applicant = `${String(personal.firstName ?? "")} ${String(personal.lastName ?? "")}`.trim() || "Applicant";
  const reviewable = ["pending_review", "under_review", "action_required"].includes(application.status);
  const approved = application.status === "approved";

  return (
    <article className="rounded-xl border border-[#dce8f8] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#0866f5]">
            {application.reference}
          </p>
          <h3 className="mt-1 text-sm font-black text-[#08275a]">{applicant} · {String(business.storeName ?? "Proposed store")}</h3>
          <p className="mt-1 text-xs text-slate-600">
            {String(personal.email ?? "")} · {String(personal.phone ?? "No phone")} · {String(business.city ?? "")}, {String(business.country ?? "")}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            Submitted {application.submitted_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(application.submitted_at)) : "—"}
          </p>
        </div>
        {application.possible_duplicate_trial && (
          <p
            role="status"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-950"
          >
            Possible duplicate free trial. Compare verified identity and
            registration documents before approval.
          </p>
        )}
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold uppercase text-[#08275a]">
          {application.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg bg-[#f7faff] p-3">
          <h4 className="text-[10px] font-black uppercase tracking-wide text-[#08275a]">Store and operations</h4>
          <p className="mt-2 text-xs leading-5 text-slate-700">{String(business.description ?? "No description")}</p>
          <p className="mt-2 text-[10px] leading-5 text-slate-600">
            Categories: {Array.isArray(business.categories) ? business.categories.join(", ") : "—"}<br />
            Product sourcing: {String(operations.productSources ?? "—")}<br />
            Method: {String(operations.sellerMethod ?? "—")} · Delivery: {String(operations.deliveryMethods ?? "—")}<br />
            Processing: {String(operations.processingTime ?? "—")}
          </p>
        </section>
        <section className="rounded-lg bg-[#f7faff] p-3">
          <h4 className="text-[10px] font-black uppercase tracking-wide text-[#08275a]">Verification checks</h4>
          <div className="mt-2 space-y-1.5">
            {verificationChecks.map(([, label], index) => {
              const checkTypes = ["identity", "business", "store_name", "operations", "agreements"];
              const check = application.checks.find((item) => item.check_type === checkTypes[index]);
              return (
                <p key={checkTypes[index]} className="flex items-start justify-between gap-2 text-[10px]">
                  <span className="text-slate-700">{label}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold uppercase ${
                    check?.outcome === "passed"
                      ? "bg-emerald-100 text-emerald-800"
                      : check?.outcome === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }`}>
                    {check?.outcome ?? "pending"}
                  </span>
                </p>
              );
            })}
          </div>
        </section>
        <section className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-wide text-[#08275a]">Restricted documents</h4>
          {application.documents.length ? (
            application.documents.map((document) => (
              <PrivateDocumentLink key={document.id} document={document} />
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              No identity document metadata is available. Do not approve until the required identity document can be reviewed.
            </p>
          )}
        </section>
      </div>

      {(reviewable || approved) && (
        <form action={action} className="mt-4 rounded-lg border border-slate-200 p-3">
          <input type="hidden" name="applicationId" value={application.id} />
          <label className="block text-[10px] font-bold text-slate-700">
            Applicant-facing reason or correction request
            <textarea name="reason" rows={2} maxLength={1000} defaultValue={application.applicant_message ?? ""} placeholder="Required for correction requests, rejection, or suspension." className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#0866f5]" />
          </label>
          {reviewable && (
            <fieldset className="mt-3">
              <legend className="flex items-center gap-1.5 text-[10px] font-bold text-[#08275a]">
                <FileCheck2 size={13} /> Mark completed checks as passed
              </legend>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Leave incomplete checks unticked when requesting corrections. Every required check must be passed to approve.
              </p>
              {reviewable && (
                <label className="mt-2 block text-[10px] font-bold text-slate-700">
                  Identity number from the document you reviewed (required for approval)
                  <input
                    name="verified_identity_number"
                    type="password"
                    autoComplete="off"
                    maxLength={128}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                  <span className="mt-1 block font-normal leading-4 text-slate-500">
                    Used only to create a keyed duplicate-trial fingerprint. The
                    raw number is not saved.
                  </span>
                </label>
              )}
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {verificationChecks.map(([name, label]) => (
                  <label key={name} className="flex items-start gap-2 rounded-md bg-slate-50 p-2 text-[10px] leading-4 text-slate-700">
                    <input
                      type="checkbox"
                      name={name}
                      defaultChecked={application.checks.find(
                        (check) => check.check_type === name.replace("check_", ""),
                      )?.outcome === "passed"}
                      className="mt-0.5"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {application.possible_duplicate_trial && (
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[10px] leading-4 text-amber-950">
                  <input
                    type="checkbox"
                    name="duplicate_trial_reviewed"
                    className="mt-0.5"
                  />
                  I reviewed the matching application and documents and
                  confirmed this applicant has not already received a seller
                  trial. If it is the same identity, do not approve a second
                  trial.
                </label>
              )}
            </fieldset>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {application.status === "pending_review" && (
              <DecisionButton status="under_review" style="neutral">Start review</DecisionButton>
            )}
            {reviewable && (
              <>
                <DecisionButton status="action_required" style="neutral">Request corrections</DecisionButton>
                <DecisionButton status="approved">Approve seller</DecisionButton>
                <DecisionButton status="rejected" style="danger">Reject</DecisionButton>
              </>
            )}
            {approved && <DecisionButton status="suspended" style="danger">Suspend seller</DecisionButton>}
          </div>
          {state.message && (
            <p role={state.status === "error" ? "alert" : "status"} className={`mt-3 text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>
              {state.message}
            </p>
          )}
        </form>
      )}
      {approved && <RegisterExistingSellerIdentity application={application} />}
    </article>
  );
}

export function SellerVerificationReview({
  applications,
}: {
  applications: VerificationReviewRecord[];
}) {
  if (!applications.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#c4d5ec] bg-white p-7 text-center">
        <FileCheck2 size={22} className="mx-auto text-slate-300" />
        <p className="mt-2 text-xs font-bold text-[#08275a]">No verification applications</p>
        <p className="mt-1 text-[10px] text-slate-500">Submitted applications will appear here for authorized review.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {applications.map((application) => (
        <VerificationApplicationCard key={application.id} application={application} />
      ))}
    </div>
  );
}
