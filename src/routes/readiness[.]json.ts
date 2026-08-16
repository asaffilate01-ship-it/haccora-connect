import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getBrowserSupabaseConfig } from "@/integrations/supabase/config";
import { PUBLIC_LAUNCH_READINESS } from "@/lib/public-config";
import { RELEASE_SHA } from "@/lib/release";

function hasValidHttpsOrigin(value: string | undefined) {
  try {
    const url = new URL((value ?? "").trim());
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.pathname === "/" || url.pathname === "")
    );
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/readiness.json")({
  server: {
    handlers: {
      GET: async () => {
        const checks = {
          // This must describe the browser bundle, not server-only aliases.
          authentication: getBrowserSupabaseConfig().configured,
          marketingOrigin: hasValidHttpsOrigin(process.env.PUBLIC_MARKETING_URL),
          applicationOrigin: hasValidHttpsOrigin(process.env.PUBLIC_APP_URL),
          legalIdentity: PUBLIC_LAUNCH_READINESS.legalIdentityComplete,
          legalApproval: PUBLIC_LAUNCH_READINESS.legalPublishReady,
          support: PUBLIC_LAUNCH_READINESS.supportConfigured,
          statusPage: PUBLIC_LAUNCH_READINESS.statusConfigured,
          browserPush: PUBLIC_LAUNCH_READINESS.browserPushConfigured,
        };
        const publicWebReady = Object.values(checks).every(Boolean);

        return Response.json(
          {
            status: publicWebReady ? "ready" : "action_required",
            service: "haccora-web",
            release: RELEASE_SHA,
            publicWebReady,
            checks,
          },
          {
            headers: {
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      },
    },
  },
});
