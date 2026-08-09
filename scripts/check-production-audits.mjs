import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyFile = path.join(root, "security/dependency-audit-exceptions.json");

function advisoryId(url) {
  return (
    String(url ?? "")
      .match(/GHSA-[a-z0-9-]+/i)?.[0]
      ?.toUpperCase() ?? null
  );
}

export function directAdvisories(report) {
  const found = [];
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      if (typeof via === "object" && via !== null) {
        const advisory = advisoryId(via.url);
        if (advisory) {
          found.push({ advisory, package: via.name, severity: via.severity });
        }
      }
    }
  }
  return [...new Map(found.map((item) => [`${item.package}:${item.advisory}`, item])).values()];
}

function leafAdvisories(report, packageName, seen = new Set()) {
  if (seen.has(packageName)) return new Set();
  const nextSeen = new Set(seen).add(packageName);
  const vulnerability = report.vulnerabilities?.[packageName];
  const leaves = new Set();
  for (const via of vulnerability?.via ?? []) {
    if (typeof via === "string") {
      for (const advisory of leafAdvisories(report, via, nextSeen)) leaves.add(advisory);
    } else if (via && typeof via === "object") {
      const advisory = advisoryId(via.url);
      if (advisory) leaves.add(advisory);
    }
  }
  return leaves;
}

export function assessAudit(report, scope, policy, today = new Date()) {
  const vulnerabilityNames = Object.keys(report.vulnerabilities ?? {});
  if (!vulnerabilityNames.length) return { passed: true, exceptions: [] };

  const date = today.toISOString().slice(0, 10);
  const active = new Map(
    (policy.exceptions ?? [])
      .filter((item) => item.scope === scope && item.expiresOn >= date)
      .map((item) => [`${item.package}:${item.advisory.toUpperCase()}`, item]),
  );
  const direct = directAdvisories(report);
  const uncoveredDirect = direct.filter((item) => {
    const exception = active.get(`${item.package}:${item.advisory}`);
    return !exception || exception.severity !== item.severity;
  });
  const allowedIds = new Set(direct.map((item) => item.advisory));
  const unexplainedChains = vulnerabilityNames.filter((name) => {
    const leaves = leafAdvisories(report, name);
    return !leaves.size || [...leaves].some((advisory) => !allowedIds.has(advisory));
  });
  const directKeys = new Set(direct.map((item) => `${item.package}:${item.advisory}`));
  const expired = (policy.exceptions ?? []).filter(
    (item) =>
      item.scope === scope &&
      item.expiresOn < date &&
      directKeys.has(`${item.package}:${item.advisory.toUpperCase()}`),
  );

  return {
    passed: uncoveredDirect.length === 0 && unexplainedChains.length === 0 && expired.length === 0,
    exceptions: direct,
    uncoveredDirect,
    unexplainedChains,
    expired,
  };
}

function runAudit(scope, directory, policy) {
  const result = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    cwd: directory,
    encoding: "utf8",
    env: {
      ...process.env,
      NPM_CONFIG_CACHE:
        process.env.NPM_CONFIG_CACHE ?? path.join(tmpdir(), "haccora-production-audit-cache"),
    },
    maxBuffer: 20 * 1024 * 1024,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error(`${scope} npm audit did not return valid JSON: ${result.stderr.trim()}`);
  }
  const assessment = assessAudit(report, scope, policy);
  if (!assessment.passed) {
    throw new Error(
      `${scope} dependency audit failed: ${JSON.stringify({
        vulnerabilities: report.metadata?.vulnerabilities,
        uncoveredDirect: assessment.uncoveredDirect,
        unexplainedChains: assessment.unexplainedChains,
        expired: assessment.expired.map((item) => `${item.package}:${item.advisory}`),
      })}`,
    );
  }
  if (assessment.exceptions.length) {
    console.log(
      `${scope} audit passed with ${assessment.exceptions.length} exact temporary build-tool exception(s).`,
    );
  } else {
    console.log(`${scope} production dependency audit passed with zero findings.`);
  }
}

function main() {
  const policy = JSON.parse(readFileSync(policyFile, "utf8"));
  const scopes = [
    ["root", root],
    ["mobile", path.join(root, "mobile")],
    ["edge", path.join(root, "supabase/functions")],
  ];
  for (const [scope, directory] of scopes) runAudit(scope, directory, policy);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
