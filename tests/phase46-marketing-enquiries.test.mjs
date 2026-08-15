import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const [form, contact, migration, types, platform, platformAdmin, features, fsaProspects] =
  await Promise.all([
    read("src/components/marketing/ContactForm.tsx"),
    read("supabase/functions/contact/index.ts"),
    read("supabase/migrations/20260815193000_contact_enquiry_pipeline.sql"),
    read("src/integrations/supabase/types.ts"),
    read("src/routes/platform.tsx"),
    read("supabase/functions/platform-admin/index.ts"),
    read("src/routes/features.tsx"),
    read("src/lib/fsa-prospects.functions.ts"),
  ]);

test("Phase 46 captures bounded, consent-backed enquiry context end to end", () => {
  for (const field of ["enquiryType", "siteCount", "message"]) {
    assert.match(form, new RegExp(`name="${field}"`));
    assert.match(contact, new RegExp(field));
  }
  assert.match(form, /minLength=\{10\}/);
  assert.match(form, /maxLength=\{2000\}/);
  assert.match(contact, /z\.string\(\)\.trim\(\)\.min\(10\)\.max\(2000\)/);
  assert.match(contact, /enquiry_type: body\.enquiryType/);
  assert.match(contact, /site_count: body\.siteCount/);
  assert.match(contact, /message: body\.message/);
});

test("the migration keeps the enquiry queue private, bounded and indexed", () => {
  for (const column of ["enquiry_type", "site_count", "message", "updated_at"]) {
    assert.match(migration, new RegExp(`ADD COLUMN IF NOT EXISTS ${column}`));
    assert.match(types, new RegExp(`${column}:`));
  }
  assert.match(migration, /site_count BETWEEN 1 AND 10000/);
  assert.match(migration, /char_length\(message\) BETWEEN 10 AND 2000/);
  assert.match(migration, /contact_requests_status_created_idx/);
  assert.match(migration, /REVOKE ALL ON public\.contact_requests FROM anon, authenticated/);
  assert.match(migration, /GRANT SELECT ON public\.contact_requests TO authenticated/);
});

test("SaaS operators receive an actionable lead inbox with governed status changes", () => {
  assert.match(platform, /Website enquiries/);
  assert.match(platform, /\.from\("contact_requests"\)/);
  assert.match(platform, /update_contact_request/);
  assert.match(platform, /disabled=\{!owner \|\| busy/);
  assert.match(platformAdmin, /action: z\.literal\("update_contact_request"\)/);
  assert.match(platformAdmin, /platform_update_contact_request/);
  assert.match(platformAdmin, /currentLevel !== "aal2"/);
  assert.match(migration, /contact_request_status_changed/);
  assert.match(migration, /platform mutation requires MFA step-up/);
  assert.match(migration, /jsonb_build_object\('request_id', p_request_id, 'status', p_status\)/);
  assert.doesNotMatch(migration, /jsonb_build_object\([^)]*email/);
});

test("marketing claims remain review-led and release convergence stays clean", () => {
  assert.doesNotMatch(features, /Natasha's Law compliant/i);
  assert.match(features, /supplier specification changes/);
  assert.match(features, /environmental health officer can review/i);
  assert.match(fsaProspects, /\.inputValidator\(/);
});
