import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const historicalPath =
  "supabase/migrations/20260816074111_8e45c285-9600-43f9-b3e2-045fa8f9c742.sql";
const historical = readFileSync(new URL(`../${historicalPath}`, import.meta.url));
const remediation = readFileSync(
  new URL(
    "../supabase/migrations/20261127180000_revoke_embedded_demo_platform_accounts.sql",
    import.meta.url,
  ),
  "utf8",
);

test("published fixed-password history is unchanged and has a later revocation migration", () => {
  assert.equal(
    createHash("sha256").update(historical).digest("hex"),
    "943524c296b06ba61d74b9494e1f6f5a127689966b7168c0dc59c32adb78ef8d",
  );
  for (const snippet of [
    "UPDATE public.platform_operators",
    "SET status = 'revoked'",
    "DELETE FROM auth.sessions",
    "DELETE FROM auth.refresh_tokens",
    "DELETE FROM auth.identities",
    "banned_until = 'infinity'::timestamptz",
    "haccora_demo_revoked",
  ]) {
    assert.ok(remediation.includes(snippet), `missing revocation control: ${snippet}`);
  }
});

test("secret scanner pins the historical migration and requires revocation safeguards", () => {
  const checker = readFileSync(new URL("../scripts/check-secrets.mjs", import.meta.url), "utf8");
  assert.match(checker, /provisionsDatabasePassword/);
  assert.match(checker, /publishedDemoProvision\.sha256/);
  assert.match(checker, /demoRemediation/);
});
