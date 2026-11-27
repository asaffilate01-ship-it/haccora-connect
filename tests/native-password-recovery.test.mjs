import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const helperSource = readFileSync(
  new URL("../mobile/lib/password-recovery.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const exports = {};
vm.runInNewContext(compiled.outputText, { exports, URL, URLSearchParams });
const { RECOVERY_REDIRECT, recoverySessionFromUrl, newPasswordError } = exports;
const login = readFileSync(new URL("../mobile/app/login.tsx", import.meta.url), "utf8");
const forgot = readFileSync(new URL("../mobile/app/forgot-password.tsx", import.meta.url), "utf8");
const reset = readFileSync(new URL("../mobile/app/reset-password.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../mobile/app/_layout.tsx", import.meta.url), "utf8");

test("recovery accepts only complete tokens for the exact native reset route", () => {
  assert.equal(RECOVERY_REDIRECT, "haccora://reset-password");
  const tokens = recoverySessionFromUrl(
    "haccora://reset-password#access_token=access&refresh_token=refresh&type=recovery",
  );
  assert.equal(tokens.access_token, "access");
  assert.equal(tokens.refresh_token, "refresh");
  for (const url of [
    "https://example.com/reset-password#access_token=a&refresh_token=b&type=recovery",
    "haccora://other#access_token=a&refresh_token=b&type=recovery",
    "haccora://reset-password#access_token=a&type=recovery",
    "haccora://reset-password#error=access_denied&type=recovery",
    "haccora://user@reset-password#access_token=a&refresh_token=b&type=recovery",
  ]) {
    assert.throws(() => recoverySessionFromUrl(url));
  }
});

test("new-password rules require a matching 12-character password", () => {
  assert.equal(
    newPasswordError("short", "short"),
    "Use at least 12 characters for your new password.",
  );
  assert.equal(
    newPasswordError("long-enough-password", "different-password"),
    "The passwords do not match.",
  );
  assert.equal(newPasswordError("long-enough-password", "long-enough-password"), null);
});

test("native sign-in links to the registered reset flow and reset binds to its recovery user", () => {
  assert.match(login, /router\.push\("\/forgot-password"\)/);
  assert.match(forgot, /resetPasswordForEmail/);
  assert.match(forgot, /RECOVERY_REDIRECT/);
  assert.match(reset, /supabase\.auth\.setSession/);
  assert.match(reset, /data\.user\.id !== recoveryUser\.current/);
  assert.match(reset, /signOut\(\{ scope: "local" \}\)/);
  assert.match(layout, /Stack\.Screen name="forgot-password"/);
  assert.match(layout, /Stack\.Screen name="reset-password"/);
});
