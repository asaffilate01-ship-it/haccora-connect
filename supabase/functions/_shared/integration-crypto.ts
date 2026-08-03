import { env } from "./http.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function encryptionKey(): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(env("INTEGRATION_ENCRYPTION_KEY")),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecret(value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await encryptionKey(),
      encoder.encode(value),
    ),
  );
  const envelope = new Uint8Array(iv.length + encrypted.length);
  envelope.set(iv);
  envelope.set(encrypted, iv.length);
  return `v1.${toBase64(envelope)}`;
}

export async function decryptSecret(envelope: string): Promise<string> {
  const [version, encoded] = envelope.split(".", 2);
  if (version !== "v1" || !encoded) {
    throw new Error("unsupported secret envelope");
  }
  const value = fromBase64(encoded);
  const iv = value.slice(0, 12);
  const ciphertext = value.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    ciphertext,
  );
  return decoder.decode(decrypted);
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
  return Array.from(signature).map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
