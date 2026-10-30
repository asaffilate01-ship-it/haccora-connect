import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const KEY = "haccora-offline-queue-v1";
const jobKey = (id: string) => `haccora-offline-job-${id}`;
type Table =
  | "checks"
  | "temperature_logs"
  | "haccp_flow_runs"
  | "goods_in_logs"
  | "cleaning_completions"
  | "asset_events";
type Job = {
  id: string;
  table: Table;
  payload: Record<string, unknown>;
  queuedAt: string;
  attempts: number;
  lastError?: string;
};

function ownerColumn(table: Table): string {
  if (table === "cleaning_completions") return "completed_by";
  if (table === "asset_events") return "recorded_by";
  return "user_id";
}

function ownerOf(job: Pick<Job, "table" | "payload">): unknown {
  return job.payload[ownerColumn(job.table)];
}

// Compare JSON values without treating object key order as evidence differences.
// Deliberately do not coerce strings/numbers or ignore missing fields.
function sameValue(expected: unknown, actual: unknown): boolean {
  if (expected === actual) return true;
  if (!expected || !actual || typeof expected !== "object" || typeof actual !== "object")
    return false;
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      expected.length === actual.length &&
      expected.every((value, index) => sameValue(value, actual[index]))
    );
  if (Array.isArray(actual)) return false;
  const entries = Object.entries(expected);
  return (
    entries.length === Object.keys(actual).length &&
    entries.every(
      ([key, value]) =>
        Object.hasOwn(actual, key) && sameValue(value, (actual as Record<string, unknown>)[key]),
    )
  );
}

// Postgres serializes UTC as +00:00 and may omit trailing fractional zeros.
// Preserve sub-millisecond precision; Date.parse would silently truncate it.
function sameField(key: string, expected: unknown, actual: unknown): boolean {
  if (
    ["completed_at", "logged_at", "received_at"].includes(key) &&
    typeof expected === "string" &&
    typeof actual === "string"
  ) {
    const canonical = (value: string) =>
      value
        .replace(/\+00:00$/, "Z")
        .replace(/(\.\d*?)0+Z$/, "$1Z")
        .replace(/\.Z$/, "Z");
    return canonical(expected) === canonical(actual);
  }
  return sameValue(expected, actual);
}

async function isConfirmedReplay(job: Job): Promise<boolean> {
  try {
    const before = await supabase.auth.getSession();
    if (before.error || before.data.session?.user.id !== ownerOf(job)) return false;
    const { data, error } = await supabase
      .from(job.table)
      .select("*")
      .eq("idempotency_key", job.id)
      .eq("organization_id", job.payload.organization_id as string)
      .eq(ownerColumn(job.table), ownerOf(job) as string)
      .maybeSingle();
    const after = await supabase.auth.getSession();
    if (error || !data || after.error || after.data.session?.user.id !== ownerOf(job)) return false;
    // Server defaults may add fields; every submitted field must still match.
    return Object.entries(job.payload).every(
      ([key, value]) => Object.hasOwn(data, key) && sameField(key, value, data[key]),
    );
  } catch {
    return false;
  }
}

let operation: Promise<void> = Promise.resolve();

function withQueueLock<T>(work: () => Promise<T>): Promise<T> {
  const run = operation.then(work, work);
  operation = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function queueIds(raw: string | null): string[] {
  const ids: unknown = raw !== null ? JSON.parse(raw) : [];
  if (
    !Array.isArray(ids) ||
    ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9._-]{1,160}$/.test(id)) ||
    new Set(ids).size !== ids.length
  )
    throw new Error("Offline queue index requires recovery");
  return ids;
}

function decodeJob(raw: string | null, id: string): Job {
  const job = raw ? JSON.parse(raw) : null;
  if (
    !job ||
    job.id !== id ||
    ![
      "checks",
      "temperature_logs",
      "haccp_flow_runs",
      "goods_in_logs",
      "cleaning_completions",
      "asset_events",
    ].includes(job.table) ||
    !job.payload ||
    typeof job.payload !== "object" ||
    Array.isArray(job.payload) ||
    job.payload.idempotency_key !== id ||
    typeof job.payload.organization_id !== "string" ||
    !job.payload.organization_id ||
    typeof ownerOf(job) !== "string" ||
    !ownerOf(job) ||
    typeof job.queuedAt !== "string" ||
    !Number.isFinite(Date.parse(job.queuedAt)) ||
    !Number.isSafeInteger(job.attempts) ||
    job.attempts < 0 ||
    (job.lastError !== undefined && typeof job.lastError !== "string")
  )
    throw new Error("Offline evidence requires recovery");
  return job;
}

async function read(): Promise<Job[]> {
  if (Platform.OS === "web") throw new Error("Secure offline evidence requires iOS or Android");
  const value = await AsyncStorage.getItem(KEY);
  const ids = queueIds(value);
  const values = await Promise.all(ids.map((id) => SecureStore.getItemAsync(jobKey(id))));
  if (values.some((job) => job === null)) throw new Error("Offline queue integrity check failed");
  return values.map((job, index) => decodeJob(job, ids[index]));
}

async function write(jobs: Job[]) {
  const previousValue = await AsyncStorage.getItem(KEY);
  const previousIds = queueIds(previousValue);
  await Promise.all(
    jobs.map((job) =>
      SecureStore.setItemAsync(jobKey(job.id), JSON.stringify(job), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ),
  );
  const nextIds = jobs.map((job) => job.id);
  await AsyncStorage.setItem(KEY, JSON.stringify(nextIds));
  const retained = new Set(nextIds);
  await Promise.all(
    previousIds
      .filter((id) => !retained.has(id))
      .map((id) => SecureStore.deleteItemAsync(jobKey(id))),
  );
}

export async function enqueue(table: Table, payload: Record<string, unknown>) {
  const id = Crypto.randomUUID();
  await withQueueLock(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session || ownerOf({ table, payload }) !== data.session.user.id)
      throw new Error("Sign in with the account recording this evidence");
    const jobs = await read();
    jobs.push({
      id,
      table,
      payload: { ...payload, idempotency_key: id },
      queuedAt: new Date().toISOString(),
      attempts: 0,
    });
    await write(jobs);
  });
  // Durable local storage is the save boundary. A failed network attempt must
  // not tell the caller to create the same evidence again.
  void flush().catch(() => undefined);
  return id;
}

export async function flush() {
  return withQueueLock(async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected) return;
    const jobs = await read();
    const remaining: Job[] = [];
    for (const job of jobs) {
      try {
        // Recheck for each item; an account can change while a batch is running.
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !data.session || ownerOf(job) !== data.session.user.id) {
          remaining.push(job);
          continue;
        }
        const { error } = await supabase.from(job.table).insert(job.payload);
        if (error) {
          // Only a readable, scoped, field-for-field match confirms a lost-response replay.
          if (error.code === "23505" && (await isConfirmedReplay(job))) continue;
          // Missing, changed, inaccessible or unverifiable records stay on device.
          remaining.push({
            ...job,
            attempts: job.attempts + 1,
            lastError:
              error.code === "23505"
                ? "Conflict requires record verification"
                : "Upload failed; evidence retained",
          });
        }
      } catch {
        remaining.push({
          ...job,
          attempts: job.attempts + 1,
          lastError: "Connection failed; evidence retained",
        });
      }
    }
    // Evidence is never discarded merely because a retry limit was reached.
    await write(remaining);
  });
}

export function startOfflineSync() {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) void flush().catch(() => undefined);
  });
}

export async function getQueueStatus() {
  return withQueueLock(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const jobs = (await read()).filter(
      (job) => data.session && ownerOf(job) === data.session.user.id,
    );
    return {
      pending: jobs.length,
      failed: jobs.filter((job) => job.lastError).length,
      oldestQueuedAt: jobs[0]?.queuedAt ?? null,
    };
  });
}

export type QueuedEvidenceSummary = {
  id: string;
  table: Table;
  queuedAt: string;
  attempts: number;
  state: "pending" | "failed" | "conflict";
};

/** Metadata only: no evidence payloads or raw provider errors leave the queue. */
export async function listQueuedEvidence(): Promise<QueuedEvidenceSummary[]> {
  return withQueueLock(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) return [];
    const userId = data.session.user.id;
    return (await read())
      .filter((job) => ownerOf(job) === userId)
      .map((job) => ({
        id: job.id,
        table: job.table,
        queuedAt: job.queuedAt,
        attempts: job.attempts,
        state:
          job.lastError === "Conflict requires record verification"
            ? "conflict"
            : job.lastError
              ? "failed"
              : "pending",
      }));
  });
}
