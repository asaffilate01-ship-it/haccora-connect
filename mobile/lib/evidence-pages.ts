type EvidencePage<T> = {
  data: T[] | null;
  error: unknown;
  count: number | null;
};

const PAGE_SIZE = 500;
const MAX_ROWS = 10_000;

/** Read deterministic pages without mistaking a provider row cap for complete evidence. */
export async function readEvidencePages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<EvidencePage<T>>,
  rowKey: (row: T) => string,
  isCurrent: () => boolean = () => true,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let expected: number | null = null;

  while (true) {
    if (!isCurrent()) throw new Error("Evidence request superseded");
    const offset = rows.length;
    const result = await fetchPage(offset, offset + PAGE_SIZE - 1);
    if (!isCurrent()) throw new Error("Evidence request superseded");
    const { data, error, count } = result;
    if (error || !data || count === null || !Number.isSafeInteger(count) || count < 0) {
      throw new Error("Evidence page unavailable");
    }
    if (count > MAX_ROWS) throw new Error("Evidence exceeds review limit");
    if (expected === null) expected = count;
    if (expected !== count) throw new Error("Evidence count changed during retrieval");
    if (data.length > PAGE_SIZE || offset + data.length > expected) {
      throw new Error("Invalid evidence page");
    }
    for (const row of data) {
      const key = rowKey(row);
      if (!key || seen.has(key)) throw new Error("Duplicate or invalid evidence record");
      seen.add(key);
      rows.push(row);
    }
    if (rows.length === expected) return rows;
    if (!data.length) throw new Error("Evidence pagination incomplete");
  }
}
