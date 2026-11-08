import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Evidence = { label: string; count: number };

export default function InspectionReadiness() {
  const { session, organizationId, loading: sessionLoading } = useSession();
  const userId = session?.user.id ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(false);
    setEvidence([]);
    if (!userId || !organizationId) {
      setError(true);
      setLoading(false);
      return;
    }
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    try {
      const results = await Promise.all([
        supabase
          .from("temperature_logs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .gte("logged_at", since),
        supabase
          .from("checks")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "completed")
          .gte("completed_at", since),
        supabase
          .from("training_records")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .not("verified_at", "is", null),
        supabase
          .from("recipes")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId),
        supabase
          .from("corrective_actions")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .neq("status", "closed"),
      ]);
      if (version !== requestVersion.current) return;
      if (results.some((result) => result.error || typeof result.count !== "number")) {
        setError(true);
        return;
      }
      setEvidence([
        { label: "Temperature records (90 days)", count: results[0].count ?? 0 },
        { label: "Completed checks (90 days)", count: results[1].count ?? 0 },
        { label: "Verified training records", count: results[2].count ?? 0 },
        { label: "Recipes and allergen records", count: results[3].count ?? 0 },
        { label: "Open corrective actions", count: results[4].count ?? 0 },
      ]);
    } catch {
      if (version === requestVersion.current) setError(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [organizationId, userId]);

  useEffect(() => {
    if (sessionLoading) return;
    void load();
    return () => {
      requestVersion.current += 1;
    };
  }, [load, sessionLoading]);

  return (
    <CompliancePage
      eyebrow="INSPECTION PREPARATION"
      title="Evidence readiness"
      intro="Organization-wide evidence counts, not a site safety determination. Generate controlled evidence packs from the full workspace."
      loading={loading || sessionLoading}
      footer="This summary is not an FHRS prediction, inspection approval or confirmation of compliance."
    >
      {error ? (
        <View accessibilityLiveRegion="polite">
          <Text accessibilityRole="alert" style={complianceStyles.empty}>
            Evidence totals are unavailable. Missing records must not be treated as zero.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void load()}
            style={{ minHeight: 48, padding: 12, alignSelf: "flex-start" }}
          >
            <Text style={complianceStyles.badge}>Retry evidence counts</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {evidence.map((item) => (
            <ComplianceCard
              key={item.label}
              title={item.label}
              status={
                <Text
                  style={[complianceStyles.badge, styles.countBadge]}
                >
                  {item.count}
                </Text>
              }
            />
          ))}
          {evidence.length > 0 && evidence.every((item) => item.count === 0) && (
            <Text style={complianceStyles.empty}>
              No records were returned for this organization. Do not infer safety from zero counts.
            </Text>
          )}
        </>
      )}
    </CompliancePage>
  );
}
 
const styles = StyleSheet.create({
  countBadge: { backgroundColor: "#f0f0f0", color: "#252525" },
});
