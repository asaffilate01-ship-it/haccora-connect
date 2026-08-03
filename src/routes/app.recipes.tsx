import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Wheat, Loader2, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/app/recipes")({ component: RecipesPage });

const ALLERGENS = [
  "gluten",
  "crustacean",
  "egg",
  "fish",
  "peanut",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphite",
  "lupin",
  "mollusc",
] as const;
type AllergenKey = (typeof ALLERGENS)[number];

interface Row {
  id: string;
  name: string;
  category: string | null;
  allergens: string[];
  cost_eur: number;
  price_eur: number;
  flagged: boolean;
}

function RecipesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const role = user?.role ?? "staff";
  const canCost = can(role, "recipes.cost");
  const canEdit =
    can(role, "menu.editAllergens") || role === "owner" || role === "manager" || role === "chef";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm(lang === "de" ? "Rezept löschen?" : "Delete recipe?")) return;
    await supabase.from("recipes").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">EU 1169/2011</div>
          <h1 className="mt-1 text-3xl md:text-4xl">{t("recipes.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("recipes.sub")}</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-alert-solid text-sm">
            <Plus size={16} className="inline mr-1.5" />
            {lang === "de" ? "Rezept hinzufügen" : "Add recipe"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 size={16} className="inline animate-spin mr-2" />…
        </div>
      ) : rows.length === 0 ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          <Wheat size={20} className="inline opacity-40 mr-2" />
          {lang === "de" ? "Noch keine Rezepte." : "No recipes yet."}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => {
            const margin =
              r.price_eur > 0 ? (((r.price_eur - r.cost_eur) / r.price_eur) * 100).toFixed(0) : "—";
            return (
              <div key={r.id} className="surface p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <Wheat size={16} />
                    </div>
                    <h3 className="font-display text-lg leading-tight">{r.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.flagged && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 text-warning-foreground border border-warning/40 px-2 py-0.5 text-[10px] font-semibold uppercase">
                        <AlertTriangle size={10} /> {t("recipes.newIngredient")}
                      </span>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => remove(r.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t("recipes.allergen")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ALLERGENS.map((a) => {
                      const active = r.allergens.includes(a);
                      return (
                        <span
                          key={a}
                          className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                            active
                              ? "bg-accent/25 border-accent text-foreground"
                              : "border-border text-muted-foreground/60"
                          }`}
                        >
                          {t(`allergen.${a}`)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  <Cell
                    label={t("recipes.cost")}
                    value={canCost ? `£${Number(r.cost_eur).toFixed(2)}` : "—"}
                  />
                  <Cell label={t("recipes.price")} value={`£${Number(r.price_eur).toFixed(2)}`} />
                  <Cell label={t("recipes.margin")} value={canCost ? `${margin}%` : "—"} accent />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && canEdit && (
        <RecipeForm
          onClose={() => setShowForm(false)}
          saving={saving}
          setSaving={setSaving}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          lang={lang}
        />
      )}
    </div>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${accent ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}
    >
      <div
        className={`text-[10px] uppercase tracking-widest ${accent ? "opacity-80" : "text-muted-foreground"}`}
      >
        {label}
      </div>
      <div className="font-display text-base mt-0.5">{value}</div>
    </div>
  );
}

function RecipeForm({
  onClose,
  saving,
  setSaving,
  onSaved,
  lang,
}: {
  onClose: () => void;
  saving: boolean;
  setSaving: (b: boolean) => void;
  onSaved: () => void;
  lang: "de" | "en";
}) {
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [allergens, setAllergens] = useState<AllergenKey[]>([]);

  const toggle = (a: AllergenKey) =>
    setAllergens((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("recipes").insert({
      name: name.trim(),
      cost_eur: Number(cost) || 0,
      price_eur: Number(price) || 0,
      allergens,
      created_by: user?.id,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm p-4">
      <form onSubmit={save} className="surface w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl">{lang === "de" ? "Neues Rezept" : "New recipe"}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {lang === "de" ? "Name" : "Name"}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {lang === "de" ? "Kosten £" : "Cost £"}
            </label>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {lang === "de" ? "Preis €" : "Price €"}
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {lang === "de" ? "Allergene" : "Allergens"}
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALLERGENS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggle(a)}
                className={`text-[10px] font-medium rounded-full px-2 py-1 border ${allergens.includes(a) ? "bg-accent/25 border-accent" : "border-border text-muted-foreground"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-full border border-border"
          >
            {lang === "de" ? "Abbrechen" : "Cancel"}
          </button>
          <button type="submit" disabled={saving} className="btn-alert-solid text-sm">
            {saving ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
            {lang === "de" ? "Speichern" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
