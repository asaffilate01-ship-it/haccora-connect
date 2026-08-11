import { nativeReleaseEnvironmentFailures } from "./native-release-environment.mjs";

const failures = nativeReleaseEnvironmentFailures(process.env, { requireProjectId: false });

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Native public runtime configuration preflight passed.");
