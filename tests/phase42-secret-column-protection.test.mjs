import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const migrationsDirectory = path.resolve("supabase/migrations");

const readAllMigrations = async () => {
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql"));
  const contents = await Promise.all(
    files.map((file) => readFile(path.join(migrationsDirectory, file), "utf8")),
  );
  return contents.join("\n");
};

const secretColumns = {
  api_clients: ["secret_hash"],
  webhook_endpoints: ["signing_secret_hash", "encrypted_signing_secret"],
  sensor_devices: ["secret_hash"],
  organization_invitations: ["token_hash"],
  inspector_access_invitations: ["token_hash"],
};

test("Phase 42 revokes table-wide reads on every table holding secret material", async () => {
  const sql = await readAllMigrations();
  for (const table of Object.keys(secretColumns)) {
    assert.match(
      sql,
      new RegExp(`REVOKE\\s+SELECT\\s+ON\\s+public\\.${table}\\s+FROM\\s+authenticated`, "i"),
      `${table} must not expose table-wide SELECT to authenticated`,
    );
  }
});

test("Phase 42 never grants secret columns to signed-in users", async () => {
  const sql = await readAllMigrations();
  for (const [table, columns] of Object.entries(secretColumns)) {
    const grant = new RegExp(
      `GRANT\\s+SELECT\\s*\\(([^)]*)\\)\\s+ON\\s+public\\.${table}\\s+TO\\s+authenticated`,
      "i",
    );
    const match = sql.match(grant);
    assert.ok(match, `${table} must use a column-level SELECT grant`);
    const granted = match[1].split(",").map((column) => column.trim());
    for (const column of columns) {
      assert.ok(
        !granted.includes(column),
        `${table}.${column} must never be readable by authenticated users`,
      );
    }
  }
});

test("Phase 42 keeps client reads on explicit non-secret columns", async () => {
  const integrations = await readFile("src/routes/app.integrations.tsx", "utf8");
  assert.ok(
    !/from\("webhook_endpoints"\)[\s\S]{0,120}select\("\*"\)/.test(integrations),
    "The integrations screen must not select every webhook column",
  );
  assert.ok(
    !/signing_secret_hash|encrypted_signing_secret/.test(integrations),
    "The integrations screen must never request webhook secret material",
  );
});
