import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { nativeReleaseEnvironmentFailures } from "./native-release-environment.mjs";

const root = process.cwd();
const failures = [];
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const app = (await readJson("app.json")).expo;
const eas = await readJson("eas.json");
const appConfig = await readFile(path.join(root, "app.config.js"), "utf8");

failures.push(...nativeReleaseEnvironmentFailures(process.env));

const reverseDns = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*){2,}$/i;
if (!reverseDns.test(app?.ios?.bundleIdentifier ?? "")) {
  failures.push("iOS bundleIdentifier must be a stable reverse-DNS identifier");
}
if (!reverseDns.test(app?.android?.package ?? "")) {
  failures.push("Android package must be a stable reverse-DNS identifier");
}
if (app?.ios?.bundleIdentifier !== app?.android?.package) {
  failures.push("iOS and Android identifiers must match for this release policy");
}
if (!/^\d+\.\d+\.\d+$/.test(app?.version ?? "")) {
  failures.push("Expo version must use a three-part semantic version");
}

if (
  !appConfig.includes("process.env.EAS_PROJECT_ID") ||
  !appConfig.includes("eas: { projectId }")
) {
  failures.push("app.config.js must inject the protected EAS_PROJECT_ID into signed builds");
}
if (eas?.cli?.appVersionSource !== "remote") {
  failures.push("EAS must use remote app version management");
}
if (eas?.cli?.requireCommit !== true) {
  failures.push("EAS must require a committed source snapshot");
}
if (eas?.build?.production?.autoIncrement !== true) {
  failures.push("EAS production builds must auto-increment store build numbers");
}
if (eas?.build?.production?.channel !== "production") {
  failures.push("EAS production builds must use the production update channel");
}
if (!eas?.submit?.production) failures.push("EAS production submit profile is missing");

for (const key of [
  "NSCameraUsageDescription",
  "NSFaceIDUsageDescription",
  "NSPhotoLibraryUsageDescription",
  "NSLocationWhenInUseUsageDescription",
]) {
  if ((app?.ios?.infoPlist?.[key] ?? "").trim().length < 20) {
    failures.push(`iOS privacy purpose string is missing or too vague: ${key}`);
  }
}
for (const permission of ["RECORD_AUDIO"]) {
  if (!app?.android?.blockedPermissions?.includes(permission)) {
    failures.push(`Android must explicitly block unused permission: ${permission}`);
  }
}
for (const permission of ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]) {
  if (app?.android?.blockedPermissions?.includes(permission)) {
    failures.push(`Android must allow the declared QR evidence permission: ${permission}`);
  }
}
if (!app?.plugins?.some((plugin) => Array.isArray(plugin) && plugin[0] === "expo-location")) {
  failures.push("Expo location plugin is required for consented QR evidence GPS");
}
for (const asset of [app?.icon, app?.splash?.image, app?.android?.adaptiveIcon?.foregroundImage]) {
  if (!asset) {
    failures.push("A required store icon or splash asset is not configured");
    continue;
  }
  try {
    await access(path.join(root, asset));
  } catch {
    failures.push(`Configured store asset does not exist: ${asset}`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Native store configuration preflight passed.");
