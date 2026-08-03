import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const reporter = path.resolve("scripts/report-github-deployment.mjs");

test("GitHub deployment reporting rejects unsafe production URLs before requesting", async () => {
  await assert.rejects(
    run(process.execPath, [reporter], {
      env: {
        ...process.env,
        GITHUB_REPOSITORY: "asaffilate01-ship-it/haccora",
        GITHUB_SHA: "0123456789abcdef0123456789abcdef01234567",
        GITHUB_TOKEN: "test-token-never-sent",
        PRODUCTION_URL: "http://example.com/?token=secret",
      },
    }),
    (error) => /PRODUCTION_URL must be a clean HTTPS URL/.test(error.stderr),
  );
});
