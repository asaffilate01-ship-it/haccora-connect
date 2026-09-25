export const RECOVERY_REDIRECT = "haccora://reset-password";

/** Only accept a password-recovery response delivered to our exact app route. */
export function recoverySessionFromUrl(raw: string) {
  const url = new URL(raw);
  if (
    url.protocol !== "haccora:" ||
    url.hostname !== "reset-password" ||
    (url.pathname !== "" && url.pathname !== "/") ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error("Open the password reset link from your Haccora email.");
  }
  const params = new URLSearchParams(url.hash.slice(1));
  if (params.has("error") || params.has("error_code")) {
    throw new Error("This reset link has expired or is invalid. Request a new email.");
  }
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (params.get("type") !== "recovery" || !access_token || !refresh_token) {
    throw new Error("This reset link is incomplete. Request a new email.");
  }
  return { access_token, refresh_token };
}

export function newPasswordError(password: string, confirmation: string) {
  if (password.length < 12) return "Use at least 12 characters for your new password.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}
