import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";

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
  const { session, loading: sessionLoading, workspaceReady, organizationId, locationId } =
    useSession();
  const userId = session?.user.id;
  const [rows, setRows] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setLoadError(false);
    setRows([]);
    if (!workspaceReady || !organizationId || !locationId || !userId) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    try {
      const result = await supabase
        .from("recipes")
        .select("id,name,category,allergens,flagged")
        .eq("organization_id", organizationId)
        .or("location_id.eq." + locationId + ",location_id.is.null")
        .order("name")
        .limit(150);
      if (version !== requestVersion.current) return;
      if (result.error) {
        setLoadError(true);
        return;
      }
      setRows(
        ((result.data ?? []) as Recipe[]).map((row) => ({
          ...row,
          allergens: (row.allergens || []).map(normalise),
        })),
      );
    } catch {
      if (version === requestVersion.current) setLoadError(true);
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
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.name.toLowerCase().includes(query.toLowerCase()) ||
          (row.category || "").toLowerCase().includes(query.toLowerCase()),
      ),
    [query, rows],
  );
  if (sessionLoading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh current recipe evidence"
        onPress={() => void load()}
        style={styles.refresh}
      >
        <Text style={styles.refreshText}>Refresh live recipes</Text>
      </Pressable>
      {loadError ? (
        <Text style={styles.review} accessibilityRole="alert">
          Recipe evidence is unavailable. Do not assume any allergen declaration is current.
        </Text>
      ) : loading ? (
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
              {row.flagged
                ? "Recipe flagged for review. Do not rely on its allergen details."
                : row.allergens.length
                  ? "Recorded allergens: " +
                    row.allergens.join(", ") +
                    ". Confirm the latest supplier specification."
                  : "No allergens recorded in this recipe. Do not assume allergen-free."}
            </Text>
          </View>
        ))
      )}
      {!loading && !loadError && visible.length === 0 && (
        <Text style={styles.empty}>No matching live menu items.</Text>
      )}
      <Text style={styles.disclaimer}>
        Saved recipe data is not an allergen approval. Allergen information must be kept current and verified. Ask about recipe changes,
        substitutions and cross-contamination controls before advising a customer.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { gap: 11, padding: 18, paddingBottom: 90 },
  refresh: {
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignSelf: "flex-start",
    borderRadius: 12,
    backgroundColor: "#222",
  },
  refreshText: { color: "#fff", fontSize: 14, fontWeight: "700" },
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
