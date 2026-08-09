import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

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
const maximumJavaScriptBytes = 650 * 1024;
const maximumGzippedJavaScriptBytes = 200 * 1024;
const failures = [];
const staticImports = new Map();

for (const file of assetFiles) {
  if (!/\.(?:js|mjs)$/.test(file)) continue;
  const filePath = path.join(assetsDirectory, file);
  const size = (await stat(filePath)).size;
  if (size > maximumJavaScriptBytes) {
    failures.push(`${file}: ${(size / 1024).toFixed(1)} KiB exceeds 650 KiB`);
  }

  const source = await readFile(filePath, "utf8");
  const gzipSize = gzipSync(source, { level: 9 }).length;
  if (gzipSize > maximumGzippedJavaScriptBytes) {
    failures.push(`${file}: ${(gzipSize / 1024).toFixed(1)} KiB gzip exceeds 200 KiB`);
  }
  const imports = new Set();
  for (const match of source.matchAll(
    /(?:\bfrom\s*|\bimport\s*)["']\.\/([^"']+\.(?:js|mjs))["']/g,
  )) {
    if (assetFiles.includes(match[1])) imports.add(match[1]);
  }
  staticImports.set(file, [...imports]);
}

// Forced vendor splitting can turn a safe package-level cycle into several
// browser chunks whose exports initialise in the wrong order. That failure is
// invisible to a server-only build, so reject static JavaScript chunk cycles.
const state = new Map();
const stack = [];
const reportedCycles = new Set();

function visit(file) {
  state.set(file, 1);
  stack.push(file);
  for (const dependency of staticImports.get(file) ?? []) {
    if (!staticImports.has(dependency)) continue;
    if (!state.has(dependency)) {
      visit(dependency);
    } else if (state.get(dependency) === 1) {
      const start = stack.indexOf(dependency);
      const cycle = [...stack.slice(start), dependency];
      const signature = [...new Set(cycle.slice(0, -1))].sort().join("|");
      if (!reportedCycles.has(signature)) {
        reportedCycles.add(signature);
        failures.push(`static chunk cycle: ${cycle.join(" -> ")}`);
      }
    }
  }
  stack.pop();
  state.set(file, 2);
}

for (const file of staticImports.keys()) {
  if (!state.has(file)) visit(file);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  "Production JavaScript bundle budget passed (maximum 650 KiB raw / 200 KiB gzip per chunk; no static chunk cycles).",
);
