import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Gavel, Download, FileCheck2, Lock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { ukCalendarDate, ukInspectionPeriod } from "../../supabase/functions/_shared/inspection-period";

export const Route = createFileRoute("/app/inspection")({
  component: InspectionPage,
});

type EvidenceKey =
  "plan" | "temp" | "clean" | "pest" | "allerg" | "fitness" | "training" | "trace" | "audit";

type Row = { key: EvidenceKey; count: number; status: "ok" | "warn" | "empty" };

function InspectionPage() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <InspectionWorkspace
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}:${user.inspectorScopes.join(",")}`}
    />
  );
}

function InspectionWorkspace() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [from, setFrom] = useState(() => ukCalendarDate(new Date(), -180));
  const [to, setTo] = useState(() => ukCalendarDate(new Date()));
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ evidence: 0, incidents: 0, incidentsOpen: 0 });
  const [loadedPeriod, setLoadedPeriod] = useState("");
  const requestId = useRef(0);
  const exportLock = useRef(false);
  const previewCurrent = !loading && !loadError && loadedPeriod === `${from}:${to}`;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    setExportError(null);
    setReady(false);
    setLoadedPeriod("");
    setRows([]);
    setTotals({ evidence: 0, incidents: 0, incidentsOpen: 0 });
    let period: ReturnType<typeof ukInspectionPeriod>;
    try {
      period = ukInspectionPeriod(from, to);
    } catch {
      setLoadError("Choose a valid date range of up to 366 calendar days.");
      setLoading(false);
      return;
    }
    const fromIso = period.start;
    const toIso = period.end;
    const headRange = (table: string, col: string) =>
      supabase
        .from(table as any)
        .select("id", { count: "exact", head: true })
        .gte(col, fromIso)
        .lt(col, toIso);

    const results = await Promise.all([
      headRange("temperature_logs", "logged_at"),
      supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .eq("kind", "cleaning")
        .eq("status", "completed")
        .gte("completed_at", fromIso)
        .lt("completed_at", toIso),
      supabase
        .from("pest_sightings")
        .select("id", { count: "exact", head: true })
        .gte("observed_at", fromIso)
        .lt("observed_at", toIso),
      supabase.from("recipes").select("id", { count: "exact", head: true }),
      supabase
        .from("health_register")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso)
        .lt("created_at", toIso),
      supabase
        .from("training_records")
        .select("id", { count: "exact", head: true })
        .not("verified_at", "is", null)
        .gte("verified_at", fromIso)
        .lt("verified_at", toIso),
      supabase
        .from("goods_in_logs")
        .select("id", { count: "exact", head: true })
        .gte("received_at", fromIso)
        .lt("received_at", toIso),
      headRange("audits", "performed_at"),
      headRange("haccp_hazards", "created_at"),
      headRange("incidents", "created_at"),
      supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .neq("status", "closed")
        .gte("created_at", fromIso)
        .lt("created_at", toIso),
    ]).catch(() => null);
    if (request !== requestId.current) return;
    if (!results || results.some((result) => result.error || result.count === null)) {
      setLoadError(
        "Some inspection evidence could not be loaded. Missing values are not being treated as compliant.",
      );
      setLoading(false);
      return;
    }
    const [temp, clean, pest, allerg, fitness, training, trace, audit, haccp, incAll, incOpen] =
      results;

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
        count: c(training),
        status: c(training) > 0 ? "ok" : "empty",
      },
      { key: "trace", count: c(trace), status: c(trace) > 0 ? "ok" : "empty" },
      { key: "audit", count: c(audit), status: c(audit) > 0 ? "ok" : "empty" },
    ];
    const scopeByEvidence: Partial<Record<EvidenceKey, string>> = {
      plan: "haccp",
      temp: "temperature",
      clean: "cleaning",
      pest: "pest",
      allerg: "allergens",
      training: "training",
      trace: "traceability",
      audit: "audits",
    };
    const visibleBuild =
      user?.role === "inspector"
        ? build.filter((row) => {
            const requiredScope = scopeByEvidence[row.key];
            return !!requiredScope && user.inspectorScopes.includes(requiredScope);
          })
        : build;
    setRows(visibleBuild);
    setTotals({
      evidence: visibleBuild.reduce((n, r) => n + r.count, 0),
      incidents: c(incAll),
      incidentsOpen: c(incOpen),
    });
    setLoadedPeriod(`${from}:${to}`);
    setLoading(false);
  }, [from, to, user?.inspectorScopes, user?.role]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const downloadEvidence = async () => {
    if (!previewCurrent || !ready || exportLock.current) return;
    exportLock.current = true;
    const request = requestId.current;
    setExporting(true);
    setExportError(null);
    try {
      const { data, error } = await supabase.functions.invoke("inspection-export", {
        body: { from, to },
      });
      if (request !== requestId.current) return;
      if (error || !(data instanceof Blob)) throw new Error("Export failed");
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `haccora-evidence-${to}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      if (request === requestId.current) {
        setExportError("The evidence pack could not be downloaded. Please try again.");
      }
    } finally {
      exportLock.current = false;
      setExporting(false);
    }
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

      {loadError && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">{t("inspection.contents")}</h2>
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>
          <div
            className={`mt-2 grid gap-3 ${
              user?.role === "inspector" && !user.inspectorScopes.includes("incidents")
                ? "grid-cols-1"
                : "grid-cols-3"
            }`}
          >
            <Stat
              label={t("inspection.stat.evidence") || "Evidence records"}
              value={previewCurrent ? totals.evidence : null}
            />
            {(user?.role !== "inspector" || user.inspectorScopes.includes("incidents")) && (
              <>
                <Stat
                  label={t("inspection.stat.incidents") || "Incidents"}
                  value={previewCurrent ? totals.incidents : null}
                />
                <Stat
                  label={t("inspection.stat.open") || "Still open"}
                  value={previewCurrent ? totals.incidentsOpen : null}
                  accent={previewCurrent ? (totals.incidentsOpen > 0 ? "warn" : "ok") : undefined}
                />
              </>
            )}
          </div>
          <div className="mt-4 divide-y divide-border">
            {(previewCurrent ? rows : []).map((r) => (
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
          <p className="mt-2 text-xs text-muted-foreground">
            Dates are inclusive UK calendar days. The preview covers visible evidence categories;
            the PDF contains its own supported sections across your granted workspace access.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">{t("inspection.from")}</span>
              <input
                type="date"
                value={from}
                disabled={exporting}
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
                disabled={exporting}
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
            disabled={!previewCurrent || exporting}
          >
            <Gavel size={16} /> {t("common.generate")}
          </button>

          {ready && previewCurrent && (
            <div className="mt-4 rounded-lg bg-forest-deep text-primary-foreground p-4">
              <div className="text-xs opacity-70 uppercase tracking-widest">
                {t("common.ready")}
              </div>
              <div className="font-display text-lg mt-1">
                {t("inspection.pack")} · {from} → {to}
              </div>
              <div className="text-xs opacity-80 mt-1">
                {totals.evidence} preview records
                {(user?.role !== "inspector" || user.inspectorScopes.includes("incidents")) &&
                  ` · ${totals.incidents} incidents`}
              </div>
              <button
                disabled={exporting || !previewCurrent}
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent?: "ok" | "warn";
}) {
  const color =
    accent === "warn"
      ? "text-[color:var(--color-alert-red)]"
      : accent === "ok"
        ? "text-success"
        : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-0.5 ${color}`}>{value ?? "—"}</div>
    </div>
  );
}
