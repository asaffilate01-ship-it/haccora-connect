// Role choices select a real test identity. They do not grant or alter a role.
export const DEMO_ROLES = [
  {
    id: "owner",
    label: "Business owner",
    description: "Full business workspace, team, sites and subscription.",
    localPart: "tenant-admin",
    platform: false,
  },
  {
    id: "manager",
    label: "Location manager",
    description: "Shift supervision, compliance and corrective actions.",
    localPart: "manager",
    platform: false,
  },
  {
    id: "chef",
    label: "Head chef",
    description: "Kitchen controls, recipes, allergens and receiving.",
    localPart: "chef",
    platform: false,
  },
  {
    id: "staff",
    label: "Team member",
    description: "Daily tasks, checks, cleaning and temperature records.",
    localPart: "staff",
    platform: false,
  },
  {
    id: "inspector",
    label: "Inspector",
    description: "Time-limited, read-only inspection evidence.",
    localPart: "inspector",
    platform: false,
  },
  {
    id: "platform_owner",
    label: "SaaS owner",
    description: "Isolated platform administration and customer-account controls.",
    localPart: "saas-owner",
    platform: true,
  },
  {
    id: "platform_support",
    label: "SaaS support",
    description: "Support and service operations within the demonstration platform.",
    localPart: "saas-support",
    platform: true,
  },
  {
    id: "platform_auditor",
    label: "SaaS auditor",
    description: "Read-only platform audit and permitted financial overview.",
    localPart: "saas-auditor",
    platform: true,
  },
  {
    id: "isolation_owner",
    label: "Second business owner",
    description: "Harbour Café demo; demonstrate separate tenant data.",
    localPart: "isolation-owner",
    platform: false,
  },
] as const;

export type DemoRoleId = (typeof DEMO_ROLES)[number]["id"];

type DemoSelectionConfig = {
  enabled?: string;
  actualAppOrigin?: string;
  allowedAppOrigin?: string;
  actualSupabaseUrl?: string | null;
  allowedSupabaseUrl?: string;
  productionProjectRef?: string;
  emailDomain?: string;
  ownerEmail?: string;
  native?: boolean;
};

function httpsOrigin(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

/** Fail closed unless the UI is explicitly bound to a separate demo backend and origin. */
export function demoRoleOptions(config: DemoSelectionConfig) {
  if (config.enabled !== "true") return [];
  const appOrigin = httpsOrigin(config.actualAppOrigin);
  const allowedApp = httpsOrigin(config.allowedAppOrigin);
  const backend = httpsOrigin(config.actualSupabaseUrl);
  const allowedBackend = httpsOrigin(config.allowedSupabaseUrl);
  const productionRef = config.productionProjectRef?.trim().toLowerCase();
  if (
    !appOrigin ||
    !allowedApp ||
    appOrigin !== allowedApp ||
    !backend ||
    !allowedBackend ||
    backend !== allowedBackend ||
    !productionRef ||
    !/^[a-z0-9]{20}$/.test(productionRef)
  ) {
    return [];
  }
  const host = new URL(appOrigin).hostname;
  if (["haccora.co.uk", "www.haccora.co.uk", "app.haccora.co.uk"].includes(host)) return [];
  const backendMatch = /^https:\/\/([a-z0-9]{20})\.supabase\.co$/.exec(backend);
  if (!backendMatch || backendMatch[1] === productionRef) return [];

  const domain = config.emailDomain?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(domain)) return [];
  const ownerEmail = config.ownerEmail?.trim().toLowerCase() || `tenant-admin@${domain}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) return [];
  const options = DEMO_ROLES.map((role) => ({
    ...role,
    email: role.id === "owner" ? ownerEmail : `${role.localPart}@${domain}`,
  }));
  if (new Set(options.map((role) => role.email)).size !== options.length) return [];
  return config.native ? options.filter((role) => !role.platform) : options;
}
