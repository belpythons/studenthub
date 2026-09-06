import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Storage object path derived from a public URL, or null if it isn't one. */
function pathFromPublicUrl(bucket: string, publicUrl: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(publicUrl.slice(i + marker.length));
}

/**
 * Uploads to "<bucket>/<userId>/<timestamp>-<name>" and returns the public URL.
 *
 * Uses XMLHttpRequest rather than supabase-js so real byte progress can be
 * reported — the JS client exposes no progress event, which left a 20 MB photo
 * upload with no feedback at all.
 */
export async function uploadPublicFile(
  supabase: SupabaseClient,
  bucket: string,
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const safeName = file.name.replace(/[^\w.-]+/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error("Sesi berakhir. Silakan masuk kembali.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.setRequestHeader("Cache-Control", "3600");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }

      let detail = xhr.responseText;
      try {
        detail = (JSON.parse(xhr.responseText) as { message?: string }).message ?? detail;
      } catch {
        // Non-JSON body — keep the raw text.
      }
      reject(new Error(`Gagal mengunggah berkas: ${detail || xhr.statusText}`));
    };

    xhr.onerror = () =>
      reject(new Error("Gagal mengunggah berkas. Periksa koneksi internet Anda."));
    xhr.onabort = () => reject(new Error("Unggahan dibatalkan."));

    xhr.send(file);
  });

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Best-effort removal of a previously uploaded public URL.
 *
 * Call this only AFTER the owning database row has been written or deleted.
 * Removing the object first meant a failed row delete left the record intact
 * but its file gone for good.
 */
export async function removePublicFile(
  supabase: SupabaseClient,
  bucket: string,
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl) return;
  const path = pathFromPublicUrl(bucket, publicUrl);
  if (!path) return;

  try {
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // An orphaned object is harmless; never fail the user's action over it.
  }
}
