import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { UK_ALLERGENS } from "@/lib/uk-compliance";
import { supabase } from "@/integrations/supabase/haccora-client";

type IngredientSummary = {
  id: string;
  name: string;
  ingredient_statement: string | null;
  specification_version: string | null;
  allergens: string[];
  may_contain: string[];
};

type ChangeRequest = {
  id: string;
  ingredient_id: string;
  expected_version: string;
  proposed_version: string;
  proposed_statement: string;
  proposed_allergens: string[];
  proposed_may_contain: string[];
  evidence_reference: string;
  reason: string;
  requested_at: string;
  status: string;
};

type Props = {
  organizationId: string;
  ingredients: IngredientSummary[];
  recipeLinks: Array<{ recipe_id: string; ingredient_id: string }>;
  recipes: Array<{ id: string; name: string }>;
  canManage: boolean;
  onApplied: () => void;
};

const db = supabase as any;

export function IngredientChangeReview({
  organizationId,
  ingredients,
  recipeLinks,
  recipes,
  canManage,
  onApplied,
}: Props) {
  const [ingredientId, setIngredientId] = useState("");
  const [statement, setStatement] = useState("");
  const [version, setVersion] = useState("");
  const [contains, setContains] = useState<string[]>([]);
  const [mayContain, setMayContain] = useState<string[]>([]);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<ChangeRequest[]>([]);
  const [reviewId, setReviewId] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => ingredients.find((ingredient) => ingredient.id === ingredientId),
    [ingredientId, ingredients],
  );
  const affectedRecipes = (id: string) =>
    recipes.filter((recipe) =>
      recipeLinks.some((link) => link.recipe_id === recipe.id && link.ingredient_id === id),
    );

  const load = useCallback(async () => {
    if (!organizationId || !canManage) return;
    setLoading(true);
    const { data, error: queryError } = await db
      .from("ingredient_change_requests")
      .select(
        "id,ingredient_id,expected_version,proposed_version,proposed_statement,proposed_allergens,proposed_may_contain,evidence_reference,reason,requested_at,status",
      )
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("requested_at", { ascending: true });
    setLoading(false);
    if (queryError) {
      setError("Could not load proposed supplier changes. Approval is unavailable.");
      return;
    }
    setPending((data ?? []) as ChangeRequest[]);
    setError("");
  }, [organizationId, canManage]);

  useEffect(() => {
    setIngredientId("");
    setPending([]);
    setReviewId("");
    setNotice("");
    if (canManage) void load();
  }, [organizationId, canManage, load]);

  const chooseIngredient = (id: string) => {
    const ingredient = ingredients.find((candidate) => candidate.id === id);
    setIngredientId(id);
    setStatement(ingredient?.ingredient_statement ?? "");
    setVersion("");
    setContains(ingredient?.allergens ?? []);
    setMayContain(ingredient?.may_contain ?? []);
    setReference("");
    setReason("");
    setError("");
    setNotice("");
  };

  const submit = async () => {
    if (!canManage || !selected || busy || loading) return;
    if (
      statement.trim().length < 3 ||
      !version.trim() ||
      version.trim() === (selected.specification_version ?? "") ||
      reference.trim().length < 8 ||
      reason.trim().length < 12
    ) {
      setError("Enter a different supplier version, its full ingredient statement, an evidence reference and a reason.");
      return;
    }
    setBusy(true);
    const { error: writeError } = await db.from("ingredient_change_requests").insert({
      organization_id: organizationId,
      ingredient_id: selected.id,
      expected_version: selected.specification_version ?? "",
      proposed_version: version.trim(),
      proposed_statement: statement.trim(),
      proposed_allergens: contains,
      proposed_may_contain: mayContain,
      evidence_reference: reference.trim(),
      reason: reason.trim(),
    });
    setBusy(false);
    if (writeError) {
      setError("Request was not saved. A pending request may already exist for this ingredient.");
      return;
    }
    chooseIngredient("");
    setError("");
    await load();
    setNotice("Proposed change recorded. The live ingredient and labels have not been changed.");
  };

  const review = async (approve: boolean) => {
    if (!canManage || !reviewId || busy || loading || reviewNote.trim().length < 12) {
      setError("Select a pending request and record a review reason of at least 12 characters.");
      return;
    }
    if (approve && !window.confirm(
      "Approve the supplier specification? Existing PPDS labels may become out of date and must be checked before sale.",
    )) {
      return;
    }
    setBusy(true);
    const { error: reviewError } = await db.rpc("review_ingredient_change", {
      p_request_id: reviewId,
      p_approve: approve,
      p_review_note: reviewNote.trim(),
    });
    setBusy(false);
    if (reviewError) {
      setError("Review was not applied. Refresh the queue; the supplier version may have changed.");
      return;
    }
    setNotice(
      approve
        ? "Approved specification applied. Review affected recipes, printed labels and Dishbee menus before sale."
        : "Supplier specification proposal rejected without changing the live ingredient.",
    );
    setReviewId("");
    setReviewNote("");
    setError("");
    await load();
    onApplied();
  };

  if (!canManage) return null;

  return (
    <section className="surface p-5 space-y-5" aria-labelledby="ingredient-change-title">
      <header className="space-y-1">
        <div className="eyebrow">SUPPLIER CHANGE CONTROL</div>
        <h2 id="ingredient-change-title" className="text-xl font-bold">
          Review ingredient specification changes
        </h2>
        <p className="text-sm text-muted-foreground">
          Propose new supplier information before it changes any live recipe. A manager must
          explicitly approve each change, and affected PPDS labels will need re-verification.
        </p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-border p-3 text-sm">{notice}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardCheck size={17} /> Propose a supplier update
          </h3>
          <label className="text-sm block">
            Ingredient
            <select
              className="input block w-full mt-1"
              value={ingredientId}
              onChange={(event) => chooseIngredient(event.target.value)}
            >
              <option value="">Choose a current ingredient</option>
              {ingredients.map((ingredient) => (
                <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>
              ))}
            </select>
          </label>
          {selected && (
            <>
              <p className="text-xs text-muted-foreground">
                Current version: {selected.specification_version ?? "Not recorded"}
              </p>
              <p className="text-xs font-semibold">
                {affectedRecipes(selected.id).length} linked recipes require re-verification after approval.
              </p>
              <label className="text-sm block">
                New supplier version
                <input className="input block w-full mt-1" maxLength={80} value={version}
                  onChange={(event) => setVersion(event.target.value)} />
              </label>
              <label className="text-sm block">
                Proposed full ingredient statement
                <textarea className="input block w-full mt-1 min-h-24" maxLength={4000}
                  value={statement} onChange={(event) => setStatement(event.target.value)} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <fieldset className="space-y-1">
                  <legend className="text-sm font-semibold mb-1">Contains allergens</legend>
                  {UK_ALLERGENS.map((allergen) => (
                    <label key={allergen} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={contains.includes(allergen)}
                        onChange={(event) => setContains((items) =>
                          event.target.checked ? [...items, allergen] : items.filter((x) => x !== allergen),
                        )} />
                      {allergen}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="space-y-1">
                  <legend className="text-sm font-semibold mb-1">May contain</legend>
                  {UK_ALLERGENS.map((allergen) => (
                    <label key={allergen} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={mayContain.includes(allergen)}
                        onChange={(event) => setMayContain((items) =>
                          event.target.checked ? [...items, allergen] : items.filter((x) => x !== allergen),
                        )} />
                      {allergen}
                    </label>
                  ))}
                </fieldset>
              </div>
              <label className="text-sm block">
                Supplier document / product specification reference
                <input className="input block w-full mt-1" maxLength={500} value={reference}
                  onChange={(event) => setReference(event.target.value)} />
              </label>
              <label className="text-sm block">
                Reason for revised specification
                <textarea className="input block w-full mt-1 min-h-20" maxLength={1000}
                  value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
              <button type="button" className="btn-primary px-4 py-2"
                disabled={busy || loading} onClick={() => void submit()}>
                Save proposed change
              </button>
            </>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <AlertTriangle size={17} /> Pending manager review
          </h3>
          {loading ? <p className="text-sm"><Loader2 className="inline animate-spin" size={15} /> Loading…</p> : null}
          {!loading && pending.length === 0 && <p className="text-sm text-muted-foreground">No supplier changes awaiting review.</p>}
          {pending.map((item) => {
            const active = item.id === reviewId;
            return (
              <article key={item.id} className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <div className="font-semibold">
                  {ingredients.find((ingredient) => ingredient.id === item.ingredient_id)?.name ?? "Ingredient"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.expected_version || "Unversioned"} → {item.proposed_version}
                </div>
                <div className="text-xs">Source reference: {item.evidence_reference}</div>
                <div className="rounded-md bg-secondary/60 p-2 text-xs">
                  Affects {affectedRecipes(item.ingredient_id).length} recorded recipes:{" "}
                  {affectedRecipes(item.ingredient_id).map((recipe) => recipe.name).join(", ") ||
                    "No linked recipes found"}
                </div>
                <p className="text-xs">{item.reason}</p>
                <p className="text-xs">
                  Proposed contains: {item.proposed_allergens.join(", ") || "None listed"}
                </p>
                <p className="text-xs">
                  Proposed may contain: {item.proposed_may_contain.join(", ") || "None listed"}
                </p>
                <p className="text-xs">Proposed ingredients: {item.proposed_statement}</p>
                <button
                  type="button" className="rounded-md border px-3 py-1 text-xs"
                  onClick={() => { setReviewId(active ? "" : item.id); setReviewNote(""); setError(""); }}
                >
                  {active ? "Close review" : "Open review"}
                </button>
                {active && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold">
                      Manager verification and reason
                      <textarea className="input block w-full mt-1 min-h-20"
                        maxLength={1000} value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)} />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Approval records the new specification; it does not automatically approve
                      reprinting labels or releasing held stock.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" className="btn-primary px-3 py-2 text-xs"
                        disabled={busy || reviewNote.trim().length < 12}
                        onClick={() => void review(true)}>
                        <CheckCircle2 size={14} className="inline mr-1" /> Approve
                      </button>
                      <button type="button" className="rounded-md border px-3 py-2 text-xs"
                        disabled={busy || reviewNote.trim().length < 12}
                        onClick={() => void review(false)}>
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
