import { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useFocusedEvidence } from "@/lib/use-focused-evidence";

type Label = {
  id: string;
  product_name: string;
  version: number;
  allergens: string[];
  generated_at: string;
};

function savedDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { timeZone: "Europe/London" });
}

export default function Ppds() {
  const workspace = useSession();
  const { session, workspaceReady, serviceStatus } = workspace;
  const { organizationId, locationId, role } = workspace;
  if (!session || !workspaceReady || !organizationId || serviceStatus !== "active") {
    return (
      <CompliancePage
        eyebrow="UK ALLERGEN MANAGEMENT"
        title="PPDS label history"
        intro="A verified workspace is required to load saved label versions."
        loading={false}
        footer="Do not use an unverified label for sale."
      />
    );
  }
  return (
    <LabelHistory
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
    />
  );
}

function LabelHistory({
  organizationId,
  locationId,
}: {
  organizationId: string;
  locationId: string | null;
}) {
  const load = useCallback(
    async (isCurrent: () => boolean): Promise<Label[]> => {
      const query = supabase
        .from("ppds_label_versions")
        .select("id,product_name,version,allergens,generated_at")
        .eq("organization_id", organizationId);
      const scoped = locationId ? query.eq("location_id", locationId) : query;
      const result = await scoped.order("generated_at", { ascending: false }).order("id").limit(50);
      if (!isCurrent()) throw new Error("PPDS evidence request expired");
      if (result.error || !result.data) throw new Error("PPDS label history unavailable");
      return result.data as Label[];
    },
    [organizationId, locationId],
  );
  const { data: labels, status, refresh } = useFocusedEvidence(load);
  const loading = status === "loading";
  const error = status === "error";

  const refreshLabel = error ? "Retry loading" : "Refresh label history";
  return (
    <CompliancePage
      eyebrow="UK ALLERGEN MANAGEMENT"
      title="PPDS label history"
      intro={
        locationId
          ? "Up to 50 recent saved label versions for the selected site."
          : "Up to 50 recent saved label versions visible under your workspace access."
      }
      loading={loading}
      footer="These are historical records, not approved current labels. Verify the recipe, current supplier specifications and physical label before sale."
    >
      {error ? (
        <ComplianceCard
          title="Label history unavailable"
          detail="Do not rely on earlier records. Retry loading the saved versions."
        />
      ) : status === "ready" && labels.length ? (
        labels.map((label) => (
          <ComplianceCard
            key={label.id}
            title={label.product_name}
            detail={
              label.allergens?.length
                ? `Recorded allergens: ${label.allergens.join(", ")}`
                : "No allergens declared in this saved version. This does not mean allergen-free."
            }
            status={
              <Text style={[complianceStyles.badge, complianceStyles.warning]}>
                V{label.version}
              </Text>
            }
          >
            <Text style={{ fontSize: 12, marginTop: 8 }}>
              {`Saved ${savedDate(label.generated_at)} · Current recipe not verified`}
            </Text>
          </ComplianceCard>
        ))
      ) : (
        <Text style={complianceStyles.empty}>No saved label versions visible for this scope.</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh PPDS label history"
        onPress={refresh}
        style={{ padding: 14, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "700" }}>{refreshLabel}</Text>
      </Pressable>
    </CompliancePage>
  );
}
