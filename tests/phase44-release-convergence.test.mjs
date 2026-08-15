import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { evaluateLaunchReadiness, formatLaunchReadiness } from "../scripts/launch-requirements.mjs";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

function applicationEnvironment() {
  return {
    VITE_SUPABASE_URL: "https://phase44.supabase.co",
    SUPABASE_URL: "https://phase44.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_phase44",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_phase44",
    PUBLIC_MARKETING_URL: "https://haccora.co.uk",
    PUBLIC_APP_URL: "https://app.haccora.co.uk",
    OPERATIONS_HEALTH_URL: "https://phase44.supabase.co/functions/v1/operations-health",
    ALLOWED_ORIGINS: "https://haccora.co.uk,https://app.haccora.co.uk",
  };
}

test("Phase 44 keeps the declared Lovable build package equal to the resolved npm package", async () => {
  const [packageText, lockText] = await Promise.all([
    read("package.json"),
    read("package-lock.json"),
  ]);
  const packageJson = JSON.parse(packageText);
  const packageLock = JSON.parse(lockText);
  const declared = packageJson.devDependencies["@lovable.dev/vite-tanstack-config"];

  assert.equal(
    packageLock.packages[""].devDependencies["@lovable.dev/vite-tanstack-config"],
    declared,
  );
  assert.equal(
    packageLock.packages["node_modules/@lovable.dev/vite-tanstack-config"].version,
    declared,
  );
});

test("Phase 44 makes both production origins explicit in the protected release", async () => {
  const [workflow, readinessRoute, envExample] = await Promise.all([
    read(".github/workflows/release-readiness.yml"),
    read("src/routes/readiness[.]json.ts"),
    read(".env.example"),
  ]);

  assert.match(workflow, /^\s+PUBLIC_MARKETING_URL: \$\{\{ vars\.PUBLIC_MARKETING_URL \}\}$/m);
  assert.match(workflow, /^\s+PUBLIC_APP_URL: \$\{\{ vars\.PUBLIC_APP_URL \}\}$/m);
  assert.match(
    readinessRoute,
    /marketingOrigin: hasValidHttpsOrigin\(process\.env\.PUBLIC_MARKETING_URL\)/,
  );
  assert.match(
    readinessRoute,
    /applicationOrigin: hasValidHttpsOrigin\(process\.env\.PUBLIC_APP_URL\)/,
  );
  assert.match(
    envExample,
    /ALLOWED_ORIGINS=https:\/\/haccora\.co\.uk,https:\/\/app\.haccora\.co\.uk/,
  );
});

test("Phase 44 refuses a production origin that is absent from CORS", async () => {
  const environment = applicationEnvironment();
  environment.ALLOWED_ORIGINS = "https://app.haccora.co.uk";

  const result = await evaluateLaunchReadiness({
    environment,
    nativeFailures: [],
  });

  assert.equal(result.ready, false);
  assert.match(
    formatLaunchReadiness(result),
    /ALLOWED_ORIGINS must include the PUBLIC_MARKETING_URL origin/,
  );
});
