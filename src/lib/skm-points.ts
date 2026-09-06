import type { SkmKategori } from "./types";

/**
 * Default SKM credit weights used to pre-fill "Bobot Poin SKM".
 * modul-skm/02-FITUR-PRESTASI-ORGANISASI.md states the field is
 * "Input manual atau hitung otomatis berdasarkan aturan SKM kampus" —
 * these are the built-in defaults; the form always allows an override.
 */
export interface PointRule {
  /** Value stored in skm_activities.kategori */
  kategori: SkmKategori;
  /** Sub-level shown in the "tingkat" picker */
  tingkat: string;
  poin: number;
}

export const SKM_POINT_RULES: PointRule[] = [
  // Prestasi / Kejuaraan
  { kategori: "Prestasi / Kejuaraan", tingkat: "Internasional — Juara 1/2/3", poin: 25 },
  { kategori: "Prestasi / Kejuaraan", tingkat: "Nasional — Juara 1/2/3", poin: 20 },
  { kategori: "Prestasi / Kejuaraan", tingkat: "Regional / Provinsi — Juara 1/2/3", poin: 15 },
  { kategori: "Prestasi / Kejuaraan", tingkat: "Internal Kampus — Juara 1/2/3", poin: 10 },
  { kategori: "Prestasi / Kejuaraan", tingkat: "Finalis / Peserta", poin: 5 },

  // Pengalaman Organisasi
  { kategori: "Pengalaman Organisasi", tingkat: "Ketua / Wakil Ketua", poin: 12 },
  { kategori: "Pengalaman Organisasi", tingkat: "Pengurus Inti (Sekretaris / Bendahara)", poin: 10 },
  { kategori: "Pengalaman Organisasi", tingkat: "Ketua Divisi", poin: 8 },
  { kategori: "Pengalaman Organisasi", tingkat: "Anggota Pengurus", poin: 5 },

  // Sertifikasi / Lisensi
  { kategori: "Sertifikasi / Lisensi", tingkat: "Internasional (AWS, Google, Cisco, dsb.)", poin: 15 },
  { kategori: "Sertifikasi / Lisensi", tingkat: "Nasional (BNSP, Dicoding, dsb.)", poin: 10 },
  { kategori: "Sertifikasi / Lisensi", tingkat: "Internal / Lembaga Pelatihan", poin: 5 },

  // Kepanitiaan Event
  { kategori: "Kepanitiaan Event", tingkat: "Project Officer / Ketua Panitia", poin: 8 },
  { kategori: "Kepanitiaan Event", tingkat: "Koordinator Sie", poin: 5 },
  { kategori: "Kepanitiaan Event", tingkat: "Anggota Panitia", poin: 3 },

  // Workshop / Seminar / Pelatihan
  { kategori: "Workshop / Seminar / Pelatihan", tingkat: "Pembicara / Narasumber", poin: 10 },
  { kategori: "Workshop / Seminar / Pelatihan", tingkat: "Peserta — Internasional / Nasional", poin: 4 },
  { kategori: "Workshop / Seminar / Pelatihan", tingkat: "Peserta — Regional / Internal", poin: 2 },
];

export function rulesFor(kategori: string): PointRule[] {
  return SKM_POINT_RULES.filter((r) => r.kategori === kategori);
}

/** Suggested weight for a category + level, or 0 when unknown. */
export function suggestPoin(kategori: string, tingkat: string): number {
  return SKM_POINT_RULES.find((r) => r.kategori === kategori && r.tingkat === tingkat)?.poin ?? 0;
}
