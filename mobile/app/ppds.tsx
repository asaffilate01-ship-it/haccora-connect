import { useEffect, useState } from "react";
import { Pressable, Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setLabels([]);
    const query = supabase
      .from("ppds_label_versions")
      .select("id,product_name,version,allergens,generated_at")
      .eq("organization_id", organizationId);
    const scoped = locationId ? query.eq("location_id", locationId) : query;
    void Promise.resolve(scoped.order("generated_at", { ascending: false }).limit(50))
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError || !data) {
          setError(true);
          return;
        }
        setLabels(data as Label[]);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, locationId, refresh]);

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
      ) : labels.length ? (
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
        onPress={() => setRefresh((value) => value + 1)}
        style={{ padding: 14, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "700" }}>{refreshLabel}</Text>
      </Pressable>
    </CompliancePage>
  );
}
