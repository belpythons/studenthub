import supabase from "@/lib/supabase/client";
import type { ChatMessage, LinkedInAiBahasa, LinkedInAiSection } from "@shared/linkedin-ai";

/*
  Dulu pembungkus tipis di atas Edge Function `linkedin-ai` (Gemini Cloud).
  Sekarang memanggil binding Wails (backend/linkedinai di Go), yang jalan
  100% lokal lewat Ollama — lihat docs/wails-reengineering-plan.md Fase 3-4.
  window.go.main.App.* disuntikkan runtime Wails, hanya ada di dalam shell
  desktop (bukan saat halaman ini dibuka sebagai tab browser biasa).
*/

export type ReasoningEffort = "low" | "medium" | "high" | "xhigh" | "max";

declare global {
  interface Window {
    go: {
      main: {
        App: {
          AIStatus(): Promise<{ configured: boolean; chatModel: string; reason?: string }>;
          GenerateDraft(req: {
            user_id: string;
            activity_id: string;
            seksi: string;
            bahasa: string;
            force: boolean;
            reasoning: string;
          }): Promise<{ draft: string; cached: boolean; id: string; sumber_chunk: string[] }>;
          ChatLinkedIn(req: {
            user_id: string;
            activity_id?: string;
            messages: ChatMessage[];
            reasoning: string;
          }): Promise<{ reply: string; sumber_chunk: string[] }>;
        };
      };
    };
  }
}

export interface DraftResult {
  draft: string;
  id: string | null;
  cached: boolean;
}

export interface AiStatus {
  configured: boolean;
  chatModel?: string;
  reason?: string;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Sesi berakhir.");
  return id;
}

/** Badge status di UI: "Ollama Connected (model)" vs "Fallback: Template". */
export async function aiStatus(): Promise<AiStatus> {
  try {
    return await window.go.main.App.AIStatus();
  } catch {
    return { configured: false, reason: "Shell desktop belum siap." };
  }
}

/** UI menyembunyikan tombol AI bila Ollama/model tidak tersedia. */
export async function aiConfigured(): Promise<boolean> {
  return (await aiStatus()).configured;
}

export async function generateDraft(input: {
  activity_id: string;
  seksi: LinkedInAiSection;
  bahasa: LinkedInAiBahasa;
  force: boolean;
  reasoning?: ReasoningEffort;
}): Promise<DraftResult> {
  const user_id = await currentUserId();
  const res = await window.go.main.App.GenerateDraft({
    user_id,
    activity_id: input.activity_id,
    seksi: input.seksi,
    bahasa: input.bahasa,
    force: input.force,
    reasoning: input.reasoning ?? "high",
  });
  return { draft: res.draft, id: res.id || null, cached: res.cached };
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
export async function chatLinkedIn(input: {
  messages: ChatMessage[];
  activity_id?: string;
  reasoning?: ReasoningEffort;
}): Promise<ChatResult> {
  const user_id = await currentUserId();
  return window.go.main.App.ChatLinkedIn({
    user_id,
    activity_id: input.activity_id,
    messages: input.messages,
    reasoning: input.reasoning ?? "high",
  });
}
