export function isWorkspaceRoute(pathname: string, destination: string, exact = false) {
  return pathname === destination || (!exact && pathname.startsWith(destination + "/"));
}

export function matchesWorkspaceSearch(query: string, ...fields: string[]) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const text = fields
    .join(" ")
    .toLowerCase()
    .replace(/[-_/&]/g, " ");
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
