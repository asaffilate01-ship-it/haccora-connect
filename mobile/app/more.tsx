import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";

const ALL_TENANT_ROLES = ["owner", "manager", "chef", "staff"] as const;
const ALL_WORKSPACE_ROLES = [...ALL_TENANT_ROLES, "inspector"] as const;

const groups = [
  [
    "Food safety",
    [
      ["Safe methods", "/safe-methods", ALL_TENANT_ROLES],
      ["Allergen lookup", "/allergens", ALL_TENANT_ROLES],
      ["PPDS labels", "/ppds", ALL_TENANT_ROLES],
      ["Evidence readiness", "/inspection-readiness", ALL_WORKSPACE_ROLES],
      ["Equipment & QR history", "/assets", ALL_WORKSPACE_ROLES],
    ],
  ],
  [
    "People",
    [
      ["Training & certificates", "/training", ALL_TENANT_ROLES],
      ["Staff induction", "/inductions", ALL_TENANT_ROLES],
      ["Fitness to work", "/fitness-to-work", ALL_TENANT_ROLES],
      ["Staff compliance", "/staff-compliance", ["owner", "manager"]],
    ],
  ],
  [
    "Records & support",
    [
      ["Evidence library", "/documents", ALL_WORKSPACE_ROLES],
      ["Corrective actions", "/actions", ALL_TENANT_ROLES],
      ["Compliance coach", "/coach", ["owner", "manager"]],
      ["Alerts & security", "/settings", ALL_WORKSPACE_ROLES],
    ],
  ],
] as const;
export default function More() {
  const { role } = useSession();
  const visibleGroups = groups
    .map(
      ([name, items]) =>
        [
          name,
          items.filter(([, , roles]) => !role || (roles as readonly string[]).includes(role)),
        ] as const,
    )
    .filter(([, items]) => items.length > 0);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>WORKSPACE</Text>
      <Text style={styles.title}>All tools</Text>
      <Text style={styles.intro}>
        Frequently used logging tools stay under Log. Everything else is grouped here.
      </Text>
      {visibleGroups.map(([name, items]) => (
        <View key={name} style={styles.group}>
          <Text style={styles.groupTitle}>{name}</Text>
          {items.map(([label, route]) => (
            <Pressable key={route} style={styles.row} onPress={() => router.push(route)}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { gap: 12, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  group: {
    backgroundColor: "#fff",
    borderColor: "#e1e1e1",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupTitle: {
    backgroundColor: "#f7f7f7",
    color: "#555",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    textTransform: "uppercase",
  },
  row: {
    alignItems: "center",
    borderTopColor: "#eee",
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 13,
  },
  label: { flex: 1, fontSize: 12, fontWeight: "700" },
  arrow: { color: "#777", fontSize: 20 },
});
