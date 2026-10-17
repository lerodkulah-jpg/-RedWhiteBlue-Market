import { Suspense, type ReactNode } from "react";
import { WorkspaceShell } from "@/app/components/workspace/workspace-shell";
import { requireAdministrator } from "@/app/lib/auth/account";

export default function AdminWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f3f7fd] p-8 text-sm font-semibold text-slate-500">
          Verifying administrator access…
        </main>
      }
    >
      <AuthorizedAdminWorkspace>{children}</AuthorizedAdminWorkspace>
    </Suspense>
  );
}

async function AuthorizedAdminWorkspace({
  children,
}: {
  children: ReactNode;
}) {
  const account = await requireAdministrator();
  return (
    <WorkspaceShell
      workspace="admin"
      userId={account.user!.id}
      name={account.profile?.display_name || "Admin"}
    >
      {children}
    </WorkspaceShell>
  );
}
