import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@^2.19.0";

import { fail, json, preflight } from "../_shared/http.ts";
import {
  CHAT_LIMIT_PER_WINDOW,
  CHAT_MAX_TURNS,
  CHAT_WINDOW_MINUTES,
  DAILY_GENERATION_LIMIT,
  LINKEDIN_AI_BAHASA,
  LINKEDIN_AI_SECTIONS,
  buildChatPrompt,
  buildChatRetrievalQuery,
  buildInputHash,
  buildPrompt,
  buildRetrievalQuery,
  clampMessages,
  type ChatMessage,
  type DraftProfile,
  type LinkedInAiBahasa,
  type LinkedInAiSection,
  type SkmActivityInput,
} from "../_shared/linkedin-ai.ts";

/*
  Asisten LinkedIn RAG — dulu POST /api/skm/linkedin + /status.

  Pindah ke Edge Function karena GEMINI_API_KEY tidak boleh masuk bundel
  peramban. Tiga aksi digabung lewat field `action` supaya cuma ada satu fungsi
  yang di-deploy dan satu tempat rahasia dipasang:
    status   — apakah key terpasang (UI menyembunyikan tombol AI bila tidak)
    generate — draft satu seksi LinkedIn dari satu kegiatan SKM
    chat     — Mode Panduan: tanya jawab mekanik LinkedIn, di-ground ke KB
*/

const EMBED_MODEL = "gemini-embedding-001";
const GEN_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.7-flash";
const EMBED_TIMEOUT_MS = 15_000;
/**
 * Generasi butuh anggaran jauh lebih longgar daripada embedding. Nilai lama
 * 20 detik konsisten meleset untuk pertanyaan chat yang menuntut model membaca
 * enam chunk panduan sekaligus.
 */
const GEN_TIMEOUT_MS = 50_000;

/**
 * Membatalkan panggilan yang lewat tenggat, bukan sekadar berhenti menunggunya:
 * Promise.race meninggalkan permintaan tetap berjalan di Gemini dan tetap
 * ditagih.
 */
async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await run(ctrl.signal);
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error("timeout");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Klien service role, dipakai HANYA untuk dua RPC yang sengaja di-REVOKE dari
 * role `authenticated`: bump_rate_limit (kalau pengguna bisa memanggilnya
 * sendiri, kuotanya tidak berarti) dan match_branding_chunks (korpus KB tidak
 * boleh bisa dikuras dari konsol peramban).
 *
 * Klien ini TIDAK PERNAH menyentuh data milik pengguna — untuk itu tetap dipakai
 * klien beranon key + JWT pemanggil di bawah, supaya RLS berlaku penuh.
 */
function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** true = kuota habis. Gagal terbuka bila penghitungnya sendiri error. */
async function overLimit(
  admin: SupabaseClient,
  key: string,
  windowMinutes: number,
  max: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("bump_rate_limit", {
    p_key: key,
    p_window_minutes: windowMinutes,
    p_max: max,
  });
  if (error) {
    console.error("bump_rate_limit gagal:", error);
    return false;
  }
  return data === true;
}

/**
 * Satu panggilan generasi, dengan anggaran berpikir ditekan.
 *
 * Diukur pada gemini-3.6-flash: pertanyaan panduan yang sama menghabiskan 62
 * detik dengan thinking bawaan (1.373 token berpikir untuk jawaban 227 token)
 * dan 29 detik pada level "low" — dengan jawaban yang justru lebih patuh pada
 * aturan prompt. Nilai 0 ditolak model ini, jadi "low", bukan mati total.
 *
 * GEMINI_MODEL bisa diganti lewat env, dan tidak semua model menerima
 * thinkingLevel; sekali gagal dengan INVALID_ARGUMENT, ulangi tanpa field itu
 * daripada mematikan seluruh fitur AI.
 */
async function generate(ai: GoogleGenAI, prompt: string): Promise<string> {
  const call = (config: Record<string, unknown>) =>
    withTimeout(GEN_TIMEOUT_MS, (abortSignal) =>
      ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
        config: { ...config, abortSignal },
      }),
    );

  let res;
  try {
    res = await call({ thinkingConfig: { thinkingLevel: "low" } });
  } catch (err) {
    if (!/invalid_argument|invalid argument/i.test(String(err))) throw err;
    console.warn(`${GEN_MODEL} menolak thinkingLevel — mengulang tanpa field itu.`);
    res = await call({});
  }

  const text = (res.text ?? "").trim();
  if (!text) throw new Error("Model tidak mengembalikan teks.");
  return text;
}

async function retrieve(
  admin: SupabaseClient,
  ai: GoogleGenAI,
  query: string,
  matchCount: number,
  seksi: string | null,
  bahasa: string | null,
): Promise<{ konten: string; sumber: string }[]> {
  const embedRes = await withTimeout(EMBED_TIMEOUT_MS, (abortSignal) =>
    ai.models.embedContent({
      model: EMBED_MODEL,
      contents: query,
      config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: 768, abortSignal },
    }),
  );
  const embedding = embedRes.embeddings?.[0]?.values;
  if (!embedding) throw new Error("Embedding kosong.");

  const { data, error } = await admin.rpc("match_branding_chunks", {
    query_embedding: embedding,
    match_count: matchCount,
    filter_seksi: seksi,
    filter_bahasa: bahasa,
  });
  if (error) throw error;
  return (data ?? []) as { konten: string; sumber: string }[];
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("Metode tidak didukung.", 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");

  let body: {
    action?: string;
    activity_id?: string;
    seksi?: string;
    bahasa?: string;
    force?: boolean;
    messages?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return fail("Body tidak valid.", 400);
  }

  /** UI menyembunyikan tombol AI bila key tidak dikonfigurasi (dok 02 §3.4). */
  if (body.action === "status") return json({ configured: Boolean(apiKey) });

  if (!apiKey) return fail("Fitur AI belum dikonfigurasi.", 503);

  // Client yang meneruskan JWT pemanggil, jadi RLS tetap berlaku persis seperti
  // pada rute lama. Service role sengaja TIDAK dipakai untuk data pengguna.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sesi berakhir.", 401);

  const admin = adminClient();
  const ai = new GoogleGenAI({ apiKey });

  async function loadProfile(): Promise<DraftProfile> {
    const { data } = await supabase
      .from("profiles")
      .select("nama_lengkap, prodi, instansi")
      .eq("id", user!.id)
      .maybeSingle();
    return {
      nama: data?.nama_lengkap || user!.email?.split("@")[0] || "Mahasiswa",
      prodi: data?.prodi ?? null,
      instansi: data?.instansi ?? null,
    };
  }

  // --------------------------------------------------------------- Mode Panduan
  if (body.action === "chat") {
    const raw = body.messages;
    if (
      !Array.isArray(raw) ||
      raw.length === 0 ||
      raw.length > CHAT_MAX_TURNS * 2 ||
      !raw.every(
        (m) =>
          m &&
          typeof m === "object" &&
          (m as ChatMessage).role !== undefined &&
          ["user", "model"].includes((m as ChatMessage).role) &&
          typeof (m as ChatMessage).text === "string",
      )
    ) {
      return fail("Percakapan tidak valid.", 400);
    }
    // Pemotongan giliran dan panjang pesan ditegakkan DI SINI, bukan di UI:
    // klien memanggil Edge Function langsung.
    const messages = clampMessages(raw as ChatMessage[]);

    if (await overLimit(admin, `linkedin-chat:${user.id}`, CHAT_WINDOW_MINUTES, CHAT_LIMIT_PER_WINDOW)) {
      return fail(
        `Batas ${CHAT_LIMIT_PER_WINDOW} pesan per jam tercapai. Coba lagi sebentar lagi.`,
        429,
      );
    }

    // Konteks entri yang sedang dibuka — opsional.
    let activity: SkmActivityInput | null = null;
    if (typeof body.activity_id === "string") {
      const { data } = await supabase
        .from("skm_activities")
        .select("*")
        .eq("id", body.activity_id)
        .eq("user_id", user.id)
        .maybeSingle();
      activity = (data as SkmActivityInput | null) ?? null;
    }

    try {
      // filter_seksi null = cari lintas seluruh korpus (platform, rules, style,
      // role, dan seksi per-section). Chat berbahasa Indonesia, jadi korpus
      // Inggris tidak ikut mengotori konteks.
      const chunks = await retrieve(admin, ai, buildChatRetrievalQuery(messages), 6, null, "id");
      const prompt = buildChatPrompt({
        chunks,
        messages,
        activity,
        profile: activity ? await loadProfile() : null,
      });
      const reply = await generate(ai, prompt);

      // Percakapan sengaja tidak disimpan: yang layak jadi arsip adalah draft,
      // dan linkedin_drafts sudah menanganinya.
      return json({ reply, sumber_chunk: chunks.map((c) => c.sumber) });
    } catch (err) {
      return failGeneric(err, "Chat AI gagal.");
    }
  }

  // ------------------------------------------------------------------ generate
  const seksi = body.seksi as LinkedInAiSection;
  const bahasa = (body.bahasa ?? "id") as LinkedInAiBahasa;
  if (
    typeof body.activity_id !== "string" ||
    !LINKEDIN_AI_SECTIONS.includes(seksi) ||
    !LINKEDIN_AI_BAHASA.includes(bahasa)
  ) {
    return fail("Parameter tidak valid.", 400);
  }

  // Aktivitas milik sendiri (RLS ikut menjaga) + profil untuk konteks.
  const [{ data: activityRow }, profile] = await Promise.all([
    supabase
      .from("skm_activities")
      .select("*")
      .eq("id", body.activity_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    loadProfile(),
  ]);
  if (!activityRow) return fail("Kegiatan tidak ditemukan.", 404);

  const activity = activityRow as SkmActivityInput & { id: string };
  const inputHash = buildInputHash(activity, seksi, bahasa, profile);

  // Cache: permintaan identik memakai ulang draft tanpa memanggil model.
  if (!body.force) {
    const { data: cached } = await supabase
      .from("linkedin_drafts")
      .select("id, draft, model, created_at")
      .eq("user_id", user.id)
      .eq("activity_id", activity.id)
      .eq("seksi", seksi)
      .eq("input_hash", inputHash)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached) return json({ draft: cached.draft, cached: true, id: cached.id });
  }

  // Kuota harian. Penghitungnya ada di tabel rate_limits, bukan jumlah baris
  // linkedin_drafts: pengguna boleh menghapus draftnya sendiri, dan dulu itu
  // ikut mereset kuotanya.
  if (await overLimit(admin, `linkedin-ai:${user.id}`, 24 * 60, DAILY_GENERATION_LIMIT)) {
    return fail(
      `Batas ${DAILY_GENERATION_LIMIT} generasi per hari tercapai. Coba lagi besok.`,
      429,
    );
  }

  try {
    const chunks = await retrieve(
      admin,
      ai,
      buildRetrievalQuery(activity, seksi, bahasa),
      4,
      seksi,
      bahasa,
    );
    const prompt = buildPrompt({ chunks, activity, seksi, bahasa, profile });

    const draft = await generate(ai, prompt);

    const { data: saved } = await supabase
      .from("linkedin_drafts")
      .insert({
        user_id: user.id,
        activity_id: activity.id,
        seksi,
        input_hash: inputHash,
        draft,
        model: GEN_MODEL,
      })
      .select("id")
      .maybeSingle();

    return json({
      draft,
      cached: false,
      id: saved?.id ?? null,
      sumber_chunk: chunks.map((c) => c.sumber),
    });
  } catch (err) {
    return failGeneric(err, "Generasi AI gagal.");
  }
});

/**
 * Detail error tetap di log server. Pesan mentah SDK pernah bocor ke klien lewat
 * jalur ini, dan isinya tidak berguna bagi pengguna.
 */
function failGeneric(err: unknown, prefix: string): Response {
  const message = err instanceof Error ? err.message : String(err);
  console.error(prefix, err);
  if (/timeout/i.test(message)) {
    return fail(`${prefix} Model tidak merespons tepat waktu — coba lagi.`, 504);
  }
  return fail(`${prefix} Coba lagi sebentar lagi.`, 502);
}
