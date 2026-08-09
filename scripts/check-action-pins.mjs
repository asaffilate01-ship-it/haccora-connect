import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowDirectory = path.join(root, ".github/workflows");

export function findUnpinnedActions(source, filename = "workflow") {
  const failures = [];
  for (const [index, line] of source.split("\n").entries()) {
    const match = /^\s*-?\s*uses:\s*["']?([^\s"'#]+)["']?/.exec(line);
    if (!match) continue;
    const reference = match[1];
    if (reference.startsWith("./")) continue;
    if (/^[^/@\s]+\/[^/@\s]+(?:\/[^@\s]+)*@[a-f0-9]{40}$/.test(reference)) continue;
    failures.push(
      `${filename}:${index + 1} action is not pinned to a full commit SHA: ${reference}`,
    );
  }
  return failures;
}

async function main() {
  const failures = [];
  const files = (await readdir(workflowDirectory)).filter((file) => /\.ya?ml$/i.test(file)).sort();
  for (const file of files) {
    const source = await readFile(path.join(workflowDirectory, file), "utf8");
    failures.push(...findUnpinnedActions(source, `.github/workflows/${file}`));
  }
  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log(`GitHub Actions pin verification passed (${files.length} workflows).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
