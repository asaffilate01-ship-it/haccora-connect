import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const run = promisify(execFile);
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

async function sourceFiles(directory) {
  const entries = await readdir(new URL(`../${directory}/`, import.meta.url), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await sourceFiles(relative)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

test("Phase 39 isolates application authentication from hosting-generated clients", async () => {
  const [client, attacher, config, start, integrity] = await Promise.all([
    read("src/integrations/supabase/haccora-client.ts"),
    read("src/integrations/supabase/haccora-auth-attacher.ts"),
    read("src/integrations/supabase/config.ts"),
    read("src/start.ts"),
    read("scripts/check-source-integrity.mjs"),
  ]);

  assert.match(client, /getPublicSupabaseConfig/);
  assert.doesNotMatch(client, /import\.meta\.env|process\.env|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(attacher, /from "\.\/haccora-client"/);
  assert.match(start, /haccora-auth-attacher/);
  assert.match(config, /!key\.startsWith\("sb_secret_"\)/);
  assert.match(integrity, /hosting integration's generated public client/);

  const generatedFiles = new Set([
    "src/integrations/supabase/client.ts",
    "src/integrations/supabase/auth-attacher.ts",
    "src/integrations/supabase/auth-middleware.ts",
    "src/integrations/supabase/client.server.ts",
  ]);
  for (const file of await sourceFiles("src")) {
    if (generatedFiles.has(file)) continue;
    assert.doesNotMatch(await read(file), /from\s+["']@\/integrations\/supabase\/client["']/);
  }

  await run(process.execPath, [path.resolve("scripts/check-source-integrity.mjs")]);
});

test("Phase 39 preserves migration history while making clean replay deterministic", async () => {
  const [roles, grant, revoke, laterGrant, databaseWorkflow, rls] = await Promise.all([
    read("supabase/roles.sql"),
    read("supabase/migrations/20260803173857_50251f6f-1cf9-4dd7-8d82-31b67a4b54d6.sql"),
    read("supabase/migrations/20260803174036_805b3023-99bf-42d1-a98c-85b50e5ed380.sql"),
    read("supabase/migrations/20260809151554_9ea435e2-5011-4a6b-8ead-61cb7db26fbf.sql"),
    read(".github/workflows/database.yml"),
    read("supabase/tests/database/rls_isolation.test.sql"),
  ]);

  assert.match(roles, /CREATE ROLE sandbox_exec[\s\S]*NOLOGIN[\s\S]*NOINHERIT/);
  assert.match(roles, /ELSIF NOT target_is_superuser/);
  assert.match(roles, /NOBYPASSRLS/);
  assert.match(grant, /GRANT REFERENCES ON TABLE auth\.users TO sandbox_exec/);
  assert.match(revoke, /REVOKE ALL ON auth\.users FROM sandbox_exec/);
  assert.match(
    laterGrant,
    /grant execute on function public\.__setup_exec\(text\) to sandbox_exec/,
  );
  assert.match(databaseWorkflow, /supabase db start/);
  assert.match(databaseWorkflow, /supabase test db/);
  assert.match(rls, /historic migration compatibility role cannot sign in/);
  assert.match(rls, /retains no auth schema access/);
});

test("Phase 39 monitors real hosted legal routes and a release SHA before public launch", async () => {
  const [server, builtWorker, smoke, uptime] = await Promise.all([
    read("src/server.ts"),
    read("scripts/check-built-worker.mjs"),
    read("scripts/check-deployment-smoke.mjs"),
    read(".github/workflows/uptime.yml"),
  ]);

  for (const route of ["/app", "/login", "/onboarding", "/platform", "/account-status"]) {
    assert.match(server, new RegExp(route.replace("/", "\\/")));
    assert.match(builtWorker, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(server, /private, no-store, no-cache, max-age=0, must-revalidate/);
  assert.match(builtWorker, /private route is missing Cache-Control: no-store/);
  assert.match(smoke, /isNonCacheableHtml/);
  for (const route of ["/help", "/platform", "/legal/terms", "/legal/company-details"]) {
    assert.match(smoke, new RegExp(route.replace("/", "\\/")));
  }
  assert.match(uptime, /https:\/\/haccora\.co\.uk/);
  assert.doesNotMatch(uptime, /hacccora-chums\.lovable\.app/);
  assert.match(uptime, /vars\.PRODUCTION_RELEASE_SHA \|\| github\.sha/);
  assert.doesNotMatch(uptime, /health:\s*\n\s*if:/);
  assert.match(uptime, /Public launch monitoring is incomplete/);
});
