import { useCallback } from "react";
import { Pressable, Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { operationalDate, operationalDay } from "@/lib/operational-day";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useFocusedEvidence } from "@/lib/use-focused-evidence";

type Evidence = { label: string; count: number; attention?: boolean };

export default function InspectionReadiness() {
  const { session, workspaceReady, organizationId, locationId, locationName, role, serviceStatus } =
    useSession();
  if (!session || !workspaceReady || !organizationId || serviceStatus !== "active") {
    return (
      <CompliancePage
        eyebrow="INSPECTION PREPARATION"
        title="Evidence readiness"
        intro="A verified workspace is required to load inspection evidence."
        loading={false}
        footer="No evidence counts are available."
      />
    );
  }
  return (
    <EvidenceView
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
      locationName={locationName}
    />
  );
}

function EvidenceView({
  organizationId,
  locationId,
  locationName,
}: {
  organizationId: string;
  locationId: string | null;
  locationName: string | null;
}) {
  const load = useCallback(
    async (isCurrent: () => boolean): Promise<Evidence[]> => {
      const now = new Date();
      const today = operationalDay(now, "Europe/London");
      const first = operationalDate(now, "Europe/London", -89);
      const since = operationalDay(new Date(first + "T12:00:00Z"), "Europe/London").start;
      const scope = (table: string) => {
        const query = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId);
        return locationId ? query.eq("location_id", locationId) : query;
      };
      const results = await Promise.all([
        scope("temperature_logs").gte("logged_at", since).lt("logged_at", today.end),
        scope("checks")
          .eq("status", "completed")
          .gte("completed_at", since)
          .lt("completed_at", today.end),
        scope("training_records").not("verified_at", "is", null),
        (() => {
          const query = supabase
            .from("recipes")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId);
          return locationId ? query.or(`location_id.eq.${locationId},location_id.is.null`) : query;
        })(),
        scope("corrective_actions").not("status", "in", '("verified","closed")'),
      ]);
      if (!isCurrent()) throw new Error("Inspection evidence request expired");
      if (results.some((result) => result.error || result.count === null)) {
        throw new Error("Inspection evidence is incomplete");
      }
      const [temperatures, checks, training, recipes, actions] = results;
      return [
        { label: "Temperature records (90 UK days)", count: temperatures.count ?? 0 },
        { label: "Completed checks (90 UK days)", count: checks.count ?? 0 },
        { label: "Verified training records", count: training.count ?? 0 },
        { label: "Recipes and allergen records", count: recipes.count ?? 0 },
        {
          label: "Open corrective actions",
          count: actions.count ?? 0,
          attention: (actions.count ?? 0) > 0,
        },
      ];
    },
    [organizationId, locationId],
  );
  const { data: evidence, status, refresh } = useFocusedEvidence(load);
  const loading = status === "loading";
  const error = status === "error";

  return (
    <CompliancePage
      eyebrow="INSPECTION PREPARATION"
      title="Evidence readiness"
      intro={
        locationId
          ? `Visible records for ${locationName ?? "the selected site"}. Generate the evidence pack from the full workspace.`
          : "Visible records across your granted workspace access. Generate the evidence pack from the full workspace."
      }
      loading={loading}
      footer="Record counts reflect your access and do not establish compliance or predict a hygiene rating."
    >
      {error ? (
        <ComplianceCard
          title="Evidence unavailable"
          detail="Some records could not be verified. No readiness totals are shown."
        />
      ) : (
        (status === "ready" ? evidence : []).map((item) => (
          <ComplianceCard
            key={item.label}
            title={item.label}
            status={
              <Text
                style={[
                  complianceStyles.badge,
                  (item.attention ?? item.count === 0) && complianceStyles.warning,
                ]}
              >
                {item.count}
              </Text>
            }
          />
        ))
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh inspection evidence"
        onPress={refresh}
        style={{ padding: 14, alignItems: "center" }}
      >
        <Text style={{ fontWeight: "700" }}>{error ? "Retry loading" : "Refresh evidence"}</Text>
      </Pressable>
    </CompliancePage>
  );
}
