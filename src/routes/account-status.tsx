import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CreditCard, Loader2, LockKeyhole, LogOut, RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account-status")({
  head: () => ({
    meta: [{ title: "Account status — Haccora" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountStatus,
});

function AccountStatus() {
  const { user, signOut, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  if (!user) return null;
  const billingRestricted = user.serviceStatusReason?.startsWith("[billing]") ?? false;

  const openBilling = async () => {
    setBusy("billing");
    setError("");
    const { data, error: billingError } = await supabase.functions.invoke("billing", {
      body: { action: "portal", plan: "complete" },
    });
    setBusy("");
    if (billingError || !data?.url) {
      setError("The billing portal is not available yet. Contact Haccora support for assistance.");
      return;
    }
    window.location.assign(data.url);
  };

  const checkAccess = async () => {
    setBusy("refresh");
    await refresh();
    setBusy("");
    window.location.reload();
  };

  return (
    <main className="grid min-h-screen place-items-center bg-secondary/50 p-4">
      <section className="surface w-full max-w-lg p-7 text-center">
        <BrandLogo imgClassName="mx-auto h-14 w-auto" />
        <LockKeyhole className="mx-auto mt-8 text-primary" size={34} />
        <div className="eyebrow mt-5">Workspace access</div>
        <h1 className="mt-2 text-2xl">This organisation is {user.serviceStatus}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Operational records remain protected and cannot be opened while the SaaS account is{" "}
          {user.serviceStatus}.{" "}
          {user.serviceStatusReason || "Ask your organisation owner to contact Haccora support."}
        </p>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          {billingRestricted && user.role === "owner" && (
            <button
              className="btn-alert-solid min-h-11 text-sm"
              disabled={!!busy}
              onClick={() => void openBilling()}
            >
              {busy === "billing" ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <CreditCard size={15} />
              )}{" "}
              Resolve payment
            </button>
          )}
          <button
            className="btn-secondary min-h-11 text-sm"
            disabled={!!busy}
            onClick={() => void checkAccess()}
          >
            {busy === "refresh" ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <RefreshCw size={15} />
            )}{" "}
            Check access again
          </button>
          <button
            className="btn-secondary min-h-11 text-sm"
            disabled={!!busy}
            onClick={() => void signOut().then(() => navigate({ to: "/login" }))}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
