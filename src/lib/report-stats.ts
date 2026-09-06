import { durasiJam } from "./format";
import type { InternshipReport } from "./types";

export interface ReportStats {
  /** Card 1 — total entries in range */
  totalLaporan: number;
  /** Card 2 — unique dates */
  hariAktif: number;
  /** Card 3 — sum of (jam_selesai - jam_mulai) */
  totalJam: number;
  /** Card 4 — distinct categories used */
  jenisKategori: number;
  /** Total jam / hari aktif */
  rataPerHari: number;
  kategoriTerbanyak: string | null;
  kegiatanBerkendala: number;
  kegiatanBerfoto: number;
}

export interface KategoriRow {
  kategori: string;
  jumlah: number;
  jam: number;
  /** Share of total entries, 0-100 */
  porsi: number;
}

export interface BulanRow {
  /** "YYYY-MM" */
  bulan: string;
  jumlah: number;
  jam: number;
}

/** Section II of the recap — modul-task-report/03-FITUR-DASHBOARD-EXPORT.md */
export function computeStats(reports: InternshipReport[]): ReportStats {
  const hari = new Set(reports.map((r) => r.tanggal));
  const kategoriCount = new Map<string, number>();
  let totalJam = 0;
  let berkendala = 0;
  let berfoto = 0;

  for (const r of reports) {
    totalJam += durasiJam(r.jam_mulai, r.jam_selesai);
    kategoriCount.set(r.kategori, (kategoriCount.get(r.kategori) ?? 0) + 1);
    if (r.kendala?.trim()) berkendala++;
    if (r.foto_url) berfoto++;
  }

  let kategoriTerbanyak: string | null = null;
  let max = 0;
  for (const [k, n] of kategoriCount) {
    if (n > max) {
      max = n;
      kategoriTerbanyak = k;
    }
  }

  return {
    totalLaporan: reports.length,
    hariAktif: hari.size,
    totalJam,
    jenisKategori: kategoriCount.size,
    rataPerHari: hari.size ? totalJam / hari.size : 0,
    kategoriTerbanyak,
    kegiatanBerkendala: berkendala,
    kegiatanBerfoto: berfoto,
  };
}

/** Section III — recap per category, busiest first. */
export function recapByKategori(reports: InternshipReport[]): KategoriRow[] {
  const map = new Map<string, KategoriRow>();

  for (const r of reports) {
    const row = map.get(r.kategori) ?? { kategori: r.kategori, jumlah: 0, jam: 0, porsi: 0 };
    row.jumlah++;
    row.jam += durasiJam(r.jam_mulai, r.jam_selesai);
    map.set(r.kategori, row);
  }

  const rows = Array.from(map.values());
  for (const row of rows) {
    row.porsi = reports.length ? (row.jumlah / reports.length) * 100 : 0;
  }
  return rows.sort((a, b) => b.jumlah - a.jumlah);
}

/** Section IV — recap per month, chronological. */
export function recapByBulan(reports: InternshipReport[]): BulanRow[] {
  const map = new Map<string, BulanRow>();

  for (const r of reports) {
    const bulan = r.tanggal.slice(0, 7);
    const row = map.get(bulan) ?? { bulan, jumlah: 0, jam: 0 };
    row.jumlah++;
    row.jam += durasiJam(r.jam_mulai, r.jam_selesai);
    map.set(bulan, row);
  }

  return Array.from(map.values()).sort((a, b) => a.bulan.localeCompare(b.bulan));
}

/** Section V — the activity list, grouped by month, oldest month first. */
export function groupByBulan<T extends { tanggal: string }>(reports: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();

  for (const r of reports) {
    const bulan = r.tanggal.slice(0, 7);
    const list = map.get(bulan) ?? [];
    list.push(r);
    map.set(bulan, list);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bulan, list]) => [bulan, list.sort((x, y) => x.tanggal.localeCompare(y.tanggal))]);
}
