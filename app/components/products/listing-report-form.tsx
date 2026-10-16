"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reportProductAction } from "@/app/actions/products";
import { initialFormState } from "@/app/lib/auth/form-state";

function ReportButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white hover:bg-[#183e75] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Sending report…" : "Submit report"}
    </button>
  );
}

export function ListingReportForm({
  productId,
  isConfigured,
  isSignedIn,
}: {
  productId: string;
  isConfigured: boolean;
  isSignedIn: boolean;
}) {
  const [state, action] = useActionState(reportProductAction, initialFormState);

  if (!isConfigured) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        Reporting will be available once marketplace accounts are configured.
      </p>
    );
  }

  if (!isSignedIn) {
    return (
      <p className="mt-4 text-sm text-slate-600">
        <Link
          href="/auth/login"
          className="font-bold text-[#102d58] underline"
        >
          Sign in
        </Link>{" "}
        to submit a listing report.
      </p>
    );
  }

  return (
    <form action={action} className="mt-5 grid gap-4 sm:max-w-2xl">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label
          htmlFor="report-reason"
          className="block text-sm font-semibold text-slate-700"
        >
          Reason for report
        </label>
        <select
          id="report-reason"
          name="reason"
          required
          defaultValue="incorrect_information"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
        >
          <option value="incorrect_information">Incorrect information</option>
          <option value="prohibited_item">Prohibited item</option>
          <option value="suspected_scam">Suspected scam</option>
          <option value="other">Other concern</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="report-details"
          className="block text-sm font-semibold text-slate-700"
        >
          Additional details (optional)
        </label>
        <textarea
          id="report-details"
          name="details"
          rows={3}
          maxLength={1000}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
          placeholder="Share only information relevant to this listing."
        />
      </div>
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
      <div>
        <ReportButton />
      </div>
    </form>
  );
}
