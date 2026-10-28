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

function ownerOf(job: Pick<Job, "table" | "payload">): unknown {
  if (job.table === "cleaning_completions") return job.payload.completed_by;
  if (job.table === "asset_events") return job.payload.recorded_by;
  return job.payload.user_id;
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

async function read(): Promise<Job[]> {
  if (Platform.OS === "web") throw new Error("Secure offline evidence requires iOS or Android");
  const value = await AsyncStorage.getItem(KEY);
  const ids = value ? (JSON.parse(value) as string[]) : [];
  const values = await Promise.all(ids.map((id) => SecureStore.getItemAsync(jobKey(id))));
  if (values.some((job) => job === null)) throw new Error("Offline queue integrity check failed");
  return values.map((job) => JSON.parse(job as string) as Job);
}

async function write(jobs: Job[]) {
  const previousValue = await AsyncStorage.getItem(KEY);
  const previousIds = previousValue ? (JSON.parse(previousValue) as string[]) : [];
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
          // A uniqueness conflict is not proof that this exact evidence exists.
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
