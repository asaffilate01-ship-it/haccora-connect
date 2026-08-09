import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the public Help Centre extends the launch FAQ without overloading the landing page", async () => {
  const [help, content, landing, publicConfig, sitemap, workerSmoke] = await Promise.all([
    read("src/routes/help.tsx"),
    read("src/lib/help-centre.ts"),
    read("src/routes/index.tsx"),
    read("src/lib/public-config.ts"),
    read("src/routes/sitemap[.]xml.ts"),
    read("scripts/check-built-worker.mjs"),
  ]);

  assert.equal((content.match(/title: "/g) ?? []).length, 9);
  assert.ok((content.match(/question: "/g) ?? []).length >= 26);
  for (const expected of [
    "row-level security",
    "equipment QR",
    "Foreground GPS",
    "Inspector Mode",
    "Apple and Google",
  ]) {
    assert.match(content, new RegExp(expected, "i"));
  }
  assert.match(help, /type="search"/);
  assert.match(help, /aria-live="polite"/);
  assert.match(landing, /<Link to="\/help"/);
  assert.doesNotMatch(publicConfig, /https:\/\/support\.haccora\.co\.uk/);
  assert.doesNotMatch(publicConfig, /https:\/\/status\.haccora\.co\.uk/);
  assert.match(sitemap, /path: "\/help"/);
  assert.match(workerSmoke, /\["\/help", "text\/html"\]/);
});

test("only the exact published Phase 32 dashboard replay is ledger-governed", async () => {
  const checker = await read("scripts/check-migration-lineage.mjs");
  assert.match(
    checker,
    /public\.get_platform_dashboard:20260809193720_ae583ee2-089e-4eae-9406-2502454f3cde\.sql:20260809213000_fix_platform_temperature_timestamp\.sql/,
  );
});

test("core CI and CodeQL can be started manually after a Lovable release", async () => {
  const [ci, codeql] = await Promise.all([
    read(".github/workflows/ci.yml"),
    read(".github/workflows/codeql.yml"),
  ]);
  assert.match(ci, /workflow_dispatch:/);
  assert.match(codeql, /workflow_dispatch:/);
});
