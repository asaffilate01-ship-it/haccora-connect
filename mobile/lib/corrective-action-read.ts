/**
 * Classify a tenant-scoped corrective-action read before rendering safety status.
 * An error, missing response, or malformed record is never a confirmed empty queue.
 */
export type CorrectiveActionRecord = {
  id: string;
  description: string;
  severity: string;
  status: string;
  due_at: string | null;
  evidence: Array<{ document_id?: string; storage_path?: string }>;
};

export type CorrectiveActionRead =
  | { kind: "unavailable"; actions: CorrectiveActionRecord[] }
  | { kind: "empty"; actions: CorrectiveActionRecord[] }
  | { kind: "ready"; actions: CorrectiveActionRecord[] };

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
    ) {
      return { kind: "unavailable", actions: [] };
    }
    actions.push({
      id: row.id,
      description: row.description,
      severity: row.severity,
      status: row.status,
      due_at: row.due_at,
      evidence: (row.evidence ?? []) as CorrectiveActionRecord["evidence"],
    });
  }
  return { kind: actions.length === 0 ? "empty" : "ready", actions };
}

export function canChangeCorrectiveAction(role: string | null): boolean {
  return role !== null && role !== "inspector";
}
