import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, ShieldCheck, Sliders, BarChart3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_CONSENT,
  applyConsent,
  readConsent,
  writeConsent,
  type ConsentCategories,
} from "@/lib/cookie-consent";

export function CookieBanner() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [choice, setChoice] = useState<ConsentCategories>(DEFAULT_CONSENT);

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      applyConsent(existing);
      setChoice({
        necessary: true,
        preferences: existing.preferences,
        statistics: existing.statistics,
      });
    } else {
      setOpen(true);
    }
    const reopen = () => {
      const current = readConsent();
      if (current)
        setChoice({
          necessary: true,
          preferences: current.preferences,
          statistics: current.statistics,
        });
      setShowDetails(true);
      setOpen(true);
    };
    window.addEventListener("haccora-cookie-settings-open", reopen);
    return () => window.removeEventListener("haccora-cookie-settings-open", reopen);
  }, []);

  const save = (categories: ConsentCategories) => {
    writeConsent(categories);
    setChoice(categories);
    setOpen(false);
    setShowDetails(false);
  };

  if (!open) return null;

  const rows = [
    {
      key: "necessary" as const,
      icon: ShieldCheck,
      title: t("cookie.cat.necessary"),
      body: t("cookie.cat.necessary.desc"),
      locked: true,
    },
    {
      key: "preferences" as const,
      icon: Sliders,
      title: t("cookie.cat.prefs"),
      body: t("cookie.cat.prefs.desc"),
      locked: false,
    },
    {
      key: "statistics" as const,
      icon: BarChart3,
      title: t("cookie.cat.stats"),
      body: t("cookie.cat.stats.desc"),
      locked: false,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t("cookie.title")}
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-3.5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.58)] backdrop-blur-xl sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-alert-red)]/10 text-[color:var(--color-alert-red)]">
                <Cookie size={18} />
              </span>
              <h2 className="font-display text-base sm:text-lg">{t("cookie.title")}</h2>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t("cookie.body")}{" "}
              <Link to="/legal/cookies" className="underline">
                {t("footer.cookies")}
              </Link>
              {" · "}
              <Link to="/legal/privacy" className="underline">
                {t("footer.privacy")}
              </Link>
              {" · "}
              <Link to="/legal/terms" className="underline">
                {t("footer.terms")}
              </Link>
            </p>

            {showDetails && (
              <div className="mt-3 grid max-h-[42vh] gap-2 overflow-y-auto pr-1">
                {rows.map(({ key, icon: Icon, title, body, locked }) => (
                  <label
                    key={key}
                    className={`flex items-start gap-3 rounded-xl border border-border p-3 text-sm ${
                      locked ? "opacity-70" : "cursor-pointer hover:bg-muted/50"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary">
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-bold">{title}</span>
                      <span className="block text-muted-foreground">{body}</span>
                    </span>
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 accent-[color:var(--color-alert-red)]"
                      checked={locked ? true : choice[key]}
                      disabled={locked}
                      onChange={(event) =>
                        setChoice((current) => ({ ...current, [key]: event.target.checked }))
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 md:max-w-48 md:justify-end">
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
            >
              {t("cookie.details")}
            </button>
            <button
              onClick={() => save({ necessary: true, preferences: false, statistics: false })}
              className="rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
            >
              {t("cookie.reject")}
            </button>
            {showDetails && (
              <button
                onClick={() => save(choice)}
                className="rounded-full border border-border px-3 py-2 text-xs font-bold hover:bg-muted"
              >
                {t("cookie.save")}
              </button>
            )}
            <button
              onClick={() => save({ necessary: true, preferences: true, statistics: true })}
              className="rounded-full bg-[color:var(--color-alert-red)] px-4 py-2 text-xs font-black text-white hover:brightness-110"
            >
              {t("cookie.accept")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
