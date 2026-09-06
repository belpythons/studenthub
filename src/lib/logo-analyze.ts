/**
 * Analisis piksel logo — bagian murni dari POST /api/onboarding/logo.
 *
 * Sengaja menerima RGBA mentah, bukan buffer gambar: dekode PNG ditangani sharp
 * di rute, sedangkan modul ini teruji tanpa sharp dan tanpa berkas fixture.
 */

import { rgbToHex, rgbToHsl } from "./persona";

export interface Swatch {
  hex: string;
  /** Porsi piksel berwarna yang jatuh ke ember ini, 0–1. */
  share: number;
}

/** Di bawah ini dianggap transparan penuh. */
const ALPHA_CLEAR = 16;
/** Di bawah ini warnanya tidak dipercaya — tepi anti-alias berbohong. */
const ALPHA_SOLID = 200;

/**
 * Porsi piksel transparan pada cincin `ring` piksel terluar, 0–1.
 *
 * Inilah penegak aturan "PNG tanpa background": logo berlatar putih atau kotak
 * berwarna akan mendekati 0, logo yang benar mendekati 1.
 */
export function edgeTransparency(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  ring = 2,
): number {
  if (w <= 0 || h <= 0) return 0;

  let total = 0;
  let clear = 0;

  for (let y = 0; y < h; y++) {
    const onEdgeRow = y < ring || y >= h - ring;
    for (let x = 0; x < w; x++) {
      if (!onEdgeRow && x >= ring && x < w - ring) continue;
      total++;
      if (rgba[(y * w + x) * 4 + 3] < ALPHA_CLEAR) clear++;
    }
  }

  return total ? clear / total : 0;
}

interface Bucket {
  r: number;
  g: number;
  b: number;
  n: number;
}

function collect(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  skipDull: boolean,
): Map<number, Bucket> {
  const buckets = new Map<number, Bucket>();

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (rgba[o + 3] < ALPHA_SOLID) continue;

    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];

    if (skipDull) {
      const [, s, l] = rgbToHsl(r, g, b);
      if (l > 0.92 || l < 0.06 || s < 0.12) continue;
    }

    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const cur = buckets.get(key);
    if (cur) {
      cur.r += r;
      cur.g += g;
      cur.b += b;
      cur.n++;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
  }

  return buckets;
}

/**
 * Warna dominan logo, terbanyak dulu.
 *
 * Piksel semi-transparan, nyaris putih, nyaris hitam, dan nyaris abu dibuang
 * lebih dulu. Bila penyaringan itu menyisakan nol piksel — lambang monokrom
 * hitam atau abu polos, sangat umum di kampus — lintasan kedua dijalankan
 * hanya dengan penyaringan alpha, supaya pemilih warna tidak pernah kosong.
 */
export function dominantColors(
  rgba: Uint8Array | Uint8ClampedArray,
  w: number,
  h: number,
  n = 5,
): Swatch[] {
  let buckets = collect(rgba, w, h, true);
  if (buckets.size === 0) buckets = collect(rgba, w, h, false);
  if (buckets.size === 0) return [];

  const total = Array.from(buckets.values()).reduce((sum, k) => sum + k.n, 0);

  const ranked = Array.from(buckets.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, 20)
    .map((k) => ({
      hex: rgbToHex(k.r / k.n, k.g / k.n, k.b / k.n),
      count: k.n,
    }));

  // ponytail: gabung O(k²) atas ≤20 ember — struktur data yang lebih pintar
  // hanya membayar dirinya di atas ribuan ember.
  const merged: { hex: string; count: number; hsl: [number, number, number] }[] = [];
  for (const c of ranked) {
    const hsl = rgbToHsl(
      parseInt(c.hex.slice(1, 3), 16),
      parseInt(c.hex.slice(3, 5), 16),
      parseInt(c.hex.slice(5, 7), 16),
    );
    const near = merged.find((m) => {
      const dh = Math.abs(m.hsl[0] - hsl[0]);
      return Math.min(dh, 360 - dh) < 12 && Math.abs(m.hsl[2] - hsl[2]) < 0.12;
    });
    if (near) near.count += c.count;
    else merged.push({ hex: c.hex, count: c.count, hsl });
  }

  return merged
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((m) => ({ hex: m.hex, share: m.count / total }));
}
