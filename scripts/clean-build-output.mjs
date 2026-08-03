import { rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputDirectories = [".output", "dist"];

for (const directory of outputDirectories) {
  const resolved = path.resolve(root, directory);
  if (path.relative(root, resolved) !== directory) {
    console.error("Refusing to clean an unexpected build output path");
    process.exit(1);
  }
  await rm(resolved, { recursive: true, force: true });
}
console.log("Removed stale production build output.");
