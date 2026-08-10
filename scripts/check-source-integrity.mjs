import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => readFile(path.join(root, file), "utf8");

const [client, middleware, serverClient, authAttacher, config, packageJson] = await Promise.all([
  read("src/integrations/supabase/client.ts"),
  read("src/integrations/supabase/auth-middleware.ts"),
  read("src/integrations/supabase/client.server.ts"),
  read("src/integrations/supabase/auth-attacher.ts"),
  read("src/integrations/supabase/config.ts"),
  read("package.json"),
]);

// The public Supabase client is generated and owned by the hosting integration,
// so it resolves VITE_/SSR variables inline. The resilient shared configuration
// boundary therefore lives in src/integrations/supabase/config.ts, which every
// application module (src/lib/auth.tsx, readiness endpoints) uses instead.
if (!client.includes("VITE_SUPABASE_URL") || !client.includes("SUPABASE_PUBLISHABLE_KEY")) {
  failures.push("the public Supabase client no longer resolves browser and SSR configuration");
}

if (!config.includes("VITE_SUPABASE_URL") || !config.includes("SUPABASE_PUBLISHABLE_KEY")) {
  failures.push("the shared Supabase configuration no longer covers browser and SSR environments");
}
if (!middleware.includes("supabase.auth.getClaims(token)") || !middleware.includes("claims.sub")) {
  failures.push("the Supabase auth middleware no longer verifies the bearer token and subject");
}
if (
  !serverClient.includes("SUPABASE_SERVICE_ROLE_KEY") ||
  !serverClient.includes("persistSession: false")
) {
  failures.push(
    "the privileged Supabase client no longer uses its server-only fail-closed boundary",
  );
}
if (
  !authAttacher.includes("supabase.auth.getSession()") ||
  !authAttacher.includes("Authorization: `Bearer ${token}`")
) {
  failures.push("the browser middleware no longer attaches the authenticated bearer token");
}

for (const [label, source] of [
  ["public Supabase client", client],
  ["Supabase auth middleware", middleware],
  ["privileged Supabase server client", serverClient],
  ["Supabase auth attacher", authAttacher],
]) {
  if (/Connect Supabase in Lovable Cloud/i.test(source)) {
    failures.push(`${label} contains platform-specific generated failure copy`);
  }
}

try {
  await access(path.join(root, "src/assets/haccora-logo.png.asset.json"));
  failures.push("obsolete Lovable-only Haccora logo metadata has returned");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const scripts = JSON.parse(packageJson).scripts ?? {};
if ((String(scripts.build ?? "").match(/check-source-integrity\.mjs/g) ?? []).length !== 2) {
  failures.push("the production build no longer checks source integrity before and after bundling");
}

if (failures.length) {
  console.error(failures.map((failure) => `- Source integrity failed: ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Source integrity verification passed.");
