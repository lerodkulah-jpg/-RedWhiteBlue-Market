import Link from "next/link";
import { SignUpForm } from "@/app/components/auth/forms";
import { AuthShell } from "../auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your buyer account"
      description="Every new account starts as a buyer. You can apply for seller access after verifying your email."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-[#102d58] hover:text-[#e52b3b]">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
