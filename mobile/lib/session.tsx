import { workspaceCacheKey, decodeWorkspaceCache } from "./workspace-cache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { supabase } from "./supabase";
import { flush, startOfflineSync } from "./offline-queue";
import { configureNotificationNavigation, syncPushNotifications } from "./push";

type SessionContextValue = {
  session: Session | null;
  workspaceReady: boolean;
  workspaceError: boolean;
  organizationId: string | null;
  organizationName: string | null;
  locationId: string | null;
  locationName: string | null;
  role: string | null;
  roleName: string | null;
  displayName: string | null;
  actionPermissions: string[];
  serviceStatus: "active" | "frozen" | "closed";
  platformRole: string | null;
  loading: boolean;
  refreshWorkspace: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue>({
  session: null,
  workspaceReady: false,
  workspaceError: false,
  organizationId: null,
  organizationName: null,
  locationId: null,
  locationName: null,
  role: null,
  roleName: null,
  displayName: null,
  actionPermissions: [],
  serviceStatus: "active",
  platformRole: null,
  loading: true,
  refreshWorkspace: async () => undefined,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceError, setWorkspaceError] = useState(false);
  const requestVersion = useRef(0);
  const activeUser = useRef<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [actionPermissions, setActionPermissions] = useState<string[]>([]);
  const [serviceStatus, setServiceStatus] = useState<"active" | "frozen" | "closed">("active");
  const [platformRole, setPlatformRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearWorkspace = () => {
    setWorkspaceReady(false);
    setOrganizationId(null);
    setOrganizationName(null);
    setLocationId(null);
    setLocationName(null);
    setRole(null);
    setRoleName(null);
    setDisplayName(null);
    setActionPermissions([]);
    setServiceStatus("active");
    setPlatformRole(null);
  };

  const loadWorkspace = async (nextSession: Session | null) => {
    const version = ++requestVersion.current;
    const userId = nextSession?.user.id ?? null;
    const previousUser = activeUser.current;
    activeUser.current = userId;
    setLoading(true);
    setWorkspaceError(false);
    if (previousUser !== userId) clearWorkspace();
    // Never read the legacy, unscoped cache. Remove it opportunistically.
    void AsyncStorage.removeItem("haccora-workspace-context-v1").catch(() => undefined);
    if (!nextSession || !userId) {
      clearWorkspace();
      if (previousUser)
        void AsyncStorage.removeItem(workspaceCacheKey(previousUser)).catch(() => undefined);
      setLoading(false);
      return;
    }
    try {
      const [workspaceResult, platformResult] = await Promise.all([
        Promise.resolve(supabase.rpc("get_my_context")).catch(() => ({ data: null, error: true })),
        Promise.resolve(supabase.rpc("get_my_platform_context")).catch(() => ({
          data: null,
          error: true,
        })),
      ]);
      const { data, error } = workspaceResult;
      if (version !== requestVersion.current) return;
      if (error) {
        const cached = await AsyncStorage.getItem(workspaceCacheKey(userId)).catch(() => null);
        if (version !== requestVersion.current) return;
        const decoded = decodeWorkspaceCache(cached, userId);
        const context: {
          organizationId?: string;
          organizationName?: string | null;
          locationId?: string | null;
          locationName?: string | null;
          role?: string | null;
          roleName?: string | null;
          displayName?: string | null;
          actionPermissions?: string[];
          serviceStatus?: "active" | "frozen" | "closed";
          platformRole?: string | null;
        } = decoded ?? {};
        setWorkspaceError(decoded === null);
        setOrganizationId(context.organizationId ?? null);
        setOrganizationName(context.organizationName ?? null);
        setLocationId(context.locationId ?? null);
        setLocationName(context.locationName ?? null);
        setRole(context.role ?? null);
        setRoleName(context.roleName ?? context.role ?? null);
        setDisplayName(context.displayName ?? nextSession.user.user_metadata?.full_name ?? null);
        setActionPermissions(
          Array.isArray(context.actionPermissions) ? context.actionPermissions : [],
        );
        setServiceStatus(context.serviceStatus ?? "active");
        setPlatformRole(null); // Platform privileges always require a live response.
        setWorkspaceReady(typeof context.organizationId === "string");
        return;
      }
      const context = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      const nextOrganizationId =
        typeof context.organization_id === "string" ? context.organization_id : null;
      const nextLocationId = typeof context.location_id === "string" ? context.location_id : null;
      const nextOrganizationName =
        typeof context.organization_name === "string" ? context.organization_name : null;
      const nextLocationName =
        typeof context.location_name === "string" ? context.location_name : null;
      const ready = nextOrganizationId !== null;
      if (!ready && platformResult.error) setWorkspaceError(true);
      const nextRole = typeof context.role === "string" ? context.role : null;
      const nextRoleName = typeof context.role_name === "string" ? context.role_name : nextRole;
      const nextDisplayName =
        typeof nextSession.user.user_metadata?.full_name === "string"
          ? nextSession.user.user_metadata.full_name
          : (nextSession.user.email?.split("@")[0] ?? null);
      const nextActionPermissions = Array.isArray(context.action_permissions)
        ? context.action_permissions.filter(
            (permission): permission is string => typeof permission === "string",
          )
        : [];
      const nextServiceStatus =
        context.service_status === "frozen" || context.service_status === "closed"
          ? context.service_status
          : "active";
      const platformContext =
        !platformResult.error &&
        platformResult.data &&
        typeof platformResult.data === "object" &&
        !Array.isArray(platformResult.data)
          ? (platformResult.data as Record<string, unknown>)
          : {};
      const nextPlatformRole =
        typeof platformContext.role === "string" ? platformContext.role : null;
      setOrganizationId(nextOrganizationId);
      setOrganizationName(nextOrganizationName);
      setLocationId(nextLocationId);
      setLocationName(nextLocationName);
      setRole(nextRole);
      setRoleName(nextRoleName);
      setDisplayName(nextDisplayName);
      setActionPermissions(nextActionPermissions);
      setServiceStatus(nextServiceStatus);
      setPlatformRole(nextPlatformRole);
      setWorkspaceReady(ready);
      await AsyncStorage.setItem(
        workspaceCacheKey(userId),
        JSON.stringify({
          userId,
          context: {
            organizationId: nextOrganizationId,
            organizationName: nextOrganizationName,
            locationId: nextLocationId,
            locationName: nextLocationName,
            role: nextRole,
            roleName: nextRoleName,
            displayName: nextDisplayName,
            actionPermissions: nextActionPermissions,
            serviceStatus: nextServiceStatus,
            platformRole: nextPlatformRole,
          },
        }),
      ).catch(() => undefined);
    } catch {
      if (version === requestVersion.current) {
        clearWorkspace();
        setWorkspaceError(true);
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const refreshWorkspace = async () => loadWorkspace(session);

  useEffect(() => {
    let active = true;
    let authChanged = false;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active || authChanged) return;
        setSession(data.session);
        await loadWorkspace(data.session);
        if (!active || authChanged) return;
        if (data.session) {
          void flush().catch(() => undefined);
          void syncPushNotifications().catch(() => undefined);
        }
      })
      .catch(() => {
        if (active && !authChanged) setLoading(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      authChanged = true;
      setSession(next);
      void loadWorkspace(next).then(() => {
        if (active && next && activeUser.current === next.user.id) {
          void flush().catch(() => undefined);
          void syncPushNotifications().catch(() => undefined);
        }
      });
    });
    const stopOfflineSync = startOfflineSync();
    const stopNotificationNavigation = configureNotificationNavigation();
    return () => {
      active = false;
      requestVersion.current++;
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
        workspaceError,
        organizationId,
        organizationName,
        locationId,
        locationName,
        role,
        roleName,
        displayName,
        actionPermissions,
        serviceStatus,
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
