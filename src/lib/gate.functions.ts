import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env["SITE_GATE_SESSION_SECRET"] ?? "",
    name: "haccora-site-gate",
    maxAge: 60 * 60 * 24 * 7,
    // SameSite=None so the gate cookie survives embedded/preview iframes.
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Promo gate is only active when a shared password is configured. */
export const getGateState = createServerFn({ method: "GET" }).handler(async () => {
  const expected = process.env["SITE_PASSWORD"];
  const secret = process.env["SITE_GATE_SESSION_SECRET"];
  if (!expected || !secret) return { enabled: false as const, unlocked: true };
  try {
    const session = await useSession<GateSession>(sessionConfig());
    return { enabled: true as const, unlocked: session.data.unlocked === true };
  } catch {
    // An unreadable/invalid session must gate the site, not crash the render.
    return { enabled: true as const, unlocked: false };
  }
});

export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => ({ password: String(data?.password ?? "") }))
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) return { ok: true as const };
    if (!passwordMatches(data.password, expected)) return { ok: false as const };
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});
