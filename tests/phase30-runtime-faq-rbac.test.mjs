import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public FAQs answer UK buyer questions without claiming regulator approval", async () => {
  const [faqs, landing] = await Promise.all([
    read("src/lib/marketing-faqs.ts"),
    read("src/routes/index.tsx"),
  ]);
  assert.equal((faqs.match(/question:/g) ?? []).length, 12);
  assert.match(faqs, /is not approved or endorsed by the FSA/i);
  assert.match(faqs, /does not guarantee an inspection outcome or food hygiene rating/i);
  assert.match(faqs, /Official guidance allows food-safety records to be kept electronically/i);
  assert.match(faqs, /England, Wales, Scotland and Northern Ireland/i);
  assert.match(faqs, /encrypted offline queue/i);
  assert.match(faqs, /equipment QR codes/i);
  assert.match(faqs, /row-level security remains the final enforcement boundary/i);
  assert.match(landing, /"@type": "FAQPage"/);
  assert.match(landing, /MARKETING_FAQS\.map/);
  assert.match(landing, /focus-visible:outline/);
});

test("responsive type has explicit phone, tablet and desktop behaviour", async () => {
  const [styles, landing, theme] = await Promise.all([
    read("src/styles.css"),
    read("src/routes/index.tsx"),
    read("mobile/lib/theme.ts"),
  ]);
  assert.match(styles, /min-width: 768px[^}]+max-width: 1180px/s);
  assert.match(styles, /marketing-shell h1/);
  assert.match(styles, /app-shell h1/);
  assert.match(landing, /text-2xl sm:text-3xl md:text-4xl/);
  assert.match(theme, /export const typeScale/);
});

test("TanStack is not forced into circular vendor chunks", async () => {
  const [vite, budget, workerSmoke] = await Promise.all([
    read("vite.config.ts"),
    read("scripts/check-build-budget.mjs"),
    read("scripts/check-built-worker.mjs"),
  ]);
  assert.doesNotMatch(vite, /codeSplitting:/);
  assert.doesNotMatch(vite, /name: "vendor-/);
  assert.match(vite, /process\.env\.PUBLIC_RELEASE_SHA/);
  assert.match(budget, /static chunk cycle/);
  assert.match(budget, /reportedCycles/);
  assert.match(workerSmoke, /process\.env\.PUBLIC_RELEASE_SHA/);
  assert.match(workerSmoke, /fullCommitSha\.test/);
});

test("client and database built-in action catalogues stay aligned", async () => {
  const [client, migration] = await Promise.all([
    read("src/lib/permissions.ts"),
    read("supabase/migrations/20260809150000_saas_control_plane_and_asset_scan_evidence.sql"),
  ]);
  const actionBlock = client.match(/export const ACTIONS = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  const serverBlock =
    migration.match(
      /create or replace function public\.default_role_actions[\s\S]*?create or replace function public\.has_org_permission/,
    )?.[0] ?? "";
  const clientActions = [...actionBlock.matchAll(/"([A-Za-z]+(?:\.[A-Za-z]+)+)"/g)].map(
    (match) => match[1],
  );
  const serverActions = new Set(
    [...serverBlock.matchAll(/'([A-Za-z]+(?:\.[A-Za-z]+)+)'/g)].map((match) => match[1]),
  );
  assert.ok(clientActions.length >= 20);
  assert.deepEqual(
    clientActions.filter((action) => !serverActions.has(action)),
    [],
  );
  for (const role of ["owner", "manager", "chef", "staff", "inspector"]) {
    assert.match(client, new RegExp(`\\b${role}: \\[`, "i"));
    assert.match(serverBlock, new RegExp(`when '${role}' then`, "i"));
  }
});

test("platform roles remain separate from tenant evidence RLS", async () => {
  const [platform, roleMatrix, rlsTest] = await Promise.all([
    read("supabase/migrations/20260807190000_platform_operator_and_demo_role_access.sql"),
    read("docs/ROLE-PERMISSION-RLS-MATRIX.md"),
    read("supabase/tests/database/platform_operator_rls.test.sql"),
  ]);
  for (const role of ["platform_owner", "platform_support", "platform_auditor"]) {
    assert.match(platform, new RegExp(role));
    assert.match(roleMatrix, new RegExp(role.replace("platform_", "Platform "), "i"));
  }
  assert.match(rlsTest, /does not bypass tenant organization RLS/i);
  assert.match(roleMatrix, /Client visibility is never the security boundary/i);
});

test("native manifest and lockfile include every declared production dependency", async () => {
  const [manifestText, lockText] = await Promise.all([
    read("mobile/package.json"),
    read("mobile/package-lock.json"),
  ]);
  const manifest = JSON.parse(manifestText);
  const lock = JSON.parse(lockText);
  assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies);
  for (const dependency of ["expo-location", "lucide-react-native", "react-native-svg"]) {
    assert.ok(lock.packages[`node_modules/${dependency}`], `${dependency} is absent from lockfile`);
  }
});
