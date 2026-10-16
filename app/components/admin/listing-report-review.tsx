"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reviewListingReportAction } from "@/app/actions/products";
import { initialFormState } from "@/app/lib/auth/form-state";

export type ListingReport = {
  id: string;
  product_id: string;
  reason: string;
  details: string | null;
  created_at: string;
  product_name: string;
};

function ReportDecisionButton({
  status,
  children,
}: {
  status: "handled" | "dismissed";
  children: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-[#102d58] hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

function ReportRow({ report }: { report: ListingReport }) {
  const [state, action] = useActionState(
    reviewListingReportAction,
    initialFormState,
  );

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-[#102d58]">{report.product_name}</h3>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {report.reason.replaceAll("_", " ")} ·{" "}
        {report.created_at.slice(0, 10)}
      </p>
      {report.details && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {report.details}
        </p>
      )}
      <form action={action} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="reportId" value={report.id} />
        <ReportDecisionButton status="handled">
          Mark handled
        </ReportDecisionButton>
        <ReportDecisionButton status="dismissed">
          Dismiss report
        </ReportDecisionButton>
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`w-full text-sm ${
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

export function ListingReportReview({
  reports,
}: {
  reports: ListingReport[];
}) {
  if (reports.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">
        No listing reports are waiting for review.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <ReportRow key={report.id} report={report} />
      ))}
    </div>
  );
}
