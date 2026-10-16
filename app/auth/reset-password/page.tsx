import Link from "next/link";
import { PasswordResetForm } from "@/app/components/auth/forms";
import { AuthShell } from "../auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email and we will send a secure password-reset link."
      footer={<Link href="/auth/login" className="font-bold text-[#102d58] hover:text-[#e52b3b]">Return to sign in</Link>}
    >
      <PasswordResetForm />
    </AuthShell>
  );
}
