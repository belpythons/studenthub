import { durasiJam, formatJam } from "./format";
import type { InternshipReport, LogbookEntry } from "./types";

export const EXPORT_HEADERS = [
  "Tanggal",
  "Jam Mulai",
  "Jam Selesai",
  "Durasi (Jam)",
  "Kategori",
  "Judul / Nama Kegiatan",
  "Deskripsi Kegiatan",
  "Output / Hasil",
  "Kendala",
  "URL Foto",
] as const;

export type ExportRow = [
  string, string, string, number, string, string, string, string, string, string,
];

export function toExportRow(r: InternshipReport): ExportRow {
  return [
    r.tanggal,
    formatJam(r.jam_mulai),
    formatJam(r.jam_selesai),
    Number(durasiJam(r.jam_mulai, r.jam_selesai).toFixed(2)),
    r.kategori,
    r.judul,
    r.deskripsi ?? "",
    r.output ?? "",
    r.kendala ?? "",
    r.foto_url ?? "",
  ];
}

/** RFC 4180 escaping. */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a UTF-8 BOM so Excel on Windows reads the accents correctly. */
export function buildCsvFromRows(
  headers: readonly string[],
  rows: (string | number)[][],
): string {
  const lines = [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function buildCsv(reports: InternshipReport[]): string {
  return buildCsvFromRows(EXPORT_HEADERS, reports.map(toExportRow));
}

/* --------------------- Export log book (audit P2-2) --------------------- */

export const LOGBOOK_EXPORT_HEADERS = [
  "No",
  "Tanggal",
  "Aktivitas Pekerjaan",
  "Hasil / Tindak Lanjut",
  "Pembimbing",
  "Jabatan Pembimbing",
  "Status Paraf",
  "Proyek",
] as const;

export function toLogbookExportRow(
  e: LogbookEntry,
  projectJudul = "",
): (string | number)[] {
  return [
    e.nomor_urut,
    e.tanggal,
    e.aktivitas_pekerjaan,
    e.hasil_tindak_lanjut ?? "",
    e.pembimbing_nama,
    e.pembimbing_jabatan ?? "",
    e.paraf_status ? "Sudah diparaf" : "Belum",
    projectJudul,
  ];
}

/** "laporan-magang-2026-08-27.xlsx" — prefix follows the letterhead judul. */
export function exportFilename(ext: string, prefix = "laporan-magang"): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}.${ext}`;
}
