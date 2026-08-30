import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.HACCORA_AUTHENTICATED_E2E === "true";
const password = process.env.ROLE_ACCEPTANCE_PASSWORD ?? "";

const accounts = [
  {
    name: "platform owner",
    emailKey: "ROLE_ACCEPTANCE_PLATFORM_OWNER_EMAIL",
    path: "/platform",
    heading: /Platform owner dashboard/i,
    roleLabel: /platform owner/i,
    organization: null,
    forbiddenPath: "/app",
    forbiddenRedirect: /\/platform$/,
  },
  {
    name: "tenant owner",
    emailKey: "ROLE_ACCEPTANCE_OWNER_EMAIL",
    path: "/app",
    heading: /Welcome,/i,
    roleLabel: /Owner \/ Executive/i,
    organization: /Riverside Kitchen/i,
    forbiddenPath: null,
    forbiddenRedirect: null,
  },
  {
    name: "manager",
    emailKey: "ROLE_ACCEPTANCE_MANAGER_EMAIL",
    path: "/app",
    heading: /Welcome,/i,
    roleLabel: /Location Manager/i,
    organization: /Riverside Kitchen/i,
    forbiddenPath: "/app/billing",
    forbiddenRedirect: /\/app\/?$/,
  },
  {
    name: "chef",
    emailKey: "ROLE_ACCEPTANCE_CHEF_EMAIL",
    path: "/app",
    heading: /Welcome,/i,
    roleLabel: /Head Chef/i,
    organization: /Riverside Kitchen/i,
    forbiddenPath: "/app/billing",
    forbiddenRedirect: /\/app\/?$/,
  },
  {
    name: "staff",
    emailKey: "ROLE_ACCEPTANCE_STAFF_EMAIL",
    path: "/app",
    heading: /Welcome,/i,
    roleLabel: /Team Member/i,
    organization: /Riverside Kitchen/i,
    forbiddenPath: "/app/billing",
    forbiddenRedirect: /\/app\/?$/,
  },
  {
    name: "inspector",
    emailKey: "ROLE_ACCEPTANCE_INSPECTOR_EMAIL",
    path: "/app/inspection",
    heading: /Inspector Mode/i,
    roleLabel: /Inspector/i,
    organization: /Riverside Kitchen/i,
    forbiddenPath: "/app/temperature",
    forbiddenRedirect: /\/app\/inspection$/,
  },
  {
    name: "isolation owner",
    emailKey: "ROLE_ACCEPTANCE_ISOLATION_OWNER_EMAIL",
    path: "/app",
    heading: /Welcome,/i,
    roleLabel: /Owner \/ Executive/i,
    organization: /Harbour Café/i,
    forbiddenPath: null,
    forbiddenRedirect: null,
  },
] as const;

async function signIn(page: Page, email: string) {
  const response = await page.goto("/login");
  expect(response?.status()).toBeLessThan(400);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in to Haccora" }).click();
}

test.describe("authenticated production role dashboards", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!enabled, "Protected role credentials are available only in the manual workflow.");

  test.beforeAll(() => {
    if (password.length < 16) {
      throw new Error("ROLE_ACCEPTANCE_PASSWORD must contain at least 16 characters.");
    }
    for (const account of accounts) {
      if (!process.env[account.emailKey]) throw new Error(`Missing ${account.emailKey}.`);
    }
  });

  for (const account of accounts) {
    test(`${account.name} receives the correct live dashboard and tenant scope`, async ({
      page,
    }) => {
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });

      await signIn(page, process.env[account.emailKey] as string);
      await expect(page).toHaveURL(new RegExp(`${account.path}/?$`), {
        timeout: 30_000,
      });
      await expect(page.getByRole("heading", { level: 1, name: account.heading })).toBeVisible({
        timeout: 30_000,
      });

      if (account.path === "/platform") {
        await expect(
          page.getByRole("navigation", { name: "Platform dashboard sections" }),
        ).toBeVisible();
      } else {
        const accountMenu = page.getByRole("button", {
          name: new RegExp(`Account menu for .*, ${account.roleLabel.source},`),
        });
        await expect(accountMenu).toBeVisible();
        if (account.organization)
          await expect(accountMenu).toHaveAccessibleName(account.organization);
      }

      await expect(page.locator('[role="alert"]')).toHaveCount(0);
      const dimensions = await page.locator("html").evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(accessibility.violations).toEqual([]);
      expect(browserErrors).toEqual([]);

      if (account.forbiddenPath && account.forbiddenRedirect) {
        await page.goto(account.forbiddenPath);
        await expect(page).toHaveURL(account.forbiddenRedirect, { timeout: 30_000 });
      } else if (account.path === "/app") {
        await page.goto("/app/billing");
        await expect(page).toHaveURL(/\/app\/billing$/);
        await expect(page.getByRole("heading", { level: 1, name: "Plan & billing" })).toBeVisible();
      }
    });
  }
});
