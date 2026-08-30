import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const evidenceDir = path.resolve(root, process.env.HACCORA_EVIDENCE_DIR ?? "release-evidence");
const migrationTarget = (process.env.MIGRATION_TARGET ?? "staging").trim();
if (!/^[a-z0-9-]+$/.test(migrationTarget)) {
  throw new Error("MIGRATION_TARGET must contain only lowercase letters, numbers and hyphens");
}
const ledgerFile = path.resolve(
  root,
  process.env.MIGRATION_LIST_FILE ??
    process.env.STAGING_MIGRATION_LIST_FILE ??
    `release-evidence/${migrationTarget}-migration-list.txt`,
);
const ansi = /\u001b\[[0-9;]*m/g;

function parseLedger(content) {
  const rows = [];
  for (const rawLine of content.replace(ansi, "").split("\n")) {
    const match = rawLine.match(/^\s*(\d{14})?\s*[│|]\s*(\d{14})?\s*[│|]/);
    if (!match || (!match[1] && !match[2])) continue;
    rows.push({ local: match[1] ?? null, remote: match[2] ?? null });
  }
  return rows;
}

const migrations = (await readdir(path.join(root, "supabase/migrations")))
  .filter((file) => /^\d{14}_.+\.sql$/.test(file))
  .sort();
if (!migrations.length) throw new Error("No timestamped migrations were found");

const expected = migrations.map((file) => file.slice(0, 14));
if (new Set(expected).size !== expected.length) {
  throw new Error("Local migration timestamps must be unique before remote verification");
}

const rows = parseLedger(await readFile(ledgerFile, "utf8"));
if (!rows.length) throw new Error("The remote migration list did not contain parseable rows");

const matched = new Set(
  rows.filter((row) => row.local && row.local === row.remote).map((row) => row.local),
);
const missingRemote = expected.filter((version) => !matched.has(version));
const unexpectedRemote = rows
  .filter((row) => row.remote && !expected.includes(row.remote))
  .map((row) => row.remote);
const divergent = rows.filter((row) => row.local !== row.remote);

const report = {
  schemaVersion: 1,
  target: migrationTarget,
  checkedAt: new Date().toISOString(),
  expectedMigrations: expected.length,
  matchedMigrations: matched.size,
  latestExpectedMigration: expected.at(-1),
  missingRemote,
  unexpectedRemote: [...new Set(unexpectedRemote)],
  divergent,
  passed: missingRemote.length === 0 && unexpectedRemote.length === 0 && divergent.length === 0,
};

await mkdir(evidenceDir, { recursive: true });
await writeFile(
  path.join(evidenceDir, `${migrationTarget}-migration-ledger.json`),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (!report.passed) {
  console.error(
    `Remote migration ledger mismatch: ${report.matchedMigrations}/${report.expectedMigrations} matched`,
  );
  process.exit(1);
}

console.log(`Remote migration ledger verified (${report.matchedMigrations} migrations).`);

export { parseLedger };
