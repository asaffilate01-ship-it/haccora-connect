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
  await flush();
  return id;
}

export async function flush() {
  return withQueueLock(async () => {
    const network = await NetInfo.fetch();
    if (!network.isConnected) return;
    const jobs = await read();
    const remaining: Job[] = [];
    for (const job of jobs) {
      const { error } = await supabase.from(job.table).insert(job.payload);
      if (error && error.code !== "23505") {
        remaining.push({
          ...job,
          attempts: job.attempts + 1,
          lastError: error.message.slice(0, 300),
        });
      }
    }
    // Evidence is never discarded merely because a retry limit was reached.
    await write(remaining);
  });
}

export function startOfflineSync() {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) void flush();
  });
}

export async function getQueueStatus() {
  const jobs = await read();
  return {
    pending: jobs.length,
    failed: jobs.filter((job) => job.lastError).length,
    oldestQueuedAt: jobs[0]?.queuedAt ?? null,
  };
}
