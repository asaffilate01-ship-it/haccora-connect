export type PpdsIngredient = {
  id: string;
  name: string;
  ingredient_statement: string | null;
  allergens: string[];
  may_contain: string[];
  specification_version: string | null;
  reviewed_at: string | null;
};

export type PpdsLabelSnapshot = {
  ingredient_ids?: string[];
  may_contain?: string[];
  specifications?: Array<{
    id: string;
    version: string | null;
    reviewed_at: string | null;
  }>;
};

export type PpdsLabel = {
  source_snapshot: PpdsLabelSnapshot | null;
  allergens: string[];
  ingredient_statement: string;
};

const sorted = (values: string[]) =>
  [...new Set(values.map((value) => value.trim().toLowerCase()))].sort();

export function assessPpdsIntegrity(
  ingredients: PpdsIngredient[],
  recipeIngredientIds: string[],
  label: PpdsLabel | null,
): { missing: string[]; stale: boolean; reasons: string[] } {
  const missing: string[] = [];
  const reasons: string[] = [];
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const uniqueIds = [...new Set(recipeIngredientIds)];
  for (const id of uniqueIds) {
    const ingredient = byId.get(id);
    if (!ingredient) {
      missing.push(`Missing ingredient record: ${id}`);
    } else if (
      !ingredient.ingredient_statement?.trim() ||
      !ingredient.specification_version?.trim() ||
      !ingredient.reviewed_at
    ) {
      missing.push(`Supplier specification needs review: ${ingredient.name}`);
    }
  }
  if (!label) return { missing, stale: true, reasons: ["No controlled label version exists."] };

  const snapshot = label.source_snapshot;
  if (!snapshot?.ingredient_ids || !snapshot.specifications) {
    reasons.push("The last label lacks a complete source snapshot.");
  } else {
    if (
      JSON.stringify([...snapshot.ingredient_ids].sort()) !== JSON.stringify([...uniqueIds].sort())
    ) {
      reasons.push("The recipe ingredient list has changed.");
    }
    for (const id of uniqueIds) {
      const ingredient = byId.get(id);
      const previous = snapshot.specifications.find((item) => item.id === id);
      if (
        !previous ||
        !ingredient ||
        previous.version !== ingredient.specification_version ||
        previous.reviewed_at !== ingredient.reviewed_at
      ) {
        reasons.push("An ingredient specification or review date has changed.");
        break;
      }
    }
  }

  const current = uniqueIds
    .map((id) => byId.get(id))
    .filter((ingredient): ingredient is PpdsIngredient => Boolean(ingredient));
  const newContains = sorted(current.flatMap((ingredient) => ingredient.allergens));
  const newMayContain = sorted(current.flatMap((ingredient) => ingredient.may_contain));
  const currentStatement = current
    .map((ingredient) => ingredient.ingredient_statement || ingredient.name)
    .join(", ");
  if (JSON.stringify(newContains) !== JSON.stringify(sorted(label.allergens))) {
    reasons.push("Declared allergens have changed.");
  }
  if (
    !snapshot?.may_contain ||
    JSON.stringify(newMayContain) !== JSON.stringify(sorted(snapshot.may_contain))
  ) {
    reasons.push("Precautionary allergen declarations may have changed.");
  }
  if (currentStatement !== label.ingredient_statement) {
    reasons.push("The ingredient statement has changed.");
  }
  return { missing, stale: reasons.length > 0 || missing.length > 0, reasons };
}
