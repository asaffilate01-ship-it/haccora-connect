import { router, usePathname } from "expo-router";
import {
  Bell,
  ClipboardCheck,
  Ellipsis,
  FileCheck2,
  LayoutDashboard,
  Plus,
  ScanLine,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { colours, typeScale } from "@/lib/theme";

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  primary?: boolean;
};

const operationsItems: NavItem[] = [
  { label: "Today", path: "/dashboard", icon: LayoutDashboard },
  { label: "Checks", path: "/checks", icon: ClipboardCheck },
  { label: "Log", path: "/quick-log", icon: Plus, primary: true },
  { label: "Alerts", path: "/alerts", icon: Bell },
  { label: "More", path: "/more", icon: Ellipsis },
];

const inspectorItems: NavItem[] = [
  { label: "Evidence", path: "/inspection-readiness", icon: FileCheck2 },
  { label: "Equipment", path: "/assets", icon: ScanLine },
  { label: "More", path: "/more", icon: Ellipsis },
];

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { role } = useSession();
  if (["/", "/login", "/onboarding", "/platform-access", "/account-status"].includes(pathname)) {
    return null;
  }
  const items = role === "inspector" ? inspectorItems : operationsItems;
  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 7) }]}
      accessibilityRole="tablist"
    >
      {items.map((item) => {
        const active = pathname === item.path;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.path}
            accessibilityLabel={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={4}
            onPress={() => router.replace(item.path)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View
              style={[styles.icon, active && styles.iconActive, item.primary && styles.primaryIcon]}
            >
              <Icon
                color={item.primary ? "#ffffff" : active ? colours.brand : colours.subtle}
                size={item.primary ? 23 : 20}
                strokeWidth={active || item.primary ? 2.7 : 2.1}
              />
            </View>
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                item.primary && styles.primaryLabel,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colours.card,
    borderTopColor: colours.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    paddingHorizontal: 5,
    paddingTop: 7,
    position: "absolute",
    right: 0,
  },
  item: { alignItems: "center", flex: 1, gap: 2, minHeight: 49 },
  pressed: { opacity: 0.7 },
  icon: { alignItems: "center", borderRadius: 10, height: 29, justifyContent: "center", width: 36 },
  iconActive: { backgroundColor: colours.brandSoft },
  primaryIcon: {
    backgroundColor: colours.brand,
    borderRadius: 18,
    height: 36,
    marginTop: -13,
    width: 48,
  },
  label: { color: colours.subtle, fontSize: typeScale.micro, fontWeight: "700" },
  labelActive: { color: colours.ink, fontWeight: "900" },
  primaryLabel: { color: colours.brand, fontWeight: "900", marginTop: -1 },
});
