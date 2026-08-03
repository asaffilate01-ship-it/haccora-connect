import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const checker = path.resolve("scripts/check-build-budget.mjs");

test("bundle budget accepts production chunks at or below 500 KiB", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-bundle-"));
  try {
    await writeFile(path.join(directory, "acceptable.js"), Buffer.alloc(500 * 1024));
    const { stdout } = await run(process.execPath, [checker], {
      env: { ...process.env, HACCORA_BUILD_ASSETS_DIR: directory },
    });
    assert.match(stdout, /bundle budget passed/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("bundle budget rejects an oversized production chunk", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "haccora-bundle-"));
  try {
    await writeFile(path.join(directory, "oversized.js"), Buffer.alloc(500 * 1024 + 1));
    await assert.rejects(
      run(process.execPath, [checker], {
        env: { ...process.env, HACCORA_BUILD_ASSETS_DIR: directory },
      }),
      (error) => /oversized\.js: 500\.0 KiB exceeds 500 KiB/.test(error.stderr),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
