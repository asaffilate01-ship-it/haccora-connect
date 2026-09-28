import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { BUSINESS_SERVICES } from "@/lib/business-services";
import { RELEASE_SHA } from "@/lib/release";

type Setup = {
  id: string;
  revision: number;
  business_name: string;
  slug: string;
  owner_email: string;
  location_name: string;
  address_line: string;
  postcode: string;
  intended_plan: string;
  requested_addons: string[];
  organization_id: string | null;
  owner_verified: boolean;
  slug_available: boolean;
};

const emptyForm = {
  business_name: "",
  slug: "",
  owner_email: "",
  location_name: "",
  address_line: "",
  postcode: "",
  intended_plan: "trial",
  requested_addons: [] as string[],
};

export function TenantSetupPanel({
  plans,
  requireMfa,
  unlocked,
  onLaunched,
}: {
  plans: Array<{ code: string; name: string; active: boolean }>;
  requireMfa: () => boolean;
  unlocked: boolean;
  onLaunched: () => Promise<void>;
}) {
  const [setups, setSetups] = useState<Setup[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!unlocked) return;
    const result = await (supabase as any).rpc("platform_get_tenant_setups");
    if (result.error) throw result.error;
    setSetups(result.data ?? []);
  }, [unlocked]);

  useEffect(() => {
    void load().catch((cause: Error) => setError(cause.message));
  }, [load]);

  const run = async (operation: () => Promise<void>) => {
    if (!requireMfa()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : String(
              (cause as { message?: string })?.message ??
                "Tenant setup failed. Reload and try again.",
            ),
      );
    } finally {
      setBusy(false);
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await (supabase as any).rpc("platform_save_tenant_setup", {
        p_id: editing?.id ?? null,
        p_revision: editing?.revision ?? 0,
        ...Object.fromEntries(Object.entries(form).map(([key, value]) => [`p_${key}`, value])),
      });
      if (result.error) throw result.error;
      setEditing(null);
      setForm(emptyForm);
      setNotice("Setup saved. Verify the owner account before approving trial access.");
    });
  };

  const invite = (setup: Setup) =>
    void run(async () => {
      const result = await supabase.functions.invoke("platform-admin", {
        body: { action: "invite_tenant_owner", setupId: setup.id, revision: setup.revision },
      });
      if (result.error) throw result.error;
      setNotice(
        result.data?.alreadyVerified
          ? "Owner already verified. Refresh the setup checks."
          : "Owner invitation sent. They must complete account verification before approval.",
      );
    });

  const launch = (setup: Setup) =>
    void run(async () => {
      const result = await (supabase as any).rpc("platform_launch_tenant_setup", {
        p_id: setup.id,
        p_revision: setup.revision,
        p_reason: reasons[setup.id] ?? "",
      });
      if (result.error) throw result.error;
      setNotice(
        "Tenant provisioned on the shared core with a 60-day trial. Paid plans and add-ons still require their billing and provider setup.",
      );
      await onLaunched();
    });

  return (
    <section className="surface p-5">
      <h2 className="font-display text-xl">Shared core · add a tenant</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Save the business details, verify the owner, then approve a 60-day trial. Every tenant uses
        the same Haccora core. Paid features follow subscription entitlements.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Running core: {RELEASE_SHA === "unverified" ? "unverified build" : RELEASE_SHA.slice(0, 12)}
        . Core releases reach all tenants through the shared deployment. Tenant data and settings
        stay separate.
      </p>
      {!unlocked && (
        <p className="mt-3 text-sm">Verify your authenticator above to manage tenant setup.</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm text-success">
          {notice}
        </p>
      )}
      <form onSubmit={save} className="mt-5 space-y-4">
        <fieldset disabled={busy || !unlocked} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["business_name", "Business name", "text", 2, 160],
              ["slug", "Workspace slug", "text", 2, 64],
              ["owner_email", "Owner email", "email", 5, 254],
              ["location_name", "First premises", "text", 2, 160],
              ["address_line", "Premises address", "text", 4, 240],
              ["postcode", "Postcode", "text", 5, 10],
            ] as const
          ).map(([key, label, type, min, max]) => (
            <label key={key} className="text-sm">
              {label}
              <input
                required
                className="field mt-1 w-full"
                type={type}
                minLength={min}
                maxLength={max}
                pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}
          <label className="text-sm">
            Intended plan after trial
            <select
              className="field mt-1 w-full"
              value={form.intended_plan}
              onChange={(event) => setForm({ ...form, intended_plan: event.target.value })}
            >
              {plans
                .filter((plan) => plan.active)
                .map((plan) => (
                  <option key={plan.code} value={plan.code}>
                    {plan.name}
                  </option>
                ))}
            </select>
          </label>
        </fieldset>
        <fieldset disabled={busy || !unlocked}>
          <legend className="text-sm font-semibold">Services to discuss</legend>
          <p className="mt-1 text-xs text-muted-foreground">
            These record interest only. They do not enable a service, share customer data, or start
            a charge.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_SERVICES.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requested_addons.includes(service.id)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      requested_addons: event.target.checked
                        ? [...form.requested_addons, service.id]
                        : form.requested_addons.filter((id) => id !== service.id),
                    })
                  }
                />
                {service.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-3">
          <button disabled={busy || !unlocked} className="btn-alert-solid min-h-11 text-sm">
            {editing ? "Save changes" : "Save tenant setup"}
          </button>
          {editing && (
            <button
              type="button"
              disabled={busy}
              className="text-sm underline"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          )}
          <button
            type="button"
            disabled={busy || !unlocked}
            className="text-sm underline"
            onClick={() => void run(async () => {})}
          >
            Refresh checks
          </button>
        </div>
      </form>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {setups.map((setup) => (
          <article key={setup.id} className="rounded-xl border border-border p-4">
            <h3 className="font-semibold">{setup.business_name}</h3>
            <p className="text-sm text-muted-foreground">
              {setup.slug} · {setup.owner_email}
            </p>
            <p className="mt-2 text-sm">
              {setup.organization_id ? "Provisioned · shared core" : "Draft · no tenant access"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Intended plan: {setup.intended_plan}. Service interests:{" "}
              {setup.requested_addons
                .map((id) => BUSINESS_SERVICES.find((service) => service.id === id)?.name ?? id)
                .join(", ") || "None"}
              .
            </p>
            {!setup.organization_id && (
              <>
                <p className="mt-2 text-sm">
                  Owner: {setup.owner_verified ? "verified" : "verification required"}. Workspace
                  slug: {setup.slug_available ? "available" : "already in use"}.
                </p>
                <div className="mt-3 flex gap-4 text-sm">
                  <button
                    disabled={busy}
                    className="underline"
                    onClick={() => {
                      setEditing(setup);
                      setForm(
                        Object.fromEntries(
                          Object.keys(emptyForm).map((key) => [key, setup[key as keyof Setup]]),
                        ) as typeof emptyForm,
                      );
                    }}
                  >
                    Edit setup
                  </button>
                  {!setup.owner_verified && (
                    <button disabled={busy} className="underline" onClick={() => invite(setup)}>
                      Send owner invitation
                    </button>
                  )}
                </div>
                <label className="mt-3 block text-sm">
                  Approval reason
                  <input
                    className="field mt-1 w-full"
                    minLength={4}
                    maxLength={500}
                    value={reasons[setup.id] ?? ""}
                    onChange={(event) => setReasons({ ...reasons, [setup.id]: event.target.value })}
                  />
                </label>
                <button
                  className="btn-alert-solid mt-3 min-h-11 text-sm"
                  disabled={
                    busy ||
                    !setup.owner_verified ||
                    !setup.slug_available ||
                    (reasons[setup.id]?.trim().length ?? 0) < 4
                  }
                  onClick={() => launch(setup)}
                >
                  Approve trial tenant
                </button>
              </>
            )}
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Tenant provisioning checks identity and configuration. Production launch still requires the
        Launch centre checks and release acceptance evidence.
      </p>
    </section>
  );
}
