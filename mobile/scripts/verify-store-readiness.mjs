import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const failures = [];
const readJson = async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"));
const app = (await readJson("app.json")).expo;
const eas = await readJson("eas.json");

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

const projectId = app?.extra?.eas?.projectId ?? "";
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId)) {
  failures.push("EAS projectId must be replaced with the UUID returned by eas init");
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
]) {
  if ((app?.ios?.infoPlist?.[key] ?? "").trim().length < 20) {
    failures.push(`iOS privacy purpose string is missing or too vague: ${key}`);
  }
}
for (const permission of ["RECORD_AUDIO", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]) {
  if (!app?.android?.blockedPermissions?.includes(permission)) {
    failures.push(`Android must explicitly block unused permission: ${permission}`);
  }
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
