"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import {
  sendPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/app/actions/auth";
import { initialFormState } from "@/app/lib/auth/form-state";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#102d58] focus:ring-2 focus:ring-blue-100";

function PasswordInput({
  id,
  name,
  autoComplete,
  minLength,
  required = true,
}: {
  id: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className={`${inputClass} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute right-3 top-[calc(50%+4px)] inline-flex -translate-y-1/2 items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold text-slate-600 hover:text-[#102d58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0866f5]"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function SubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-[#102d58] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#183e75] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

function FormMessage({ message, status }: { message: string; status: "success" | "error" | "idle" }) {
  if (!message) return null;

  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm leading-6 ${
        status === "error"
          ? "bg-red-50 text-red-800"
          : "bg-green-50 text-green-800"
      }`}
    >
      {message}
    </p>
  );
}

export function LoginCallbackNotice() {
  const searchParams = useSearchParams();

  if (searchParams.get("error") !== "callback_failed") {
    return null;
  }

  return (
    <p
      role="alert"
      className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
    >
      We couldn&apos;t verify that link. Request a fresh email link or try
      signing in again.
    </p>
  );
}

function useRedirectAfterSuccess(redirectTo?: string) {
  const router = useRouter();

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
    }
  }, [redirectTo, router]);
}

export function LoginForm() {
  const [state, action] = useActionState(signInAction, initialFormState);
  useRedirectAfterSuccess(state.redirectTo);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-bold text-slate-700">
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-sm font-bold text-slate-700">
            Password
          </label>
          <Link href="/auth/reset-password" className="text-xs font-bold text-[#102d58] hover:text-[#e52b3b]">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <FormMessage message={state.message} status={state.status} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialFormState);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="displayName" className="text-sm font-bold text-slate-700">
          Display name
        </label>
        <input id="displayName" name="displayName" autoComplete="name" required maxLength={80} className={inputClass} />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-bold text-slate-700">
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-bold text-slate-700">
          Password
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700">
          Confirm password
        </label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={8} />
      </div>
      <FormMessage message={state.message} status={state.status} />
      <SubmitButton pendingLabel="Creating account…">Create buyer account</SubmitButton>
    </form>
  );
}

export function PasswordResetForm() {
  const [state, action] = useActionState(sendPasswordResetAction, initialFormState);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-bold text-slate-700">
          Email address
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </div>
      <FormMessage message={state.message} status={state.status} />
      <SubmitButton pendingLabel="Sending link…">Send reset link</SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialFormState);
  useRedirectAfterSuccess(state.redirectTo);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="password" className="text-sm font-bold text-slate-700">
          New password
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="text-sm font-bold text-slate-700">
          Confirm new password
        </label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" minLength={8} />
      </div>
      <FormMessage message={state.message} status={state.status} />
      <SubmitButton pendingLabel="Updating password…">Update password</SubmitButton>
    </form>
  );
}
