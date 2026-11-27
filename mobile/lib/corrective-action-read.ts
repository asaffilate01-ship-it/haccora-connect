export type CorrectiveActionRecord = {
  id: string;
  description: string;
  severity: string;
  status: string;
  due_at: string | null;
  evidence: Array<{ document_id?: string; storage_path?: string }>;
};

export type CorrectiveActionRead =
  | { kind: "unavailable"; actions: [] }
  | { kind: "empty"; actions: [] }
  | { kind: "ready"; actions: CorrectiveActionRecord[] };

/** Failed, missing, or malformed reads must never appear as a confirmed empty queue. */
export function classifyCorrectiveActionRead(data: unknown, error: unknown): CorrectiveActionRead {
  if (error || !Array.isArray(data)) return { kind: "unavailable", actions: [] };
  const actions: CorrectiveActionRecord[] = [];
  for (const candidate of data) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return { kind: "unavailable", actions: [] };
    }
    const row = candidate as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !row.id.trim() ||
      typeof row.description !== "string" ||
      typeof row.severity !== "string" ||
      typeof row.status !== "string" ||
      (row.due_at !== null && typeof row.due_at !== "string") ||
      (row.evidence != null && !Array.isArray(row.evidence))
    )
      return { kind: "unavailable", actions: [] };
    actions.push({
      id: row.id,
      description: row.description,
      severity: row.severity,
      status: row.status,
      due_at: row.due_at as string | null,
      evidence: (row.evidence ?? []) as CorrectiveActionRecord["evidence"],
    });
  }
  return actions.length ? { kind: "ready", actions } : { kind: "empty", actions: [] };
}

export function canChangeCorrectiveAction(role: string | null): boolean {
  return role === "owner" || role === "manager" || role === "chef" || role === "staff";
}
