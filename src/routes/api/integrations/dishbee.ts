import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const EventSchema = z.object({
  eventKey: z.string().min(3).max(240),
  eventType: z.string().min(3).max(160),
  dishbeeTenantId: z.string().uuid(),
  dishbeeLocationId: z.string().uuid().nullable().optional(),
  subjectType: z.string().min(1).max(80),
  subjectId: z.string().min(1).max(200),
  occurredAt: z.string().datetime().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

type Event = z.infer<typeof EventSchema>;
type Db = any;

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
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
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function date(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
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
  const payload = event.payload;
  const actor = String(connection.actor_user_id);
  const organizationId = String(connection.organization_id);
  const idempotencyKey = "dishbee:" + event.eventKey;

  if (event.eventType === "dishbee.compliance.checklist.completed") {
    const mapped = await entityMap(
      db,
      connection.id,
      "checklist",
      text(payload["checklistId"], event.subjectId),
    );

    if (mapped?.haccora_entity_type === "cleaning_task") {
      const { data, error } = await db
        .from("cleaning_completions")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          completed_by: actor,
          task_id: mapped.haccora_entity_id,
          task_area_snapshot: text(payload["checklistName"], "Dishbee checklist"),
          result: text(payload["result"], "completed"),
          notes: text(payload["note"]) || null,
          completed_at: date(payload["completedAt"]),
          idempotency_key: idempotencyKey,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { table: "cleaning_completions", id: String(data.id) };
    }

    const { data, error } = await db
      .from("haccp_flow_runs")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        performed_by: actor,
        performed_at: date(payload["completedAt"]),
        captured_at: date(payload["completedAt"]),
        flow_key: "dishbee-checklist",
        title: text(payload["checklistName"], "Dishbee operational checklist"),
        status: "completed",
        steps: payload,
        notes: text(payload["note"]) || null,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "haccp_flow_runs", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.waste.recorded") {
    const quantity = Math.abs(number(payload["quantity"], 0));
    const { data, error } = await db
      .from("waste_entries")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        user_id: actor,
        item: text(
          payload["inventoryItemName"],
          "Dishbee inventory item " + text(payload["inventoryItemId"], event.subjectId),
        ),
        qty: quantity,
        unit: text(payload["unit"], "each"),
        reason: text(payload["reason"], "waste"),
        note: text(payload["note"]) || null,
        cost_eur: payload["costPence"] == null ? null : number(payload["costPence"]) / 100,
        logged_at: date(payload["createdAt"] ?? event.occurredAt),
        idempotency_key: idempotencyKey,
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
        organization_id: organizationId,
        location_id: locationId,
        user_id: actor,
        supplier: text(
          payload["supplierName"],
          "Dishbee supplier " + text(payload["supplierId"], ""),
        ),
        product: text(payload["productSummary"], "Purchase receipt"),
        quantity: payload["quantity"] == null ? null : number(payload["quantity"]),
        unit: text(payload["unit"]) || null,
        delivery_reference: text(payload["invoiceRef"]) || text(payload["purchaseId"]) || null,
        received_at: date(payload["receivedAt"] ?? event.occurredAt),
        status: text(payload["status"], "accepted"),
        delivery_temp_c: payload["deliveryTempC"] == null ? null : number(payload["deliveryTempC"]),
        temp_ok: payload["tempOk"] == null ? null : Boolean(payload["tempOk"]),
        condition_ok: payload["conditionOk"] == null ? null : Boolean(payload["conditionOk"]),
        packaging_ok: payload["packagingOk"] == null ? null : Boolean(payload["packagingOk"]),
        allergen_label_ok:
          payload["allergenLabelOk"] == null ? null : Boolean(payload["allergenLabelOk"]),
        batch_lot: text(payload["batchLot"]) || null,
        use_by: text(payload["useBy"]) || null,
        best_before: text(payload["bestBefore"]) || null,
        corrective_action: text(payload["correctiveAction"]) || null,
        notes: text(
          payload["notes"],
          payload["totalPence"] == null
            ? ""
            : "Dishbee purchase total " + String(payload["totalPence"]) + "p",
        ),
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "goods_in_logs", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.allergens.updated") {
    const key = "dishbee-menu:" + text(payload["menuItemId"], event.subjectId);
    const { data: existing, error: readError } = await db
      .from("recipes")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", key)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const values = {
      organization_id: organizationId,
      location_id: locationId,
      name: text(payload["name"], "Dishbee menu item"),
      allergens: Array.isArray(payload["allergens"]) ? payload["allergens"].map(String) : [],
      price_eur: number(payload["pricePence"], 0) / 100,
      cost_eur: number(payload["costPence"], 0) / 100,
      category: text(payload["category"]) || null,
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
    const reading = number(payload["reading"]);
    const min = payload["targetMin"] == null ? null : number(payload["targetMin"]);
    const max = payload["targetMax"] == null ? null : number(payload["targetMax"]);
    const inRange =
      payload["inRange"] == null
        ? (min == null || reading >= min) && (max == null || reading <= max)
        : Boolean(payload["inRange"]);

    const { data, error } = await db
      .from("temperature_logs")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        user_id: actor,
        location: text(
          payload["assetName"],
          text(payload["locationName"], "Dishbee temperature point"),
        ),
        reading,
        target_min: min,
        target_max: max,
        status: inRange ? "ok" : "alert",
        note: text(payload["note"]) || null,
        logged_at: date(payload["loggedAt"] ?? event.occurredAt),
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "temperature_logs", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.incident.created") {
    const evidence =
      payload["evidence"] && typeof payload["evidence"] === "object"
        ? payload["evidence"]
        : { dishbee: payload };

    const { data, error } = await db
      .from("incidents")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        user_id: actor,
        title: text(payload["title"], "Dishbee compliance incident"),
        description: text(payload["description"]) || null,
        kind: text(payload["kind"], "food_safety"),
        severity: text(payload["severity"], "medium"),
        status: text(payload["status"], "open"),
        occurred_at: date(payload["occurredAt"] ?? event.occurredAt),
        evidence,
        root_cause: text(payload["rootCause"]) || null,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "incidents", id: String(data.id) };
  }

  if (event.eventType === "dishbee.compliance.corrective_action.created") {
    const sourceId = text(payload["sourceId"], event.subjectId);
    const { data: existing, error: readError } = await db
      .from("corrective_actions")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("source_table", "dishbee")
      .eq("source_id", sourceId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (existing) {
      return {
        table: "corrective_actions",
        id: String(existing.id),
      };
    }

    const evidence =
      payload["evidence"] && typeof payload["evidence"] === "object"
        ? payload["evidence"]
        : { dishbee: payload };

    const { data, error } = await db
      .from("corrective_actions")
      .insert({
        organization_id: organizationId,
        location_id: locationId,
        created_by: actor,
        source_table: "dishbee",
        source_id: sourceId,
        category: text(payload["category"], "food_safety"),
        description: text(payload["description"], "Corrective action from Dishbee"),
        severity: text(payload["severity"], "medium"),
        status: text(payload["status"], "open"),
        immediate_action: text(payload["immediateAction"]) || null,
        corrective_action: text(payload["correctiveAction"]) || null,
        preventive_action: text(payload["preventiveAction"]) || null,
        root_cause: text(payload["rootCause"]) || null,
        evidence,
        due_at: payload["dueAt"] ? date(payload["dueAt"]) : null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { table: "corrective_actions", id: String(data.id) };
  }

  const { data, error } = await db
    .from("haccp_flow_runs")
    .insert({
      organization_id: organizationId,
      location_id: locationId,
      performed_by: actor,
      performed_at: date(event.occurredAt),
      captured_at: date(event.occurredAt),
      flow_key: "dishbee-operational-event",
      title: event.eventType,
      status: "completed",
      steps: {
        subjectType: event.subjectType,
        subjectId: event.subjectId,
        ...payload,
      },
      idempotency_key: idempotencyKey,
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
        if (token.length < 32) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

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
          if (connectionError) {
            throw new Error(connectionError.message);
          }
          if (!connection || connection.status !== "live") {
            return Response.json({ error: "connection_not_live" }, { status: 403 });
          }
          if (String(connection.dishbee_tenant_id) !== event.dishbeeTenantId) {
            return Response.json({ error: "tenant_mismatch" }, { status: 403 });
          }

          const locationId = await resolveLocation(
            db,
            String(connection.id),
            event.dishbeeLocationId,
          );
          const { data: existing, error: existingError } = await db
            .from("dishbee_runtime_events")
            .select("id,status,target_table,target_id")
            .eq("connection_id", connection.id)
            .eq("event_key", event.eventKey)
            .maybeSingle();
          if (existingError) {
            throw new Error(existingError.message);
          }
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
            if (receiptError) {
              throw new Error(receiptError.message);
            }
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
            return Response.json({
              ok: true,
              targetTable: target.table,
              targetId: target.id,
            });
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
          if (error instanceof z.ZodError) {
            return Response.json({ error: "invalid_event" }, { status: 422 });
          }
          return Response.json(
            {
              error: error instanceof Error ? error.message : "request_failed",
            },
            { status: 400 },
          );
        }
      },
    },
  },
});
