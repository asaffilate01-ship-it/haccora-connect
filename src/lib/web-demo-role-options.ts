import { getPublicSupabaseConfig } from "@/integrations/supabase/config";
import { demoRoleOptions } from "@/lib/demo-role-selection";

export function getWebDemoRoleOptions() {
  if (typeof window === "undefined") return [];
  return demoRoleOptions({
    enabled: import.meta.env.VITE_DEMO_ROLE_SELECTION,
    actualAppOrigin: window.location.origin,
    allowedAppOrigin: import.meta.env.VITE_DEMO_APP_ORIGIN,
    actualSupabaseUrl: getPublicSupabaseConfig().url,
    allowedSupabaseUrl: import.meta.env.VITE_DEMO_SUPABASE_URL,
    productionProjectRef: import.meta.env.VITE_DEMO_PRODUCTION_PROJECT_REF,
    emailDomain: import.meta.env.VITE_DEMO_EMAIL_DOMAIN,
    ownerEmail: import.meta.env.VITE_DEMO_OWNER_EMAIL,
  });
}
