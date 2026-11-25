import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth } from "@/lib/auth";
import { UK_ALLERGENS } from "@/lib/uk-compliance";
import { readEvidencePages } from "@/lib/evidence-pages";
import { assessPpdsIntegrity, type PpdsLabelSnapshot } from "@/lib/ppds-integrity";
import { IngredientChangeReview } from "@/components/ppds/IngredientChangeReview";

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
type LabelVersion = {
  id: string;
  recipe_id: string | null;
  version: number;
  generated_at: string;
  source_snapshot: PpdsLabelSnapshot | null;
  allergens: string[];
  ingredient_statement: string;
};
function Ppds() {
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId) {
    return (
      <p className="p-5 text-sm">Select a business location to review its PPDS evidence.</p>
    );
  }
  return <SitePpds key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`} />;
}

function SitePpds() {
  const { user } = useAuth();
  const canApprove = user?.role === "owner" || user?.role === "manager";
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [supplierReviewed, setSupplierReviewed] = useState(false);
  const writeLock = useRef(false);
  const requestId = useRef(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [name, setName] = useState("");
  const [statement, setStatement] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [mayContain, setMayContain] = useState<string[]>([]);
  const [labels, setLabels] = useState<LabelVersion[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [ingredientId, setIngredientId] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    if (!user?.organizationId || !user.locationId) {
      setLoadError("Select a location before reviewing PPDS evidence.");
      setLoading(false);
      return null;
    }
    const organizationId = user.organizationId;
    const locationId = user.locationId;
    const isCurrent = () => request === requestId.current;
    try {
      const [ingredients, recipes, links, labels] = await Promise.all([
        readEvidencePages(
          (from, to) =>
            supabase
              .from("ingredients")
              .select(
                "id,name,ingredient_statement,allergens,may_contain,specification_version,reviewed_at",
                { count: "exact" },
              )
              .eq("organization_id", organizationId)
              .order("name")
              .order("id")
              .range(from, to),
          (row) => row.id,
          isCurrent,
        ),
        readEvidencePages(
          (from, to) =>
            supabase
              .from("recipes")
              .select("id,name", { count: "exact" })
              .eq("organization_id", organizationId)
              .or(`location_id.eq.${locationId},location_id.is.null`)
              .order("name")
              .order("id")
              .range(from, to),
          (row) => row.id,
          isCurrent,
        ),
        readEvidencePages(
          (from, to) =>
            supabase
              .from("recipe_ingredients")
              .select("recipe_id,ingredient_id,quantity,unit", { count: "exact" })
              .eq("organization_id", organizationId)
              .order("recipe_id")
              .order("ingredient_id")
              .range(from, to),
          (row) => `${row.recipe_id}:${row.ingredient_id}`,
          isCurrent,
        ),
        readEvidencePages(
          (from, to) =>
            supabase
              .from("ppds_label_versions")
              .select(
                "id,recipe_id,version,generated_at,source_snapshot,allergens,ingredient_statement",
                { count: "exact" },
              )
              .eq("organization_id", organizationId)
              .eq("location_id", locationId)
              .order("generated_at", { ascending: false })
              .order("version", { ascending: false })
              .order("id")
              .range(from, to),
          (row) => row.id,
          isCurrent,
        ),
      ]);
      if (!isCurrent()) return null;
      const next = {
        ingredients,
        recipes,
        links,
        labels: labels as unknown as LabelVersion[],
      };
      setIngredients(next.ingredients);
      setRecipes(next.recipes);
      setLinks(next.links);
      setLabels(next.labels);
      setRecipeId((id) =>
        next.recipes.some((recipe) => recipe.id === id) ? id : (next.recipes[0]?.id ?? ""),
      );
      return next;
    } catch {
      if (request === requestId.current) {
        setIngredients([]);
        setRecipes([]);
        setLinks([]);
        setLabels([]);
        setLoadError("Ingredient, recipe or label evidence is incomplete. Do not generate labels.");
      }
      return null;
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [user?.organizationId, user?.locationId]);
  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  async function write(task: () => Promise<void>) {
    if (!canApprove || loading || loadError || writeLock.current) return;
    writeLock.current = true;
    setBusy(true);
    setMsg("");
    try {
      await task();
    } catch {
      setMsg("The change could not be confirmed. Refresh the evidence before trying again.");
      await load();
    } finally {
      writeLock.current = false;
      setBusy(false);
    }
  }

  const ingredientsById = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const formulation = useMemo(
    () => links.filter((link) => link.recipe_id === recipeId),
    [links, recipeId],
  );
  const selected = useMemo(
    () =>
      formulation
        .map((link) => ingredientsById.get(link.ingredient_id))
        .filter((ingredient): ingredient is Ingredient => Boolean(ingredient)),
    [formulation, ingredientsById],
  );
  const derivedAllergens = [...new Set(selected.flatMap((i) => i.allergens))].sort();
  const derivedMayContain = [...new Set(selected.flatMap((i) => i.may_contain))].sort();
  const derivedStatement = selected.map((i) => i.ingredient_statement || i.name).join(", ");
  const currentLabel = labels.find((label) => label.recipe_id === recipeId) ?? null;
  const recipeIngredientIds = formulation.map((link) => link.ingredient_id);
  const integrity = assessPpdsIntegrity(selected, recipeIngredientIds, currentLabel, formulation);
  const labelIsStale = integrity.stale;
  const add = async () => {
    if (!user?.organizationId || !supplierReviewed || !name.trim() || !statement.trim()) {
      return;
    }
    const organizationId = user.organizationId;
    await write(async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          ingredient_statement: statement.trim(),
          allergens,
          may_contain: mayContain,
          reviewed_at: new Date().toISOString(),
          specification_version: "1",
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Specification not confirmed");
      setName("");
      setStatement("");
      setAllergens([]);
      setMayContain([]);
      setSupplierReviewed(false);
      setMsg("Ingredient specification saved.");
      await load();
    });
  };
  const unverifiedIngredients = integrity.missing;
  const generate = async () => {
    if (!user?.organizationId || !user.locationId || !recipeId || !selected.length) {
      setMsg("Add recipe ingredients before generating a PPDS draft.");
      return;
    }
    if (unverifiedIngredients.length) {
      setMsg(
        "Cannot generate: review and version every ingredient specification against its current supplier information first.",
      );
      return;
    }
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;
    const organizationId = user.organizationId;
    const locationId = user.locationId;
    const userId = user.id;
    await write(async () => {
      const fresh = await load();
      if (!fresh) return;
      const freshRecipe = fresh.recipes.find((r) => r.id === recipeId);
      const oldLinks = formulation;
      const freshLinks = fresh.links.filter((link) => link.recipe_id === recipeId);
      const freshById = new Map(fresh.ingredients.map((ingredient) => [ingredient.id, ingredient]));
      const freshIngredients = freshLinks.map((link) => freshById.get(link.ingredient_id));
      if (
        !freshRecipe ||
        freshRecipe.name !== recipe.name ||
        JSON.stringify(freshLinks) !== JSON.stringify(oldLinks) ||
        JSON.stringify(freshIngredients) !== JSON.stringify(selected)
      ) {
        setMsg("Recipe or supplier evidence changed. Review the updated draft before generating.");
        return;
      }

      const { data: last, error: versionError } = await supabase
        .from("ppds_label_versions")
        .select("version")
        .eq("recipe_id", recipeId)
        .eq("organization_id", organizationId)
        .eq("location_id", locationId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (versionError) throw new Error("Version lookup failed");
      const { data, error } = await supabase
        .from("ppds_label_versions")
        .insert({
          organization_id: organizationId,
          location_id: locationId,
          recipe_id: recipeId,
          product_name: recipe.name,
          ingredient_statement: derivedStatement,
          allergens: derivedAllergens,
          source_snapshot: {
            ingredient_ids: selected.map((i) => i.id),
            formulation: formulation.map(({ ingredient_id, quantity, unit }) => ({
              ingredient_id,
              quantity,
              unit,
            })),
            may_contain: derivedMayContain,
            specifications: selected.map((i) => ({
              id: i.id,
              version: i.specification_version,
              reviewed_at: i.reviewed_at,
            })),
          },
          version: (last?.version ?? 0) + 1,
          generated_by: userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Label version not confirmed");
      setMsg("PPDS draft version saved. Verify formulation, ingredient order and physical label.");
      await load();
    });
  };
  const attachIngredient = async () => {
    if (
      !user?.organizationId ||
      !recipeId ||
      !ingredientId ||
      !recipes.some((recipe) => recipe.id === recipeId) ||
      !ingredients.some((ingredient) => ingredient.id === ingredientId)
    ) {
      return;
    }
    if (links.some((link) => link.recipe_id === recipeId && link.ingredient_id === ingredientId)) {
      setMsg("This ingredient is already linked. Existing recipe quantities have not been changed.");
      return;
    }
    const organizationId = user.organizationId;
    await write(async () => {
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .insert({
          organization_id: organizationId,
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: 1,
          unit: "specification",
        })
        .select("recipe_id")
        .single();
      if (error || !data) throw new Error("Ingredient attachment not confirmed");
      setMsg("Ingredient linked for review. Verify actual recipe quantities before label approval.");
      await load();
    });
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
      {msg && (
        <div role="status" className="surface p-3 text-sm">
          {msg}
        </div>
      )}
      {loading && <p role="status">Loading supplier and recipe evidence…</p>}
      {loadError && (
        <div role="alert" className="surface p-3 text-sm">
          {loadError}
          <button
            type="button"
            className="btn-secondary mt-3 block px-3 py-2"
            onClick={() => void load()}
            disabled={busy || loading}
          >
            Retry loading
          </button>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-5">
        <fieldset
          disabled={!canApprove || loading || busy || !!loadError}
          className="surface p-5 space-y-4 min-w-0"
        >
          <legend className="sr-only">New ingredient specification</legend>
          <h2 className="text-xl font-bold">New ingredient specification</h2>
          <input
            className="input w-full"
            placeholder="Ingredient name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSupplierReviewed(false);
            }}
          />
          <textarea
            className="input w-full min-h-24"
            placeholder="Full ingredient statement from the current supplier specification"
            value={statement}
            onChange={(e) => {
              setStatement(e.target.value);
              setSupplierReviewed(false);
            }}
          />
          <div>
            <div className="text-sm font-bold mb-2">Contains</div>
            <div className="grid grid-cols-2 gap-2">
              {UK_ALLERGENS.map((a) => (
                <label className="text-xs flex gap-2" key={a}>
                  <input
                    type="checkbox"
                    checked={allergens.includes(a)}
                    onChange={(e) => {
                      setAllergens(
                        e.target.checked ? [...allergens, a] : allergens.filter((x) => x !== a),
                      );
                      setSupplierReviewed(false);
                    }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold mb-2">May contain</div>
            <p className="text-xs text-muted-foreground mb-2">
              Use only where a documented cross-contamination risk assessment supports the warning.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {UK_ALLERGENS.map((a) => (
                <label className="text-xs flex gap-2" key={a}>
                  <input
                    type="checkbox"
                    checked={mayContain.includes(a)}
                    onChange={(e) => {
                      setMayContain(
                        e.target.checked ? [...mayContain, a] : mayContain.filter((x) => x !== a),
                      );
                      setSupplierReviewed(false);
                    }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={supplierReviewed}
              onChange={(event) => setSupplierReviewed(event.target.checked)}
            />
            I checked the statement and declarations against the current supplier specification.
          </label>
          <button
            className="btn-primary px-4 py-2"
            disabled={!supplierReviewed || !name.trim() || !statement.trim()}
            onClick={() => void add()}
          >
            Save specification
          </button>
        </fieldset>
        <fieldset
          disabled={loading || busy || !!loadError}
          className="surface p-5 space-y-4 min-w-0"
        >
          <legend className="sr-only">PPDS draft preparation</legend>
          <h2 className="text-xl font-bold">Prepare PPDS draft</h2>
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
              disabled={!canApprove || !recipeId || !ingredientId}
              onClick={() => void attachIngredient()}
            >
              Attach
            </button>
          </div>
          <div className="rounded-xl border p-4 bg-white">
            <p className="mb-2 text-xs font-semibold">Draft only — not approved for printing</p>
            <div className="text-2xl font-black">
              {recipes.find((r) => r.id === recipeId)?.name ?? "Product name"}
            </div>
            <p className="text-sm mt-3">
              <strong>Ingredients:</strong>{" "}
              {derivedStatement || "Add ingredients to this recipe first."}
            </p>
            <p className="text-sm mt-3">
              <strong>Contains:</strong> {derivedAllergens.join(", ") || "None derived"}
            </p>
            {derivedMayContain.length > 0 && (
              <p className="text-sm mt-2">
                <strong>May contain:</strong> {derivedMayContain.join(", ")}
              </p>
            )}
          </div>
          {!loading && !loadError && currentLabel && (
            <div
              className={`rounded-xl border p-3 text-sm ${
                labelIsStale
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-success/30 bg-success/5"
              }`}
            >
              <strong>Controlled version {currentLabel.version}:</strong>{" "}
              {labelIsStale
                ? "Out of date — do not use this label until it has been regenerated and checked."
                : "Snapshot matches the recorded ingredient details; physical label approval is still required."}
            </div>
          )}
          {!loading && !loadError && labelIsStale && (
            <ul
              role="alert"
              className="rounded-lg border border-destructive/40 p-3 text-sm list-disc pl-7"
            >
              {integrity.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {unverifiedIngredients.length > 0 && (
            <div role="alert" className="rounded-lg border border-warning/40 p-3 text-sm">
              {unverifiedIngredients.length} ingredient specification(s) need a reviewed statement
              and version before label generation.
            </div>
          )}
          <button
            className="btn-primary px-4 py-2"
            disabled={
              !canApprove || !recipeId || !selected.length || unverifiedIngredients.length > 0
            }
            onClick={() => void generate()}
          >
            {busy ? "Saving…" : "Save draft version"}
          </button>
          <p className="text-xs text-muted-foreground">
            Verify actual formulation, ingredient order, allergen emphasis and the physical label
            before sale. Precautionary “may contain” statements require a documented risk assessment.
          </p>
        </fieldset>
      </div>
      {user?.organizationId && !loadError && !loading && !busy && (
        <IngredientChangeReview
          organizationId={user.organizationId}
          ingredients={ingredients}
          recipes={recipes}
          recipeLinks={links}
          canManage={canApprove}
          onApplied={() => void load()}
        />
      )}
    </div>
  );
}
