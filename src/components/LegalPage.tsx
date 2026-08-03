import { useI18n } from "@/lib/i18n";
import { legalContent, type LegalKey } from "@/lib/legal-content";
import { legalPublishReady } from "@/lib/public-config";

export function LegalPage({ k }: { k: LegalKey }) {
  const { lang, t } = useI18n();
  const doc = legalContent(lang)[k];
  return (
    <article>
      <div className="text-xs font-black uppercase tracking-widest text-[color:var(--color-alert-red)]">
        {t("legal.title")}
      </div>
      <h1 className="mt-3 display-black text-4xl md:text-5xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-black/70">
        {t("legal.updated")}: {doc.updated}
      </p>
      {!legalPublishReady && (
        <div className="mt-5 rounded-lg bg-destructive/10 p-4 text-sm font-semibold text-destructive">
          {lang === "de"
            ? "Entwurf – nicht veröffentlichen. Rechtsträgerdaten und qualifizierte rechtliche Freigabe fehlen."
            : "Draft — do not publish. Legal identity details and qualified legal approval are missing."}
        </div>
      )}
      <div className="mt-8">{doc.body}</div>
    </article>
  );
}
