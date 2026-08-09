// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { execFileSync } from "node:child_process";

const fullCommitSha = /^[0-9a-f]{40}$/i;

function resolveReleaseSha() {
  for (const candidate of [
    process.env.PUBLIC_RELEASE_SHA,
    process.env.HACCORA_RELEASE_SHA,
    process.env.GITHUB_SHA,
  ]) {
    const value = candidate?.trim() ?? "";
    if (fullCommitSha.test(value)) return value.toLowerCase();
  }

  try {
    const value = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (fullCommitSha.test(value)) return value.toLowerCase();
  } catch {
    // A source archive without Git metadata remains buildable, but the
    // production release gate will reject its unverified identity.
  }

  return "unverified";
}

export default defineConfig({
  vite: {
    define: {
      __HACCORA_RELEASE_SHA__: JSON.stringify(resolveReleaseSha()),
    },
    // Do not force framework packages into manual vendor groups. TanStack,
    // React and Supabase contain valid package-level cycles; breaking those
    // cycles across independently initialised browser chunks caused the live
    // Lovable build to crash before client navigation attached. Rolldown's
    // native route graph still code-splits the application safely.
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
