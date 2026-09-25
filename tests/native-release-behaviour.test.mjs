import assert from "node:assert/strict";
import test from "node:test";
import { requiredDecimal, temperatureValues } from "../mobile/lib/evidence-validation.ts";
import { belongsToUser, replayEvidence } from "../mobile/lib/offline-replay.ts";
import { newPasswordError, recoverySessionFromUrl } from "../mobile/lib/password-recovery.ts";

test("temperature evidence rejects blank and malformed readings while accepting real zero and negatives", () => {
  for (const text of ["", " ", "\t", "NaN", "Infinity", "0x10", "1e2", "1,2,3", "4 degrees"]) {
    assert.equal(requiredDecimal(text), null, text);
    assert.equal(temperatureValues(text, "0", "7"), null, text);
  }
  assert.deepEqual(temperatureValues("0", "0", "7"), { value: 0, min: 0, max: 7 });
  assert.deepEqual(temperatureValues("-18,5", "-25", "-18"), { value: -18.5, min: -25, max: -18 });
  assert.equal(temperatureValues("4", "", "7"), null);
  assert.equal(temperatureValues("4", "7", "7"), null);
  assert.equal(temperatureValues("301", "0", "7"), null);
  assert.equal(temperatureValues("-101", "-25", "-18"), null);
});

const job = (id, user = "alice", table = "checks", actor = "user_id") => ({
  id,
  table,
  payload: { [actor]: user, organization_id: "tenant-a", idempotency_key: id },
  queuedAt: "2026-09-25T09:00:00Z",
  attempts: 0,
});

test("a shared device replays only the signed-in actor's evidence and retains the other actor's jobs", async () => {
  const jobs = [
    job("a"),
    job("b", "bob"),
    job("c", "alice", "cleaning_completions", "completed_by"),
    job("d", "alice", "asset_events", "recorded_by"),
  ];
  const sent = [];
  const remaining = await replayEvidence(
    jobs,
    "alice",
    async (record) => {
      sent.push(record.id);
      return null;
    },
    async () => false,
  );
  assert.deepEqual(sent, ["a", "c", "d"]);
  assert.deepEqual(remaining, [jobs[1]]);
  assert.equal(belongsToUser({ ...job("e"), payload: { user_id: "alice" } }, "alice"), false);
});

test("network exceptions, denied writes and unrelated unique conflicts never discard evidence", async () => {
  const jobs = [job("network"), job("denied"), job("conflict"), job("confirmed"), job("saved")];
  const remaining = await replayEvidence(
    jobs,
    "alice",
    async (record) => {
      if (record.id === "network") throw new Error("offline");
      if (record.id === "denied") return { code: "42501", message: "Access denied" };
      if (["conflict", "confirmed"].includes(record.id))
        return { code: "23505", message: "Conflict" };
      return null;
    },
    async (record) => record.id === "confirmed",
  );
  assert.deepEqual(
    remaining.map((record) => record.id),
    ["network", "denied", "conflict"],
  );
  assert.ok(remaining.every((record) => record.attempts === 1 && record.lastError));
  const retried = await replayEvidence(
    remaining,
    "alice",
    async () => null,
    async () => false,
  );
  assert.deepEqual(retried, []);
});

test("an unavailable duplicate confirmation retains the job for the next retry", async () => {
  const remaining = await replayEvidence(
    [job("a")],
    "alice",
    async () => ({ code: "23505", message: "Conflict" }),
    async () => {
      throw new Error("network unavailable");
    },
  );
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].attempts, 1);
});

test("password reset accepts only complete recovery tokens on the exact Haccora route", () => {
  const hash = "#type=recovery&access_token=test-access&refresh_token=test-refresh";
  assert.deepEqual(recoverySessionFromUrl(`haccora://reset-password${hash}`), {
    access_token: "test-access",
    refresh_token: "test-refresh",
  });
  for (const raw of [
    `https://attacker.invalid/reset-password${hash}`,
    `other://reset-password${hash}`,
    `haccora://reset-password.evil${hash}`,
    `haccora://reset-password/extra${hash}`,
    `haccora://user@reset-password${hash}`,
    "haccora://reset-password#type=signup&access_token=a&refresh_token=b",
    "haccora://reset-password#type=recovery&access_token=a",
    "haccora://reset-password#error_code=otp_expired",
  ])
    assert.throws(() => recoverySessionFromUrl(raw), undefined, raw);
  assert.ok(newPasswordError("short", "short"));
  assert.ok(newPasswordError("a-long-password", "different-password"));
  assert.equal(newPasswordError("a-long-password", "a-long-password"), null);
});
