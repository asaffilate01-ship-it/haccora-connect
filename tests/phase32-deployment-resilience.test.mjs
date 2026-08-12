import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("public pages remain available when the deployment connection is absent", async () => {
  const [configuration, auth, landing] = await Promise.all([
    read("src/integrations/supabase/config.ts"),
    read("src/lib/auth.tsx"),
    read("src/routes/index.tsx"),
  ]);

  assert.match(configuration, /export const isSupabaseConfigured/);
  assert.match(configuration, /VITE_SUPABASE_URL/);
  assert.match(configuration, /SUPABASE_URL/);
  assert.match(auth, /if \(!authenticationAvailable\)/);
  assert.match(auth, /setHydrated\(true\)/);
  assert.match(auth, /SUPABASE_UNAVAILABLE_MESSAGE/);
  assert.match(landing, /if \(!isSupabaseConfigured\(\)\)/);
  assert.match(landing, /PUBLIC_CONFIG\.legal\.email/);
});

test("login clearly fails closed while secure services are unconfigured", async () => {
  const login = await read("src/routes/login.tsx");

  assert.match(login, /role="alert"/);
  assert.match(login, /disabled=\{busy \|\| !authenticationAvailable\}/);
  assert.match(login, /mailto:hello@haccora\.co\.uk/);
});

test("production preflight still requires both browser and server Supabase values", async () => {
  const [preflight, requirements] = await Promise.all([
    read("scripts/verify-launch-env.mjs"),
    read("scripts/launch-requirements.mjs"),
  ]);

  assert.match(preflight, /evaluateLaunchReadiness/);

  for (const name of [
    "VITE_SUPABASE_URL",
    "SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]) {
    assert.match(requirements, new RegExp(`['\"]${name}['\"]`));
  }
});

test("temperature aggregates use the table's canonical logged_at evidence time", async () => {
  const [migration, readiness, types] = await Promise.all([
    read("supabase/migrations/20260809213000_fix_platform_temperature_timestamp.sql"),
    read("src/routes/app.readiness.tsx"),
    read("src/integrations/supabase/types.ts"),
  ]);

  assert.match(types, /temperature_logs:[\s\S]*?logged_at: string/);
  assert.match(migration, /temperature\.logged_at/);
  assert.doesNotMatch(migration, /temperature\.recorded_at/);
  assert.match(readiness, /\.gte\("logged_at", since\)/);
  assert.doesNotMatch(readiness, /\.gte\("recorded_at", since\)/);
});

test("SaaS owners receive platform context and are routed to the control plane", async () => {
  const [auth, login, platformContext, platform] = await Promise.all([
    read("src/lib/auth.tsx"),
    read("src/routes/login.tsx"),
    read("supabase/migrations/20260807190000_platform_operator_and_demo_role_access.sql"),
    read("src/routes/platform.tsx"),
  ]);

  assert.match(auth, /get_my_platform_context/);
  assert.match(auth, /if \(platformRole\) return "\/platform"/);
  assert.match(login, /user\.platformRole[\s\S]*?\? "\/platform"/);
  assert.match(platformContext, /po\.status = 'active'/);
  assert.match(platform, /createFileRoute\("\/platform"\)/);
  assert.match(platform, /get_platform_dashboard/);
});
