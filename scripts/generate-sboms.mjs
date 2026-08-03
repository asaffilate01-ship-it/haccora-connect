import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = process.cwd();
const outputDirectory = path.resolve(root, process.env.HACCORA_EVIDENCE_DIR ?? "release-evidence");
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
const projects = [
  { scope: "web", directory: root },
  { scope: "mobile", directory: path.join(root, "mobile") },
  { scope: "edge", directory: path.join(root, "supabase/functions") },
];

function componentKey(component) {
  return (
    component?.purl ??
    component?.["bom-ref"] ??
    [component?.type, component?.group, component?.name, component?.version].join(":")
  );
}

await mkdir(outputDirectory, { recursive: true });

const generated = [];
for (const project of projects) {
  const packageJson = JSON.parse(
    await readFile(path.join(project.directory, "package.json"), "utf8"),
  );
  if (!packageJson.name || !packageJson.version) {
    throw new Error(`${project.scope} package metadata requires a name and version`);
  }

  const { stdout } = await run(npmExecutable, ["sbom", "--omit=dev", "--sbom-format=cyclonedx"], {
    cwd: project.directory,
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024,
  });
  const sbom = JSON.parse(stdout);
  if (sbom.bomFormat !== "CycloneDX" || !Array.isArray(sbom.components)) {
    throw new Error(`${project.scope} produced an invalid CycloneDX SBOM`);
  }

  const filename = `sbom-${project.scope}.cdx.json`;
  await writeFile(path.join(outputDirectory, filename), `${JSON.stringify(sbom, null, 2)}\n`);
  generated.push({ ...project, filename, packageJson, sbom });
}

const componentMap = new Map();
for (const item of generated) {
  const topLevel = item.sbom.metadata?.component;
  for (const component of [topLevel, ...item.sbom.components].filter(Boolean)) {
    const key = componentKey(component);
    if (!componentMap.has(key)) componentMap.set(key, component);
  }
}

const aggregate = {
  $schema: "https://cyclonedx.org/schema/bom-1.6.schema.json",
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: "application",
      name: "haccora-release",
      version: generated[0].packageJson.version,
      "bom-ref": `pkg:generic/haccora-release@${generated[0].packageJson.version}`,
    },
    properties: generated.map((item) => ({
      name: `haccora:source-sbom:${item.scope}`,
      value: item.filename,
    })),
  },
  components: [...componentMap.values()].sort((left, right) =>
    componentKey(left).localeCompare(componentKey(right)),
  ),
};

const aggregateFilename = "sbom-haccora-release.cdx.json";
await writeFile(
  path.join(outputDirectory, aggregateFilename),
  `${JSON.stringify(aggregate, null, 2)}\n`,
);

console.log(
  `CycloneDX SBOMs generated (${generated.length} applications, ${aggregate.components.length} unique components).`,
);
