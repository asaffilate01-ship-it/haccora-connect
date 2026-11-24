import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/haccora-client";
import { useAuth, type AuthUser } from "@/lib/auth";
import { UK_ALLERGENS } from "@/lib/uk-compliance";
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
  recipe_id: string;
  version: number;
  generated_at: string;
  source_snapshot: PpdsLabelSnapshot | null;
  allergens: string[];
  ingredient_statement: string;
};
function Ppds() {
  const { user } = useAuth();
  if (!user?.organizationId || !user.locationId) {
    return <p className="p-5 text-sm">Select a business location to review PPDS evidence.</p>;
  }
  return (
    <PpdsWorkspace
      key={`${user.id}:${user.organizationId}:${user.locationId}:${user.role}`}
      user={user}
    />
  );
}

function PpdsWorkspace({ user }: { user: AuthUser }) {
  const canApprove = user?.role === "owner" || user?.role === "manager";
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const loadingEvidence = useRef(true);
  const actionLock = useRef(false);
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
    if (!user.organizationId || !user.locationId) return null;
    const request = ++requestId.current;
    loadingEvidence.current = true;
    setLoading(true);
    setLoadError("");
    try {
      const [a, b, c, d] = await Promise.all([
        supabase
          .from("ingredients")
          .select(
            "id,name,ingredient_statement,allergens,may_contain,specification_version,reviewed_at",
            { count: "exact" },
          )
          .eq("organization_id", user.organizationId)
          .order("name"),
        supabase
          .from("recipes")
          .select("id,name", { count: "exact" })
          .eq("organization_id", user.organizationId)
          .or(`location_id.eq.${user.locationId},location_id.is.null`)
          .order("name"),
        supabase
          .from("recipe_ingredients")
          .select("recipe_id,ingredient_id,quantity,unit", { count: "exact" })
          .eq("organization_id", user.organizationId),
        supabase
          .from("ppds_label_versions")
          .select(
            "id,recipe_id,version,generated_at,source_snapshot,allergens,ingredient_statement",
            { count: "exact" },
          )
          .eq("organization_id", user.organizationId)
          .eq("location_id", user.locationId)
          .order("generated_at", { ascending: false }),
      ]);
      if (request !== requestId.current) return null;
      if (
        [a, b, c, d].some(
          (result) => result.error || !result.data || result.count !== result.data.length,
        )
      ) {
        throw new Error("Incomplete PPDS evidence");
      }
      const evidence = {
        ingredients: (a.data ?? []) as Ingredient[],
        recipes: (b.data ?? []) as Recipe[],
        links: (c.data ?? []) as Link[],
        labels: (d.data ?? []) as unknown as LabelVersion[],
      };
      setIngredients(evidence.ingredients);
      setRecipes(evidence.recipes);
      setLinks(evidence.links);
      setLabels(evidence.labels);
      setRecipeId((current) =>
        evidence.recipes.some((recipe) => recipe.id === current)
          ? current
          : (evidence.recipes[0]?.id ?? ""),
      );
      return evidence;
    } catch {
      if (request === requestId.current) {
        setLoadError("Ingredient, recipe or label evidence is incomplete. Do not generate labels.");
      }
      return null;
    } finally {
      if (request === requestId.current) {
        loadingEvidence.current = false;
        setLoading(false);
      }
    }
  }, [user.organizationId, user.locationId]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const perform = async (operation: () => Promise<void>) => {
    if (!canApprove || loadingEvidence.current || loadError || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setMsg("");
    try {
      await operation();
    } catch {
      setMsg("The operation could not be confirmed. Refresh the evidence before trying again.");
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const selected = useMemo(
    () =>
      links
        .filter((l) => l.recipe_id === recipeId)
        .map((l) => ingredients.find((i) => i.id === l.ingredient_id))
        .filter(Boolean) as Ingredient[],
    [links, ingredients, recipeId],
  );
  const derivedAllergens = [...new Set(selected.flatMap((i) => i.allergens))].sort();
  const derivedMayContain = [...new Set(selected.flatMap((i) => i.may_contain))].sort();
  const derivedStatement = selected.map((i) => i.ingredient_statement || i.name).join(", ");
  const currentLabel = labels.find((label) => label.recipe_id === recipeId) ?? null;
  const recipeIngredientIds = links
    .filter((link) => link.recipe_id === recipeId)
    .map((link) => link.ingredient_id);
  const integrity = assessPpdsIntegrity(selected, recipeIngredientIds, currentLabel);
  const labelIsStale = integrity.stale;
  const add = async () => {
    if (!user.organizationId || !name.trim() || !statement.trim()) return;
    await perform(async () => {
      const { data, error } = await supabase
        .from("ingredients")
        .insert({
          organization_id: user.organizationId,
          name: name.trim(),
          ingredient_statement: statement.trim(),
          allergens,
          may_contain: mayContain,
          reviewed_at: new Date().toISOString(),
          specification_version: "1",
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Ingredient write not confirmed");
      setMsg("Ingredient specification saved.");
      setName("");
      setStatement("");
      setAllergens([]);
      setMayContain([]);
      await load();
    });
  };

  const unverifiedIngredients = integrity.missing;
  const generate = async () => {
    if (!user.organizationId || !user.locationId || !recipeId) return;
    await perform(async () => {
      const evidence = await load();
      if (!evidence) return;
      const recipe = evidence.recipes.find((item) => item.id === recipeId);
      const ids = evidence.links
        .filter((link) => link.recipe_id === recipeId)
        .map((link) => link.ingredient_id);
      const current = ids
        .map((id) => evidence.ingredients.find((ingredient) => ingredient.id === id))
        .filter((ingredient): ingredient is Ingredient => Boolean(ingredient));
      const review = assessPpdsIntegrity(current, ids, null);
      if (!recipe || !current.length || review.missing.length) {
        setMsg("Cannot generate: review every current ingredient specification and recipe first.");
        return;
      }
      const evidenceRequest = requestId.current;
      const last = await supabase
        .from("ppds_label_versions")
        .select("version")
        .eq("recipe_id", recipeId)
        .eq("organization_id", user.organizationId)
        .eq("location_id", user.locationId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last.error) throw last.error;
      if (loadingEvidence.current || evidenceRequest !== requestId.current) {
        setMsg("Evidence changed during generation. Refresh and try again.");
        return;
      }
      const { data, error } = await supabase
        .from("ppds_label_versions")
        .insert({
          organization_id: user.organizationId,
          location_id: user.locationId,
          recipe_id: recipeId,
          product_name: recipe.name,
          ingredient_statement: current.map((i) => i.ingredient_statement || i.name).join(", "),
          allergens: [...new Set(current.flatMap((i) => i.allergens))].sort(),
          source_snapshot: {
            ingredient_ids: current.map((i) => i.id),
            may_contain: [...new Set(current.flatMap((i) => i.may_contain))].sort(),
            specifications: current.map((i) => ({
              id: i.id,
              version: i.specification_version,
              reviewed_at: i.reviewed_at,
            })),
          },
          version: (last.data?.version ?? 0) + 1,
          generated_by: user.id,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error("Label write not confirmed");
      setMsg("Draft version saved. Check the full ingredient order and printed label before use.");
      await load();
    });
  };

  const attachIngredient = async () => {
    if (!user.organizationId || !recipeId || !ingredientId) return;
    await perform(async () => {
      if (
        !recipes.some((recipe) => recipe.id === recipeId) ||
        !ingredients.some((ingredient) => ingredient.id === ingredientId)
      ) {
        setMsg("Choose a recipe and ingredient from the current workspace.");
        return;
      }
      if (links.some((link) => link.recipe_id === recipeId && link.ingredient_id === ingredientId)) {
        setMsg("Ingredient already attached; its existing recipe quantity has been preserved.");
        return;
      }
      const { data, error } = await supabase
        .from("recipe_ingredients")
        .insert({
          organization_id: user.organizationId,
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: 1,
          unit: "specification",
        })
        .select("recipe_id")
        .single();
      if (error || !data) throw new Error("Recipe link write not confirmed");
      setMsg("Ingredient attached. Review recipe quantities and label evidence.");
      await load();
    });
  };

  const unavailable = loading || !!loadError;
  const mutationDisabled = !canApprove || unavailable || busy;
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
      {loading && <p role="status">Loading current supplier and recipe evidence…</p>}
      {loadError && (
        <div role="alert" className="surface p-3 text-sm">
          {loadError}
          <button
            type="button"
            className="btn-secondary mt-3 block px-3 py-2"
            disabled={busy || loading}
            onClick={() => void load()}
          >
            Retry evidence loading
          </button>
        </div>
      )}
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
                    onChange={(e) =>
                      setMayContain(
                        e.target.checked ? [...mayContain, a] : mayContain.filter((x) => x !== a),
                      )
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <button
            className="btn-primary px-4 py-2"
            disabled={mutationDisabled || !name.trim() || !statement.trim()}
            onClick={() => void add()}
          >
            Save specification
          </button>
        </section>
        <section className="surface p-5 space-y-4">
          <h2 className="text-xl font-bold">Generate PPDS label</h2>
          <select
            className="input w-full"
            value={recipeId}
            disabled={unavailable || busy}
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
              disabled={unavailable || busy}
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
              disabled={mutationDisabled || !recipeId || !ingredientId}
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
              {unavailable
                ? "Ingredient evidence unavailable"
                : derivedStatement || "Add ingredients to this recipe first."}
            </p>
            <p className="text-sm mt-3">
              <strong>Contains:</strong>{" "}
              {unavailable ? "Evidence unavailable" : derivedAllergens.join(", ") || "None derived"}
            </p>
            {!unavailable && derivedMayContain.length > 0 && (
              <p className="text-sm mt-2">
                <strong>May contain:</strong> {derivedMayContain.join(", ")}
              </p>
            )}
          </div>
          {!unavailable && currentLabel && (
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
          {!unavailable && labelIsStale && (
            <ul
              role="alert"
              className="rounded-lg border border-destructive/40 p-3 text-sm list-disc pl-7"
            >
              {integrity.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {!unavailable && unverifiedIngredients.length > 0 && (
            <div role="alert" className="rounded-lg border border-warning/40 p-3 text-sm">
              {unverifiedIngredients.length} ingredient specification(s) need a reviewed statement
              and version before label generation.
            </div>
          )}
          <button
            className="btn-primary px-4 py-2"
            disabled={
              mutationDisabled || !recipeId || !selected.length || unverifiedIngredients.length > 0
            }
            onClick={() => void generate()}
          >
            {busy ? "Working…" : "Generate draft version"}
          </button>
          <p className="text-xs text-muted-foreground">
            Always verify the printed label against current supplier specifications before sale.
            Precautionary “may contain” statements require a documented risk assessment.
          </p>
        </section>
      </div>
      {user?.organizationId && !unavailable && !busy && (
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
