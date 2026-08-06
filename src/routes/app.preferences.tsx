import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Accessibility, Contrast, Hand, Loader2, Save, ScanLine, ZapOff } from "lucide-react";
import { toast } from "sonner";
import {
  applyExperiencePreferences,
  type ExperiencePreferences,
} from "@/components/ExperienceController";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/app/preferences")({ component: PreferencesPage });

const defaults: ExperiencePreferences = {
  glove_mode: false,
  reduced_motion: false,
  high_contrast: false,
  compact_mode: false,
};

function PreferencesPage() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const tr = useCallback((de: string, en: string) => (lang === "de" ? de : en), [lang]);
  const [value, setValue] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.organizationId) return;
    void (supabase as any)
      .from("user_experience_preferences")
      .select("glove_mode,reduced_motion,high_contrast,compact_mode")
      .eq("organization_id", user.organizationId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: { data: ExperiencePreferences | null }) => {
        setValue({ ...defaults, ...(data ?? {}) });
        setLoading(false);
      });
  }, [user?.id, user?.organizationId]);

  const save = async () => {
    if (!user?.organizationId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("user_experience_preferences").upsert(
      {
        user_id: user.id,
        organization_id: user.organizationId,
        locale: lang,
        ...value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,organization_id" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      applyExperiencePreferences(value);
      window.dispatchEvent(new Event("haccora-preferences"));
      toast.success(tr("Darstellung gespeichert.", "Display preferences saved."));
    }
  };

  const options = [
    [
      "compact_mode",
      ScanLine,
      "Compact workspace",
      "Smaller type and tighter cards for tablets and manager dashboards.",
    ],
    [
      "glove_mode",
      Hand,
      tr("Handschuhmodus", "Glove mode"),
      tr(
        "Größere Ziele und mehr Abstand für schnelle Küchenarbeit.",
        "Larger targets and spacing for fast kitchen work.",
      ),
    ],
    [
      "high_contrast",
      Contrast,
      tr("Hoher Kontrast", "High contrast"),
      tr("Stärkere Kanten und klarere Statusfarben.", "Stronger edges and clearer status colours."),
    ],
    [
      "reduced_motion",
      ZapOff,
      tr("Bewegung reduzieren", "Reduce motion"),
      tr("Animationen und Übergänge minimieren.", "Minimise animations and transitions."),
    ],
  ] as const;

  return (
    <div className="p-5 md:p-10 space-y-6 max-w-4xl">
      <div>
        <div className="eyebrow">{tr("Barrierefreiheit", "Accessibility")}</div>
        <h1 className="mt-1 text-3xl md:text-4xl">
          {tr("Arbeitsplatz-Darstellung", "Workspace display")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {tr(
            "Persönliche Einstellungen folgen dir auf jedem Gerät.",
            "Personal preferences follow you across devices.",
          )}
        </p>
      </div>
      <div className="surface overflow-hidden">
        <div className="border-b border-border p-5 flex items-center gap-3">
          <Accessibility size={20} />
          <div className="font-display text-xl">
            {tr("Bedienung anpassen", "Adapt the interface")}
          </div>
        </div>
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="inline animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {options.map(([key, Icon, title, body]) => (
              <label key={key} className="flex min-h-20 cursor-pointer items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                  <Icon size={19} />
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-muted-foreground">{body}</span>
                </span>
                <input
                  type="checkbox"
                  checked={value[key]}
                  onChange={(event) =>
                    setValue((current) => ({ ...current, [key]: event.target.checked }))
                  }
                  className="h-6 w-6 accent-primary"
                />
              </label>
            ))}
          </div>
        )}
      </div>
      <button
        disabled={saving || loading}
        onClick={() => void save()}
        className="min-h-12 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="inline animate-spin" size={16} />
        ) : (
          <>
            <Save className="mr-2 inline" size={16} />
            {tr("Speichern", "Save preferences")}
          </>
        )}
      </button>
    </div>
  );
}
