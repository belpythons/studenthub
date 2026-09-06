/**
 * Persona kampus — warna merek per pengguna.
 *
 * Sumber kebenarannya dua heks pada `letterhead_settings`, dengan peran tetap:
 *
 *   primary  = jangkar gelap  → --navy (kop cetak, bilah seksi, sidebar)
 *   accent   = warna kerja    → --blue dan --primary (tombol, tautan, fokus)
 *
 * Pasangan bawaan #001e41 / #0057a8 adalah nilai yang sudah tertanam di
 * globals.css, sehingga `personaVars(DEFAULT_PERSONA)` menghasilkan token yang
 * sama persis dengan hari ini dan `personaCss` mengembalikan string kosong.
 */

export interface Persona {
  /** Jangkar gelap, "#rrggbb". */
  primary: string;
  /** Warna kerja, "#rrggbb". */
  accent: string;
}

/** Biru PT Badak NGL — nilai yang tertanam di globals.css sejak awal. */
export const DEFAULT_PERSONA: Persona = Object.freeze({
  primary: "#001e41",
  accent: "#0057a8",
});

/* --------------------------------------------------------------------------
   Konversi dasar
   -------------------------------------------------------------------------- */

/** Normalisasi "#abc" / "ABC123" / "#abc123" → "#abc123", atau null. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`;
  return null;
}

function toRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? DEFAULT_PERSONA.primary;
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** HSL dengan h 0–360, s/l 0–1. */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;

  return [h, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = l - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** Luminansi relatif WCAG 2.1, 0–1. */
function relLuminance(r: number, g: number, b: number): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relLuminance(...toRgb(hexA));
  const lb = relLuminance(...toRgb(hexB));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* --------------------------------------------------------------------------
   Penjepitan
   -------------------------------------------------------------------------- */

/**
 * Menggeser lightness sampai luminansi relatif masuk [min, max].
 *
 * Sengaja menjepit luminansi, bukan lightness HSL: `L` tidak melacak terang
 * yang dipersepsi lintas hue — hsl(50 100% 46%) kuning menyilaukan sementara
 * hsl(209 100% 46%) biru nyaman, jadi menjepit `L` justru meleset persis pada
 * kasus logo kuning pucat yang menjadi alasan penjepitan ini ada.
 *
 * ponytail: pindai 1% per langkah (≤100 iterasi aritmetika murni); pencari akar
 * hanya akan lebih pendek dibaca, bukan lebih pendek ditulis.
 */
export function fitLuminance(hex: string, min: number, max: number): string {
  const [h, s, l0] = rgbToHsl(...toRgb(hex));
  let l = l0;

  while (relLuminance(...hslToRgb(h, s, l)) > max && l > 0.02) l -= 0.01;
  while (relLuminance(...hslToRgb(h, s, l)) < min && l < 0.98) l += 0.01;

  return rgbToHex(...hslToRgb(h, s, l));
}

/** Warna kerja tema terang: kontras ≥ 4,5:1 vs putih, teks putih selalu aman. */
const LIGHT_MIN = 0.008;
const LIGHT_MAX = 0.175;
/** Tema gelap: kontras ≥ 4,5:1 vs --background gelap (218 45% 9%, lum 0,0068). */
const DARK_MIN = 0.22;
const DARK_MAX = 0.62;
/** Jangkar gelap — cukup pekat untuk menyandang teks putih di kop cetak. */
const ANCHOR_MAX = 0.05;

/* --------------------------------------------------------------------------
   Turunan
   -------------------------------------------------------------------------- */

/** Triplet HSL yang dipahami shadcn: "209 100% 33%". */
export function hexToHslTriplet(hex: string): string {
  const [h, s, l] = rgbToHsl(...toRgb(hex));
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslTriplet(h: number, s: number, l: number): string {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/** Jangkar gelap dari sebuah warna kerja — jarak #0057a8 → #001e41. */
export function deriveAnchor(accent: string): string {
  return fitLuminance(accent, 0, ANCHOR_MAX);
}

/** Warna kerja dari sebuah jangkar — kebalikan deriveAnchor. */
export function deriveAccent(primary: string): string {
  const [h, s, l] = rgbToHsl(...toRgb(primary));
  return fitLuminance(
    rgbToHex(...hslToRgb(h, Math.max(s, 0.55), Math.min(l + 0.2, 0.55))),
    LIGHT_MIN,
    LIGHT_MAX,
  );
}

/**
 * Menyusun persona dari 1–2 swatch pilihan pengguna.
 *
 * Yang lebih gelap menjadi jangkar, yang lebih terang menjadi warna kerja —
 * urutan klik tidak menentukan, jadi pengguna tidak bisa salah pilih.
 */
export function makePersona(hexes: string[]): Persona | null {
  const valid = hexes.map(normalizeHex).filter((h): h is string => h !== null);
  if (!valid.length) return null;

  if (valid.length === 1) {
    const accent = fitLuminance(valid[0], LIGHT_MIN, LIGHT_MAX);
    return { primary: deriveAnchor(valid[0]), accent };
  }

  const sorted = valid
    .slice(0, 2)
    .sort((a, b) => relLuminance(...toRgb(a)) - relLuminance(...toRgb(b)));
  return {
    primary: fitLuminance(sorted[0], 0, ANCHOR_MAX),
    accent: fitLuminance(sorted[1], LIGHT_MIN, LIGHT_MAX),
  };
}

/** Tint sangat terang dari sebuah warna — latar baris header tabel. */
export function tint(hex: string): string {
  const [h, s] = rgbToHsl(...toRgb(hex));
  return rgbToHex(...hslToRgb(h, Math.min(s, 0.3), 0.95));
}

/** ARGB ExcelJS: "#001e41" → "FF001E41". */
export function argb(hex: string): string {
  return `FF${(normalizeHex(hex) ?? DEFAULT_PERSONA.primary).slice(1).toUpperCase()}`;
}

export function isDefaultPersona(p: Persona): boolean {
  return (
    normalizeHex(p.primary) === DEFAULT_PERSONA.primary &&
    normalizeHex(p.accent) === DEFAULT_PERSONA.accent
  );
}

/**
 * Token tema terang. Dipakai apa adanya sebagai atribut `style` pada
 * `.print-root` — atribut style menang tanpa syarat atas blok token
 * `.print-root` di print.css, yang kelas spesifisitasnya sama.
 */
export function personaVars(p: Persona): Record<string, string> {
  const anchor = fitLuminance(p.primary, 0, ANCHOR_MAX);
  const work = fitLuminance(p.accent, LIGHT_MIN, LIGHT_MAX);
  const [h, s] = rgbToHsl(...toRgb(work));
  const sPct = s * 100;

  return {
    "--primary": hexToHslTriplet(work),
    "--primary-foreground": "0 0% 100%",

    /*
      --ring ikut, berbeda dari sistem neubrutalism sebelumnya.

      Dulu garis fokus adalah outline hitam padat dan sengaja dikunci: mewarnainya
      dengan warna kampus akan membuat kontrasnya bergantung pada logo yang
      diunggah. Sekarang warna kerja sudah melewati fitLuminance ke rentang
      LIGHT_MIN..LIGHT_MAX, yang menjamin ≥4:1 terhadap --background — jauh di
      atas ambang 3:1 WCAG 1.4.11 untuk komponen non-teks. Logo kuning pucat pun
      dijepit gelap sebelum sampai ke sini.
    */
    "--ring": hexToHslTriplet(work),

    // Sidebar tetap blok gelap; hanya penanda item aktif yang mengikuti kampus.
    "--sidebar-accent": hexToHslTriplet(work),

    // Netral sejuk dengan sedikit dorongan hue kampus. Lightness dan batas
    // saturasinya mengikuti skala claymorphism di globals.css (91/93/89).
    "--secondary": hslTriplet(h, Math.min(sPct, 28), 91),
    "--secondary-foreground": "222 25% 14%",
    "--muted": hslTriplet(h, Math.min(sPct, 26), 93),
    "--accent": hslTriplet(h, Math.min(sPct, 32), 89),
    "--accent-foreground": "222 25% 14%",

    // Heks merek — print.css membaca ketiganya lewat var().
    "--navy": anchor,
    "--navy-hsl": hexToHslTriplet(anchor),
    "--blue": work,
  };
}

/** Override khusus tema gelap. Heks merek sengaja tidak ikut. */
function personaVarsDark(p: Persona): Record<string, string> {
  const work = fitLuminance(p.accent, DARK_MIN, DARK_MAX);
  const [h, s] = rgbToHsl(...toRgb(work));
  const sPct = s * 100;

  return {
    "--primary": hexToHslTriplet(work),
    "--primary-foreground": "222 30% 10%",
    "--ring": hexToHslTriplet(work),
    "--sidebar-accent": hexToHslTriplet(work),
    // Skala gelap claymorphism di globals.css: 22 / 20 / 26.
    "--secondary": hslTriplet(h, Math.min(sPct, 18), 22),
    "--muted": hslTriplet(h, Math.min(sPct, 18), 20),
    "--accent": hslTriplet(h, Math.min(sPct, 18), 26),
    "--accent-foreground": "220 25% 94%",
    "--secondary-foreground": "220 25% 94%",
  };
}

function block(selector: string, vars: Record<string, string>): string {
  return `${selector}{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";")}}`;
}

/**
 * CSS override tingkat dokumen. Wajib berupa elemen `<style>`, bukan atribut
 * style pada pembungkus: Radix mem-portal dialog/sheet/dropdown ke
 * `document.body`, di luar subtree layout.
 *
 * `html:root` (0,1,1) dan `html:root.dark` (0,2,1) mengalahkan `:root` dan
 * `.dark` milik globals.css tanpa bergantung pada urutan bundel.
 *
 * Mengembalikan "" untuk persona bawaan — nol diff bagi pengguna lama.
 */
export function personaCss(p: Persona): string {
  if (isDefaultPersona(p)) return "";
  return block("html:root", personaVars(p)) + block("html:root.dark", personaVarsDark(p));
}
