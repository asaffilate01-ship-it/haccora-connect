declare const __HACCORA_RELEASE_SHA__: string;

const fullCommitSha = /^[0-9a-f]{40}$/i;
const embeddedReleaseSha = String(__HACCORA_RELEASE_SHA__).trim().toLowerCase();

/**
 * Commit identity embedded by Vite when the production worker is built.
 * An archive built without Git metadata intentionally reports `unverified` so
 * the release workflow cannot approve the wrong deployment by accident.
 */
export const RELEASE_SHA = fullCommitSha.test(embeddedReleaseSha)
  ? embeddedReleaseSha
  : "unverified";

export const RELEASE_VERIFIED = fullCommitSha.test(RELEASE_SHA);
