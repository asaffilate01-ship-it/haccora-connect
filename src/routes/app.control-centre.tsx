import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/control-centre")({ component: ControlCentrePage });

type InboxItem = {
  id: string;
  item_type: string;
  source_id: string;
  title: string;
  summary: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  due_at: string | null;
  created_at: string;
};

type CorrectiveAction = {
  id: string;
  description: string;
  status: "open" | "in_progress" | "verified" | "closed";
  severity: string;
  owner_id: string | null;
  due_at: string | null;
  evidence: Array<Record<string, unknown>>;
};

const severityClass: Record<InboxItem["severity"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

function ControlCentrePage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const tr = useCallback((de: string, en: string) => (lang === "de" ? de : en), [lang]);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  const load = useCallback(async () => {
    setLoading(true);
    const inboxQuery = (supabase as any)
      .from("unified_inbox_items")
      .select("id,item_type,source_id,title,summary,severity,status,due_at,created_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (filter === "open") inboxQuery.in("status", ["open", "acknowledged"]);
    const [inbox, corrective] = await Promise.all([
      inboxQuery,
      (supabase as any)
        .from("corrective_actions")
        .select("id,description,status,severity,owner_id,due_at,evidence")
        .in("status", ["open", "in_progress", "verified"])
        .order("due_at", { ascending: true })
        .limit(150),
    ]);
    if (inbox.error || corrective.error) {
      toast.error(
        tr("Kontrollzentrum konnte nicht geladen werden.", "Control centre could not load."),
      );
    }
    setItems((inbox.data ?? []) as InboxItem[]);
    setActions((corrective.data ?? []) as CorrectiveAction[]);
    setLoading(false);
  }, [filter, tr]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.organizationId) return;
    const channel = supabase
      .channel(`control-centre-${user.organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unified_inbox_items" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, user?.organizationId]);

  const byId = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions]);
  const overdue = items.filter((item) => item.due_at && new Date(item.due_at) < new Date()).length;
  const critical = items.filter((item) => item.severity === "critical").length;
  const offline = items.filter((item) => item.item_type === "sensor_offline").length;

  const acknowledge = async (item: InboxItem) => {
    setBusy(item.id);
    const { error } = await (supabase as any)
      .from("unified_inbox_items")
      .update({
        status: "acknowledged",
        owner_id: user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    setBusy(null);
    if (error) toast.error(error.message);
    else void load();
  };

  const progressAction = async (item: InboxItem) => {
    const action = byId.get(item.source_id);
    if (!action) return acknowledge(item);
    setBusy(item.id);
    const { error } = await (supabase as any).rpc("transition_corrective_action", {
      p_action_id: action.id,
      p_status: "in_progress",
      p_note: tr("Im Kontrollzentrum übernommen", "Claimed in control centre"),
      p_evidence: [],
    });
    if (!error) {
      await (supabase as any)
        .from("unified_inbox_items")
        .update({
          status: "acknowledged",
          owner_id: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", item.id);
    }
    setBusy(null);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="p-5 md:p-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{tr("Live-Betrieb", "Live operations")}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{tr("Kontrollzentrum", "Control centre")}</h1>
          <p className="mt-1 text-muted-foreground">
            {tr(
              "Eine priorisierte, persistente Warteschlange für Abweichungen und Nachweise.",
              "One prioritised, persistent queue for exceptions, ownership and evidence.",
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-border px-3 py-2 text-xs font-bold"
            onClick={() => setFilter((value) => (value === "open" ? "all" : "open"))}
          >
            {filter === "open" ? tr("Alle anzeigen", "Show all") : tr("Nur offen", "Open only")}
          </button>
          <button
            className="rounded-full bg-foreground px-3 py-2 text-xs font-bold text-background"
            onClick={() => void load()}
          >
            <RefreshCw size={13} className="mr-1 inline" /> {tr("Aktualisieren", "Refresh")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [ShieldAlert, tr("Offene Punkte", "Open items"), items.length, "text-red-700"],
          [AlertTriangle, tr("Kritisch", "Critical"), critical, "text-orange-700"],
          [Clock3, tr("Überfällig", "Overdue"), overdue, "text-amber-700"],
          [WifiOff, tr("Sensor offline", "Sensors offline"), offline, "text-slate-700"],
        ].map(([Icon, label, value, colour]) => {
          const MetricIcon = Icon as typeof ShieldAlert;
          return (
            <div key={String(label)} className="surface p-4">
              <MetricIcon size={18} className={String(colour)} />
              <div className="mt-3 text-3xl font-display">{String(value)}</div>
              <div className="text-xs text-muted-foreground">{String(label)}</div>
            </div>
          );
        })}
      </div>

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline animate-spin" size={16} /> {tr("Lade…", "Loading…")}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto text-success" size={28} />
            <div className="mt-3 font-display text-xl">
              {tr("Alles unter Kontrolle", "All clear")}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr("Keine offenen Betriebsausnahmen.", "There are no open operational exceptions.")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const action = byId.get(item.source_id);
              const isOverdue = item.due_at && new Date(item.due_at) < new Date();
              return (
                <li
                  key={item.id}
                  className="p-4 md:p-5 flex flex-col gap-4 md:flex-row md:items-center"
                >
                  <span
                    className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${severityClass[item.severity]}`}
                  >
                    {item.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.summary}</div>
                    <div
                      className={`mt-1 text-xs ${isOverdue ? "font-bold text-red-700" : "text-muted-foreground"}`}
                    >
                      {item.due_at
                        ? `${tr("Fällig", "Due")} ${new Date(item.due_at).toLocaleString(lang === "de" ? "de-DE" : "en-GB")}`
                        : tr("Keine Frist", "No deadline")}
                      {action ? ` · ${action.status.replace("_", " ")}` : ""}
                    </div>
                  </div>
                  <button
                    disabled={busy === item.id}
                    onClick={() => void progressAction(item)}
                    className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {busy === item.id ? (
                      <Loader2 className="inline animate-spin" size={15} />
                    ) : (
                      tr("Übernehmen", "Take ownership")
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
