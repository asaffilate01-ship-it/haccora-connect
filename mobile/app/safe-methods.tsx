import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { supabase } from "@/lib/supabase";

type Method = { id: string; title: string; summary: string; category: string };
type Adoption = { template_id: string; status: string; review_due_at: string | null };

export default function SafeMethods() {
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<Method[]>([]);
  const [adoptions, setAdoptions] = useState<Adoption[]>([]);
  useEffect(() => {
    void Promise.all([
      supabase.from("safe_method_templates").select("id,title,summary,category").order("title"),
      supabase.from("site_safe_methods").select("template_id,status,review_due_at"),
    ]).then(([templates, adopted]) => {
      setMethods((templates.data ?? []) as Method[]);
      setAdoptions((adopted.data ?? []) as Adoption[]);
      setLoading(false);
    });
  }, []);
  return (
    <CompliancePage
      eyebrow="UK FOOD SAFETY"
      title="Safe methods"
      intro="Review the controls adopted for this site. Owners and managers can amend or reconfirm them in the full Haccora workspace."
      loading={loading}
      footer="Official FSA/FSS guidance and your local authority remain authoritative."
    >
      {methods.length ? (
        methods.map((method) => {
          const adoption = adoptions.find((item) => item.template_id === method.id);
          return (
            <ComplianceCard
              key={method.id}
              title={method.title}
              detail={method.summary}
              status={
                <Text style={[complianceStyles.badge, !adoption && complianceStyles.warning]}>
                  {adoption?.status === "active" ? "ACTIVE" : "REVIEW"}
                </Text>
              }
            />
          );
        })
      ) : (
        <Text style={complianceStyles.empty}>No safe methods are available yet.</Text>
      )}
    </CompliancePage>
  );
}
