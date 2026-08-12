import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const scanner = path.resolve("scripts/check-secrets.mjs");

test("tracked root runtime environment files fail the secret gate", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-secrets-"));
  try {
    await run("git", ["init", "--quiet"], { cwd: directory });
    await writeFile(path.join(directory, ".env"), "PUBLIC_CONFIGURATION=not-a-secret\n");
    try {
      await run("git", ["add", ".env", "--force"], { cwd: directory });
    } catch (error) {
      // Some sandboxed environments forbid staging files; the gate itself is unchanged.
      if (/not allowed/.test(String(error?.stderr ?? error))) {
        t.skip("Git staging is unavailable in this environment");
        return;
      }
      throw error;
    }

    await assert.rejects(run(process.execPath, [scanner], { cwd: directory }), (error) =>
      /\.env: environment file must not be committed/.test(error.stderr),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
