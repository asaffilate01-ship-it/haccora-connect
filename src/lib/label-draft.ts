export type LabelRecipe = {
  id: string;
  name: string;
  allergens: string[];
  flagged: boolean;
  updated_at: string;
  organization_id: string | null;
};

export function validLabelDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function readyLabelRecipe(value: unknown, organizationId: string): value is LabelRecipe {
  if (!value || typeof value !== "object") return false;
  const r = value as LabelRecipe;
  return (
    typeof r.id === "string" &&
    !!r.id &&
    typeof r.name === "string" &&
    !!r.name.trim() &&
    Array.isArray(r.allergens) &&
    r.allergens.every((a) => typeof a === "string" && !!a.trim()) &&
    r.flagged === false &&
    r.organization_id === organizationId &&
    typeof r.updated_at === "string" &&
    Number.isFinite(Date.parse(r.updated_at))
  );
}

export function sameLabelRecipe(before: LabelRecipe, after: LabelRecipe): boolean {
  return (
    before.id === after.id &&
    before.organization_id === after.organization_id &&
    before.updated_at === after.updated_at &&
    before.name === after.name &&
    before.flagged === after.flagged &&
    JSON.stringify(before.allergens) === JSON.stringify(after.allergens)
  );
}

export function validLabelDates(prepared: string, useBy: string): boolean {
  return validLabelDate(prepared) && validLabelDate(useBy) && useBy >= prepared;
}

// textContent is intentional: recipe names and allergen values are untrusted data.
export function renderLabelDocument(doc: Document, lines: string[]) {
  doc.title = "Haccora label draft";
  doc.body.replaceChildren();
  const style = doc.createElement("style");
  style.textContent =
    "body{font:16px sans-serif;color:#111;padding:20px}main{border:2px solid #111;padding:16px;max-width:360px}p{overflow-wrap:anywhere}p:first-child{font-weight:bold;border-bottom:2px solid #111;padding-bottom:8px}@page{margin:10mm}";
  doc.head.appendChild(style);
  const main = doc.createElement("main");
  for (const line of lines) {
    const p = doc.createElement("p");
    p.textContent = line;
    main.appendChild(p);
  }
  doc.body.appendChild(main);
}
