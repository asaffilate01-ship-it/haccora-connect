import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import {
  corsHeaders,
  json,
  preflight,
  readJsonBody,
  RequestBodyError,
  requirePost,
} from "../_shared/http.ts";
import { requireUser } from "../_shared/supabase.ts";

type ExportInput = { from?: string; to?: string };

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const { client, user } = await requireUser(request);
    const input = (await readJsonBody(request, 8 * 1024)) as ExportInput;
    const from = input.from
      ? new Date(input.from)
      : new Date(Date.now() - 30 * 86400000);
    const to = input.to ? new Date(input.to) : new Date();
    if (
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      to < from ||
      to.getTime() - from.getTime() > 366 * 86400000
    ) {
      return json(request, { error: "invalid_date_range" }, 400);
    }

    const [
      { data: context },
      organizations,
      locations,
      temperatures,
      outOfRangeTemperatures,
      checks,
      audits,
      recalls,
      training,
      fitness,
      equipment,
    ] = await Promise.all([
      client.rpc("get_my_context"),
      client.from("organizations").select("name,country_code,timezone").limit(
        1,
      ),
      client.from("locations").select("name,address,is_active").order("name")
        .limit(25),
      client
        .from("temperature_logs")
        .select("location,reading,status,logged_at", { count: "exact" })
        .gte("logged_at", from.toISOString())
        .lte("logged_at", to.toISOString())
        .limit(1000),
      client
        .from("temperature_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "out_of_range")
        .gte("logged_at", from.toISOString())
        .lte("logged_at", to.toISOString()),
      client
        .from("checks")
        .select("kind,title,status,completed_at", { count: "exact" })
        .eq("status", "completed")
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(1000),
      client
        .from("audits")
        .select("title,audit_type,score,status,performed_at", {
          count: "exact",
        })
        .gte("performed_at", from.toISOString())
        .lte("performed_at", to.toISOString())
        .limit(300),
      client
        .from("recalls")
        .select("product,batch,severity,status,initiated_at", {
          count: "exact",
        })
        .neq("status", "closed")
        .gte("initiated_at", from.toISOString())
        .lte("initiated_at", to.toISOString())
        .limit(300),
      client
        .from("training_records")
        .select("progress,score,completed_at,verified_at", { count: "exact" })
        .not("verified_at", "is", null)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString())
        .limit(1000),
      client
        .from("health_register")
        .select("id", { count: "exact", head: true })
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
      client
        .from("asset_events")
        .select("event_type,outcome,title,notes,recorded_by_name,recorded_at", {
          count: "exact",
        })
        .gte("recorded_at", from.toISOString())
        .lte("recorded_at", to.toISOString())
        .limit(1000),
    ]);
    for (
      const result of [
        temperatures,
        outOfRangeTemperatures,
        checks,
        audits,
        recalls,
        training,
        fitness,
        equipment,
      ]
    ) {
      if (result.error) throw result.error;
    }

    const { error: auditError } = await client.rpc("record_evidence_export", {
      p_from: from.toISOString().slice(0, 10),
      p_to: to.toISOString().slice(0, 10),
    });
    if (auditError) throw auditError;

    const ctx =
      context && typeof context === "object" && !Array.isArray(context)
        ? (context as Record<string, unknown>)
        : {};
    const ascii = (value: unknown) =>
      String(value ?? "")
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "?")
        .slice(0, 150);
    const organization = organizations.data?.[0] ?? null;
    const tenantName = String(
      organization?.name ?? ctx.organization_name ?? "Haccora workspace",
    );
    const siteRows = (locations.data ?? []).filter((row) =>
      row.is_active !== false
    );
    const primarySite = siteRows[0] ?? null;
    const siteSummary = ctx.location_name
      ? String(ctx.location_name)
      : siteRows.length
      ? siteRows.map((row) => String(row.name)).join(", ")
      : "All granted locations";
    const lines: string[] = [
      `Business: ${tenantName}`,
      `Site(s): ${siteSummary}`,
      ...(primarySite?.address
        ? [`Address: ${String(primarySite.address)}`]
        : []),
      ...(organization?.country_code
        ? [`Country: ${String(organization.country_code)}`]
        : []),
      `Period: ${from.toISOString().slice(0, 10)} to ${
        to.toISOString().slice(0, 10)
      }`,
      `Generated by: ${user.email ?? user.id}`,
      `Generated at: ${
        new Date().toISOString().replace("T", " ").slice(0, 16)
      } UTC`,
      "",
      `Temperature records: ${temperatures.count ?? 0}`,
      `Out-of-range temperatures: ${outOfRangeTemperatures.count ?? 0}`,
      `Completed checks: ${checks.count ?? 0}`,
      `Audits: ${audits.count ?? 0}`,
      `Open recalls: ${recalls.count ?? 0}`,
      `Verified training records: ${training.count ?? 0}`,
      `Fitness-to-work records visible to this user: ${fitness.count ?? 0}`,
      `Equipment history records: ${equipment.count ?? 0}`,
      "Detailed sections include bounded record samples; totals above are exact for the selected period.",
      "",
      "TEMPERATURE RECORDS",
      ...(temperatures.data ?? [])
        .slice(0, 250)
        .map(
          (row) =>
            `${row.logged_at} | ${ascii(row.location)} | ${row.reading} C | ${
              ascii(row.status)
            }`,
        ),
      "",
      "COMPLETED CHECKS",
      ...(checks.data ?? [])
        .slice(0, 250)
        .map(
          (row) =>
            `${row.completed_at ?? "not completed"} | ${ascii(row.kind)} | ${
              ascii(
                row.title,
              )
            } | ${ascii(row.status)}`,
        ),
      "",
      "AUDITS",
      ...(audits.data ?? [])
        .slice(0, 150)
        .map(
          (row) =>
            `${row.performed_at} | ${ascii(row.audit_type)} | ${
              ascii(
                row.title,
              )
            } | score ${row.score ?? "-"} | ${ascii(row.status)}`,
        ),
      "",
      "RECALLS",
      ...(recalls.data ?? [])
        .slice(0, 150)
        .map(
          (row) =>
            `${row.initiated_at} | ${ascii(row.product)} | batch ${
              ascii(
                row.batch,
              )
            } | ${ascii(row.severity)} | ${ascii(row.status)}`,
        ),
      "",
      "TRAINING",
      ...(training.data ?? [])
        .slice(0, 250)
        .map(
          (row) =>
            `${
              row.completed_at ?? "not completed"
            } | progress ${row.progress}% | score ${
              row.score ?? "-"
            } | verified ${row.verified_at ?? "no"}`,
        ),
      "",
      "EQUIPMENT, MAINTENANCE AND CHECKS",
      ...(equipment.data ?? [])
        .slice(0, 250)
        .map(
          (row) =>
            `${row.recorded_at} | ${ascii(row.event_type)} | ${
              ascii(row.outcome)
            } | ${ascii(row.title)} | ${ascii(row.recorded_by_name)} | ${
              ascii(row.notes)
            }`,
        ),
      "",
      "Generated from tenant-scoped data. Export creation is recorded in the immutable audit chain.",
    ];

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595.28, 841.89]);
    let pageNumber = 1;
    let y = 742;
    const drawHeader = () => {
      page.drawRectangle({
        x: 0,
        y: 782,
        width: 595.28,
        height: 60,
        color: rgb(0.05, 0.24, 0.19),
      });
      page.drawText(ascii(tenantName).slice(0, 46), {
        x: 48,
        y: 812,
        size: 16,
        font: bold,
        color: rgb(1, 1, 1),
      });
      page.drawText("Inspection evidence pack", {
        x: 48,
        y: 795,
        size: 9,
        font,
        color: rgb(0.85, 0.93, 0.9),
      });
      page.drawText(`Page ${pageNumber}`, {
        x: 505,
        y: 795,
        size: 8,
        font,
        color: rgb(0.85, 0.93, 0.9),
      });
      page.drawText("Prepared with Haccora - Safe. Clean. Compliant.", {
        x: 48,
        y: 26,
        size: 7,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
      page.drawText(ascii(siteSummary).slice(0, 60), {
        x: 48,
        y: 764,
        size: 9,
        font: bold,
        color: rgb(0.2, 0.2, 0.2),
      });
    };
    drawHeader();
    for (const line of lines) {
      if (y < 48) {
        page = pdf.addPage([595.28, 841.89]);
        pageNumber += 1;
        y = 755;
        drawHeader();
      }
      page.drawText(ascii(line).slice(0, 105), {
        x: 48,
        y,
        size: 9,
        font: /^[A-Z ]+$/.test(line) ? bold : font,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= 14;
    }
    const bytes = await pdf.save();
    const body = new Uint8Array(bytes).buffer;
    return new Response(body, {
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="haccora-evidence-${
          to
            .toISOString()
            .slice(0, 10)
        }.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    console.error(error);
    return json(
      request,
      {
        error: error instanceof Error && error.message === "Unauthorized"
          ? "unauthorized"
          : "export_failed",
      },
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500,
    );
  }
});
