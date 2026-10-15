import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";

export const Route = createFileRoute("/app/safe-methods")({ component: SafeMethods });

type Method = {
  id: string;
  title: string;
  category: string;
  summary: string;
  prompts: string[];
  official_source_url: string;
  version: string;
};
type Profile = {
  jurisdiction: string;
  business_type: string;
  serves_ppds: boolean;
  serves_vulnerable_groups: boolean;
};
type Adoption = {
  template_id: string;
  status: string;
  review_due_at: string | null;
  controls: {
    answers?: Record<string, string>;
    templateVersion?: string;
    jurisdiction?: string;
    reviewedAt?: string;
  } | null;
};
const priority = (method: Method, profile: Profile | null) => {
  if (!profile) return 0;
  if (method.category === "allergens" && profile.serves_ppds) return 4;
  if (method.category === "cross_contamination" && profile.serves_vulnerable_groups) return 3;
  if (["chilling", "cooking", "cleaning"].includes(method.category)) return 2;
  return 1;
};
function SafeMethods() {
  const { user } = useAuth();
  const canManage = user?.role === "owner" || user?.role === "manager";
  const [methods, setMethods] = useState<Method[]>([]);
  const [adopted, setAdopted] = useState<Adoption[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [acknowledged, setAcknowledged] = useState(false);

  const load = useCallback(async () => {
    if (!user?.organizationId || !user.locationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [templates, adoptions, site] = await Promise.all([
      supabase.from("safe_method_templates").select("*").order("title"),
      supabase
        .from("site_safe_methods")
        .select("template_id,status,review_due_at,controls")
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId),
      supabase
        .from("site_compliance_profiles")
        .select("jurisdiction,business_type,serves_ppds,serves_vulnerable_groups")
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .maybeSingle(),
    ]);
    setLoading(false);
    if (templates.error || adoptions.error || site.error) {
      setError("Could not load this premises' controlled methods. Refresh before reviewing.");
      return;
    }
    setError("");
    setMethods(
      ((templates.data ?? []) as Method[]).filter((method) => Array.isArray(method.prompts)),
    );
    setAdopted((adoptions.data ?? []) as unknown as Adoption[]);
    setProfile(site.data as Profile | null);
  }, [user?.organizationId, user?.locationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ordered = useMemo(
    () =>
      [...methods].sort(
        (a, b) => priority(b, profile) - priority(a, profile) || a.title.localeCompare(b.title),
      ),
    [methods, profile],
  );
  const selected = ordered.find((method) => method.id === selectedId) ?? null;
  const adoptedFor = (id: string) => adopted.find((entry) => entry.template_id === id);

  const needsReview = (method: Method) => {
    const current = adoptedFor(method.id);
    if (!current || current.status !== "active") return true;
    if (current.controls?.templateVersion !== method.version) return true;
    if (current.controls?.jurisdiction !== profile?.jurisdiction) return true;
    if (!current.controls?.reviewedAt) return true;
    if (method.prompts.some((_, index) => !current.controls?.answers?.[String(index)]?.trim())) {
      return true;
    }
    return Boolean(current.review_due_at && current.review_due_at < new Date().toISOString().slice(0, 10));
  };

  const open = (method: Method) => {
    const current = adoptedFor(method.id);
    setSelectedId(method.id);
    setAnswers(current?.controls?.answers ?? {});
    setAcknowledged(false);
    setError("");
    setMessage("");
  };

  const save = async () => {
    if (!canManage || !selected || !profile || !user?.organizationId || !user.locationId) return;
    const complete = selected.prompts.every((_, index) => (answers[String(index)] ?? "").trim().length >= 12);
    if (!complete || !acknowledged) {
      setError("Explain each control in at least 12 characters and confirm the management review.");
      return;
    }
    setSaving(true);
    setError("");
    const reviewedAt = new Date();
    const nextReview = new Date(reviewedAt);
    nextReview.setMonth(nextReview.getMonth() + 6);
    const { error: writeError } = await supabase.from("site_safe_methods").upsert(
      {
        organization_id: user.organizationId,
        location_id: user.locationId,
        template_id: selected.id,
        status: "active",
        adopted_by: user.id,
        adopted_at: reviewedAt.toISOString(),
        review_due_at: [
          nextReview.getFullYear(),
          String(nextReview.getMonth() + 1).padStart(2, "0"),
          String(nextReview.getDate()).padStart(2, "0"),
        ].join("-"),
        controls: {
          answers: Object.fromEntries(
            selected.prompts.map((_, index) => [String(index), answers[String(index)].trim()]),
          ),
          templateVersion: selected.version,
          jurisdiction: profile.jurisdiction,
          businessType: profile.business_type,
          reviewedAt: reviewedAt.toISOString(),
          reviewedBy: user.id,
          managementConfirmed: true,
        },
      },
      { onConflict: "organization_id,location_id,template_id" },
    );
    setSaving(false);
    if (writeError) {
      setError("The review could not be saved. Nothing has been confirmed: " + writeError.message);
      return;
    }
    setMessage("Premises-specific safe method recorded. Review it after material changes.");
    setSelectedId(null);
    setAcknowledged(false);
    void load();
  };

  const verifiedCount = ordered.filter((method) => !needsReview(method)).length;
  return (
    <main className="p-5 md:p-8 max-w-6xl space-y-5">
      <header>
        <div className="eyebrow">GUIDED UK FOOD SAFETY METHODS</div>
        <h1 className="mt-1">Document your actual controls</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Answer the method prompts for this premises. A manager must confirm the real procedure
          before it is marked adopted. These are internal records, not regulator approval.
        </p>
      </header>
      {error && <div role="alert" className="surface border border-destructive/40 p-3 text-sm">{error}</div>}
      {message && <div role="status" className="surface p-3 text-sm">{message}</div>}
      {!profile && !loading && (
        <div className="surface border border-warning/40 p-4 text-sm">
          Complete your UK jurisdiction and business profile first.{" "}
          <Link to="/app/uk-compliance" className="underline font-semibold">Open compliance profile</Link>
        </div>
      )}
      {profile && (
        <section className="surface p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold">{profile.business_type.replaceAll("_", " ")} · {profile.jurisdiction.replaceAll("_", " ")}</div>
            <p className="text-xs text-muted-foreground">Prioritised for this premises; review cycles are internal planning reminders.</p>
          </div>
          <div className="text-sm font-semibold">{verifiedCount} of {methods.length} currently reviewed</div>
        </section>
      )}
      {loading ? (
        <div className="surface p-8 text-center"><Loader2 size={18} className="inline animate-spin" /> Loading methods…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ordered.map((method) => {
            const current = adoptedFor(method.id);
            const attention = needsReview(method);
            return (
              <article key={method.id} className="surface p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground font-bold">{method.category.replaceAll("_", " ")}</span>
                  {attention ? (
                    <span className="inline-flex gap-1 items-center text-xs text-warning-foreground"><AlertTriangle size={14} /> Needs review</span>
                  ) : (
                    <span className="inline-flex gap-1 items-center text-xs text-success"><CheckCircle2 size={14} /> Reviewed</span>
                  )}
                </div>
                <h2 className="font-bold text-lg">{method.title}</h2>
                <p className="text-sm text-muted-foreground flex-1">{method.summary}</p>
                <div className="text-xs text-muted-foreground">
                  Template {method.version} · {current?.review_due_at ? `Next review ${current.review_due_at}` : "Not adopted"}
                </div>
                <div className="flex items-center gap-3">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => open(method)}
                      disabled={!profile}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {current ? "Review method" : "Document method"}
                    </button>
                  )}
                  <a href={method.official_source_url} target="_blank" rel="noreferrer" className="underline text-xs">
                    Official guidance
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && canManage && (
        <section className="surface p-5 space-y-4 border border-primary/20" aria-labelledby="method-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="method-title" className="text-xl font-bold">{selected.title}</h2>
            <button type="button" className="text-sm underline" onClick={() => setSelectedId(null)}>Close</button>
          </div>
          <p className="text-sm text-muted-foreground">
            Describe what staff do, who is responsible and how failures are escalated. Use your
            actual procedures and the linked official guidance, not generic AI-generated text.
          </p>
          {selected.prompts.map((prompt, index) => (
            <label className="block text-sm font-semibold" key={index}>
              {prompt}
              <textarea
                className="input w-full min-h-24 mt-2 font-normal"
                value={answers[String(index)] ?? ""}
                onChange={(event) =>
                  setAnswers((previous) => ({ ...previous, [String(index)]: event.target.value }))
                }
                maxLength={2000}
                placeholder="Describe your actual on-site control and response when it fails"
              />
            </label>
          ))}
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>I am authorised to review this premises' procedures and have checked these answers against actual practice.</span>
          </label>
          <button
            type="button"
            className="btn-primary px-4 py-2 inline-flex items-center gap-2"
            onClick={() => void save()}
            disabled={saving || !acknowledged || !profile}
          >
            <ShieldCheck size={17} /> {saving ? "Saving…" : "Confirm site method"}
          </button>
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        A template version change, UK jurisdiction change, missing procedure or passed review date
        triggers another management review. Specialist validation and regulator requirements still apply.
      </p>
    </main>
  );
}
