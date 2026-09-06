/**
 * Row types mirroring supabase/schema.sql.
 * Keep in sync when the schema changes.
 */

export type SkmKategori =
  | "Prestasi / Kejuaraan"
  | "Pengalaman Organisasi"
  | "Sertifikasi / Lisensi"
  | "Kepanitiaan Event"
  | "Workshop / Seminar / Pelatihan";

export type ReportKategori =
  | "Pekerjaan Utama"
  | "Meeting/Diskusi"
  | "Belajar/Training"
  | "Dokumentasi"
  | "Kunjungan Lapangan"
  | "Lainnya";

export interface Profile {
  id: string;
  nama_lengkap: string;
  nim: string;
  prodi: string;
  instansi: string;
  tempat_kp: string;
  email: string;
  /* EXTENSION — persona SKM aktif (docs/perbaikan/01) */
  skm_preset_id: string | null;
  /* EXTENSION — feeds the Formulir 2 signature block & recap period */
  pembimbing_nama: string | null;
  pembimbing_jabatan: string | null;
  lokasi_ttd: string | null;
  periode_mulai: string | null;
  periode_selesai: string | null;
  /* EXTENSION — panduan awal sudah dilihat; NULL = belum pernah */
  onboarding_at: string | null;
  created_at: string;
}

export interface SkmActivity {
  id: string;
  user_id: string;
  judul: string;
  kategori: SkmKategori | string;
  penyelenggara: string;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  poin_skm: number;
  deskripsi: string | null;
  skill_tags: string[] | null;
  certificate_url: string | null;
  /* EXTENSION — LinkedIn "Credential ID" field */
  credential_id: string | null;
  /* EXTENSION — provenance persona (docs/perbaikan/01 §3.2) */
  tingkat: string | null;
  rule_id: string | null;
  jam_sosial: number | null;
  created_at: string;
}

export interface InternshipReport {
  id: string;
  user_id: string;
  tanggal: string;
  jam_mulai: string | null;
  jam_selesai: string | null;
  kategori: ReportKategori | string;
  judul: string;
  deskripsi: string | null;
  output: string | null;
  kendala: string | null;
  foto_url: string | null;
  created_at: string;
}

/** internship_reports joined with the author's profile (shared feed). */
export interface ReportWithAuthor extends InternshipReport {
  profiles: Pick<Profile, "nama_lengkap" | "instansi"> | null;
}

export interface ReportComment {
  id: string;
  report_id: string;
  user_id: string;
  isi: string;
  created_at: string;
  profiles: Pick<Profile, "nama_lengkap"> | null;
}

/** EXTENSION — Modul 3 multi-supervisor tracking. */
export interface Supervisor {
  id: string;
  user_id: string;
  nama: string;
  jabatan: string | null;
  departemen: string | null;
  /* EXTENSION — persona konsultan (docs/perbaikan/04 §3.3) */
  peran: string | null;
  bidang_keahlian: string[] | null;
  prioritas: number;
  catatan_gaya: string | null;
  created_at: string;
}

export interface LogbookEntry {
  id: string;
  user_id: string;
  nomor_urut: number;
  tanggal: string;
  aktivitas_pekerjaan: string;
  pembimbing_nama: string;
  pembimbing_jabatan: string | null;
  paraf_status: boolean;
  /* EXTENSIONS */
  supervisor_id: string | null;
  hasil_tindak_lanjut: string | null;
  /* EXTENSION — konteks proyek + audit (docs/perbaikan/04) */
  project_id: string | null;
  updated_at: string | null;
  created_at: string;
}

/* EXTENSION — Logbook proyek multi-persona (docs/perbaikan/04 §3.3) */
export type ProjectStatus = "aktif" | "selesai" | "arsip";

export interface Project {
  id: string;
  user_id: string;
  judul: string;
  jenis: string;
  deskripsi: string | null;
  fase: string | null;
  target_tanggal: string | null;
  status: ProjectStatus | string;
  pertanyaan_baru: string | null;
  created_at: string;
  updated_at: string | null;
}

export type AdviceStatus = "diusulkan" | "diadopsi" | "ditolak" | "di-supersede";

export interface Advice {
  id: string;
  user_id: string;
  project_id: string;
  entry_id: string | null;
  supervisor_id: string | null;
  penyaran_nama: string;
  area: string;
  isi: string;
  status: AdviceStatus | string;
  alasan_status: string | null;
  superseded_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface AdviceRelation {
  a_id: string;
  b_id: string;
  jenis: "bentrok" | "menguatkan" | string;
  catatan: string | null;
  resolved_by: string | null;
}
