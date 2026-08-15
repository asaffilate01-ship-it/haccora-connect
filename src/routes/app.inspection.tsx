import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Gavel, Download, FileCheck2, Lock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/inspection")({
  component: InspectionPage,
});

type EvidenceKey =
  | "plan"
  | "temp"
  | "clean"
  | "pest"
  | "allerg"
  | "fitness"
  | "training"
  | "trace"
  | "audit";

type Row = { key: EvidenceKey; count: number; status: "ok" | "warn" | "empty" };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function InspectionPage() {
  const { t } = useI18n();
  const [from, setFrom] = useState(isoDaysAgo(180));
  const [to, setTo] = useState(todayISO());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ evidence: 0, incidents: 0, incidentsOpen: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const fromIso = new Date(from).toISOString();
    const toIso = new Date(new Date(to).getTime() + 86400000).toISOString();
    const headEq = (table: string, col: string, val: string) =>
      supabase
        .from(table as any)
        .select("id", { count: "exact", head: true })
        .eq(col, val)
        .gte("created_at", fromIso)
        .lte("created_at", toIso);
    const headRange = (table: string, col: string) =>
      supabase
        .from(table as any)
        .select("id", { count: "exact", head: true })
        .gte(col, fromIso)
        .lte(col, toIso);

    const [temp, clean, pest, allerg, fitness, trace, audit, haccp, trainingDocs, incAll, incOpen] =
      await Promise.all([
        headRange("temperature_logs", "logged_at"),
        supabase
          .from("checks")
          .select("id", { count: "exact", head: true })
          .eq("kind", "cleaning")
          .eq("status", "completed")
          .gte("completed_at", fromIso)
          .lte("completed_at", toIso),
        supabase
          .from("pest_sightings")
          .select("id", { count: "exact", head: true })
          .gte("observed_at", fromIso)
          .lte("observed_at", toIso),
        supabase.from("recipes").select("id", { count: "exact", head: true }),
        supabase
          .from("training_records")
          .select("id", { count: "exact", head: true })
          .not("verified_at", "is", null)
          .gte("verified_at", fromIso)
          .lte("verified_at", toIso),
        supabase
          .from("goods_in_logs")
          .select("id", { count: "exact", head: true })
          .gte("received_at", fromIso)
          .lte("received_at", toIso),
        headRange("audits", "created_at"),
        headRange("haccp_hazards", "created_at"),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .in("category", ["training", "inspection"])
          .is("archived_at", null)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        headRange("incidents", "created_at"),
        supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .neq("status", "closed")
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
      ]);

    const c = (r: any) => r.count ?? 0;
    const build: Row[] = [
      { key: "plan", count: c(haccp), status: c(haccp) > 0 ? "ok" : "warn" },
      { key: "temp", count: c(temp), status: c(temp) > 0 ? "ok" : "warn" },
      { key: "clean", count: c(clean), status: c(clean) > 0 ? "ok" : "warn" },
      { key: "pest", count: c(pest), status: c(pest) > 0 ? "ok" : "empty" },
      { key: "allerg", count: c(allerg), status: c(allerg) > 0 ? "ok" : "warn" },
      { key: "fitness", count: c(fitness), status: c(fitness) > 0 ? "ok" : "warn" },
      {
        key: "training",
        count: c(trainingDocs),
        status: c(trainingDocs) > 0 ? "ok" : "empty",
      },
      { key: "trace", count: c(trace), status: c(trace) > 0 ? "ok" : "empty" },
      { key: "audit", count: c(audit), status: c(audit) > 0 ? "ok" : "empty" },
    ];
    setRows(build);
    setTotals({
      evidence: build.reduce((n, r) => n + r.count, 0),
      incidents: c(incAll),
      incidentsOpen: c(incOpen),
    });
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const downloadEvidence = async () => {
    setExporting(true);
    setExportError(null);
    const { data, error } = await supabase.functions.invoke("inspection-export", {
      body: { from, to },
    });
    setExporting(false);
    if (error || !(data instanceof Blob)) {
      setExportError(error?.message ?? "Export failed");
      return;
    }
    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `haccora-evidence-${to}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Haccora Inspector Mode</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{t("inspection.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("inspection.sub")}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
          <Lock size={12} /> {t("inspection.readonly")}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">{t("inspection.contents")}</h2>
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Stat
              label={t("inspection.stat.evidence") || "Evidence records"}
              value={totals.evidence}
            />
            <Stat label={t("inspection.stat.incidents") || "Incidents"} value={totals.incidents} />
            <Stat
              label={t("inspection.stat.open") || "Still open"}
              value={totals.incidentsOpen}
              accent={totals.incidentsOpen > 0 ? "warn" : "ok"}
            />
          </div>
          <div className="mt-4 divide-y divide-border">
            {rows.map((r) => (
              <div key={r.key} className="py-3 flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-lg grid place-items-center ${r.status === "ok" ? "bg-success/15 text-success" : r.status === "warn" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <FileCheck2 size={14} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{t(`inspection.item.${r.key}`)}</div>
                  <div className="text-xs text-muted-foreground">
                    {t(`inspection.item.${r.key}.sub`)}
                  </div>
                </div>
                <span className="text-xs font-semibold tabular-nums">{r.count}</span>
                <span
                  className={`text-xs w-4 text-center ${r.status === "ok" ? "text-success" : r.status === "warn" ? "text-warning-foreground" : "text-muted-foreground"}`}
                >
                  {r.status === "ok" ? "✓" : r.status === "warn" ? "!" : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface p-6 h-fit">
          <h2 className="font-display text-xl">{t("inspection.generate")}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t("inspection.desc")}</p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("inspection.from")}</span>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setReady(false);
                }}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("inspection.to")}</span>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setReady(false);
                }}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            onClick={() => setReady(true)}
            className="btn-primary w-full mt-5"
            disabled={loading}
          >
            <Gavel size={16} /> {t("common.generate")}
          </button>

          {ready && (
            <div className="mt-4 rounded-lg bg-forest-deep text-primary-foreground p-4">
              <div className="text-xs opacity-70 uppercase tracking-widest">
                {t("common.ready")}
              </div>
              <div className="font-display text-lg mt-1">
                {t("inspection.pack")} · {from} → {to}
              </div>
              <div className="text-xs opacity-80 mt-1">
                {totals.evidence} records · {totals.incidents} incidents
              </div>
              <button
                disabled={exporting}
                onClick={downloadEvidence}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                {exporting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Download size={12} />
                )}{" "}
                {t("common.downloadPdf")}
              </button>
              {exportError && (
                <div role="alert" className="mt-2 text-xs text-destructive">
                  {exportError}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "ok" | "warn" }) {
  const color =
    accent === "warn"
      ? "text-[color:var(--color-alert-red)]"
      : accent === "ok"
        ? "text-success"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
