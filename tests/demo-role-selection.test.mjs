import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const source = await read("src/lib/demo-role-selection.ts");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { demoRoleOptions } = await import(
  "data:text/javascript;base64," + Buffer.from(code).toString("base64")
);

const configuration = {
  enabled: "true",
  actualAppOrigin: "https://demo.haccora.test",
  allowedAppOrigin: "https://demo.haccora.test",
  actualSupabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  allowedSupabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  productionProjectRef: "uvwxyzabcdefghijklmn",
  emailDomain: "demo.example.test",
  ownerEmail: "demo@example.test",
};

test("demo selector returns distinct real test identities and native excludes platform roles", () => {
  const options = demoRoleOptions(configuration);
  assert.equal(options.length, 9);
  assert.equal(new Set(options.map((role) => role.email)).size, 9);
  assert.equal(options.find((role) => role.id === "owner").email, "demo@example.test");
  assert.equal(options.filter((role) => role.platform).length, 3);
  assert.equal(demoRoleOptions({ ...configuration, native: true }).length, 6);
  assert.ok(options.every((role) => !("password" in role)));
});

test("demo selector fails closed for production, wrong origins and identity collisions", () => {
  const cases = [
    { enabled: "false" },
    { actualAppOrigin: "https://wrong.example.test" },
    {
      actualAppOrigin: "https://app.haccora.co.uk",
      allowedAppOrigin: "https://app.haccora.co.uk",
    },
    { actualSupabaseUrl: "https://wrong.example.test" },
    { productionProjectRef: "abcdefghijklmnopqrst" },
    { productionProjectRef: "" },
    { ownerEmail: "saas-owner@demo.example.test" },
    { allowedAppOrigin: "https://demo.haccora.test/path" },
  ];
  for (const override of cases) {
    assert.deepEqual(demoRoleOptions({ ...configuration, ...override }), []);
  }
});

test("web and native selectors clear previous passwords and never change permissions", async () => {
  const [web, native, nativeHelper, shell] = await Promise.all([
    read("src/routes/login.tsx"),
    read("mobile/app/login.tsx"),
    read("mobile/lib/demo-role-selection.ts"),
    read("src/routes/app.tsx"),
  ]);
  assert.equal(source, nativeHelper);
  assert.match(web, /Choose a demo role/);
  assert.match(web, /setEmail\(selected\?\.email/);
  assert.match(web, /setPassword\(""\)/);
  assert.match(web, /signInWithEmail\(email, password\)/);
  assert.match(native, /setEmail\(role.email\)/);
  assert.match(native, /setPassword\(""\)/);
  assert.match(native, /signInWithPassword/);
  assert.match(shell, /await signOut\(\)/);
  assert.match(shell, /onClick=\{\(\) => void doSignOut\(\)\}/);
});
