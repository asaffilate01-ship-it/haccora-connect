import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => readFile(path.join(root, file), "utf8");

const [client, middleware, serverClient, packageJson] = await Promise.all([
  read("src/integrations/supabase/client.ts"),
  read("src/integrations/supabase/auth-middleware.ts"),
  read("src/integrations/supabase/client.server.ts"),
  read("package.json"),
]);

if (!client.includes('from "./config"') || !client.includes("getPublicSupabaseConfig")) {
  failures.push("the public Supabase client no longer uses the resilient shared configuration");
}

for (const [label, source] of [
  ["public Supabase client", client],
  ["Supabase auth middleware", middleware],
  ["privileged Supabase server client", serverClient],
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
if (!String(scripts.build ?? "").includes("check-source-integrity.mjs")) {
  failures.push("the production build no longer enforces source-integrity checks");
}

if (failures.length) {
  console.error(failures.map((failure) => `- Source integrity failed: ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Source integrity verification passed.");
