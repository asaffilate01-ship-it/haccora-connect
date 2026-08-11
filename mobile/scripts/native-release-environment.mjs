export const easProjectIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const placeholder = /(replace|your_project|example\.supabase|set_with)/i;

function cleanUrl(name, raw, failures, { supabase = false } = {}) {
  const value = String(raw ?? "").trim();
  if (!value) {
    failures.push(`${name} is missing`);
    return;
  }
  if (placeholder.test(value)) {
    failures.push(`${name} still contains a placeholder`);
    return;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") failures.push(`${name} must use HTTPS`);
    if (url.username || url.password || url.search || url.hash) {
      failures.push(`${name} must not contain credentials, a query string or a fragment`);
    }
    if (supabase && !url.hostname.endsWith(".supabase.co")) {
      failures.push(`${name} must identify the configured Supabase project origin`);
    }
  } catch {
    failures.push(`${name} is not a valid URL`);
  }
}

export function nativeReleaseEnvironmentFailures(environment = process.env, options = {}) {
  const failures = [];
  const requireProjectId = options.requireProjectId !== false;
  const publishableKey = String(environment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

  cleanUrl("EXPO_PUBLIC_SUPABASE_URL", environment.EXPO_PUBLIC_SUPABASE_URL, failures, {
    supabase: true,
  });
  cleanUrl("EXPO_PUBLIC_WEB_APP_URL", environment.EXPO_PUBLIC_WEB_APP_URL, failures);

  if (!publishableKey) {
    failures.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing");
  } else if (placeholder.test(publishableKey)) {
    failures.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY still contains a placeholder");
  } else if (publishableKey.startsWith("sb_secret_")) {
    failures.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must never contain a secret key");
  } else if (publishableKey.length < 20) {
    failures.push("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is unexpectedly short");
  }

  if (requireProjectId) {
    const projectId = String(environment.EAS_PROJECT_ID ?? "").trim();
    if (!easProjectIdPattern.test(projectId)) {
      failures.push("EAS_PROJECT_ID must be the UUID returned by eas init");
    }
  }

  return failures;
}
