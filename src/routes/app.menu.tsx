import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  UtensilsCrossed,
  AlertTriangle,
  Leaf,
  Wheat,
  Fish,
  Egg,
  Milk,
  Nut,
  Search,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/app/menu")({
  component: MenuPage,
});

// The 14 allergens regulated by UK food information law.
const ALLERGENS = [
  { code: "gluten", en: "Gluten", icon: Wheat },
  { code: "crust", en: "Crustaceans", icon: Fish },
  { code: "egg", en: "Egg", icon: Egg },
  { code: "fish", en: "Fish", icon: Fish },
  { code: "peanut", en: "Peanut", icon: Nut },
  { code: "soy", en: "Soy", icon: Leaf },
  { code: "milk", en: "Milk", icon: Milk },
  { code: "nut", en: "Tree nuts", icon: Nut },
  { code: "celery", en: "Celery", icon: Leaf },
  { code: "mustard", en: "Mustard", icon: Leaf },
  { code: "sesame", en: "Sesame", icon: Leaf },
  { code: "sulph", en: "Sulphites", icon: AlertTriangle },
  { code: "lupin", en: "Lupin", icon: Leaf },
  { code: "mollusc", en: "Molluscs", icon: Fish },
] as const;

// Map common UK free-text allergen tags stored on recipes back to the codes above.
const ALLERGEN_ALIASES: Record<string, string> = {
  gluten: "gluten",
  wheat: "gluten",
  egg: "egg",
  milk: "milk",
  lactose: "milk",
  fish: "fish",
  crustaceans: "crust",
  peanut: "peanut",
  soy: "soy",
  celery: "celery",
  mustard: "mustard",
  sesame: "sesame",
  sulphites: "sulph",
  lupin: "lupin",
  molluscs: "mollusc",
  nuts: "nut",
  "tree nuts": "nut",
};

const toCode = (raw: string) =>
  ALLERGEN_ALIASES[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase();

type Dish = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  allergens: string[];
};

function MenuPage() {
  const { lang } = useI18n();
  const t = (_legacy: string, english: string) => english;
  const [filter, setFilter] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("recipes")
        .select("id,name,category,price_eur,allergens")
        .order("category", { ascending: true });
      setDishes(
        (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          price: Number(r.price_eur ?? 0),
          allergens: Array.isArray(r.allergens) ? r.allergens.map(toCode) : [],
        })),
      );
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      dishes.filter((d) => {
        const nameHit = d.name.toLowerCase().includes(q.toLowerCase());
        const allergenHit = filter.length === 0 || !filter.some((f) => d.allergens.includes(f));
        return nameHit && allergenHit;
      }),
    [q, filter, dishes],
  );

  const toggle = (c: string) =>
    setFilter((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <div className="eyebrow">UK food information law · 14 allergens</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Menu & allergens"}</h1>
        <p className="text-muted-foreground mt-1">
          {"14 EU allergens, additives and vegan/vegetarian tagging — guest-ready."}
        </p>
      </div>

      {/* Filters */}
      <div className="surface p-5 space-y-4">
        <div className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={"Search dish…"}
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            {"Guest filter: exclude"}
          </div>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((a) => {
              const on = filter.includes(a.code);
              return (
                <button
                  key={a.code}
                  onClick={() => toggle(a.code)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition ${
                    on
                      ? "bg-destructive text-destructive-foreground border-destructive"
                      : "bg-card hover:bg-secondary border-border"
                  }`}
                >
                  <a.icon size={12} /> {a.en}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dishes */}
      {loading ? (
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
          {"Loading menu…"}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <div key={d.id} className="surface p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {d.category && (
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {d.category}
                    </div>
                  )}
                  <div className="font-display text-lg leading-tight mt-0.5">{d.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display text-lg">£{d.price.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.allergens.length === 0 ? (
                  <span className="text-[10px] text-success font-semibold uppercase tracking-widest">
                    {"no declared allergens"}
                  </span>
                ) : (
                  d.allergens.map((c, i) => {
                    const a = ALLERGENS.find((x) => x.code === c);
                    if (!a)
                      return (
                        <span
                          key={c + i}
                          className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning-foreground px-2 py-0.5 text-[10px] font-semibold"
                        >
                          {c}
                        </span>
                      );
                    return (
                      <span
                        key={c + i}
                        className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning-foreground px-2 py-0.5 text-[10px] font-semibold"
                      >
                        <a.icon size={10} /> {a.en}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full surface p-10 text-center text-sm text-muted-foreground">
              <UtensilsCrossed size={24} className="mx-auto mb-2 opacity-50" />
              {dishes.length === 0
                ? "No recipes yet. Add dishes under Kitchen › Recipes."
                : "No dishes match the current filters."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
