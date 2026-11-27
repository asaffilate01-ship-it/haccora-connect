import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { createRefreshQueue } from "@/lib/refresh-queue";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  Thermometer,
  Sparkles,
  ShieldCheck,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/app/alerts")({ component: AlertsPage });

interface Row {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}

const ICON: Record<string, typeof Bell> = {
  temperature: Thermometer,
  cleaning: Sparkles,
  haccp: ShieldCheck,
  training: Users,
};

function AlertsPage() {
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId || user.role === "inspector") {
    return <p className="p-5 text-sm">Select an authorised site to review personal alerts.</p>;
  }
  return (
    <SiteAlerts
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`}
      userId={user.id}
      organizationId={user.organizationId}
      locationId={user.locationId}
    />
  );
}

type Scope = { userId: string; organizationId: string; locationId: string };
const PAGE_SIZE = 50;

function SiteAlerts({ userId, organizationId, locationId }: Scope) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("unread");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");
  const [live, setLive] = useState(false);
  const requestId = useRef(0);
  const mounted = useRef(false);
  const writeLock = useRef(false);
  const refreshQueue = useRef<ReturnType<typeof createRefreshQueue> | null>(null);
  const scope = `location_id.eq.${locationId},location_id.is.null`;
  const viewKey = `${filter}:${page}`;
  const available = !loading && !loadError && loadedKey === viewKey;
  const offset = page * PAGE_SIZE;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      let query = supabase
        .from("alerts")
        .select("id,kind,severity,title,message,read_at,created_at", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .or(scope)
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1);
      if (filter === "unread") query = query.is("read_at", null);
      if (filter === "critical") query = query.eq("severity", "critical");
      const [list, unreadCount] = await Promise.all([
        query,
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .or(scope)
          .is("read_at", null),
      ]);
      if (request !== requestId.current) return;
      if (
        list.error ||
        !list.data ||
        list.count === null ||
        unreadCount.error ||
        unreadCount.count === null
      ) {
        throw new Error("Alert evidence unavailable");
      }
      if (page > 0 && offset >= list.count) {
        setPage(Math.max(0, Math.ceil(list.count / PAGE_SIZE) - 1));
        return;
      }
      setRows(list.data);
      setTotal(list.count);
      setUnread(unreadCount.count);
      setLoadedKey(viewKey);
    } catch {
      if (request !== requestId.current) return;
      setRows([]);
      setLoadedKey("");
      setLoadError("Alerts could not be verified. Refresh before relying on this inbox.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [organizationId, userId, scope, offset, page, filter, viewKey]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const queue = createRefreshQueue(load);
    refreshQueue.current = queue;
    void queue.request();
    return () => {
      queue.dispose();
      refreshQueue.current = null;
      requestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (!active || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (active) void refreshQueue.current?.request();
      }, 600);
    };
    const offline = () => setLive(false);
    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("online", scheduleRefresh);
    window.addEventListener("offline", offline);
    const channel = supabase
      .channel(`web-alert-inbox-${userId}-${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
          filter: `user_id=eq.${userId}`,
        },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (!active) return;
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") scheduleRefresh();
      });
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("online", scheduleRefresh);
      window.removeEventListener("offline", offline);
      void supabase.removeChannel(channel);
    };
  }, [userId, locationId]);

  const unreadInView = rows.filter((row) => !row.read_at);
  const markRead = async (ids: string[]) => {
    if (!available || writeLock.current || !ids.length) return;
    const visibleIds = new Set(unreadInView.map((row) => row.id));
    if (ids.some((id) => !visibleIds.has(id))) return;
    writeLock.current = true;
    setBusy(true);
    setNotice("");
    try {
      const { data, error } = await supabase
        .from("alerts")
        .update({ read_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .or(scope)
        .in("id", ids)
        .is("read_at", null)
        .select("id,read_at");
      const confirmed = new Set((data ?? []).filter((row) => row.read_at).map((row) => row.id));
      if (error || ids.some((id) => !confirmed.has(id))) {
        throw new Error("Read status not fully confirmed");
      }
      if (mounted.current) setNotice("Read status saved.");
    } catch {
      if (mounted.current) setNotice("Some read statuses were not confirmed. Review the inbox.");
    } finally {
      if (mounted.current) {
        await refreshQueue.current?.request();
        setBusy(false);
      }
      writeLock.current = false;
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Action inbox</div>
          <h1 className="mt-1 text-3xl md:text-4xl">Alerts</h1>
          <p className="text-muted-foreground mt-1">
            {available ? `${unread} unread for your site` : "Unread count unavailable"}
          </p>
          <p role="status" className="text-xs text-muted-foreground mt-1">
            {live ? "Live channel connected" : "Live updates unavailable — refresh manually"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "unread", "critical"] as const).map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              disabled={busy}
              onClick={() => {
                setPage(0);
                setFilter(f);
              }}
              className={`min-h-11 text-xs font-semibold px-3 py-1.5 rounded-full border ${filter === f ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
            >
              {f === "all" ? "All" : f === "unread" ? "Unread" : "Critical"}
            </button>
          ))}
          {available && unreadInView.length > 0 && (
            <button
              disabled={busy}
              onClick={() => void markRead(unreadInView.map((row) => row.id))}
              className="min-h-11 text-xs font-semibold px-3 py-1.5 rounded-full bg-success text-success-foreground disabled:opacity-50"
            >
              Read visible
            </button>
          )}
          <button
            className="btn-secondary px-3 py-2 text-sm"
            disabled={busy || loading}
            onClick={() => void refreshQueue.current?.request()}
          >
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="surface p-3 text-sm">
          {notice}
        </p>
      )}
      {available && (
        <p className="text-xs text-muted-foreground">
          Showing {rows.length} of {total} matching alerts. Read status is not resolution.
        </p>
      )}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            Loading…
          </div>
        ) : !available ? (
          <div role="alert" className="p-6 text-sm text-destructive">
            {loadError || "Refresh to verify current alerts."}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Bell size={20} className="inline mr-2 opacity-40" />
            No matching alerts. Review source records for outstanding actions.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((a) => {
              const Icon = ICON[a.kind] ?? AlertTriangle;
              const sevCls =
                a.severity === "critical"
                  ? "bg-[color:var(--color-alert-red)]/15 text-[color:var(--color-alert-red)]"
                  : a.severity === "warning"
                    ? "bg-amber-500/15 text-amber-700"
                    : "bg-secondary text-muted-foreground";
              return (
                <li
                  key={a.id}
                  className={`p-4 flex items-start gap-4 ${a.read_at ? "opacity-70" : ""}`}
                >
                  <span
                    className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${sevCls}`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        {a.severity}
                      </span>
                      {!a.read_at && (
                        <span className="text-[9px] font-bold text-success">● NEW</span>
                      )}
                    </div>
                    <div className="font-display text-lg mt-0.5">{a.title}</div>
                    {a.message && (
                      <div className="text-sm text-muted-foreground mt-1">{a.message}</div>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("en-GB", {
                        timeZone: "Europe/London",
                      })}
                    </div>
                  </div>
                  {!a.read_at && (
                    <button
                      disabled={busy}
                      onClick={() => void markRead([a.id])}
                      className="min-h-11 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/70 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} className="inline mr-1" />
                      Read
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {available && total > PAGE_SIZE && (
        <nav aria-label="Alert pages" className="flex items-center justify-between gap-2">
          <button
            className="btn-secondary px-3 py-2 text-sm"
            disabled={busy || page === 0}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span className="text-sm tabular-nums">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            className="btn-secondary px-3 py-2 text-sm"
            disabled={busy || offset + PAGE_SIZE >= total}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
