import { readFile } from "node:fs/promises";
import path from "node:path";

import { nativeReleaseEnvironmentFailures } from "../mobile/scripts/native-release-environment.mjs";

const placeholder = /(replace|your_project|example\.com|example\.supabase|set_with)/i;

export const launchRequirementGroups = [
  {
    id: "application",
    label: "Application and Supabase",
    owner: "Engineering / Supabase owner",
    action: "Configure the production Supabase project, app origins and publishable keys.",
  },
  {
    id: "legal-identity",
    label: "Haccora legal identity",
    owner: "iTechLounge owner",
    action: "Supply the exact Companies House identity and public contact details.",
  },
  {
    id: "legal-approval",
    label: "Legal and ICO approval",
    owner: "iTechLounge owner / UK counsel",
    action: "Record genuine legal review and ICO registration, fee payment or exemption evidence.",
  },
  {
    id: "stripe",
    label: "Stripe live billing",
    owner: "Finance / Stripe administrator",
    action: "Activate the Lovable-connected Stripe account, live catalogue and signed web webhook.",
  },
  {
    id: "email",
    label: "Transactional email",
    owner: "Operations / Resend administrator",
    action: "Verify haccora.co.uk sending DNS and configure the production sender.",
  },
  {
    id: "malware",
    label: "Document malware scanning",
    owner: "Security / scanner provider administrator",
    action: "Provision the production scanning endpoint and its dedicated bearer credential.",
  },
  {
    id: "push",
    label: "Browser push gateway",
    owner: "Engineering / push provider administrator",
    action: "Provision VAPID/browser push and the protected server-to-server gateway.",
  },
  {
    id: "operations",
    label: "Haccora operational secrets",
    owner: "Security / platform operations",
    action:
      "Generate unique secrets, store them in protected environments and configure Edge Functions.",
  },
  {
    id: "support",
    label: "Support and service status",
    owner: "Customer operations",
    action: "Publish the production support and status services on HTTPS URLs.",
  },
  {
    id: "native",
    label: "Native iOS and Android release",
    owner: "Mobile release owner / Expo administrator",
    action: "Configure the EAS project, production runtime values and protected Expo access token.",
  },
];

const groupById = new Map(launchRequirementGroups.map((group) => [group.id, group]));

function requirement(name, groupId, type, options = {}) {
  const group = groupById.get(groupId);
  if (!group) throw new Error(`Unknown launch requirement group: ${groupId}`);
  return {
    name,
    groupId,
    type,
    owner: group.owner,
    action: group.action,
    storage: options.storage ?? "GitHub production variable and deployment environment",
    minimumLength: options.minimumLength,
    expected: options.expected,
    generatedByHaccora: options.generatedByHaccora === true,
  };
}

const variable = { storage: "GitHub production variable and deployment environment" };
const providerSecret = { storage: "GitHub production secret and Supabase Edge Function secret" };
const internalSecret = {
  storage: "GitHub production secret and Supabase Edge Function secret",
  minimumLength: 32,
  generatedByHaccora: true,
};
const lovableVariable = {
  storage: "Lovable production environment and GitHub production variable",
};
const paymentsRoutingVariable = {
  storage:
    "Lovable production environment, GitHub production variable and Supabase Edge Function secret",
};

export const launchRequirements = [
  requirement("VITE_SUPABASE_URL", "application", "https", variable),
  requirement("SUPABASE_URL", "application", "https", variable),
  requirement("PUBLIC_MARKETING_URL", "application", "https", variable),
  requirement("PUBLIC_APP_URL", "application", "https", variable),
  requirement("OPERATIONS_HEALTH_URL", "application", "https", variable),
  requirement("ALLOWED_ORIGINS", "application", "https-list", variable),
  requirement("VITE_SUPABASE_PUBLISHABLE_KEY", "application", "value", variable),
  requirement("SUPABASE_PUBLISHABLE_KEY", "application", "value", variable),

  requirement("VITE_LEGAL_COMPANY_NAME", "legal-identity", "value", variable),
  requirement("VITE_LEGAL_ADDRESS_LINE_1", "legal-identity", "value", variable),
  requirement("VITE_LEGAL_POSTAL_CITY", "legal-identity", "value", variable),
  requirement("VITE_LEGAL_REGISTERED_IN", "legal-identity", "value", variable),
  requirement("VITE_LEGAL_COMPANY_NUMBER", "legal-identity", "value", variable),
  requirement("VITE_LEGAL_EMAIL", "legal-identity", "value", variable),
  requirement("VITE_LEGAL_PHONE", "legal-identity", "value", variable),
  requirement("LEGAL_COUNSEL_APPROVAL_REFERENCE", "legal-approval", "value", variable),
  requirement("LEGAL_COUNSEL_APPROVED_AT", "legal-approval", "iso-date", variable),
  requirement("LEGAL_ICO_FEE_STATUS_CONFIRMED", "legal-approval", "boolean", {
    ...variable,
    expected: "true",
  }),
  requirement("VITE_LEGAL_CONTENT_APPROVED", "legal-approval", "boolean", {
    ...variable,
    expected: "true",
  }),

  requirement("VITE_PAYMENTS_CLIENT_TOKEN", "stripe", "stripe-live-publishable", lovableVariable),
  requirement("PAYMENTS_ENVIRONMENT", "stripe", "value", paymentsRoutingVariable),
  requirement("PAYMENTS_RUNTIME_PROVIDER", "stripe", "value", paymentsRoutingVariable),
  requirement("PAYMENTS_WEBHOOK_URL", "stripe", "https", paymentsRoutingVariable),

  requirement("RESEND_API_KEY", "email", "value", providerSecret),
  requirement("NOTIFICATION_FROM_EMAIL", "email", "value", variable),

  requirement("MALWARE_SCAN_URL", "malware", "https", variable),
  requirement("MALWARE_SCAN_TOKEN", "malware", "secret", {
    ...providerSecret,
    minimumLength: 20,
  }),

  requirement("VIRUSTOTAL_API_KEY", "malware", "secret", {
    ...providerSecret,
    minimumLength: 20,
  }),

  requirement("VITE_WEB_PUSH_PUBLIC_KEY", "push", "value", variable),
  requirement("WEB_PUSH_GATEWAY_URL", "push", "https", variable),
  requirement("WEB_PUSH_GATEWAY_TOKEN", "push", "secret", internalSecret),

  requirement("CONTACT_HASH_SALT", "operations", "secret", internalSecret),
  requirement("CRON_SECRET", "operations", "secret", internalSecret),
  requirement("OPERATIONS_MONITOR_SECRET", "operations", "secret", internalSecret),
  requirement("INTEGRATION_ENCRYPTION_KEY", "operations", "secret", internalSecret),

  requirement("VITE_SUPPORT_URL", "support", "https", variable),
  requirement("VITE_STATUS_URL", "support", "https", variable),

  requirement("EXPO_PUBLIC_SUPABASE_URL", "native", "native", variable),
  requirement("EXPO_PUBLIC_WEB_APP_URL", "native", "native", variable),
  requirement("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "native", "native", variable),
  requirement("EAS_PROJECT_ID", "native", "native", variable),
  requirement("EXPO_ACCESS_TOKEN", "native", "secret", {
    ...providerSecret,
    minimumLength: 20,
    storage: "GitHub production secret and EAS protected environment",
  }),
];

export const generatedLaunchSecretNames = launchRequirements
  .filter((item) => item.generatedByHaccora)
  .map((item) => item.name);

const requirementByName = new Map(launchRequirements.map((item) => [item.name, item]));

function currentValue(environment, name) {
  return String(environment[name] ?? "").trim();
}

function valueFailure(requirement, environment) {
  const current = currentValue(environment, requirement.name);
  if (!current) return `${requirement.name} is missing`;
  if (placeholder.test(current)) return `${requirement.name} still contains a placeholder`;

  if (requirement.type === "https" || requirement.type === "https-list") {
    const entries = requirement.type === "https-list" ? current.split(",") : [current];
    for (const entry of entries.map((item) => item.trim()).filter(Boolean)) {
      try {
        const parsed = new URL(entry);
        if (parsed.protocol !== "https:") return `${requirement.name} must use HTTPS`;
      } catch {
        return `${requirement.name} is not a valid HTTPS URL`;
      }
    }
  }

  if (requirement.name === "MALWARE_SCAN_URL" && !current.endsWith("/api/public/malware-scan")) {
    return `${requirement.name} must point at the Haccora scanning endpoint /api/public/malware-scan`;
  }

  if (requirement.name === "PAYMENTS_WEBHOOK_URL") {
    const appUrl = currentValue(environment, "PUBLIC_APP_URL");
    try {
      const webhook = new URL(current);
      const app = new URL(appUrl);
      if (
        webhook.origin !== app.origin ||
        webhook.pathname !== "/api/public/payments/webhook" ||
        webhook.search ||
        webhook.hash
      ) {
        return `${requirement.name} must be PUBLIC_APP_URL/api/public/payments/webhook`;
      }
    } catch {
      return `${requirement.name} is not a valid Lovable payment webhook URL`;
    }
  }

  if (requirement.name === "PAYMENTS_ENVIRONMENT" && current !== "live") {
    return "PAYMENTS_ENVIRONMENT must be live for a production launch";
  }

  if (requirement.name === "PAYMENTS_RUNTIME_PROVIDER" && current !== "lovable") {
    return "PAYMENTS_RUNTIME_PROVIDER must be lovable";
  }

  if (requirement.name === "ALLOWED_ORIGINS") {
    const allowedOrigins = new Set(
      current
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => new URL(entry).origin),
    );
    for (const relatedName of ["PUBLIC_MARKETING_URL", "PUBLIC_APP_URL"]) {
      const relatedValue = currentValue(environment, relatedName);
      if (!relatedValue || placeholder.test(relatedValue)) continue;
      try {
        const relatedOrigin = new URL(relatedValue).origin;
        if (!allowedOrigins.has(relatedOrigin)) {
          return `${requirement.name} must include the ${relatedName} origin`;
        }
      } catch {
        // The related control reports its own URL validation failure.
      }
    }
  }

  if (requirement.type === "secret" && current.length < requirement.minimumLength) {
    return `${requirement.name} must contain at least ${requirement.minimumLength} characters`;
  }

  if (requirement.type === "stripe-live-publishable" && !/^pk_live_[A-Za-z0-9_]+$/.test(current)) {
    return `${requirement.name} must be a Stripe live-mode publishable key`;
  }

  if (requirement.type === "stripe-webhook-secret" && !/^whsec_[A-Za-z0-9_]+$/.test(current)) {
    return `${requirement.name} must be a Stripe webhook signing secret`;
  }

  if (requirement.type === "stripe-price" && !/^price_[A-Za-z0-9_]+$/.test(current)) {
    return `${requirement.name} must be a Stripe Price ID`;
  }

  if (requirement.type === "iso-date") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(current) || Number.isNaN(Date.parse(`${current}T00:00:00Z`))) {
      return `${requirement.name} must be a valid date in YYYY-MM-DD format`;
    }
  }

  if (requirement.type === "boolean" && current !== requirement.expected) {
    if (requirement.name === "LEGAL_ICO_FEE_STATUS_CONFIRMED") {
      return `${requirement.name} must be true after documenting ICO registration or exemption`;
    }
    if (requirement.name === "VITE_LEGAL_CONTENT_APPROVED") {
      return `${requirement.name} must be true after documented counsel approval`;
    }
    return `${requirement.name} must be ${requirement.expected}`;
  }

  return null;
}

function issueFor(requirement, message) {
  return {
    id: requirement.name,
    name: requirement.name,
    groupId: requirement.groupId,
    message,
    owner: requirement.owner,
    action: requirement.action,
    storage: requirement.storage,
    generatedByHaccora: requirement.generatedByHaccora,
  };
}

function nativeName(message) {
  return String(message).match(/^([A-Z][A-Z0-9_]+)/)?.[1] ?? null;
}

export async function evaluateLaunchReadiness({
  environment = process.env,
  root = process.cwd(),
  nativeFailures = nativeReleaseEnvironmentFailures(environment),
} = {}) {
  const issues = [];
  const failedNames = new Set();

  for (const requirement of launchRequirements.filter((item) => item.type !== "native")) {
    const message = valueFailure(requirement, environment);
    if (message) {
      failedNames.add(requirement.name);
      issues.push(issueFor(requirement, message));
    }
  }

  for (const message of nativeFailures) {
    const name = nativeName(message);
    const requirement = requirementByName.get(name);
    if (!requirement || failedNames.has(name)) continue;
    failedNames.add(name);
    issues.push(issueFor(requirement, message));
  }

  const nativeGroup = groupById.get("native");
  try {
    const mobileConfig = JSON.parse(await readFile(path.join(root, "mobile/app.json"), "utf8"));
    const dynamicConfig = await readFile(path.join(root, "mobile/app.config.js"), "utf8");
    const integrityChecks = [
      [
        dynamicConfig.includes("process.env.EAS_PROJECT_ID"),
        "native-config:eas-project-id",
        "mobile/app.config.js does not inject the protected EAS_PROJECT_ID",
      ],
      [
        Boolean(mobileConfig?.expo?.ios?.bundleIdentifier),
        "native-config:ios-bundle",
        "mobile/app.json is missing the iOS bundle identifier",
      ],
      [
        Boolean(mobileConfig?.expo?.android?.package),
        "native-config:android-package",
        "mobile/app.json is missing the Android package identifier",
      ],
    ];
    for (const [passed, id, message] of integrityChecks) {
      if (passed) continue;
      issues.push({
        id,
        name: null,
        groupId: "native",
        message,
        owner: nativeGroup.owner,
        action: nativeGroup.action,
        storage: "Source-controlled native application configuration",
        generatedByHaccora: false,
      });
    }
  } catch (error) {
    issues.push({
      id: "native-config:unreadable",
      name: null,
      groupId: "native",
      message: `Native application configuration could not be read: ${error.message}`,
      owner: nativeGroup.owner,
      action: nativeGroup.action,
      storage: "Source-controlled native application configuration",
      generatedByHaccora: false,
    });
  }

  const groups = launchRequirementGroups.map((group) => ({
    ...group,
    controls: launchRequirements.filter((item) => item.groupId === group.id).length,
    issues: issues.filter((issue) => issue.groupId === group.id),
  }));

  return {
    schemaVersion: 1,
    ready: issues.length === 0,
    totalControls: launchRequirements.length,
    passedControls: launchRequirements.length - failedNames.size,
    failedControls: failedNames.size,
    sourceIntegrityIssues: issues.filter((issue) => issue.name === null).length,
    groups,
    issues,
  };
}

export function serialiseLaunchReadiness(result, generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: result.schemaVersion,
    generatedAt,
    ready: result.ready,
    summary: {
      totalControls: result.totalControls,
      passedControls: result.passedControls,
      failedControls: result.failedControls,
      sourceIntegrityIssues: result.sourceIntegrityIssues,
      failingGroups: result.groups.filter((group) => group.issues.length > 0).length,
    },
    groups: result.groups.map((group) => ({
      id: group.id,
      label: group.label,
      owner: group.owner,
      action: group.action,
      controls: group.controls,
      issues: group.issues.map((issue) => ({
        name: issue.name,
        message: issue.message,
        storage: issue.storage,
        generatedByHaccora: issue.generatedByHaccora,
      })),
    })),
  };
}

export function formatLaunchReadiness(result) {
  if (result.ready) {
    return `Production environment preflight passed (${result.totalControls}/${result.totalControls} configuration controls).`;
  }

  const lines = [
    `Production launch blocked: ${result.failedControls} of ${result.totalControls} configuration controls fail across ${result.groups.filter((group) => group.issues.length).length} groups.`,
  ];
  if (result.sourceIntegrityIssues) {
    lines[0] += ` ${result.sourceIntegrityIssues} source-integrity issue(s) also fail.`;
  }

  for (const group of result.groups.filter((item) => item.issues.length)) {
    lines.push("", `${group.label} — owner: ${group.owner}`);
    for (const issue of group.issues) {
      const generated = issue.generatedByHaccora
        ? " [can be generated by npm run launch:bootstrap]"
        : "";
      lines.push(`- ${issue.message}${generated}`);
    }
    lines.push(`  Next: ${group.action}`);
  }

  lines.push(
    "",
    "No configured values were printed. Run `npm run launch:bootstrap` to create an ignored local file and generate Haccora-owned secrets, then `npm run launch:status`.",
  );
  return lines.join("\n");
}
