import { createClient } from "jsr:@supabase/supabase-js@2";

import { fail, json, preflight } from "../_shared/http.ts";

/*
  Unggah logo kampus saat pendaftaran — dulu POST /api/onboarding/logo.

  Publik dengan sengaja (verify_jwt = false): akunnya belum ada ketika logo
  dipilih. Karena itu fungsi ini menegakkan sendiri semua yang tidak boleh
  dipercayakan ke klien.

  Yang TIDAK ada lagi di sini: analisis piksel. Dekode PNG, deteksi latar tak
  transparan, dan swatch warna kini dikerjakan kanvas peramban (lihat
  src/lib/logo-canvas.ts) — semuanya umpan balik UX, bukan batas kepercayaan,
  dan menjalankannya di klien membuat pemilih warna terasa seketika sekaligus
  menghapus ketergantungan pada sharp.
*/

const BUCKET = "org-logos";
/** Sinkron dengan MAX_LOGO_SIZE di src/lib/constants.ts. */
const MAX_BYTES = 2 * 1024 * 1024;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 5;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/**
 * Rate limit berbasis tabel, bukan Map di memori.
 *
 * Isolate Deno didaur ulang kapan saja dan berjalan di banyak region, jadi
 * penghitung dalam proses akan mereset dirinya sendiri persis ketika ia paling
 * dibutuhkan. Satu RPC menggantikannya dan benar di semua region.
 */
async function overLimit(key: string): Promise<boolean> {
  const { data, error } = await admin.rpc("bump_rate_limit", {
    p_key: key,
    p_window_minutes: WINDOW_MINUTES,
    p_max: MAX_PER_WINDOW,
  });
  // Gagal-terbuka: kalau penghitungnya sendiri yang rusak, jangan sampai
  // pendaftaran ikut mati. Batas ukuran dan magic byte tetap berlaku.
  if (error) return false;
  return data === true;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return fail("Metode tidak didukung.", 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (await overLimit(`logo:${ip}`)) {
    return fail("Terlalu banyak unggahan. Coba lagi beberapa menit lagi.", 429);
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return fail("Berkas tidak terbaca.", 400);
  }
  if (!file) return fail("Berkas logo tidak ditemukan.", 400);

  if (file.size > MAX_BYTES) {
    return fail("Logo lebih dari 2 MB. Perkecil dulu berkasnya.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Magic byte, bukan Content-Type: header itu ditentukan klien dan bisa dibuat
  // mengaku PNG untuk berkas apa pun.
  if (bytes.length < 8 || PNG_MAGIC.some((b, i) => bytes[i] !== b)) {
    return fail("Hanya berkas PNG yang diterima.", 415);
  }

  // ponytail: objek pending/ dari pendaftaran yang ditinggalkan tidak pernah
  // disapu. Tambahkan cron pembersih bila volumenya jadi masalah.
  const path = `pending/${crypto.randomUUID()}.png`;
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) return fail("Gagal menyimpan logo. Coba lagi.", 500);

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return json({ logo_url: publicUrl });
});
