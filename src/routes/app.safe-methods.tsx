import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { operationalDate } from "@/lib/operational-day";
import {
  safeMethodNextReview,
  safeMethodReviewCurrent,
  type ReviewControls,
} from "@/lib/safe-method-review";

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
  controls: ReviewControls | null;
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
  if (!user?.organizationId || !user.locationId) {
    return <p className="p-5 text-sm">Select a location to review its food-safety methods.</p>;
  }
  return (
    <SiteSafeMethods key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`} />
  );
}

function SiteSafeMethods() {
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
  const [loadError, setLoadError] = useState("");
  const [today, setToday] = useState(() => operationalDate(new Date(), "Europe/London"));
  const requestId = useRef(0);
  const writeLock = useRef(false);
  const mounted = useRef(false);

  const load = useCallback(async () => {
    if (!user?.organizationId || !user.locationId) return null;
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    try {
      const [templates, adoptions, site] = await Promise.all([
        supabase
          .from("safe_method_templates")
          .select("id,title,category,summary,prompts,official_source_url,version", {
            count: "exact",
          })
          .order("title")
          .order("id"),
        supabase
          .from("site_safe_methods")
          .select("template_id,status,review_due_at,controls", { count: "exact" })
          .eq("organization_id", user.organizationId)
          .eq("location_id", user.locationId),
        supabase
          .from("site_compliance_profiles")
          .select("jurisdiction,business_type,serves_ppds,serves_vulnerable_groups")
          .eq("organization_id", user.organizationId)
          .eq("location_id", user.locationId)
          .maybeSingle(),
      ]);
      if (!mounted.current || request !== requestId.current) return null;
      if (
        templates.error ||
        !templates.data ||
        templates.count !== templates.data.length ||
        adoptions.error ||
        !adoptions.data ||
        adoptions.count !== adoptions.data.length ||
        site.error
      ) {
        throw new Error("Incomplete review evidence");
      }
      if (
        templates.data.some(
          (method) =>
            !Array.isArray(method.prompts) ||
            !method.prompts.length ||
            method.prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim()),
        )
      ) {
        throw new Error("Invalid method prompts");
      }
      const snapshot = {
        methods: templates.data as Method[],
        adopted: adoptions.data as unknown as Adoption[],
        profile: site.data as Profile | null,
      };
      setMethods(snapshot.methods);
      setAdopted(snapshot.adopted);
      setProfile(snapshot.profile);
      setToday(operationalDate(new Date(), "Europe/London"));
      return snapshot;
    } catch {
      if (mounted.current && request === requestId.current) {
        setMethods([]);
        setAdopted([]);
        setProfile(null);
        setLoadError("Review evidence is unavailable. Refresh before confirming a method.");
      }
      return null;
    } finally {
      if (mounted.current && request === requestId.current) setLoading(false);
    }
  }, [user?.organizationId, user?.locationId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const updateDay = () => setToday(operationalDate(new Date(), "Europe/London"));
    const timer = window.setInterval(updateDay, 60_000);
    window.addEventListener("focus", updateDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateDay);
    };
  }, []);

  const ordered = useMemo(
    () =>
      [...methods].sort(
        (a, b) => priority(b, profile) - priority(a, profile) || a.title.localeCompare(b.title),
      ),
    [methods, profile],
  );
  const selected = ordered.find((method) => method.id === selectedId) ?? null;
  const adoptedFor = (id: string) => adopted.find((entry) => entry.template_id === id);

  const available = !loading && !loadError && profile !== null;
  const needsReview = (method: Method) =>
    !safeMethodReviewCurrent(method, profile, adoptedFor(method.id), today);

  const open = (method: Method) => {
    if (!available || saving || !canManage) return;
    const current = adoptedFor(method.id);
    setSelectedId(method.id);
    const recorded = current?.controls?.answers;
    setAnswers(
      Object.fromEntries(
        method.prompts.map((_, index) => {
          const answer = recorded?.[String(index)];
          return [String(index), typeof answer === "string" ? answer : ""];
        }),
      ),
    );
    setAcknowledged(false);
    setError("");
    setMessage("");
  };

  const save = async () => {
    if (
      !canManage ||
      !available ||
      saving ||
      writeLock.current ||
      !selected ||
      !profile ||
      !user?.organizationId ||
      !user.locationId ||
      !selected.prompts.length
    ) {
      return;
    }
    const complete = selected.prompts.every(
      (_, index) => (answers[String(index)] ?? "").trim().length >= 12,
    );
    if (!complete || !acknowledged) {
      setError("Explain each control in at least 12 characters and confirm the management review.");
      return;
    }
    writeLock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fresh = await load();
      if (!fresh || !mounted.current) return;
      const freshMethod = fresh.methods.find((method) => method.id === selected.id);
      const freshAdoption = fresh.adopted.find((entry) => entry.template_id === selected.id);
      if (
        !fresh.profile ||
        JSON.stringify(freshMethod) !== JSON.stringify(selected) ||
        JSON.stringify(fresh.profile) !== JSON.stringify(profile) ||
        JSON.stringify(freshAdoption) !== JSON.stringify(adoptedFor(selected.id))
      ) {
        setAcknowledged(false);
        setSelectedId(null);
        setError("The method or premises evidence changed. Open the current method and review again.");
        return;
      }
      const reviewedAt = new Date();
      const reviewDate = safeMethodNextReview(operationalDate(reviewedAt, "Europe/London"));
      const { data, error: writeError } = await supabase
        .from("site_safe_methods")
        .upsert(
          {
            organization_id: user.organizationId,
            location_id: user.locationId,
            template_id: selected.id,
            status: "active",
            adopted_by: user.id,
            adopted_at: reviewedAt.toISOString(),
            review_due_at: reviewDate,
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
        )
        .select("id,template_id,status,review_due_at,adopted_by,controls")
        .single();
      if (!mounted.current) return;
      if (
        writeError ||
        !data ||
        data.template_id !== selected.id ||
        data.adopted_by !== user.id ||
        data.review_due_at !== reviewDate ||
        !safeMethodReviewCurrent(
          selected,
          profile,
          data as unknown as Adoption,
          operationalDate(reviewedAt, "Europe/London"),
        )
      ) {
        throw new Error("Review not confirmed");
      }
      setMessage("Premises-specific safe method recorded. Review it after material changes.");
      setSelectedId(null);
      setAcknowledged(false);
      await load();
    } catch {
      if (mounted.current) {
        setAcknowledged(false);
        setError("The review could not be confirmed. Refresh and check the current record.");
        await load();
      }
    } finally {
      writeLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const verifiedCount = ordered.filter((method) => !needsReview(method)).length;
  return (
    <main className="p-5 md:p-8 max-w-6xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow">GUIDED UK FOOD SAFETY METHODS</div>
          <h1 className="mt-1">Document your actual controls</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Answer the method prompts for this premises. A manager must confirm the real procedure
            before it is marked adopted. These are internal records, not regulator approval.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary min-h-11 px-4 py-2 text-sm"
          disabled={loading || saving}
          onClick={() => {
            setSelectedId(null);
            setAcknowledged(false);
            setError("");
            void load();
          }}
        >
          Refresh evidence
        </button>
      </header>
      {loadError && (
        <div role="alert" className="surface border border-destructive/40 p-3 text-sm">
          {loadError}
        </div>
      )}
      {error && (
        <div role="alert" className="surface border border-destructive/40 p-3 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="surface p-3 text-sm">
          {message}
        </div>
      )}
      {!profile && !loading && !loadError && (
        <div className="surface border border-warning/40 p-4 text-sm">
          Complete your UK jurisdiction and business profile first.{" "}
          <Link to="/app/uk-compliance" className="underline font-semibold">
            Open compliance profile
          </Link>
        </div>
      )}
      {available && profile && (
        <section className="surface p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-bold">
              {profile.business_type.replaceAll("_", " ")} ·{" "}
              {profile.jurisdiction.replaceAll("_", " ")}
            </div>
            <p className="text-xs text-muted-foreground">
              Prioritised for this premises; review cycles are internal planning reminders.
            </p>
          </div>
          <div className="text-sm font-semibold">
            {verifiedCount} of {methods.length} currently reviewed
          </div>
        </section>
      )}
      {loading ? (
        <div className="surface p-8 text-center">
          <Loader2 size={18} className="inline animate-spin" /> Loading methods…
        </div>
      ) : loadError ? (
        <p className="text-sm text-muted-foreground">Method reviews are unavailable.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ordered.map((method) => {
            const current = adoptedFor(method.id);
            const attention = needsReview(method);
            return (
              <article key={method.id} className="surface p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground font-bold">
                    {method.category.replaceAll("_", " ")}
                  </span>
                  {attention ? (
                    <span className="inline-flex gap-1 items-center text-xs text-warning-foreground">
                      <AlertTriangle size={14} /> Needs review
                    </span>
                  ) : (
                    <span className="inline-flex gap-1 items-center text-xs text-success">
                      <CheckCircle2 size={14} /> Reviewed
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-lg">{method.title}</h2>
                <p className="text-sm text-muted-foreground flex-1">{method.summary}</p>
                <div className="text-xs text-muted-foreground">
                  Template {method.version} ·{" "}
                  {current?.review_due_at ? `Next review ${current.review_due_at}` : "Not adopted"}
                </div>
                <div className="flex items-center gap-3">
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => open(method)}
                      disabled={!available || saving}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {current ? "Review method" : "Document method"}
                    </button>
                  )}
                  <a
                    href={method.official_source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-xs"
                  >
                    Official guidance
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected && canManage && available && (
        <section
          className="surface p-5 space-y-4 border border-primary/20"
          aria-labelledby="method-title"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="method-title" className="text-xl font-bold">
              {selected.title}
            </h2>
            <button
              type="button"
              className="min-h-11 text-sm underline"
              disabled={saving}
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
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
                disabled={saving}
                onChange={(event) => {
                  setAnswers((previous) => ({ ...previous, [String(index)]: event.target.value }));
                  setAcknowledged(false);
                }}
                maxLength={2000}
                placeholder="Describe your actual on-site control and response when it fails"
              />
            </label>
          ))}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={saving}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              I am authorised to review this premises' procedures and have checked these answers
              against actual practice.
            </span>
          </label>
          <button
            type="button"
            className="btn-primary px-4 py-2 inline-flex items-center gap-2"
            onClick={() => void save()}
            disabled={saving || !acknowledged || !available}
          >
            <ShieldCheck size={17} /> {saving ? "Saving…" : "Confirm site method"}
          </button>
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        A template version change, UK jurisdiction change, missing procedure or passed review date
        triggers another management review. Specialist validation and regulator requirements still
        apply.
      </p>
    </main>
  );
}
