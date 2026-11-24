import { useCallback } from "react";
import { Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { useComplianceEvidence } from "@/lib/compliance-evidence";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type Evidence = { label: string; count: number };

const intro =
  "A mobile summary of evidence visible to your account. Use the full workspace to generate an inspection pack.";
const footer =
  "Counts describe records visible under your permissions. Zero does not establish compliance or the absence of a risk.";

export default function InspectionReadiness() {
  const { session, workspaceReady, organizationId, locationId, locationName, role, loading } =
    useSession();
  if (loading || !session || !workspaceReady || !organizationId) {
    return (
      <CompliancePage
        eyebrow="INSPECTION PREPARATION"
        title="Evidence readiness"
        intro={intro}
        loading={loading}
        error="Sign in to an authorised business workspace to view evidence."
        footer={footer}
      />
    );
  }
  return (
    <ScopedReadiness
      key={`${session.user.id}:${organizationId}:${locationId ?? ""}:${role ?? ""}`}
      organizationId={organizationId}
      locationId={locationId}
      scope={locationId ? (locationName ?? "Selected location") : "Authorised business locations"}
    />
  );
}

function ScopedReadiness({
  organizationId,
  locationId,
  scope,
}: {
  organizationId: string;
  locationId: string | null;
  scope: string;
}) {
  const load = useCallback(async (): Promise<Evidence[]> => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const count = { count: "exact" as const, head: true };
    const temperatures = supabase
      .from("temperature_logs")
      .select("id", count)
      .eq("organization_id", organizationId)
      .gte("logged_at", since);
    const checks = supabase
      .from("checks")
      .select("id", count)
      .eq("organization_id", organizationId)
      .eq("status", "completed")
      .gte("completed_at", since);
    const training = supabase
      .from("training_records")
      .select("id", count)
      .eq("organization_id", organizationId)
      .not("verified_at", "is", null);
    const recipes = supabase
      .from("recipes")
      .select("id", count)
      .eq("organization_id", organizationId);
    const actions = supabase
      .from("corrective_actions")
      .select("id", count)
      .eq("organization_id", organizationId)
      .not("status", "in", '("verified","closed")');

    const results = await Promise.all([
      locationId ? temperatures.eq("location_id", locationId) : temperatures,
      locationId ? checks.eq("location_id", locationId) : checks,
      locationId ? training.eq("location_id", locationId) : training,
      locationId ? recipes.or(`location_id.eq.${locationId},location_id.is.null`) : recipes,
      locationId ? actions.eq("location_id", locationId) : actions,
    ]);
    const labels = [
      "Temperature records (90 days)",
      "Completed checks (90 days)",
      "Verified training records",
      "Recipes and allergen records",
      "Open corrective actions",
    ];
    return results.map((result, index) => {
      if (result.error || result.count === null) throw new Error("Incomplete evidence");
      return { label: labels[index], count: result.count };
    });
  }, [organizationId, locationId]);

  const evidence = useComplianceEvidence(load);
  return (
    <CompliancePage
      eyebrow="INSPECTION PREPARATION"
      title="Evidence readiness"
      intro={intro}
      scope={scope}
      loading={evidence.status === "loading"}
      error={
        evidence.status === "error"
          ? "Evidence counts could not be verified. No all-clear status has been assumed."
          : undefined
      }
      onRefresh={evidence.refresh}
      footer={footer}
    >
      {evidence.data?.map((item) => (
        <ComplianceCard
          key={item.label}
          title={item.label}
          status={
            <Text style={[complianceStyles.badge, complianceStyles.neutral]}>{item.count}</Text>
          }
        />
      ))}
    </CompliancePage>
  );
}
