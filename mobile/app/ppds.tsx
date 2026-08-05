import { useEffect, useState } from "react";
import { Text } from "react-native";
import { ComplianceCard, CompliancePage, complianceStyles } from "@/components/compliance-list";
import { supabase } from "@/lib/supabase";

type Label = {
  id: string;
  product_name: string;
  version: number;
  allergens: string[];
  generated_at: string;
};

export default function Ppds() {
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<Label[]>([]);
  useEffect(() => {
    void supabase
      .from("ppds_label_versions")
      .select("id,product_name,version,allergens,generated_at")
      .order("generated_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setLabels((data ?? []) as Label[]);
        setLoading(false);
      });
  }, []);
  return (
    <CompliancePage
      eyebrow="UK ALLERGEN MANAGEMENT"
      title="PPDS labels"
      intro="Check the most recent versioned labels before food is packed and offered for sale."
      loading={loading}
      footer="Always compare the label with the current recipe and supplier specifications before printing or applying it."
    >
      {labels.length ? (
        labels.map((label) => (
          <ComplianceCard
            key={label.id}
            title={label.product_name}
            detail={
              label.allergens?.length
                ? `Allergens: ${label.allergens.join(", ")}`
                : "No declared allergens in this saved version."
            }
            status={<Text style={complianceStyles.badge}>V{label.version}</Text>}
          />
        ))
      ) : (
        <Text style={complianceStyles.empty}>No PPDS label versions have been generated.</Text>
      )}
    </CompliancePage>
  );
}
