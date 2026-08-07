import { Redirect, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Asset = {
  id: string;
  asset_code: string;
  qr_token: string;
  name: string;
  category: string | null;
  location: string | null;
  serial: string | null;
  status: string;
  next_service_at: string | null;
  retired_at: string | null;
};

export default function Assets() {
  const { session, loading } = useSession();
  const [rows, setRows] = useState<Asset[]>([]);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from("assets")
      .select(
        "id,asset_code,qr_token,name,category,location,serial,status,next_service_at,retired_at",
      )
      .order("name");
    setRows((data ?? []) as Asset[]);
    setRefreshing(false);
  }, []);
  useEffect(() => {
    if (session) void load();
  }, [load, session]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? rows.filter((row) =>
          [row.name, row.asset_code, row.serial, row.location]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle)),
        )
      : rows;
  }, [query, rows]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={styles.eyebrow}>EQUIPMENT CONTROL</Text>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={styles.title}>Scan. Check. Record.</Text>
          <Text style={styles.intro}>
            Open any item to see its details and complete timestamped history.
          </Text>
        </View>
        <Pressable style={styles.scan} onPress={() => router.push("/scan-asset")}>
          <Text style={styles.scanText}>Scan QR</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search name, code, serial or area"
      />
      {filtered.map((asset) => (
        <Pressable
          key={asset.id}
          style={styles.card}
          onPress={() =>
            router.push({ pathname: "/assets/[assetId]", params: { assetId: asset.qr_token } })
          }
        >
          <View style={styles.flex}>
            <Text style={styles.name}>{asset.name}</Text>
            <Text style={styles.code}>
              {asset.asset_code} · {asset.location || asset.category || "Equipment"}
            </Text>
            <Text style={styles.meta}>
              {asset.serial ? `Serial ${asset.serial}` : "Serial not recorded"}
              {asset.next_service_at
                ? ` · Due ${new Date(asset.next_service_at).toLocaleDateString("en-GB")}`
                : ""}
            </Text>
          </View>
          <Text style={[styles.status, asset.status === "attention" && styles.attention]}>
            {asset.retired_at ? "RETIRED" : asset.status.toUpperCase()} ›
          </Text>
        </Pressable>
      ))}
      {!refreshing && filtered.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No equipment found</Text>
          <Text style={styles.emptyText}>
            Add equipment and print QR labels in the web workspace.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { gap: 11, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  heading: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
  title: { fontSize: 25, fontWeight: "800" },
  intro: { color: "#666", fontSize: 14, lineHeight: 20, marginTop: 3 },
  scan: {
    alignItems: "center",
    backgroundColor: "#c8102e",
    borderRadius: 9,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  scanText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  search: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 48,
    padding: 12,
  },
  card: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e1e1e1",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 76,
    padding: 14,
  },
  name: { fontSize: 16, fontWeight: "800" },
  code: {
    color: "#555",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
    textTransform: "uppercase",
  },
  meta: { color: "#777", fontSize: 12, marginTop: 5 },
  status: { color: "#176b3a", fontSize: 11, fontWeight: "900" },
  attention: { color: "#b42318" },
  empty: {
    alignItems: "center",
    borderColor: "#ccc",
    borderRadius: 13,
    borderStyle: "dashed",
    borderWidth: 1,
    padding: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptyText: { color: "#777", fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: "center" },
});
