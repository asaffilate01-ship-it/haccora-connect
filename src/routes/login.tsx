import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useState, type InputHTMLAttributes } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth, ROLES, homeFor, type Role } from "@/lib/auth";
import { Crown, ClipboardList, ChefHat, User, Gavel, ArrowLeft, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { supabase } from "@/integrations/supabase/haccora-client";
import { SUPABASE_UNAVAILABLE_MESSAGE } from "@/integrations/supabase/config";

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
  const {
    user,
    hydrated,
    authenticationAvailable,
    signInWithEmail,
    signUpWithEmail,
    requestPasswordReset,
    refresh,
  } = useAuth();
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
                "Inspection access is invalid, expired, or belongs to another email. Use a separate inspector account.",
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
              setError("The invitation is invalid, expired, or belongs to another email address.");
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
        to: user.platformRole
          ? "/platform"
          : user.organizationId
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
          setError("Password must be at least 12 characters.");
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
          setInfo("Confirmation link sent. Please check your inbox.");
        } else {
          setInfo("Account created. Set up your business next.");
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
          <BrandLogo light imgClassName="h-10 md:h-12 w-auto" />

          <div className="flex items-center gap-3">
            <Link
              to="/home"
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
          <h1 className="mt-3 font-display text-3xl md:text-4xl leading-[1.08] tracking-tight">
            {mode === "signin" ? "Welcome back." : "Create your account."}
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground">
            Role-based dashboards for owners, managers, chefs, staff and authorised reviewers.
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
          {!authenticationAvailable && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950"
            >
              {SUPABASE_UNAVAILABLE_MESSAGE} Please try again later or email{" "}
              <a className="font-semibold underline" href="mailto:hello@haccora.co.uk">
                hello@haccora.co.uk
              </a>
              .
            </div>
          )}
          <div className="flex gap-1 p-1 bg-secondary/50 rounded-full text-sm font-semibold">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 rounded-full transition ${mode === "signin" ? "bg-white shadow" : "text-muted-foreground"}`}
            >
              {"Existing account"}
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 rounded-full transition ${mode === "signup" ? "bg-white shadow" : "text-muted-foreground"}`}
            >
              {"New account"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {mode === "signup" && (
              <>
                <Field
                  label={"Name"}
                  value={name}
                  onChange={setName}
                  placeholder={"Full name"}
                  autoComplete="name"
                />
                <Field
                  label={"Restaurant"}
                  value={restaurant}
                  onChange={setRestaurant}
                  placeholder="e.g. Riverside Kitchen"
                  autoComplete="organization"
                />
                <p className="rounded-lg border border-black/10 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                  {
                    "New accounts create a protected business workspace. Team and inspector roles are assigned later by invitation."
                  }
                </p>
              </>
            )}
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="you@restaurant.co.uk"
              autoComplete="email"
            />
            <Field
              label={"Password"}
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
            type="submit"
            disabled={busy || !authenticationAvailable}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-alert-red)] text-white px-5 py-3 font-bold hover:brightness-110 transition disabled:opacity-60"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === "signin" ? "Sign in to Haccora" : "Create account"}
          </button>
          {mode === "signin" && (
            <button
              type="button"
              disabled={busy || !email || !authenticationAvailable}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setInfo(null);
                const result = await requestPasswordReset(email);
                setBusy(false);
                if (result.error) setError(result.error);
                else setInfo("Password reset link sent.");
              }}
              className="mt-3 w-full text-xs font-semibold underline underline-offset-2 text-foreground/70 hover:text-foreground disabled:opacity-40"
            >
              {"Forgot your password?"}
            </button>
          )}
          <p className="mt-3 text-xs text-muted-foreground text-center">
            {"By continuing you agree to the "}
            <Link to="/legal/terms" className="underline hover:text-foreground">
              {"Terms"}
            </Link>
            {" and "}
            <Link to="/legal/privacy" className="underline hover:text-foreground">
              Privacy Policy
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
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: InputHTMLAttributes<HTMLInputElement>["autoComplete"];
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
        autoComplete={autoComplete}
        name={autoComplete || undefined}
        className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--color-alert-red)] focus:ring-2 focus:ring-[color:var(--color-alert-red)]/20"
      />
    </div>
  );
}
