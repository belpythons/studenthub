/*
  Dulu ini server action ("use server").

  Setelah pindah ke SPA, fungsi-fungsi ini berjalan di browser. Yang menegakkan
  aturan sekarang adalah RLS dan constraint Postgres — bukan berkas ini; validasi
  di bawah tetap ada karena pesan galatnya spesifik dan enak dibaca pengguna,
  bukan karena ia menjadi batas kepercayaan. Seluruh RPC yang dipanggil di sini
  sudah SECURITY DEFINER dengan guard auth.uid() di dalamnya.
*/

import { createClient } from "@/lib/supabase/client";
import {
  ValidationError,
  vDate,
  vEnum,
  vOptionalDate,
  vOptionalStr,
  vRequiredStr,
} from "@/lib/validate";

export type ActionResult = { ok: true } | { error: string };
export type ActionResultId = { ok: true; id: string } | { error: string };

const PROJECT_JENIS = ["Jurnal", "Tugas Akhir", "Lomba", "KP", "Lainnya"];
const PROJECT_STATUS = ["aktif", "selesai", "arsip"];

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export interface ProjectInput {
  id?: string;
  judul: string;
  jenis: string;
  deskripsi: string | null;
  fase: string | null;
  target_tanggal: string | null;
  status: string;
  pertanyaan_baru: string | null;
}

export async function saveProject(input: ProjectInput): Promise<ActionResultId> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  let payload;
  try {
    payload = {
      user_id: user.id,
      judul: vRequiredStr(input.judul, "Judul proyek"),
      jenis: vEnum(input.jenis, "Jenis proyek", PROJECT_JENIS),
      deskripsi: vOptionalStr(input.deskripsi, "Deskripsi", 5000),
      fase: vOptionalStr(input.fase, "Fase", 60),
      target_tanggal: vOptionalDate(input.target_tanggal, "Target tanggal"),
      status: vEnum(input.status, "Status proyek", PROJECT_STATUS),
      pertanyaan_baru: vOptionalStr(input.pertanyaan_baru, "Pertanyaan persiapan", 5000),
    };
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    throw err;
  }

  const query = input.id
    ? supabase
        .from("projects")
        .update(payload)
        .eq("id", input.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle()
    : supabase.from("projects").insert(payload).select("id").maybeSingle();

  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data) return { error: "Proyek tidak ditemukan." };
  return { ok: true, id: data.id };
}

export async function setProjectAdvisors(
  projectId: string,
  supervisorIds: string[],
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };
  if (!Array.isArray(supervisorIds)) return { error: "Daftar konsultan tidak valid." };

  const { error } = await supabase.rpc("set_project_advisors", {
    p_project: projectId,
    p_supervisors: supervisorIds,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export interface AdviceInput {
  project_id: string;
  area: string;
  isi: string;
  supervisor_id: string | null;
  entry_id: string | null;
  penyaran: string | null;
  relasi_jenis: "bentrok" | "menguatkan" | null;
  relasi_dengan: string | null;
}

export async function createAdvice(input: AdviceInput): Promise<ActionResultId> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  try {
    vRequiredStr(input.area, "Area saran", 120);
    vRequiredStr(input.isi, "Isi saran", 10000);
    if (input.relasi_jenis != null) {
      vEnum(input.relasi_jenis, "Jenis relasi", ["bentrok", "menguatkan"]);
    }
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    throw err;
  }

  const { data, error } = await supabase.rpc("create_advice", {
    p_project: input.project_id,
    p_area: input.area,
    p_isi: input.isi,
    p_supervisor: input.supervisor_id,
    p_entry: input.entry_id,
    p_penyaran: input.penyaran,
    p_relasi_jenis: input.relasi_jenis,
    p_relasi_dengan: input.relasi_dengan,
  });
  if (error) return { error: error.message };
  return { ok: true, id: data as string };
}

/** Adopsi / tolak saran tunggal — trigger advice_guard menjaga legalitasnya. */
export async function setAdviceStatus(
  id: string,
  status: "diadopsi" | "ditolak",
  alasan: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };
  if (!alasan.trim()) return { error: "Alasan keputusan wajib diisi." };
  if (!["diadopsi", "ditolak"].includes(status)) return { error: "Status tidak valid." };

  const { data, error } = await supabase
    .from("advice")
    .update({ status, alasan_status: alasan.trim() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Saran tidak ditemukan." };
  return { ok: true };
}

export async function decideConflict(
  winnerId: string,
  loserIds: string[],
  alasan: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  const { error } = await supabase.rpc("decide_conflict", {
    p_winner: winnerId,
    p_losers: loserIds,
    p_alasan: alasan,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/* ------------------- Entri logbook (P0-2/P0-4 di Tahap 5) ------------------- */

export interface LogbookEntryInput {
  id?: string;
  nomor_urut: number;
  tanggal: string;
  aktivitas: string;
  supervisor_id: string | null;
  baru_nama: string | null;
  baru_jabatan: string | null;
  baru_departemen: string | null;
  hasil: string | null;
  paraf: boolean;
  project_id: string | null;
}

export async function saveLogbookEntry(
  input: LogbookEntryInput,
): Promise<ActionResultId> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  try {
    vDate(input.tanggal, "Tanggal konsultasi");
    vRequiredStr(input.aktivitas, "Aktivitas", 10000);
    if (!Number.isInteger(input.nomor_urut) || input.nomor_urut < 1) {
      throw new ValidationError("Nomor urut harus angka 1 atau lebih.");
    }
    if (input.supervisor_id == null) {
      vRequiredStr(input.baru_nama, "Nama pembimbing baru");
    }
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    throw err;
  }

  const { data, error } = await supabase.rpc("save_logbook_entry", {
    p_id: input.id ?? null,
    p_nomor: input.nomor_urut,
    p_tanggal: input.tanggal,
    p_aktivitas: input.aktivitas,
    p_supervisor: input.supervisor_id,
    p_baru_nama: input.baru_nama,
    p_baru_jabatan: input.baru_jabatan,
    p_baru_departemen: input.baru_departemen,
    p_hasil: input.hasil,
    p_paraf: input.paraf,
    p_project: input.project_id,
  });
  if (error) return { error: error.message };
  return { ok: true, id: data as string };
}

export async function deleteLogbookEntry(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  const { error } = await supabase
    .from("logbook_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}

/** P0-5: renumber atomik via RPC — mengembalikan jumlah baris yang berubah. */
export async function renumberLogbook(): Promise<{ ok: true; changed: number } | { error: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  const { data, error } = await supabase.rpc("renumber_logbook");
  if (error) return { error: error.message };
  return { ok: true, changed: (data as number) ?? 0 };
}

/* ---------------------- Pembimbing / persona (P2-3) ---------------------- */

export interface SupervisorInput {
  id?: string;
  nama: string;
  jabatan: string | null;
  departemen: string | null;
  peran: string | null;
  prioritas: number;
  bidang_keahlian: string[] | null;
  catatan_gaya: string | null;
}

export async function saveSupervisor(input: SupervisorInput): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  let nama;
  try {
    nama = vRequiredStr(input.nama, "Nama pembimbing");
  } catch (err) {
    if (err instanceof ValidationError) return { error: err.message };
    throw err;
  }

  if (input.id) {
    // Rename + sinkronisasi salinan denormalisasi dalam satu transaksi RPC.
    const { error } = await supabase.rpc("update_supervisor_sync", {
      p_id: input.id,
      p_nama: nama,
      p_jabatan: input.jabatan,
      p_departemen: input.departemen,
      p_peran: input.peran,
      p_prioritas: input.prioritas,
      p_bidang: input.bidang_keahlian,
      p_catatan: input.catatan_gaya,
    });
    if (error) return { error: error.message };
    return { ok: true };
  }

  const { error } = await supabase.from("supervisors").insert({
    user_id: user.id,
    nama,
    jabatan: vOptionalStr(input.jabatan, "Jabatan"),
    departemen: vOptionalStr(input.departemen, "Departemen"),
    peran: vOptionalStr(input.peran, "Peran", 60),
    prioritas: Math.max(1, Math.min(999, input.prioritas || 100)),
    bidang_keahlian: input.bidang_keahlian?.length ? input.bidang_keahlian : null,
    catatan_gaya: vOptionalStr(input.catatan_gaya, "Catatan gaya", 2000),
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deleteSupervisor(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };

  const { error } = await supabase
    .from("supervisors")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function decideSynthesis(
  aId: string,
  bId: string,
  isi: string,
  alasan: string,
): Promise<ActionResultId> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk kembali." };
  if (!isi.trim()) return { error: "Isi sintesis wajib diisi." };

  const { data, error } = await supabase.rpc("decide_synthesis", {
    p_a: aId,
    p_b: bId,
    p_isi: isi,
    p_alasan: alasan,
  });
  if (error) return { error: error.message };
  return { ok: true, id: data as string };
}
