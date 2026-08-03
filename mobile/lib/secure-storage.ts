import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CHUNK_SIZE = 1800;
const safeKey = (key: string) => `haccora-auth-${key.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
const pendingWrites = new Map<string, Promise<void>>();

const serialize = async <T>(key: string, operation: () => Promise<T>) => {
  const prior = pendingWrites.get(key) ?? Promise.resolve();
  const result = prior.catch(() => undefined).then(operation);
  const marker = result.then(
    () => undefined,
    () => undefined,
  );
  pendingWrites.set(key, marker);
  try {
    return await result;
  } finally {
    if (pendingWrites.get(key) === marker) pendingWrites.delete(key);
  }
};

export const secureAuthStorage = {
  async getItem(key: string) {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return serialize(key, async () => {
      const base = safeKey(key);
      const countValue = await SecureStore.getItemAsync(`${base}.count`);
      if (!countValue) return null;
      const count = Number(countValue);
      if (!Number.isInteger(count) || count < 1 || count > 20) return null;
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${base}.${index}`)),
      );
      return chunks.every((chunk) => chunk !== null) ? chunks.join("") : null;
    });
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    return serialize(key, async () => {
      const base = safeKey(key);
      const oldCount = Number((await SecureStore.getItemAsync(`${base}.count`)) ?? 0);
      const chunks = Array.from(
        { length: Math.max(1, Math.ceil(value.length / CHUNK_SIZE)) },
        (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
      );
      await Promise.all(
        chunks.map((chunk, index) =>
          SecureStore.setItemAsync(`${base}.${index}`, chunk, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          }),
        ),
      );
      await SecureStore.setItemAsync(`${base}.count`, String(chunks.length), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      if (oldCount > chunks.length) {
        await Promise.all(
          Array.from({ length: oldCount - chunks.length }, (_, offset) =>
            SecureStore.deleteItemAsync(`${base}.${chunks.length + offset}`),
          ),
        );
      }
    });
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    return serialize(key, async () => {
      const base = safeKey(key);
      const count = Number((await SecureStore.getItemAsync(`${base}.count`)) ?? 0);
      await Promise.all([
        SecureStore.deleteItemAsync(`${base}.count`),
        ...Array.from({ length: Number.isInteger(count) ? count : 0 }, (_, index) =>
          SecureStore.deleteItemAsync(`${base}.${index}`),
        ),
      ]);
    });
  },
};
