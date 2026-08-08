import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { uploadEvidence } from "@/lib/evidence-upload";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type DocumentRow = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  created_at: string;
  storage_path: string | null;
  file_url: string | null;
  mime_type: string | null;
  file_size: number | null;
  expires_at: string | null;
  subject_user_id: string | null;
};

type Person = { id: string; full_name: string | null };

export default function Documents() {
  const { session, organizationId, locationId, role, loading } = useSession();
  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [title, setTitle] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [subjectUserId, setSubjectUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [documents, profiles] = await Promise.all([
      supabase
        .from("documents")
        .select(
          "id,user_id,title,category,created_at,storage_path,file_url,mime_type,file_size,expires_at,subject_user_id",
        )
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("profiles").select("id,full_name").order("full_name"),
    ]);
    setRows((documents.data ?? []) as DocumentRow[]);
    setPeople((profiles.data ?? []) as Person[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const upload = async (
    asset: { uri: string; name?: string | null; mimeType?: string | null },
    category: string,
  ) => {
    if (!organizationId) return;
    if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
      Alert.alert("Check expiry date", "Use YYYY-MM-DD, for example 2027-08-06.");
      return;
    }
    setBusy(true);
    try {
      await uploadEvidence({
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType,
        organizationId,
        locationId,
        userId: session.user.id,
        title: title.trim() || asset.name || `Evidence ${new Date().toLocaleDateString("en-GB")}`,
        category,
        subjectUserId,
        documentKind: subjectUserId ? "staff_compliance" : null,
        expiresAt: expiresOn ? `${expiresOn}T23:59:59.000Z` : null,
      });
      setTitle("");
      setExpiresOn("");
      setSubjectUserId(null);
      await load();
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Unknown error");
    }
    setBusy(false);
  };
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/csv"],
    });
    if (!result.canceled) void upload(result.assets[0], "mobile_upload");
  };
  const camera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera permission required");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled)
      void upload(
        {
          uri: result.assets[0].uri,
          name: result.assets[0].fileName ?? "evidence.jpg",
          mimeType: result.assets[0].mimeType,
        },
        "camera_evidence",
      );
  };
  const openDocument = async (row: DocumentRow) => {
    setOpeningId(row.id);
    try {
      let url = row.file_url;
      if (row.storage_path) {
        const { data: scanStatus, error: scanError } = await supabase.rpc(
          "get_document_scan_status",
          { p_document_id: row.id },
        );
        if (scanError) throw scanError;
        if (scanStatus !== "clean") {
          const message =
            scanStatus === "infected"
              ? "This file was blocked by the security scan. Upload a clean replacement."
              : scanStatus === "failed" || scanStatus === "dead_letter"
                ? "The security scan could not be completed. Ask an administrator to review it."
                : "The file is still being security scanned. Try again shortly.";
          Alert.alert("File not available", message);
          return;
        }
        const { data: signed, error: signedError } = await supabase.storage
          .from("documents")
          .createSignedUrl(row.storage_path, 5 * 60);
        if (signedError || !signed?.signedUrl) {
          throw signedError ?? new Error("Could not create a protected download link");
        }
        url = signed.signedUrl;
      }
      if (!url) {
        Alert.alert("No file attached", "This record contains metadata only.");
        return;
      }
      if (!row.storage_path && !url.startsWith("https://")) {
        throw new Error("External evidence links must use HTTPS");
      }
      if (!(await Linking.canOpenURL(url))) throw new Error("This file cannot be opened safely");
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Could not open evidence", error instanceof Error ? error.message : "Try again.");
    } finally {
      setOpeningId(null);
    }
  };
  const archiveDocument = (row: DocumentRow) => {
    Alert.alert(
      "Archive evidence?",
      "The record remains retained and time-stamped for audit, but leaves the active library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("documents")
              .update({ archived_at: new Date().toISOString() })
              .eq("id", row.id);
            if (error) Alert.alert("Could not archive evidence", error.message);
            else await load();
          },
        },
      ],
    );
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.eyebrow}>PRIVATE EVIDENCE</Text>
      <Text style={styles.title}>Evidence library</Text>
      <Text style={styles.intro}>
        Uploads use tenant/user paths and remain unavailable until malware scanning reports clean.
      </Text>
      <View style={styles.form}>
        <Text style={styles.formTitle}>Upload details</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Document title (optional)"
          style={styles.input}
        />
        <TextInput
          value={expiresOn}
          onChangeText={setExpiresOn}
          placeholder="Expiry date YYYY-MM-DD (optional)"
          autoCapitalize="none"
          maxLength={10}
          style={styles.input}
        />
        {(role === "owner" || role === "manager") && people.length > 0 && (
          <View style={styles.people}>
            <Text style={styles.hint}>Assign to staff member</Text>
            <Pressable
              style={[styles.person, subjectUserId === null && styles.personSelected]}
              onPress={() => setSubjectUserId(null)}
            >
              <Text style={subjectUserId === null ? styles.personSelectedText : styles.personText}>
                Business-wide
              </Text>
            </Pressable>
            {people.map((person) => (
              <Pressable
                key={person.id}
                style={[styles.person, subjectUserId === person.id && styles.personSelected]}
                onPress={() => setSubjectUserId(person.id)}
              >
                <Text
                  style={
                    subjectUserId === person.id ? styles.personSelectedText : styles.personText
                  }
                >
                  {person.full_name || "Unnamed staff member"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <View style={styles.buttons}>
        <Pressable disabled={busy} style={styles.primary} onPress={() => void camera()}>
          <Text style={styles.primaryText}>{busy ? "Uploading…" : "Take photo"}</Text>
        </Pressable>
        <Pressable disabled={busy} style={styles.secondary} onPress={() => void pick()}>
          <Text style={styles.secondaryText}>Choose document</Text>
        </Pressable>
      </View>
      {rows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.cardTitle}>{row.title}</Text>
          <Text style={styles.meta}>
            {row.category.replaceAll("_", " ")} · {new Date(row.created_at).toLocaleString("en-GB")}
          </Text>
          <Text style={styles.pending}>
            {row.storage_path
              ? "Protected file · scan checked before every download"
              : row.file_url
                ? "External HTTPS evidence"
                : "Metadata only"}
          </Text>
          {row.file_size && (
            <Text style={styles.fileMeta}>
              {row.mime_type || "File"} · {(row.file_size / 1024).toFixed(0)} KB
            </Text>
          )}
          {row.expires_at && (
            <Text style={styles.expiry}>
              Expires {new Date(row.expires_at).toLocaleDateString("en-GB")}
            </Text>
          )}
          <View style={styles.cardActions}>
            {(row.storage_path || row.file_url) && (
              <Pressable
                accessibilityRole="button"
                disabled={openingId === row.id}
                style={styles.openButton}
                onPress={() => void openDocument(row)}
              >
                <Text style={styles.openButtonText}>
                  {openingId === row.id ? "Checking security…" : "Open securely"}
                </Text>
              </Pressable>
            )}
            {(row.user_id === session.user.id || role === "owner" || role === "manager") && (
              <Pressable
                accessibilityRole="button"
                style={styles.archiveButton}
                onPress={() => archiveDocument(row)}
              >
                <Text style={styles.archiveButtonText}>Archive</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 13 },
  eyebrow: { color: "#e43f2c", fontWeight: "900", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "800" },
  intro: { color: "#666", lineHeight: 20 },
  form: {
    backgroundColor: "white",
    borderColor: "#ddd",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  formTitle: { fontSize: 15, fontWeight: "800" },
  input: {
    borderColor: "#bbb",
    borderRadius: 11,
    borderWidth: 1,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  people: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  hint: { color: "#666", fontSize: 11, width: "100%" },
  person: {
    borderColor: "#bbb",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  personSelected: { backgroundColor: "#c8102e", borderColor: "#c8102e" },
  personText: { fontSize: 11, fontWeight: "700" },
  personSelectedText: { color: "white", fontSize: 11, fontWeight: "800" },
  buttons: { flexDirection: "row", gap: 10, flexWrap: "wrap", marginVertical: 5 },
  primary: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: "#e43f2c",
  },
  primaryText: { color: "white", fontWeight: "800" },
  secondary: {
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbb",
  },
  secondaryText: { fontWeight: "800" },
  card: {
    backgroundColor: "white",
    padding: 17,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cardTitle: { fontWeight: "800", fontSize: 16 },
  meta: { fontSize: 12, color: "#666", marginTop: 4 },
  pending: { fontSize: 11, color: "#9a6500", fontWeight: "700", marginTop: 6 },
  fileMeta: { color: "#666", fontSize: 10, marginTop: 4 },
  expiry: { color: "#555", fontSize: 11, fontWeight: "700", marginTop: 5 },
  cardActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  openButton: {
    backgroundColor: "#111",
    borderRadius: 10,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  openButtonText: { color: "white", fontSize: 11, fontWeight: "800" },
  archiveButton: {
    borderColor: "#ccc",
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  archiveButtonText: { color: "#555", fontSize: 11, fontWeight: "800" },
});
