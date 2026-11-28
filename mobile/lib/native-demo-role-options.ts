import { demoRoleOptions } from "./demo-role-selection";

export function getNativeDemoRoleOptions() {
  return demoRoleOptions({
    enabled: process.env.EXPO_PUBLIC_DEMO_ROLE_SELECTION,
    actualAppOrigin: process.env.EXPO_PUBLIC_WEB_APP_URL,
    allowedAppOrigin: process.env.EXPO_PUBLIC_DEMO_APP_ORIGIN,
    actualSupabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    allowedSupabaseUrl: process.env.EXPO_PUBLIC_DEMO_SUPABASE_URL,
    productionProjectRef: process.env.EXPO_PUBLIC_DEMO_PRODUCTION_PROJECT_REF,
    emailDomain: process.env.EXPO_PUBLIC_DEMO_EMAIL_DOMAIN,
    ownerEmail: process.env.EXPO_PUBLIC_DEMO_OWNER_EMAIL,
    native: true,
  });
}
