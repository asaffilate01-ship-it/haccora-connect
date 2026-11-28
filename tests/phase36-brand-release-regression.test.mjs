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

test("social card, favicons and responsive wordmarks have consistent real image dimensions", async () => {
  const png = (path) => readFile(new URL(`../${path}`, import.meta.url));
  const dimensions = (bytes) => {
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  };

  assert.deepEqual(dimensions(await png("public/og-haccora-v2.png")), [1200, 630]);
  assert.deepEqual(dimensions(await png("public/favicon.png")), [64, 64]);
  assert.deepEqual(dimensions(await png("public/icons/icon-192.png")), [192, 192]);
  assert.deepEqual(dimensions(await png("public/icons/icon-512.png")), [512, 512]);
  assert.deepEqual(dimensions(await png("public/icons/apple-touch-icon.png")), [180, 180]);

  for (const [web, native] of [
    ["haccora-wordmark-v2.png", "haccora-wordmark.png"],
    ["haccora-wordmark-light-v2.png", "haccora-wordmark-light.png"],
  ]) {
    const webBytes = await png(`public/brand/${web}`);
    assert.deepEqual(dimensions(webBytes), [720, 208]);
    assert.deepEqual(webBytes, await png(`mobile/assets/${native}`));
  }
});

test("public metadata uses the UK domain while private pages remain non-indexable", async () => {
  const [root, home, manifest, server, worker, industry] = await Promise.all([
    text("src/routes/__root.tsx"),
    text("src/routes/index.tsx"),
    text("public/manifest.webmanifest"),
    text("src/server.ts"),
    text("public/sw.js"),
    text("src/components/IndustryPage.tsx"),
  ]);

  assert.match(root, /og-haccora-v2\.png/);
  assert.match(root, /favicon\.png\?v=2/);
  assert.match(home, /UK Food Safety Management & HACCP Software/);
  assert.match(home, /SoftwareApplication/);
  assert.match(home, /"@type": "Organization"/);
  assert.match(home, /https:\/\/haccora\.co\.uk\//);
  assert.equal(JSON.parse(manifest).orientation, "any");
  assert.match(server, /X-Robots-Tag", "noindex, nofollow"/);
  assert.match(worker, /haccora-shell-v2/);
  assert.match(industry, /to="\/contact"/);
  assert.match(industry, /Request a demo/);
});
