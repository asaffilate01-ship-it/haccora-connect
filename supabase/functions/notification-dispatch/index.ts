import {
  constantTimeEqual,
  env,
  json,
  preflight,
  requirePost,
} from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

type Payload = {
  title?: string;
  message?: string;
  severity?: string;
  [key: string]: unknown;
};

type ExpoDelivery = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string; [key: string]: unknown };
};

type ReminderPreference = {
  user_id: string;
  organization_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  start_of_day_enabled: boolean;
  issue_alerts_enabled: boolean;
  expiry_alerts_enabled: boolean;
  start_of_day_local_time: string;
};

function localClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
  };
}

async function enqueueReminder(
  supabase: ReturnType<typeof serviceClient>,
  preference: ReminderPreference,
  template: string,
  payload: Payload,
  dateKey: string,
) {
  const channels = [
    "in_app",
    ...(preference.email_enabled ? ["email"] : []),
    ...(preference.push_enabled ? ["push"] : []),
  ];
  const rows = channels.map((channel) => ({
    organization_id: preference.organization_id,
    recipient_id: preference.user_id,
    channel,
    template,
    payload,
    idempotency_key:
      `${template}:${dateKey}:${preference.organization_id}:${preference.user_id}:${channel}`,
  }));
  const { error } = await supabase.from("notification_outbox").upsert(rows, {
    onConflict: "idempotency_key",
    ignoreDuplicates: true,
  });
  if (error) throw error;
  return rows.length;
}

async function enqueueComplianceReminders(
  supabase: ReturnType<typeof serviceClient>,
): Promise<number> {
  const now = new Date();
  const { data: preferences, error } = await supabase
    .from("notification_preferences")
    .select(
      "user_id,organization_id,email_enabled,push_enabled,start_of_day_enabled,issue_alerts_enabled,expiry_alerts_enabled,start_of_day_local_time",
    );
  if (error) throw error;
  let queued = 0;

  for (const preference of (preferences ?? []) as ReminderPreference[]) {
    const [{ data: membership }, { data: organization }] = await Promise.all([
      supabase
        .from("organization_memberships")
        .select("role,status,default_location_id")
        .eq("organization_id", preference.organization_id)
        .eq("user_id", preference.user_id)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("timezone")
        .eq("id", preference.organization_id)
        .maybeSingle(),
    ]);
    if (!membership || membership.status !== "active") continue;
    const clock = localClock(now, organization?.timezone ?? "Europe/London");
    const reminderHour = Number(preference.start_of_day_local_time.slice(0, 2));

    if (preference.start_of_day_enabled && clock.hour === reminderHour) {
      let checksQuery = supabase
        .from("checks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .neq("status", "completed");
      if (membership.role === "staff") {
        checksQuery = checksQuery.eq("user_id", preference.user_id);
      }
      const [{ count }, { count: cleaningCount }] = await Promise.all([
        checksQuery,
        supabase
          .from("cleaning_tasks")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", preference.organization_id)
          .eq("active", true),
      ]);
      queued += await enqueueReminder(
        supabase,
        preference,
        "start_of_day",
        {
          severity: "info",
          title: "Start today's food-safety routine",
          message: `${count ?? 0} open check${count === 1 ? "" : "s"} · ${
            cleaningCount ?? 0
          } scheduled cleaning task${cleaningCount === 1 ? "" : "s"}.`,
          route: count ? "/app/routines" : "/app/cleaning",
          nativeRoute: count ? "/checks" : "/cleaning",
        },
        clock.date,
      );
    }

    if (preference.issue_alerts_enabled) {
      let actionsQuery = supabase
        .from("corrective_actions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .in("status", ["open", "in_progress"]);
      if (!(["owner", "manager"] as string[]).includes(membership.role)) {
        actionsQuery = actionsQuery.eq("owner_id", preference.user_id);
      }
      const { count } = await actionsQuery;
      if (count) {
        queued += await enqueueReminder(
          supabase,
          preference,
          "open_issues",
          {
            severity: "warning",
            title: "Food-safety issues need attention",
            message: `${count} corrective action${
              count === 1 ? " is" : "s are"
            } still open.`,
            route: "/app/control-centre",
            nativeRoute: "/actions",
          },
          clock.date,
        );
      }

      if ((["owner", "manager"] as string[]).includes(membership.role)) {
        const { count: exclusionCount } = await supabase
          .from("health_register")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", preference.organization_id)
          .eq("status", "excluded");
        if (exclusionCount) {
          queued += await enqueueReminder(
            supabase,
            preference,
            "fitness_to_work_review",
            {
              severity: "critical",
              title: "Fitness-to-work report needs review",
              message: `${exclusionCount} active food-handling exclusion${
                exclusionCount === 1 ? " requires" : "s require"
              } manager review.`,
              route: "/app/health",
              nativeRoute: "/fitness-to-work",
            },
            clock.date,
          );
        }

        const dayStart = new Date(now.getTime() - 24 * 86400000).toISOString();
        const { count: rejectedDeliveryCount } = await supabase
          .from("goods_in_logs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", preference.organization_id)
          .in("status", ["rejected", "partial"])
          .gte("received_at", dayStart);
        if (rejectedDeliveryCount) {
          queued += await enqueueReminder(
            supabase,
            preference,
            "rejected_delivery_review",
            {
              severity: "warning",
              title: "Rejected delivery recorded",
              message:
                `${rejectedDeliveryCount} rejected or partially accepted deliver${
                  rejectedDeliveryCount === 1 ? "y requires" : "ies require"
                } review.`,
              route: "/app/goodsin",
              nativeRoute: "/goods-in",
            },
            clock.date,
          );
        }
      }
    }

    if (preference.expiry_alerts_enabled) {
      const deadline = new Date(now.getTime() + 30 * 86400000).toISOString();
      let documentsQuery = supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .is("archived_at", null)
        .not("expires_at", "is", null)
        .lte("expires_at", deadline);
      let trainingQuery = supabase
        .from("training_records")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .not("certificate_valid_to", "is", null)
        .lte("certificate_valid_to", deadline.slice(0, 10));
      if (!(["owner", "manager"] as string[]).includes(membership.role)) {
        documentsQuery = documentsQuery.eq(
          "subject_user_id",
          preference.user_id,
        );
        trainingQuery = trainingQuery.eq("user_id", preference.user_id);
      }
      const [documents, training] = await Promise.all([
        documentsQuery,
        trainingQuery,
      ]);
      const total = (documents.count ?? 0) + (training.count ?? 0);
      if (total) {
        queued += await enqueueReminder(
          supabase,
          preference,
          "compliance_expiry",
          {
            severity: "warning",
            title: "Compliance evidence is expiring",
            message: `${documents.count ?? 0} document(s) and ${
              training.count ?? 0
            } training record(s) expire within 30 days.`,
            route: "/app/documents",
            nativeRoute: "/documents",
          },
          clock.date,
        );
      }

      let equipmentQuery = supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .is("retired_at", null)
        .not("next_service_at", "is", null)
        .lte("next_service_at", deadline.slice(0, 10));
      if (
        !(["owner", "manager"] as string[]).includes(membership.role) &&
        membership.default_location_id
      ) {
        equipmentQuery = equipmentQuery.eq(
          "location_id",
          membership.default_location_id,
        );
      }
      const { count: equipmentCount } = await equipmentQuery;
      if (equipmentCount) {
        queued += await enqueueReminder(
          supabase,
          preference,
          "equipment_service_due",
          {
            severity: "warning",
            title: "Equipment check or service is due",
            message: `${equipmentCount} equipment item${
              equipmentCount === 1 ? " is" : "s are"
            } due within 30 days or overdue.`,
            route: "/app/assets",
            nativeRoute: "/assets",
          },
          clock.date,
        );
      }

      const inductionDeadline = new Date(now.getTime() + 7 * 86400000)
        .toISOString();
      let inductionsQuery = supabase
        .from("staff_induction_assignments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .is("acknowledged_at", null)
        .not("due_at", "is", null)
        .lte("due_at", inductionDeadline);
      if (!(["owner", "manager"] as string[]).includes(membership.role)) {
        inductionsQuery = inductionsQuery.eq("user_id", preference.user_id);
      }
      const { count: inductionCount } = await inductionsQuery;
      if (inductionCount) {
        queued += await enqueueReminder(
          supabase,
          preference,
          "staff_induction_due",
          {
            severity: "warning",
            title: "Staff instruction needs acknowledgement",
            message: `${inductionCount} induction or policy instruction${
              inductionCount === 1 ? " is" : "s are"
            } due within 7 days.`,
            route: "/app/inductions",
            nativeRoute: "/inductions",
          },
          clock.date,
        );
      }
    }
  }
  return queued;
}

function utcWeekKey(date: Date): string {
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

async function enqueueWeeklyDigests(
  supabase: ReturnType<typeof serviceClient>,
): Promise<number> {
  const now = new Date();
  if (now.getUTCDay() !== 1) return 0;
  const { data: preferences, error } = await supabase
    .from("notification_preferences")
    .select("user_id,organization_id")
    .eq("weekly_digest", true)
    .eq("email_enabled", true);
  if (error) throw error;

  const week = utcWeekKey(now);
  let queued = 0;
  for (const preference of preferences ?? []) {
    const { data: membership, error: membershipError } = await supabase
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", preference.organization_id)
      .eq("user_id", preference.user_id)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) continue;

    let checksQuery = supabase
      .from("checks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", preference.organization_id)
      .eq("status", "pending");
    let correctiveQuery = supabase
      .from("corrective_actions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", preference.organization_id)
      .in("status", ["open", "in_progress"]);
    if (membership.role === "staff") {
      checksQuery = checksQuery.eq("user_id", preference.user_id);
      correctiveQuery = correctiveQuery.eq("owner_id", preference.user_id);
    }
    const [checks, corrective, alerts] = await Promise.all([
      checksQuery,
      correctiveQuery,
      supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", preference.organization_id)
        .eq("user_id", preference.user_id)
        .is("read_at", null),
    ]);
    if (checks.error || corrective.error || alerts.error) {
      throw checks.error ?? corrective.error ?? alerts.error;
    }

    const { error: outboxError } = await supabase.from("notification_outbox")
      .upsert(
        {
          organization_id: preference.organization_id,
          recipient_id: preference.user_id,
          channel: "email",
          template: "weekly_digest",
          payload: {
            title: "Your weekly Haccora summary",
            message: `Open checks: ${
              checks.count ?? 0
            }. Open corrective actions: ${
              corrective.count ?? 0
            }. Unread alerts: ${alerts.count ?? 0}.`,
            week,
          },
          idempotency_key:
            `weekly-digest:${week}:${preference.organization_id}:${preference.user_id}`,
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true },
      );
    if (outboxError) throw outboxError;
    queued += 1;
  }
  return queued;
}

async function processPushReceipts(
  supabase: ReturnType<typeof serviceClient>,
) {
  const { data: pending, error } = await supabase
    .from("expo_push_receipts")
    .select("ticket_id,organization_id,user_id,token,attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(1000);
  if (error) throw error;
  if (!pending?.length) return { checked: 0, delivered: 0, failed: 0 };

  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ ids: pending.map(({ ticket_id }) => ticket_id) }),
  });
  if (!response.ok) {
    throw new Error(`Push receipt provider returned ${response.status}`);
  }
  const result = (await response.json()) as {
    data?: Record<string, ExpoDelivery>;
    errors?: Array<{ message?: string }>;
  };
  if (!result.data && result.errors?.length) {
    throw new Error(
      result.errors[0]?.message ?? "Push receipt provider rejected the request",
    );
  }

  let delivered = 0;
  let failed = 0;
  for (const row of pending) {
    const receipt = result.data?.[row.ticket_id];
    if (!receipt) {
      const attempts = row.attempts + 1;
      const dead = attempts >= 5;
      const { error: updateError } = await supabase
        .from("expo_push_receipts")
        .update({
          attempts,
          status: dead ? "failed" : "pending",
          next_attempt_at: new Date(Date.now() + 15 * 60_000).toISOString(),
          provider_error: dead ? "Push receipt was unavailable" : null,
          completed_at: dead ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("ticket_id", row.ticket_id)
        .eq("status", "pending");
      if (updateError) throw updateError;
      failed += dead ? 1 : 0;
      continue;
    }

    const isDelivered = receipt.status === "ok";
    const providerError = receipt.details?.error ?? receipt.message ?? null;
    const { error: updateError } = await supabase
      .from("expo_push_receipts")
      .update({
        attempts: row.attempts + 1,
        status: isDelivered ? "delivered" : "failed",
        provider_error: providerError?.slice(0, 500) ?? null,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("ticket_id", row.ticket_id)
      .eq("status", "pending");
    if (updateError) throw updateError;

    if (receipt.details?.error === "DeviceNotRegistered") {
      const { error: tokenError } = await supabase
        .from("device_push_tokens")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("token", row.token)
        .eq("organization_id", row.organization_id)
        .eq("user_id", row.user_id);
      if (tokenError) throw tokenError;
    }
    delivered += isDelivered ? 1 : 0;
    failed += isDelivered ? 0 : 1;
  }
  return { checked: pending.length, delivered, failed };
}

async function sendEmail(
  supabase: ReturnType<typeof serviceClient>,
  recipientId: string,
  payload: Payload,
  idempotencyKey: string,
) {
  const { data, error } = await supabase.auth.admin.getUserById(recipientId);
  if (error || !data.user?.email) {
    throw new Error("Recipient email is unavailable");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `haccora-${idempotencyKey}`,
    },
    body: JSON.stringify({
      from: env("NOTIFICATION_FROM_EMAIL"),
      to: [data.user.email],
      subject: payload.title ?? "Haccora notification",
      text: payload.message ?? "Open Haccora to review this notification.",
    }),
  });
  if (!response.ok) {
    throw new Error(`Email provider returned ${response.status}`);
  }
}

async function sendPush(
  supabase: ReturnType<typeof serviceClient>,
  recipientId: string,
  organizationId: string,
  payload: Payload,
) {
  const { data: registrations, error } = await supabase
    .from("device_push_tokens")
    .select("token,platform")
    .eq("user_id", recipientId)
    .eq("organization_id", organizationId)
    .eq("enabled", true);
  if (error) throw error;
  if (!registrations?.length) throw new Error("No active push token");

  const webRegistrations = registrations.filter(({ platform }) =>
    platform === "web"
  );
  const nativeRegistrations = registrations.filter(({ platform }) =>
    platform !== "web"
  );
  if (webRegistrations.length) {
    const gateway = env("WEB_PUSH_GATEWAY_URL");
    const gatewayResponse = await fetch(gateway, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("WEB_PUSH_GATEWAY_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriptions: webRegistrations.map(({ token }) => JSON.parse(token)),
        notification: {
          title: payload.title ?? "Haccora",
          body: payload.message ?? "A food-safety record needs attention.",
          data: payload,
        },
      }),
    });
    if (!gatewayResponse.ok) {
      throw new Error(`Web push gateway returned ${gatewayResponse.status}`);
    }
  }

  if (!nativeRegistrations.length) return;
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(
      nativeRegistrations.map(({ token }) => ({
        to: token,
        sound: "default",
        title: payload.title ?? "Haccora",
        body: payload.message ?? "A food-safety record needs attention.",
        data: payload,
      })),
    ),
  });
  if (!response.ok) {
    throw new Error(`Push provider returned ${response.status}`);
  }
  const result = (await response.json()) as {
    data?: ExpoDelivery[] | ExpoDelivery;
    errors?: Array<{ message?: string }>;
  };
  const tickets = Array.isArray(result.data)
    ? result.data
    : result.data
    ? [result.data]
    : [];
  if (!tickets.length && result.errors?.length) {
    throw new Error(
      result.errors[0]?.message ?? "Push provider rejected the notification",
    );
  }

  const receiptRows: Array<{
    ticket_id: string;
    organization_id: string;
    user_id: string;
    token: string;
  }> = [];
  const retryableFailures: string[] = [];
  let accepted = webRegistrations.length;
  for (const [index, registration] of nativeRegistrations.entries()) {
    const ticket = tickets[index];
    if (ticket?.status === "ok" && ticket.id) {
      accepted += 1;
      receiptRows.push({
        ticket_id: ticket.id,
        organization_id: organizationId,
        user_id: recipientId,
        token: registration.token,
      });
      continue;
    }
    if (ticket?.details?.error === "DeviceNotRegistered") {
      const { error: tokenError } = await supabase
        .from("device_push_tokens")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("token", registration.token)
        .eq("organization_id", organizationId)
        .eq("user_id", recipientId);
      if (tokenError) throw tokenError;
      continue;
    }
    retryableFailures.push(
      ticket?.message ?? "Push provider did not return a ticket",
    );
  }

  if (receiptRows.length) {
    const { error: receiptError } = await supabase.from("expo_push_receipts")
      .upsert(receiptRows, {
        onConflict: "ticket_id",
        ignoreDuplicates: true,
      });
    if (receiptError) throw receiptError;
  }
  if (!accepted && retryableFailures.length) {
    throw new Error(retryableFailures[0]);
  }
}

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  if (
    !constantTimeEqual(
      request.headers.get("x-cron-secret") ?? "",
      env("CRON_SECRET"),
    )
  ) {
    return json(request, { error: "unauthorized" }, 401);
  }

  const supabase = serviceClient();
  let digestQueued = 0;
  let remindersQueued = 0;
  let receiptSummary = { checked: 0, delivered: 0, failed: 0 };
  try {
    remindersQueued = await enqueueComplianceReminders(supabase);
    digestQueued = await enqueueWeeklyDigests(supabase);
  } catch (digestError) {
    console.error(digestError);
    return json(request, { error: "digest_generation_failed" }, 500);
  }
  try {
    receiptSummary = await processPushReceipts(supabase);
  } catch (receiptError) {
    console.error("push_receipt_check_failed", receiptError);
  }
  await supabase
    .from("notification_outbox")
    .update({ status: "pending", processing_at: null })
    .eq("status", "processing")
    .lt("processing_at", new Date(Date.now() - 15 * 60_000).toISOString());

  const { data: jobs, error } = await supabase
    .from("notification_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(50);
  if (error) return json(request, { error: "queue_read_failed" }, 500);

  let sent = 0;
  for (const job of jobs ?? []) {
    const claimed = await supabase
      .from("notification_outbox")
      .update({
        status: "processing",
        processing_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed.data) continue;
    try {
      const payload = (job.payload ?? {}) as Payload;
      if (job.channel === "in_app") {
        const { error: alertError } = await supabase.from("alerts").upsert(
          {
            organization_id: job.organization_id,
            user_id: job.recipient_id,
            kind: job.template,
            severity: payload.severity ?? "info",
            title: payload.title ?? job.template,
            message: payload.message ?? null,
            idempotency_key: `outbox:${job.id}`,
          },
          {
            onConflict: "organization_id,idempotency_key",
            ignoreDuplicates: true,
          },
        );
        if (alertError) throw alertError;
      } else if (job.channel === "email") {
        await sendEmail(supabase, job.recipient_id, payload, job.id);
      } else if (job.channel === "push") {
        await sendPush(
          supabase,
          job.recipient_id,
          job.organization_id,
          payload,
        );
      } else {
        throw new Error("Unsupported notification channel");
      }
      await supabase
        .from("notification_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          processing_at: null,
          last_error: null,
        })
        .eq("id", job.id);
      sent += 1;
    } catch (jobError) {
      const attempts = job.attempts + 1;
      await supabase
        .from("notification_outbox")
        .update({
          status: attempts >= 5 ? "dead_letter" : "pending",
          processing_at: null,
          next_attempt_at: new Date(
            Date.now() + Math.min(3600, 2 ** attempts * 30) * 1000,
          ).toISOString(),
          last_error: jobError instanceof Error
            ? jobError.message.slice(0, 500)
            : "unknown",
        })
        .eq("id", job.id);
    }
  }
  return json(request, {
    processed: jobs?.length ?? 0,
    sent,
    digestQueued,
    remindersQueued,
    receiptsChecked: receiptSummary.checked,
    receiptsDelivered: receiptSummary.delivered,
    receiptsFailed: receiptSummary.failed,
  });
});
