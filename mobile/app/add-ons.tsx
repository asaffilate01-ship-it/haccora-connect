import { Redirect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { colours } from "@/lib/theme";
import {
  BUSINESS_SERVICES,
  SERVICE_CATEGORIES,
  SERVICE_REQUEST_STATUS,
  filterBusinessServices,
  type BusinessService,
} from "../../shared/business-services";

type Request = {
  id: string;
  case_number: number;
  business_service: string;
  status: string;
  created_at: string;
};

export default function BusinessAddOns() {
  const { session, role, organizationId, organizationName, loading, serviceStatus } = useSession();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All services");
  const [selected, setSelected] = useState<BusinessService | null>(null);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [bundle, setBundle] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<Request[]>([]);
  const [fetching, setFetching] = useState(false);
  const [readError, setReadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);
  const scope = `${session?.user.id ?? ""}:${organizationId ?? ""}`;
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const canManage = Boolean(
    session && role === "owner" && organizationId && serviceStatus === "active",
  );
  const filtered = useMemo(() => filterBusinessServices(query, category), [query, category]);

  const load = useCallback(async () => {
    if (!canManage) return;
    const requestedScope = scope;
    setFetching(true);
    setReadError("");
    try {
      const { data, error } = await supabase.rpc("get_my_business_service_requests");
      if (activeScope.current !== requestedScope) return;
      if (error) throw error;
      setRequests((data ?? []) as Request[]);
    } catch {
      if (activeScope.current === requestedScope)
        setReadError("Could not load requests. Check your connection and retry.");
    } finally {
      if (activeScope.current === requestedScope) setFetching(false);
    }
  }, [canManage, scope]);

  useEffect(() => {
    setSelected(null);
    setRequests([]);
    setNotice("");
    void load();
  }, [load]);

  const open = (item: BusinessService) => {
    setSelected(item);
    setMessage("");
    setConsent(false);
    setBundle(false);
    setSubmitError("");
  };
  const openLink = async (href: string) => {
    try {
      if (new URL(href).protocol !== "https:") throw new Error("Invalid provider URL");
      await Linking.openURL(href);
    } catch {
      Alert.alert("Could not open page", "Try again when your connection is available.");
    }
  };
  const submit = async () => {
    if (!canManage || !selected || !consent || message.trim().length < 10 || inFlight.current)
      return;
    const requestedScope = scope;
    inFlight.current = true;
    setBusy(true);
    setSubmitError("");
    try {
      const { error } = await supabase.rpc("request_business_service", {
        p_service: selected.id,
        p_message: message.trim(),
        p_contact_consent: consent,
        p_bundle_quote: bundle,
      });
      if (activeScope.current !== requestedScope) return;
      if (error) throw error;
      setSelected(null);
      setNotice(
        "Request saved. Follow replies in the Support centre. Your service has not been purchased or connected.",
      );
      await load();
    } catch {
      if (activeScope.current === requestedScope)
        setSubmitError(
          "We could not confirm your request. Retry to check for an existing request, or use the Support centre.",
        );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (loading) return <ActivityIndicator accessibilityLabel="Loading workspace" />;
  if (!session) return <Redirect href="/login" />;
  if (serviceStatus !== "active") return <Redirect href="/account-status" />;
  if (!canManage) return <Redirect href="/more" />;

  return (
    <>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>HACCORA BUSINESS NETWORK</Text>
          <Text style={styles.title}>More for your business</Text>
          <Text style={styles.heroBody}>
            AI, metrics, financial tools and business services for{" "}
            {organizationName || "your workspace"}.
          </Text>
          <Text style={styles.heroBody}>
            Choose a service or request a quote across several. Each add-on has its own agreed
            terms.
          </Text>
        </View>
        {notice ? (
          <Text accessibilityRole="alert" style={styles.notice}>
            {notice}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel="Search business services"
          placeholder="AI, GraphRAG, financials, recruitment…"
          value={query}
          onChangeText={setQuery}
          style={styles.input}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {SERVICE_CATEGORIES.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item }}
              onPress={() => setCategory(item)}
              style={[styles.chip, category === item && styles.activeChip]}
            >
              <Text style={category === item ? styles.activeChipText : styles.chipText}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.meta}>{filtered.length} services</Text>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.meta}>{item.category}</Text>
              <Text style={styles.badge}>{item.availability}</Text>
            </View>
            <Text style={styles.brand}>{item.name}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.description}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => open(item)}
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>Explore {item.name}</Text>
            </Pressable>
          </View>
        ))}
        {!filtered.length && (
          <Text style={styles.body}>No matching services. Try another search or category.</Text>
        )}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your service requests</Text>
          <Text style={styles.body}>
            Track enquiries and quotes. A resolved request does not activate a service.
          </Text>
          {fetching ? (
            <ActivityIndicator accessibilityLabel="Loading requests" />
          ) : readError ? (
            <>
              <Text accessibilityRole="alert" style={styles.error}>
                {readError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void load()}
                style={styles.secondary}
              >
                <Text>Retry requests</Text>
              </Pressable>
            </>
          ) : requests.length ? (
            requests.map((request) => (
              <View key={request.id} style={styles.request}>
                <Text style={styles.brand}>
                  {BUSINESS_SERVICES.find((item) => item.id === request.business_service)?.name ??
                    "Business service"}
                </Text>
                <Text style={styles.meta}>
                  #{request.case_number} ·{" "}
                  {new Date(request.created_at).toLocaleDateString("en-GB")}
                </Text>
                <Text style={styles.body}>
                  {SERVICE_REQUEST_STATUS[request.status] ?? "Under review"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.body}>No requests yet.</Text>
          )}
          <Pressable
            accessibilityRole="link"
            style={styles.secondary}
            onPress={() =>
              void openLink(
                new URL(
                  "/app/support",
                  process.env.EXPO_PUBLIC_WEB_APP_URL || "https://app.haccora.co.uk",
                ).toString(),
              )
            }
          >
            <Text style={styles.secondaryText}>Open Support centre in browser</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        visible={Boolean(selected)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!busy) setSelected(null);
        }}
      >
        <ScrollView contentContainerStyle={styles.modal} keyboardShouldPersistTaps="handled">
          {selected && (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => setSelected(null)}
                style={styles.close}
              >
                <Text>Close details</Text>
              </Pressable>
              <Text style={styles.brand}>
                {selected.name} · {selected.availability}
              </Text>
              <Text style={styles.cardTitle}>{selected.title}</Text>
              <Text style={styles.body}>{selected.description}</Text>
              {selected.benefits.map((benefit) => (
                <Text key={benefit} style={styles.body}>
                  • {benefit}
                </Text>
              ))}
              {selected.dataNeeded && (
                <View style={styles.notice}>
                  <Text style={styles.brand}>Data to agree before connection</Text>
                  <Text style={styles.body}>{selected.dataNeeded.join(" · ")}</Text>
                </View>
              )}
              {selected.reviewNote && <Text style={styles.body}>{selected.reviewNote}</Text>}
              {selected.href && (
                <Pressable
                  accessibilityRole="link"
                  style={styles.secondary}
                  onPress={() => void openLink(selected.href!)}
                >
                  <Text style={styles.secondaryText}>Visit {selected.name} in browser</Text>
                </Pressable>
              )}
              <Text style={styles.cardTitle}>Request help or a quote</Text>
              <TextInput
                accessibilityLabel="What does your business need?"
                placeholder="Tell us what you want to improve (at least 10 characters)"
                value={message}
                onChangeText={setMessage}
                maxLength={3000}
                multiline
                editable={!busy}
                style={[styles.input, styles.message]}
              />
              <View style={styles.row}>
                <Text style={[styles.body, styles.flex]}>
                  Include available multi-service offers in my quote.
                </Text>
                <Switch
                  accessibilityLabel="Include multi-service offers"
                  disabled={busy}
                  value={bundle}
                  onValueChange={setBundle}
                />
              </View>
              <View style={styles.row}>
                <Text style={[styles.body, styles.flex]}>
                  Haccora may review this request and contact me about the service. An introduction
                  or data connection needs separate agreement.
                </Text>
                <Switch
                  accessibilityLabel="Agree to Haccora reviewing and responding to this service enquiry"
                  disabled={busy}
                  value={consent}
                  onValueChange={setConsent}
                />
              </View>
              <Text style={styles.meta}>
                This saves an enquiry in your organisation’s Support centre. Prices and data access
                are agreed before activation.
              </Text>
              {submitError && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {submitError}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={busy || !consent || message.trim().length < 10}
                onPress={() => void submit()}
                style={[
                  styles.primary,
                  (busy || !consent || message.trim().length < 10) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryText}>
                  {busy ? "Saving request…" : "Save service request"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 18, paddingBottom: 110, gap: 14 },
  hero: { backgroundColor: colours.ink, borderRadius: 20, padding: 22, gap: 12 },
  eyebrow: { color: "#efbfc7", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "white", fontSize: 28, fontWeight: "800" },
  heroBody: { color: "#eee", fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: "white",
    borderColor: colours.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  flex: { flex: 1 },
  brand: { color: colours.brand, fontWeight: "800", fontSize: 14 },
  cardTitle: { fontSize: 21, fontWeight: "800", color: colours.ink },
  body: { color: "#444", fontSize: 14, lineHeight: 21 },
  meta: { fontSize: 12, color: "#666", lineHeight: 18 },
  badge: {
    backgroundColor: "#f0efeb",
    borderRadius: 10,
    padding: 6,
    fontSize: 11,
    fontWeight: "700",
  },
  filters: { gap: 8 },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colours.line,
    paddingHorizontal: 16,
    backgroundColor: "white",
  },
  activeChip: { backgroundColor: colours.brand, borderColor: colours.brand },
  chipText: { color: colours.ink, fontWeight: "700" },
  activeChipText: { color: "white", fontWeight: "700" },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  secondary: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.line,
    borderRadius: 12,
    padding: 12,
  },
  secondaryText: { color: colours.ink, fontWeight: "700", fontSize: 14 },
  primary: {
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colours.brand,
    borderRadius: 12,
    padding: 14,
  },
  primaryText: { color: "white", fontWeight: "800", fontSize: 15 },
  disabled: { opacity: 0.45 },
  notice: {
    backgroundColor: "#eef5ef",
    borderRadius: 12,
    padding: 14,
    color: "#20482d",
    lineHeight: 22,
  },
  error: { color: "#a31024", lineHeight: 21 },
  request: { gap: 5, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colours.line },
  modal: { padding: 24, paddingTop: 32, paddingBottom: 48, gap: 18 },
  close: { minHeight: 48, justifyContent: "center", alignItems: "flex-end" },
  message: { minHeight: 110, textAlignVertical: "top" },
});
