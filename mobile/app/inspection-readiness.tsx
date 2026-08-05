import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { supabase } from "@/lib/supabase";

type Evidence = { label: string; count: number };

export default function InspectionReadiness() {
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    void Promise.all([
      supabase
        .from("temperature_logs")
        .select("id", { count: "exact", head: true })
        .gte("logged_at", since),
      supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", since),
      supabase
        .from("training_records")
        .select("id", { count: "exact", head: true })
        .not("verified_at", "is", null),
      supabase.from("recipes").select("id", { count: "exact", head: true }),
      supabase
        .from("corrective_actions")
        .select("id", { count: "exact", head: true })
        .neq("status", "closed"),
    ]).then(([temperatures, checks, training, recipes, actions]) => {
      setEvidence([
        { label: "Temperature records (90 days)", count: temperatures.count ?? 0 },
        { label: "Completed checks (90 days)", count: checks.count ?? 0 },
        { label: "Verified training records", count: training.count ?? 0 },
        { label: "Recipes and allergen records", count: recipes.count ?? 0 },
        { label: "Open corrective actions", count: actions.count ?? 0 },
      ]);
      setLoading(false);
    });
  }, []);
  return (
    <CompliancePage
      eyebrow="INSPECTION PREPARATION"
      title="Evidence readiness"
      intro="A quick mobile view of records an officer may ask to see. Generate the controlled evidence pack from the full workspace."
      loading={loading}
      footer="This is an evidence-coverage summary, not an FHRS prediction or confirmation of compliance."
    >
      {evidence.map((item) => (
        <ComplianceCard
          key={item.label}
          title={item.label}
          status={
            <Text style={[complianceStyles.badge, item.count === 0 && complianceStyles.warning]}>
              {item.count}
            </Text>
          }
        />
      ))}
    </CompliancePage>
  );
}
