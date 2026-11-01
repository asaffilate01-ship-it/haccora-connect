import { useCallback, useEffect, useRef, useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
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

export default function Ppds() {
  const { session, loading: sessionLoading, workspaceReady, organizationId, locationId } =
    useSession();
  const userId = session?.user.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setError(false);
    setLoading(true);
    setLabels([]);
    if (!workspaceReady || !organizationId || !locationId || !userId) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      const result = await supabase
        .from("ppds_label_versions")
        .select("id,product_name,version,allergens,generated_at")
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .order("generated_at", { ascending: false })
        .limit(50);
      if (version !== requestVersion.current) return;
      if (result.error) {
        setError(true);
        return;
      }
      setLabels((result.data ?? []) as Label[]);
    } catch {
      if (version === requestVersion.current) setError(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [workspaceReady, organizationId, locationId, userId]);

  useEffect(() => {
    void load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load]);

  if (sessionLoading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;

  return (
    <CompliancePage
      eyebrow="UK ALLERGEN MANAGEMENT"
      title="Recorded PPDS versions"
      intro="Saved versions for the current premises. These records are not proof that the ingredient specification remains unchanged."
      loading={loading}
      footer="Do not use a saved version as a current label without a manager checking live ingredient records, supplier specifications and the physical print."
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh PPDS evidence"
        onPress={() => void load()}
        style={styles.refresh}
      >
        <Text style={styles.refreshText}>Refresh evidence</Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          PPDS evidence is unavailable. No label is assumed current. Reconnect and retry.
        </Text>
      ) : labels.length ? (
        <>
          {labels.length >= 50 && (
            <Text style={styles.caution}>
              Showing at most 50 saved versions; older records are not included.
            </Text>
          )}
          {labels.map((label) => (
            <ComplianceCard
              key={label.id}
              title={label.product_name}
              detail={
                label.allergens?.length
                  ? "Saved allergens (unverified now): " + label.allergens.join(", ")
                  : "No allergens recorded in this saved version. This is not an allergen-free claim."
              }
              status={
                <Text style={[complianceStyles.badge, complianceStyles.warning]}>
                  Saved V{label.version}
                </Text>
              }
            >
              <Text style={styles.caution}>
                Review live supplier details before use · Recorded{" "}
                {new Date(label.generated_at).toLocaleDateString("en-GB")}
              </Text>
            </ComplianceCard>
          ))}
        </>
      ) : (
        <Text style={complianceStyles.empty}>
          No PPDS versions have been recorded for this premises.
        </Text>
      )}
    </CompliancePage>
  );
}

const styles = StyleSheet.create({
  refresh: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#222",
    alignSelf: "flex-start",
  },
  refreshText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  error: { color: "#aa2020", fontSize: 14, lineHeight: 21 },
  caution: { color: "#6b4b15", fontSize: 12, lineHeight: 18, marginTop: 6 },
});
