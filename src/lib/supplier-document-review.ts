import { operationalDate } from "./operational-day";
export type SupplierDocument = {
  id: string;
  title: string;
  expires_at: string | null;
  issued_on: string | null;
  version: string | null;
  storage_path: string | null;
  file_url: string | null;
};
export type ReviewFlag =
  | "missing-source"
  | "missing-expiry"
  | "invalid-date"
  | "expired"
  | "expiring"
  | "future-issued"
  | "date-order"
  | "missing-version";
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
export function supplierDocumentFlags(
  row: SupplierDocument,
  today: string,
  horizon: string,
): ReviewFlag[] {
  if (!validDate(today) || !validDate(horizon) || horizon < today)
    throw Error("Invalid review interval");
  const flags: ReviewFlag[] = [];
  const rawExpiry = row.expires_at;
  let expiry = rawExpiry;
  if (
    rawExpiry &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(
      rawExpiry,
    ) &&
    validDate(rawExpiry.slice(0, 10)) &&
    Number.isFinite(Date.parse(rawExpiry))
  ) {
    expiry = operationalDate(new Date(rawExpiry), "Europe/London");
  }

  let external = false;
  try {
    const url = new URL(row.file_url ?? "");
    external = url.protocol === "https:" && !url.username && !url.password;
  } catch {
    /* No usable external source */
  }
  if (!row.storage_path?.trim() && !external) flags.push("missing-source");
  if (!row.version?.trim()) flags.push("missing-version");
  if (!expiry) flags.push("missing-expiry");
  else if (!validDate(expiry!)) flags.push("invalid-date");
  else if (expiry! < today) flags.push("expired");
  else if (expiry! <= horizon) flags.push("expiring");
  if (row.issued_on) {
    if (!validDate(row.issued_on)) {
      if (!flags.includes("invalid-date")) flags.push("invalid-date");
    } else {
      if (row.issued_on > today) flags.push("future-issued");
      if (expiry && validDate(expiry!) && row.issued_on > expiry) flags.push("date-order");
    }
  }
  return flags;
}
