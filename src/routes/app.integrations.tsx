import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Copy, Loader2, PlugZap, Send, ShieldAlert, Webhook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

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

function IntegrationsPage() {
  const { lang } = useI18n();
  const tr = useCallback((_legacy: string, english: string) => english, []);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [endpointResult, deliveryResult] = await Promise.all([
      (supabase as any)
        .from("webhook_endpoints")
        .select("id,name,url,event_types,enabled,failure_count,created_at")
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("webhook_deliveries")
        .select("id,endpoint_id,event_type,status,attempts,created_at")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    setEndpoints((endpointResult.data ?? []) as Endpoint[]);
    setDeliveries((deliveryResult.data ?? []) as Delivery[]);
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
  return (
    <div className="p-5 md:p-10 space-y-6">
      <div>
        <div className="eyebrow">{"Integrations"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Signed webhooks"}</h1>
        <p className="mt-1 text-muted-foreground">
          {"Idempotent events, HMAC signatures, retries and dead-letter status."}
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
