import { Suspense } from "react";
import Link from "next/link";
import {
  LoginCallbackNotice,
  LoginForm,
} from "@/app/components/auth/forms";
import { AuthShell } from "../auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your profile, seller access, and listings."
      footer={
        <>
          New to RedWhiteBlue Market?{" "}
          <Link href="/auth/signup" className="font-bold text-[#102d58] hover:text-[#e52b3b]">
            Create an account
          </Link>
        </>
      }
    >
      <>
        <Suspense fallback={null}>
          <LoginCallbackNotice />
        </Suspense>
        <LoginForm />
      </>
    </AuthShell>
  );
}
