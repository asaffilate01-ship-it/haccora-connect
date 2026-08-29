import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/home",
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
  await expect(password).toHaveAccessibleName(/password/i);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("marketing FAQs disclose complete answers and client navigation works", async ({ page }) => {
  await page.goto("/");
  const disclosures = page.locator("details");
  await expect(disclosures).toHaveCount(12);
  await disclosures.first().locator("summary").click();
  await expect(disclosures.first()).toContainText(/not approved or endorsed/i);

  await page
    .getByRole("link", { name: /sign in|login/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/login$/);
});

test("hero product tour opens as a captioned first-party video with a transcript", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /see Haccora in the kitchen/i }).click();

  const dialog = page.getByRole("dialog", { name: /Haccora in 10 seconds/i });
  await expect(dialog).toBeVisible();
  const video = dialog.locator("video");
  await expect(video).toBeVisible();
  await expect(video.locator('source[type="video/mp4"]')).toHaveAttribute(
    "src",
    "/media/haccora-product-tour.mp4",
  );
  await expect(video.locator('track[kind="captions"]')).toHaveAttribute(
    "src",
    "/media/haccora-product-tour.en.vtt",
  );
  await dialog.getByText("Read the video transcript").click();
  await expect(dialog).toContainText(/does not guarantee an inspection outcome/i);

  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("marketing layout has no horizontal overflow at phone, tablet or desktop widths", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const dimensions = await page.locator("html").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
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
