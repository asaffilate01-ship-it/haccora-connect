// Cached context is a UI/offline hint, never an authorization decision.
export function workspaceCacheKey(userId: string): string {
  return `haccora-workspace-context-v2:${encodeURIComponent(userId)}`;
}

export function decodeWorkspaceCache(
  raw: string | null,
  userId: string,
): Record<string, unknown> | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (
      !value ||
      value.userId !== userId ||
      !value.context ||
      typeof value.context !== "object" ||
      Array.isArray(value.context)
    )
      return null;
    const context = value.context;
    if (typeof context.organizationId !== "string" || !context.organizationId) return null;
    for (const field of [
      "organizationName",
      "locationId",
      "locationName",
      "role",
      "roleName",
      "displayName",
    ]) {
      if (context[field] != null && typeof context[field] !== "string") return null;
    }
    if (
      context.actionPermissions != null &&
      (!Array.isArray(context.actionPermissions) ||
        context.actionPermissions.some((value: unknown) => typeof value !== "string"))
    )
      return null;
    if (
      context.serviceStatus != null &&
      !["active", "frozen", "closed"].includes(context.serviceStatus)
    )
      return null;
    return context;
  } catch {
    return null;
  }
}
