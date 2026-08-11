import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./haccora-client";

/** Attach the signed-in user's token to TanStack server-function requests. */
export const attachHaccoraAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
