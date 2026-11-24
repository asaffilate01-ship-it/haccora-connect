import { useCallback } from "react";
import { Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { useComplianceEvidence } from "@/lib/compliance-evidence";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

type Label = {
  id: string;
  product_name: string;
  version: number;
  allergens: string[];
  generated_at: string;
};

const intro =
  "Recent saved label versions for this site. This history does not verify that a label is current.";
const footer =
  "Before sale, confirm the full ingredient order, current supplier specifications and printed label with authorised management.";

export default function Ppds() {
  const { session, workspaceReady, organizationId, locationId, locationName, role, loading } =
    useSession();
  if (loading || !session || !workspaceReady || !organizationId || !locationId) {
    return (
      <CompliancePage
        eyebrow="UK ALLERGEN MANAGEMENT"
        title="PPDS labels"
        intro={intro}
        loading={loading}
        error="Select an authorised business location to view its saved labels."
        footer={footer}
      />
    );
  }
  return (
    <ScopedLabels
      key={`${session.user.id}:${organizationId}:${locationId}:${role ?? ""}`}
      organizationId={organizationId}
      locationId={locationId}
      scope={locationName ?? "Selected location"}
    />
  );
}

function ScopedLabels({
  organizationId,
  locationId,
  scope,
}: {
  organizationId: string;
  locationId: string;
  scope: string;
}) {
  const load = useCallback(async (): Promise<Label[]> => {
    const { data, error } = await supabase
      .from("ppds_label_versions")
      .select("id,product_name,version,allergens,generated_at")
      .eq("organization_id", organizationId)
      .eq("location_id", locationId)
      .order("generated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(50);
    if (error || !data) throw new Error("Label history unavailable");
    return data as Label[];
  }, [organizationId, locationId]);

  const labels = useComplianceEvidence(load);
  return (
    <CompliancePage
      eyebrow="UK ALLERGEN MANAGEMENT"
      title="PPDS labels"
      intro={intro}
      scope={scope}
      loading={labels.status === "loading"}
      error={
        labels.status === "error"
          ? "Saved labels could not be loaded. Do not use this screen as allergen evidence."
          : undefined
      }
      onRefresh={labels.refresh}
      footer={footer}
    >
      {labels.data?.length ? (
        <>
          <Text style={complianceStyles.empty}>Showing up to 50 recent saved versions.</Text>
          {labels.data.map((label) => (
            <ComplianceCard
              key={label.id}
              title={label.product_name}
              detail={
                label.allergens?.length
                  ? `Saved declaration: ${label.allergens.join(", ")}`
                  : "No allergens declared in this saved version; absence is not verified."
              }
              status={
                <Text style={[complianceStyles.badge, complianceStyles.warning]}>
                  V{label.version} · REVIEW
                </Text>
              }
            >
              <Text style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                Saved:{" "}
                {new Date(label.generated_at).toLocaleString("en-GB", {
                  timeZone: "Europe/London",
                })}
              </Text>
            </ComplianceCard>
          ))}
        </>
      ) : (
        <Text style={complianceStyles.empty}>No saved label versions visible for this site.</Text>
      )}
    </CompliancePage>
  );
}
