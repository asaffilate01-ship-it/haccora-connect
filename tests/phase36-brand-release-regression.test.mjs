import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Lovable publishing cannot replace the Haccora-owned Supabase boundary", async () => {
  const [client, attacher, middleware, serverClient] = await Promise.all([
    text("src/integrations/supabase/haccora-client.ts"),
    text("src/integrations/supabase/haccora-auth-attacher.ts"),
    text("src/integrations/supabase/auth-middleware.ts"),
    text("src/integrations/supabase/client.server.ts"),
  ]);

  assert.match(client, /getPublicSupabaseConfig/);
  assert.doesNotMatch(client, /Connect Supabase in Lovable Cloud/);
  assert.match(attacher, /from "\.\/haccora-client"/);
  assert.match(middleware, /supabase\.auth\.getClaims\(token\)/);
  assert.match(serverClient, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("web, PWA and native surfaces use the canonical Haccora identity", async () => {
  const [
    webLogo,
    onboarding,
    nativeLogo,
    login,
    dashboard,
    appLock,
    appConfig,
    nativeTheme,
    bottomNav,
  ] = await Promise.all([
    text("src/components/BrandLogo.tsx"),
    text("src/routes/onboarding.tsx"),
    text("mobile/components/BrandLogo.tsx"),
    text("mobile/app/login.tsx"),
    text("mobile/app/dashboard.tsx"),
    text("mobile/lib/app-lock.tsx"),
    text("mobile/app.json"),
    text("mobile/lib/theme.ts"),
    text("mobile/components/bottom-nav.tsx"),
  ]);

  assert.match(webLogo, /Safe\. Clean\. Compliant\./);
  assert.match(onboarding, /<BrandLogo/);
  assert.match(nativeLogo, /useWindowDimensions/);
  assert.match(nativeLogo, /haccora-wordmark/);
  for (const surface of [login, dashboard, appLock]) assert.match(surface, /<BrandLogo/);
  assert.doesNotMatch(`${login}\n${dashboard}\n${appLock}`, />HACCORA<\/Text>/);
  assert.match(appConfig, /adaptive-icon\.png/);
  assert.match(appConfig, /splash-logo\.png/);
  assert.match(appConfig, /notification-icon\.png/);
  assert.match(appConfig, /"orientation": "default"/);
  assert.match(nativeTheme, /maxWidth: 760/);
  assert.match(bottomNav, /maxWidth: 760/);
});

test("all canonical identity files required by installable apps are present", async () => {
  await Promise.all(
    [
      "public/brand/haccora-logo.svg",
      "public/brand/haccora-logo-light.svg",
      "public/brand/haccora-mark.svg",
      "public/icons/icon-192.png",
      "public/icons/icon-512.png",
      "public/icons/apple-touch-icon.png",
      "public/favicon.ico",
      "mobile/assets/haccora-wordmark.png",
      "mobile/assets/haccora-wordmark-light.png",
      "mobile/assets/icon.png",
      "mobile/assets/adaptive-icon.png",
      "mobile/assets/splash-logo.png",
      "mobile/assets/notification-icon.png",
    ].map((path) => access(new URL(`../${path}`, import.meta.url))),
  );
});

test("launch help explains competitor-service and notification boundaries", async () => {
  const help = await text("src/lib/help-centre.ts");
  assert.match(help, /accredited training or a HACCP consultant/);
  assert.match(help, /Do reminders replace day-to-day food-safety supervision/);
  assert.match(
    help,
    /does not automatically turn general guidance into a safe business-specific decision/,
  );
});
