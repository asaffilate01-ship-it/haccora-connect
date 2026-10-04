import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const kinds = [
  ["compliance_question", "Compliance question"],
  ["inspection_readiness", "Inspection readiness"],
  ["allergen_review", "Allergen review"],
  ["corrective_action_review", "Corrective action review"],
  ["haccp_review", "HACCP review"],
  ["regulatory_question", "Regulatory question"],
] as const;

function answerText(payload: RunPayload | null) {
  const value = payload?.run?.result;
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const result = value as Record<string, unknown>;
    for (const key of ["answer", "summary", "text", "final"]) {
      if (typeof result[key] === "string") return result[key] as string;
    }
    if (Object.keys(result).length) return JSON.stringify(result, null, 2);
  }

  const final = [...(payload?.steps ?? [])].reverse().find((step) => step.step_type === "final");
  if (typeof final?.response === "string") return final.response;
  if (final?.response && typeof final.response === "object") {
    const response = final.response as Record<string, unknown>;
    if (typeof response.text === "string") return response.text;
    if (typeof response.answer === "string") return response.answer;
  }
  return "";
}

function AiEvidenceAssistant() {
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [kind, setKind] = useState<(typeof kinds)[number][0]>("compliance_question");
  const [question, setQuestion] = useState("");
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<RunPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setError("");
    const result = await supabase.functions.invoke("omniqora-platform", {
      body: { action: "status" },
    });
    if (result.error) {
      setBridge({ connected: false, countryCode: "GB", entitlements: {} });
      setError("Omniqora status is unavailable.");
      return;
    }
    setBridge(result.data as BridgeStatus);
  }, []);

  const readRun = useCallback(async (id: string) => {
    if (!id) return;
    const result = await supabase.functions.invoke("omniqora-platform", {
      body: { action: "ai_status", runId: id },
    });
    if (result.error) {
      setError("The AI run could not be refreshed.");
      return;
    }
    setRun(result.data as RunPayload);
  }, []);

  async function start() {
    if (question.trim().length < 10 || busy) return;
    setBusy(true);
    setError("");
    setRun(null);
    try {
      const result = await supabase.functions.invoke("omniqora-platform", {
        body: { action: "ai_start", kind, question: question.trim() },
      });
      if (result.error) throw result.error;
      const id = String((result.data as { runId?: unknown } | null)?.runId ?? "");
      if (!id) throw new Error("No run id");
      const status = String((result.data as { status?: unknown } | null)?.status ?? "queued");
      setRunId(id);
      setRun({ run: { id, status }, reviewRequired: true });
    } catch {
      setError(
        "The AI request was not started. Check the Haccora AI entitlement and Omniqora provider configuration.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runStatus = run?.run?.status ?? "";
  useEffect(() => {
    if (!runId || !["queued", "running"].includes(runStatus)) return;
    const timer = window.setInterval(() => void readRun(runId), 3500);
    return () => window.clearInterval(timer);
  }, [readRun, runId, runStatus]);

  const enabled = (key: string) => bridge?.entitlements?.[key]?.enabled === true;
  const sources = useMemo(
    () => Array.from(new Set((run?.steps ?? []).flatMap((step) => step.source_refs ?? []))),
    [run],
  );
  const answer = answerText(run);

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

      <section className="grid gap-3 md:grid-cols-4">
        <StatusCard
          icon={<BrainCircuit size={16} />}
          label="AI Copilot"
          active={enabled("haccora.ai-copilot")}
        />
        <StatusCard icon={<FileSearch2 size={16} />} label="RAG" active={enabled("haccora.rag")} />
        <StatusCard
          icon={<Network size={16} />}
          label="GraphRAG"
          active={enabled("haccora.graphrag")}
        />
        <StatusCard
          icon={<BookOpenCheck size={16} />}
          label="Regulatory intelligence"
          active={enabled("haccora.regulatory-intelligence")}
        />
      </section>

      {!bridge?.connected && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm flex gap-2">
          <AlertTriangle size={17} className="shrink-0" />
          This workspace is not currently connected to Omniqora. Core Haccora remains available, but
          central AI is fail-closed.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {error}
        </div>
      )}

      <section className="surface p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-lg">Ask from your evidence</h2>
            <p className="text-xs text-muted-foreground">
              Only a scoped evidence summary is sent by default; raw Haccora tables are not copied
              into the prompt.
            </p>
          </div>
          <span className="text-xs rounded-full border border-border px-3 py-1">
            {bridge?.mode === "dishbee-addon" ? "Dishbee add-on" : "Standalone Haccora"} · UK
          </span>
        </div>

        <label className="block text-sm font-semibold">
          Review type
          <select
            className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2"
            value={kind}
            onChange={(event) => setKind(event.target.value as (typeof kinds)[number][0])}
          >
            {kinds.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold">
          Question
          <textarea
            className="mt-1 min-h-32 w-full rounded-lg border border-border bg-background p-3 font-normal"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="For example: What evidence gaps should I review before an inspection, based on the records currently available?"
          />
        </label>

        <button
          className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
          disabled={
            busy ||
            !bridge?.connected ||
            !enabled("haccora.ai-copilot") ||
            question.trim().length < 10
          }
          onClick={() => void start()}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Start
          governed review
        </button>
      </section>

      {runId && (
        <section className="surface p-5 space-y-4">
          <div className="flex justify-between gap-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Run {runId.slice(0, 8)}</div>
              <h2 className="text-lg">Status: {runStatus || "queued"}</h2>
            </div>
            <button className="btn-secondary px-3 py-2 text-sm" onClick={() => void readRun(runId)}>
              Refresh
            </button>
          </div>

          {answer && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <h3 className="font-semibold">Draft response</h3>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{answer}</div>
            </div>
          )}

          {sources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Evidence references</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {sources.map((source) => (
                  <span
                    key={source}
                    className="rounded-full border border-border px-2 py-1 text-xs"
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
              <div className="mt-2 space-y-2">
                {run!.proposals!.map((proposal) => (
                  <div key={proposal.id} className="rounded-lg border border-border p-3 text-sm">
                    <div className="flex justify-between">
                      <strong>{proposal.action_key}</strong>
                      <span className="text-xs uppercase">{proposal.status}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{proposal.rationale}</p>
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
  active: boolean;
}) {
  return (
    <article className="surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-bold">{active ? "Enabled" : "Not enabled"}</div>
    </article>
  );
}
