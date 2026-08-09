import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const approvalRoles = [
  "productOwner",
  "security",
  "privacyLegal",
  "foodSafetySpecialist",
  "operations",
];
const requiredChecks = [
  "stagingRehearsal",
  "tenantIsolation",
  "backupRestore",
  "penetrationTest",
  "accessibility",
  "nativeIos",
  "nativeAndroid",
  "offlineSync",
  "billing",
  "notifications",
  "malwareScanning",
  "incidentResponse",
];
const placeholder = /(replace|example|pending|unknown|tbd|todo|your[_ -])/i;

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function timestamp(errors, label, value, now, maximumAgeDays = 365, allowFuture = false) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${label} is required`);
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    errors.push(`${label} must be an ISO 8601 timestamp`);
    return null;
  }
  if (!allowFuture && parsed > now.getTime() + 5 * 60_000) {
    errors.push(`${label} cannot be in the future`);
  }
  if (parsed < now.getTime() - maximumAgeDays * 86_400_000) {
    errors.push(`${label} is older than ${maximumAgeDays} days`);
  }
  return parsed;
}

function text(errors, label, value, minimum = 4) {
  if (typeof value !== "string" || value.trim().length < minimum || placeholder.test(value)) {
    errors.push(`${label} is missing, too short or still a placeholder`);
    return "";
  }
  return value.trim();
}

function canonicalHttps(errors, label, value, requireHaccoraHost = false) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("HTTPS required");
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("credentials, query and fragment are forbidden");
    }
    if (
      requireHaccoraHost &&
      parsed.hostname !== "haccora.co.uk" &&
      !parsed.hostname.endsWith(".haccora.co.uk")
    ) {
      throw new Error("production must use haccora.co.uk");
    }
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${pathname}`;
  } catch (error) {
    errors.push(
      `${label} must be a safe HTTPS URL (${error instanceof Error ? error.message : "invalid"})`,
    );
    return "";
  }
}

function number(errors, label, value) {
  if (!Number.isFinite(value) || value < 0) {
    errors.push(`${label} must be a non-negative number`);
    return null;
  }
  return value;
}

export function validateLaunchAcceptance(
  record,
  { expectedReleaseSha, productionUrl, requiredRisks = [], now = new Date() },
) {
  const errors = [];
  const candidate = object(record);
  if (candidate.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!/^[a-f0-9]{40}$/.test(expectedReleaseSha ?? "")) {
    errors.push("EXPECTED_RELEASE_SHA must be a complete lowercase Git commit SHA");
  }
  if (candidate.releaseSha !== expectedReleaseSha) {
    errors.push("releaseSha must match the exact release workflow commit");
  }
  const expectedUrl = canonicalHttps(errors, "PRODUCTION_URL", productionUrl, true);
  const acceptedUrl = canonicalHttps(errors, "productionUrl", candidate.productionUrl, true);
  if (expectedUrl && acceptedUrl && expectedUrl !== acceptedUrl) {
    errors.push("productionUrl must match the deployed candidate URL exactly");
  }
  timestamp(errors, "preparedAt", candidate.preparedAt, now, 30);

  const market = object(candidate.market);
  for (const [field, expected] of [
    ["countryCode", "GB"],
    ["jurisdiction", "United Kingdom"],
    ["currency", "GBP"],
    ["timezone", "Europe/London"],
  ]) {
    if (market[field] !== expected) errors.push(`market.${field} must be ${expected}`);
  }

  const approvals = object(candidate.approvals);
  for (const role of approvalRoles) {
    const approval = object(approvals[role]);
    if (approval.status !== "approved") errors.push(`approvals.${role}.status must be approved`);
    text(errors, `approvals.${role}.approvedBy`, approval.approvedBy);
    timestamp(errors, `approvals.${role}.approvedAt`, approval.approvedAt, now);
    text(errors, `approvals.${role}.evidenceRef`, approval.evidenceRef);
  }

  const checks = object(candidate.checks);
  for (const name of requiredChecks) {
    const check = object(checks[name]);
    if (check.status !== "passed") errors.push(`checks.${name}.status must be passed`);
    timestamp(errors, `checks.${name}.completedAt`, check.completedAt, now);
    text(errors, `checks.${name}.evidenceRef`, check.evidenceRef);
  }

  const restore = object(checks.backupRestore);
  const measuredRpo = number(
    errors,
    "checks.backupRestore.measuredRpoMinutes",
    restore.measuredRpoMinutes,
  );
  const targetRpo = number(
    errors,
    "checks.backupRestore.targetRpoMinutes",
    restore.targetRpoMinutes,
  );
  const measuredRto = number(
    errors,
    "checks.backupRestore.measuredRtoMinutes",
    restore.measuredRtoMinutes,
  );
  const targetRto = number(
    errors,
    "checks.backupRestore.targetRtoMinutes",
    restore.targetRtoMinutes,
  );
  if (measuredRpo !== null && targetRpo !== null && measuredRpo > targetRpo) {
    errors.push("backup restore measured RPO exceeds the approved target");
  }
  if (measuredRto !== null && targetRto !== null && measuredRto > targetRto) {
    errors.push("backup restore measured RTO exceeds the approved target");
  }

  const penetration = object(checks.penetrationTest);
  if (penetration.openCritical !== 0)
    errors.push("penetration test must have zero open critical findings");
  if (penetration.openHigh !== 0) errors.push("penetration test must have zero open high findings");
  for (const platform of ["nativeIos", "nativeAndroid"]) {
    const native = object(checks[platform]);
    text(errors, `checks.${platform}.buildId`, native.buildId);
    if (native.physicalDeviceTested !== true) {
      errors.push(`checks.${platform}.physicalDeviceTested must be true`);
    }
    if (native.internalDistributionTested !== true) {
      errors.push(`checks.${platform}.internalDistributionTested must be true`);
    }
  }

  const privacy = object(candidate.privacy);
  for (const field of [
    "dpiaReference",
    "specialCategoryConditionReference",
    "retentionScheduleReference",
    "subprocessorRegisterReference",
    "icoPositionReference",
  ]) {
    text(errors, `privacy.${field}`, privacy[field]);
  }
  const foodSafety = object(candidate.foodSafety);
  for (const field of [
    "reviewerCompetenceReference",
    "haccpReviewReference",
    "claimsReviewReference",
  ]) {
    text(errors, `foodSafety.${field}`, foodSafety[field]);
  }

  const operations = object(candidate.operations);
  text(errors, "operations.rollbackOwner", operations.rollbackOwner);
  text(errors, "operations.onCallReference", operations.onCallReference);
  const windowStart = timestamp(
    errors,
    "operations.releaseWindowStart",
    operations.releaseWindowStart,
    now,
    365,
    true,
  );
  const windowEnd = timestamp(
    errors,
    "operations.releaseWindowEnd",
    operations.releaseWindowEnd,
    now,
    365,
    true,
  );
  if (windowStart !== null && windowEnd !== null && windowEnd <= windowStart) {
    errors.push("operations.releaseWindowEnd must be after releaseWindowStart");
  }
  if (
    !Number.isInteger(operations.monitoringWindowMinutes) ||
    operations.monitoringWindowMinutes < 60
  ) {
    errors.push("operations.monitoringWindowMinutes must be an integer of at least 60");
  }
  canonicalHttps(errors, "operations.statusPageUrl", operations.statusPageUrl);

  const acceptances = Array.isArray(candidate.riskAcceptances) ? candidate.riskAcceptances : [];
  const acceptanceMap = new Map(acceptances.map((entry) => [entry?.id, object(entry)]));
  for (const risk of requiredRisks) {
    const entry = acceptanceMap.get(risk.id) ?? {};
    if (entry.accepted !== true) errors.push(`riskAcceptances.${risk.id} must be accepted`);
    if (entry.expiresOn !== risk.expiresOn) {
      errors.push(`riskAcceptances.${risk.id}.expiresOn must match ${risk.expiresOn}`);
    }
    text(errors, `riskAcceptances.${risk.id}.evidenceRef`, entry.evidenceRef);
  }

  return {
    passed: errors.length === 0,
    errors,
    summary: {
      schemaVersion: 1,
      releaseSha: candidate.releaseSha ?? null,
      productionUrl: acceptedUrl || null,
      preparedAt: candidate.preparedAt ?? null,
      market: market.countryCode === "GB" ? "GB" : null,
      approvals: approvalRoles.filter((role) => approvals[role]?.status === "approved"),
      checks: requiredChecks.filter((name) => checks[name]?.status === "passed"),
      riskAcceptances: requiredRisks.map((risk) => risk.id),
    },
  };
}

async function main() {
  const raw = (process.env.LAUNCH_ACCEPTANCE_JSON ?? "").trim();
  if (!raw)
    throw new Error("LAUNCH_ACCEPTANCE_JSON is required in the protected production environment");
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    throw new Error("LAUNCH_ACCEPTANCE_JSON must contain valid JSON");
  }
  const policy = JSON.parse(
    await readFile(path.join(root, "security/dependency-audit-exceptions.json"), "utf8"),
  );
  const today = new Date().toISOString().slice(0, 10);
  const requiredRisks = (policy.exceptions ?? [])
    .filter((entry) => entry.expiresOn >= today)
    .map((entry) => ({
      id: `${entry.scope}:${entry.package}:${entry.advisory.toUpperCase()}`,
      expiresOn: entry.expiresOn,
    }));
  const assessment = validateLaunchAcceptance(record, {
    expectedReleaseSha: (process.env.EXPECTED_RELEASE_SHA ?? "").trim().toLowerCase(),
    productionUrl: (process.env.PRODUCTION_URL ?? "").trim(),
    requiredRisks,
  });
  if (!assessment.passed) {
    console.error(assessment.errors.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  const evidenceDirectory = path.resolve(
    root,
    process.env.HACCORA_EVIDENCE_DIR ?? "release-evidence",
  );
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    path.join(evidenceDirectory, "launch-acceptance-summary.json"),
    `${JSON.stringify(
      {
        ...assessment.summary,
        checkedAt: new Date().toISOString(),
        acceptanceSha256: createHash("sha256").update(raw).digest("hex"),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log("Protected launch acceptance verification passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
