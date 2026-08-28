import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock3, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Access approval — Haccora" },
      {
        name: "description",
        content:
          "Haccora tenant owner accounts and role access are issued by approval or invitation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApprovalRequiredPage,
});

function ApprovalRequiredPage() {
  const navigate = useNavigate();
  const { user, hydrated, signOut } = useAuth();

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (user.platformRole) {
      navigate({ to: "/platform", replace: true });
      return;
    }
    if (user.organizationId) navigate({ to: "/app", replace: true });
  }, [hydrated, navigate, user]);

  if (!hydrated || !user || user.platformRole || user.organizationId) return null;

  return (
    <main className="grid min-h-screen place-items-center bg-secondary/40 p-4">
      <section className="surface w-full max-w-2xl p-6 text-center sm:p-9">
        <BrandLogo imgClassName="mx-auto h-14 w-auto sm:h-16" />
        <span className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LockKeyhole size={27} aria-hidden="true" />
        </span>
        <div className="eyebrow mt-6">Approval-only access</div>
        <h1 className="mt-2 text-2xl sm:text-3xl">Your login is not attached to a tenant yet.</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          A Haccora platform operator must approve the tenant owner for either a two-month trial or
          a paid plan. Team members receive a secure invitation from that approved owner with their
          role and premises already assigned.
        </p>

        <div className="mx-auto mt-7 grid max-w-xl gap-3 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <Clock3 size={18} className="text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold">Two-month trial</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Activated only after Haccora approves the business and owner.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold">Role-bound invitation</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Managers, chefs and staff receive only the approved tenant and premises.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/contact" className="btn-alert-solid min-h-11 text-sm">
            Request tenant approval
          </Link>
          <button
            className="btn-secondary min-h-11 text-sm"
            onClick={() => void signOut().then(() => navigate({ to: "/login" }))}
          >
            <LogOut size={15} aria-hidden="true" /> Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
