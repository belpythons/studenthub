const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Parses "YYYY-MM-DD" without letting the local timezone shift the day. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 2026-08-27 -> "27 Agustus 2026" */
export function formatTanggal(iso?: string | null): string {
  if (!iso) return "-";
  const d = parseISODate(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** 2026-08-27 -> "Kamis, 27/08/2026" — the Formulir 2 "Hari / Tanggal" column. */
export function formatHariTanggal(iso?: string | null): string {
  if (!iso) return "-";
  const d = parseISODate(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${HARI[d.getDay()]}, ${dd}/${mm}/${d.getFullYear()}`;
}

/** 2026-08 -> "Agustus 2026" */
export function formatBulan(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${BULAN[(m ?? 1) - 1]} ${y}`;
}

/** 2026-08-27 -> "Agu 2026" — LinkedIn date lines. */
export function formatBulanSingkat(iso?: string | null): string {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "08:30:00" -> "08:30" */
export function formatJam(t?: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

/**
 * "07:00" + "16:00" -> "07:00–16:00", or "-" when neither is set.
 * An overnight span is marked so a reader does not think it is a typo.
 */
export function formatRentangJam(mulai?: string | null, selesai?: string | null): string {
  const a = formatJam(mulai);
  const b = formatJam(selesai);
  if (a && b) return isOvernight(mulai, selesai) ? `${a}–${b} (+1 hari)` : `${a}–${b}`;
  return a || b || "-";
}

/** True when the end time is earlier than the start, i.e. the shift crosses midnight. */
export function isOvernight(mulai?: string | null, selesai?: string | null): boolean {
  if (!mulai || !selesai) return false;
  return selesai < mulai;
}

/**
 * Duration in hours between two "HH:MM" times.
 *
 * A negative span is read as a shift that crosses midnight (22:00 -> 06:00 is
 * 8 hours, not 0). Night-shift participants previously could not record hours
 * at all: the form rejected the input and this function returned 0.
 */
export function durasiJam(mulai?: string | null, selesai?: string | null): number {
  if (!mulai || !selesai) return 0;
  const [h1, m1] = mulai.split(":").map(Number);
  const [h2, m2] = selesai.split(":").map(Number);
  let mins = h2 * 60 + m2 - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

/** Print-footer timestamp: "27 Agustus 2026 01:49" */
export function formatTimestamp(d: Date): string {
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} ${jam}:${menit}`;
}

/** Today as "YYYY-MM-DD" in local time. */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function pluralJam(n: number): string {
  return `${n.toFixed(1).replace(/\.0$/, "")} Jam`;
}
