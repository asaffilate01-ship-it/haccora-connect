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
  for (const candidate of [process.env.HACCORA_RELEASE_SHA, process.env.GITHUB_SHA]) {
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
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            maxSize: 400_000,
            minSize: 20_000,
            groups: [
              {
                name: "vendor-react",
                test: /node_modules[\\/](?:react|react-dom|scheduler)(?:[\\/]|$)/,
                priority: 50,
              },
              {
                name: "vendor-tanstack",
                test: /node_modules[\\/]@tanstack[\\/]/,
                priority: 40,
              },
              {
                name: "vendor-supabase",
                test: /node_modules[\\/]@supabase[\\/]/,
                priority: 30,
              },
              {
                name: "vendor-ui",
                test: /node_modules[\\/](?:@radix-ui|cmdk|embla-carousel-react|lucide-react|recharts|sonner|vaul)(?:[\\/]|$)/,
                priority: 20,
              },
              { name: "vendor", test: /node_modules[\\/]/, priority: 10 },
            ],
          },
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
