import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  evaluateLaunchReadiness,
  formatLaunchReadiness,
  serialiseLaunchReadiness,
} from "./launch-requirements.mjs";

const result = await evaluateLaunchReadiness();
const report = serialiseLaunchReadiness(result);
const shouldWrite = process.argv.includes("--write");
const asJson = process.argv.includes("--json");

if (shouldWrite) {
  const directory = path.resolve("release-evidence");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "launch-configuration-status.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(directory, "launch-configuration-status.md"),
    `# Haccora launch configuration status\n\nGenerated: ${report.generatedAt}\n\n\`\`\`text\n${formatLaunchReadiness(result)}\n\`\`\`\n`,
    "utf8",
  );
}

if (asJson) console.log(JSON.stringify(report, null, 2));
else console.log(formatLaunchReadiness(result));

if (shouldWrite) {
  console.log("Non-sensitive launch configuration evidence written to release-evidence/.");
}
