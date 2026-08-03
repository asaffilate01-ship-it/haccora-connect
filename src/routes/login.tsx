import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth, ROLES, homeFor, type Role } from "@/lib/auth";
import { Crown, ClipboardList, ChefHat, User, Gavel, ArrowLeft, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Haccora" },
      {
        name: "description",
        content:
          "Sign in or create your Haccora account. Role-based dashboards for owners, managers, chefs, staff, and inspectors.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const ROLE_ICON: Record<Role, typeof Crown> = {
  owner: Crown,
  manager: ClipboardList,
  chef: ChefHat,
  staff: User,
  inspector: Gavel,
};

function LoginPage() {
  const { t, lang } = useI18n();
  const { user, hydrated, signInWithEmail, signUpWithEmail, requestPasswordReset, refresh } =
    useAuth();
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as {
    redirect?: string;
    invite?: string;
    inspectorInvite?: string;
  };

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [acceptingInvite, setAcceptingInvite] = useState(false);
  const [inviteAttempted, setInviteAttempted] = useState(false);

  useEffect(() => {
    if (hydrated && user) {
      if (search?.inspectorInvite && !user.organizationId && !acceptingInvite && !inviteAttempted) {
        setAcceptingInvite(true);
        setInviteAttempted(true);
        supabase
          .rpc("accept_inspector_invitation", { p_token: search.inspectorInvite })
          .then(async ({ error: inviteError }) => {
            if (inviteError) {
              setError(
                lang === "de"
                  ? "Prüfzugang ist ungültig, abgelaufen oder für eine andere E-Mail-Adresse. Verwenden Sie ein separates Prüferkonto."
                  : "Inspection access is invalid, expired, or belongs to another email. Use a separate inspector account.",
              );
              setAcceptingInvite(false);
              return;
            }
            await refresh();
            navigate({ to: "/app/inspection" });
          });
        return;
      }
      if (search?.invite && !user.organizationId && !acceptingInvite && !inviteAttempted) {
        setAcceptingInvite(true);
        setInviteAttempted(true);
        supabase
          .rpc("accept_organization_invitation", { p_token: search.invite })
          .then(async ({ error: inviteError }) => {
            if (inviteError) {
              setError(
                lang === "de"
                  ? "Einladung ist ungültig, abgelaufen oder für eine andere E-Mail-Adresse."
                  : "The invitation is invalid, expired, or belongs to another email address.",
              );
              setAcceptingInvite(false);
              return;
            }
            await refresh();
            navigate({ to: "/app" });
          });
        return;
      }
      if ((search?.invite || search?.inspectorInvite) && !user.organizationId) return;
      navigate({
        to: user.organizationId
          ? (search?.redirect as string) || homeFor(user.role)
          : "/onboarding",
      });
    }
  }, [acceptingInvite, hydrated, inviteAttempted, lang, navigate, refresh, search, user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) setError(error);
      } else {
        if (password.length < 12) {
          setError(
            lang === "de"
              ? "Passwort mindestens 12 Zeichen."
              : "Password must be at least 12 characters.",
          );
          return;
        }
        const { error, needsEmailConfirmation } = await signUpWithEmail({
          email,
          password,
          name: name || email.split("@")[0],
          restaurant,
          language: lang,
        });
        if (error) setError(error);
        else if (needsEmailConfirmation) {
          setInfo(
            lang === "de"
              ? "Bestätigungslink gesendet. Bitte prüfen Sie Ihr Postfach."
              : "Confirmation link sent. Please check your inbox.",
          );
        } else {
          setInfo(
            lang === "de"
              ? "Konto erstellt. Richten Sie jetzt Ihren Betrieb ein."
              : "Account created. Set up your business next.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-foreground">
      <div className="bg-black text-white">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-4">
          <BrandLogo imgClassName="h-10 md:h-12 w-auto" />

          <div className="flex items-center gap-3">
            <LanguageToggle variant="dark" />
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
            >
              <ArrowLeft size={14} /> {t("auth.back")}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-12 md:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[color:var(--color-alert-red)]">
            Haccora
          </div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {t("brand.slogan")}
          </div>
          <h1 className="mt-3 font-display text-4xl md:text-5xl leading-[1.05] tracking-tight">
            {mode === "signin"
              ? lang === "de"
                ? "Willkommen zurück."
                : "Welcome back."
              : lang === "de"
                ? "Konto erstellen."
                : "Create your account."}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            {lang === "de"
              ? "Rollenbasierte Dashboards für Inhaber, Manager, Küchenchef, Personal und Lebensmittelaufsicht."
              : "Role-based dashboards for owners, managers, chefs, staff, and food safety inspectors."}
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLES.map((r) => {
              const Icon = ROLE_ICON[r];
              return (
                <div
                  key={r}
                  className="rounded-xl border border-black/10 p-3 flex items-center gap-2 bg-white"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--color-alert-red)]/10 text-[color:var(--color-alert-red)]">
                    <Icon size={14} />
                  </span>
                  <span className="text-sm font-semibold">{t(`role.${r}`)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-black/10 bg-white p-6 md:p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.2)] self-start"
        >
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-full text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-full transition ${mode === "signin" ? "bg-white shadow" : "text-muted-foreground"}`}
            >
              {lang === "de" ? "Anmelden" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-full transition ${mode === "signup" ? "bg-white shadow" : "text-muted-foreground"}`}
            >
              {lang === "de" ? "Registrieren" : "Sign up"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {mode === "signup" && (
              <>
                <Field
                  label={lang === "de" ? "Name" : "Name"}
                  value={name}
                  onChange={setName}
                  placeholder={lang === "de" ? "Vollständiger Name" : "Full name"}
                />
                <Field
                  label={lang === "de" ? "Betrieb" : "Restaurant"}
                  value={restaurant}
                  onChange={setRestaurant}
                  placeholder={lang === "de" ? "z. B. Kreuzberg Kitchen" : "e.g. Kreuzberg Kitchen"}
                />
                <p className="rounded-lg border border-black/10 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  {lang === "de"
                    ? "Neue Konten erstellen einen geschützten Betriebsbereich. Team- und Prüferrollen werden anschließend per Einladung vergeben."
                    : "New accounts create a protected business workspace. Team and inspector roles are assigned later by invitation."}
                </p>
              </>
            )}
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="you@restaurant.de"
            />
            <Field
              label={lang === "de" ? "Passwort" : "Password"}
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mt-4 text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 text-sm rounded-lg bg-success/10 text-success px-3 py-2">
              {info}
            </div>
          )}

          <button
            disabled={busy}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-alert-red)] text-white px-5 py-3 font-bold hover:brightness-110 transition disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "signin"
              ? lang === "de"
                ? "Anmelden"
                : "Sign in"
              : lang === "de"
                ? "Konto erstellen"
                : "Create account"}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              disabled={busy || !email}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setInfo(null);
                const result = await requestPasswordReset(email);
                setBusy(false);
                if (result.error) setError(result.error);
                else
                  setInfo(
                    lang === "de" ? "Link zum Zurücksetzen gesendet." : "Password reset link sent.",
                  );
              }}
              className="mt-3 w-full text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              {lang === "de" ? "Passwort vergessen?" : "Forgot your password?"}
            </button>
          )}
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {lang === "de"
              ? "Mit der Anmeldung akzeptieren Sie "
              : "By continuing you agree to the "}
            <Link to="/legal/terms" className="underline hover:text-foreground">
              {lang === "de" ? "AGB" : "Terms"}
            </Link>
            {lang === "de" ? " und " : " and "}
            <Link to="/legal/privacy" className="underline hover:text-foreground">
              {lang === "de" ? "Datenschutzerklärung" : "Privacy Policy"}
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const inputId = useId();

  return (
    <div>
      <label
        htmlFor={inputId}
        className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--color-alert-red)] focus:ring-2 focus:ring-[color:var(--color-alert-red)]/20"
      />
    </div>
  );
}
