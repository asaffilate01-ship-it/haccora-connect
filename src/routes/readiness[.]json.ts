import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { getPublicSupabaseConfig } from "@/integrations/supabase/config";
import { PUBLIC_LAUNCH_READINESS } from "@/lib/public-config";
import { RELEASE_SHA } from "@/lib/release";

export const Route = createFileRoute("/readiness.json")({
  server: {
    handlers: {
      GET: async () => {
        const checks = {
          authentication: getPublicSupabaseConfig().configured,
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
