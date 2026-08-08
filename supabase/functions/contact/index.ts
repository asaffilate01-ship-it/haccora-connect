import { z } from "zod";
import { env, json, preflight, requirePost, sha256 } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";

const Input = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(""),
  businessName: z.string().trim().max(160).optional().default(""),
  locale: z.literal("en").default("en"),
  consent: z.literal(true),
  website: z.string().max(0).optional().default(""),
});

Deno.serve(async (request) => {
  const early = preflight(request) ?? requirePost(request);
  if (early) return early;
  try {
    const body = Input.parse(await request.json());
    const forwarded =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
    const ipHash = await sha256(`${forwarded}:${env("CONTACT_HASH_SALT")}`);
    const supabase = serviceClient();

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("contact_requests")
      .select("id", { count: "exact", head: true })
      .eq("source_ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= 5) return json(request, { error: "rate_limited" }, 429);

    const { error } = await supabase.from("contact_requests").insert({
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email.toLowerCase(),
      phone: body.phone || null,
      business_name: body.businessName || null,
      locale: body.locale,
      consent_at: new Date().toISOString(),
      source_ip_hash: ipHash,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });
    if (error) throw error;
    return json(request, { ok: true }, 201);
  } catch (error) {
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
