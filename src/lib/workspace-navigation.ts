export function isWorkspaceRoute(pathname: string, destination: string, exact = false) {
  return pathname === destination || (!exact && pathname.startsWith(destination + "/"));
}

const workspaceAliases: Readonly<Record<string, string>> = {
  "/haccp": "hazard analysis critical control points risk assessment ccp",
  "/safe-methods": "sfbb safer food better business food safety procedures",
  "/temperature": "fridge freezer probe cooling cooking hot holding cold chain",
  "/ppds": "natashas law prepacked direct sale ingredient declaration food label",
  "/allergens": "allergy allergen ingredients food intolerance",
  "/menu": "allergy allergen matrix menu ingredients",
  "/inspection": "eho environmental health inspection audit evidence",
  "/inspection-readiness": "eho environmental health inspection audit evidence",
  "/assets": "equipment qr code calibration maintenance asset history",
  "/goodsin": "delivery receiving goods in supplier acceptance",
  "/recalls": "withdrawal batch lot food recall",
  "/traceability": "lot batch trace supplier ingredient",
  "/actions": "exception nonconformance corrective action follow up",
  "/health": "fitness to work illness staff sickness",
  "/fitness-to-work": "fitness to work illness staff sickness",
  "/training": "certificate qualifications food hygiene training",
  "/billing": "subscription invoice plan payment",
};

const normalizeSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function matchesWorkspaceSearch(query: string, ...fields: string[]) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const aliases = fields
    .filter((field) => field.startsWith("/"))
    .map((route) => workspaceAliases[route.replace(/^\/app(?=\/)/, "")] ?? "");
  const text = normalizeSearch([...fields, ...aliases].join(" "));
  return terms.every((term) => text.includes(term));
}

/** Only allow known group keys from persisted navigation preferences. */
export function restoreWorkspaceGroups(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const keys = value.filter(
    (key): key is string => typeof key === "string" && allowed.includes(key),
  );
  return [...new Set(keys)];
}
