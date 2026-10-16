import { UpdatePasswordForm } from "@/app/components/auth/forms";
import { AuthShell } from "../auth-shell";

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Set a strong new password to finish recovering your account."
      footer="For your security, this page only works from a valid recovery link."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
