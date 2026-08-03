import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const generator = path.resolve("scripts/generate-release-evidence.mjs");

test("release evidence hashes every build file without recording secrets", async () => {
  const temp = await mkdtemp(path.join(tmpdir(), "haccora-release-evidence-"));
  const build = path.join(temp, "build");
  const evidence = path.join(temp, "evidence");
  await mkdir(path.join(build, "assets"), { recursive: true });
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(build, "index.html"), "<h1>Haccora</h1>");
  await writeFile(path.join(build, "assets/app.js"), "export const ready = true;");
  for (const filename of [
    "sbom-web.cdx.json",
    "sbom-mobile.cdx.json",
    "sbom-edge.cdx.json",
    "sbom-haccora-release.cdx.json",
  ]) {
    await writeFile(
      path.join(evidence, filename),
      `${JSON.stringify({ bomFormat: "CycloneDX", components: [{ name: filename }] })}\n`,
    );
  }

  await run(process.execPath, [generator], {
    env: {
      ...process.env,
      HACCORA_BUILD_DIR: build,
      HACCORA_EVIDENCE_DIR: evidence,
      GITHUB_SHA: "0123456789abcdef",
      STRIPE_SECRET_KEY: "must-not-be-recorded",
      QUALITY_GATE_PASSED: "true",
      SBOM_GENERATED: "true",
    },
  });

  const manifestText = await readFile(path.join(evidence, "release-manifest.json"), "utf8");
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.commitSha, "0123456789abcdef");
  assert.equal(manifest.artifact.fileCount, 2);
  assert.match(manifest.artifact.sha256, /^[a-f0-9]{64}$/);
  assert.equal(manifest.gates.QUALITY_GATE_PASSED, true);
  assert.equal(manifest.gates.SBOM_GENERATED, true);
  assert.equal(manifest.supplyChain.sboms.length, 4);
  assert.match(manifest.supplyChain.sboms[0].sha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(manifestText, /must-not-be-recorded/);
  assert.doesNotMatch(manifestText, /STRIPE_SECRET_KEY/);
});
