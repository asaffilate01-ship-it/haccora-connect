import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account-status")({
  head: () => ({
    meta: [{ title: "Account status — Haccora" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountStatus,
});

function AccountStatus() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <main className="grid min-h-screen place-items-center bg-secondary/50 p-4">
      <section className="surface w-full max-w-lg p-7 text-center">
        <BrandLogo imgClassName="mx-auto h-11 w-auto" />
        <LockKeyhole className="mx-auto mt-8 text-primary" size={34} />
        <div className="eyebrow mt-5">Workspace access</div>
        <h1 className="mt-2 text-2xl">This organisation is {user.serviceStatus}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Operational records remain protected and cannot be opened while the SaaS account is{" "}
          {user.serviceStatus}.{" "}
          {user.serviceStatusReason || "Ask your organisation owner to contact Haccora support."}
        </p>
        <button
          className="btn-secondary mt-7 min-h-11 text-sm"
          onClick={() => void signOut().then(() => navigate({ to: "/login" }))}
        >
          <LogOut size={15} /> Sign out
        </button>
      </section>
    </main>
  );
}
