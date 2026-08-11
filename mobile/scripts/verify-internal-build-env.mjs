import { readFile } from "node:fs/promises";
import { nativeReleaseEnvironmentFailures } from "./native-release-environment.mjs";

const failures = [];
const value = (name) => (process.env[name] ?? "").trim();
const eas = JSON.parse(await readFile("eas.json", "utf8"));

failures.push(...nativeReleaseEnvironmentFailures(process.env));

if (value("HACCORA_ENV") !== "staging") {
  failures.push("HACCORA_ENV must be staging for an internal candidate");
}
if (value("EXPO_TOKEN").length < 20) {
  failures.push("EXPO_TOKEN is missing or too short");
}
if (!/^\d+\.\d+\.\d+$/.test(value("EAS_CLI_VERSION"))) {
  failures.push("EAS_CLI_VERSION must pin an explicit three-part version");
}
if (eas?.cli?.requireCommit !== true) {
  failures.push("EAS must require a committed source snapshot");
}
if (eas?.build?.preview?.distribution !== "internal") {
  failures.push("The preview profile must use internal distribution");
}
if (eas?.build?.preview?.autoIncrement !== true) {
  failures.push("The preview profile must auto-increment build numbers");
}
if (eas?.build?.preview?.channel !== "staging") {
  failures.push("The preview profile must use the staging update channel");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Native internal-candidate environment preflight passed.");
