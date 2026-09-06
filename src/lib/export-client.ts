import supabase from "@/lib/supabase/client";
import { fetchFilteredReports, parseFilters, periodeLabel } from "@/lib/report-query";
import { fetchLogbook } from "@/lib/logbook-query";
import { fetchActiveProjects } from "@/lib/project-query";
import {
  EXPORT_HEADERS,
  LOGBOOK_EXPORT_HEADERS,
  buildCsv,
  buildCsvFromRows,
  exportFilename,
  toExportRow,
  toLogbookExportRow,
} from "@/lib/export";
import { computeStats, recapByKategori } from "@/lib/report-stats";
import { ORG } from "@/lib/constants";
import { fetchLetterhead } from "@/lib/letterhead";
import { argb, tint } from "@/lib/persona";
import { pluralJam } from "@/lib/format";
import type { Profile } from "@/lib/types";
import type ExcelJSType from "exceljs";

/*
  Ekspor XLSX/CSV, dulu dua route Node.

  ExcelJS berjalan penuh di peramban, dan buku kerjanya memang selalu dirakit di
  memori. Yang hilang bersama route-nya adalah readFile("public/logo.png") —
  satu-satunya sentuhan filesystem yang tersisa di aplikasi ini. Logo bawaan kini
  diambil lewat HTTP sama seperti logo unggahan.
*/

/*
  ExcelJS ~1,5 MB dan hanya dipakai saat pengguna menekan Unduh Excel. Impor
  statis membuat setiap pemuatan halaman membayarnya; impor dinamis memindahkan
  biayanya ke klik yang benar-benar membutuhkannya.
*/
async function excel() {
  return (await import("exceljs")).default as unknown as typeof ExcelJSType;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // revoke ditunda: Safari membatalkan unduhan bila URL dicabut pada tick yang
  // sama dengan kliknya.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Bita logo untuk kop buku kerja — URL bucket maupun aset bawaan.
 * Kegagalan apa pun mengembalikan null: ekspor tidak boleh mati karena gambar.
 */
async function fetchLogoBuffer(
  logoSrc: string,
): Promise<{ buffer: ArrayBuffer; extension: "png" | "jpeg" } | null> {
  try {
    const ext = /\.jpe?g(\?|$)/i.test(logoSrc)
      ? ("jpeg" as const)
      : /\.png(\?|$)/i.test(logoSrc) || logoSrc.startsWith("/")
        ? ("png" as const)
        : null;
    if (!ext) return null; // ExcelJS tidak bisa menanam SVG — kop tetap teks saja.

    const res = await fetch(logoSrc);
    if (!res.ok) return null;
    return { buffer: await res.arrayBuffer(), extension: ext };
  } catch {
    return null;
  }
}

async function currentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  return user;
}

/* ------------------------------------------------------------------ CSV */

export async function exportCsv(params: URLSearchParams) {
  const user = await currentUser();

  // Audit P2-2: export log book — dataset kedua, dulu di route yang sama.
  if (params.get("dataset") === "logbook") {
    const [entries, projects] = await Promise.all([
      fetchLogbook(supabase, user.id),
      fetchActiveProjects(supabase, user.id),
    ]);
    const byId = new Map(projects.map((p) => [p.id, p.judul]));
    const csv = buildCsvFromRows(
      LOGBOOK_EXPORT_HEADERS,
      entries.map((e) => toLogbookExportRow(e, e.project_id ? byId.get(e.project_id) ?? "" : "")),
    );
    download(new Blob([csv], { type: "text/csv;charset=utf-8" }), exportFilename("csv", "log-book"));
    return;
  }

  const filters = parseFilters(params);
  const [reports, letterhead] = await Promise.all([
    fetchFilteredReports(supabase, user.id, filters),
    fetchLetterhead(supabase, user.id),
  ]);

  download(
    new Blob([buildCsv(reports)], { type: "text/csv;charset=utf-8" }),
    exportFilename("csv", letterhead.exportFilePrefix),
  );
}

/* ----------------------------------------------------------------- XLSX */

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/*
  Garis header tebal. Workbook selalu memakai palet cetak yang terkunci
  terang, jadi ia tidak ikut berubah bersama design system antarmuka.

  Fill tetap dipertahankan: sebuah lembar XLSX tanpa blok warna pada barisnya
  jauh lebih sulit dipindai daripada halaman web tanpa blok warna, dan pembaca
  spreadsheet tidak punya hover maupun bayangan untuk menggantikannya.
*/
const HEAD_BORDER = {
  top: { style: "medium" as const },
  bottom: { style: "medium" as const },
  left: { style: "medium" as const },
  right: { style: "medium" as const },
};

export async function exportXlsx(params: URLSearchParams) {
  const user = await currentUser();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("nama_lengkap, instansi, email, tempat_kp")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as Pick<
    Profile,
    "nama_lengkap" | "instansi" | "email" | "tempat_kp"
  > | null;

  // Warna persona dipakai kedua dataset, jadi kop diambil SEBELUM cabang
  // logbook di bawah — kalau tidak, sheet Log Book tetap biru bawaan sementara
  // sisanya sudah berubah.
  const ExcelJS = await excel();
  const letterhead = await fetchLetterhead(supabase, user.id);
  const NAVY = argb(letterhead.persona.primary);
  const HEAD_BG = argb(tint(letterhead.persona.primary));

  // Audit P2-2: export log book sebagai workbook sederhana.
  if (params.get("dataset") === "logbook") {
    const [entries, projects] = await Promise.all([
      fetchLogbook(supabase, user.id),
      fetchActiveProjects(supabase, user.id),
    ]);
    const byId = new Map(projects.map((p) => [p.id, p.judul]));

    const lb = new ExcelJS.Workbook();
    lb.creator = "Task Report Magang";
    lb.created = new Date();
    const sheet = lb.addWorksheet("Log Book", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { width: 6 }, { width: 13 }, { width: 60 }, { width: 44 },
      { width: 26 }, { width: 28 }, { width: 14 }, { width: 32 },
    ];
    const lbHead = sheet.addRow([...LOGBOOK_EXPORT_HEADERS]);
    lbHead.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    lbHead.height = 22;
    lbHead.eachCell((c) => {
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      c.border = HEAD_BORDER;
    });
    for (const e of entries) {
      const row = sheet.addRow(
        toLogbookExportRow(e, e.project_id ? byId.get(e.project_id) ?? "" : ""),
      );
      row.alignment = { vertical: "top", wrapText: true };
    }
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: LOGBOOK_EXPORT_HEADERS.length },
    };

    download(
      new Blob([await lb.xlsx.writeBuffer()], { type: XLSX_MIME }),
      exportFilename("xlsx", "log-book"),
    );
    return;
  }

  const filters = parseFilters(params);
  const reports = await fetchFilteredReports(supabase, user.id, filters);
  const nama = profile?.nama_lengkap || user.email?.split("@")[0] || "Peserta";

  const wb = new ExcelJS.Workbook();
  wb.creator = "Task Report Magang";
  wb.created = new Date();

  /* ------------------------------ Sheet 1: data ------------------------------ */
  const ws = wb.addWorksheet("Laporan Kegiatan", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = [
    { width: 12 }, { width: 10 }, { width: 11 }, { width: 12 }, { width: 20 },
    { width: 44 }, { width: 56 }, { width: 40 }, { width: 32 }, { width: 44 },
  ];

  const head = ws.addRow([...EXPORT_HEADERS]);
  head.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  head.alignment = { vertical: "middle" };
  head.height = 22;
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    c.border = HEAD_BORDER;
  });

  for (const r of reports) {
    const row = ws.addRow(toExportRow(r));
    row.alignment = { vertical: "top", wrapText: true };
    row.getCell(4).numFmt = "0.00";
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: EXPORT_HEADERS.length } };

  /* ---------------------------- Sheet 2: ringkasan ---------------------------- */
  const stats = computeStats(reports);
  const sum = wb.addWorksheet("Ringkasan");
  sum.columns = [{ width: 30 }, { width: 40 }];

  // Kop bergambar (dok 03 §2.6): logo kiri-atas, judul + baris kop menyusul.
  const logo = await fetchLogoBuffer(letterhead.logoSrc);
  if (logo) {
    // ExcelJS mendeklarasikan tipe Buffer-nya sendiri.
    const imgId = wb.addImage({
      buffer: logo.buffer as unknown as ExcelJSType.Buffer,
      extension: logo.extension,
    });
    sum.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 46, height: 46 } });
    sum.addRow([]);
    sum.addRow([]);
    sum.addRow([]);
  }

  const title = sum.addRow([letterhead.judulDokumen, ""]);
  title.font = { bold: true, size: 13, color: { argb: NAVY } };
  for (const baris of letterhead.kopBaris) {
    sum.addRow([baris, ""]).font = { size: 9, color: { argb: "FF45566E" } };
  }
  sum.addRow([]);

  const info: [string, string | number][] = [
    ["Nama Peserta", nama],
    ["Instansi / Sekolah", profile?.instansi || ORG.kampus],
    ["Email", profile?.email || user.email || "-"],
    ["Tempat Kerja Praktek", profile?.tempat_kp || ORG.perusahaanMixed],
    ["Periode Kegiatan", periodeLabel(filters, reports)],
    ["Filter Kategori", filters.kategori || "Semua kategori"],
    ["", ""],
    ["Laporan Kegiatan", stats.totalLaporan],
    ["Hari Aktif", stats.hariAktif],
    ["Total Jam Kegiatan", Number(stats.totalJam.toFixed(2))],
    ["Jenis Kategori", stats.jenisKategori],
    ["Rata-rata per hari aktif", stats.rataPerHari ? pluralJam(stats.rataPerHari) : "-"],
    ["Kategori terbanyak", stats.kategoriTerbanyak ?? "-"],
    ["Kegiatan berkendala", stats.kegiatanBerkendala],
    ["Kegiatan berfoto", stats.kegiatanBerfoto],
  ];

  for (const [k, v] of info) {
    const row = sum.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 10 };
  }

  sum.addRow([]);
  const katHead = sum.addRow(["Rekap per Kategori", "Jumlah / Durasi"]);
  katHead.font = { bold: true, color: { argb: NAVY } };
  katHead.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_BG } };
    c.border = HEAD_BORDER;
  });

  for (const k of recapByKategori(reports)) {
    sum.addRow([
      k.kategori,
      `${k.jumlah} kegiatan · ${k.jam ? pluralJam(k.jam) : "-"} · ${k.porsi.toFixed(1)}%`,
    ]);
  }

  download(
    new Blob([await wb.xlsx.writeBuffer()], { type: XLSX_MIME }),
    exportFilename("xlsx", letterhead.exportFilePrefix),
  );
}
