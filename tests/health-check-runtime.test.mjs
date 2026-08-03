import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const checker = path.resolve("scripts/check-deployment-health.mjs");

test("production health gate requires an explicit URL", async () => {
  await assert.rejects(
    run(process.execPath, [checker], {
      env: { ...process.env, PRODUCTION_URL: "" },
    }),
    (error) => /PRODUCTION_URL is missing/.test(error.stderr),
  );
});

test("production health gate rejects non-HTTPS targets", async () => {
  await assert.rejects(
    run(process.execPath, [checker], {
      env: { ...process.env, PRODUCTION_URL: "http://localhost:4173" },
    }),
    (error) => /must use HTTPS/.test(error.stderr),
  );
});

test("production health gate rejects an abbreviated expected release", async () => {
  await assert.rejects(
    run(process.execPath, [checker], {
      env: {
        ...process.env,
        PRODUCTION_URL: "https://example.com",
        EXPECTED_RELEASE_SHA: "0123456789abcdef",
      },
    }),
    (error) => /full 40-character Git commit SHA/.test(error.stderr),
  );
});
