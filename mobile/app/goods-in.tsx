import { Redirect } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { enqueue } from "@/lib/offline-queue";
import { useSession } from "@/lib/session";

export default function GoodsIn() {
  const { session, workspaceReady, organizationId, locationId, loading } = useSession();
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [reference, setReference] = useState("");
  const [lot, setLot] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [temperature, setTemperature] = useState("");
  const [useBy, setUseBy] = useState("");
  const [packagingOk, setPackagingOk] = useState(true);
  const [conditionOk, setConditionOk] = useState(true);
  const [allergenLabelOk, setAllergenLabelOk] = useState(true);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  if (!workspaceReady) return <Redirect href="/onboarding" />;

  const save = async (status: "accepted" | "rejected") => {
    const temp = temperature.trim() ? Number(temperature.replace(",", ".")) : null;
    const qty = quantity.trim() ? Number(quantity.replace(",", ".")) : null;
    const tempOk = temp === null ? null : temp <= 8;
    const failed = !packagingOk || !conditionOk || !allergenLabelOk || tempOk === false;
    if (!organizationId || supplier.trim().length < 2 || product.trim().length < 2) {
      return Alert.alert("Add delivery details", "Supplier and product are required.");
    }
    if (
      (temp !== null && !Number.isFinite(temp)) ||
      (qty !== null && (!Number.isFinite(qty) || qty <= 0))
    ) {
      return Alert.alert("Check the values", "Temperature and quantity must be valid numbers.");
    }
    if (useBy && !/^\d{4}-\d{2}-\d{2}$/.test(useBy))
      return Alert.alert("Check use-by date", "Use YYYY-MM-DD.");
    if (status === "accepted" && failed)
      return Alert.alert(
        "Delivery cannot be accepted",
        "A failed check must be rejected and have a corrective action.",
      );
    if (status === "rejected" && correctiveAction.trim().length < 3)
      return Alert.alert(
        "Corrective action required",
        "Record what happened to the rejected delivery or affected items.",
      );
    setBusy(true);
    try {
      await enqueue("goods_in_logs", {
        organization_id: organizationId,
        location_id: locationId,
        user_id: session.user.id,
        supplier: supplier.trim(),
        product: product.trim(),
        delivery_reference: reference.trim() || null,
        batch_lot: lot.trim() || null,
        quantity: qty,
        unit: unit.trim() || null,
        delivery_temp_c: temp,
        temp_ok: tempOk,
        packaging_ok: packagingOk,
        condition_ok: conditionOk,
        allergen_label_ok: allergenLabelOk,
        use_by: useBy || null,
        status,
        corrective_action: status === "rejected" ? correctiveAction.trim() : null,
        received_at: new Date().toISOString(),
      });
      setSupplier("");
      setProduct("");
      setReference("");
      setLot("");
      setQuantity("");
      setTemperature("");
      setUseBy("");
      setCorrectiveAction("");
      setPackagingOk(true);
      setConditionOk(true);
      setAllergenLabelOk(true);
      Alert.alert("Delivery recorded", "The evidence is saved or securely queued for sync.");
    } catch {
      Alert.alert("Not saved", "Encrypted app storage was unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const failed =
    !packagingOk ||
    !conditionOk ||
    !allergenLabelOk ||
    (temperature.trim() !== "" && Number(temperature.replace(",", ".")) > 8);
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>TRACEABILITY</Text>
      <Text style={styles.title}>Delivery check</Text>
      <Text style={styles.intro}>
        Check food at receipt and keep supplier, batch, date and corrective-action evidence.
      </Text>
      <View style={styles.grid}>
        <Field value={supplier} setValue={setSupplier} placeholder="Supplier" half />
        <Field value={product} setValue={setProduct} placeholder="Product" half />
        <Field
          value={reference}
          setValue={setReference}
          placeholder="Delivery note reference"
          half
        />
        <Field value={lot} setValue={setLot} placeholder="Batch / lot" half />
        <Field value={quantity} setValue={setQuantity} placeholder="Quantity" numeric half />
        <Field value={unit} setValue={setUnit} placeholder="Unit" half />
        <Field
          value={temperature}
          setValue={setTemperature}
          placeholder="Delivery temperature °C"
          numeric
          half
        />
        <Field value={useBy} setValue={setUseBy} placeholder="Use-by YYYY-MM-DD" half />
      </View>
      <View style={styles.checks}>
        <Check label="Packaging intact" value={packagingOk} setValue={setPackagingOk} />
        <Check label="Condition acceptable" value={conditionOk} setValue={setConditionOk} />
        <Check
          label="Allergen information present"
          value={allergenLabelOk}
          setValue={setAllergenLabelOk}
        />
      </View>
      {failed && (
        <Text style={styles.warning}>
          One or more checks failed. Reject the affected delivery and record the action taken.
        </Text>
      )}
      <TextInput
        style={[styles.input, styles.area]}
        multiline
        value={correctiveAction}
        onChangeText={setCorrectiveAction}
        placeholder="Corrective action for rejected items"
      />
      <View style={styles.actions}>
        <Pressable
          disabled={busy || failed}
          style={[styles.accept, failed && styles.disabled]}
          onPress={() => void save("accepted")}
        >
          <Text style={styles.actionText}>Accept delivery</Text>
        </Pressable>
        <Pressable disabled={busy} style={styles.reject} onPress={() => void save("rejected")}>
          <Text style={styles.rejectText}>Reject / return</Text>
        </Pressable>
      </View>
      <Text style={styles.disclaimer}>
        The business must set suitable acceptance limits for each product and follow its HACCP-based
        procedures and current official guidance.
      </Text>
    </ScrollView>
  );
}

function Field({
  value,
  setValue,
  placeholder,
  numeric,
  half,
}: {
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
  half?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, half && styles.half]}
      value={value}
      onChangeText={setValue}
      placeholder={placeholder}
      keyboardType={numeric ? "decimal-pad" : "default"}
    />
  );
}
function Check({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (value: boolean) => void;
}) {
  return (
    <View style={styles.checkRow}>
      <Text style={styles.checkLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ false: "#efb2ac", true: "#93d3ad" }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: { gap: 12, padding: 18, paddingBottom: 90 },
  eyebrow: { color: "#c8102e", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: "800" },
  intro: { color: "#666", fontSize: 12, lineHeight: 17 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 12,
    padding: 11,
    width: "100%",
  },
  half: { width: "48.5%" },
  area: { minHeight: 78, textAlignVertical: "top" },
  checks: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
  },
  checkRow: {
    alignItems: "center",
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
  },
  checkLabel: { fontSize: 12, fontWeight: "700" },
  warning: {
    backgroundColor: "#fff0c7",
    borderRadius: 10,
    color: "#7a5000",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    padding: 11,
  },
  actions: { flexDirection: "row", gap: 8 },
  accept: {
    alignItems: "center",
    backgroundColor: "#176b3a",
    borderRadius: 10,
    flex: 1,
    padding: 12,
  },
  reject: {
    alignItems: "center",
    borderColor: "#b42318",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  actionText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  rejectText: { color: "#b42318", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.35 },
  disclaimer: { color: "#777", fontSize: 10, lineHeight: 15 },
});
