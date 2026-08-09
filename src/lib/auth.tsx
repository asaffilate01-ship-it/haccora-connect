import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured, SUPABASE_UNAVAILABLE_MESSAGE } from "@/integrations/supabase/config";

export type Role = "owner" | "manager" | "chef" | "staff" | "inspector";
export type PlatformRole = "platform_owner" | "platform_support" | "platform_auditor";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  roleName: string;
  actionPermissions: string[];
  platformRole: PlatformRole | null;
  location: string;
  organizationId: string | null;
  locationId: string | null;
  organizationName: string | null;
  inspectorScopes: string[];
  serviceStatus: "active" | "frozen" | "closed";
  serviceStatusReason: string | null;
  plan: string;
  seatLimit: number;
  locationLimit: number;
}

const NAV_KEYS = [
  "dashboard",
  "haccp",
  "checks",
  "temperature",
  "cleaning",
  "routines",
  "menu",
  "rota",
  "waste",
  "stock",
  "recipes",
  "suppliers",
  "purchasing",
  "assets",
  "recalls",
  "audits",
  "training",
  "labels",
  "incidents",
  "alerts",
  "expiry",
  "documents",
  "logs",
  "audit",
  "settings",
  "goodsin",
  "calibration",
  "health",
  "pest",
  "oil",
  "complaints",
  "chemicals",
  "security",
  "control",
  "workflows",
  "billing",
  "integrations",
  "preferences",
] as const;
export type NavKey = (typeof NAV_KEYS)[number];

export const ROLE_PERMISSIONS: Record<Role, NavKey[]> = {
  owner: [
    "dashboard",
    "haccp",
    "checks",
    "temperature",
    "cleaning",
    "routines",
    "menu",
    "rota",
    "waste",
    "stock",
    "recipes",
    "suppliers",
    "purchasing",
    "assets",
    "recalls",
    "audits",
    "training",
    "labels",
    "incidents",
    "alerts",
    "expiry",
    "documents",
    "logs",
    "audit",
    "settings",
    "goodsin",
    "calibration",
    "health",
    "pest",
    "oil",
    "complaints",
    "chemicals",
    "security",
    "control",
    "workflows",
    "billing",
    "integrations",
    "preferences",
  ],
  manager: [
    "dashboard",
    "haccp",
    "checks",
    "temperature",
    "cleaning",
    "routines",
    "menu",
    "rota",
    "waste",
    "stock",
    "recipes",
    "suppliers",
    "purchasing",
    "assets",
    "recalls",
    "audits",
    "training",
    "labels",
    "incidents",
    "alerts",
    "expiry",
    "documents",
    "logs",
    "audit",
    "settings",
    "goodsin",
    "calibration",
    "health",
    "pest",
    "oil",
    "complaints",
    "chemicals",
    "security",
    "control",
    "workflows",
    "integrations",
    "preferences",
  ],
  chef: [
    "dashboard",
    "haccp",
    "checks",
    "temperature",
    "cleaning",
    "routines",
    "menu",
    "waste",
    "stock",
    "recipes",
    "purchasing",
    "assets",
    "recalls",
    "training",
    "labels",
    "incidents",
    "alerts",
    "expiry",
    "documents",
    "settings",
    "goodsin",
    "calibration",
    "pest",
    "oil",
    "complaints",
    "chemicals",
    "security",
    "control",
    "workflows",
    "preferences",
  ],
  staff: [
    "dashboard",
    "checks",
    "temperature",
    "cleaning",
    "routines",
    "rota",
    "waste",
    "training",
    "labels",
    "incidents",
    "alerts",
    "expiry",
    "goodsin",
    "calibration",
    "assets",
    "pest",
    "oil",
    "security",
    "control",
    "preferences",
  ],
  inspector: [
    "haccp",
    "checks",
    "temperature",
    "cleaning",
    "routines",
    "menu",
    "recipes",
    "suppliers",
    "purchasing",
    "recalls",
    "training",
    "documents",
    "audit",
    "audits",
    "incidents",
    "expiry",
    "goodsin",
    "calibration",
    "assets",
    "pest",
    "security",
    "preferences",
  ],
};

const INSPECTOR_SCOPE_BY_NAV: Partial<Record<NavKey, string>> = {
  haccp: "haccp",
  checks: "cleaning",
  cleaning: "cleaning",
  routines: "cleaning",
  temperature: "temperature",
  calibration: "temperature",
  assets: "equipment",
  menu: "allergens",
  recipes: "allergens",
  training: "training",
  suppliers: "traceability",
  purchasing: "traceability",
  recalls: "traceability",
  goodsin: "traceability",
  expiry: "traceability",
  audits: "audits",
  pest: "pest",
  documents: "documents",
  incidents: "incidents",
};

export function canAccess(role: Role, key: NavKey, inspectorScopes: string[] = []) {
  if (!ROLE_PERMISSIONS[role].includes(key)) return false;
  if (role !== "inspector" || key === "audit" || key === "security" || key === "preferences")
    return true;
  const requiredScope = INSPECTOR_SCOPE_BY_NAV[key];
  return !!requiredScope && inspectorScopes.includes(requiredScope);
}
export function homeFor(role: Role, platformRole: PlatformRole | null = null): string {
  if (platformRole) return "/platform";
  return role === "inspector" ? "/app/inspection" : "/app";
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "GS"
  );
}

async function fetchAuthUser(userId: string, email: string): Promise<AuthUser | null> {
  const [{ data: profile }, { data: context }, { data: platformContext }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, location, restaurant_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase.rpc("get_my_context"),
    (supabase as any).rpc("get_my_platform_context"),
  ]);
  const workspace =
    context && typeof context === "object" && !Array.isArray(context)
      ? (context as Record<string, unknown>)
      : {};
  const name = profile?.full_name || email.split("@")[0];
  const platform =
    platformContext && typeof platformContext === "object" && !Array.isArray(platformContext)
      ? (platformContext as Record<string, unknown>)
      : {};
  const platformRole =
    typeof platform.role === "string" &&
    ["platform_owner", "platform_support", "platform_auditor"].includes(platform.role)
      ? (platform.role as PlatformRole)
      : null;
  const role = (workspace.role ?? "staff") as Role;
  const actionPermissions = Array.isArray(workspace.action_permissions)
    ? workspace.action_permissions.filter(
        (permission): permission is string => typeof permission === "string",
      )
    : [];
  const organizationName =
    typeof workspace.organization_name === "string" ? workspace.organization_name : null;
  const inspectorScopes = Array.isArray(workspace.evidence_scopes)
    ? workspace.evidence_scopes.filter((scope): scope is string => typeof scope === "string")
    : [];
  const location =
    (typeof workspace.location_name === "string" ? workspace.location_name : null) ||
    profile?.location ||
    organizationName ||
    profile?.restaurant_name ||
    "Haccora";
  return {
    id: userId,
    name,
    email,
    initials: initialsOf(name),
    role,
    roleName: typeof workspace.role_name === "string" ? workspace.role_name : role,
    actionPermissions,
    platformRole,
    location,
    organizationId:
      typeof workspace.organization_id === "string" ? workspace.organization_id : null,
    locationId: typeof workspace.location_id === "string" ? workspace.location_id : null,
    organizationName,
    inspectorScopes,
    serviceStatus:
      workspace.service_status === "frozen" || workspace.service_status === "closed"
        ? workspace.service_status
        : "active",
    serviceStatusReason:
      typeof workspace.service_status_reason === "string" ? workspace.service_status_reason : null,
    plan: typeof workspace.plan === "string" ? workspace.plan : "trial",
    seatLimit: typeof workspace.seat_limit === "number" ? workspace.seat_limit : 5,
    locationLimit: typeof workspace.location_limit === "number" ? workspace.location_limit : 1,
  };
}

type Ctx = {
  user: AuthUser | null;
  hydrated: boolean;
  authenticationAvailable: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (input: {
    email: string;
    password: string;
    name: string;
    restaurant?: string;
    language?: "en";
  }) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const authenticationAvailable = isSupabaseConfigured();

  const loadFromSession = useCallback(async () => {
    if (!authenticationAvailable) {
      setUser(null);
      return;
    }
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (!s?.user) {
      setUser(null);
      return;
    }
    const u = await fetchAuthUser(s.user.id, s.user.email ?? "");
    setUser(u);
  }, [authenticationAvailable]);

  useEffect(() => {
    // Public marketing and legal pages must remain available during a provider
    // configuration incident. Authenticated routes still fail closed below.
    if (!authenticationAvailable) {
      setUser(null);
      setHydrated(true);
      return;
    }
    // Listener first, then hydrate
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        return;
      }
      if (session.user) {
        // defer to avoid blocking the callback
        setTimeout(() => {
          fetchAuthUser(session.user.id, session.user.email ?? "").then(setUser);
        }, 0);
      }
    });
    loadFromSession().finally(() => setHydrated(true));
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [authenticationAvailable, loadFromSession]);

  const signInWithEmail = async (email: string, password: string) => {
    if (!authenticationAvailable) return { error: SUPABASE_UNAVAILABLE_MESSAGE };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signUpWithEmail: Ctx["signUpWithEmail"] = async ({
    email,
    password,
    name,
    restaurant,
    language,
  }) => {
    if (!authenticationAvailable) return { error: SUPABASE_UNAVAILABLE_MESSAGE };
    let redirectTo: string | undefined;
    if (typeof window !== "undefined") {
      const invite = new URLSearchParams(window.location.search).get("invite");
      const inspectorInvite = new URLSearchParams(window.location.search).get("inspectorInvite");
      if (invite) {
        redirectTo = `${window.location.origin}/login?invite=${encodeURIComponent(invite)}`;
      } else if (inspectorInvite) {
        redirectTo = `${window.location.origin}/login?inspectorInvite=${encodeURIComponent(inspectorInvite)}`;
      } else {
        redirectTo = `${window.location.origin}/onboarding`;
      }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: name, restaurant_name: restaurant ?? null, language: language ?? "en" },
      },
    });
    if (error) return { error: error.message };
    return { needsEmailConfirmation: !data.session };
  };

  const requestPasswordReset = async (email: string) => {
    if (!authenticationAvailable) return { error: SUPABASE_UNAVAILABLE_MESSAGE };
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/login?reset=1` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    if (!authenticationAvailable) {
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };
  const refresh = async () => {
    await loadFromSession();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        hydrated,
        authenticationAvailable,
        signInWithEmail,
        signUpWithEmail,
        requestPasswordReset,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ROLES: Role[] = ["owner", "manager", "chef", "staff", "inspector"];
