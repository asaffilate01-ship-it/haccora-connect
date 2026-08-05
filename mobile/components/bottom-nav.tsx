import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const items = [
  { label: "Today", path: "/dashboard" },
  { label: "Log", path: "/temperature" },
  { label: "Actions", path: "/actions" },
  { label: "Evidence", path: "/inspection-readiness" },
  { label: "More", path: "/settings" },
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
            <View style={[styles.dot, active && styles.dotActive]} />
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
  item: { alignItems: "center", flex: 1, gap: 4, minHeight: 42 },
  dot: { backgroundColor: "transparent", borderRadius: 999, height: 4, width: 20 },
  dotActive: { backgroundColor: "#e43f2c" },
  label: { color: "#666", fontSize: 11, fontWeight: "700" },
  labelActive: { color: "#111" },
});
