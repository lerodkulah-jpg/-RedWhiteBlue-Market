"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitSellerApplicationAction,
  updateProfileAction,
} from "@/app/actions/auth";
import { initialFormState } from "@/app/lib/auth/form-state";

type ProfileValues = {
  displayName: string;
  phone: string;
  location: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#102d58] focus:ring-2 focus:ring-blue-100";

function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183e75] disabled:cursor-wait disabled:opacity-70">{pending ? pendingLabel : children}</button>;
}

function Message({ status, message }: { status: "idle" | "success" | "error"; message: string }) {
  if (!message) return null;
  return <p role={status === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{message}</p>;
}

export function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  return (
    <form action={action} className="space-y-5">
      <div><label htmlFor="displayName" className="text-sm font-bold text-slate-700">Display name</label><input id="displayName" name="displayName" required maxLength={80} defaultValue={values.displayName} className={inputClass} /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="phone" className="text-sm font-bold text-slate-700">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={values.phone} className={inputClass} /></div>
        <div><label htmlFor="location" className="text-sm font-bold text-slate-700">Location in Liberia</label><input id="location" name="location" maxLength={120} defaultValue={values.location} className={inputClass} /></div>
      </div>
      <Message status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function SellerApplicationForm({ values }: { values: ProfileValues }) {
  const [state, action] = useActionState(submitSellerApplicationAction, initialFormState);
  return (
    <form action={action} className="space-y-5">
      <div><label htmlFor="displayName" className="text-sm font-bold text-slate-700">Seller display name</label><input id="displayName" name="displayName" required maxLength={80} defaultValue={values.displayName} className={inputClass} /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><label htmlFor="phone" className="text-sm font-bold text-slate-700">Phone number <span className="font-normal text-slate-500">(optional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={values.phone} className={inputClass} /></div>
        <div><label htmlFor="location" className="text-sm font-bold text-slate-700">Location in Liberia</label><input id="location" name="location" required maxLength={120} defaultValue={values.location} className={inputClass} /></div>
      </div>
      <fieldset><legend className="text-sm font-bold text-slate-700">Selling as</legend><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700"><input type="radio" name="sellerType" value="individual" defaultChecked />Individual seller</label><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700"><input type="radio" name="sellerType" value="business" />Registered business</label></div></fieldset>
      <div><label htmlFor="businessName" className="text-sm font-bold text-slate-700">Business name <span className="font-normal text-slate-500">(required for businesses)</span></label><input id="businessName" name="businessName" maxLength={120} className={inputClass} /></div>
      <p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-950">Seller access is reviewed before listing tools are enabled. This protects buyers and helps keep the marketplace trustworthy.</p>
      <Message status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Submitting request…">Request seller access</SubmitButton>
    </form>
  );
}
