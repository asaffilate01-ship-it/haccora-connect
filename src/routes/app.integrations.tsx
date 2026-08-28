import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Camera,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  PlugZap,
  Send,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/haccora-client";
import { getPublicSupabaseConfig } from "@/integrations/supabase/config";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/integrations")({ component: IntegrationsPage });

type Endpoint = {
  id: string;
  name: string;
  url: string;
  event_types: string[];
  enabled: boolean;
  failure_count: number;
  created_at: string;
};
type Delivery = {
  id: string;
  endpoint_id: string;
  event_type: string;
  status: string;
  attempts: number;
  created_at: string;
};
type Location = { id: string; name: string };
type DokuveraConnection = {
  id: string;
  location_id: string;
  dokuvera_project_id: string;
  project_label: string;
  enabled: boolean;
  created_at: string;
};

function IntegrationsPage() {
  const { user } = useAuth();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [dokuveraConnections, setDokuveraConnections] = useState<DokuveraConnection[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [dokuveraLabel, setDokuveraLabel] = useState("");
  const [dokuveraProjectId, setDokuveraProjectId] = useState("");
  const [dokuveraLocationId, setDokuveraLocationId] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dokuveraBusy, setDokuveraBusy] = useState(false);
  const publicSupabaseUrl = getPublicSupabaseConfig().url?.replace(/\/$/, "") ?? "";
  const dokuveraCallbackUrl = publicSupabaseUrl
    ? `${publicSupabaseUrl}/functions/v1/dokuvera-webhook`
    : "Available after the production service URL is configured";
  const load = useCallback(async () => {
    const [endpointResult, deliveryResult, locationResult, dokuveraResult] = await Promise.all([
      (supabase as any)
        .from("webhook_endpoints")
        .select("id,name,url,event_types,enabled,failure_count,created_at")
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("webhook_deliveries")
        .select("id,endpoint_id,event_type,status,attempts,created_at")
        .order("created_at", { ascending: false })
        .limit(25),
      (supabase as any).from("locations").select("id,name").eq("is_active", true).order("name"),
      (supabase as any)
        .from("dokuvera_connections")
        .select("id,location_id,dokuvera_project_id,project_label,enabled,created_at")
        .order("created_at", { ascending: false }),
    ]);
    setEndpoints((endpointResult.data ?? []) as Endpoint[]);
    setDeliveries((deliveryResult.data ?? []) as Delivery[]);
    setLocations((locationResult.data ?? []) as Location[]);
    setDokuveraConnections((dokuveraResult.data ?? []) as DokuveraConnection[]);
    setDokuveraLocationId((current) => current || locationResult.data?.[0]?.id || "");
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("integration-admin", {
      body: {
        action: "create_endpoint",
        name,
        url,
        event_types: [
          "corrective_actions.insert",
          "corrective_actions.update",
          "workflow_runs.update",
        ],
      },
    });
    setBusy(false);
    if (error || !data?.signing_secret) toast.error("Endpoint could not be created.");
    else {
      setSecret(data.signing_secret);
      setName("");
      setUrl("");
      void load();
    }
  };
  const test = async (id: string) => {
    const { error } = await supabase.functions.invoke("integration-admin", {
      body: { action: "test_endpoint", endpoint_id: id },
    });
    if (error) toast.error("Test could not be queued.");
    else {
      toast.success("Signed test queued.");
      void load();
    }
  };
  const connectDokuvera = async () => {
    setDokuveraBusy(true);
    const { data, error } = await supabase.functions.invoke("dokuvera-admin", {
      body: {
        action: "create_connection",
        location_id: dokuveraLocationId,
        dokuvera_project_id: dokuveraProjectId.trim(),
        project_label: dokuveraLabel.trim(),
      },
    });
    setDokuveraBusy(false);
    if (error || !data?.connection) {
      toast.error(
        data?.error === "integration_not_in_plan"
          ? "Dokuvera needs an integrations-enabled subscription or platform override."
          : "The Dokuvera project could not be connected.",
      );
      return;
    }
    setDokuveraLabel("");
    setDokuveraProjectId("");
    toast.success("Dokuvera project connected to this premises.");
    void load();
  };
  const disableDokuvera = async (connectionId: string) => {
    if (!confirm("Disable this Dokuvera connection? Existing evidence will remain available."))
      return;
    const { error } = await supabase.functions.invoke("dokuvera-admin", {
      body: { action: "disable_connection", connection_id: connectionId },
    });
    if (error) toast.error("The connection could not be disabled.");
    else {
      toast.success("Dokuvera connection disabled. Existing evidence was retained.");
      void load();
    }
  };
  return (
    <div className="p-5 md:p-10 space-y-6">
      <div>
        <div className="eyebrow">{"Integrations"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Connected systems"}</h1>
        <p className="mt-1 text-muted-foreground">
          {"Connect verified capture evidence and send signed operational events."}
        </p>
      </div>
      <section className="surface overflow-hidden">
        <div className="border-b border-border bg-secondary/30 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Camera size={20} />
              </span>
              <div>
                <h2 className="font-display text-xl">Dokuvera evidence capture</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Photos, video, GPS, capture time, written notes and voice transcripts are copied
                  into private Haccora evidence storage after a signed delivery.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase text-emerald-900">
              HMAC verified
            </span>
          </div>
        </div>
        <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-bold text-muted-foreground">
                Project name
                <input
                  value={dokuveraLabel}
                  onChange={(event) => setDokuveraLabel(event.target.value)}
                  placeholder="Kitchen compliance survey"
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                />
              </label>
              <label className="text-xs font-bold text-muted-foreground">
                Dokuvera project ID
                <input
                  value={dokuveraProjectId}
                  onChange={(event) => setDokuveraProjectId(event.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs text-foreground"
                />
              </label>
              <label className="text-xs font-bold text-muted-foreground md:col-span-2">
                Haccora premises
                <select
                  value={dokuveraLocationId}
                  onChange={(event) => setDokuveraLocationId(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                >
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              disabled={
                dokuveraBusy ||
                !dokuveraLocationId ||
                dokuveraLabel.trim().length < 2 ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  dokuveraProjectId.trim(),
                )
              }
              onClick={() => void connectDokuvera()}
              className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {dokuveraBusy ? (
                <Loader2 className="inline animate-spin" size={17} />
              ) : (
                "Connect project"
              )}
            </button>
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Dokuvera callback URL
              </div>
              <div className="mt-2 flex gap-2">
                <code className="min-w-0 flex-1 overflow-auto rounded-lg bg-background p-3 text-xs">
                  {dokuveraCallbackUrl}
                </code>
                <button
                  disabled={!publicSupabaseUrl}
                  onClick={() => void navigator.clipboard.writeText(dokuveraCallbackUrl)}
                  className="min-h-11 rounded-lg border border-border bg-background px-3 disabled:opacity-50"
                  aria-label="Copy Dokuvera callback URL"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                The shared signing secret is set only in the two server environments; it is never
                exposed here or stored in a browser.
              </p>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              Connected projects
            </div>
            {dokuveraConnections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No Dokuvera projects connected for {user?.organizationName ?? "this business"}.
              </div>
            ) : (
              <ul className="space-y-2">
                {dokuveraConnections.map((connection) => {
                  const location = locations.find((item) => item.id === connection.location_id);
                  return (
                    <li key={connection.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <MapPin size={17} className="mt-0.5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold">
                            {connection.project_label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {location?.name ?? "Premises"}
                          </div>
                          <code className="mt-2 block truncate text-[10px] text-muted-foreground">
                            {connection.dokuvera_project_id}
                          </code>
                        </div>
                        {connection.enabled ? (
                          <button
                            onClick={() => void disableDokuvera(connection.id)}
                            className="min-h-10 rounded-lg border border-border px-3 text-xs font-bold text-muted-foreground hover:text-destructive"
                          >
                            <Ban className="mr-1 inline" size={13} /> Disable
                          </button>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase">
                            Disabled
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
      <div className="pt-2">
        <h2 className="font-display text-2xl">Outbound signed webhooks</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Idempotent events with HMAC signatures, retry tracking and dead-letter status.
        </p>
      </div>
      {secret && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
        >
          <div className="flex gap-2 font-bold">
            <ShieldAlert size={18} />
            {"Save this secret now"}
          </div>
          <p className="mt-1 text-sm">{"It is shown once and stored encrypted."}</p>
          <div className="mt-3 flex gap-2">
            <code className="min-w-0 flex-1 overflow-auto rounded-lg bg-white p-3 text-xs">
              {secret}
            </code>
            <button
              onClick={() => void navigator.clipboard.writeText(secret)}
              className="rounded-lg border border-amber-300 bg-white px-3"
            >
              <Copy size={16} />
            </button>
          </div>
          <button onClick={() => setSecret(null)} className="mt-3 text-xs font-bold underline">
            {"I saved it"}
          </button>
        </div>
      )}
      <section className="surface p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <PlugZap size={18} />
          </span>
          <div className="font-display text-xl">{"Add endpoint"}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={"Name"}
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/haccora"
            inputMode="url"
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
          />
        </div>
        <button
          disabled={busy || name.trim().length < 2 || !url.startsWith("https://")}
          onClick={() => void create()}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="inline animate-spin" /> : "Create endpoint"}
        </button>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5 font-display text-xl">{"Endpoints"}</div>
          {endpoints.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">{"No endpoints."}</div>
          ) : (
            <ul className="divide-y divide-border">
              {endpoints.map((endpoint) => (
                <li key={endpoint.id} className="p-4 flex gap-3">
                  <Webhook size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{endpoint.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{endpoint.url}</div>
                    <div className="mt-1 text-xs">
                      {endpoint.enabled ? (
                        <span className="text-success">
                          <CheckCircle2 className="mr-1 inline" size={12} />
                          {"Active"}
                        </span>
                      ) : (
                        "Disabled"
                      )}{" "}
                      · {endpoint.failure_count} {"failures"}
                    </div>
                  </div>
                  <button
                    onClick={() => void test(endpoint.id)}
                    className="min-h-10 rounded-xl border border-border px-3 text-xs font-bold"
                  >
                    <Send className="mr-1 inline" size={13} />
                    {"Test"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5 font-display text-xl">{"Deliveries"}</div>
          <ul className="divide-y divide-border">
            {deliveries.map((delivery) => (
              <li key={delivery.id} className="p-4">
                <div className="flex justify-between gap-3">
                  <span className="text-sm font-bold">{delivery.event_type}</span>
                  <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black uppercase">
                    {delivery.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {"Attempts"}: {delivery.attempts} ·{" "}
                  {new Date(delivery.created_at).toLocaleString("en-GB")}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
