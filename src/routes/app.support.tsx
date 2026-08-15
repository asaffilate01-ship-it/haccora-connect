import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  PlusCircle,
  Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/support")({
  head: () => ({
    meta: [
      { title: "Customer support — Haccora" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SupportPage,
});

type SupportStatus = "open" | "in_progress" | "pending_customer" | "resolved" | "closed";
type SupportPriority = "normal" | "high" | "urgent";
type SupportCategory =
  | "technical"
  | "billing"
  | "account"
  | "data_privacy"
  | "food_safety_workflow"
  | "feedback";

type SupportCase = {
  id: string;
  case_number: number;
  category: SupportCategory;
  subject: string;
  status: SupportStatus;
  priority: SupportPriority;
  reporter_email: string;
  created_at: string;
  updated_at: string;
};

type SupportMessage = {
  id: string;
  case_id: string;
  author_kind: "customer" | "operator";
  author_label: string;
  body: string;
  created_at: string;
};

const categories: Array<{ value: SupportCategory; label: string }> = [
  { value: "technical", label: "Technical problem" },
  { value: "account", label: "Account or access" },
  { value: "billing", label: "Billing or subscription" },
  { value: "data_privacy", label: "Data privacy request" },
  { value: "food_safety_workflow", label: "Food-safety workflow question" },
  { value: "feedback", label: "Feedback or feature request" },
];

const statusLabels: Record<SupportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  pending_customer: "Waiting for you",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SupportPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({
    category: "technical" as SupportCategory,
    priority: "normal" as SupportPriority,
    subject: "",
    message: "",
  });

  const loadCases = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    const { data, error: readError } = await supabase
      .from("support_cases")
      .select(
        "id,case_number,category,subject,status,priority,reporter_email,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (readError) setError(readError.message);
    else {
      const rows = (data ?? []) as SupportCase[];
      setCases(rows);
      setSelectedId((current) =>
        current && rows.some((supportCase) => supportCase.id === current)
          ? current
          : (rows[0]?.id ?? null),
      );
    }
    setLoading(false);
  }, [user?.organizationId]);

  const loadMessages = useCallback(async (caseId: string) => {
    const { data, error: readError } = await supabase
      .from("support_case_messages")
      .select("id,case_id,author_kind,author_label,body,created_at")
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
  const openCount = cases.filter(
    (supportCase) => !["resolved", "closed"].includes(supportCase.status),
  ).length;

  const createCase = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const { data, error: createError } = await supabase.rpc("create_support_case", {
      p_category: form.category,
      p_subject: form.subject.trim(),
      p_message: form.message.trim(),
      p_priority: form.priority,
    });
    setBusy(false);
    if (createError) {
      setError(createError.message);
      return;
    }
    setForm({ category: "technical", priority: "normal", subject: "", message: "" });
    setShowForm(false);
    setNotice("Your support case was created. Replies will appear in this secure thread.");
    await loadCases();
    if (typeof data === "string") setSelectedId(data);
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || reply.trim().length < 2) return;
    setBusy(true);
    setError("");
    const { error: replyError } = await supabase.rpc("support_add_case_message", {
      p_case_id: selected.id,
      p_message: reply.trim(),
    });
    setBusy(false);
    if (replyError) {
      setError(replyError.message);
      return;
    }
    setReply("");
    setNotice("Reply added to the case.");
    await Promise.all([loadCases(), loadMessages(selected.id)]);
  };

  return (
    <div className="space-y-6 p-5 md:p-9">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">Haccora customer care</div>
          <h1 className="mt-1 text-3xl md:text-4xl">Support centre</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Report a product, account, billing or data-privacy issue and keep the response history
            with your organisation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          className="btn-alert-solid min-h-11 text-sm"
        >
          <PlusCircle size={16} /> New support case
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open cases" value={openCount} icon={LifeBuoy} />
        <Metric
          label="Waiting for you"
          value={cases.filter((supportCase) => supportCase.status === "pending_customer").length}
          icon={Clock3}
        />
        <Metric
          label="Resolved"
          value={cases.filter((supportCase) => supportCase.status === "resolved").length}
          icon={CheckCircle2}
        />
      </section>

      <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
        <div className="flex items-start gap-2">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" />
          <p>
            This is product support, not an emergency or regulatory reporting channel. Continue to
            follow your food-safety incident procedure and contact the appropriate authority where
            required. Never include passwords or full payment-card details.
          </p>
        </div>
      </div>

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

      {showForm && (
        <form onSubmit={createCase} className="surface grid gap-4 p-5 md:grid-cols-2 md:p-6">
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Category</span>
            <select
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as SupportCategory,
                }))
              }
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Impact</span>
            <select
              value={form.priority}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  priority: event.target.value as SupportPriority,
                }))
              }
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
            >
              <option value="normal">Normal — question or minor issue</option>
              <option value="high">High — important workflow impaired</option>
              <option value="urgent">Urgent — service unusable</option>
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-semibold">Subject</span>
            <input
              required
              minLength={5}
              maxLength={160}
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3"
              placeholder="Short description of the issue"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-semibold">What happened?</span>
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={6}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              className="w-full rounded-lg border border-border bg-background p-3"
              placeholder="Include the screen, expected result and what you saw. Remove unnecessary personal data."
            />
            <span className="block text-right text-xs text-muted-foreground">
              {form.message.length}/4,000
            </span>
          </label>
          <div className="flex gap-3 md:col-span-2">
            <button disabled={busy} className="btn-alert-solid min-h-11 text-sm">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit securely
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 rounded-full border border-border px-5 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="grid min-h-[28rem] overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[22rem_1fr]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg">Your cases</h2>
            <p className="text-xs text-muted-foreground">Newest activity first</p>
          </div>
          {loading ? (
            <div className="grid min-h-40 place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : cases.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No support cases yet.</div>
          ) : (
            <div className="max-h-[36rem] overflow-y-auto">
              {cases.map((supportCase) => (
                <button
                  key={supportCase.id}
                  type="button"
                  onClick={() => setSelectedId(supportCase.id)}
                  className={`w-full border-b border-border p-4 text-left transition-colors ${
                    selectedId === supportCase.id ? "bg-primary/8" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-black text-primary">
                      HC-{String(supportCase.case_number).padStart(6, "0")}
                    </span>
                    <StatusPill status={supportCase.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold">{supportCase.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(supportCase.updated_at)} · {supportCase.priority}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          {!selected ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">
              Select a case to view its secure message thread.
            </div>
          ) : (
            <>
              <div className="border-b border-border p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={selected.status} />
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
                    {selected.priority}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-xl">{selected.subject}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Case HC-{String(selected.case_number).padStart(6, "0")} · opened{" "}
                  {formatDate(selected.created_at)}
                </p>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto bg-secondary/20 p-5">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`max-w-2xl rounded-2xl border p-4 ${
                      message.author_kind === "operator"
                        ? "border-primary/20 bg-primary/5"
                        : "ml-auto border-border bg-card"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-black">
                        {message.author_kind === "operator" ? "Haccora support" : "Your team"}
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
              {selected.status !== "closed" && (
                <form onSubmit={sendReply} className="border-t border-border p-4">
                  <label className="sr-only" htmlFor="support-reply">
                    Reply to support case
                  </label>
                  <div className="flex items-end gap-3">
                    <textarea
                      id="support-reply"
                      required
                      minLength={2}
                      maxLength={4000}
                      rows={3}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background p-3 text-sm"
                      placeholder="Add information or reply to Haccora support…"
                    />
                    <button
                      disabled={busy || reply.trim().length < 2}
                      className="btn-alert-solid min-h-11 shrink-0 text-sm"
                    >
                      <Send size={16} /> <span className="hidden sm:inline">Reply</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: SupportStatus }) {
  const done = status === "resolved" || status === "closed";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
        done ? "bg-success/10 text-success" : "bg-warning/15 text-warning-foreground"
      }`}
    >
      {statusLabels[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof MessageSquareText;
}) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-2xl">{value}</p>
      </div>
    </div>
  );
}
