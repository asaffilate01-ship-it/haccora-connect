import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { findUnpinnedActions } from "../scripts/check-action-pins.mjs";
import { validateLaunchAcceptance } from "../scripts/verify-launch-acceptance.mjs";

const run = promisify(execFile);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const releaseSha = "1234567890abcdef1234567890abcdef12345678";
const productionUrl = "https://app.haccora.co.uk";
const requiredRisks = [
  { id: "mobile:image-size:GHSA-W3RX-R6R6-PGPR", expiresOn: "2026-09-30" },
  { id: "mobile:image-size:GHSA-5P2G-FCMC-QVQQ", expiresOn: "2026-09-30" },
];

function acceptance(now = new Date()) {
  const completedAt = new Date(now.getTime() - 60 * 60_000).toISOString();
  const releaseWindowStart = new Date(now.getTime() + 60 * 60_000).toISOString();
  const releaseWindowEnd = new Date(now.getTime() + 3 * 60 * 60_000).toISOString();
  const approval = (role) => ({
    status: "approved",
    approvedBy: `${role} reviewer`,
    approvedAt: completedAt,
    evidenceRef: `GRC-${role}-2026-001`,
  });
  const check = (name) => ({
    status: "passed",
    completedAt,
    evidenceRef: `TEST-${name}-2026-001`,
  });
  return {
    schemaVersion: 1,
    releaseSha,
    productionUrl,
    preparedAt: now.toISOString(),
    market: {
      countryCode: "GB",
      jurisdiction: "United Kingdom",
      currency: "GBP",
      timezone: "Europe/London",
    },
    approvals: {
      productOwner: approval("product-owner"),
      security: approval("security"),
      privacyLegal: approval("privacy-legal"),
      foodSafetySpecialist: approval("food-safety"),
      operations: approval("operations"),
    },
    checks: {
      stagingRehearsal: check("staging"),
      tenantIsolation: check("tenant-isolation"),
      backupRestore: {
        ...check("restore"),
        measuredRpoMinutes: 4,
        targetRpoMinutes: 15,
        measuredRtoMinutes: 25,
        targetRtoMinutes: 60,
      },
      penetrationTest: { ...check("penetration"), openCritical: 0, openHigh: 0 },
      accessibility: check("accessibility"),
      nativeIos: {
        ...check("ios"),
        buildId: "ios-build-101",
        physicalDeviceTested: true,
        internalDistributionTested: true,
      },
      nativeAndroid: {
        ...check("android"),
        buildId: "android-build-101",
        physicalDeviceTested: true,
        internalDistributionTested: true,
      },
      offlineSync: check("offline-sync"),
      billing: check("billing"),
      notifications: check("notifications"),
      malwareScanning: check("malware"),
      incidentResponse: check("incident-response"),
    },
    privacy: {
      dpiaReference: "PRIV-DPIA-001",
      specialCategoryConditionReference: "PRIV-ARTICLE9-001",
      retentionScheduleReference: "PRIV-RETENTION-001",
      subprocessorRegisterReference: "PRIV-SUBPROCESSORS-001",
      icoPositionReference: "PRIV-ICO-001",
    },
    foodSafety: {
      reviewerCompetenceReference: "FS-COMPETENCE-001",
      haccpReviewReference: "FS-HACCP-001",
      claimsReviewReference: "FS-CLAIMS-001",
    },
    operations: {
      rollbackOwner: "Release manager",
      onCallReference: "OPS-ONCALL-001",
      releaseWindowStart,
      releaseWindowEnd,
      monitoringWindowMinutes: 120,
      statusPageUrl: "https://status.haccora.co.uk",
    },
    riskAcceptances: requiredRisks.map((risk) => ({
      ...risk,
      accepted: true,
      evidenceRef: `SEC-${risk.id.slice(-8)}-001`,
    })),
  };
}

test("Phase 27 accepts only complete UK launch evidence for the exact release", () => {
  const now = new Date("2026-08-09T12:00:00Z");
  const record = acceptance(now);
  const result = validateLaunchAcceptance(record, {
    expectedReleaseSha: releaseSha,
    productionUrl,
    requiredRisks,
    now,
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.passed, true);
  assert.equal(result.summary.market, "GB");
  assert.equal(result.summary.approvals.length, 5);
  assert.equal(result.summary.checks.length, 12);
});

test("Phase 27 fails closed on release mismatch, restore breach and security findings", () => {
  const now = new Date("2026-08-09T12:00:00Z");
  const record = acceptance(now);
  record.releaseSha = "0".repeat(40);
  record.checks.backupRestore.measuredRtoMinutes = 61;
  record.checks.penetrationTest.openHigh = 1;
  record.riskAcceptances[0].accepted = false;
  const result = validateLaunchAcceptance(record, {
    expectedReleaseSha: releaseSha,
    productionUrl,
    requiredRisks,
    now,
  });
  assert.equal(result.passed, false);
  assert.match(result.errors.join("\n"), /releaseSha must match/);
  assert.match(result.errors.join("\n"), /measured RTO exceeds/);
  assert.match(result.errors.join("\n"), /zero open high/);
  assert.match(result.errors.join("\n"), /must be accepted/);
});

test("Phase 27 writes only a non-sensitive acceptance digest", async () => {
  const evidence = await mkdtemp(path.join(tmpdir(), "haccora-launch-acceptance-"));
  const record = acceptance(new Date());
  const result = await run(process.execPath, ["scripts/verify-launch-acceptance.mjs"], {
    env: {
      ...process.env,
      EXPECTED_RELEASE_SHA: releaseSha,
      PRODUCTION_URL: productionUrl,
      LAUNCH_ACCEPTANCE_JSON: JSON.stringify(record),
      HACCORA_EVIDENCE_DIR: evidence,
    },
  });
  assert.match(result.stdout, /verification passed/);
  const summaryText = await readFile(path.join(evidence, "launch-acceptance-summary.json"), "utf8");
  const summary = JSON.parse(summaryText);
  assert.match(summary.acceptanceSha256, /^[a-f0-9]{64}$/);
  assert.equal(summary.releaseSha, releaseSha);
  assert.doesNotMatch(summaryText, /approvedBy|evidenceRef|reviewer/);
});

test("Phase 27 pins every third-party workflow action and reconciles only the published replay", async () => {
  assert.deepEqual(findUnpinnedActions("steps:\n  - uses: actions/checkout@v6", "sample.yml"), [
    "sample.yml:2 action is not pinned to a full commit SHA: actions/checkout@v6",
  ]);
  assert.deepEqual(
    findUnpinnedActions(
      "steps:\n  - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6",
      "sample.yml",
    ),
    [],
  );
  const [lineage, release, evidence, packageJson, security] = await Promise.all([
    read("scripts/check-migration-lineage.mjs"),
    read(".github/workflows/release-readiness.yml"),
    read("scripts/generate-release-evidence.mjs"),
    read("package.json"),
    read("SECURITY.md"),
  ]);
  assert.match(lineage, /public\.record_service_job_heartbeat:20260809112615[\s\S]*20260809120000/);
  assert.match(release, /LAUNCH_ACCEPTANCE_JSON/);
  assert.match(release, /LAUNCH_ACCEPTANCE_PASSED: "true"/);
  assert.match(evidence, /launch-acceptance-summary\.json/);
  assert.match(evidence, /LAUNCH_ACCEPTANCE_PASSED/);
  assert.equal(
    JSON.parse(packageJson).scripts["actions:check"],
    "node scripts/check-action-pins.mjs",
  );
  assert.match(security, /haccora-connect\/security\/advisories\/new/);
});
