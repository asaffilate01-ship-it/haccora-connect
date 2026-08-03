import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = process.cwd();
const buildDir = path.resolve(root, process.env.HACCORA_BUILD_DIR ?? ".output");
const evidenceDir = path.resolve(root, process.env.HACCORA_EVIDENCE_DIR ?? "release-evidence");
const gateNames = [
  "DEPENDENCY_AUDIT_PASSED",
  "LAUNCH_PREFLIGHT_PASSED",
  "QUALITY_GATE_PASSED",
  "NATIVE_EXPORT_PASSED",
  "EDGE_FUNCTIONS_PASSED",
  "DEPLOYMENT_HEALTH_PASSED",
  "DEPLOYMENT_SMOKE_PASSED",
  "SBOM_GENERATED",
];
const sbomNames = [
  "sbom-web.cdx.json",
  "sbom-mobile.cdx.json",
  "sbom-edge.cdx.json",
  "sbom-haccora-release.cdx.json",
];

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolute, relative)));
    else if (entry.isFile()) files.push({ relative, absolute });
    else throw new Error(`Unsupported build artifact entry: ${relative}`);
  }
  return files;
}

async function sha256(file) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function commitSha() {
  const supplied = (process.env.GITHUB_SHA ?? "").trim();
  if (supplied) return supplied;
  try {
    return (await run("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  } catch {
    return "unknown";
  }
}

await stat(buildDir);
const files = await listFiles(buildDir);
if (!files.length) throw new Error(`Build directory is empty: ${buildDir}`);

const artifactFiles = [];
let totalBytes = 0;
for (const file of files) {
  const metadata = await stat(file.absolute);
  const digest = await sha256(file.absolute);
  totalBytes += metadata.size;
  artifactFiles.push({ path: file.relative, bytes: metadata.size, sha256: digest });
}

const aggregate = createHash("sha256");
for (const file of artifactFiles) {
  aggregate.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`);
}

const rootPackage = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const mobilePackage = JSON.parse(await readFile(path.join(root, "mobile/package.json"), "utf8"));
const migrationFiles = (await readdir(path.join(root, "supabase/migrations"))).filter((file) =>
  file.endsWith(".sql"),
);
const gates = Object.fromEntries(gateNames.map((name) => [name, process.env[name] === "true"]));
const sboms = [];
if (gates.SBOM_GENERATED) {
  for (const filename of sbomNames) {
    const absolute = path.join(evidenceDir, filename);
    const parsed = JSON.parse(await readFile(absolute, "utf8"));
    if (parsed.bomFormat !== "CycloneDX") throw new Error(`Invalid CycloneDX SBOM: ${filename}`);
    const metadata = await stat(absolute);
    sboms.push({
      path: filename,
      bytes: metadata.size,
      sha256: await sha256(absolute),
      components: Array.isArray(parsed.components) ? parsed.components.length : 0,
    });
  }
}
const manifest = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  repository: process.env.GITHUB_REPOSITORY ?? null,
  workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  commitSha: await commitSha(),
  nodeVersion: process.version,
  application: { webVersion: rootPackage.version ?? null, mobileVersion: mobilePackage.version },
  migrations: migrationFiles.length,
  gates,
  supplyChain: { sboms },
  artifact: {
    directory: path.relative(root, buildDir) || ".",
    fileCount: artifactFiles.length,
    totalBytes,
    sha256: aggregate.digest("hex"),
    files: artifactFiles,
  },
};

await mkdir(evidenceDir, { recursive: true });
await writeFile(
  path.join(evidenceDir, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
const gateLines = Object.entries(gates)
  .map(([name, passed]) => `- ${name}: ${passed ? "passed" : "not recorded"}`)
  .join("\n");
const markdown = `# Haccora automated release evidence

- Generated: ${manifest.generatedAt}
- Commit: ${manifest.commitSha}
- Workflow run: ${manifest.workflowRunId ?? "local"}
- Build files: ${manifest.artifact.fileCount}
- Build bytes: ${manifest.artifact.totalBytes}
- Build SHA-256: ${manifest.artifact.sha256}
- Database migrations: ${manifest.migrations}
- SBOMs: ${manifest.supplyChain.sboms.length}

## Software supply chain

${manifest.supplyChain.sboms.map((sbom) => `- ${sbom.path}: ${sbom.components} components · SHA-256 ${sbom.sha256}`).join("\n")}

## Gates

${gateLines}

The JSON manifest contains the SHA-256 digest and per-file hashes for the immutable build artifact. Human approvals and provider evidence remain in the private release record.
`;
await writeFile(path.join(evidenceDir, "release-manifest.md"), markdown, "utf8");

console.log(
  `Release evidence generated (${artifactFiles.length} files, SHA-256 ${manifest.artifact.sha256}).`,
);
