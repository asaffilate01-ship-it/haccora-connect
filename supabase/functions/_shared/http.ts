const DEFAULT_PRODUCTION_ORIGINS = [
  "https://haccora.co.uk",
  "https://www.haccora.co.uk",
  "https://app.haccora.co.uk",
] as const;

function exactOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const localDevelopment = url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (
      (url.protocol !== "https:" && !localDevelopment) || url.origin !== value
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

const configuredOrigins = new Set([
  ...DEFAULT_PRODUCTION_ORIGINS,
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => exactOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin)),
]);

function isTrustedOrigin(origin: string): boolean {
  const normalized = exactOrigin(origin);
  return normalized !== null && configuredOrigins.has(normalized);
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info, x-cron-secret, x-device-secret, x-monitor-secret, stripe-signature",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (isTrustedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function preflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  const origin = request.headers.get("origin") ?? "";
  if (!isTrustedOrigin(origin)) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: {
        ...corsHeaders(request),
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function requirePost(request: Request): Response | null {
  return request.method === "POST"
    ? null
    : json(request, { error: "method_not_allowed" }, 405);
}

export class RequestBodyError extends Error {
  constructor(
    public readonly code: "body_too_large" | "invalid_json",
    public readonly status: 400 | 413,
  ) {
    super(code);
  }
}

export async function readLimitedText(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<string> {
  const announced = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(announced) && announced > maxBytes) {
    throw new RequestBodyError("body_too_large", 413);
  }
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError("body_too_large", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError("invalid_json", 400);
  }
}

export async function readJsonBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  const raw = await readLimitedText(request, maxBytes);
  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestBodyError("invalid_json", 400);
  }
}

export function clientIpAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").at(-1)
    ?.trim();
  const candidate = request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown";
  return /^[0-9a-f:.]{2,64}$/i.test(candidate)
    ? candidate.toLowerCase()
    : "unknown";
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^
      (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}
