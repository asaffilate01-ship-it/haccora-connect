import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { operationalDate } from "@/lib/operational-day";
import { safeMethodReviewCurrent, type ReviewControls } from "@/lib/safe-method-review";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useFocusedEvidence } from "@/lib/use-focused-evidence";

type Method = {
  id: string;
  title: string;
  summary: string;
  version: string;
  prompts: string[];
};
type Adoption = {
  template_id: string;
  status: string;
  review_due_at: string | null;
  controls: ReviewControls | null;
};
type Profile = { jurisdiction: string; business_type: string };

export default function SafeMethods() {
  const workspace = useSession();
  const { session, workspaceReady, loading, role, serviceStatus } = workspace;
  const { organizationId, locationId } = workspace;
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  if (!organizationId || !locationId || !role) {
    return (
      <CompliancePage
        eyebrow="UK FOOD SAFETY"
        title="Safe methods"
        intro="Select an authorised premises to review its methods."
        loading={false}
        footer="No review evidence is available."
      />
    );
  }
  return (
    <SiteMethods
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
    />
  );
}

function SiteMethods({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string;
}) {
  const [today, setToday] = useState(() => operationalDate(new Date(), "Europe/London"));
  useEffect(() => {
    const timer = setInterval(() => {
      setToday(operationalDate(new Date(), "Europe/London"));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    const [templates, adopted, site] = await Promise.all([
      supabase
        .from("safe_method_templates")
        .select("id,title,summary,version,prompts", { count: "exact" })
        .order("title")
        .order("id"),
      supabase
        .from("site_safe_methods")
        .select("template_id,status,review_due_at,controls", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("location_id", locationId),
      supabase
        .from("site_compliance_profiles")
        .select("jurisdiction,business_type")
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .maybeSingle(),
    ]);
    if (
      templates.error ||
      !templates.data ||
      templates.count !== templates.data.length ||
      adopted.error ||
      !adopted.data ||
      adopted.count !== adopted.data.length ||
      site.error
    ) {
      throw new Error("Incomplete method evidence");
    }
    const methods = templates.data as Method[];
    if (
      methods.some(
        (method) =>
          !Array.isArray(method.prompts) ||
          !method.prompts.length ||
          method.prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim()),
      )
    ) {
      throw new Error("Invalid method template");
    }
    return {
      methods,
      adoptions: adopted.data as Adoption[],
      profile: site.data as Profile | null,
      checkedDay: operationalDate(new Date(), "Europe/London"),
    };
  }, [organizationId, locationId]);

  const evidence = useFocusedEvidence(load);
  const { data, status, refresh } = evidence;
  const available = status === "ready" && data?.checkedDay === today;
  const byTemplate = new Map(data?.adoptions.map((item) => [item.template_id, item]) ?? []);

  useEffect(() => {
    if (status === "ready" && !available) refresh();
  }, [available, refresh, status]);

  return (
    <CompliancePage
      eyebrow="UK FOOD SAFETY"
      title="Safe methods"
      intro="Review the recorded controls for this premises. Owners and managers document changes in the full workspace."
      loading={status === "loading"}
      footer="A recorded review is not regulator approval. Official guidance and actual procedures remain authoritative."
    >
      {!available ? (
        <ComplianceCard
          title="Review evidence unavailable"
          detail="Refresh before relying on recorded methods."
        />
      ) : !data?.profile ? (
        <ComplianceCard
          title="Site profile required"
          detail="Complete the premises compliance profile in the web workspace."
        />
      ) : data.methods.length ? (
        data.methods.map((method) => {
          const adoption = byTemplate.get(method.id);
          const reviewed = safeMethodReviewCurrent(method, data.profile, adoption, today);
          return (
            <ComplianceCard
              key={method.id}
              title={method.title}
              detail={method.summary}
              status={
                <Text style={[complianceStyles.badge, !reviewed && complianceStyles.warning]}>
                  {reviewed ? "REVIEWED" : "NEEDS REVIEW"}
                </Text>
              }
            >
              <Text style={{ fontSize: 12, marginTop: 8 }}>
                {adoption?.review_due_at
                  ? `Recorded review due: ${adoption.review_due_at}`
                  : "No review date recorded"}
              </Text>
            </ComplianceCard>
          );
        })
      ) : (
        <Text style={complianceStyles.empty}>No safe method templates are visible.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh safe methods"
        onPress={refresh}
        style={{ alignItems: "center", minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700" }}>
          {status === "error" ? "Retry loading" : "Refresh evidence"}
        </Text>
      </Pressable>
    </CompliancePage>
  );
}
