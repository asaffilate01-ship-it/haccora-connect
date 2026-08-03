import { readdir, stat } from "node:fs/promises";
import path from "node:path";

// Vite/nitro writes the browser bundle to dist/client/assets here; other
// deployment targets emit .output/public/assets.
const candidateDirectories = process.env.HACCORA_BUILD_ASSETS_DIR
  ? [process.env.HACCORA_BUILD_ASSETS_DIR]
  : ["dist/client/assets", ".output/public/assets"];

let assetsDirectory;
let assetFiles;
for (const candidate of candidateDirectories) {
  const resolved = path.resolve(candidate);
  try {
    assetFiles = await readdir(resolved);
    assetsDirectory = resolved;
    break;
  } catch {
    // try the next known output location
  }
}

if (!assetsDirectory) {
  console.error(`No production bundle found in: ${candidateDirectories.join(", ")}`);
  process.exit(1);
}
const maximumJavaScriptBytes = 500 * 1024;
const failures = [];

for (const file of assetFiles) {
  if (!/\.(?:js|mjs)$/.test(file)) continue;
  const size = (await stat(path.join(assetsDirectory, file))).size;
  if (size > maximumJavaScriptBytes) {
    failures.push(`${file}: ${(size / 1024).toFixed(1)} KiB exceeds 500 KiB`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Production JavaScript bundle budget passed (maximum 500 KiB per chunk).");
