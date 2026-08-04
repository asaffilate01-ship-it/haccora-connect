import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { UK_ALLERGENS } from "@/lib/uk-compliance";

export const Route = createFileRoute("/app/ppds")({ component: Ppds });
type Ingredient = {
  id: string;
  name: string;
  ingredient_statement: string | null;
  allergens: string[];
  may_contain: string[];
  specification_version: string | null;
  reviewed_at: string | null;
};
type Recipe = { id: string; name: string };
type Link = { recipe_id: string; ingredient_id: string; quantity: number; unit: string };
function Ppds() {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase
        .from("ingredients")
        .select(
          "id,name,ingredient_statement,allergens,may_contain,specification_version,reviewed_at",
        )
        .order("name"),
      supabase.from("recipes").select("id,name").order("name"),
      supabase.from("recipe_ingredients").select("recipe_id,ingredient_id,quantity,unit"),
    ]);
    setIngredients((a.data ?? []) as Ingredient[]);
    setRecipes((b.data ?? []) as Recipe[]);
    setLinks((c.data ?? []) as Link[]);
    if (!recipeId && b.data?.[0]) setRecipeId(b.data[0].id);
  }, [recipeId]);
  useEffect(() => {
    void load();
  }, [load]);
  const selected = useMemo(
    () =>
      links
        .filter((l) => l.recipe_id === recipeId)
        .map((l) => ingredients.find((i) => i.id === l.ingredient_id))
        .filter(Boolean) as Ingredient[],
    [links, ingredients, recipeId],
  );
  const derivedAllergens = [...new Set(selected.flatMap((i) => i.allergens))].sort();
  const derivedStatement = selected.map((i) => i.ingredient_statement || i.name).join(", ");
  const add = async () => {
    if (!user?.organizationId || !name.trim() || !statement.trim()) return;
    const { error } = await supabase.from("ingredients").insert({
      organization_id: user.organizationId,
      name: name.trim(),
      ingredient_statement: statement.trim(),
      allergens,
      reviewed_at: new Date().toISOString(),
      specification_version: "1",
    });
    setMsg(error?.message ?? "Ingredient specification saved.");
    if (!error) {
      setName("");
      setStatement("");
      setAllergens([]);
      void load();
    }
  };
  const generate = async () => {
    if (!user?.organizationId || !user.locationId || !recipeId || !selected.length) {
      setMsg("Add recipe ingredients before generating a PPDS label.");
      return;
    }
    const recipe = recipes.find((r) => r.id === recipeId);
    const { data: last } = await supabase
      .from("ppds_label_versions")
      .select("version")
      .eq("recipe_id", recipeId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("ppds_label_versions").insert({
      organization_id: user.organizationId,
      location_id: user.locationId,
      recipe_id: recipeId,
      product_name: recipe?.name ?? "PPDS food",
      ingredient_statement: derivedStatement,
      allergens: derivedAllergens,
      source_snapshot: {
        ingredient_ids: selected.map((i) => i.id),
        specifications: selected.map((i) => ({
          id: i.id,
          version: i.specification_version,
          reviewed_at: i.reviewed_at,
        })),
      },
      version: (last?.version ?? 0) + 1,
      generated_by: user.id,
    });
    setMsg(error?.message ?? "Traceable PPDS label version generated.");
  };
  const attachIngredient = async () => {
    if (!user?.organizationId || !recipeId || !ingredientId) return;
    const { error } = await supabase.from("recipe_ingredients").upsert(
      {
        organization_id: user.organizationId,
        recipe_id: recipeId,
        ingredient_id: ingredientId,
        quantity: 1,
        unit: "specification",
      },
      { onConflict: "recipe_id,ingredient_id" },
    );
    setMsg(error?.message ?? "Ingredient attached to recipe. Label data recalculated.");
    if (!error) void load();
  };
  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <div className="eyebrow">UK ALLERGEN MANAGEMENT</div>
        <h1 className="text-4xl mt-1">Ingredients & PPDS</h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          Maintain supplier-backed ingredient specifications and generate versioned labels. PPDS
          labels require the food name, a full ingredients list and emphasised allergens.
        </p>
      </div>
      {msg && <div className="surface p-3 text-sm">{msg}</div>}
      <div className="grid lg:grid-cols-2 gap-5">
        <section className="surface p-5 space-y-4">
          <h2 className="text-xl font-bold">New ingredient specification</h2>
          <input
            className="input w-full"
            placeholder="Ingredient name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="input w-full min-h-24"
            placeholder="Full ingredient statement from the current supplier specification"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
          />
          <div>
            <div className="text-sm font-bold mb-2">Contains</div>
            <div className="grid grid-cols-2 gap-2">
              {UK_ALLERGENS.map((a) => (
                <label className="text-xs flex gap-2" key={a}>
                  <input
                    type="checkbox"
                    checked={allergens.includes(a)}
                    onChange={(e) =>
                      setAllergens(
                        e.target.checked ? [...allergens, a] : allergens.filter((x) => x !== a),
                      )
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <button className="btn-primary px-4 py-2" onClick={() => void add()}>
            Save specification
          </button>
        </section>
        <section className="surface p-5 space-y-4">
          <h2 className="text-xl font-bold">Generate PPDS label</h2>
          <select
            className="input w-full"
            value={recipeId}
            onChange={(e) => setRecipeId(e.target.value)}
          >
            <option value="">Select recipe</option>
            {recipes.map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              className="input flex-1"
              value={ingredientId}
              onChange={(e) => setIngredientId(e.target.value)}
            >
              <option value="">Add ingredient to recipe</option>
              {ingredients.map((i) => (
                <option value={i.id} key={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <button
              className="rounded-lg border px-3 text-sm font-bold"
              onClick={() => void attachIngredient()}
            >
              Attach
            </button>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <div className="text-2xl font-black">
              {recipes.find((r) => r.id === recipeId)?.name ?? "Product name"}
            </div>
            <p className="text-sm mt-3">
              <strong>Ingredients:</strong>{" "}
              {derivedStatement || "Add ingredients to this recipe first."}
            </p>
            <p className="text-sm mt-3">
              <strong>Allergens:</strong> {derivedAllergens.join(", ") || "None derived"}
            </p>
          </div>
          <button className="btn-primary px-4 py-2" onClick={() => void generate()}>
            Generate controlled version
          </button>
          <p className="text-xs text-muted-foreground">
            Always verify the printed label against current supplier specifications before sale.
            Precautionary “may contain” statements require a documented risk assessment.
          </p>
        </section>
      </div>
    </div>
  );
}
