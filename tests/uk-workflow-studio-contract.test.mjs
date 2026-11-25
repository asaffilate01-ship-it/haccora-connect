import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/routes/app.workflows.tsx", import.meta.url), "utf8");

test("workflow reads are scoped and stale results are discarded", () => {
  assert.match(source, /\.eq\("organization_id", organizationId\)/);
  assert.match(source, /location_id\.eq\.\$\{locationId\},location_id\.is\.null/);
  assert.match(source, /\.eq\("location_id", locationId\)/);
  assert.match(source, /request !== requestId\.current/);
  assert.match(source, /Workflow records could not be loaded/);
  assert.match(source, /Showing \{templates\.length\} of \{total\}/);
});

test("draft creation requires bounded input, manager access and confirmed writes", () => {
  assert.match(source, /if \(!manager \|\| !validDraft\) return/);
  assert.match(source, /cleanSteps\.length <= 50/);
  assert.match(source, /stepResult\.data\?\.length !== cleanSteps\.length/);
  assert.match(source, /templateResult\.error \|\| !templateResult\.data/);
  assert.match(source, /versionResult\.error \|\| !versionResult\.data/);
  assert.match(source, /writeLock\.current/);
});

test("publication distinguishes an active pointer from a confirmed approved version", () => {
  assert.match(source, /publishedVersions\[template\.id\] === template\.active_version_id/);
  assert.match(source, /current\.data\.active_version_id !== template\.active_version_id/);
  assert.match(source, /required\.error \|\| !required\.count/);
  assert.match(source, /activated\.error \|\| !activated\.data/);
  assert.match(source, /published\.error \|\| !published\.data/);
  assert.match(source, /Finish publication/);
  assert.match(source, /Publication incomplete/);
});

test("scheduling requires current approved evidence and a confirmed run record", () => {
  assert.match(source, /!canSchedule \|\| !template\.is_active \|\| !isPublished\(template\)/);
  assert.match(source, /current\.active_version_id !== template\.active_version_id/);
  assert.match(source, /version\.error \|\| !version\.data\?\.published_at/);
  assert.match(source, /saved\.error \|\| !saved\.data/);
  assert.match(source, /manual:\$\{template\.id\}:\$\{locationId\}:\$\{userId\}/);
});

test("duplicate scheduling confirms the existing scoped run without rewriting it", () => {
  assert.match(source, /saved\.error\?\.code === "23505"/);
  assert.match(source, /\.eq\("idempotency_key", key\)/);
  assert.match(source, /\.eq\("assigned_to", userId\)/);
  assert.match(source, /\.eq\("version_id", version\.data\.id\)/);
  assert.match(source, /existing\.data\.status !== "scheduled"/);
  assert.match(source, /The matching workflow run is already scheduled/);
  assert.doesNotMatch(source, /\.from\("workflow_runs"\)\s*\.upsert\(/);
});
