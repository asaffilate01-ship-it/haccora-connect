import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const items = [
  { label: "Today", path: "/dashboard", icon: "✓" },
  { label: "Log", path: "/temperature", icon: "°" },
  { label: "Actions", path: "/actions", icon: "!" },
  { label: "Evidence", path: "/inspection-readiness", icon: "▤" },
  { label: "Coach", path: "/coach", icon: "✦" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (["/", "/login", "/onboarding"].includes(pathname)) return null;
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {items.map((item) => {
        const active = pathname === item.path;
        return (
          <Pressable
            key={item.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.push(item.path)}
            style={styles.item}
          >
            <View style={[styles.icon, active && styles.iconActive]}>
              <Text style={[styles.iconText, active && styles.iconTextActive]}>{item.icon}</Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#fff",
    borderTopColor: "#e5e5e5",
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    paddingBottom: 8,
    paddingTop: 8,
    position: "absolute",
    right: 0,
  },
  item: { alignItems: "center", flex: 1, gap: 3, minHeight: 46 },
  icon: { alignItems: "center", borderRadius: 9, height: 25, justifyContent: "center", width: 31 },
  iconActive: { backgroundColor: "#fce8e6" },
  iconText: { color: "#777", fontSize: 16, fontWeight: "900" },
  iconTextActive: { color: "#c8102e" },
  label: { color: "#666", fontSize: 10, fontWeight: "700" },
  labelActive: { color: "#111" },
});
