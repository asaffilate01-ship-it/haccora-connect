import { router } from "expo-router";
import {
  BellRing,
  BookOpenCheck,
  ChevronRight,
  ClipboardCheck,
  FileArchive,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  Lightbulb,
  ScanLine,
  ShieldCheck,
  Tag,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSession } from "@/lib/session";
import { cardShadow, colours, screen } from "@/lib/theme";

const ALL_TENANT_ROLES = ["owner", "manager", "chef", "staff"] as const;
const ALL_WORKSPACE_ROLES = [...ALL_TENANT_ROLES, "inspector"] as const;

type Tool = [string, string, readonly string[], LucideIcon];
type Group = [string, readonly Tool[]];

const groups: readonly Group[] = [
  [
    "Food safety",
    [
      ["Safe methods", "/safe-methods", ALL_TENANT_ROLES, BookOpenCheck],
      ["Allergen lookup", "/allergens", ALL_TENANT_ROLES, ShieldCheck],
      ["PPDS labels", "/ppds", ALL_TENANT_ROLES, Tag],
      ["Evidence readiness", "/inspection-readiness", ALL_WORKSPACE_ROLES, FileCheck2],
      ["Equipment & QR history", "/assets", ALL_WORKSPACE_ROLES, ScanLine],
    ],
  ],
  [
    "People",
    [
      ["Training & certificates", "/training", ALL_TENANT_ROLES, GraduationCap],
      ["Staff induction", "/inductions", ALL_TENANT_ROLES, ClipboardCheck],
      ["Fitness to work", "/fitness-to-work", ALL_TENANT_ROLES, HeartPulse],
      ["Staff compliance", "/staff-compliance", ["owner", "manager"], Users],
    ],
  ],
  [
    "Records & support",
    [
      ["Evidence library", "/documents", ALL_WORKSPACE_ROLES, FileArchive],
      ["Corrective actions", "/actions", ALL_TENANT_ROLES, BellRing],
      ["Compliance coach", "/coach", ["owner", "manager"], Lightbulb],
      ["Alerts & security", "/settings", ALL_WORKSPACE_ROLES, ShieldCheck],
    ],
  ],
];

export default function More() {
  const { role, organizationName, locationName } = useSession();
  const visibleGroups = groups
    .map(
      ([name, items]) =>
        [name, items.filter(([, , roles]) => !role || roles.includes(role))] as const,
    )
    .filter(([, items]) => items.length > 0);

  return (
    <ScrollView
      style={styles.canvas}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>WORKSPACE</Text>
      <Text style={styles.title}>All tools</Text>
      <Text numberOfLines={1} style={styles.workspace}>
        {[organizationName, locationName].filter(Boolean).join(" · ") || "Your Haccora workspace"}
      </Text>
      <Text style={styles.intro}>
        Frequent tasks stay under Log. Less-used evidence, people and management tools are grouped
        here.
      </Text>
      {visibleGroups.map(([name, items]) => (
        <View key={name} style={styles.group}>
          <Text style={styles.groupTitle}>{name}</Text>
          {items.map(([label, route, , Icon]) => (
            <Pressable
              accessibilityRole="button"
              key={route}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push(route)}
            >
              <View style={styles.icon}>
                <Icon color={colours.brand} size={17} strokeWidth={2.35} />
              </View>
              <Text style={styles.label}>{label}</Text>
              <ChevronRight color={colours.subtle} size={18} />
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: colours.canvas },
  page: { ...screen, gap: 10 },
  eyebrow: { color: colours.brand, fontSize: 9, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: colours.ink, fontSize: 21, fontWeight: "900", letterSpacing: -0.35 },
  workspace: { color: colours.ink, fontSize: 10.5, fontWeight: "800", marginTop: -5 },
  intro: { color: colours.muted, fontSize: 10.5, lineHeight: 15, marginBottom: 3 },
  group: {
    ...cardShadow,
    backgroundColor: colours.card,
    borderColor: colours.line,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupTitle: {
    backgroundColor: "#f1f1ed",
    color: colours.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    paddingHorizontal: 13,
    paddingVertical: 8,
    textTransform: "uppercase",
  },
  row: {
    alignItems: "center",
    borderTopColor: colours.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 49,
    paddingHorizontal: 12,
  },
  pressed: { backgroundColor: colours.brandSoft },
  icon: {
    alignItems: "center",
    backgroundColor: colours.brandSoft,
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  label: { color: colours.ink, flex: 1, fontSize: 11.5, fontWeight: "800" },
});
