import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { supabase } from "./supabase";
import { flush, startOfflineSync } from "./offline-queue";
import { configureNotificationNavigation, syncPushNotifications } from "./push";

type SessionContextValue = {
  session: Session | null;
  workspaceReady: boolean;
  organizationId: string | null;
  locationId: string | null;
  role: string | null;
  platformRole: string | null;
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue>({
  session: null,
  workspaceReady: false,
  organizationId: null,
  locationId: null,
  role: null,
  platformRole: null,
  loading: true,
  refreshWorkspace: async () => undefined,
});
const WORKSPACE_CACHE_KEY = "haccora-workspace-context-v1";

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkspace = async (nextSession: Session | null) => {
    if (!nextSession) {
      setWorkspaceReady(false);
      setOrganizationId(null);
      setLocationId(null);
      setRole(null);
      setPlatformRole(null);
      await AsyncStorage.removeItem(WORKSPACE_CACHE_KEY);
      return;
    }
    const [workspaceResult, platformResult] = await Promise.all([
      supabase.rpc("get_my_context"),
      supabase.rpc("get_my_platform_context"),
    ]);
    const { data, error } = workspaceResult;
    if (error) {
      const cached = await AsyncStorage.getItem(WORKSPACE_CACHE_KEY);
      let context: {
        organizationId?: string;
        locationId?: string | null;
        role?: string | null;
        platformRole?: string | null;
      } = {};
      try {
        context = cached ? JSON.parse(cached) : {};
      } catch {
        await AsyncStorage.removeItem(WORKSPACE_CACHE_KEY);
      }
      setOrganizationId(context.organizationId ?? null);
      setLocationId(context.locationId ?? null);
      setRole(context.role ?? null);
      setPlatformRole(context.platformRole ?? null);
      setWorkspaceReady(typeof context.organizationId === "string");
      return;
    }
    const context = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const nextOrganizationId =
      typeof context.organization_id === "string" ? context.organization_id : null;
    const nextLocationId = typeof context.location_id === "string" ? context.location_id : null;
    const ready = nextOrganizationId !== null;
    const nextRole = typeof context.role === "string" ? context.role : null;
    const platformContext =
      !platformResult.error &&
      platformResult.data &&
      typeof platformResult.data === "object" &&
      !Array.isArray(platformResult.data)
        ? (platformResult.data as Record<string, unknown>)
        : {};
    const nextPlatformRole = typeof platformContext.role === "string" ? platformContext.role : null;
    setOrganizationId(nextOrganizationId);
    setLocationId(nextLocationId);
    setRole(nextRole);
    setPlatformRole(nextPlatformRole);
    setWorkspaceReady(ready);
    await AsyncStorage.setItem(
      WORKSPACE_CACHE_KEY,
      JSON.stringify({
        organizationId: nextOrganizationId,
        locationId: nextLocationId,
        role: nextRole,
        platformRole: nextPlatformRole,
      }),
    );
  };

  const refreshWorkspace = async () => loadWorkspace(session);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadWorkspace(data.session);
      setLoading(false);
      if (data.session) {
        void flush();
        void syncPushNotifications().catch(() => undefined);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadWorkspace(next).then(() => {
        if (next) {
          void flush();
          void syncPushNotifications().catch(() => undefined);
        }
      });
    });
    const stopOfflineSync = startOfflineSync();
    const stopNotificationNavigation = configureNotificationNavigation();
    return () => {
      data.subscription.unsubscribe();
      stopOfflineSync();
      stopNotificationNavigation();
    };
  }, []);
  return (
    <SessionContext.Provider
      value={{
        session,
        workspaceReady,
        organizationId,
        locationId,
        role,
        platformRole,
        loading,
        refreshWorkspace,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
