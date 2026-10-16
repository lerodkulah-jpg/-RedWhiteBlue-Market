"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { reviewSellerApplicationAction } from "@/app/actions/auth";
import { initialFormState } from "@/app/lib/auth/form-state";

export type SellerApplication = {
  id: string;
  display_name: string;
  phone: string | null;
  location: string | null;
  seller_type: "individual" | "business";
  business_name: string | null;
  status: "pending" | "approved" | "rejected";
};

function ReviewButton({ status, children }: { status: "approved" | "rejected"; children: string }) {
  const { pending } = useFormStatus();
  return <button name="status" value={status} disabled={pending} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60 ${status === "approved" ? "bg-green-700 hover:bg-green-800" : "bg-red-700 hover:bg-red-800"}`}>{pending ? "Saving…" : children}</button>;
}

function ApplicationRow({ application }: { application: SellerApplication }) {
  const [state, action] = useActionState(reviewSellerApplicationAction, initialFormState);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#102d58]">{application.display_name}</h2>
          <p className="mt-1 text-sm text-slate-600">{application.seller_type === "business" ? application.business_name : "Individual seller"}</p>
          <p className="mt-1 text-sm text-slate-500">{application.phone || "No phone"} · {application.location || "No location"}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">{application.status}</span>
      </div>
      {application.status === "pending" && (
        <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="applicationId" value={application.id} />
          <ReviewButton status="approved">Approve seller</ReviewButton>
          <ReviewButton status="rejected">Reject request</ReviewButton>
          {state.message && <p role={state.status === "error" ? "alert" : "status"} className={`text-sm ${state.status === "error" ? "text-red-700" : "text-green-700"}`}>{state.message}</p>}
        </form>
      )}
    </article>
  );
}

export function SellerApplicationReview({ applications }: { applications: SellerApplication[] }) {
  if (!applications.length) return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">No seller applications yet.</p>;
  return <div className="space-y-4">{applications.map((application) => <ApplicationRow key={application.id} application={application} />)}</div>;
}
