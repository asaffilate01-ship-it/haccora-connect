import { createPublicKey, generateKeyPairSync, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, lstat, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { generatedLaunchSecretNames } from "./launch-requirements.mjs";

const run = promisify(execFile);
const targetName = ".env.launch.local";
const generatedPlaceholder = /^(?:generate-|set_with|replace)/i;
const mirrorPlaceholder = /(replace|your_project|your-|example\.com|set_with)/i;

function assignments(content) {
  const values = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function replaceAssignment(content, name, nextValue) {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, `${name}=${nextValue}`);
  return `${content.trimEnd()}\n${name}=${nextValue}\n`;
}

async function isTracked(root) {
  try {
    await run("git", ["ls-files", "--error-unmatch", targetName], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

export async function bootstrapLaunchConfiguration({ root = process.cwd() } = {}) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, targetName);
  if (path.dirname(target) !== resolvedRoot || path.basename(target) !== targetName) {
    throw new Error("Launch configuration target escaped the workspace root");
  }
  if (await isTracked(resolvedRoot)) {
    throw new Error(
      `${targetName} is tracked by Git; remove it from Git before generating secrets`,
    );
  }

  let existing = "";
  try {
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) throw new Error(`${targetName} must not be a symbolic link`);
    if (!metadata.isFile()) throw new Error(`${targetName} must be a regular file`);
    existing = await readFile(target, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const example = await readFile(path.join(resolvedRoot, ".env.example"), "utf8");
  let content =
    existing ||
    `# Local production launch checklist. Ignored by Git; never commit this file.\n${example}`;
  const current = assignments(content);

  if (existing) {
    const exampleValues = assignments(example);
    const missing = [...exampleValues.keys()].filter((name) => !current.has(name));
    if (missing.length) {
      content += "\n# Added from .env.example by launch bootstrap\n";
      for (const name of missing) content += `${name}=${exampleValues.get(name)}\n`;
    }
  }

  const generated = [];
  const preserved = [];
  for (const name of generatedLaunchSecretNames) {
    const value = assignments(content).get(name)?.trim() ?? "";
    if (value && !generatedPlaceholder.test(value)) {
      preserved.push(name);
      continue;
    }
    content = replaceAssignment(content, name, randomBytes(32).toString("base64url"));
    generated.push(name);
  }

  // Generate the VAPID (browser push) key pair Haccora owns outright. The
  // public key is safe to ship to browsers; the private key stays local and is
  // copied into the protected push gateway environment by the release owner.
  const pushValues = assignments(content);
  const existingPushPublic = pushValues.get("VITE_WEB_PUSH_PUBLIC_KEY")?.trim() ?? "";
  const existingPushPrivate = pushValues.get("WEB_PUSH_PRIVATE_KEY")?.trim() ?? "";
  let vapidGenerated = false;
  if (
    !existingPushPublic ||
    generatedPlaceholder.test(existingPushPublic) ||
    !existingPushPrivate ||
    generatedPlaceholder.test(existingPushPrivate)
  ) {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const jwk = privateKey.export({ format: "jwk" });
    const publicRaw = createPublicKey(privateKey)
      .export({ format: "der", type: "spki" })
      .subarray(-65);
    content = replaceAssignment(
      content,
      "VITE_WEB_PUSH_PUBLIC_KEY",
      Buffer.from(publicRaw).toString("base64url"),
    );
    content = replaceAssignment(content, "WEB_PUSH_PRIVATE_KEY", String(jwk.d));
    vapidGenerated = true;
  }

  // Mirror the public, non-secret web values Haccora already owns into the
  // native runtime names. Nothing is invented: a source value is only copied
  // when it is real, and an existing native value is never overwritten.
  // Sources are read from this file first, then from the committed-ignored
  // project environment file and the current process environment.
  let projectEnv = new Map();
  try {
    projectEnv = assignments(await readFile(path.join(resolvedRoot, ".env"), "utf8"));
  } catch {
    projectEnv = new Map();
  }
  const mirrored = [];
  const mirrors = [
    ["EXPO_PUBLIC_SUPABASE_URL", ["SUPABASE_URL", "VITE_SUPABASE_URL"]],
    [
      "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"],
    ],
    ["EXPO_PUBLIC_WEB_APP_URL", ["PUBLIC_APP_URL", "VITE_PUBLIC_APP_URL"]],
  ];
  for (const [name, sourceNames] of mirrors) {
    const values = assignments(content);
    const existingValue = values.get(name)?.trim() ?? "";
    if (existingValue && !mirrorPlaceholder.test(existingValue)) continue;
    let sourceValue = "";
    outer: for (const sourceName of sourceNames) {
      for (const store of [values, projectEnv, new Map(Object.entries(process.env))]) {
        const candidate = (store.get(sourceName) ?? "").trim().replace(/^["']|["']$/g, "");
        if (candidate && !mirrorPlaceholder.test(candidate)) {
          sourceValue = candidate;
          break outer;
        }
      }
    }

    if (!sourceValue) continue;
    content = replaceAssignment(content, name, sourceValue);
    mirrored.push(name);
  }

  await writeFile(target, content.endsWith("\n") ? content : `${content}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(target, 0o600);
  return { target, generated, preserved, mirrored, vapidGenerated };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await bootstrapLaunchConfiguration();
  console.log(`Created or updated ${path.basename(result.target)} with file permissions 0600.`);
  console.log(
    `Generated ${result.generated.length} Haccora-owned secret(s); preserved ${result.preserved.length}.`,
  );
  if (result.mirrored.length) {
    console.log(
      `Mirrored ${result.mirrored.length} public web value(s) into native runtime names: ${result.mirrored.join(", ")}.`,
    );
  }
  console.log("Provider credentials, legal identity and approvals were not fabricated or changed.");
  console.log("Next: complete the remaining blanks, then run `npm run launch:status`.");
}
