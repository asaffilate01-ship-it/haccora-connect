import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const input = path.resolve(
  process.env.EAS_BUILD_RESULT_FILE ?? "../release-evidence/eas-internal-build.raw.json",
);
const output = path.resolve(
  process.env.EAS_BUILD_MANIFEST_FILE ?? "../release-evidence/eas-internal-build.json",
);
const expectedPlatform = String(process.env.EAS_EXPECTED_PLATFORM ?? "")
  .trim()
  .toLowerCase();
const releaseSha = String(process.env.HACCORA_RELEASE_SHA ?? process.env.GITHUB_SHA ?? "")
  .trim()
  .toLowerCase();
const expectedPlatforms =
  expectedPlatform === "all"
    ? new Set(["ios", "android"])
    : new Set(expectedPlatform ? [expectedPlatform] : []);
const failures = [];

if (!/^[0-9a-f]{40}$/.test(releaseSha)) {
  failures.push("HACCORA_RELEASE_SHA must be the full source commit SHA");
}
if (!["all", "ios", "android"].includes(expectedPlatform)) {
  failures.push("EAS_EXPECTED_PLATFORM must be all, ios or android");
}

let raw = "";
let builds = [];
try {
  raw = await readFile(input, "utf8");
  const parsed = JSON.parse(raw);
  builds = Array.isArray(parsed) ? parsed : [parsed];
} catch (error) {
  failures.push(`EAS build output is unreadable: ${error.message}`);
}

const accepted = [];
for (const build of builds) {
  const platform = String(build?.platform ?? "").toLowerCase();
  const status = String(build?.status ?? "").toUpperCase();
  const distribution = String(build?.distribution ?? "INTERNAL").toUpperCase();
  const id = String(build?.id ?? "").trim();

  if (!expectedPlatforms.has(platform)) {
    failures.push(`Unexpected or missing EAS build platform: ${platform || "unknown"}`);
  }
  if (status !== "FINISHED")
    failures.push(`${platform || "unknown"} EAS build is ${status || "unknown"}`);
  if (distribution !== "INTERNAL") {
    failures.push(`${platform || "unknown"} EAS build is not internal distribution`);
  }
  if (!/^[a-z0-9-]{8,}$/i.test(id))
    failures.push(`${platform || "unknown"} EAS build id is missing`);

  accepted.push({
    id,
    platform,
    status,
    distribution,
    appVersion: build?.appVersion ?? null,
    buildVersion: build?.appBuildVersion ?? build?.buildVersion ?? null,
  });
}

for (const platform of expectedPlatforms) {
  if (!accepted.some((build) => build.platform === platform)) {
    failures.push(`EAS output does not contain the requested ${platform} build`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  releaseSha,
  requestedPlatform: expectedPlatform,
  sourceResultSha256: createHash("sha256").update(raw).digest("hex"),
  builds: accepted.sort((left, right) => left.platform.localeCompare(right.platform)),
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Verified ${accepted.length} signed internal EAS build result(s).`);
