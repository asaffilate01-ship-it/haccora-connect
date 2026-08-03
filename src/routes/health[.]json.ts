import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { RELEASE_SHA } from "@/lib/release";

export const Route = createFileRoute("/health.json")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { status: "ok", service: "haccora-web", release: RELEASE_SHA },
          {
            headers: {
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        ),
    },
  },
});
