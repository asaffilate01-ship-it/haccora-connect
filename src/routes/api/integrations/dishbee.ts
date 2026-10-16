import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const EventSchema = z.object({
  eventKey: z.string().min(3).max(240),
  eventType: z.string().min(3).max(160),
  dishbeeTenantId: z.string().uuid(),
  // Compliance evidence always requires an explicitly mapped premises.
  dishbeeLocationId: z.string().uuid(),
  subjectType: z.string().min(1).max(80),
  subjectId: z.string().min(1).max(200),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

type Event = z.infer<typeof EventSchema>;
type Db = any;
const NumberField = z
  .union([z.number(), z.string().trim().min(1)])
  .transform((value) => Number(value))
  .pipe(z.number().finite());
const PositiveNumber = NumberField.pipe(z.number().positive());
const OptionalNumber = NumberField.optional().nullable();
const Timestamp = z.string().datetime({ offset: true });
const Currency = z.enum(["GBP", "EUR"]);

// The order adapter intentionally receives no customer identity, phone, address,
// delivery instructions or payment details. It records source order lines only.
const DishbeeHandedOver = z
  .object({
    orderId: z.string().trim().min(3).max(160),
    items: z
      .array(
        z
          .object({
            lineId: z.string().trim().min(1).max(160),
            menuItemId: z.string().trim().min(1).max(160).optional(),
            name: z.string().trim().min(2).max(200),
            quantity: z.number().int().min(1).max(9999),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .refine(
    (order) => new Set(order.items.map((line) => line.lineId)).size === order.items.length,
    "duplicate_order_line_ids",
  );

// Unrecognised events must never create an apparently completed HACCP record.
const CompliancePayloads: Record<string, z.ZodType> = {
  "dishbee.compliance.checklist.completed": z
    .object({
      checklistName: z.string().trim().min(1),
      completedAt: Timestamp.optional(),
    })
    .passthrough(),
  "dishbee.compliance.waste.recorded": z
    .object({
      quantity: PositiveNumber,
      costPence: OptionalNumber,
      currency: Currency.optional(),
    })
    .passthrough(),
  "dishbee.compliance.supplier.receipt": z
    .object({
      supplierName: z.string().trim().min(1),
      deliveryTempC: OptionalNumber,
      tempOk: z.boolean().nullable().optional(),
      conditionOk: z.boolean().nullable().optional(),
      packagingOk: z.boolean().nullable().optional(),
      allergenLabelOk: z.boolean().nullable().optional(),
      receivedAt: Timestamp.optional(),
    })
    .passthrough(),
  "dishbee.compliance.allergens.updated": z
    .object({
      menuItemId: z.string().min(1),
      name: z.string().trim().min(1),
      allergens: z.array(z.string().trim().min(1)).max(14),
      pricePence: OptionalNumber,
      costPence: OptionalNumber,
      currency: Currency.optional(),
    })
    .passthrough(),
  "dishbee.compliance.temperature.recorded": z
    .object({
      reading: NumberField,
      targetMin: OptionalNumber,
      targetMax: OptionalNumber,
      inRange: z.boolean().optional(),
      loggedAt: Timestamp.optional(),
    })
    .passthrough()
    .refine(
      (p) => p.targetMin == null || p.targetMax == null || p.targetMin <= p.targetMax,
      "temperature_limits_reversed",
    )
    .refine((p) => p.targetMin != null || p.targetMax != null, "temperature_target_range_required"),
  "dishbee.compliance.incident.created": z
    .object({
      title: z.string().trim().min(1),
      occurredAt: Timestamp.optional(),
    })
    .passthrough(),
  "dishbee.compliance.corrective_action.created": z
    .object({
      description: z.string().trim().min(1),
      dueAt: Timestamp.optional(),
    })
    .passthrough(),
};

function eventCurrency(payload: Record<string, unknown>): "GBP" | "EUR" {
  // Dishbee's UK monetary payloads are in pence; EUR must be explicit.
  return Currency.parse(payload["currency"] ?? "GBP");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function bearer(request: Request) {
  const raw = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(raw);
  return match?.[1]?.trim() ?? "";
}
function text(value: unknown, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}
function number(value: unknown, fallback = 0) {
  if (value == null || value === "") return fallback;
  const next = Number(value);
  if (!Number.isFinite(next)) throw new Error("invalid_numeric_evidence");
  return next;
}
function date(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid_evidence_timestamp");
  return parsed.toISOString();
}

async function resolveLocation(db: Db, connectionId: string, dishbeeLocationId?: string | null) {
  if (!dishbeeLocationId) return null;
  const { data, error } = await db
    .from("dishbee_runtime_locations")
    .select("haccora_location_id")
    .eq("connection_id", connectionId)
    .eq("dishbee_location_id", dishbeeLocationId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("dishbee_location_not_mapped");
  return String(data.haccora_location_id);
}
async function entityMap(db: Db, connectionId: string, type: string, id: string) {
  const { data, error } = await db
    .from("dishbee_runtime_entity_maps")
    .select("haccora_entity_type,haccora_entity_id,metadata")
    .eq("connection_id", connectionId)
    .eq("dishbee_entity_type", type)
    .eq("dishbee_entity_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

async function projectEvent(db: Db, connection: any, event: Event, locationId: string | null) {
  const p = event.payload;
  const actor = String(connection.actor_user_id);
  const org = String(connection.organization_id);
  const idempotency = "dishbee:" + event.eventKey;
  const currency = eventCurrency(p);

  if (event.eventType === "dishbee.compliance.checklist.completed") {
    const mapped = await entityMap(
      db,
      connection.id,
      "checklist",
      text(p["checklistId"], event.subjectId),
    );
    if (mapped?.haccora_entity_type === "cleaning_task") {
      const { data, error } = await db
        .from("cleaning_completions")
        .insert({
          organization_id: org,
          location_id: locationId,
          completed_by: actor,
          task_id: mapped.haccora_entity_id,
          task_area_snapshot: text(p["checklistName"], "Dishbee checklist"),
          result: text(p["result"], "completed"),
          notes: text(p["note"]) || null,
          completed_at: date(p["completedAt"]),
          idempotency_key: idempotency,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { table: "cleaning_completions", id: String(data.id) };
    }
    const { data, error } = await db
      .from("haccp_flow_runs")
      .insert({
        organization_id: org,
        location_id: locationId,
        performed_by: actor,
        performed_at: date(p["completedAt"]),
        captured_at: date(p["completedAt"]),
        flow_key: "dishbee-checklist",
        title: text(p["checklistName"], "Dishbee operational checklist"),
        status: "completed",
        steps: p,
        notes: text(p["note"]) || null,
        idempotency_key: idempotency,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "haccp_flow_runs", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.waste.recorded") {
    const qty = Math.abs(number(p["quantity"], 0));
    const { data, error } = await db
      .from("waste_entries")
      .insert({
        organization_id: org,
        location_id: locationId,
        user_id: actor,
        item: text(
          p["inventoryItemName"],
          "Dishbee inventory item " + text(p["inventoryItemId"], event.subjectId),
        ),
        qty,
        unit: text(p["unit"], "each"),
        reason: text(p["reason"], "waste"),
        note: text(p["note"]) || null,
        cost_eur:
          p["costPence"] == null || currency !== "EUR" ? null : number(p["costPence"]) / 100,
        cost_gbp:
          p["costPence"] == null || currency !== "GBP" ? null : number(p["costPence"]) / 100,
        source_currency: currency,
        logged_at: date(p["createdAt"] ?? event.occurredAt),
        idempotency_key: idempotency,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "waste_entries", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.supplier.receipt") {
    const { data, error } = await db
      .from("goods_in_logs")
      .insert({
        organization_id: org,
        location_id: locationId,
        user_id: actor,
        supplier: text(p["supplierName"], "Dishbee supplier " + text(p["supplierId"], "")),
        product: text(p["productSummary"], "Purchase receipt"),
        quantity: p["quantity"] == null ? null : number(p["quantity"]),
        unit: text(p["unit"]) || null,
        delivery_reference: text(p["invoiceRef"]) || text(p["purchaseId"]) || null,
        received_at: date(p["receivedAt"] ?? event.occurredAt),
        status: text(p["status"], "accepted"),
        delivery_temp_c: p["deliveryTempC"] == null ? null : number(p["deliveryTempC"]),
        temp_ok: p["tempOk"] == null ? null : Boolean(p["tempOk"]),
        condition_ok: p["conditionOk"] == null ? null : Boolean(p["conditionOk"]),
        packaging_ok: p["packagingOk"] == null ? null : Boolean(p["packagingOk"]),
        allergen_label_ok: p["allergenLabelOk"] == null ? null : Boolean(p["allergenLabelOk"]),
        batch_lot: text(p["batchLot"]) || null,
        use_by: text(p["useBy"]) || null,
        best_before: text(p["bestBefore"]) || null,
        corrective_action: text(p["correctiveAction"]) || null,
        notes: text(
          p["notes"],
          p["totalPence"] == null ? "" : "Dishbee purchase total " + String(p["totalPence"]) + "p",
        ),
        idempotency_key: idempotency,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "goods_in_logs", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.allergens.updated") {
    const key = "dishbee-menu:" + text(p["menuItemId"], event.subjectId);
    const { data: existing, error: readError } = await db
      .from("recipes")
      .select("id")
      .eq("organization_id", org)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    const values = {
      organization_id: org,
      location_id: locationId,
      name: text(p["name"], "Dishbee menu item"),
      allergens: Array.isArray(p["allergens"]) ? p["allergens"].map(String) : [],
      price_eur: currency === "EUR" ? number(p["pricePence"], 0) / 100 : 0,
      cost_eur: currency === "EUR" ? number(p["costPence"], 0) / 100 : 0,
      price_gbp: currency === "GBP" ? number(p["pricePence"], 0) / 100 : null,
      cost_gbp: currency === "GBP" ? number(p["costPence"], 0) / 100 : null,
      source_currency: currency,
      category: text(p["category"]) || null,
      notes: "Synced from Dishbee allergen controls",
      idempotency_key: key,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      const { error } = await db.from("recipes").update(values).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { table: "recipes", id: String(existing.id) };
    }
    const { data, error } = await db.from("recipes").insert(values).select("id").single();
    if (error) throw new Error(error.message);
    return { table: "recipes", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.temperature.recorded") {
    const reading = number(p["reading"]);
    const min = p["targetMin"] == null ? null : number(p["targetMin"]);
    const max = p["targetMax"] == null ? null : number(p["targetMax"]);
    // A client-supplied "inRange: true" cannot override recorded unsafe readings.
    const inRange =
      (min == null || reading >= min) && (max == null || reading <= max) && p["inRange"] !== false;
    const { data, error } = await db
      .from("temperature_logs")
      .insert({
        organization_id: org,
        location_id: locationId,
        user_id: actor,
        location: text(p["assetName"], text(p["locationName"], "Dishbee temperature point")),
        reading,
        target_min: min,
        target_max: max,
        status: inRange ? "ok" : "alert",
        note: text(p["note"]) || null,
        logged_at: date(p["loggedAt"] ?? event.occurredAt),
        idempotency_key: idempotency,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "temperature_logs", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.incident.created") {
    const { data, error } = await db
      .from("incidents")
      .insert({
        organization_id: org,
        location_id: locationId,
        user_id: actor,
        title: text(p["title"], "Dishbee compliance incident"),
        description: text(p["description"]) || null,
        kind: text(p["kind"], "food_safety"),
        severity: text(p["severity"], "medium"),
        status: text(p["status"], "open"),
        occurred_at: date(p["occurredAt"] ?? event.occurredAt),
        evidence:
          p["evidence"] && typeof p["evidence"] === "object" ? p["evidence"] : { dishbee: p },
        root_cause: text(p["rootCause"]) || null,
        idempotency_key: idempotency,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "incidents", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.corrective_action.created") {
    const sourceId = text(p["sourceId"], event.subjectId);
    const { data: existing, error: readError } = await db
      .from("corrective_actions")
      .select("id")
      .eq("organization_id", org)
      .eq("source_table", "dishbee")
      .eq("source_id", sourceId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (existing) return { table: "corrective_actions", id: String(existing.id) };
    const { data, error } = await db
      .from("corrective_actions")
      .insert({
        organization_id: org,
        location_id: locationId,
        created_by: actor,
        source_table: "dishbee",
        source_id: sourceId,
        category: text(p["category"], "food_safety"),
        description: text(p["description"], "Corrective action from Dishbee"),
        severity: text(p["severity"], "medium"),
        status: text(p["status"], "open"),
        immediate_action: text(p["immediateAction"]) || null,
        corrective_action: text(p["correctiveAction"]) || null,
        preventive_action: text(p["preventiveAction"]) || null,
        root_cause: text(p["rootCause"]) || null,
        evidence:
          p["evidence"] && typeof p["evidence"] === "object" ? p["evidence"] : { dishbee: p },
        due_at: p["dueAt"] ? date(p["dueAt"]) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "corrective_actions", id: String(data.id) };
  }

  // Preserve other compliance events as a generic HACCP evidence run rather than
  // discarding an event Haccora does not yet have a specialised projection for.
  const { data, error } = await db
    .from("haccp_flow_runs")
    .insert({
      organization_id: org,
      location_id: locationId,
      performed_by: actor,
      performed_at: date(event.occurredAt),
      captured_at: date(event.occurredAt),
      flow_key: "dishbee-operational-event",
      title: event.eventType,
      status: "completed",
      steps: { subjectType: event.subjectType, subjectId: event.subjectId, ...p },
      idempotency_key: idempotency,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { table: "haccp_flow_runs", id: String(data.id) };
}

export const Route = createFileRoute("/api/integrations/dishbee")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = bearer(request);
        if (token.length < 32) return Response.json({ error: "unauthorized" }, { status: 401 });
        try {
          const bodyText = await request.text();
          if (new TextEncoder().encode(bodyText).length > 256 * 1024) {
            return Response.json({ error: "payload_too_large" }, { status: 413 });
          }
          const event = EventSchema.parse(JSON.parse(bodyText));
          const tokenHash = await sha256(token);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;

          const { data: connection, error: connectionError } = await db
            .from("dishbee_runtime_connections")
            .select("id,organization_id,dishbee_tenant_id,actor_user_id,status")
            .eq("token_hash", tokenHash)
            .maybeSingle();
          if (connectionError) throw new Error(connectionError.message);
          if (!connection || connection.status !== "live")
            return Response.json({ error: "connection_not_live" }, { status: 403 });
          if (String(connection.dishbee_tenant_id) !== event.dishbeeTenantId) {
            return Response.json({ error: "tenant_mismatch" }, { status: 403 });
          }

          const locationId = await resolveLocation(
            db,
            String(connection.id),
            event.dishbeeLocationId,
          );
          if (new URL(request.url).searchParams.get("probe") === "1") {
            // Validation probe from PR #46: verifies token, tenant and premises mapping
            // without writing a receipt or any compliance record.
            if (!locationId) {
              return Response.json({ error: "dishbee_location_required" }, { status: 400 });
            }
            return Response.json({
              ok: true,
              probe: true,
              persisted: false,
              organizationId: connection.organization_id,
              haccoraLocationId: locationId,
            });
          }
          if (event.eventType === "dishbee.order.handed_over") {
            if (!event.occurredAt) {
              return Response.json({ error: "order_timestamp_required" }, { status: 422 });
            }
            const parsedOrder = DishbeeHandedOver.safeParse(event.payload);
            if (!parsedOrder.success) {
              return Response.json({ error: "invalid_dishbee_order_contract" }, { status: 422 });
            }
            // The source identity must match the stable Dishbee order key.
            // Fail closed rather than accepting an order under a different subject.
            if (
              event.subjectType !== "order" ||
              event.subjectId !== parsedOrder.data.orderId ||
              event.eventKey !== "haccora-order-handover:" + parsedOrder.data.orderId
            ) {
              return Response.json({ error: "dishbee_order_identity_mismatch" }, { status: 422 });
            }
            // Hash stable, schema-approved fields: arbitrary upstream metadata/PII
            // is never persisted or included in the reconciliation contract.
            const eventHash = await sha256(
              JSON.stringify({
                eventType: event.eventType,
                eventKey: event.eventKey,
                orderId: parsedOrder.data.orderId,
                occurredAt: event.occurredAt,
                items: parsedOrder.data.items,
              }),
            );
            const { data: received, error: orderError } = await db.rpc(
              "ingest_dishbee_trace_order",
              {
                p_connection: connection.id,
                p_location: locationId,
                p_event_key: event.eventKey,
                p_order_reference: parsedOrder.data.orderId,
                p_occurred_at: event.occurredAt,
                p_event_hash: eventHash,
                p_items: parsedOrder.data.items,
              },
            );
            if (orderError) throw new Error("dishbee_order_ingestion_failed");
            return Response.json({
              ok: true,
              traceOrderId: received?.orderId,
              duplicate: received?.duplicate === true,
              attribution: "unreviewed",
              coverageComplete: false,
            });
          }
          if (!event.eventType.startsWith("dishbee.compliance.")) {
            return Response.json({ error: "unsupported_event_scope" }, { status: 400 });
          }
          const payloadSchema = CompliancePayloads[event.eventType];
          if (!payloadSchema) {
            return Response.json({ error: "unsupported_event_type" }, { status: 422 });
          }
          const parsedPayload = payloadSchema.safeParse(event.payload);
          if (!parsedPayload.success) {
            return Response.json({ error: "invalid_compliance_payload" }, { status: 422 });
          }
          event.payload = parsedPayload.data as Record<string, unknown>;
          if (!locationId) {
            return Response.json({ error: "dishbee_location_required" }, { status: 400 });
          }
          const { data: existing, error: existingError } = await db
            .from("dishbee_runtime_events")
            .select("id,status,target_table,target_id")
            .eq("connection_id", connection.id)
            .eq("event_key", event.eventKey)
            .maybeSingle();
          if (existingError) throw new Error(existingError.message);
          if (existing?.status === "processed") {
            return Response.json({
              ok: true,
              duplicate: true,
              targetTable: existing.target_table,
              targetId: existing.target_id,
            });
          }

          let receiptId = existing?.id;
          if (!receiptId) {
            const { data: receipt, error: receiptError } = await db
              .from("dishbee_runtime_events")
              .insert({
                connection_id: connection.id,
                organization_id: connection.organization_id,
                haccora_location_id: locationId,
                event_key: event.eventKey,
                event_type: event.eventType,
                subject_type: event.subjectType,
                subject_id: event.subjectId,
                payload: event.payload,
                status: "received",
              })
              .select("id")
              .single();
            if (receiptError) throw new Error(receiptError.message);
            receiptId = receipt.id;
          }

          try {
            const target = await projectEvent(db, connection, event, locationId);
            await db
              .from("dishbee_runtime_events")
              .update({
                status: "processed",
                target_table: target.table,
                target_id: target.id,
                processed_at: new Date().toISOString(),
                error: null,
              })
              .eq("id", receiptId);
            await db
              .from("dishbee_runtime_connections")
              .update({
                last_event_at: new Date().toISOString(),
                last_error: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", connection.id);
            return Response.json({ ok: true, targetTable: target.table, targetId: target.id });
          } catch (error) {
            const message = error instanceof Error ? error.message : "dishbee_projection_failed";
            await db
              .from("dishbee_runtime_events")
              .update({
                status: "failed",
                error: message.slice(0, 1000),
                processed_at: new Date().toISOString(),
              })
              .eq("id", receiptId);
            await db
              .from("dishbee_runtime_connections")
              .update({
                last_error: message.slice(0, 1000),
                updated_at: new Date().toISOString(),
              })
              .eq("id", connection.id);
            throw error;
          }
        } catch (error) {
          console.error("[haccora-dishbee-runtime]", error);
          if (error instanceof z.ZodError)
            return Response.json({ error: "invalid_event" }, { status: 422 });
          // Errors can contain internal SQL; keep response generic and retryable.
          return Response.json({ error: "request_failed" }, { status: 503 });
        }
      },
    },
  },
});
