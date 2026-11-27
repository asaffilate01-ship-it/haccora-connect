import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  FileSearch2,
  Loader2,
  Network,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { aiReviewPollDelay } from "@/lib/ai-review-poll-delay";
import {
  aiReviewPresets,
  readableReviewAnswer,
  reviewQuestionValid,
  type AiReviewKind,
} from "@/lib/ai-review-presets";

export const Route = createFileRoute("/app/ai-assistant")({
  component: AiEvidenceAssistant,
});

type BridgeStatus = {
  connected: boolean;
  countryCode: string;
  mode?: string;
  generatedAt?: string;
  entitlements: Record<string, { enabled?: boolean; status?: string }>;
};

type RunPayload = {
  run?: { id?: string; status?: string; result?: unknown };
  steps?: Array<{
    step_no: number;
    step_type: string;
    response?: unknown;
    source_refs?: string[];
    status: string;
  }>;
  proposals?: Array<{
    id: string;
    action_key: string;
    rationale: string;
    status: string;
  }>;
  reviewRequired?: boolean;
};

function answerText(payload: RunPayload | null) {
  const answer = readableReviewAnswer(payload?.run?.result);
  if (answer) return answer;
  const final = [...(payload?.steps ?? [])].reverse().find((step) => step.step_type === "final");
  return readableReviewAnswer(final?.response);
}

function AiEvidenceAssistant() {
  const { user } = useAuth();
  if (!user?.organizationId || !["owner", "manager", "chef"].includes(user.role)) {
    return (
      <p className="p-5 text-sm">
        An authorised owner, manager or chef workspace is required to start an AI evidence review.
      </p>
    );
  }
  const workspaceKey = `${user.id}:${user.organizationId}:${user.locationId}:${user.role}`;
  return <WorkspaceAssistant key={workspaceKey} />;
}

function WorkspaceAssistant() {
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [kind, setKind] = useState<AiReviewKind>("compliance_question");
  const [question, setQuestion] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submittedKind, setSubmittedKind] = useState<AiReviewKind | null>(null);
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<RunPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const starting = useRef(false);
  const statusRequest = useRef(0);
  const lifetime = useRef(0);
  const currentRunId = useRef("");
  const readingRun = useRef("");
  const failedReads = useRef(0);
  const runStatus = run?.run?.status ?? "";
  const activeRun = ["queued", "running"].includes(runStatus);
  const formLocked = busy || activeRun;

  const loadStatus = useCallback(async () => {
    const request = ++statusRequest.current;
    setStatusLoading(true);
    setError("");
    try {
      const result = await supabase.functions.invoke("omniqora-platform", {
        body: { action: "status" },
      });
      if (request !== statusRequest.current) return;
      if (result.error) throw result.error;
      const data = result.data as BridgeStatus | null;
      if (!data || data.countryCode !== "GB" || typeof data.connected !== "boolean") {
        throw new Error("Invalid workspace connection status");
      }
      setBridge(data);
    } catch {
      if (request !== statusRequest.current) return;
      setBridge(null);
      setError("Omniqora status is unavailable. Check the connection before starting a review.");
    } finally {
      if (request === statusRequest.current) setStatusLoading(false);
    }
  }, []);

  const readRun = useCallback(async (id: string) => {
    if (!id || currentRunId.current !== id || readingRun.current === id) return;
    readingRun.current = id;
    try {
      const result = await supabase.functions.invoke("omniqora-platform", {
        body: { action: "ai_status", runId: id },
      });
      if (currentRunId.current !== id) return;
      if (result.error) throw result.error;
      const payload = result.data as RunPayload | null;
      if (
        !payload?.run?.status ||
        typeof payload.run.status !== "string" ||
        (payload.run.id && payload.run.id !== id) ||
        (payload.steps !== undefined && !Array.isArray(payload.steps)) ||
        (payload.proposals !== undefined && !Array.isArray(payload.proposals))
      ) {
        throw new Error("Invalid run status");
      }
      failedReads.current = 0;
      setRun({
        ...payload,
        steps: payload.steps?.filter(
          (step) => step && Number.isFinite(step.step_no) && typeof step.step_type === "string",
        ),
        proposals: payload.proposals?.filter(
          (item) =>
            item &&
            typeof item.id === "string" &&
            typeof item.action_key === "string" &&
            typeof item.rationale === "string" &&
            typeof item.status === "string",
        ),
      });
      setRefreshError("");
    } catch {
      if (currentRunId.current === id) {
        failedReads.current = Math.min(5, failedReads.current + 1);
        setRefreshError(
          "Review status could not be refreshed. Automatic retries slow down after errors.",
        );
      }
    } finally {
      if (readingRun.current === id) readingRun.current = "";
    }
  }, []);

  async function start() {
    if (
      !confirmed ||
      question.trim().length < 10 ||
      question.trim().length > 3000 ||
      starting.current ||
      statusLoading ||
      activeRun ||
      !bridge?.connected ||
      bridge.entitlements?.["haccora.ai-copilot"]?.enabled !== true
    ) {
      return;
    }
    starting.current = true;
    setConfirmed(false);
    setSubmittedKind(kind);
    const scope = lifetime.current;
    setBusy(true);
    setError("");
    setRefreshError("");
    currentRunId.current = "";
    failedReads.current = 0;
    setRunId("");
    setRun(null);
    try {
      const result = await supabase.functions.invoke("omniqora-platform", {
        body: { action: "ai_start", kind, question: question.trim() },
      });
      if (scope !== lifetime.current) return;
      if (result.error) throw result.error;
      const id = String((result.data as { runId?: unknown } | null)?.runId ?? "");
      if (!id) throw new Error("No run id");
      const status = String((result.data as { status?: unknown } | null)?.status ?? "queued");
      currentRunId.current = id;
      setRunId(id);
      setRun({ run: { id, status }, reviewRequired: true });
      void readRun(id);
    } catch {
      if (scope !== lifetime.current) return;
      setError("The AI request could not be confirmed. Check the connection before trying again.");
    } finally {
      if (scope === lifetime.current) {
        starting.current = false;
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    void loadStatus();
    return () => {
      lifetime.current += 1;
      statusRequest.current += 1;
      currentRunId.current = "";
      readingRun.current = "";
    };
  }, [loadStatus]);

  useEffect(() => {
    if (!runId || !["queued", "running"].includes(runStatus)) return;
    let disposed = false;
    let polling = false;
    let timer: number | undefined;
    const canPoll = () => !disposed && document.visibilityState === "visible" && navigator.onLine;
    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };
    const schedule = () => {
      clearTimer();
      if (canPoll()) {
        timer = window.setTimeout(() => void poll(), aiReviewPollDelay(failedReads.current));
      }
    };
    async function poll() {
      if (!canPoll() || polling) return;
      polling = true;
      try {
        await readRun(runId);
      } finally {
        polling = false;
        schedule();
      }
    }
    const refreshVisible = () => {
      clearTimer();
      if (canPoll()) void poll();
    };
    schedule();
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    window.addEventListener("offline", refreshVisible);
    return () => {
      disposed = true;
      clearTimer();
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      window.removeEventListener("offline", refreshVisible);
    };
  }, [readRun, runId, runStatus]);

  const enabled = (key: string) => bridge?.entitlements?.[key]?.enabled === true;
  const entitlementStatus = (key: string) =>
    statusLoading || !bridge ? null : bridge.connected && enabled(key);
  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          (run?.steps ?? []).flatMap((step) =>
            Array.isArray(step.source_refs)
              ? step.source_refs.filter((ref) => typeof ref === "string")
              : [],
          ),
        ),
      ),
    [run],
  );
  const answer = answerText(run);
  const steps = useMemo(
    () => [...(run?.steps ?? [])].sort((a, b) => a.step_no - b.step_no),
    [run],
  );
  const selectedPreset = aiReviewPresets.find((preset) => preset.kind === kind);

  return (
    <div className="p-5 md:p-8 max-w-6xl space-y-5">
      <header>
        <div className="eyebrow">HACCORA × OMNIQORA</div>
        <h1 className="mt-1">AI evidence assistant</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Evidence-grounded help using your Haccora workspace and enabled Omniqora services. Outputs
          are drafts for competent human review; they do not certify compliance or issue a hygiene
          rating.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard
          icon={<BrainCircuit size={16} />}
          label="AI Copilot"
          active={entitlementStatus("haccora.ai-copilot")}
        />
        <StatusCard
          icon={<FileSearch2 size={16} />}
          label="RAG"
          active={entitlementStatus("haccora.rag")}
        />
        <StatusCard
          icon={<Network size={16} />}
          label="GraphRAG"
          active={entitlementStatus("haccora.graphrag")}
        />
        <StatusCard
          icon={<BookOpenCheck size={16} />}
          label="Regulatory intelligence"
          active={entitlementStatus("haccora.regulatory-intelligence")}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-sm text-muted-foreground">
          {statusLoading
            ? "Checking workspace connection…"
            : bridge?.connected
              ? "Omniqora connection verified"
              : "Omniqora connection unverified"}
        </p>
        <button
          type="button"
          className="btn-secondary px-3 py-2 text-sm"
          disabled={statusLoading || busy}
          onClick={() => void loadStatus()}
        >
          Check connection
        </button>
      </div>

      {!statusLoading && !bridge?.connected && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm flex gap-2">
          <AlertTriangle size={17} className="shrink-0" />
          This workspace is not currently connected to Omniqora. Core Haccora remains available, but
          central AI is fail-closed.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          {error}
        </div>
      )}

      <section className="surface p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-lg">Ask from your evidence</h2>
            <p className="text-xs text-muted-foreground">
              Your question and an organisation-scoped evidence summary are sent to the configured
              Omniqora runtime. The summary may cover more than the selected site.
            </p>
          </div>
          <span className="text-xs rounded-full border border-border px-3 py-1">
            {bridge?.mode === "dishbee-addon" ? "Dishbee add-on" : "Standalone Haccora"} · UK
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Choose a review type</h3>
          <p className="text-xs text-muted-foreground">
            Selecting an example replaces your draft question. It does not start a review.
          </p>
          <div
            role="group"
            aria-label="Review type"
            className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            {aiReviewPresets.map((preset) => (
              <button
                key={preset.kind}
                type="button"
                aria-pressed={kind === preset.kind}
                disabled={formLocked}
                onClick={() => {
                  setKind(preset.kind);
                  setQuestion(preset.prompt);
                  setConfirmed(false);
                }}
                className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                  kind === preset.kind
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm font-semibold">
          Question
          <textarea
            className="mt-1 min-h-32 w-full rounded-lg border border-border bg-background p-3 font-normal"
            value={question}
            maxLength={3000}
            disabled={formLocked}
            onChange={(event) => {
              setQuestion(event.target.value);
              setConfirmed(false);
            }}
            placeholder={selectedPreset?.prompt}
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {question.length} / 3000 characters
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={formLocked}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 shrink-0"
          />
          <span>
            I have reviewed this question and agree to send it with the organisation evidence
            summary. Do not include personal, health or other unnecessary sensitive information.
          </span>
        </label>
        <button
          type="button"
          className="btn-primary min-h-11 w-full sm:w-auto px-4 py-2 text-sm inline-flex items-center justify-center gap-2"
          disabled={
            busy ||
            !confirmed ||
            statusLoading ||
            activeRun ||
            !bridge?.connected ||
            !enabled("haccora.ai-copilot") ||
            !reviewQuestionValid(question)
          }
          onClick={() => void start()}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {activeRun ? "Review in progress" : "Start governed review"}
        </button>
      </section>

      {runId && (
        <section className="surface min-w-0 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs uppercase text-muted-foreground">Run {runId.slice(0, 8)}</div>
              <p className="text-sm font-semibold">
                {aiReviewPresets.find((preset) => preset.kind === submittedKind)?.label ?? "Review"}
              </p>
              <h2 className="text-lg" role="status">
                Status: {runStatus || "queued"}
              </h2>
            </div>
            <button className="btn-secondary px-3 py-2 text-sm" onClick={() => void readRun(runId)}>
              Refresh
            </button>
          </div>

          {refreshError && (
            <p role="alert" className="text-sm text-muted-foreground">
              {refreshError}
            </p>
          )}

          {answer && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="font-semibold">Draft response</h3>
              <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {answer}
              </div>
            </div>
          )}

          {runStatus === "completed" && !answer && (
            <p role="status" className="text-sm text-muted-foreground">
              No readable draft response was returned. Verify the evidence before taking action.
            </p>
          )}

          {steps.length > 0 && (
            <details className="rounded-xl border border-border p-3">
              <summary className="cursor-pointer font-semibold text-sm">
                Reported review activity ({steps.length})
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Provider-reported step metadata, not a guarantee that any recommendation is correct.
              </p>
              <ol className="mt-3 space-y-2">
                {steps.map((step, index) => (
                  <li
                    key={`${step.step_no}:${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="break-words">
                      {step.step_no}. {step.step_type.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {typeof step.status === "string" ? step.status : "Unknown"}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {sources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Evidence references</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {sources.map((source) => (
                  <span
                    key={source}
                    className="max-w-full break-all rounded-lg border border-border px-2 py-1 text-xs"
                  >
                    {source}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(run?.proposals?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Proposed actions — approval required</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                This interface does not approve or execute proposed actions.
              </p>
              <div className="mt-2 space-y-2">
                {run!.proposals!.map((proposal) => (
                  <div key={proposal.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong className="break-all">{proposal.action_key}</strong>
                      <span className="text-xs uppercase">{proposal.status}</span>
                    </div>
                    <p className="mt-1 break-words text-muted-foreground">{proposal.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {runStatus === "completed" && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={14} />
              Completed by the governed Omniqora runtime. Review the evidence and any proposed
              action before changing an approved compliance control.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function StatusCard({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean | null;
}) {
  return (
    <article className="surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-bold">
        {active === null ? "Unverified" : active ? "Enabled" : "Not enabled"}
      </div>
    </article>
  );
}
