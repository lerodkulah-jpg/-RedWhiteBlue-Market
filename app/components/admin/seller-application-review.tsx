import Link from "next/link";

export type SellerApplication = {
  id: string;
  display_name: string;
  phone: string | null;
  location: string | null;
  seller_type: "individual" | "business";
  business_name: string | null;
  status: "pending" | "approved" | "rejected";
};

function ApplicationRow({ application }: { application: SellerApplication }) {
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
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950">
          This is a legacy basic request and cannot grant seller access. The applicant must complete secure identity verification first.
          {" "}
          <Link href="/admin/sellers" className="font-bold underline">Open verification queue</Link>
        </p>
      )}
    </article>
  );
}

export function SellerApplicationReview({ applications }: { applications: SellerApplication[] }) {
  if (!applications.length) return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">No seller applications yet.</p>;
  return <div className="space-y-4">{applications.map((application) => <ApplicationRow key={application.id} application={application} />)}</div>;
}
