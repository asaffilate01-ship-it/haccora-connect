import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (file) => readFile(path.join(root, file), "utf8");

async function sourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(relative)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

const [
  generatedClient,
  haccoraClient,
  middleware,
  serverClient,
  haccoraAttacher,
  config,
  start,
  packageJson,
] = await Promise.all([
  read("src/integrations/supabase/client.ts"),
  read("src/integrations/supabase/haccora-client.ts"),
  read("src/integrations/supabase/auth-middleware.ts"),
  read("src/integrations/supabase/client.server.ts"),
  read("src/integrations/supabase/haccora-auth-attacher.ts"),
  read("src/integrations/supabase/config.ts"),
  read("src/start.ts"),
  read("package.json"),
]);

// Lovable owns client.ts and may regenerate it. It must remain public-only, but
// Haccora application code is isolated behind the stable adapter below.
if (
  !generatedClient.includes("VITE_SUPABASE_URL") ||
  !generatedClient.includes("SUPABASE_PUBLISHABLE_KEY") ||
  generatedClient.includes("SUPABASE_SERVICE_ROLE_KEY")
) {
  failures.push("the generated public client has an unsafe or incomplete configuration boundary");
}

if (
  !haccoraClient.includes('from "./config"') ||
  !haccoraClient.includes("getPublicSupabaseConfig") ||
  !haccoraClient.includes("SUPABASE_UNAVAILABLE_MESSAGE")
) {
  failures.push(
    "the Haccora-owned public client no longer uses the shared fail-closed configuration",
  );
}
if (/import\.meta\.env|process\.env|SUPABASE_SERVICE_ROLE_KEY/.test(haccoraClient)) {
  failures.push("the Haccora-owned public client bypasses or weakens its public configuration");
}
if (
  !config.includes("VITE_SUPABASE_URL") ||
  !config.includes("SUPABASE_PUBLISHABLE_KEY") ||
  !config.includes('!key.startsWith("sb_secret_")')
) {
  failures.push("the shared Supabase configuration does not reject secret-key exposure");
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
  !haccoraAttacher.includes("supabase.auth.getSession()") ||
  !haccoraAttacher.includes("Authorization: `Bearer ${token}`") ||
  !start.includes("haccora-auth-attacher") ||
  !start.includes("attachHaccoraAuth")
) {
  failures.push("the global browser middleware no longer uses the Haccora-owned auth boundary");
}

const generatedFiles = new Set([
  "src/integrations/supabase/client.ts",
  "src/integrations/supabase/auth-attacher.ts",
  "src/integrations/supabase/auth-middleware.ts",
  "src/integrations/supabase/client.server.ts",
]);
for (const file of await sourceFiles("src")) {
  if (generatedFiles.has(file)) continue;
  const source = await read(file);
  if (
    /from\s+["']@\/integrations\/supabase\/client["']/.test(source) ||
    /from\s+["']\.\/client["']/.test(source)
  ) {
    failures.push(`${file} imports the hosting integration's generated public client`);
  }
  if (/Connect Supabase in Lovable Cloud/i.test(source)) {
    failures.push(`${file} contains platform-specific generated failure copy`);
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
