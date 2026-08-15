import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Send,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/platform-support")({
  head: () => ({
    meta: [
      { title: "Customer support operations — Haccora platform" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlatformSupport,
});

type SupportStatus = "open" | "in_progress" | "pending_customer" | "resolved" | "closed";
type SupportPriority = "normal" | "high" | "urgent";

type SupportCase = {
  id: string;
  case_number: number;
  organization_name: string;
  reporter_email: string;
  category: string;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  first_responded_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupportMessage = {
  id: string;
  author_kind: "customer" | "operator";
  author_label: string;
  body: string;
  is_internal: boolean;
  created_at: string;
};

const statuses: SupportStatus[] = ["open", "in_progress", "pending_customer", "resolved", "closed"];
const priorities: SupportPriority[] = ["normal", "high", "urgent"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function PlatformSupport() {
  const { user, hydrated } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "active">("active");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SupportStatus>("in_progress");
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [response, setResponse] = useState("");
  const [internal, setInternal] = useState(false);
  const [mfaLevel, setMfaLevel] = useState("aal1");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canManage =
    user?.platformRole === "platform_owner" || user?.platformRole === "platform_support";

  useEffect(() => {
    if (!hydrated) return;
    if (!user?.platformRole) {
      void navigate({ to: "/login", search: { redirect: "/platform-support" } as never });
    }
  }, [hydrated, navigate, user?.platformRole]);

  const loadCases = useCallback(async () => {
    if (!user?.platformRole) return;
    setLoading(true);
    setError("");
    const [caseResult, assuranceResult] = await Promise.all([
      supabase
        .from("support_cases")
        .select(
          "id,case_number,organization_name,reporter_email,category,subject,status,priority,first_responded_at,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (caseResult.error) setError(caseResult.error.message);
    else {
      const rows = (caseResult.data ?? []) as SupportCase[];
      setCases(rows);
      setSelectedId((current) =>
        current && rows.some((supportCase) => supportCase.id === current)
          ? current
          : (rows[0]?.id ?? null),
      );
    }
    setMfaLevel(assuranceResult.data?.currentLevel ?? "aal1");
    setLoading(false);
  }, [user?.platformRole]);

  const loadMessages = useCallback(async (caseId: string) => {
    const { data, error: readError } = await supabase
      .from("support_case_messages")
      .select("id,author_kind,author_label,body,is_internal,created_at")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });
    if (readError) setError(readError.message);
    else setMessages((data ?? []) as SupportMessage[]);
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [loadMessages, selectedId]);

  const selected = useMemo(
    () => cases.find((supportCase) => supportCase.id === selectedId) ?? null,
    [cases, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setStatus(selected.status);
    setPriority(selected.priority);
    setResponse("");
    setInternal(false);
  }, [selected]);

  const visibleCases = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cases.filter((supportCase) => {
      const statusMatches =
        statusFilter === "active"
          ? !["resolved", "closed"].includes(supportCase.status)
          : supportCase.status === statusFilter;
      const textMatches =
        !needle ||
        supportCase.subject.toLowerCase().includes(needle) ||
        supportCase.organization_name.toLowerCase().includes(needle) ||
        supportCase.reporter_email.toLowerCase().includes(needle) ||
        String(supportCase.case_number).includes(needle);
      return statusMatches && textMatches;
    });
  }, [cases, query, statusFilter]);

  const saveCase = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !canManage) return;
    if (mfaLevel !== "aal2") {
      setError("MFA step-up is required in the control plane before support cases can be changed.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    const { error: updateError } = await supabase.functions.invoke("platform-admin", {
      body: {
        action: "update_support_case",
        caseId: selected.id,
        status,
        priority,
        message: response.trim() || undefined,
        internal,
      },
    });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotice(
      response.trim()
        ? internal
          ? "Internal note saved and the governed status update was audited."
          : "Customer response saved and the governed status update was audited."
        : "Case status updated and audited.",
    );
    setResponse("");
    await Promise.all([loadCases(), loadMessages(selected.id)]);
  };

  if (!hydrated || !user?.platformRole) return null;

  return (
    <main className="min-h-screen bg-secondary/35 px-4 py-7 md:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-8 w-auto" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Platform operations
              </p>
              <h1 className="text-2xl font-bold text-foreground">Customer support queue</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadCases()}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link
              to="/platform"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold"
            >
              <ArrowLeft size={15} /> Control plane
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <Metric
            label="Active"
            value={cases.filter((item) => !["resolved", "closed"].includes(item.status)).length}
            icon={LifeBuoy}
          />
          <Metric
            label="Urgent"
            value={
              cases.filter(
                (item) =>
                  item.priority === "urgent" && !["resolved", "closed"].includes(item.status),
              ).length
            }
            icon={AlertTriangle}
          />
          <Metric
            label="Waiting for customer"
            value={cases.filter((item) => item.status === "pending_customer").length}
            icon={Clock3}
          />
          <Metric
            label="Resolved"
            value={cases.filter((item) => item.status === "resolved").length}
            icon={CheckCircle2}
          />
        </section>

        {mfaLevel !== "aal2" && canManage && (
          <div className="flex items-start gap-2 rounded-xl bg-warning/15 p-4 text-sm text-warning-foreground">
            <LockKeyhole size={17} className="mt-0.5 shrink-0" />
            Open the control plane and complete MFA step-up before replying, adding an internal note
            or changing a case.
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-xl bg-success/10 p-4 text-sm text-success">
            {notice}
          </div>
        )}

        <section className="grid min-h-[38rem] overflow-hidden rounded-2xl border border-border bg-card xl:grid-cols-[24rem_1fr]">
          <div className="border-b border-border xl:border-b-0 xl:border-r">
            <div className="grid gap-3 border-b border-border p-4">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search case, business or email"
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as SupportStatus | "active")
                }
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="active">All active cases</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            {loading ? (
              <div className="grid min-h-48 place-items-center">
                <Loader2 className="animate-spin" />
              </div>
            ) : visibleCases.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No cases match this view.</p>
            ) : (
              <div className="max-h-[46rem] overflow-y-auto">
                {visibleCases.map((supportCase) => (
                  <button
                    key={supportCase.id}
                    type="button"
                    onClick={() => setSelectedId(supportCase.id)}
                    className={`w-full border-b border-border p-4 text-left ${
                      selectedId === supportCase.id ? "bg-primary/8" : "hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-black text-primary">
                        HC-{String(supportCase.case_number).padStart(6, "0")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${supportCase.priority === "urgent" ? "bg-destructive/10 text-destructive" : "bg-secondary"}`}
                      >
                        {supportCase.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold">{supportCase.organization_name}</p>
                    <p className="line-clamp-2 text-sm">{supportCase.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {supportCase.status.replaceAll("_", " ")} ·{" "}
                      {formatDate(supportCase.updated_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!selected ? (
            <div className="grid place-items-center p-8 text-sm text-muted-foreground">
              Select a support case.
            </div>
          ) : (
            <div className="flex min-w-0 flex-col">
              <header className="border-b border-border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-primary">
                      HC-{String(selected.case_number).padStart(6, "0")} ·{" "}
                      {selected.category.replaceAll("_", " ")}
                    </p>
                    <h2 className="mt-1 font-display text-xl">{selected.subject}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selected.organization_name} · {selected.reporter_email} · opened{" "}
                      {formatDate(selected.created_at)}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-black uppercase">
                    {selected.status.replaceAll("_", " ")}
                  </span>
                </div>
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-5">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`max-w-3xl rounded-2xl border p-4 ${
                      message.is_internal
                        ? "border-warning/30 bg-warning/10"
                        : message.author_kind === "operator"
                          ? "ml-auto border-primary/20 bg-primary/5"
                          : "border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-black">
                        {message.is_internal ? "Internal note" : message.author_label}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                      {message.body}
                    </p>
                  </article>
                ))}
              </div>

              <form
                onSubmit={saveCase}
                className="grid gap-3 border-t border-border p-5 md:grid-cols-2"
              >
                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Status</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as SupportStatus)}
                    disabled={!canManage}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
                  >
                    {statuses.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="font-semibold">Priority</span>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value as SupportPriority)}
                    disabled={!canManage}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
                  >
                    {priorities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                {canManage && (
                  <>
                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="font-semibold">Response or note</span>
                      <textarea
                        minLength={2}
                        maxLength={4000}
                        rows={5}
                        value={response}
                        onChange={(event) => setResponse(event.target.value)}
                        className="w-full rounded-lg border border-border bg-background p-3"
                        placeholder={
                          internal
                            ? "Private note for Haccora operators"
                            : "Response visible to the customer"
                        }
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm md:col-span-2">
                      <input
                        type="checkbox"
                        checked={internal}
                        onChange={(event) => setInternal(event.target.checked)}
                      />
                      Internal note — hidden from the customer
                    </label>
                    <button
                      disabled={busy || mfaLevel !== "aal2"}
                      className="btn-alert-solid min-h-11 text-sm md:col-span-2 md:w-fit"
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      Save governed update
                    </button>
                  </>
                )}
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof LifeBuoy;
}) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-2xl">{value}</p>
      </div>
    </div>
  );
}
