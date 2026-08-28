import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasDokuveraIntegrationAccess(
  service: SupabaseClient,
  organizationId: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const [{ data: organization }, { data: subscription }, { data: override }] =
    await Promise.all([
      service.from("organizations").select("service_status").eq(
        "id",
        organizationId,
      ).maybeSingle(),
      service
        .from("subscriptions")
        .select("plan,status")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      service
        .from("subscription_entitlements")
        .select("enabled")
        .eq("organization_id", organizationId)
        .eq("entitlement", "dokuvera_bridge")
        .lte("effective_from", now)
        .or(`effective_until.is.null,effective_until.gt.${now}`)
        .maybeSingle(),
    ]);
  if (organization?.service_status !== "active") return false;
  if (override) return override.enabled === true;
  if (!subscription || !["active", "trialing"].includes(subscription.status)) {
    return false;
  }
  const { data: plan } = await service
    .from("platform_plan_catalog")
    .select("enabled_modules")
    .eq("code", subscription.plan)
    .eq("active", true)
    .maybeSingle();
  return Array.isArray(plan?.enabled_modules) &&
    plan.enabled_modules.includes("integrations");
}
