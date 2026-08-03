import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export type ExperiencePreferences = {
  glove_mode: boolean;
  reduced_motion: boolean;
  high_contrast: boolean;
};

const defaults: ExperiencePreferences = {
  glove_mode: false,
  reduced_motion: false,
  high_contrast: false,
};

export function applyExperiencePreferences(value: ExperiencePreferences) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("haccora-glove", value.glove_mode);
  document.documentElement.classList.toggle("haccora-reduced-motion", value.reduced_motion);
  document.documentElement.classList.toggle("haccora-high-contrast", value.high_contrast);
}

export function ExperienceController() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (!user?.organizationId) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("user_experience_preferences")
        .select("glove_mode,reduced_motion,high_contrast")
        .eq("organization_id", user.organizationId)
        .eq("user_id", user.id)
        .maybeSingle();
      applyExperiencePreferences({ ...defaults, ...(data ?? {}) });
    };
    void load();
    window.addEventListener("haccora-preferences", load);
    return () => window.removeEventListener("haccora-preferences", load);
  }, [user?.id, user?.organizationId]);

  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-9 z-40 flex min-h-10 items-center justify-center gap-2 bg-amber-300 px-4 text-xs font-bold text-amber-950"
    >
      <CloudOff size={15} />
      {lang === "de"
        ? "Offline: Keine Daten werden als gespeichert angezeigt, bis der Server bestätigt."
        : "Offline: nothing is shown as saved until the server confirms it."}
      <RefreshCw size={13} className="animate-pulse" />
    </div>
  );
}
