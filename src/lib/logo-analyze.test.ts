import { describe, expect, it } from "vitest";

import { dominantColors, edgeTransparency } from "./logo-analyze";

/** Kanvas RGBA w×h, seluruhnya transparan. */
function canvas(w: number, h: number): Uint8Array {
  return new Uint8Array(w * h * 4);
}

function fill(
  px: Uint8Array,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  [r, g, b, a]: [number, number, number, number],
) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * w + x) * 4;
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = a;
    }
  }
}

describe("edgeTransparency", () => {
  it("bernilai 1 untuk logo di dalam bingkai transparan", () => {
    const px = canvas(16, 16);
    fill(px, 16, 4, 4, 12, 12, [255, 0, 0, 255]);
    expect(edgeTransparency(px, 16, 16)).toBe(1);
  });

  it("bernilai 0 untuk gambar yang sepenuhnya opak", () => {
    const px = canvas(16, 16);
    fill(px, 16, 0, 0, 16, 16, [255, 255, 255, 255]);
    expect(edgeTransparency(px, 16, 16)).toBe(0);
  });

  it("jatuh di bawah ambang 0,95 saat hanya sudutnya yang transparan", () => {
    const px = canvas(16, 16);
    fill(px, 16, 0, 0, 16, 16, [255, 255, 255, 255]);
    fill(px, 16, 0, 0, 3, 3, [0, 0, 0, 0]);
    expect(edgeTransparency(px, 16, 16)).toBeLessThan(0.95);
  });
});

describe("dominantColors", () => {
  it("menemukan warna logo dan mengabaikan latar transparan", () => {
    const px = canvas(16, 16);
    fill(px, 16, 4, 4, 12, 12, [255, 0, 0, 255]);
    const [top] = dominantColors(px, 16, 16);
    expect(top.hex).toBe("#ff0000");
    expect(top.share).toBe(1);
  });

  it("mengurut berdasar luas, terbanyak dulu", () => {
    const px = canvas(16, 16);
    fill(px, 16, 2, 2, 14, 10, [0, 87, 168, 255]);
    fill(px, 16, 2, 10, 14, 14, [227, 0, 27, 255]);
    const out = dominantColors(px, 16, 16);
    expect(out[0].hex).toBe("#0057a8");
    expect(out[1].hex).toBe("#e3001b");
    expect(out[0].share).toBeGreaterThan(out[1].share);
  });

  it("menggabung dua nuansa berdekatan jadi satu swatch", () => {
    const px = canvas(16, 16);
    fill(px, 16, 2, 2, 8, 14, [0, 87, 168, 255]);
    fill(px, 16, 8, 2, 14, 14, [0, 90, 172, 255]);
    expect(dominantColors(px, 16, 16)).toHaveLength(1);
  });

  it("lintasan cadangan tetap memberi swatch untuk lambang monokrom", () => {
    // Abu netral: saturasi 0 dan lightness tinggi — dibuang lintasan pertama.
    const px = canvas(16, 16);
    fill(px, 16, 4, 4, 12, 12, [245, 245, 245, 255]);
    const out = dominantColors(px, 16, 16);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].hex).toBe("#f5f5f5");
  });

  it("mengembalikan larik kosong untuk gambar transparan total", () => {
    expect(dominantColors(canvas(8, 8), 8, 8)).toEqual([]);
  });

  it("mengabaikan tepi anti-alias yang setengah transparan", () => {
    const px = canvas(16, 16);
    fill(px, 16, 4, 4, 12, 12, [0, 87, 168, 255]);
    fill(px, 16, 3, 3, 4, 13, [255, 255, 0, 120]); // pinggiran semi-transparan
    const out = dominantColors(px, 16, 16);
    expect(out.map((s) => s.hex)).not.toContain("#ffff00");
  });
});
