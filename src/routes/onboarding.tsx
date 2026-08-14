import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/haccora-client";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Utensils,
  Coffee,
  Building2,
  Store,
  Hotel,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Haccora — Onboarding" },
      { name: "description", content: "Set up your restaurant on Haccora in 5 steps." },
    ],
  }),
  component: OnboardingPage,
});

const VERTICALS = [
  { id: "restaurant", icon: Utensils, label: "Restaurant" },
  { id: "cafe", icon: Coffee, label: "Café / bakery" },
  { id: "hotel", icon: Hotel, label: "Hotel catering" },
  { id: "canteen", icon: Building2, label: "Canteen / catering" },
  { id: "takeaway", icon: Store, label: "Take-away / kiosk" },
];

const MODULES = [
  "haccp",
  "temperature",
  "cleaning",
  "menu",
  "purchasing",
  "rota",
  "training",
  "audits",
] as const;

function OnboardingPage() {
  const t = (_legacy: string, english: string) => english;
  const navigate = useNavigate();
  const { user: authUser, hydrated, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [vertical, setVertical] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [vatId, setVatId] = useState("");
  const [businessState, setBusinessState] = useState("England");
  const [size, setSize] = useState("11-30");
  const [locations, setLocations] = useState(1);
  const [modules, setModules] = useState<string[]>([...MODULES]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !authUser)
      navigate({ to: "/login", search: { redirect: "/onboarding" } as never });
    if (hydrated && authUser?.platformRole) navigate({ to: "/platform", replace: true });
    if (hydrated && authUser?.organizationId) navigate({ to: "/app", replace: true });
  }, [authUser, hydrated, navigate]);

  const steps = ["Business type", "Business", "Team & locations", "Modules", "Done"];
  const last = step === steps.length - 1;

  const persistAndFinish = async () => {
    if (!name.trim()) {
      setError("Please enter a company name.");
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error: bootstrapError } = await supabase.rpc("bootstrap_my_organization", {
        p_name: name.trim(),
        p_location_name: name.trim(),
        p_business_state: businessState,
        p_modules: modules,
      });
      if (bootstrapError) {
        setError(bootstrapError.message);
        setSaving(false);
        return;
      }
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          restaurant_name: name || null,
          vertical,
          vat_id: vatId || null,
          business_state: businessState,
          team_size: size,
          location_count: locations,
          onboarded_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profileError) {
        setError(profileError.message);
        setSaving(false);
        return;
      }
      await refresh();
    }
    setSaving(false);
    navigate({ to: user ? "/app" : "/login" });
  };

  return (
    <div className="min-h-screen bg-secondary/40 flex flex-col">
      <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-card">
        <BrandLogo imgClassName="h-9 sm:h-10 w-auto" />
      </header>

      <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-10">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0 ${
                  i < step
                    ? "bg-success text-white"
                    : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < step ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${i < step ? "bg-success" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {"Step"} {step + 1} / {steps.length}
        </div>
        <h1 className="text-3xl md:text-4xl mt-1">{steps[step]}</h1>

        <div className="mt-8 surface p-6 md:p-8">
          {step === 0 && (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {VERTICALS.map((v) => {
                const Icon = v.icon;
                const on = vertical === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setVertical(v.id)}
                    className={`p-5 rounded-xl border text-left transition ${on ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"}`}
                  >
                    <Icon size={22} className={on ? "text-primary" : "text-muted-foreground"} />
                    <div className="font-medium mt-3">{v.label}</div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 max-w-md">
              <label className="block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                  {"Company name"}
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The Riverside Kitchen Ltd"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                  {"VAT ID (optional)"}
                </div>
                <input
                  value={vatId}
                  onChange={(e) => setVatId(e.target.value)}
                  placeholder="GB 123 4567 89"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                  UK nation
                </div>
                <select
                  value={businessState}
                  onChange={(e) => setBusinessState(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <option>England</option>
                  <option>Wales</option>
                  <option>Scotland</option>
                  <option>Northern Ireland</option>
                </select>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="grid md:grid-cols-2 gap-6">
              <label className="block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                  {"Team size"}
                </div>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <option value="1-10">1–10</option>
                  <option value="11-30">11–30</option>
                  <option value="31-100">31–100</option>
                  <option value="100+">100+</option>
                </select>
              </label>
              <label className="block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5">
                  {"Locations"}
                </div>
                <input
                  type="number"
                  min={1}
                  value={locations}
                  onChange={(e) => setLocations(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {MODULES.map((moduleKey) => (
                <label
                  key={moduleKey}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/40"
                >
                  <input
                    type="checkbox"
                    checked={modules.includes(moduleKey)}
                    onChange={(event) =>
                      setModules((current) =>
                        event.target.checked
                          ? [...current, moduleKey]
                          : current.filter((key) => key !== moduleKey),
                      )
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">
                    {
                      {
                        haccp: "HACCP",
                        temperature: "Temperature",
                        cleaning: "Cleaning",
                        menu: "Menu & Allergens",
                        purchasing: "Purchasing",
                        rota: "Rota & clock-in",
                        training: "Training / LMS",
                        audits: "Audits",
                      }[moduleKey]
                    }
                  </span>
                </label>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-10">
              <div className="mx-auto h-16 w-16 rounded-full bg-success/15 text-success grid place-items-center">
                <CheckCircle2 size={30} />
              </div>
              <h2 className="font-display text-2xl mt-4">{"You're all set!"}</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {`${name || "Your business"} will be created as a protected workspace. You start as owner and can invite your team securely.`}
              </p>
              <button
                onClick={persistAndFinish}
                disabled={saving}
                className="btn-alert-solid mt-6 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="inline animate-spin mr-1" />
                    {"Saving…"}
                  </>
                ) : (
                  "Continue to app"
                )}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {!last && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              {"Back"}
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 0 && !vertical) ||
                (step === 1 && !name.trim()) ||
                (step === 3 && modules.length === 0)
              }
              className="btn-alert-solid text-sm disabled:opacity-50"
            >
              {"Continue"}
              <ChevronRight size={14} className="inline ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
