import { useCallback } from "react";
import { Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { useComplianceEvidence } from "@/lib/compliance-evidence";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type Method = { id: string; title: string; summary: string; category: string };
type Adoption = { template_id: string; status: string; review_due_at: string | null };

const intro =
  "Review the controls recorded for this site. Owners and managers can amend or reconfirm them in the full workspace.";
const footer =
  "Recorded adoption is not certification. Follow the actual site procedures and current official guidance.";

export default function SafeMethods() {
  const { session, workspaceReady, organizationId, locationId, locationName, role, loading } =
    useSession();
  if (loading || !session || !workspaceReady || !organizationId || !locationId) {
    return (
      <CompliancePage
        eyebrow="UK FOOD SAFETY"
        title="Safe methods"
        intro={intro}
        loading={loading}
        error="Select an authorised business location to view its safe methods."
        footer={footer}
      />
    );
  }
  return (
    <ScopedMethods
      key={`${session.user.id}:${organizationId}:${locationId}:${role ?? ""}`}
      organizationId={organizationId}
      locationId={locationId}
      scope={locationName ?? "Selected location"}
    />
  );
}

function ScopedMethods({
  organizationId,
  locationId,
  scope,
}: {
  organizationId: string;
  locationId: string;
  scope: string;
}) {
  const load = useCallback(async () => {
    const [templates, adopted] = await Promise.all([
      supabase
        .from("safe_method_templates")
        .select("id,title,summary,category", { count: "exact" })
        .order("title"),
      supabase
        .from("site_safe_methods")
        .select("template_id,status,review_due_at", { count: "exact" })
        .eq("organization_id", organizationId)
        .eq("location_id", locationId),
    ]);
    if (
      [templates, adopted].some(
        (result) => result.error || !result.data || result.count !== result.data.length,
      )
    ) {
      throw new Error("Incomplete site safe methods");
    }
    return {
      methods: (templates.data ?? []) as Method[],
      adoptions: (adopted.data ?? []) as Adoption[],
    };
  }, [organizationId, locationId]);

  const evidence = useComplianceEvidence(load);
  return (
    <CompliancePage
      eyebrow="UK FOOD SAFETY"
      title="Safe methods"
      intro={intro}
      scope={scope}
      loading={evidence.status === "loading"}
      error={
        evidence.status === "error"
          ? "Site safe-method evidence could not be verified. Refresh before relying on these records."
          : undefined
      }
      onRefresh={evidence.refresh}
      footer={footer}
    >
      {evidence.data?.methods.length ? (
        evidence.data.methods.map((method) => {
          const adoption = evidence.data?.adoptions.find((item) => item.template_id === method.id);
          const due = adoption?.review_due_at ? Date.parse(adoption.review_due_at) : null;
          const active =
            adoption?.status === "active" &&
            due !== null &&
            Number.isFinite(due) &&
            due > Date.now();
          return (
            <ComplianceCard
              key={method.id}
              title={method.title}
              detail={method.summary}
              status={
                <Text
                  style={[
                    complianceStyles.badge,
                    active ? complianceStyles.neutral : complianceStyles.warning,
                  ]}
                >
                  {active ? "RECORDED" : "REVIEW"}
                </Text>
              }
            />
          );
        })
      ) : (
        <Text style={complianceStyles.empty}>No safe methods visible for this site.</Text>
      )}
    </CompliancePage>
  );
}
