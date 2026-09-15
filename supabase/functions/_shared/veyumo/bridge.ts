import { createClient } from "@supabase/supabase-js";
import {
  BridgeError,
  httpsUrl,
  parseAction,
  signedHeaders,
} from "./protocol.mjs";
import { body, check, env, fail, json, originHeaders } from "./runtime.ts";

// source is a code constant in each app, never a field from the browser.
export function bridge(source: string) {
  return async (req: Request) => {
    let cors = {};
    try {
      cors = originHeaders(req);
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      if (req.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, cors);
      }
      const authorization = req.headers.get("authorization") || "";
      if (!authorization.startsWith("Bearer ")) {
        throw new BridgeError("sign_in_required", 401);
      }
      const client = createClient(
        env("SUPABASE_URL"),
        env("SUPABASE_ANON_KEY"),
        {
          global: { headers: { Authorization: authorization } },
          auth: { persistSession: false, autoRefreshToken: false },
        },
      );
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw new BridgeError("sign_in_required", 401);
      const user = data.user;
      if (!user.email || !user.email_confirmed_at) {
        throw new BridgeError("verify_email_first", 403);
      }
      const command = parseAction(await body(req));
      if (source !== "haccora") throw new BridgeError("invalid_source", 503);
      const context = check(await client.rpc("get_my_context"));
      if (!context?.organization_id || context.role !== "owner") {
        throw new BridgeError("business_owner_required", 403);
      }
      if (context.service_status !== "active") {
        throw new BridgeError("active_organization_required", 403);
      }
      const subject = context.organization_id;
      // Stripe private credentials stay in Lovable. A billing-backed discount
      // assertion must be implemented there before Haccora can claim eligibility.
      const entitlement = { active: false };
      const market = env("VEYUMO_MARKET") || "GB";
      if (!["GB", "DE"].includes(market)) {
        throw new BridgeError("invalid_market_configuration", 503);
      }
      const raw = JSON.stringify({
        command,
        actor: {
          subject,
          email: user.email,
          verified: true,
          fullName: typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name.slice(0, 200)
            : undefined,
          market,
          entitlement,
        },
      });
      const endpoint = httpsUrl(env("VEYUMO_API_URL"));
      const response = await fetch(endpoint, {
        method: "POST",
        redirect: "error",
        headers: await signedHeaders(source, env("VEYUMO_BRIDGE_SECRET"), raw),
        body: raw,
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      return json(result, response.status, cors);
    } catch (error) {
      const response = fail(error);
      Object.entries(cors).forEach(([k, v]) =>
        response.headers.set(k, String(v))
      );
      return response;
    }
  };
}
