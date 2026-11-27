import { Redirect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { readEvidencePages } from "@/lib/evidence-pages";
import { useSession } from "@/lib/session";
import { useFocusedEvidence } from "@/lib/use-focused-evidence";

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
  "cereals containing gluten": "gluten",
  crustacean: "crustaceans",
  crust: "crustaceans",
  eggs: "egg",
  peanuts: "peanut",
  soy: "soya",
  soybean: "soya",
  nuts: "tree nuts",
  nut: "tree nuts",
  "sulphur dioxide and sulphites": "sulphites",
  sulphite: "sulphites",
  sulph: "sulphites",
  mollusc: "molluscs",
};
type Recipe = {
  id: string;
  name: string;
  category: string | null;
  allergens: unknown;
  flagged: boolean;
};
const normalise = (value: string) => {
  const key = value.toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(aliases, key) ? aliases[key] : key;
};

export default function Allergens() {
  const workspace = useSession();
  const { session, workspaceReady, loading, role, serviceStatus } = workspace;
  const { organizationId, locationId } = workspace;
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (role === "inspector") return <Redirect href="/inspection-readiness" />;
  if (!organizationId || !locationId || !role) {
    return <Text style={styles.empty}>Select an authorised premises to review allergens.</Text>;
  }
  return (
    <SiteAllergens
      key={`${session.user.id}:${organizationId}:${locationId}:${role}`}
      organizationId={organizationId}
      locationId={locationId}
    />
  );
}

type SiteScope = { organizationId: string; locationId: string };

function SiteAllergens({ organizationId, locationId }: SiteScope) {
  const [query, setQuery] = useState("");
  const load = useCallback(
    (isCurrent: () => boolean) =>
      readEvidencePages<Recipe>(
        (from, to) =>
          supabase
            .from("recipes")
            .select("id,name,category,allergens,flagged", { count: "exact" })
            .eq("organization_id", organizationId)
            .or(`location_id.eq.${locationId},location_id.is.null`)
            .order("name")
            .order("id")
            .range(from, to),
        (row) => row.id,
        isCurrent,
      ),
    [organizationId, locationId],
  );
  const { data, status, refresh } = useFocusedEvidence(load);
  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (data ?? []).filter((row) => {
      const haystack = `${row.name} ${row.category ?? ""}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [query, data]);

  return (
    <FlatList
      data={visible}
      keyExtractor={(row) => row.id}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
      refreshing={status === "loading"}
      onRefresh={refresh}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.eyebrow}>RECORDED MENU EVIDENCE</Text>
          <Text style={styles.title}>Allergen lookup</Text>
          <Text style={styles.intro}>
            Review saved site and shared recipes. Verify current supplier specifications before
            advising customers.
          </Text>
          <TextInput
            accessibilityLabel="Search dishes"
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search dish or category"
            returnKeyType="search"
          />
          {status === "ready" && (
            <Text style={styles.meta} accessibilityLiveRegion="polite">
              {visible.length} of {data?.length ?? 0} visible recipes
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh allergen evidence"
            disabled={status === "loading"}
            onPress={refresh}
            style={styles.refresh}
          >
            <Text style={styles.refreshLabel}>
              {status === "error" ? "Retry loading" : "Refresh evidence"}
            </Text>
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <Text accessibilityLiveRegion="polite" style={styles.empty}>
          {status === "loading"
            ? "Loading recorded menu evidence…"
            : status === "error"
              ? "Allergen evidence unavailable. Do not infer a dish is safe from missing records."
              : "No matching recipes are visible."}
        </Text>
      }
      ListFooterComponent={
        <Text style={styles.disclaimer}>
          Allergen information must be kept current and verified. Ask about recipe changes,
          substitutions and cross-contamination controls before advising a customer.
        </Text>
      }
      renderItem={({ item: row }) => {
        const recorded = Array.isArray(row.allergens) ? row.allergens : null;
        const valid =
          recorded !== null &&
          recorded.every((value) => typeof value === "string" && value.trim().length > 0);
        const declarations = valid && recorded ? [...new Set(recorded.map(normalise))] : [];
        const unknown = declarations.filter((value) => !ALLERGENS.includes(value));
        const needsReview = row.flagged !== false || !valid || unknown.length > 0;
        return (
          <View style={styles.card}>
            <View style={styles.top}>
              <View style={styles.flex}>
                {!!row.category && <Text style={styles.category}>{row.category}</Text>}
                <Text style={styles.cardTitle}>{row.name}</Text>
              </View>
              {needsReview && <Text style={styles.review}>NEEDS REVIEW</Text>}
            </View>
            {!!declarations.length && (
              <View style={styles.tags}>
                {declarations.map((allergen) => (
                  <Text key={allergen} style={[styles.tag, styles.activeTag]}>
                    {allergen}
                  </Text>
                ))}
              </View>
            )}
            <Text style={styles.meta}>
              {!valid
                ? "Recorded declarations are unavailable or invalid. Verify before advising."
                : declarations.length
                  ? `Recorded declarations: ${declarations.join(", ")}`
                  : "No allergens declared in this saved recipe. This is not a guarantee of absence."}
            </Text>
            {unknown.length > 0 && (
              <Text style={styles.meta}>
                Unrecognised declarations require review: {unknown.join(", ")}.
              </Text>
            )}
          </View>
        );
      }}
    />
  );
}
const styles = StyleSheet.create({
  page: {
    gap: 12,
    padding: 18,
    paddingBottom: 90,
    alignSelf: "center",
    width: "100%",
    maxWidth: 760,
  },
  header: { gap: 10 },
  refresh: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  refreshLabel: { fontSize: 14, fontWeight: "700", color: "#c8102e" },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  search: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
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
  cardTitle: { fontSize: 16, fontWeight: "800", marginTop: 1 },
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
  meta: { color: "#555", fontSize: 13, lineHeight: 19 },
  empty: { color: "#777", fontSize: 12, padding: 24, textAlign: "center" },
  disclaimer: { color: "#777", fontSize: 10, lineHeight: 15 },
});
