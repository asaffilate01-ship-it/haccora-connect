import { z } from "zod";
import {
  clientIpAddress,
  env,
  json,
  preflight,
  readJsonBody,
  RequestBodyError,
  requirePost,
  sha256,
} from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

const Input = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(""),
  businessName: z.string().trim().max(160).optional().default(""),
  enquiryType: z.enum([
    "demo",
    "migration",
    "sales",
    "partnership",
    "support",
    "general",
  ]),
  siteCount: z.number().int().min(1).max(10000).nullable().optional().default(
    null,
  ),
  message: z.string().trim().min(10).max(2000),
  locale: z.literal("en").default("en"),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
});

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const body = Input.parse(await readJsonBody(request, 16 * 1024));
    const ipHash = await sha256(
      `${clientIpAddress(request)}:${env("CONTACT_HASH_SALT")}`,
    );
    const supabase = serviceClient();

    const { data: allowed, error: rateError } = await supabase.rpc(
      "consume_rate_limit",
      {
        p_bucket_key: `contact:${ipHash}`,
        p_limit: 5,
        p_window_seconds: 3600,
      },
    );
    if (rateError) throw rateError;
    if (allowed !== true) return json(request, { error: "rate_limited" }, 429);

    const { error } = await supabase.from("contact_requests").insert({
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email.toLowerCase(),
      phone: body.phone || null,
      business_name: body.businessName || null,
      enquiry_type: body.enquiryType,
      site_count: body.siteCount,
      message: body.message,
      locale: body.locale,
      consent_at: new Date().toISOString(),
      source_ip_hash: ipHash,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });
    if (error) throw error;
    return json(request, { ok: true }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json(request, { error: error.code }, error.status);
    }
    if (error instanceof z.ZodError) {
      return json(
        request,
        {
          error: "invalid_request",
          fields: error.flatten().fieldErrors,
        },
        400,
      );
    }
    console.error(error);
    return json(request, { error: "request_failed" }, 500);
  }
});
