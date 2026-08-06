import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
const groups = [
  [
    "Food safety",
    [
      ["Safe methods", "/safe-methods"],
      ["Allergen lookup", "/allergens"],
      ["PPDS labels", "/ppds"],
      ["Evidence readiness", "/inspection-readiness"],
    ],
  ],
  [
    "People",
    [
      ["Training & certificates", "/training"],
      ["Staff induction", "/inductions"],
      ["Fitness to work", "/fitness-to-work"],
      ["Staff compliance", "/staff-compliance"],
    ],
  ],
  [
    "Records & support",
    [
      ["Evidence library", "/documents"],
      ["Corrective actions", "/actions"],
      ["Compliance coach", "/coach"],
      ["Alerts & security", "/settings"],
    ],
  ],
] as const;
export default function More() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>WORKSPACE</Text>
      <Text style={styles.title}>All tools</Text>
      <Text style={styles.intro}>
        Frequently used logging tools stay under Log. Everything else is grouped here.
      </Text>
      {groups.map(([name, items]) => (
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
