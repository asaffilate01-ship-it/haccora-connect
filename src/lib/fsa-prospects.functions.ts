import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/haccora-auth-middleware";
import { assertPlatformOperator, fetchAuthorities, syncFsaProspects } from "./fsa-prospects.server";

export const listFsaAuthorities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformOperator(context.supabase, context.userId);
    return fetchAuthorities();
  });

export const runFsaProspectSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        localAuthorityId: z.number().int().positive(),
        businessTypeId: z.number().int().positive().nullable().optional(),
        maxRecords: z.number().int().min(1).max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformOperator(context.supabase, context.userId, [
      "platform_owner",
      "platform_support",
    ]);
    return syncFsaProspects(data, context.userId);
  });
