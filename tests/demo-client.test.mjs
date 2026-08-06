import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const seed = await readFile(new URL("../scripts/seed-demo-client.mjs", import.meta.url), "utf8");
const config = await readFile(
  new URL("../scripts/demo-client-config.mjs", import.meta.url),
  "utf8",
);
const envExample = await readFile(new URL("../.env.demo.example", import.meta.url), "utf8");
const playbook = await readFile(
  new URL("../docs/DEMO-CLIENT-TEST-PLAYBOOK.md", import.meta.url),
  "utf8",
);

test("demo seed has explicit environment safety interlocks", () => {
  assert.match(config, /DEMO_SEED_CONFIRM/);
  assert.match(config, /DEMO_ALLOWED_SUPABASE_URL/);
  assert.match(config, /Refusing to seed or verify while a production environment is selected/);
});

test("demo seed does not contain a committed password or service key", () => {
  assert.doesNotMatch(seed, /sb_secret_[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(seed, /eyJ[A-Za-z0-9_-]{40,}/);
  assert.match(envExample, /replace-with-a-unique-16-character-password/);
});

test("demo client covers the primary operational journey", () => {
  for (const table of [
    "checks",
    "temperature_logs",
    "cleaning_tasks",
    "goods_in_logs",
    "recipes",
    "expiry_items",
    "training_records",
    "documents",
  ]) {
    assert.match(seed, new RegExp(`upsert\\(\\"${table}\\"`), `${table} must be seeded`);
  }
});

test("playbook tests every seeded role plus offline behaviour", () => {
  assert.match(playbook, /Staff journey/);
  assert.match(playbook, /Manager journey/);
  assert.match(playbook, /Owner journey/);
  assert.match(playbook, /flight mode/i);
  assert.match(playbook, /APNs\/FCM/);
});
