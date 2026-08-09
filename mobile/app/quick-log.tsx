import { router } from "expo-router";
import {
  AlertTriangle,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  ScanLine,
  Sparkles,
  Thermometer,
  Truck,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { cardShadow, colours, screen, typeScale } from "@/lib/theme";
import { useSession } from "@/lib/session";

type Action = [string, string, string, LucideIcon, string?];
const actions: Action[] = [
  ["Temperature", "Fridge, freezer, cooking or cooling reading", "/temperature", Thermometer],
  ["Daily check", "Opening, closing and routine evidence", "/checks", ClipboardCheck],
  ["Delivery", "Accept or reject incoming goods", "/goods-in", Truck, "purchasing.receive"],
  ["Cleaning", "Complete the site cleaning schedule", "/cleaning", Sparkles],
  ["Daily diary", "Record problems and corrective action", "/diary", BookOpenCheck],
  ["Incident", "Report a food-safety event", "/incidents", AlertTriangle, "incidents.report"],
  [
    "Scan equipment",
    "Open its details and add a timestamped record",
    "/scan-asset",
    ScanLine,
    "assets.record",
  ],
];

export default function QuickLog() {
  const { actionPermissions } = useSession();
  const visibleActions = actions.filter(
    ([, , , , permission]) => !permission || actionPermissions.includes(permission),
  );
  return (
    <ScrollView
      style={styles.canvas}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>QUICK LOG</Text>
      <Text style={styles.title}>What are you recording?</Text>
      <Text style={styles.intro}>
        Choose one task. Haccora opens the shortest safe workflow and keeps its evidence
        attributable.
      </Text>
      <View style={styles.grid}>
        {visibleActions.map(([title, body, route, Icon]) => (
          <Pressable
            accessibilityLabel={`${title}. ${body}`}
            accessibilityRole="button"
            key={route}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(route)}
          >
            <View style={styles.icon}>
              <Icon color={colours.brand} size={20} strokeWidth={2.4} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
            <ChevronRight color={colours.subtle} size={19} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: colours.canvas },
  page: { ...screen, gap: 9 },
  eyebrow: {
    color: colours.brand,
    fontSize: typeScale.micro,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  title: {
    color: colours.ink,
    fontSize: typeScale.title,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
  intro: { color: colours.muted, fontSize: typeScale.body, lineHeight: 16, marginBottom: 4 },
  grid: { gap: 8 },
  card: {
    ...cardShadow,
    alignItems: "center",
    backgroundColor: colours.card,
    borderColor: colours.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 66,
    padding: 12,
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  icon: {
    alignItems: "center",
    backgroundColor: colours.brandSoft,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  flex: { flex: 1 },
  cardTitle: { color: colours.ink, fontSize: typeScale.label, fontWeight: "900" },
  body: { color: colours.muted, fontSize: typeScale.caption, lineHeight: 14, marginTop: 2 },
});
