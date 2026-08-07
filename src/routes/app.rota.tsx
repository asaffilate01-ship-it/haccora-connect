import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Clock, Play, Square, User, Loader2, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/app/rota")({ component: RotaPage });

const DAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Shift {
  id: string;
  staff_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_label: string | null;
}
interface Clock {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  role_label: string | null;
  profile_name?: string;
}

function startOfWeek(d: Date) {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const s = new Date(d);
  s.setDate(d.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s;
}
function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function RotaPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role ?? "staff";
  const t = (_legacy: string, english: string) => english;
  const days = DAYS_EN;
  const canManage = role === "owner" || role === "manager";

  const [tab, setTab] = useState<"rota" | "clock">("rota");
  const [weekStart] = useState(() => startOfWeek(new Date()));
  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return end;
  }, [weekStart]);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [clocks, setClocks] = useState<Clock[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase
        .from("shifts")
        .select("*")
        .gte("shift_date", fmtDate(weekStart))
        .lte("shift_date", fmtDate(weekEnd))
        .order("shift_date"),
      supabase.from("time_clock").select("*").order("clock_in", { ascending: false }).limit(20),
    ]);
    // Fetch profile names for clock entries
    const ids = Array.from(new Set((c ?? []).map((x) => x.user_id)));
    const nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      (profs ?? []).forEach((p) => {
        nameMap[p.id] = p.full_name || "—";
      });
    }
    setShifts((s ?? []) as Shift[]);
    setClocks(((c ?? []) as Clock[]).map((x) => ({ ...x, profile_name: nameMap[x.user_id] })));
    setLoading(false);
  }, [weekStart, weekEnd]);
  useEffect(() => {
    load();
  }, [load]);

  // group shifts by staff
  const byStaff = useMemo(() => {
    const m = new Map<string, Shift[]>();
    shifts.forEach((s) => {
      if (!m.has(s.staff_name)) m.set(s.staff_name, []);
      m.get(s.staff_name)!.push(s);
    });
    return Array.from(m.entries());
  }, [shifts]);

  const myOpen = clocks.find((c) => c.user_id === user?.id && !c.clock_out);

  const clockIn = async () => {
    if (!user) return;
    setBusy(true);
    await supabase.from("time_clock").insert({ user_id: user.id, role_label: role });
    setBusy(false);
    load();
  };
  const clockOut = async () => {
    if (!myOpen) return;
    setBusy(true);
    await supabase
      .from("time_clock")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", myOpen.id);
    setBusy(false);
    load();
  };
  const deleteShift = async (id: string) => {
    await supabase.from("shifts").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="eyebrow">{"Workforce"}</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{"Rota & clock-in"}</h1>
          <p className="text-muted-foreground mt-1">
            {t(
              `Week beginning ${weekStart.toLocaleDateString("en-GB")} · Basic duration and rest checks are active.`,
              `Week starting ${weekStart.toLocaleDateString("en-GB")} · Basic duration and rest checks enabled.`,
            )}
          </p>
        </div>
        {canManage && tab === "rota" && (
          <button onClick={() => setShowForm(true)} className="btn-alert-solid text-sm">
            <Plus size={16} className="inline mr-1.5" />
            {"Add shift"}
          </button>
        )}
      </div>

      <div className="inline-flex rounded-full border border-border bg-card p-1 text-sm">
        <button
          onClick={() => setTab("rota")}
          className={`px-4 py-1.5 rounded-full ${tab === "rota" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <CalendarDays size={14} className="inline mr-1.5" />
          {"Rota"}
        </button>
        <button
          onClick={() => setTab("clock")}
          className={`px-4 py-1.5 rounded-full ${tab === "clock" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          <Clock size={14} className="inline mr-1.5" />
          {"Clock-in"}
        </button>
      </div>

      {tab === "rota" &&
        (loading ? (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            <Loader2 size={16} className="inline animate-spin mr-2" />…
          </div>
        ) : byStaff.length === 0 ? (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            <CalendarDays size={20} className="inline opacity-40 mr-2" />
            {"No shifts scheduled this week."}
          </div>
        ) : (
          <div className="surface overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary/60 text-muted-foreground uppercase tracking-widest">
                  <th className="text-left p-3 font-semibold min-w-[10rem]">{"Staff"}</th>
                  {days.map((d, i) => (
                    <th key={d} className="p-3 font-semibold text-center">
                      {d} <span className="opacity-50">{weekDates[i].getDate()}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byStaff.map(([name, list]) => (
                  <tr key={name}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-[10px] font-bold">
                          {name
                            .split(" ")
                            .map((x) => x[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span className="font-medium text-sm">{name}</span>
                      </div>
                    </td>
                    {weekDates.map((wd, i) => {
                      const iso = fmtDate(wd);
                      const s = list.find((x) => x.shift_date === iso);
                      return (
                        <td key={i} className="p-2 align-top">
                          {s ? (
                            <div className="rounded-lg bg-primary/10 border border-primary/20 px-2 py-1.5 text-center group relative">
                              <div className="text-[11px] font-bold text-primary">
                                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                              </div>
                              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                                {s.role_label ?? "—"}
                              </div>
                              {canManage && (
                                <button
                                  onClick={() => deleteShift(s.id)}
                                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                >
                                  <Trash2 size={8} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="h-10 rounded-lg border border-dashed border-border/60" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === "clock" && (
        <div className="space-y-4">
          <div className="surface p-5 flex items-center gap-4">
            <span className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center">
              <User size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-display">{"Me"}</div>
              <div className="text-xs text-muted-foreground">
                {myOpen ? (
                  <>
                    {"Clocked in since"}{" "}
                    <span className="font-mono">
                      {new Date(myOpen.clock_in).toLocaleTimeString("en-GB")}
                    </span>
                  </>
                ) : (
                  "Not clocked in"
                )}
              </div>
            </div>
            {myOpen ? (
              <button
                onClick={clockOut}
                disabled={busy}
                className="btn-alert-outline text-xs px-3 py-1.5"
              >
                {busy ? (
                  <Loader2 size={12} className="inline animate-spin mr-1" />
                ) : (
                  <Square size={12} className="inline mr-1" />
                )}
                {"Out"}
              </button>
            ) : (
              <button
                onClick={clockIn}
                disabled={busy}
                className="btn-alert-solid text-xs px-3 py-1.5"
              >
                {busy ? (
                  <Loader2 size={12} className="inline animate-spin mr-1" />
                ) : (
                  <Play size={12} className="inline mr-1" />
                )}
                {"In"}
              </button>
            )}
          </div>
          {canManage && (
            <div>
              <div className="text-sm font-display mb-3">{"Team activity"}</div>
              {clocks.length === 0 ? (
                <div className="surface p-6 text-center text-sm text-muted-foreground">
                  {"No clock entries yet."}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {clocks.map((c) => (
                    <div key={c.id} className="surface p-4 flex items-center gap-3">
                      <span className="h-9 w-9 rounded-full bg-secondary grid place-items-center">
                        <User size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{c.profile_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-mono">
                            {new Date(c.clock_in).toLocaleString("en-GB")}
                          </span>
                          {c.clock_out ? (
                            <>
                              {" "}
                              →{" "}
                              <span className="font-mono">
                                {new Date(c.clock_out).toLocaleTimeString("en-GB")}
                              </span>
                            </>
                          ) : (
                            <span className="ml-2 text-success font-semibold">● {"live"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && canManage && (
        <ShiftForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          t={t}
          defaultDate={fmtDate(weekDates[0])}
        />
      )}
    </div>
  );
}

function ShiftForm({
  onClose,
  onSaved,
  t,
  defaultDate,
}: {
  onClose: () => void;
  onSaved: () => void;
  t: (de: string, en: string) => string;
  defaultDate: string;
}) {
  const [staff, setStaff] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [roleLabel, setRoleLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const startAt = new Date(`${date}T${start}:00`);
    const endAt = new Date(`${date}T${end}:00`);
    const hours = (endAt.getTime() - startAt.getTime()) / 3600000;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 10) {
      setSaving(false);
      setError("Shifts must end on the same day and may not exceed 10 hours.");
      return;
    }
    const rangeStart = new Date(startAt);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(endAt);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    const { data: nearby } = await supabase
      .from("shifts")
      .select("shift_date,start_time,end_time")
      .eq("staff_name", staff)
      .gte("shift_date", rangeStart.toISOString().slice(0, 10))
      .lte("shift_date", rangeEnd.toISOString().slice(0, 10));
    const conflict = (nearby ?? []).some((shift) => {
      const existingStart = new Date(`${shift.shift_date}T${shift.start_time}`);
      const existingEnd = new Date(`${shift.shift_date}T${shift.end_time}`);
      const overlaps = startAt < existingEnd && endAt > existingStart;
      if (overlaps) return true;
      const restHours =
        existingEnd <= startAt
          ? (startAt.getTime() - existingEnd.getTime()) / 3600000
          : (existingStart.getTime() - endAt.getTime()) / 3600000;
      return restHours < 11;
    });
    if (conflict) {
      setSaving(false);
      setError("An overlap or less than 11 hours of rest was detected.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("shifts").insert({
      staff_name: staff,
      shift_date: date,
      start_time: start,
      end_time: end,
      role_label: roleLabel || null,
      created_by: user?.id,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4">
      <form onSubmit={save} className="surface w-full max-w-md p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{"New shift"}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <FF label={"Staff"}>
          <input
            required
            value={staff}
            onChange={(e) => setStaff(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </FF>
        <div className="grid grid-cols-3 gap-3">
          <FF label={"Date"}>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </FF>
          <FF label={"From"}>
            <input
              type="time"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </FF>
          <FF label={"To"}>
            <input
              type="time"
              required
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </FF>
        </div>
        <FF label={"Role"}>
          <input
            value={roleLabel}
            onChange={(e) => setRoleLabel(e.target.value)}
            placeholder={"e.g. Kitchen"}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </FF>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {
            "This automated check does not replace employment-law advice or review of breaks, exceptions and compensation periods."
          }
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-full border border-border"
          >
            {"Cancel"}
          </button>
          <button type="submit" disabled={saving} className="btn-alert-solid text-sm">
            {saving ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
            {"Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
function FF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
