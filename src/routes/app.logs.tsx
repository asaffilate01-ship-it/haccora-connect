import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { History, Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/logs")({ component: LogsPage });

interface Row {
  id: string;
  user_id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

function LogsPage() {
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = (data ?? []) as Row[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; full_name: string | null }) => {
        map[p.id] = p.full_name ?? "—";
      });
      setNames(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.action + " " + (r.entity ?? "") + " " + (names[r.user_id] ?? ""))
        .toLowerCase()
        .includes(s),
    );
  }, [rows, q, names]);

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <div className="eyebrow">{t("logs.eyebrow")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{t("logs.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("logs.sub")}</p>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 max-w-md">
        <Search size={14} className="text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("logs.searchPh")}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>

      <div className="surface overflow-hidden">
        <div className="hidden md:grid grid-cols-12 text-xs uppercase tracking-widest text-muted-foreground bg-secondary/60 px-5 py-3">
          <div className="col-span-3">{t("logs.col.when")}</div>
          <div className="col-span-3">{t("logs.col.actor")}</div>
          <div className="col-span-2">{t("logs.col.action")}</div>
          <div className="col-span-4">{t("logs.col.target")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <History size={20} className="inline mr-2 opacity-40" />
            {t("logs.empty")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-1 md:grid-cols-12 px-5 py-3 items-center gap-3 text-sm"
              >
                <div className="md:col-span-3 font-mono text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString("en-GB")}
                </div>
                <div className="md:col-span-3 truncate">{names[e.user_id] ?? "—"}</div>
                <div className="md:col-span-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase">
                    {e.action}
                  </span>
                </div>
                <div className="md:col-span-4 text-xs">
                  {e.entity ?? "—"}
                  {e.entity_id ? ` · ${e.entity_id.slice(0, 8)}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground max-w-3xl">{t("logs.footer")}</p>
    </div>
  );
}
