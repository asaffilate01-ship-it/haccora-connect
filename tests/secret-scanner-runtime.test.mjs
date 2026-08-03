import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const scanner = path.resolve("scripts/check-secrets.mjs");

test("tracked root runtime environment files fail the secret gate", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-secrets-"));
  try {
    await run("git", ["init", "--quiet"], { cwd: directory });
    await writeFile(path.join(directory, ".env"), "PUBLIC_CONFIGURATION=not-a-secret\n");
    await run("git", ["add", ".env", "--force"], { cwd: directory });

    await assert.rejects(run(process.execPath, [scanner], { cwd: directory }), (error) =>
      /\.env: environment file must not be committed/.test(error.stderr),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
