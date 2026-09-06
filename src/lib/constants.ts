import type { ReportKategori, SkmKategori } from "./types";

/** Official activity categories — modul-task-report/01-OVERVIEW-TASK-REPORT.md */
export const REPORT_KATEGORI: ReportKategori[] = [
  "Pekerjaan Utama",
  "Meeting/Diskusi",
  "Belajar/Training",
  "Dokumentasi",
  "Kunjungan Lapangan",
  "Lainnya",
];

/** SKM categories — modul-skm/02-FITUR-PRESTASI-ORGANISASI.md */
export const SKM_KATEGORI: { value: SkmKategori; emoji: string; short: string }[] = [
  { value: "Prestasi / Kejuaraan", emoji: "🥇", short: "Prestasi" },
  { value: "Pengalaman Organisasi", emoji: "🏛️", short: "Organisasi" },
  { value: "Sertifikasi / Lisensi", emoji: "📜", short: "Sertifikasi" },
  { value: "Kepanitiaan Event", emoji: "🎪", short: "Kepanitiaan" },
  { value: "Workshop / Seminar / Pelatihan", emoji: "🎓", short: "Workshop" },
];

/** Graduation requirement used by the SKM progress bar. */
export const SKM_TARGET_POIN = 50;

export const STORAGE_BUCKET_CERTIFICATES = "skm-certificates";
export const STORAGE_BUCKET_PHOTOS = "report-photos";
export const STORAGE_BUCKET_ORG_LOGOS = "org-logos";

/** Client-side photo cap — modul-task-report/02-FITUR-FORM-INPUT.md */
export const MAX_PHOTO_SIZE = 20 * 1024 * 1024;
/** Certificate cap (PDF/image) for the SKM module. */
export const MAX_CERTIFICATE_SIZE = 20 * 1024 * 1024;
/** Letterhead logo cap — docs/perbaikan/03 §2.2 */
/** Panjang password minimum. Dipakai form daftar dan form ganti password. */
export const MIN_PASSWORD = 6;

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;

export const ORG = {
  kampus: "Universitas Sains dan Teknologi Bontang",
  kampusUpper: "UNIVERSITAS SAINS DAN TEKNOLOGI BONTANG",
  prodiUpper: "PROGRAM STUDI TEKNIK INFORMATIKA",
  formulirTitle: "FORM KEHADIRAN DAN AKTIFITAS KERJA PRAKTEK",
  kodeSop: "TI-SOP-17/FM-01",
  perusahaan: "PT BADAK NGL",
  perusahaanMixed: "PT Badak NGL",
  perusahaanSub: "Program Magang / Praktik Kerja Lapangan · Bontang, Kalimantan Timur",
  lokasi: "Bontang",
} as const;

/**
 * Pengirim dan subjek email verifikasi, persis seperti tampil di kotak masuk.
 *
 * Nilai ini dibaca dari konfigurasi auth proyek yang sedang berjalan, bukan dari
 * supabase/emails/ — proyek ini SENGAJA memakai pengirim bawaan Supabase, dan
 * Supabase menolak subjek maupun template kustom selama tidak ada SMTP sendiri.
 * Artinya emailnya berbahasa Inggris dan tidak menyebut "Student Hub" sama
 * sekali, jadi orang yang menyapu kotak masuk mencari nama aplikasi pasti
 * melewatkannya. Dua baris inilah yang ditampilkan layar "cek email kamu" dan
 * FAQ sebagai kata kunci pencarian.
 *
 * Kalau suatu saat SMTP kustom dipasang, jalankan `npm run email:apply` lalu
 * samakan kedua nilai di bawah dengan Sender name dan subjek yang baru.
 */
export const MAIL_SENDER = "Supabase Auth <noreply@mail.app.supabase.io>";
export const MAIL_SUBJECT_CONFIRM = "Confirm your email address";
