import supabase from "@/lib/supabase/client";
import type { ChatMessage, LinkedInAiBahasa, LinkedInAiSection } from "@shared/linkedin-ai";

/*
  Pembungkus tipis di atas Edge Function `linkedin-ai`.

  GEMINI_API_KEY tidak boleh masuk bundel browser, jadi generator tetap berjalan
  di sisi server — bedanya sekarang server itu milik Supabase, bukan milik kita.
  invoke() melampirkan token sesi secara otomatis, sehingga Edge Function bisa
  memakai auth.uid() persis seperti route Next yang digantikannya.
*/

export interface DraftResult {
  draft: string;
  id: string | null;
  cached: boolean;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("linkedin-ai", { body });
  if (error) {
    // FunctionsHttpError menyembunyikan body respons; pesan asli ada di dalamnya.
    const detail = await (error as { context?: Response }).context
      ?.json()
      .then((j: { error?: string }) => j.error)
      .catch(() => undefined);
    throw new Error(detail ?? error.message);
  }
  if (!data) throw new Error("Server tidak mengembalikan data.");
  return data;
}

/** UI menyembunyikan tombol AI bila key tidak dikonfigurasi (dok 02 §3.4). */
export async function aiConfigured(): Promise<boolean> {
  try {
    const { configured } = await invoke<{ configured: boolean }>({ action: "status" });
    return configured;
  } catch {
    return false;
  }
}

export function generateDraft(input: {
  activity_id: string;
  seksi: LinkedInAiSection;
  bahasa: LinkedInAiBahasa;
  force: boolean;
}): Promise<DraftResult> {
  return invoke<DraftResult>({ action: "generate", ...input });
}

export interface ChatResult {
  reply: string;
  /** Chunk KB yang dipakai — ditampilkan sebagai provenance di bawah jawaban. */
  sumber_chunk: string[];
}

/**
 * Mode Panduan: tanya jawab mekanik LinkedIn yang di-ground ke knowledge base.
 * `activity_id` opsional — entri SKM yang sedang dibuka ikut jadi konteks.
 */
export function chatLinkedIn(input: {
  messages: ChatMessage[];
  activity_id?: string;
}): Promise<ChatResult> {
  return invoke<ChatResult>({ action: "chat", ...input });
}
