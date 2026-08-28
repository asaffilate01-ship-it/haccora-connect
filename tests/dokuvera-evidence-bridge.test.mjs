import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");
const [migration, webhook, admin, access, integrations, documents, config, deploy] =
  await Promise.all([
    read("supabase/migrations/20260828150000_dokuvera_evidence_bridge.sql"),
    read("supabase/functions/dokuvera-webhook/index.ts"),
    read("supabase/functions/dokuvera-admin/index.ts"),
    read("supabase/functions/_shared/dokuvera-access.ts"),
    read("src/routes/app.integrations.tsx"),
    read("src/routes/app.documents.tsx"),
    read("supabase/config.toml"),
    read(".github/workflows/production-supabase-deploy.yml"),
  ]);

test("Dokuvera evidence is private, service-written and branch scoped", () => {
  assert.match(migration, /'dokuvera-evidence',[\s\S]*?false,[\s\S]*?52428800/);
  assert.match(
    migration,
    /revoke insert, update, delete on public\.dokuvera_connections,[\s\S]*?public\.dokuvera_evidence from anon, authenticated/i,
  );
  assert.match(migration, /has_org_role\([\s\S]*?array\['owner','manager','chef'\]/i);
  assert.match(migration, /array\['staff'\][\s\S]*?location_id = public\.current_location_id\(\)/i);
  assert.match(
    migration,
    /has_valid_inspector_grant\(organization_id, 'documents', location_id\)/i,
  );
  assert.doesNotMatch(
    migration,
    /create policy[\s\S]{0,120}for (insert|update|delete) to authenticated/i,
  );
});

test("Dokuvera webhook authenticates, rejects replay and verifies source bytes", () => {
  assert.match(webhook, /DOKUVERA_BRIDGE_SECRET/);
  assert.match(webhook, /x-dokuvera-timestamp/i);
  assert.match(webhook, /x-dokuvera-signature/i);
  assert.match(webhook, /SIGNATURE_AGE_SECONDS = 5 \* 60/);
  assert.match(webhook, /constantTimeEqual/);
  assert.match(webhook, /eventError\.code !== "23505"/);
  assert.match(webhook, /event_payload_conflict/);
  assert.match(webhook, /signed_url: ""/);
  assert.match(webhook, /DOKUVERA_STORAGE_ORIGIN/);
  assert.match(webhook, /redirect: "error"/);
  assert.match(webhook, /crypto\.subtle\.digest\([\s\S]{0,80}"SHA-256"[\s\S]{0,80}bytes\.buffer/);
  assert.match(webhook, /source_hash_mismatch/);
  assert.match(webhook, /MAX_MEDIA_BYTES = 50 \* 1024 \* 1024/);
  assert.match(webhook, /response\.body\?\.getReader\(\)/);
  assert.match(webhook, /await reader\.cancel\(\)/);
});

test("Dokuvera setup is role and subscription controlled", () => {
  assert.match(admin, /\["owner", "manager"\]/);
  assert.match(admin, /hasDokuveraIntegrationAccess/);
  assert.match(access, /dokuvera_bridge/);
  assert.match(access, /enabled_modules/);
  assert.match(webhook, /hasDokuveraIntegrationAccess/);
  assert.match(webhook, /integration_not_active/);
  assert.match(admin, /integration_not_in_plan/);
  assert.match(admin, /eq\("is_active", true\)/);
  assert.match(admin, /project_already_connected/);
});

test("Haccora surfaces connection controls and retained evidence metadata", () => {
  assert.match(integrations, /Dokuvera evidence capture/);
  assert.match(integrations, /dokuvera-admin/);
  assert.match(integrations, /Connect project/);
  assert.match(integrations, /Existing evidence was retained/);
  assert.match(documents, /Dokuvera records/);
  assert.match(documents, /Captured/);
  assert.match(documents, /Received by Haccora/);
  assert.match(documents, /voice_transcript/);
  assert.match(documents, /dokuvera-evidence/);
});

test("Dokuvera functions are configured, checked and deployed", () => {
  for (const name of ["dokuvera-admin", "dokuvera-webhook"]) {
    assert.match(config, new RegExp(`\\[functions\\.${name}\\]`));
    assert.match(deploy, new RegExp(name));
  }
});
