import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
const actions = [
  ["Temperature", "Fridge, freezer, cooking or cooling reading", "/temperature", "°"],
  ["Daily check", "Opening, closing and routine evidence", "/checks", "✓"],
  ["Delivery", "Accept or reject incoming goods", "/goods-in", "↘"],
  ["Cleaning", "Complete the site cleaning schedule", "/cleaning", "✦"],
  ["Daily diary", "Record problems and corrective action", "/diary", "▤"],
  ["Incident", "Report a food-safety event", "/incidents", "!"],
  ["Scan equipment", "Open its details and add a timestamped record", "/scan-asset", "⌗"],
] as const;
export default function QuickLog() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>QUICK LOG</Text>
      <Text style={styles.title}>What are you recording?</Text>
      <Text style={styles.intro}>
        Choose one task. Haccora will take you directly to the shortest safe workflow.
      </Text>
      <View style={styles.grid}>
        {actions.map(([title, body, route, icon]) => (
          <Pressable key={route} style={styles.card} onPress={() => router.push(route)}>
            <Text style={styles.icon}>{icon}</Text>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { gap: 11, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  grid: { gap: 8, marginTop: 3 },
  card: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e1e1e1",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    padding: 13,
  },
  icon: {
    backgroundColor: "#fce8e6",
    borderRadius: 10,
    color: "#c8102e",
    fontSize: 17,
    fontWeight: "900",
    overflow: "hidden",
    paddingVertical: 8,
    textAlign: "center",
    width: 38,
  },
  flex: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  body: { color: "#666", fontSize: 10, lineHeight: 15, marginTop: 2 },
  arrow: { color: "#777", fontSize: 22 },
});
