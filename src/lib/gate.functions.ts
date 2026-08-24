import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { gatePasswordMatches, getGateSessionConfig, type GateSession } from "./gate.server";

/** Promo gate is only active when a shared password is configured. */
export const getGateState = createServerFn({ method: "GET" }).handler(async () => {
  const expected = process.env["SITE_PASSWORD"];
  const secret = process.env["SITE_GATE_SESSION_SECRET"];
  if (!expected || !secret) return { enabled: false as const, unlocked: true };
  try {
    const session = await useSession<GateSession>(getGateSessionConfig());
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
    const secret = process.env["SITE_GATE_SESSION_SECRET"];
    if (!expected || !secret) return { ok: true as const };
    if (!gatePasswordMatches(data.password, expected)) return { ok: false as const };
    try {
      const session = await useSession<GateSession>(getGateSessionConfig());
      await session.update({ unlocked: true });
      return { ok: true as const };
    } catch (error) {
      // Never 500 the gate: surface a retryable failure instead of a blank screen.
      console.error(error);
      return { ok: false as const };
    }
  });

export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const session = await useSession<GateSession>(getGateSessionConfig());
    await session.clear();
  } catch (error) {
    console.error(error);
  }
  return { ok: true as const };
});
