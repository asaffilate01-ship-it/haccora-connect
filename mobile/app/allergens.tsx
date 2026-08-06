import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";

const ALLERGENS = [
  "gluten",
  "crustaceans",
  "egg",
  "fish",
  "peanut",
  "soya",
  "milk",
  "tree nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
];
const aliases: Record<string, string> = {
  crustacean: "crustaceans",
  crust: "crustaceans",
  soy: "soya",
  nuts: "tree nuts",
  nut: "tree nuts",
  sulphite: "sulphites",
  sulph: "sulphites",
  mollusc: "molluscs",
};
type Recipe = {
  id: string;
  name: string;
  category: string | null;
  allergens: string[];
  flagged: boolean;
};
const normalise = (value: string) =>
  aliases[value.toLowerCase().trim()] || value.toLowerCase().trim();

export default function Allergens() {
  const [rows, setRows] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void supabase
      .from("recipes")
      .select("id,name,category,allergens,flagged")
      .order("name")
      .then(({ data }) => {
        setRows(
          ((data ?? []) as Recipe[]).map((row) => ({
            ...row,
            allergens: (row.allergens || []).map(normalise),
          })),
        );
        setLoading(false);
      });
  }, []);
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.name.toLowerCase().includes(query.toLowerCase()) ||
          (row.category || "").toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows],
  );
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>LIVE MENU</Text>
      <Text style={styles.title}>Allergen lookup</Text>
      <Text style={styles.intro}>
        Quickly check the latest saved recipe information. Never guess—confirm uncertainty with the
        kitchen and current supplier specification.
      </Text>
      <TextInput
        accessibilityLabel="Search dishes"
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search dish or category"
      />
      {loading ? (
        <Text style={styles.empty}>Loading live menu…</Text>
      ) : (
        visible.map((row) => (
          <View key={row.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.flex}>
                {!!row.category && <Text style={styles.category}>{row.category}</Text>}
                <Text style={styles.cardTitle}>{row.name}</Text>
              </View>
              {row.flagged && <Text style={styles.review}>REVIEW</Text>}
            </View>
            <View style={styles.tags}>
              {ALLERGENS.map((allergen) => {
                const active = row.allergens.includes(allergen);
                return (
                  <Text
                    key={allergen}
                    style={[styles.tag, active ? styles.activeTag : styles.inactiveTag]}
                  >
                    {allergen}
                  </Text>
                );
              })}
            </View>
            <Text style={styles.meta}>
              {row.allergens.length
                ? `Declared: ${row.allergens.join(", ")}`
                : "No allergens declared in this saved recipe. This is not a guarantee of absence."}
            </Text>
          </View>
        ))
      )}
      {!loading && visible.length === 0 && (
        <Text style={styles.empty}>No matching live menu items.</Text>
      )}
      <Text style={styles.disclaimer}>
        Allergen information must be kept current and verified. Ask about recipe changes,
        substitutions and cross-contamination controls before advising a customer.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { gap: 11, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  search: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 12,
    padding: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderColor: "#e1e1e1",
    borderRadius: 14,
    borderWidth: 1,
    gap: 9,
    padding: 13,
  },
  top: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  category: { color: "#777", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  cardTitle: { fontSize: 14, fontWeight: "800", marginTop: 1 },
  review: {
    backgroundColor: "#fff0c7",
    borderRadius: 10,
    color: "#7a5000",
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: {
    borderRadius: 10,
    fontSize: 9,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: "capitalize",
  },
  activeTag: { backgroundColor: "#fde2e2", color: "#9f1d14" },
  inactiveTag: { backgroundColor: "#f1f1f1", color: "#999" },
  meta: { color: "#555", fontSize: 10, lineHeight: 15 },
  empty: { color: "#777", fontSize: 12, padding: 24, textAlign: "center" },
  disclaimer: { color: "#777", fontSize: 10, lineHeight: 15 },
});
