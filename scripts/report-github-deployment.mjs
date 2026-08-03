const repository = (process.env.GITHUB_REPOSITORY ?? "").trim();
const commitSha = (process.env.GITHUB_SHA ?? "").trim().toLowerCase();
const token = (process.env.GITHUB_TOKEN ?? "").trim();
const productionUrlRaw = (process.env.PRODUCTION_URL ?? "").trim();
const runId = (process.env.GITHUB_RUN_ID ?? "").trim();

if (!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i.test(repository)) {
  throw new Error("GITHUB_REPOSITORY is invalid");
}
if (!/^[0-9a-f]{40}$/.test(commitSha)) throw new Error("GITHUB_SHA must be a full commit SHA");
if (!token) throw new Error("GITHUB_TOKEN is missing");

const productionUrl = new URL(productionUrlRaw);
if (
  productionUrl.protocol !== "https:" ||
  productionUrl.username ||
  productionUrl.password ||
  productionUrl.search ||
  productionUrl.hash
) {
  throw new Error("PRODUCTION_URL must be a clean HTTPS URL");
}

const apiBase = `https://api.github.com/repos/${repository}`;
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "User-Agent": "Haccora-Release-Evidence",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function request(pathname, options = {}) {
  const response = await fetch(`${apiBase}${pathname}`, { ...options, headers });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub deployment API returned ${response.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

const existing = await request(
  `/deployments?sha=${encodeURIComponent(commitSha)}&environment=production&per_page=20`,
);
let deployment = existing.find(
  (candidate) => candidate.sha === commitSha && candidate.environment === "production",
);

if (!deployment) {
  deployment = await request("/deployments", {
    method: "POST",
    body: JSON.stringify({
      ref: commitSha,
      environment: "production",
      auto_merge: false,
      required_contexts: [],
      description: "Haccora release evidence and deployed-commit verification passed",
    }),
  });
}

await request(`/deployments/${deployment.id}/statuses`, {
  method: "POST",
  body: JSON.stringify({
    state: "success",
    environment: "production",
    environment_url: productionUrl.href,
    log_url: runId
      ? `https://github.com/${repository}/actions/runs/${encodeURIComponent(runId)}`
      : undefined,
    description: "Verified release candidate is serving the approved commit",
  }),
});

console.log(`GitHub production deployment recorded for ${commitSha}.`);
