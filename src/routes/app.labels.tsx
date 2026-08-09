import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Tag, Snowflake, AlertTriangle, ChefHat, History } from "lucide-react";

export const Route = createFileRoute("/app/labels")({
  component: LabelsPage,
});

type LabelKind = "prep" | "useby" | "allergen" | "defrost";

const CATALOG: Array<{
  id: string;
  en: string;
  shelfDays: number;
  allergens: string[];
}> = [
  {
    id: "l1",
    en: "House bolognese",
    shelfDays: 3,
    allergens: ["Gluten", "Celery"],
  },
  {
    id: "l2",
    en: "Caesar dressing",
    shelfDays: 2,
    allergens: ["Egg", "Fish", "Milk"],
  },
  { id: "l3", en: "Grilled chicken", shelfDays: 2, allergens: [] },
  {
    id: "l4",
    en: "Vegan bowl base",
    shelfDays: 4,
    allergens: ["Soya", "Sesame"],
  },
  { id: "l5", en: "Mashed potato", shelfDays: 2, allergens: ["Milk"] },
];

function LabelsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (_legacy: string, english: string) => english;
  const [kind, setKind] = useState<LabelKind>("prep");
  const [sel, setSel] = useState(CATALOG[0]);
  const canPrint = user ? can(user.role, "labels.print", user.actionPermissions) : false;

  const [history, setHistory] = useState<
    Array<{
      id: string;
      kind: string;
      product_name: string;
      use_by: string | null;
      created_at: string;
      printed_by: string | null;
    }>
  >([]);
  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("label_prints")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setHistory((data ?? []) as any);
  }, []);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const doPrint = async () => {
    if (!canPrint || !user) return;
    await supabase.from("label_prints").insert({
      kind,
      product_name: sel.en,
      use_by: useBy.toISOString().slice(0, 10),
      allergens: kind === "allergen" ? sel.allergens : [],
      printed_by: user.id,
    });
    loadHistory();
    window.print();
  };

  const today = new Date();
  const useBy = new Date(today.getTime() + sel.shelfDays * 86400000);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const kindMeta: Record<LabelKind, { enL: string; icon: typeof Tag; color: string }> = {
    prep: { enL: "Prep", icon: ChefHat, color: "bg-emerald-600" },
    useby: {
      enL: "Use-by",
      icon: Tag,
      color: "bg-[color:var(--color-alert-red)]",
    },
    allergen: { enL: "Allergen", icon: AlertTriangle, color: "bg-amber-500" },
    defrost: { enL: "Defrost", icon: Snowflake, color: "bg-sky-600" },
  };

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <div className="eyebrow">{"Kitchen labels"}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">{"Print labels"}</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          {"Prep, use-by, allergen and defrost labels — review operational details before use."}
        </p>
      </div>

      {/* Kind selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(kindMeta) as LabelKind[]).map((k) => {
          const m = kindMeta[k];
          const active = kind === k;
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`surface p-4 text-left transition ${active ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            >
              <span className={`h-9 w-9 rounded-lg grid place-items-center text-white ${m.color}`}>
                <m.icon size={16} />
              </span>
              <div className="mt-3 font-display text-lg">{m.enL}</div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Item picker */}
        <div className="surface p-5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            {"Select product"}
          </div>
          <ul className="space-y-1">
            {CATALOG.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSel(c)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${sel.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <div className="font-medium">{c.en}</div>
                  <div
                    className={`text-xs ${sel.id === c.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                  >
                    {"Shelf"}: {c.shelfDays} {"days"}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Label preview */}
        <div className="space-y-4">
          <div className="rounded-2xl border-2 border-dashed border-border bg-white p-6 shadow-inner">
            <div
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white ${kindMeta[kind].color}`}
            >
              {kindMeta[kind].enL}
            </div>
            <div className="mt-3 font-display text-2xl leading-tight">{sel.en}</div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground uppercase tracking-widest">{"Prepared"}</div>
                <div className="font-mono font-bold text-sm">{fmt(today)}</div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-widest">{"Use by"}</div>
                <div className="font-mono font-bold text-sm text-[color:var(--color-alert-red)]">
                  {fmt(useBy)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground uppercase tracking-widest">
                  {"Prepared by"}
                </div>
                <div className="font-medium text-sm">{user?.name ?? "—"}</div>
              </div>
              {kind === "allergen" && (
                <div className="col-span-2">
                  <div className="text-muted-foreground uppercase tracking-widest">
                    {"Allergens"}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {sel.allergens.length === 0 ? (
                      <span className="text-xs text-success">{"none declared"}</span>
                    ) : (
                      sel.allergens.map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold uppercase"
                        >
                          {a}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 pt-3 border-t border-dashed border-border font-mono text-[10px] text-muted-foreground">
              GS-{sel.id.toUpperCase()}-{today.getTime().toString(36).slice(-6)}
            </div>
          </div>

          <button
            disabled={!canPrint}
            onClick={doPrint}
            className="btn-alert-solid w-full disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} className="inline mr-2" />
            {canPrint ? "Print label" : "No permission"}
          </button>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-secondary/50 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <History size={14} /> {"Print history"}
        </div>
        {history.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{"No prints yet."}</div>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="grid grid-cols-12 items-center px-5 py-2.5 text-sm">
                <div className="col-span-5 font-medium">{h.product_name}</div>
                <div className="col-span-2 text-xs uppercase tracking-widest text-muted-foreground">
                  {h.kind}
                </div>
                <div className="col-span-3 text-xs font-mono">{h.use_by ?? "—"}</div>
                <div className="col-span-2 text-xs text-muted-foreground text-right">
                  {new Date(h.created_at).toLocaleString("en-GB")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
