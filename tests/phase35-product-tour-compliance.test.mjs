import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("hero product tour is playable, captioned, transcribed and first-party", async () => {
  const [landing, captions, translations, video, videoStat] = await Promise.all([
    read("src/routes/index.tsx"),
    read("public/media/haccora-product-tour.en.vtt"),
    read("src/lib/i18n.tsx"),
    readFile(new URL("../public/media/haccora-product-tour.mp4", import.meta.url)),
    stat(new URL("../public/media/haccora-product-tour.mp4", import.meta.url)),
  ]);

  assert.match(landing, /function ProductTourDialog/);
  assert.match(landing, /<button[\s\S]*hero\.video\.title/);
  assert.match(landing, /<video[\s\S]*controls[\s\S]*playsInline[\s\S]*preload="metadata"/);
  assert.match(landing, /haccora-product-tour\.en\.vtt/);
  assert.match(landing, /kind="captions"/);
  assert.match(landing, /hero\.video\.transcript/);
  assert.doesNotMatch(landing, /youtube|vimeo/i);
  assert.match(captions, /^WEBVTT/);
  assert.match(
    captions,
    /Official guidance and your business-specific procedures remain authoritative/i,
  );
  assert.match(translations, /does not guarantee an inspection outcome/i);
  assert.ok(videoStat.size > 100_000, "product tour video is unexpectedly small");
  assert.equal(video.subarray(4, 8).toString("ascii"), "ftyp");
});

test("public wording avoids absolute inspection promises and keeps the evidence route public", async () => {
  const [translations, landing, faqs] = await Promise.all([
    read("src/lib/i18n.tsx"),
    read("src/routes/index.tsx"),
    read("src/lib/marketing-faqs.ts"),
  ]);

  assert.doesNotMatch(translations, /Everything the authority asks for/i);
  assert.doesNotMatch(translations, /All evidence is current/i);
  assert.doesNotMatch(translations, /Inspection ready\./i);
  assert.match(translations, /Find and share the evidence your officer needs/i);
  assert.match(translations, /generate a scoped inspection pack/i);
  assert.match(landing, /<Link to="\/help" className="btn-red mt-9">/);
  assert.match(faqs, /retain records for an appropriate period/i);
});

test("help centre covers allergen limits and transparent foreground location evidence", async () => {
  const help = await read("src/lib/help-centre.ts");
  assert.match(help, /Allergens and traceability/);
  assert.match(help, /Privacy, GPS and workforce transparency/);
  assert.match(help, /does not require background location tracking/i);
  assert.match(help, /prepacked for direct sale/i);
  assert.match(help, /does not automatically bypass tenant row-level security/i);
});

test("published Lovable AAL2 replay is narrowly reconciled and public config remains resilient", async () => {
  const [lineage, reconciliation, client] = await Promise.all([
    read("scripts/check-migration-lineage.mjs"),
    read("docs/MIGRATION_RECONCILIATION.md"),
    read("src/integrations/supabase/haccora-client.ts"),
  ]);

  assert.match(
    lineage,
    /require_platform_operator_aal2:20260809212658_86b75e75-ddd4-4ecc-8273-a1a80d42645d\.sql:20260809230000_platform_step_up_security\.sql/,
  );
  assert.match(reconciliation, /Phase 34 platform MFA guard was also applied twice/);
  assert.match(client, /getPublicSupabaseConfig/);
  assert.doesNotMatch(client, /Connect Supabase in Lovable Cloud/);
});
