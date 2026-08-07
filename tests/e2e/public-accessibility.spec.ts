import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/login",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/legal/company-details",
  "/legal/data-processing",
  "/legal/accessibility",
  "/legal/complaints",
];

for (const route of publicRoutes) {
  test(`${route} responds and has no automated WCAG A/AA violations`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("body")).toContainText(/Haccora/i);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
    expect(browserErrors).toEqual([]);
  });
}

test("sign-in form is keyboard reachable and exposes named controls", async ({ page }) => {
  await page.goto("/login");
  const email = page.locator('input[type="email"]');
  const password = page.locator('input[type="password"]');

  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(email).toHaveAccessibleName(/e-?mail/i);
  await expect(password).toHaveAccessibleName(/passwort|password/i);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("health endpoint exposes only non-sensitive readiness metadata", async ({ request }) => {
  const response = await request.get("/health.json");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toMatchObject({
    status: "ok",
    service: "haccora-web",
    release: expect.stringMatching(/^(?:[0-9a-f]{40}|unverified)$/),
  });
});
