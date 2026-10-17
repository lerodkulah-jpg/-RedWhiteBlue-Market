"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateProfileAction } from "@/app/actions/auth";
import { initialFormState } from "@/app/lib/auth/form-state";

type ProfileValues = {
  displayName: string;
  phone: string;
  location: string;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#102d58] focus:ring-2 focus:ring-blue-100";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-[#102d58] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183e75] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Saving…" : "Save profile"}
    </button>
  );
}

export function ProfileForm({ values }: { values: ProfileValues }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="displayName" className="text-sm font-bold text-slate-700">Display name</label>
        <input id="displayName" name="displayName" required maxLength={80} defaultValue={values.displayName} className={inputClass} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="text-sm font-bold text-slate-700">Phone number</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={values.phone} className={inputClass} />
        </div>
        <div>
          <label htmlFor="location" className="text-sm font-bold text-slate-700">Location in Liberia</label>
          <input id="location" name="location" maxLength={120} defaultValue={values.location} className={inputClass} />
        </div>
      </div>
      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>
          {state.message}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
