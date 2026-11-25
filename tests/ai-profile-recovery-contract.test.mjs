import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ai = await readFile(new URL("../src/routes/app.ai-assistant.tsx", import.meta.url), "utf8");
const profile = await readFile(
  new URL("../src/routes/app.uk-compliance.tsx", import.meta.url),
  "utf8",
);

test("AI refreshes do not overlap or replace a newer review", () => {
  assert.match(ai, /readingRun\.current === id/);
  assert.match(ai, /currentRunId\.current !== id/);
  assert.match(ai, /if \(readingRun\.current === id\) readingRun\.current = ""/);
  assert.match(ai, /setRefreshError\(""\)/);
  assert.match(ai, /void readRun\(id\)/);
  assert.match(ai, /maxLength=\{3000\}/);
  assert.match(ai, /question\.trim\(\)\.length > 3000/);
});

test("compliance forms are scoped to a user and location and fail closed on load errors", () => {
  assert.match(
    profile,
    /key=\{\x60\$\{user\.id\}:\$\{user\.organizationId\}:\$\{user\.locationId\}\x60\}/,
  );
  assert.match(profile, /\.eq\("organization_id", organizationId\)/);
  assert.match(profile, /\.eq\("location_id", locationId\)/);
  assert.match(profile, /if \(cancelled\) return/);
  assert.match(profile, /disabled=\{loadState !== "ready" \|\| saving\}/);
  assert.match(profile, /Retry loading/);
});

test("registration evidence dates are preserved and save success requires a returned record", () => {
  assert.match(profile, /confirmationDate \?\? operationalDate\(new Date\(\), "Europe\/London"\)/);
  assert.match(profile, /\.select\("registration_confirmed_at"\)\s*\.single\(\)/);
  assert.match(profile, /if \(error \|\| !data\) throw new Error\("Profile not saved"\)/);
  assert.doesNotMatch(profile, /setMessage\(error\?\.message/);
});

test("AI reviews are keyed to the authorised workspace and connection evidence", () => {
  assert.match(ai, /!user\?\.organizationId/);
  assert.match(ai, /\["owner", "manager", "chef"\]\.includes\(user\.role\)/);
  assert.match(ai, /key=\{workspaceKey\}/);
  assert.match(ai, /scope !== lifetime\.current/);
  assert.match(ai, /request !== statusRequest\.current/);
  assert.match(ai, /data\.countryCode !== "GB"/);
  assert.match(ai, /setBridge\(null\)/);
  assert.match(ai, /statusLoading \|\| !bridge \? null/);
  assert.match(ai, /Check connection/);
});

test("hidden browser tabs do not poll the AI provider", () => {
  assert.match(ai, /document\.visibilityState === "visible"/);
  assert.match(ai, /document\.addEventListener\("visibilitychange", refreshVisible\)/);
  assert.match(ai, /document\.removeEventListener\("visibilitychange", refreshVisible\)/);
  assert.match(ai, /window\.clearInterval\(timer\)/);
});
