import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const localBaseURL = `http://127.0.0.1:${port}`;
const requestedHostedUrl = (process.env.PLAYWRIGHT_BASE_URL ?? "").trim();

function hostedBaseURL() {
  if (!requestedHostedUrl) return null;
  const url = new URL(requestedHostedUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error(
      "PLAYWRIGHT_BASE_URL must be a clean HTTPS origin without credentials, query or fragment",
    );
  }
  return url.href.replace(/\/$/, "");
}

const hostedURL = hostedBaseURL();
const baseURL = hostedURL ?? localBaseURL;
const evidenceFile = (process.env.PLAYWRIGHT_JSON_OUTPUT_FILE ?? "").trim();
const reporter = evidenceFile
  ? ([["line"], ["json", { outputFile: evidenceFile }]] as const)
  : process.env.CI
    ? ([["line"], ["html", { open: "never" }]] as const)
    : "list";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: hostedURL
    ? undefined
    : {
        command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://example.supabase.co",
          VITE_SUPABASE_PUBLISHABLE_KEY:
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ci_placeholder",
          SUPABASE_URL: process.env.SUPABASE_URL ?? "https://example.supabase.co",
          SUPABASE_PUBLISHABLE_KEY:
            process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ci_placeholder",
          PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? baseURL,
        },
      },
});
