import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  readyLabelRecipe,
  sameLabelRecipe,
  validLabelDates,
  renderLabelDocument,
  type LabelRecipe,
} from "@/lib/label-draft";

export const Route = createFileRoute("/app/labels")({ component: LabelsPage });

function LabelsPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId;
  const identity = `${user?.id ?? ""}:${organizationId ?? ""}`;
  const account = useRef(identity);
  account.current = identity;
  const request = useRef(0);
  const pending = useRef(false);
  const [recipes, setRecipes] = useState<LabelRecipe[]>([]);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [prepared, setPrepared] = useState("");
  const [useBy, setUseBy] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"changed" | "error" | "opened" | null>(null);
  const canPrint = user ? can(user.role, "labels.print", user.actionPermissions) : false;
  const printPermission = useRef(canPrint);
  printPermission.current = canPrint;
  const selected = recipes.find((r) => r.id === selectedId);
  const load = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setFailed(false);
    setRecipes([]);
    setSelectedId("");
    setReviewed(false);
    setMessage(null);
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,name,allergens,flagged,updated_at,organization_id")
        .eq("organization_id", organizationId)
        .order("name")
        .range(page * 100, page * 100 + 99);
      if (version !== request.current || account.current !== identity) return;
      if (error || !Array.isArray(data)) throw Error("Recipe lookup failed");
      setRecipes(data as LabelRecipe[]);
    } catch {
      if (version === request.current && account.current === identity) setFailed(true);
    } finally {
      if (version === request.current && account.current === identity) setLoading(false);
    }
  }, [organizationId, identity, page]);
  useEffect(() => {
    setPage(0);
  }, [identity]);
  useEffect(() => {
    setPrepared("");
    setUseBy("");
    request.current += 1;
    void load();
    return () => {
      request.current += 1;
    };
  }, [load]);
  const ready =
    !loading &&
    !failed &&
    !!organizationId &&
    !!selected &&
    readyLabelRecipe(selected, organizationId) &&
    validLabelDates(prepared, useBy) &&
    reviewed &&
    canPrint;

  const printDraft = async () => {
    if (pending.current || !ready || !selected || !organizationId) return;
    pending.current = true;
    setBusy(true);
    setMessage(null);
    const version = request.current;
    // Open synchronously from the click so popup blockers do not reject a later async open.
    const preview = window.open("", "_blank", "width=520,height=650");
    if (!preview) {
      pending.current = false;
      setBusy(false);
      setMessage("error");
      return;
    }
    preview.opener = null;
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id,name,allergens,flagged,updated_at,organization_id")
        .eq("organization_id", organizationId)
        .eq("id", selected.id)
        .maybeSingle();
      if (version !== request.current || account.current !== identity || !printPermission.current) {
        preview.close();
        return;
      }
      if (error) throw error;
      if (!readyLabelRecipe(data, organizationId) || !sameLabelRecipe(selected, data)) {
        preview.close();
        await load();
        setMessage("changed");
        return;
      }
      renderLabelDocument(preview.document, [
        "DRAFT — NOT FOR FOOD USE",
        data.name,
        `${"Prepared"}: ${prepared}`,
        `${"Proposed use-by"}: ${useBy}`,
        `${"Recorded allergens"}: ${data.allergens.length ? data.allergens.join(", ") : "None recorded — this is not an allergen-free claim"}`,
        `${"Recipe reference"}: ${data.id}`,
        "For internal review. No shelf life is calculated. Not a PPDS or retail label.",
      ]);
      preview.focus();
      preview.print();
      setMessage("opened");
    } catch {
      preview.close();
      if (version === request.current && account.current === identity) setMessage("error");
    } finally {
      pending.current = false;
      if (account.current === identity) setBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-4xl">
      <h1 className="text-3xl">{"Recipe label drafts"}</h1>
      <p>
        {
          "Prepare a draft from your recipe register. Enter dates approved for your process; Haccora does not calculate shelf life. Final approval, printer confirmation and label withdrawal are not yet available."
        }
      </p>
      <button onClick={() => void load()} disabled={busy} className="btn-alert-solid">
        {"Refresh recipes"}
      </button>
      {loading ? (
        <p role="status">{"Loading recipes…"}</p>
      ) : failed ? (
        <p role="alert">{"Recipes could not be loaded. Retry before preparing a label."}</p>
      ) : !organizationId ? (
        <p>{"Select an approved workspace first."}</p>
      ) : recipes.length === 0 ? (
        <p>{"No recipes found. Add and review a recipe in the recipe register first."}</p>
      ) : (
        <>
          <label className="block space-y-2">
            <span>{"Recipe"}</span>
            <select
              className="block w-full border rounded p-3 bg-background"
              value={selectedId}
              disabled={busy}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setReviewed(false);
                setMessage(null);
              }}
            >
              <option value="">{"Choose a recipe"}</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.flagged ? " — review required" : ""}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <section className="surface p-5 space-y-3" aria-label={"Recipe review"}>
              <h2 className="text-xl">{selected.name}</h2>
              <p>
                {"Recorded allergens"}:{" "}
                {selected.allergens?.length
                  ? selected.allergens.join(", ")
                  : "None recorded — verify ingredients and cross-contact"}
              </p>
              {!readyLabelRecipe(selected, organizationId) && (
                <p role="alert">{"This recipe needs review before a draft can be printed."}</p>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <label>
                  {"Prepared date"}
                  <input
                    type="date"
                    value={prepared}
                    disabled={busy}
                    onChange={(e) => {
                      setPrepared(e.target.value);
                      setReviewed(false);
                    }}
                    className="block border rounded p-3 w-full"
                  />
                </label>
                <label>
                  {"Proposed use-by date"}
                  <input
                    type="date"
                    min={prepared || undefined}
                    value={useBy}
                    disabled={busy}
                    onChange={(e) => {
                      setUseBy(e.target.value);
                      setReviewed(false);
                    }}
                    className="block border rounded p-3 w-full"
                  />
                </label>
              </div>
              {prepared && useBy && !validLabelDates(prepared, useBy) && (
                <p role="alert">{"Use-by must be a valid date on or after preparation."}</p>
              )}
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={busy}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                <span>
                  {
                    "I have reviewed the recipe, recorded allergens and proposed dates for this draft."
                  }
                </span>
              </label>
            </section>
          )}
          <button
            onClick={() => void printDraft()}
            disabled={!ready || busy}
            className="btn-alert-solid disabled:opacity-40"
          >
            {busy ? "Checking recipe…" : "Print review draft"}
          </button>
        </>
      )}
      {organizationId && !loading && !failed && (
        <div className="flex gap-3 items-center">
          <button
            className="border rounded p-3 disabled:opacity-40"
            disabled={busy || page === 0}
            onClick={() => setPage(page - 1)}
          >
            {"Previous recipes"}
          </button>
          <span>
            {"Page"} {page + 1}
          </span>
          <button
            className="border rounded p-3 disabled:opacity-40"
            disabled={busy || recipes.length < 100}
            onClick={() => setPage(page + 1)}
          >
            {"Next recipes"}
          </button>
        </div>
      )}
      {!canPrint && <p>{"Your role cannot print label drafts."}</p>}
      {message && (
        <p role={message === "opened" ? "status" : "alert"}>
          {message === "changed"
            ? "The recipe changed or is no longer available. Select it again and repeat the review."
            : message === "error"
              ? "The draft could not be opened or verified. Allow popups and retry. No print record was created."
              : "Draft opened for printing. This does not confirm a physical print; no operational print record was created."}
        </p>
      )}
    </div>
  );
}
