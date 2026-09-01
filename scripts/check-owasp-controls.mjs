import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

const [edgeHttp, webhookUrl, server, errorPage, authMiddleware, contact, integrationDispatch] =
  await Promise.all([
    read("supabase/functions/_shared/http.ts"),
    read("supabase/functions/_shared/webhook-url.ts"),
    read("src/server.ts"),
    read("src/lib/error-page.ts"),
    read("src/integrations/supabase/haccora-auth-middleware.ts"),
    read("supabase/functions/contact/index.ts"),
    read("supabase/functions/integration-dispatch/index.ts"),
  ]);

assert.match(edgeHttp, /configuredOrigins\.has\(normalized\)/);
assert.doesNotMatch(edgeHttp, /endsWith\(["']\.lovable(?:app|project)\.com["']\)/);
assert.match(edgeHttp, /origin_not_allowed/);
assert.match(edgeHttp, /class RequestBodyError/);
assert.match(edgeHttp, /total > maxBytes/);

assert.match(webhookUrl, /direct IP literals are not supported/);
assert.match(webhookUrl, /!hostname\.includes\(["']\.["']\)/);
assert.match(webhookUrl, /url\.hash/);
assert.match(integrationDispatch, /AbortSignal\.timeout\(15_000\)/);

assert.match(server, /script-src-attr 'none'/);
assert.match(server, /frame-src 'none'/);
assert.doesNotMatch(errorPage, /onclick=/i);

assert.match(authMiddleware, /statusCode: 401/);
assert.match(authMiddleware, /\^Bearer \(\[\^\\s\]\{1,8192\}\)\$/);
assert.match(authMiddleware, /getClaims\(token\)/);

assert.match(contact, /consume_rate_limit/);
assert.match(contact, /readJsonBody\(request, 16 \* 1024\)/);

console.log("OWASP Top 10:2025 repository control checks passed.");
