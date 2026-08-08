import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabase";

type UploadInput = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  organizationId: string;
  userId: string;
  locationId?: string | null;
  title: string;
  category: string;
  subjectUserId?: string | null;
  documentKind?: string | null;
  issuedOn?: string | null;
  expiresAt?: string | null;
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/csv": "csv",
};
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  csv: "text/csv",
};

function evidenceMimeType(fileName?: string | null, supplied?: string | null) {
  const normalized = supplied?.split(";", 1)[0]?.trim().toLowerCase();
  if (normalized && EXTENSION_BY_MIME[normalized]) return normalized;
  const extension = fileName?.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase();
  const inferred = extension ? MIME_BY_EXTENSION[extension] : undefined;
  if (inferred) return inferred;
  throw new Error("Only PDF, JPG, PNG, WebP or CSV evidence files are supported");
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadEvidence(input: UploadInput) {
  const mimeType = evidenceMimeType(input.fileName, input.mimeType);
  const extension = EXTENSION_BY_MIME[mimeType];
  const path = `${input.organizationId}/${input.userId}/${Crypto.randomUUID()}.${extension}`;
  const bytes = await new File(input.uri).arrayBuffer();
  if (bytes.byteLength === 0) throw new Error("Evidence file is empty");
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Evidence must be 10 MB or smaller");
  const sha256 = hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes));
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, bytes, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("documents")
    .insert({
      organization_id: input.organizationId,
      location_id: input.locationId ?? null,
      user_id: input.userId,
      title: input.title,
      category: input.category,
      subject_user_id: input.subjectUserId ?? null,
      document_kind: input.documentKind ?? null,
      issued_on: input.issuedOn ?? null,
      expires_at: input.expiresAt ?? null,
      file_url: null,
      storage_path: path,
      mime_type: mimeType,
      file_size: bytes.byteLength,
      sha256,
      idempotency_key: Crypto.randomUUID(),
    })
    .select("id,storage_path")
    .single();
  if (error) {
    await supabase.storage.from("documents").remove([path]);
    throw error;
  }
  return data;
}
