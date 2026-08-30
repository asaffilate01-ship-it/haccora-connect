import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = process.cwd();
const evidenceDir = path.resolve(root, process.env.HACCORA_EVIDENCE_DIR ?? "release-evidence");
const gateNames = [
  "STAGING_PREFLIGHT_PASSED",
  "SOURCE_QUALITY_PASSED",
  "MIGRATION_DRY_RUN_PASSED",
  "MIGRATIONS_APPLIED",
  "REMOTE_LEDGER_PASSED",
  "EDGE_FUNCTIONS_DEPLOYED",
  "DEMO_SEEDED",
  "DEMO_DATA_VERIFIED",
  "DEMO_RLS_PASSED",
  "DEMO_PERSISTENCE_PASSED",
  "HOSTED_HEALTH_PASSED",
  "HOSTED_SMOKE_PASSED",
  "HOSTED_BROWSER_E2E_PASSED",
  "NATIVE_EXPORT_PASSED",
  "NATIVE_INTERNAL_BUILD_PASSED",
];
const evidenceFiles = [
  "staging-migration-dry-run.txt",
  "staging-migration-list.txt",
  "staging-migration-ledger.json",
  "staging-functions-list.txt",
  "demo-seed.txt",
  "demo-verify.txt",
  "demo-role-access.txt",
  "demo-role-persistence.txt",
  "hosted-health.txt",
  "hosted-smoke.txt",
  "hosted-browser-results.json",
  "eas-internal-build.json",
];

async function sha256(file) {
  const content = await readFile(file);
  return createHash("sha256").update(content).digest("hex");
}

async function commitSha() {
  const supplied = (process.env.GITHUB_SHA ?? "").trim();
  if (/^[0-9a-f]{40}$/i.test(supplied)) return supplied.toLowerCase();
  try {
    return (await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  } catch {
    return "unknown";
  }
}

await mkdir(evidenceDir, { recursive: true });
const artifacts = [];
for (const name of evidenceFiles) {
  const absolute = path.join(evidenceDir, name);
  try {
    await access(absolute);
    const metadata = await stat(absolute);
    artifacts.push({ name, bytes: metadata.size, sha256: await sha256(absolute) });
  } catch {
    // A failed or not-requested gate may legitimately have no evidence file.
  }
}

const migrations = (await readdir(path.join(root, "supabase/migrations")))
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();
const functions = (await readdir(path.join(root, "supabase/functions"), { withFileTypes: true }))
  .filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith("_") && entry.name !== "node_modules",
  )
  .map((entry) => entry.name)
  .sort();
const gates = Object.fromEntries(gateNames.map((name) => [name, process.env[name] === "true"]));
const requiredWebPilotGates = [
  "STAGING_PREFLIGHT_PASSED",
  "SOURCE_QUALITY_PASSED",
  "MIGRATION_DRY_RUN_PASSED",
  "MIGRATIONS_APPLIED",
  "REMOTE_LEDGER_PASSED",
  "EDGE_FUNCTIONS_DEPLOYED",
  "DEMO_SEEDED",
  "DEMO_DATA_VERIFIED",
  "DEMO_RLS_PASSED",
  "DEMO_PERSISTENCE_PASSED",
  "HOSTED_HEALTH_PASSED",
  "HOSTED_SMOKE_PASSED",
  "HOSTED_BROWSER_E2E_PASSED",
];
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commitSha: await commitSha(),
  repository: process.env.GITHUB_REPOSITORY ?? null,
  workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  mode: process.env.STAGING_APPLY_CHANGES === "true" ? "apply-and-test" : "verify-only",
  staging: {
    projectRef: process.env.STAGING_PROJECT_REF ?? null,
    supabaseOrigin: process.env.STAGING_SUPABASE_URL ?? null,
    applicationOrigin: process.env.STAGING_APP_URL ?? null,
  },
  source: {
    migrationCount: migrations.length,
    latestMigration: migrations.at(-1) ?? null,
    edgeFunctions: functions,
    demoRoles: [
      "platform_owner",
      "owner",
      "manager",
      "chef",
      "staff",
      "inspector",
      "isolation_owner",
    ],
  },
  gates,
  requiredWebPilotGates,
  readyForWebPilot: requiredWebPilotGates.every((name) => gates[name]),
  readyForNativeInternalTesting: gates.NATIVE_EXPORT_PASSED && gates.NATIVE_INTERNAL_BUILD_PASSED,
  artifacts,
};

await writeFile(
  path.join(evidenceDir, "staging-release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

const gateLines = Object.entries(gates)
  .map(([name, passed]) => `- ${name}: ${passed ? "passed" : "not recorded"}`)
  .join("\n");
const artifactLines = artifacts.length
  ? artifacts
      .map((item) => `- ${item.name}: ${item.bytes} bytes · SHA-256 ${item.sha256}`)
      .join("\n")
  : "- No hosted evidence files were produced.";
const markdown = `# Haccora staging release evidence

- Generated: ${manifest.generatedAt}
- Commit: ${manifest.commitSha}
- Mode: ${manifest.mode}
- Staging project: ${manifest.staging.projectRef ?? "not configured"}
- Source migrations: ${manifest.source.migrationCount}
- Edge Functions: ${manifest.source.edgeFunctions.length}
- Ready for web pilot: ${manifest.readyForWebPilot ? "yes" : "no"}
- Ready for native internal testing: ${manifest.readyForNativeInternalTesting ? "yes" : "no"}

## Gates

${gateLines}

## Evidence artifacts

${artifactLines}

This manifest contains no passwords, service-role keys, provider tokens or customer records. A production launch still requires the separate production workflow and human approvals.
`;
await writeFile(path.join(evidenceDir, "staging-release-manifest.md"), markdown, "utf8");

console.log(
  `Staging evidence generated (${manifest.readyForWebPilot ? "web pilot ready" : "gates remain"}).`,
);
