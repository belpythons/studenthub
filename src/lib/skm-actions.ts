/*
  Dulu ini server action ("use server").

  Setelah pindah ke SPA, fungsi-fungsi ini berjalan di browser. Yang menegakkan
  aturan sekarang adalah RLS dan constraint Postgres — bukan berkas ini; validasi
  di bawah tetap ada karena pesan galatnya spesifik dan enak dibaca pengguna,
  bukan karena ia menjadi batas kepercayaan. Seluruh RPC yang dipanggil di sini
  sudah SECURITY DEFINER dengan guard auth.uid() di dalamnya.
*/

import { createClient } from "@/lib/supabase/client";
import { SKM_KATEGORI } from "@/lib/constants";
import {
  ValidationError,
  vDate,
  vEnum,
  vInt,
  vOptionalDate,
  vOptionalStr,
  vRequiredStr,
  vTags,
} from "@/lib/validate";

export interface SkmActivityInput {
  id?: string;
  judul: string;
  kategori: string;
  penyelenggara: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  poin_skm: number;
  deskripsi: string | null;
  skill_tags: string[] | null;
  certificate_url: string | null;
  credential_id: string | null;
  /* Provenance persona (dok 01 §3.2) */
  tingkat: string | null;
  rule_id: string | null;
  jam_sosial: number | null;
}

export type ActionResult = { ok: true } | { error: string };

const KATEGORI_VALUES = SKM_KATEGORI.map((k) => k.value);

/** Create (no id) or update (with id) an SKM activity, validated server-side. */
export async function saveSkmActivity(input: SkmActivityInput): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  let payload;
  try {
    const tanggalMulai = vDate(input.tanggal_mulai, "Tanggal mulai");
    const tanggalSelesai = vOptionalDate(input.tanggal_selesai, "Tanggal selesai");
    if (tanggalSelesai && tanggalSelesai < tanggalMulai) {
      throw new ValidationError("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
    }
    payload = {
      user_id: user.id,
      judul: vRequiredStr(input.judul, "Judul kegiatan"),
      kategori: vEnum(input.kategori, "Kategori", KATEGORI_VALUES),
      penyelenggara: vRequiredStr(input.penyelenggara, "Penyelenggara"),
      tanggal_mulai: tanggalMulai,
      tanggal_selesai: tanggalSelesai,
      poin_skm: vInt(input.poin_skm, "Poin SKM", { min: 0, max: 100000 }),
      deskripsi: vOptionalStr(input.deskripsi, "Deskripsi", 10000),
      skill_tags: vTags(input.skill_tags),
      certificate_url: vOptionalStr(input.certificate_url, "URL sertifikat", 2000),
      credential_id: vOptionalStr(input.credential_id, "Credential ID", 120),
      tingkat: vOptionalStr(input.tingkat, "Tingkat", 160),
      rule_id: null as string | null,
      jam_sosial:
        input.jam_sosial == null
          ? null
          : (() => {
              const n = Number(input.jam_sosial);
              if (!Number.isFinite(n) || n < 0 || n > 9999) {
                throw new ValidationError("Jam sosial harus angka 0–9999.");
              }
              return Math.round(n * 10) / 10;
            })(),
    };

    // Provenance hanya sah bila rule milik persona aktif DAN poin belum
    // di-override manual — selain itu entri tercatat sebagai poin manual.
    if (input.rule_id) {
      const { data: rule } = await supabase
        .from("skm_point_rules")
        .select("id, preset_id, kategori, tingkat, poin")
        .eq("id", input.rule_id)
        .maybeSingle();
      const { data: prof } = await supabase
        .from("profiles")
        .select("skm_preset_id")
        .eq("id", user.id)
        .maybeSingle();
      const presetAktif = (prof?.skm_preset_id as string | null) ?? "custom";
      if (
        rule &&
        rule.preset_id === presetAktif &&
        rule.kategori === payload.kategori &&
        rule.poin === payload.poin_skm
      ) {
        payload.rule_id = rule.id;
        payload.tingkat = rule.tingkat;
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    throw err;
  }

  const { error } = input.id
    ? await supabase
        .from("skm_activities")
        .update(payload)
        .eq("id", input.id)
        .eq("user_id", user.id)
    : await supabase.from("skm_activities").insert(payload);

  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Ganti persona + konversi poin dalam satu transaksi RPC (dok 01 §3.3).
 * Entri ber-rule dikonversi lewat equivalence_key; entri manual dibiarkan.
 */
export async function setSkmPersona(
  presetId: string,
): Promise<{ ok: true; converted: number; tanpaPadanan: number } | { error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  if (typeof presetId !== "string" || presetId.length > 40) {
    return { error: "Persona tidak valid." };
  }

  const { data, error } = await supabase.rpc("convert_skm_persona", {
    p_preset: presetId,
  });

  if (error) return { error: error.message };
  const result = (data ?? {}) as { converted?: number; tanpa_padanan?: number };
  return {
    ok: true,
    converted: result.converted ?? 0,
    tanpaPadanan: result.tanpa_padanan ?? 0,
  };
}

export async function deleteSkmActivity(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  const { error } = await supabase
    .from("skm_activities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { ok: true };
}
