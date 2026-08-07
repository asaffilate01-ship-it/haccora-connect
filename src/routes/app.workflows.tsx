import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, GitBranch, Loader2, Plus, Rocket, Workflow } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/workflows")({ component: WorkflowsPage });

type Template = {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  active_version_id: string | null;
  updated_at: string;
};

type Run = {
  id: string;
  status: string;
  due_at: string | null;
  workflow_templates: { name: string } | null;
};

function WorkflowsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const tr = useCallback((_legacy: string, english: string) => english, []);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState(["", ""]);

  const load = useCallback(async () => {
    setLoading(true);
    const [templateResult, runResult] = await Promise.all([
      (supabase as any)
        .from("workflow_templates")
        .select("id,name,category,is_active,active_version_id,updated_at")
        .order("updated_at", { ascending: false }),
      (supabase as any)
        .from("workflow_runs")
        .select("id,status,due_at,workflow_templates(name)")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setTemplates((templateResult.data ?? []) as Template[]);
    setRuns((runResult.data ?? []) as Run[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createTemplate = async () => {
    const cleanSteps = steps.map((step) => step.trim()).filter(Boolean);
    if (!user?.organizationId || name.trim().length < 2 || cleanSteps.length === 0) return;
    setSaving(true);
    const client = supabase as any;
    const templateResult = await client
      .from("workflow_templates")
      .insert({
        organization_id: user.organizationId,
        location_id: user.locationId,
        name: name.trim(),
        category: "operations",
        recurrence: {},
      })
      .select("id")
      .single();
    if (templateResult.error) {
      setSaving(false);
      toast.error(templateResult.error.message);
      return;
    }
    const versionResult = await client
      .from("workflow_template_versions")
      .insert({
        organization_id: user.organizationId,
        template_id: templateResult.data.id,
        version: 1,
        status: "draft",
        change_summary: "Initial version",
      })
      .select("id")
      .single();
    if (versionResult.error) {
      setSaving(false);
      toast.error(versionResult.error.message);
      return;
    }
    const stepResult = await client.from("workflow_steps").insert(
      cleanSteps.map((title, position) => ({
        organization_id: user.organizationId,
        version_id: versionResult.data.id,
        position: position + 1,
        title,
        required: true,
        input_type: "confirmation",
      })),
    );
    setSaving(false);
    if (stepResult.error) toast.error(stepResult.error.message);
    else {
      setName("");
      setSteps(["", ""]);
      toast.success("Workflow draft saved.");
      void load();
    }
  };

  const publish = async (template: Template) => {
    const client = supabase as any;
    const { data: version, error } = await client
      .from("workflow_template_versions")
      .select("id")
      .eq("template_id", template.id)
      .eq("status", "draft")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !version) return toast.error(error?.message ?? "No draft found.");
    const now = new Date().toISOString();
    const approved = await client
      .from("workflow_template_versions")
      .update({ status: "approved", approved_by: user?.id, approved_at: now, published_at: now })
      .eq("id", version.id);
    if (!approved.error) {
      await client
        .from("workflow_templates")
        .update({ active_version_id: version.id, updated_at: now })
        .eq("id", template.id);
      toast.success("Workflow published.");
      void load();
    } else toast.error(approved.error.message);
  };

  const schedule = async (template: Template) => {
    if (!user?.organizationId || !template.active_version_id) return;
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await (supabase as any).from("workflow_runs").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      template_id: template.id,
      version_id: template.active_version_id,
      assigned_to: user.id,
      status: "scheduled",
      due_at: due,
      idempotency_key: `manual:${template.id}:${due.slice(0, 13)}`,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Run scheduled for tomorrow.");
      void load();
    }
  };

  const manager = user?.role === "owner" || user?.role === "manager";
  return (
    <div className="p-5 md:p-10 space-y-7">
      <div>
        <div className="eyebrow">{"Versioned procedures"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Workflow studio"}</h1>
        <p className="mt-1 text-muted-foreground">
          {"Approvable templates, required evidence steps and traceable runs."}
        </p>
      </div>

      {manager && (
        <section className="surface p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <GitBranch size={18} />
            </span>
            <div>
              <div className="font-display text-lg">{"Create a new draft"}</div>
              <div className="text-xs text-muted-foreground">
                {"Drafts stay inactive until published."}
              </div>
            </div>
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={"Workflow name"}
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <div className="grid gap-2 md:grid-cols-2">
            {steps.map((step, index) => (
              <input
                key={index}
                value={step}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((value, i) => (i === index ? event.target.value : value)),
                  )
                }
                placeholder={`${"Required step"} ${index + 1}`}
                className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSteps((current) => [...current, ""])}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold"
            >
              <Plus size={15} className="mr-1 inline" />
              {"Step"}
            </button>
            <button
              disabled={saving || name.trim().length < 2 || !steps.some((step) => step.trim())}
              onClick={() => void createTemplate()}
              className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="inline animate-spin" size={15} /> : "Save draft"}
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5 font-display text-xl">{"Templates"}</div>
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="inline animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {"No templates yet."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className="p-5 flex flex-col gap-3 sm:flex-row sm:items-center"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                    <Workflow size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="font-display text-lg">{template.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {template.active_version_id ? "Published" : "Draft"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {manager && !template.active_version_id && (
                      <button
                        onClick={() => void publish(template)}
                        className="min-h-10 rounded-xl border border-border px-3 text-xs font-bold"
                      >
                        <Rocket size={13} className="mr-1 inline" />
                        {"Publish"}
                      </button>
                    )}
                    {template.active_version_id && (
                      <button
                        onClick={() => void schedule(template)}
                        className="min-h-10 rounded-xl bg-foreground px-3 text-xs font-bold text-background"
                      >
                        {"Schedule"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5 font-display text-xl">{"Recent runs"}</div>
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li key={run.id} className="p-4 flex gap-3">
                <CheckCircle2
                  size={17}
                  className={run.status === "completed" ? "text-success" : "text-muted-foreground"}
                />
                <div>
                  <div className="text-sm font-bold">
                    {run.workflow_templates?.name ?? "Workflow"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.status.replace("_", " ")}
                    {run.due_at ? ` · ${new Date(run.due_at).toLocaleDateString("en-GB")}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
