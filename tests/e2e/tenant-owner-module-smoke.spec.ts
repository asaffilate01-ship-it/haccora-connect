import { expect, test } from "@playwright/test";

const enabled = process.env.HACCORA_MODULE_E2E === "true";
const email = process.env.ROLE_ACCEPTANCE_OWNER_EMAIL ?? "";
const password =
  process.env.ROLE_ACCEPTANCE_OWNER_PASSWORD || process.env.ROLE_ACCEPTANCE_PASSWORD || "";

// Read-only route acceptance, using the same protected demo tenant on all three viewport sizes.
const routeGroups = [
  [
    "/app",
    "/app/today",
    "/app/quick-log",
    "/app/coach",
    "/app/ai-assistant",
    "/app/get-started",
    "/app/add-ons",
    "/app/readiness",
  ],
  [
    "/app/control-centre",
    "/app/routines",
    "/app/workflows",
    "/app/rota",
    "/app/uk-compliance",
    "/app/safe-methods",
    "/app/diary",
    "/app/haccp",
  ],
  [
    "/app/haccp-flows",
    "/app/checks",
    "/app/temperature",
    "/app/calibration",
    "/app/cleaning",
    "/app/pest",
    "/app/menu",
    "/app/recipes",
  ],
  [
    "/app/oil",
    "/app/suppliers",
    "/app/purchasing",
    "/app/goodsin",
    "/app/stock",
    "/app/waste",
    "/app/recalls",
    "/app/traceability",
  ],
  [
    "/app/chemicals",
    "/app/organisation",
    "/app/training",
    "/app/inductions",
    "/app/health",
    "/app/ppds",
    "/app/labels",
    "/app/assets",
  ],
  [
    "/app/incidents",
    "/app/complaints",
    "/app/alerts",
    "/app/expiry",
    "/app/documents",
    "/app/logs",
    "/app/audits",
    "/app/inspection",
  ],
  ["/app/security", "/app/support", "/app/preferences", "/app/integrations", "/app/billing"],
];

test.describe("hosted tenant owner module navigation", () => {
  test.skip(!enabled, "Requires a protected hosted demo tenant and explicit opt-in.");

  test.beforeAll(() => {
    if (process.env.HACCORA_ENV !== "staging" || !process.env.PLAYWRIGHT_BASE_URL) {
      throw new Error("Module tour requires the protected staging application.");
    }
    if (!email || password.length < 12) {
      throw new Error("Private demo owner credentials are missing.");
    }
  });

  for (const [index, routes] of routeGroups.entries()) {
    test(`tenant owner opens module group ${index + 1}`, async ({ page }) => {
      test.setTimeout(180_000);
      const runtimeErrors: string[] = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));

      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in to Haccora" }).click();
      const account = page.getByRole("button", { name: /Account menu for .*Riverside Kitchen/i });
      await expect(account).toBeVisible({ timeout: 30_000 });

      for (const route of routes) {
        await test.step(route, async () => {
          const response = await page.goto(route, { waitUntil: "domcontentloaded" });
          expect(response?.status()).toBeLessThan(400);
          await expect(page).toHaveURL(new RegExp(`${route}/?$`), { timeout: 20_000 });
          await expect(account).toBeVisible();
          const main = page.locator("#main-content");
          await expect(main).toBeVisible();
          await expect(main).not.toBeEmpty();
          const layout = await page.locator("html").evaluate((element) => ({
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          }));
          expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
          expect(runtimeErrors).toEqual([]);
        });
      }
    });
  }
});
