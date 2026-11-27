export const OPERATIONAL_LABEL_KINDS = ["prep", "useby", "defrost"] as const;

export type OperationalLabelKind = (typeof OPERATIONAL_LABEL_KINDS)[number];

export type LabelRecipe = {
  id: string;
  name: string;
  flagged: boolean;
  updated_at: string;
  organization_id: string | null;
  location_id: string | null;
};

export type LabelBlocker =
  | "workspace"
  | "permission"
  | "inactive"
  | "evidence"
  | "product"
  | "review"
  | "date"
  | "expired"
  | "unsupported";

export function premisesDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function validIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function labelBlockers(input: {
  organizationId: string | null;
  locationId: string | null;
  canPrint: boolean;
  active: boolean;
  evidenceAvailable: boolean;
  recipe: LabelRecipe | null;
  kind: string;
  useBy: string;
  reviewed: boolean;
  today: string;
}): LabelBlocker[] {
  const errors: LabelBlocker[] = [];
  if (!input.organizationId || !input.locationId) errors.push("workspace");
  if (!input.canPrint) errors.push("permission");
  if (!input.active) errors.push("inactive");
  if (!input.evidenceAvailable) errors.push("evidence");

  const r = input.recipe;
  if (
    !r ||
    !r.name.trim() ||
    !r.updated_at ||
    !r.organization_id ||
    r.organization_id !== input.organizationId ||
    (r.location_id !== null && r.location_id !== input.locationId)
  ) {
    errors.push("product");
  } else if (r.flagged) {
    errors.push("product");
  }

  if (!OPERATIONAL_LABEL_KINDS.includes(input.kind as OperationalLabelKind))
    errors.push("unsupported");
  if (!validIsoDay(input.useBy)) errors.push("date");
  else if (input.useBy < input.today) errors.push("expired");
  if (!input.reviewed) errors.push("review");
  return errors;
}
