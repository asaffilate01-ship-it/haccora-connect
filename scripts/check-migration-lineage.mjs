import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const migrationDirectory = path.resolve(process.env.HACCORA_MIGRATION_DIR || "supabase/migrations");
const failures = [];
const requiredCanonicalMigrations = [
  "20260801090000_production_tenancy_security.sql",
  "20260802090000_v2_security_privacy_launch.sql",
  "20260802100000_v2_operations_control.sql",
  "20260802103319_63102a85-216e-4527-ab82-2f9dc19862bb.sql",
  "20260802120000_v2_commercial_reconciliation.sql",
  "20260808170000_restore_tenant_billing_and_platform_policy.sql",
  "20260808190000_native_evidence_and_push_hardening.sql",
];
const removedDuplicateMigrations = [
  "20260802083308_aa031c95-39d7-44b9-9677-f99519895f14.sql",
  "20260802083626_4bf8a58a-1dc9-4b17-a287-68fdfb6129d8.sql",
  "20260802083657_22e0ce1a-4b75-4fbf-9665-aa60827aa6a2.sql",
  "20260802083707_fe91f7e5-12b7-406e-a813-469b58848b74.sql",
  "20260802093624_2011b293-2d93-46fb-a6c7-8c53165e7752.sql",
  "20260802093838_c79dcb7d-1b86-4b56-bed6-e3fd2828416c.sql",
  "20260802110000_v2_commercial_native_integrations.sql",
  "20260802151821_e39eee69-d055-435f-886e-10b3ab3be4aa.sql",
];
// Phase 21 was already published with three no-op function replays before this
// stricter checker was run against main. Keep that applied migration immutable,
// but do not weaken duplicate detection for any other signature or file pair.
const publishedNoopFunctionReplays = new Set([
  "public.tg_temp_alert:20260807005727_590d47c7-aec4-44c7-87c8-0e87f31aa670.sql:20260807010000_uk_english_alert_cleanup.sql",
  "public.tg_expiry_alert:20260807005727_590d47c7-aec4-44c7-87c8-0e87f31aa670.sql:20260807010000_uk_english_alert_cleanup.sql",
  "public.tg_incident_alert:20260807005727_590d47c7-aec4-44c7-87c8-0e87f31aa670.sql:20260807010000_uk_english_alert_cleanup.sql",
  // Lovable published the platform operator migration twice on main. Both
  // files must remain in the ledger; the later migration is now an explicitly
  // idempotent replay so clean and already-linked environments converge.
  "public.is_platform_operator:20260807173739_2b265a28-3122-4776-92be-467db0c3d6f9.sql:20260807190000_platform_operator_and_demo_role_access.sql",
  "public.get_my_platform_context:20260807173739_2b265a28-3122-4776-92be-467db0c3d6f9.sql:20260807190000_platform_operator_and_demo_role_access.sql",
  "public.get_platform_overview:20260807173739_2b265a28-3122-4776-92be-467db0c3d6f9.sql:20260807190000_platform_operator_and_demo_role_access.sql",
  "public.get_platform_customers:20260807173739_2b265a28-3122-4776-92be-467db0c3d6f9.sql:20260807190000_platform_operator_and_demo_role_access.sql",
]);

const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();
const versions = new Map();
const policyOwners = new Map();
const functionDefinitions = new Map();
let functionCount = 0;
const identifier = String.raw`(?:"[^"]+"|[a-zA-Z_][\w$]*)`;
const policyPattern = new RegExp(
  String.raw`CREATE\s+POLICY\s+(${identifier})\s+ON\s+((?:${identifier}\.)?${identifier})`,
  "gi",
);
const functionPattern = new RegExp(
  String.raw`CREATE\s+OR\s+REPLACE\s+FUNCTION\s+((?:${identifier}\.)?${identifier})\s*\(`,
  "gi",
);

function normalizeIdentifier(value) {
  return value.replaceAll('"', "").toLowerCase();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchingParenthesis(content, openingIndex) {
  let depth = 0;
  let quote = null;
  for (let index = openingIndex; index < content.length; index += 1) {
    const character = content[index];
    if (quote) {
      if (character === quote && content[index + 1] === quote) {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function recordFunctionDefinitions(content, file) {
  for (const declaration of content.matchAll(functionPattern)) {
    const openingIndex = declaration.index + declaration[0].lastIndexOf("(");
    const closingIndex = matchingParenthesis(content, openingIndex);
    if (closingIndex < 0) {
      failures.push(`Unterminated function signature in ${file}: ${declaration[1]}`);
      continue;
    }

    const afterSignature = content.slice(closingIndex + 1);
    const bodyStart = /\bAS\s+(\$[a-zA-Z_][\w$]*\$|\$\$)/i.exec(afterSignature);
    if (!bodyStart) {
      failures.push(`Dollar-quoted function body not found in ${file}: ${declaration[1]}`);
      continue;
    }
    const delimiter = bodyStart[1];
    const bodyOpeningIndex = closingIndex + 1 + bodyStart.index + bodyStart[0].length;
    const bodyClosingIndex = content.indexOf(delimiter, bodyOpeningIndex);
    if (bodyClosingIndex < 0) {
      failures.push(`Unterminated function body in ${file}: ${declaration[1]}`);
      continue;
    }

    const signature = content
      .slice(openingIndex, closingIndex + 1)
      .replace(/\s+/g, " ")
      .toLowerCase();
    const key = `${normalizeIdentifier(declaration[1])}${signature}`;
    const normalizedDefinition = content
      .slice(declaration.index, bodyClosingIndex + delimiter.length)
      .replace(/\s+/g, " ")
      .trim();
    const definitionsForSignature = functionDefinitions.get(key) ?? new Map();
    const previousFile = definitionsForSignature.get(normalizedDefinition);
    const publishedReplayKey = `${normalizeIdentifier(declaration[1])}:${previousFile}:${file}`;
    if (previousFile && !publishedNoopFunctionReplays.has(publishedReplayKey)) {
      failures.push(
        `Duplicate function definition ${key}: ${previousFile} and ${file} (changed replacements are allowed; identical replays are not)`,
      );
    } else {
      definitionsForSignature.set(normalizedDefinition, file);
    }
    functionDefinitions.set(key, definitionsForSignature);
    functionCount += 1;
  }
}

for (const file of files) {
  const match = /^(\d{14})_.+\.sql$/.exec(file);
  if (!match) {
    failures.push(`Invalid migration filename: ${file}`);
    continue;
  }
  if (versions.has(match[1])) {
    failures.push(`Duplicate migration version ${match[1]}: ${versions.get(match[1])} and ${file}`);
  }
  versions.set(match[1], file);

  const content = await readFile(path.join(migrationDirectory, file), "utf8");
  if (!content.trim()) failures.push(`Empty migration: ${file}`);
  recordFunctionDefinitions(content, file);

  for (const declaration of content.matchAll(policyPattern)) {
    const policy = normalizeIdentifier(declaration[1]);
    const table = normalizeIdentifier(declaration[2]);
    const key = `${table}.${policy}`;
    const previousFile = policyOwners.get(key);
    const contentBeforeDeclaration = content.slice(0, declaration.index);
    const safeReplacement = new RegExp(
      String.raw`DROP\s+POLICY\s+IF\s+EXISTS\s+"?${escapeRegex(policy)}"?\s+ON\s+(?:public\.)?"?${escapeRegex(table.replace(/^public\./, ""))}"?`,
      "i",
    ).test(contentBeforeDeclaration);

    if (previousFile && !safeReplacement) {
      failures.push(
        `Duplicate policy declaration ${key}: ${previousFile} and ${file} (add an explicit DROP POLICY IF EXISTS only for an intentional replacement)`,
      );
    }
    policyOwners.set(key, file);
  }
}

for (const file of requiredCanonicalMigrations) {
  if (!files.includes(file)) failures.push(`Missing canonical migration: ${file}`);
}
for (const file of removedDuplicateMigrations) {
  if (files.includes(file)) failures.push(`Removed duplicate migration returned: ${file}`);
}

const canonicalPositions = requiredCanonicalMigrations.map((file) => files.indexOf(file));
if (
  canonicalPositions.every((position) => position >= 0) &&
  canonicalPositions.some(
    (position, index) => index > 0 && position <= canonicalPositions[index - 1],
  )
) {
  failures.push("Canonical production migrations are not in chronological order");
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(
  `Migration lineage verification passed (${files.length} migrations, ${policyOwners.size} policy declarations, ${functionCount} function definitions).`,
);
