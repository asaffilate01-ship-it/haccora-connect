import { BusinessServicePrompt } from "@/components/BusinessServicePrompt";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/control-centre")({ component: ControlCentrePage });

type InboxItem = {
  id: string;
  item_type: string;
  source_id: string;
  source_table: string;
  owner_id: string | null;
  title: string;
  summary: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  due_at: string | null;
  created_at: string;
};

type CorrectiveAction = {
  id: string;
  status: "open" | "in_progress" | "verified" | "closed";
  owner_id: string | null;
};

const severityClass: Record<InboxItem["severity"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

function ControlCentrePage() {
  const { user } = useAuth();
  if (!user?.organizationId) {
    return <p className="p-5 text-sm">Select a workspace to review operational exceptions.</p>;
  }
  return (
    <ControlCentre
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`}
      organizationId={user.organizationId}
      locationId={user.locationId}
      userId={user.id}
      canManage={user.role === "owner" || user.role === "manager"}
    />
  );
}

function ControlCentre({
  organizationId,
  locationId,
  userId,
  canManage,
}: {
  organizationId: string;
  locationId: string | null;
  userId: string;
  canManage: boolean;
}) {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [loadError, setLoadError] = useState("");
  const [total, setTotal] = useState(0);
  const [loadedFilter, setLoadedFilter] = useState("");
  const requestId = useRef(0);
  const writeLock = useRef(false);
  const available = !loading && !loadError && loadedFilter === filter;

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      let inboxQuery = supabase
        .from("unified_inbox_items")
        .select(
          "id,item_type,source_id,source_table,owner_id,title,summary,severity,status,due_at,created_at",
          { count: "exact" },
        )
        .eq("organization_id", organizationId)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .order("id")
        .limit(150);
      if (locationId) {
        inboxQuery = inboxQuery.or(`location_id.eq.${locationId},location_id.is.null`);
      }
      if (filter === "open") inboxQuery = inboxQuery.in("status", ["open", "acknowledged"]);
      const inbox = await inboxQuery;
      if (request !== requestId.current) return;
      if (inbox.error || !inbox.data || inbox.count === null) {
        throw new Error("Inbox unavailable");
      }
      const nextItems = inbox.data as InboxItem[];
      const actionIds = [
        ...new Set(
          nextItems
            .filter((item) => item.source_table === "corrective_actions")
            .map((item) => item.source_id),
        ),
      ];
      let nextActions: CorrectiveAction[] = [];
      if (actionIds.length) {
        const corrective = await supabase
          .from("corrective_actions")
          .select("id,status,owner_id")
          .eq("organization_id", organizationId)
          .in("id", actionIds);
        if (request !== requestId.current) return;
        if (corrective.error || !corrective.data) throw new Error("Action evidence unavailable");
        nextActions = corrective.data as CorrectiveAction[];
      }
      setItems(nextItems);
      setActions(nextActions);
      setTotal(inbox.count);
      setLoadedFilter(filter);
    } catch {
      if (request !== requestId.current) return;
      setItems([]);
      setActions([]);
      setTotal(0);
      setLoadedFilter("");
      setLoadError("Operational evidence could not be loaded. Refresh before making decisions.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [filter, organizationId, locationId]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        void load();
      }, 500);
    };
    const channel = supabase
      .channel(`control-centre-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unified_inbox_items",
          filter: `organization_id=eq.${organizationId}`,
        },
        scheduleRefresh,
      )
      .subscribe();
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [load, organizationId]);

  const byId = useMemo(() => new Map(actions.map((action) => [action.id, action])), [actions]);
  const openItems = items.filter(
    (item) => item.status === "open" || item.status === "acknowledged",
  );
  const overdue = openItems.filter(
    (item) => item.due_at && new Date(item.due_at) < new Date(),
  ).length;
  const critical = openItems.filter((item) => item.severity === "critical").length;
  const offline = openItems.filter((item) => item.item_type === "sensor_offline").length;

  const actionFor = (item: InboxItem) =>
    item.source_table === "corrective_actions" ? byId.get(item.source_id) : undefined;

  const canProgress = (item: InboxItem) => {
    if (!available || item.status !== "open" || (!canManage && item.owner_id !== userId)) {
      return false;
    }
    if (item.source_table !== "corrective_actions") return true;
    const action = actionFor(item);
    return Boolean(
      action &&
        (action.status === "open" || action.status === "in_progress") &&
        (canManage || action.owner_id === userId),
    );
  };

  const progressAction = async (item: InboxItem) => {
    if (writeLock.current || !canProgress(item)) return;
    writeLock.current = true;
    setBusy(item.id);
    let started = false;
    try {
      const action = actionFor(item);
      if (action?.status === "open") {
        const { error } = await supabase.rpc("transition_corrective_action", {
          p_action_id: action.id,
          p_status: "in_progress",
          p_note: "Started in control centre",
          p_evidence: [],
        });
        if (error) throw error;
        started = true;
      }
      const { data, error } = await supabase
        .from("unified_inbox_items")
        .update({
          status: "acknowledged",
          owner_id: userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("organization_id", organizationId)
        .eq("status", "open")
        .select("id")
        .single();
      if (error || !data) throw new Error("Acknowledgement not confirmed");
      toast.success("Exception acknowledged.");
    } catch {
      toast.error(
        started
          ? "Action started, but acknowledgement was not confirmed. Review the refreshed queue."
          : "The change could not be confirmed. Review the refreshed queue.",
      );
    } finally {
      await load();
      writeLock.current = false;
      setBusy(null);
    }
  };

  return (
    <div className="p-5 md:p-10 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{"Live operations"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Control centre"}</h1>
          <p className="mt-1 text-muted-foreground">
            Review visible exceptions for the selected workspace, including shared organisation items.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-border px-3 py-2 text-xs font-bold"
            disabled={!!busy}
            onClick={() => setFilter((value) => (value === "open" ? "all" : "open"))}
          >
            {filter === "open" ? "Show all" : "Open only"}
          </button>
          <button
            className="rounded-full bg-foreground px-3 py-2 text-xs font-bold text-background"
            disabled={loading || !!busy}
            onClick={() => void load()}
          >
            <RefreshCw size={13} className="mr-1 inline" /> {"Refresh"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          [ShieldAlert, "Open in view", openItems.length, "text-red-700"],
          [AlertTriangle, "Critical", critical, "text-orange-700"],
          [Clock3, "Overdue", overdue, "text-amber-700"],
          [WifiOff, "Sensors offline", offline, "text-slate-700"],
        ].map(([Icon, label, value, colour]) => {
          const MetricIcon = Icon as typeof ShieldAlert;
          return (
            <div key={String(label)} className="surface p-4">
              <MetricIcon size={18} className={String(colour)} />
              <div className="mt-3 text-3xl font-display">{available ? String(value) : "—"}</div>
              <div className="text-xs text-muted-foreground">{String(label)}</div>
            </div>
          );
        })}
      </div>

      {available && (
        <p className="text-xs text-muted-foreground">
          Showing {items.length} of {total} matching visible items. Metrics describe this view.
        </p>
      )}
      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline animate-spin" size={16} /> {"Loading…"}
          </div>
        ) : loadError || !available ? (
          <div role="alert" className="p-6 text-sm text-destructive">
            {loadError || "Refresh the queue to review current evidence."}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto text-success" size={28} />
            <div className="mt-3 font-display text-xl">No matching visible items</div>
            <p className="mt-1 text-sm text-muted-foreground">
              This view does not establish that all operational checks are complete.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const action = actionFor(item);
              const isOverdue =
                (item.status === "open" || item.status === "acknowledged") &&
                item.due_at &&
                new Date(item.due_at) < new Date();
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
                        ? `Due ${new Date(item.due_at).toLocaleString("en-GB", {
                            timeZone: "Europe/London",
                          })}`
                        : "No deadline"}
                      {action ? ` · ${action.status.replace("_", " ")}` : ""}
                    </div>
                  </div>
                  <button
                    disabled={!!busy || !canProgress(item)}
                    onClick={() => void progressAction(item)}
                    className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    {busy === item.id ? (
                      <Loader2 className="inline animate-spin" size={15} />
                    ) : (
                      "Acknowledge"
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <BusinessServicePrompt
        services={["omni-intelligence", "omni-comms", "insure360"]}
        title="More support for your operation"
      />
    </div>
  );
}
