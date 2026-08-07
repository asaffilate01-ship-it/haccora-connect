import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquareWarning, PlusCircle, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/app/complaints")({ component: ComplaintsPage });

type Channel = "in_person" | "phone" | "email" | "review" | "other";
type Kind = "quality" | "allergen" | "foreign_body" | "illness" | "service" | "other";
type Sev = "low" | "medium" | "high";
type Status = "open" | "investigating" | "resolved" | "closed";

interface Row {
  id: string;
  guest_name: string | null;
  contact: string | null;
  channel: Channel;
  kind: Kind;
  severity: Sev;
  status: Status;
  description: string;
  resolution: string | null;
  occurred_at: string;
  closed_at: string | null;
}

const KIND: Record<Kind, [string, string]> = {
  quality: ["Quality", "Quality"],
  allergen: ["Allergen breach", "Allergen breach"],
  foreign_body: ["Foreign body", "Foreign body"],
  illness: ["Illness", "Illness"],
  service: ["Service", "Service"],
  other: ["Other", "Other"],
};

function ComplaintsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    guest_name: "",
    contact: "",
    channel: "in_person" as Channel,
    kind: "quality" as Kind,
    severity: "low" as Sev,
    description: "",
    resolution: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(100);
    if (error) setErr(error.message);
    else setItems((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!user || !f.description.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("complaints").insert({
      user_id: user.id,
      guest_name: f.guest_name.trim() || null,
      contact: f.contact.trim() || null,
      channel: f.channel,
      kind: f.kind,
      severity: f.severity,
      status: "open",
      description: f.description.trim(),
      resolution: f.resolution.trim() || null,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setF({
      guest_name: "",
      contact: "",
      channel: "in_person",
      kind: "quality",
      severity: "low",
      description: "",
      resolution: "",
    });
    setOpen(false);
    load();
  };

  const close = async (id: string) => {
    const { error } = await supabase
      .from("complaints")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) setErr(error.message);
    else load();
  };

  const openCount = items.filter((i) => i.status !== "closed" && i.status !== "resolved").length;
  const high = items.filter((i) => i.severity === "high" && i.status !== "closed").length;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"Guest communication"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Complaints register"}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            {"Log guest complaints, categorise them and record the investigation and resolution."}
          </p>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="btn-alert-solid text-sm">
          <PlusCircle size={16} className="inline mr-1.5" />
          {"Log complaint"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label={"Open"} value={openCount} tone="warn" />
        <Kpi label={"High severity"} value={high} tone="danger" />
        <Kpi label={"Total"} value={items.length} tone="neutral" />
      </div>

      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
      )}

      {open && (
        <div className="surface p-5 grid md:grid-cols-4 gap-3">
          <input
            value={f.guest_name}
            onChange={(e) => setF({ ...f, guest_name: e.target.value })}
            placeholder={"Guest (optional)"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <input
            value={f.contact}
            onChange={(e) => setF({ ...f, contact: e.target.value })}
            placeholder={"Contact"}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={f.channel}
            onChange={(e) => setF({ ...f, channel: e.target.value as Channel })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="in_person">{"In person"}</option>
            <option value="phone">{"Phone"}</option>
            <option value="email">E-Mail</option>
            <option value="review">{"Review"}</option>
            <option value="other">{"Other"}</option>
          </select>
          <select
            value={f.kind}
            onChange={(e) => setF({ ...f, kind: e.target.value as Kind })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {(Object.keys(KIND) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {KIND[k][1]}
              </option>
            ))}
          </select>
          <select
            value={f.severity}
            onChange={(e) => setF({ ...f, severity: e.target.value as Sev })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="low">{"Low"}</option>
            <option value="medium">{"Medium"}</option>
            <option value="high">{"High"}</option>
          </select>
          <textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            placeholder={"What happened?"}
            className="md:col-span-4 rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[70px]"
          />
          <input
            value={f.resolution}
            onChange={(e) => setF({ ...f, resolution: e.target.value })}
            placeholder={"Resolution"}
            className="md:col-span-4 rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-alert-solid text-sm md:col-span-4 inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {"Save"}
          </button>
        </div>
      )}

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            {"Loading…"}
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {"No complaints yet."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <li key={i.id} className="p-5 flex items-start gap-4">
                <span
                  className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${i.severity === "high" ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]" : i.severity === "medium" ? "bg-amber-500/15 text-amber-700" : "bg-secondary text-muted-foreground"}`}
                >
                  <MessageSquareWarning size={18} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    {KIND[i.kind][1]}
                  </div>
                  <div className="font-display text-base mt-0.5">{i.guest_name ?? "Anonymous"}</div>
                  <div className="text-sm text-muted-foreground mt-1">{i.description}</div>
                  {i.resolution && (
                    <div className="text-xs mt-2 bg-secondary/60 rounded-lg px-3 py-2">
                      <b>{"Resolution"}: </b>
                      {i.resolution}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(i.occurred_at).toLocaleString("en-GB")}
                  </div>
                </div>
                {i.status !== "closed" && (
                  <button
                    onClick={() => close(i.id)}
                    className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-success text-success-foreground hover:brightness-110"
                  >
                    <CheckCircle2 size={12} className="inline mr-1" />
                    {"Close"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warn" | "danger" | "neutral";
}) {
  const cls =
    tone === "danger"
      ? "text-[color:var(--color-alert-red)]"
      : tone === "warn"
        ? "text-amber-600"
        : "text-foreground";
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-4xl mt-2 ${cls}`}>{value}</div>
    </div>
  );
}
