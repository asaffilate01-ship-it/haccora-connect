import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, GitBranch, Loader2, Plus, Rocket, Workflow } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/app/workflows")({ component: WorkflowsPage });

type Template = {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  active_version_id: string | null;
  location_id: string | null;
  updated_at: string;
};

function ukDueDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Europe/London" });
}

type Run = {
  id: string;
  status: string;
  due_at: string | null;
  workflow_templates: { name: string } | null;
};

function WorkflowsPage() {
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId) {
    return <p className="p-5 text-sm">Select a location to manage workflows.</p>;
  }
  return (
    <WorkflowStudio
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`}
      organizationId={user.organizationId}
      locationId={user.locationId}
      userId={user.id}
      manager={user.role === "owner" || user.role === "manager"}
      canSchedule={user.role !== "inspector"}
    />
  );
}

function WorkflowStudio({
  organizationId,
  locationId,
  userId,
  manager,
  canSchedule,
}: {
  organizationId: string;
  locationId: string;
  userId: string;
  manager: boolean;
  canSchedule: boolean;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [publishedVersions, setPublishedVersions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState(["", ""]);
  const requestId = useRef(0);
  const writeLock = useRef(false);
  const mounted = useRef(false);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      const [templateResult, runResult] = await Promise.all([
        supabase
          .from("workflow_templates")
          .select("id,name,category,is_active,active_version_id,updated_at,location_id", {
            count: "exact",
          })
          .eq("organization_id", organizationId)
          .or(`location_id.eq.${locationId},location_id.is.null`)
          .order("updated_at", { ascending: false })
          .order("id")
          .limit(100),
        supabase
          .from("workflow_runs")
          .select("id,status,due_at,workflow_templates(name)")
          .eq("organization_id", organizationId)
          .eq("location_id", locationId)
          .order("created_at", { ascending: false })
          .order("id")
          .limit(12),
      ]);
      if (request !== requestId.current) return;
      if (
        templateResult.error ||
        !templateResult.data ||
        templateResult.count === null ||
        runResult.error ||
        !runResult.data
      ) {
        throw new Error("Workflow evidence unavailable");
      }
      const activeIds = templateResult.data.flatMap((template) =>
        template.active_version_id ? [template.active_version_id] : [],
      );
      const confirmed: Record<string, string> = {};
      if (activeIds.length) {
        const versions = await supabase
          .from("workflow_template_versions")
          .select("id,template_id,published_at")
          .eq("organization_id", organizationId)
          .eq("status", "approved")
          .in("id", activeIds);
        if (request !== requestId.current) return;
        if (versions.error || !versions.data) throw new Error("Publication evidence unavailable");
        for (const version of versions.data) {
          if (version.published_at) confirmed[version.template_id] = version.id;
        }
      }
      setPublishedVersions(confirmed);
      setTemplates(templateResult.data);
      setRuns(runResult.data as unknown as Run[]);
      setTotal(templateResult.count);
    } catch {
      if (request !== requestId.current) return;
      setTemplates([]);
      setRuns([]);
      setTotal(0);
      setPublishedVersions({});
      setLoadError("Workflow records could not be loaded. Refresh before making changes.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [organizationId, locationId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [load]);

  async function write(task: () => Promise<void>) {
    if (loading || loadError || writeLock.current || !mounted.current) return;
    writeLock.current = true;
    setSaving(true);
    try {
      await task();
    } catch {
      toast.error("The workflow change could not be confirmed. Review the refreshed records.");
    } finally {
      if (mounted.current) {
        await load();
        setSaving(false);
      }
      writeLock.current = false;
    }
  }

  function ensureCurrent() {
    if (!mounted.current) throw new Error("Workspace changed");
  }

  const cleanSteps = steps.map((step) => step.trim()).filter(Boolean);
  const validDraft =
    name.trim().length >= 2 &&
    name.trim().length <= 160 &&
    cleanSteps.length > 0 &&
    cleanSteps.length <= 50 &&
    cleanSteps.every((step) => step.length >= 2 && step.length <= 240);

  const createTemplate = async () => {
    if (!manager || !validDraft) return;
    await write(async () => {
      const templateResult = await supabase
        .from("workflow_templates")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          name: name.trim(),
          category: "operations",
          recurrence: {},
        })
        .select("id")
        .single();
      if (templateResult.error || !templateResult.data) {
        throw new Error("Template not confirmed");
      }
      ensureCurrent();
      const versionResult = await supabase
        .from("workflow_template_versions")
        .insert({
          organization_id: organizationId,
          template_id: templateResult.data.id,
          version: 1,
          status: "draft",
          change_summary: "Initial version",
        })
        .select("id")
        .single();
      if (versionResult.error || !versionResult.data) {
        toast.error("Template saved, but its draft version was not confirmed. Do not publish.");
        return;
      }
      ensureCurrent();
      const versionId = versionResult.data.id;
      const stepResult = await supabase
        .from("workflow_steps")
        .insert(
          cleanSteps.map((title, position) => ({
            organization_id: organizationId,
            version_id: versionId,
            position: position + 1,
            title,
            required: true,
            input_type: "confirmation",
          })),
        )
        .select("id");
      if (stepResult.error || stepResult.data?.length !== cleanSteps.length) {
        toast.error("Draft created, but its required steps were not confirmed. Do not publish.");
        return;
      }
      ensureCurrent();
      setName("");
      setSteps(["", ""]);
      toast.success("Workflow draft saved.");
    });
  };

  const isPublished = (template: Template) =>
    !!template.active_version_id && publishedVersions[template.id] === template.active_version_id;

  const publish = async (template: Template) => {
    if (!manager || !template.is_active || isPublished(template)) return;
    await write(async () => {
      const current = await supabase
        .from("workflow_templates")
        .select("active_version_id,is_active")
        .eq("id", template.id)
        .eq("organization_id", organizationId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .single();
      if (
        current.error ||
        !current.data?.is_active ||
        current.data.active_version_id !== template.active_version_id
      ) {
        toast.error("Workflow changed. Refresh before publishing.");
        return;
      }
      let query = supabase
        .from("workflow_template_versions")
        .select("id,status,published_at")
        .eq("organization_id", organizationId)
        .eq("template_id", template.id);
      query = template.active_version_id
        ? query.eq("id", template.active_version_id).eq("status", "approved")
        : query.in("status", ["draft", "approved"]);
      const { data: version, error } = await query
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !version) {
        toast.error("No reviewable draft version could be retrieved.");
        return;
      }
      const required = await supabase
        .from("workflow_steps")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("version_id", version.id)
        .eq("required", true);
      if (required.error || !required.count) {
        toast.error("A draft must have confirmed required steps before publishing.");
        return;
      }
      ensureCurrent();
      const scope = template.location_id ? "this premises" : "the organisation";
      if (
        !window.confirm(
          `Publish ${template.name} for ${scope} with ${required.count} required steps?`,
        )
      ) {
        return;
      }
      const now = new Date().toISOString();
      if (version.status === "draft") {
        const approved = await supabase
          .from("workflow_template_versions")
          .update({ status: "approved", approved_by: userId, approved_at: now })
          .eq("id", version.id)
          .eq("organization_id", organizationId)
          .eq("template_id", template.id)
          .eq("status", "draft")
          .select("id")
          .single();
        if (approved.error || !approved.data) throw new Error("Approval not confirmed");
      }
      ensureCurrent();
      if (!template.active_version_id) {
        const activated = await supabase
          .from("workflow_templates")
          .update({ active_version_id: version.id, updated_at: now })
          .eq("id", template.id)
          .eq("organization_id", organizationId)
          .eq("is_active", true)
          .is("active_version_id", null)
          .select("id")
          .single();
        if (activated.error || !activated.data) {
          toast.error("Version approved, but activation was not confirmed. Refresh and retry.");
          return;
        }
      }
      ensureCurrent();
      if (!version.published_at) {
        const published = await supabase
          .from("workflow_template_versions")
          .update({ published_at: now })
          .eq("id", version.id)
          .eq("organization_id", organizationId)
          .eq("template_id", template.id)
          .eq("status", "approved")
          .is("published_at", null)
          .select("id")
          .single();
        if (published.error || !published.data) {
          toast.error("Activation saved, but publication confirmation is incomplete. Retry.");
          return;
        }
      }
      toast.success("Workflow published.");
    });
  };

  const schedule = async (template: Template) => {
    if (!canSchedule || !template.is_active || !isPublished(template)) return;
    await write(async () => {
      const { data: current, error } = await supabase
        .from("workflow_templates")
        .select("active_version_id,is_active")
        .eq("id", template.id)
        .eq("organization_id", organizationId)
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .single();
      if (
        error ||
        !current?.is_active ||
        !current.active_version_id ||
        current.active_version_id !== template.active_version_id
      ) {
        toast.error("The published workflow changed. Refresh before scheduling.");
        return;
      }
      const version = await supabase
        .from("workflow_template_versions")
        .select("id,published_at")
        .eq("organization_id", organizationId)
        .eq("template_id", template.id)
        .eq("id", current.active_version_id)
        .eq("status", "approved")
        .single();
      if (version.error || !version.data?.published_at) {
        toast.error("Publication evidence is incomplete. Scheduling is unavailable.");
        return;
      }
      const required = await supabase
        .from("workflow_steps")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("version_id", version.data.id)
        .eq("required", true);
      if (required.error || !required.count) {
        toast.error("Required steps could not be confirmed. Scheduling is unavailable.");
        return;
      }
      ensureCurrent();
      const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const key = `manual:${template.id}:${locationId}:${userId}:${due.slice(0, 13)}`;
      const saved = await supabase
        .from("workflow_runs")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          template_id: template.id,
          version_id: version.data.id,
          assigned_to: userId,
          status: "scheduled",
          due_at: due,
          idempotency_key: key,
        })
        .select("id")
        .single();
      if (saved.error || !saved.data) throw new Error("Schedule not confirmed");
      toast.success("Workflow run scheduled for 24 hours from now.");
    });
  };

  return (
    <div className="p-5 md:p-10 space-y-7">
      <div>
        <div className="eyebrow">{"Versioned procedures"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Workflow studio"}</h1>
        <p className="mt-1 text-muted-foreground">
          {"Approvable templates, required evidence steps and traceable runs."}
        </p>
      </div>

      {loadError && (
        <div role="alert" className="surface p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}
      <button
        type="button"
        disabled={loading || saving}
        className="btn-secondary px-4 py-2 text-sm"
        onClick={() => void load()}
      >
        Refresh workflow records
      </button>
      {manager && (
        <fieldset
          disabled={loading || saving || !!loadError}
          className="surface p-5 md:p-6 space-y-4 min-w-0"
        >
          <legend className="sr-only">Create workflow draft</legend>
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
            maxLength={160}
            aria-label="Workflow name"
            onChange={(event) => setName(event.target.value)}
            placeholder={"Workflow name"}
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
          />
          <div className="grid gap-2 md:grid-cols-2">
            {steps.map((step, index) => (
              <input
                key={index}
                value={step}
                maxLength={240}
                aria-label={`Required step ${index + 1}`}
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
              disabled={steps.length >= 50}
              onClick={() => setSteps((current) => [...current, ""])}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold"
            >
              <Plus size={15} className="mr-1 inline" />
              {"Step"}
            </button>
            <button
              disabled={!validDraft || saving || loading || !!loadError}
              onClick={() => void createTemplate()}
              className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <Loader2 className="inline animate-spin" size={15} /> : "Save draft"}
            </button>
          </div>
        </fieldset>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <section className="surface overflow-hidden">
          <div className="border-b border-border p-5 font-display text-xl">{"Templates"}</div>
          {loading ? (
            <div className="p-10 text-center">
              <Loader2 className="inline animate-spin" />
            </div>
          ) : loadError ? (
            <p className="p-5 text-sm text-muted-foreground">Template records unavailable.</p>
          ) : templates.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {"No templates yet."}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              <li className="p-3 text-xs text-muted-foreground">
                Showing {templates.length} of {total} visible templates.
              </li>
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
                      {template.is_active
                        ? template.active_version_id
                          ? isPublished(template)
                            ? "Published"
                            : "Publication incomplete"
                          : "Draft / awaiting activation"
                        : "Inactive"}
                      {template.location_id ? " · Selected site" : " · Shared organisation"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {manager && template.is_active && !isPublished(template) && (
                      <button
                        disabled={saving || loading || !!loadError}
                        onClick={() => void publish(template)}
                        className="min-h-10 rounded-xl border border-border px-3 text-xs font-bold"
                      >
                        <Rocket size={13} className="mr-1 inline" />
                        {template.active_version_id ? "Finish publication" : "Publish"}
                      </button>
                    )}
                    {canSchedule && template.is_active && isPublished(template) && (
                      <button
                        disabled={saving || loading || !!loadError}
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
          {loading ? (
            <p className="p-5 text-sm text-muted-foreground">Loading runs…</p>
          ) : loadError ? (
            <p className="p-5 text-sm text-muted-foreground">Run records unavailable.</p>
          ) : runs.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No recent runs for this site.</p>
          ) : null}
          <ul className="divide-y divide-border">
            {(!loading && !loadError ? runs : []).map((run) => (
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
                    {run.due_at ? ` · ${ukDueDate(run.due_at)}` : ""}
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
