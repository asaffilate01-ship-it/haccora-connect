import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ClipboardCheck, History, Loader2, Printer, RefreshCw, Tag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/haccora-client";
import {
  labelBlockers,
  premisesDate,
  type LabelBlocker,
  type LabelRecipe,
  type OperationalLabelKind,
} from "@/lib/operational-label";

export const Route = createFileRoute("/app/labels")({ component: LabelsPage });

type HistoryRow = {
  id: string;
  kind: string;
  product_name: string;
  use_by: string | null;
  created_at: string;
};
type PreparedPrint = {
  id: string;
  kind: OperationalLabelKind;
  name: string;
  useBy: string;
  requestedAt: number;
  operator: string;
};

const kinds: Array<{ id: OperationalLabelKind; de: string; en: string }> = [
  { id: "prep", de: "Zubereitung", en: "Prep" },
  { id: "useby", de: "Verbrauchen bis", en: "Use-by" },
  { id: "defrost", de: "Auftauen", en: "Defrost" },
];

function LabelsPage() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const t = (de: string, en: string) => (lang === "de" ? de : en);
  const orgId = user?.organizationId;
  const siteId = user?.locationId;
  const canPrint = Boolean(user && can(user.role, "labels.print", user.actionPermissions));
  const accountActive = user?.serviceStatus === "active";
  const timeZone = "Europe/London";

  const [recipes, setRecipes] = useState<LabelRecipe[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [kind, setKind] = useState<OperationalLabelKind>("prep");
  const [useBy, setUseBy] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<PreparedPrint | null>(null);
  const requestId = useRef(0);
  const pending = useRef(false);

  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setLoadError("");
    setReady(null);
    setReviewed(false);
    if (!orgId || !siteId) {
      setRecipes([]);
      setHistory([]);
      setLoadError("Workspace location unavailable.");
      setLoading(false);
      return;
    }
    try {
      const [productResult, historyResult] = await Promise.all([
        supabase
          .from("recipes")
          .select("id,name,flagged,updated_at,organization_id,location_id")
          .eq("organization_id", orgId)
          .or("location_id.eq." + siteId + ",location_id.is.null")
          .order("name")
          .limit(150),
        supabase
          .from("label_prints")
          .select("id,kind,product_name,use_by,created_at")
          .eq("organization_id", orgId)
          .eq("location_id", siteId)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);
      if (request !== requestId.current) return;
      if (productResult.error || historyResult.error) {
        setRecipes([]);
        setHistory([]);
        setSelectedId("");
        setLoadError("Recipe or print history evidence could not be loaded.");
        return;
      }
      const results = (productResult.data ?? []) as LabelRecipe[];
      setRecipes(results);
      setHistory((historyResult.data ?? []) as HistoryRow[]);
      setSelectedId((prev) =>
        results.some((recipe) => recipe.id === prev) ? prev : (results[0]?.id ?? ""),
      );
    } catch {
      if (request !== requestId.current) return;
      setRecipes([]);
      setHistory([]);
      setSelectedId("");
      setLoadError("Recipe or print history evidence could not be loaded.");
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [orgId, siteId]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const selected = recipes.find((recipe) => recipe.id === selectedId) ?? null;
  const today = premisesDate(new Date(), timeZone);
  const blockers = labelBlockers({
    organizationId: orgId ?? null,
    locationId: siteId ?? null,
    canPrint,
    active: accountActive,
    evidenceAvailable: !loading && !loadError,
    recipe: selected,
    kind,
    useBy,
    reviewed,
    today,
  });
  const messages: Record<LabelBlocker, string> = {
    workspace: t("Betriebsstandort muss ausgewählt sein.", "Select a valid premises."),
    permission: t("Für Ihr Konto fehlt die Druckberechtigung.", "Your role cannot request labels."),
    inactive: t("Das Betriebskonto ist nicht aktiv.", "This workspace is not active."),
    evidence: t("Quelldaten sind nicht verfügbar.", "Source evidence is unavailable."),
    product: t(
      "Aktuelles, nicht markiertes Rezept aus diesem Betrieb auswählen.",
      "Select a current, unflagged recipe from this premises.",
    ),
    review: t(
      "Bestätigen Sie die Prüfung der Angaben am Arbeitsplatz.",
      "Confirm your review of the actual premises records.",
    ),
    date: t("Gültiges Verbrauchsdatum eingeben.", "Enter a valid use-by date."),
    expired: t("Verbrauchsdatum liegt in der Vergangenheit.", "Use-by date is in the past."),
    unsupported: t(
      "Allergenetiketten benötigen einen eigenen Freigabeprozess.",
      "Allergen labels require a separate controlled process.",
    ),
  };

  const changeRecipe = (id: string) => {
    setSelectedId(id);
    setReviewed(false);
    setReady(null);
    setActionError("");
  };
  const changeKind = (next: OperationalLabelKind) => {
    setKind(next);
    setReviewed(false);
    setReady(null);
    setActionError("");
  };

  const prepare = async () => {
    if (pending.current || !user || !orgId || !siteId || !selected) return;
    if (blockers.length) return;
    pending.current = true;
    setBusy(true);
    setReady(null);
    setActionError("");
    try {
      const current = await supabase
        .from("recipes")
        .select("id,name,flagged,updated_at,organization_id,location_id")
        .eq("id", selected.id)
        .eq("organization_id", orgId)
        .or("location_id.eq." + siteId + ",location_id.is.null")
        .maybeSingle();
      if (
        current.error ||
        !current.data ||
        current.data.flagged ||
        current.data.name !== selected.name ||
        current.data.updated_at !== selected.updated_at
      ) {
        setActionError(
          t(
            "Das Rezept konnte nicht bestätigt werden oder wurde geändert. Bitte neu laden.",
            "Recipe evidence changed or could not be verified. Refresh before printing.",
          ),
        );
        return;
      }
      const verifiedRecipe = current.data;
      const finalBlockers = labelBlockers({
        organizationId: orgId,
        locationId: siteId,
        canPrint,
        active: accountActive,
        evidenceAvailable: true,
        recipe: verifiedRecipe,
        kind,
        useBy,
        reviewed,
        today: premisesDate(new Date(), timeZone),
      });
      if (finalBlockers.length) {
        setActionError(finalBlockers.map((reason) => messages[reason]).join(" "));
        return;
      }
      const { data, error } = await supabase
        .from("label_prints")
        .insert({
          organization_id: orgId,
          location_id: siteId,
          printed_by: user.id,
          kind,
          product_name: verifiedRecipe.name,
          use_by: useBy,
          allergens: [],
          idempotency_key: crypto.randomUUID(),
        })
        .select("id")
        .single();
      if (error || !data?.id) {
        setActionError(
          t(
            "Druckauftrag konnte nicht gespeichert werden. Es wurde nichts freigegeben.",
            "Could not save print request; no label has been released.",
          ),
        );
        return;
      }
      const requestedAt = Date.now();
      setReady({
        id: data.id,
        kind,
        name: verifiedRecipe.name,
        useBy,
        operator: user.name,
        requestedAt,
      });
      setHistory((prior) =>
        [
          {
            id: data.id,
            kind,
            product_name: verifiedRecipe.name,
            use_by: useBy,
            created_at: new Date(requestedAt).toISOString(),
          },
          ...prior,
        ].slice(0, 15),
      );
      setReviewed(false);
    } catch {
      setActionError(
        t(
          "Druckauftrag konnte nicht bestätigt werden. Bitte erneut prüfen.",
          "Print request failed; please verify the source and retry.",
        ),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const print = () => {
    if (!ready) return;
    if (Date.now() - ready.requestedAt > 60_000) {
      setReady(null);
      setActionError(
        t(
          "Druckauftrag abgelaufen. Quelldaten erneut prüfen.",
          "Print request expired. Recheck live source data.",
        ),
      );
      return;
    }
    window.print();
  };

  const format = (value: string) =>
    new Date(value + "T12:00:00.000Z").toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="haccora-label-workbench space-y-6 p-5 md:p-10">
      <header>
        <div className="eyebrow">{t("Betriebliches Kennzeichnen", "Kitchen operations")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">
          {t("Betriebliche Etiketten", "Operational labels")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {t(
            "Nur echte Betriebsrezepte verwenden. Das Verbrauchsdatum stammt aus Ihrer geprüften betrieblichen Vorgabe; die Software berechnet keine Haltbarkeit und bestätigt keine Allergene.",
            "Use live premises recipes only. Enter the use-by date from your checked procedures: the system does not infer shelf life or certify allergens.",
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-lg border border-border px-3 py-2 text-xs">
            {t("Standort", "Premises")}: {user?.location ?? "—"}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            disabled={loading || busy}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {t("Quelldaten aktualisieren", "Refresh source")}
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm" role="note">
        <AlertTriangle className="mr-2 inline" size={16} aria-hidden="true" />
        {t(
          "Interne Kennzeichnung, kein verifiziertes Allergenetikett. Physische Etiketten und Haltbarkeitsangaben müssen vor Verwendung geprüft werden.",
          "Internal identification only, not a verified allergen or PPDS declaration. Check the physical print and use-by date before use.",
        )}
        <Link to="/app/ppds" className="ml-2 font-bold underline">{t("PPDS-Prüfung öffnen", "Open controlled PPDS review")}</Link>
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive" role="alert">
          {t(
            "Rezepte oder Druckhistorie nicht verfügbar. Der Druck ist gesperrt.",
            "Recipe or print history evidence unavailable. Printing is blocked.",
          )}
        </div>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface space-y-5 p-5">
          <div>
            <label className="text-sm font-semibold" htmlFor="haccora-label-product">
              {t("Rezept aus dem Betrieb", "Premises recipe")}
            </label>
            <select
              id="haccora-label-product"
              className="mt-2 min-h-12 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={selectedId}
              disabled={loading || busy || Boolean(loadError)}
              onChange={(event) => changeRecipe(event.target.value)}
            >
              <option value="">{t("Rezept auswählen", "Select recipe")}</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                  {recipe.flagged ? " · " + t("Prüfung nötig", "Needs review") : ""}
                </option>
              ))}
            </select>
            {recipes.length >= 150 && (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                {t(
                  "Die Liste zeigt höchstens 150 Rezepte. Nicht aufgeführte Rezepte benötigen eine gezielte Suche.",
                  "Showing up to 150 recipes; additional records are not included in this selection.",
                )}
              </p>
            )}
            {loading && <p className="mt-2 text-sm" role="status">{t("Lädt…", "Loading…")}</p>}
            {!loading && !loadError && recipes.length === 0 && (
              <p className="mt-2 text-sm">
                {t("Keine Betriebsrezepte vorhanden.", "No real recipes found for this premises.")}
              </p>
            )}
            {selected && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("Quelle zuletzt aktualisiert", "Source last updated")}:{" "}
                {new Date(selected.updated_at).toLocaleString(
                  lang === "de" ? "de-DE" : "en-GB",
                  { timeZone },
                )}
              </p>
            )}
          </div>
          <fieldset>
            <legend className="text-sm font-semibold">{t("Art", "Label type")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {kinds.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={kind === item.id}
                  onClick={() => changeKind(item.id)}
                  disabled={busy}
                  className={
                    "min-h-11 rounded-lg border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 " +
                    (kind === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border")
                  }
                >
                  {t(item.de, item.en)}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="text-sm font-semibold" htmlFor="haccora-label-date">
              {t("Geprüftes Verbrauchsdatum", "Checked use-by date")}
            </label>
            <input
              type="date"
              id="haccora-label-date"
              value={useBy}
              min={today}
              onChange={(event) => {
                setUseBy(event.target.value);
                setReviewed(false);
                setReady(null);
              }}
              disabled={busy}
              className="mt-2 min-h-12 w-full rounded-lg border border-border bg-card px-3 text-sm"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                "Kein Standard-Verbrauchsdatum und keine automatische Verlängerung.",
                "No assumed shelf-life period or automatically calculated expiry.",
              )}
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={busy}
              onChange={(event) => {
                setReviewed(event.target.checked);
                setReady(null);
              }}
              className="mt-1 h-5 w-5"
            />
            <span>
              {t(
                "Ich habe Rezept, betriebliche Arbeitsanweisung und Verbrauchsdatum anhand aktueller Unterlagen geprüft.",
                "I checked the actual recipe, documented premises procedure and use-by date against current evidence.",
              )}
            </span>
          </label>
          {blockers.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm" role="status">
              <strong>{t("Vor dem Druck erforderlich", "Before issuing a print request")}</strong>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {blockers.map((reason) => (
                  <li key={reason}>{messages[reason]}</li>
                ))}
              </ul>
            </div>
          )}
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          <button
            type="button"
            disabled={busy || blockers.length > 0}
            onClick={() => void prepare()}
            className="btn-alert-solid inline-flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
            {t("Prüfen und Druckauftrag speichern", "Verify and save print request")}
          </button>
        </div>

        <div className="space-y-4">
          {!ready ? (
            <div className="surface p-8 text-sm text-muted-foreground">
              <Tag className="mb-3" size={28} aria-hidden="true" />
              {t(
                "Nach erfolgreicher Speicherung erscheint hier das druckbereite Etikett. Keine Musterdaten werden verwendet.",
                "The label appears here only after a successful evidence check and saved print request. No sample food data is used.",
              )}
            </div>
          ) : (
            <>
              <div className="haccora-label-print-sheet surface border-2 border-foreground p-6 text-foreground">
                <div className="text-xs font-bold uppercase tracking-wider">
                  {t("Betriebliche Kennzeichnung", "Internal operational label")}
                </div>
                <div className="mt-3 text-2xl font-bold">{ready.name}</div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt>{t("Art", "Type")}</dt>
                    <dd>{t(
                      kinds.find((item) => item.id === ready.kind)?.de ?? "",
                      kinds.find((item) => item.id === ready.kind)?.en ?? "",
                    )}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("Verbrauchen bis", "Use by")}</dt>
                    <dd className="font-bold">{format(ready.useBy)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>{t("Erfasst von", "Requested by")}</dt>
                    <dd>{ready.operator}</dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-border pt-3 text-xs">
                  {t(
                    "Kein Allergen- oder PPDS-Etikett. Betriebsangaben vor Anbringung prüfen.",
                    "Not an allergen or PPDS declaration. Verify contents before applying.",
                  )}
                </p>
                <div className="mt-3 break-all font-mono text-[10px]">{ready.id}</div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Druckauftrag gespeichert; ein tatsächlich gedrucktes Etikett wird dadurch nicht bestätigt.",
                  "Print request saved. This does not confirm that a physical label was printed.",
                )}
              </p>
              <button
                type="button"
                onClick={print}
                className="btn-alert-solid inline-flex min-h-12 w-full items-center justify-center gap-2"
              >
                <Printer size={16} />
                {t("Jetzt drucken", "Print now")}
              </button>
            </>
          )}
        </div>
      </section>

      <section className="surface overflow-hidden" aria-label={t("Druckaufträge", "Print requests")}>
        <h2 className="flex items-center gap-2 border-b border-border p-4 text-lg font-bold">
          <History size={17} aria-hidden="true" />
          {t("Gespeicherte Druckaufträge", "Saved print requests")}
        </h2>
        {history.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            {t("Keine Einträge für diesen Standort.", "No saved requests for this premises.")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                <strong>{item.product_name}</strong>
                <span className="text-muted-foreground">{item.kind}</span>
                <span>{item.use_by ?? "—"}</span>
                <time className="ml-auto text-xs text-muted-foreground" dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString(
                    lang === "de" ? "de-DE" : "en-GB",
                    { timeZone },
                  )}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
