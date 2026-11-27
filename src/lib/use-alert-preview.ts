import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { createRefreshQueue } from "@/lib/refresh-queue";

type PreviewAlert = {
  id: string;
  kind: string;
  severity: string;
  title: string;
  message: string | null;
  created_at: string;
};

type Preview = {
  key: string;
  rows: PreviewAlert[];
  total: number | null;
  status: "loading" | "ready" | "error";
};

export function useAlertPreview(
  userId: string | null,
  organizationId: string | null,
  locationId: string | null,
  enabled: boolean,
) {
  const key =
    enabled && userId && organizationId && locationId
      ? `${userId}:${organizationId}:${locationId}`
      : "";
  const [preview, setPreview] = useState<Preview | null>(null);
  const queueRef = useRef<ReturnType<typeof createRefreshQueue> | null>(null);

  useEffect(() => {
    if (!key || !userId || !organizationId || !locationId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setPreview({ key, rows: [], total: null, status: "loading" });

    const queue = createRefreshQueue(async () => {
      if (!active) return;
      try {
        const result = await supabase
          .from("alerts")
          .select("id,kind,severity,title,message,created_at", { count: "exact" })
          .eq("organization_id", organizationId)
          .eq("user_id", userId)
          .or(`location_id.eq.${locationId},location_id.is.null`)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .order("id")
          .limit(8);
        if (!active) return;
        if (result.error || !result.data || result.count === null) {
          throw new Error("Unread alerts unavailable");
        }
        setPreview({ key, rows: result.data, total: result.count, status: "ready" });
      } catch {
        if (active) setPreview({ key, rows: [], total: null, status: "error" });
      }
    });
    queueRef.current = queue;

    const schedule = () => {
      if (!active || timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (active) void queue.request();
      }, 500);
    };
    const offline = () => {
      if (active) setPreview({ key, rows: [], total: null, status: "error" });
    };
    const channel = supabase
      .channel(`shell-alerts-${key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
          filter: `user_id=eq.${userId}`,
        },
        schedule,
      )
      .subscribe((status) => {
        if (active && status === "SUBSCRIBED") schedule();
      });
    window.addEventListener("focus", schedule);
    window.addEventListener("online", schedule);
    window.addEventListener("offline", offline);
    void queue.request();

    return () => {
      active = false;
      queue.dispose();
      queueRef.current = null;
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener("focus", schedule);
      window.removeEventListener("online", schedule);
      window.removeEventListener("offline", offline);
      void supabase.removeChannel(channel);
    };
  }, [key, userId, organizationId, locationId]);

  const current = key && preview?.key === key ? preview : null;
  return {
    rows: current?.rows ?? [],
    total: current?.total ?? null,
    status: current?.status ?? "loading",
    refresh: () => void queueRef.current?.request(),
  };
}
