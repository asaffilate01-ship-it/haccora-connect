import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { createReplayClient } from "./supabase";
import {
  actorColumns,
  belongsToUser,
  replayEvidence,
  type EvidenceJob as Job,
  type EvidenceTable as Table,
} from "./offline-replay";

const KEY = "haccora-offline-queue-v1";
const jobKey = (id: string) => `haccora-offline-job-${id}`;
let activeSession: Session | null = null;
const listeners = new Set<() => void>();

export function subscribeQueueChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setOfflineSession(session: Session | null) {
  activeSession = session;
  listeners.forEach((listener) => listener());
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
  listeners.forEach((listener) => listener());
}

export async function enqueue(table: Table, payload: Record<string, unknown>) {
  const id = Crypto.randomUUID();
  await withQueueLock(async () => {
    const job: Job = {
      id,
      table,
      payload: { ...payload, idempotency_key: id },
      queuedAt: new Date().toISOString(),
      attempts: 0,
    };
    if (!activeSession || !belongsToUser(job, activeSession.user.id)) {
      throw new Error("Evidence must belong to the signed-in user and workspace");
    }
    const jobs = await read();
    jobs.push(job);
    await write(jobs);
  });
  // Persistence succeeded. A later network failure must not turn this into a
  // misleading 'not saved' result or encourage the user to submit a duplicate.
  void flush().catch(() => undefined);
  return id;
}

export async function flush() {
  return withQueueLock(async () => {
    const session = activeSession;
    if (!session || Platform.OS === "web") return;
    const network = await NetInfo.fetch();
    if (!network.isConnected || network.isInternetReachable === false) return;
    const jobs = await read();
    const client = createReplayClient(session.access_token);
    const remaining = await replayEvidence(
      jobs,
      session.user.id,
      async (job) => {
        if (activeSession?.access_token !== session.access_token) {
          throw new Error("Session changed; retry with the original account");
        }
        const { error } = await client.from(job.table).insert(job.payload);
        return error;
      },
      async (job) => {
        if (job.payload.idempotency_key !== job.id) return false;
        const { data, error } = await client
          .from(job.table)
          .select("id")
          .eq("idempotency_key", job.id)
          .eq("organization_id", job.payload.organization_id)
          .eq(actorColumns[job.table], session.user.id)
          .maybeSingle();
        return !error && Boolean(data);
      },
    );
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
    const session = activeSession;
    if (!session || Platform.OS === "web") return { pending: 0, failed: 0, oldestQueuedAt: null };
    const jobs = (await read()).filter((job) => belongsToUser(job, session.user.id));
    return {
      pending: jobs.length,
      failed: jobs.filter((job) => job.lastError).length,
      oldestQueuedAt: jobs[0]?.queuedAt ?? null,
    };
  });
}
