/** Required, non-negative amounts fitting the existing numeric(10,2) columns. */
export function recipeMoney(raw: string): number | null {
  const value = raw.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number <= 99999999.99 ? number : null;
}

/** A uniqueness error alone is not confirmation of the submitted recipe. */
export function matchesRecipeSubmission(row: unknown, payload: Record<string, unknown>): boolean {
  if (!row || typeof row !== "object") return false;
  const record = row as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    !!record.id &&
    Object.entries(payload).every(
      ([key, value]) =>
        Object.hasOwn(record, key) && JSON.stringify(record[key]) === JSON.stringify(value),
    )
  );
}
