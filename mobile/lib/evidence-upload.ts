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
};

export async function uploadEvidence(input: UploadInput) {
  const extension =
    (input.fileName?.split(".").pop() ?? "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${input.organizationId}/${input.userId}/${Crypto.randomUUID()}.${extension}`;
  const bytes = await new File(input.uri).arrayBuffer();
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Evidence must be 10 MB or smaller");
  const { error: uploadError } = await supabase.storage.from("documents").upload(path, bytes, {
    contentType: input.mimeType ?? "application/octet-stream",
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
      file_url: path,
      storage_path: path,
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
