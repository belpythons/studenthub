import { describe, expect, it } from "vitest";

import {
  DEFAULT_PERSONA,
  argb,
  contrastRatio,
  deriveAnchor,
  hexToHslTriplet,
  hslToRgb,
  isDefaultPersona,
  makePersona,
  normalizeHex,
  personaCss,
  personaVars,
  rgbToHex,
  tint,
} from "./persona";


/** "209 100% 33%" -> "#0057a8". Membalik hexToHslTriplet untuk keperluan uji. */
function hslTripletToHex(triplet: string): string {
  const [h, s, l] = triplet.split(" ").map((v) => parseFloat(v));
  return rgbToHex(...hslToRgb(h, s / 100, l / 100));
}

describe("normalizeHex", () => {
  it("menerima bentuk pendek, panjang, dan tanpa pagar", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("0057A8")).toBe("#0057a8");
    expect(normalizeHex(" #0057a8 ")).toBe("#0057a8");
  });

  it("menolak yang bukan warna", () => {
    expect(normalizeHex("merah")).toBeNull();
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });
});

describe("persona bawaan adalah titik tetap", () => {
  // Jaminan nol-regresi: pengguna tanpa persona harus merender identik dengan
  // nilai yang tertulis di globals.css.
  const vars = personaVars(DEFAULT_PERSONA);

  it("mempertahankan heks merek apa adanya", () => {
    expect(vars["--navy"]).toBe("#001e41");
    expect(vars["--blue"]).toBe("#0057a8");
  });

  it("menghasilkan triplet --primary yang sama dengan globals.css", () => {
    expect(vars["--primary"]).toBe("209 100% 33%");
  });

  it("mewarnai --ring, tapi tidak pernah di bawah ambang kontras", () => {
    /*
      Kebalikan dari aturan lama: pada design system neubrutalism --ring sengaja
      dikunci hitam, karena garis fokus berwarna kampus akan membuat kontrasnya
      bergantung pada logo yang diunggah. Sekarang warna kerja sudah melewati
      fitLuminance sebelum sampai ke sini, jadi yang perlu dijaga bukan "jangan
      disentuh" melainkan ambangnya — 3:1 untuk komponen non-teks (WCAG 1.4.11).

      Diuji dengan kasus terburuk yang bisa diunggah pengguna: kuning pucat, yang
      dulu jadi alasan --ring dikunci sama sekali.
    */
    expect(vars["--ring"]).toBe(vars["--primary"]);

    for (const accent of ["#c2185b", "#ffe680", "#fefefe", "#050505"]) {
      const ring = personaVars({ primary: deriveAnchor(accent), accent });
      // Latar terang claymorphism: hsl(220 30% 95%) ≈ #eef1f6.
      expect(contrastRatio(hslTripletToHex(ring["--ring"]), "#eef1f6")).toBeGreaterThanOrEqual(3);
    }
  });

  it("mengarahkan warna kampus ke penanda sidebar, bukan blok sidebar", () => {
    // Sidebar tetap blok gelap padat; hanya item aktif yang mengikuti kampus.
    const css = personaCss({ primary: "#7a0f2b", accent: "#c2185b" });
    expect(css).toContain("--sidebar-accent");
    expect(css).not.toContain("--sidebar:");
  });

  it("tidak mengemit CSS sama sekali", () => {
    expect(personaCss(DEFAULT_PERSONA)).toBe("");
    expect(isDefaultPersona(DEFAULT_PERSONA)).toBe(true);
  });
});

describe("fitLuminance menjaga keterbacaan", () => {
  it("menggelapkan kuning pucat sampai teks putih aman", () => {
    const p = makePersona(["#ffff00"])!;
    expect(contrastRatio(p.accent, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("mengangkat hitam murni dari nol pada tema terang", () => {
    const p = makePersona(["#000000"])!;
    expect(p.accent).not.toBe("#000000");
    expect(contrastRatio(p.accent, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("memberi --primary tema gelap kontras cukup di atas latar gelap", () => {
    // #0d1421 ≈ hsl(218 45% 9%), nilai --background tema gelap.
    const css = personaCss({ primary: "#123456", accent: "#123456" });
    const dark = css.slice(css.indexOf("html:root.dark"));
    const triplet = /--primary:([^;}]+)/.exec(dark)![1];
    const [h, s, l] = triplet.split(" ").map((v) => parseFloat(v));
    const hex = hslHex(h, s / 100, l / 100);
    expect(contrastRatio(hex, "#0d1421")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("makePersona", () => {
  it("menurunkan jangkar gelap saat hanya satu warna dipilih", () => {
    const p = makePersona(["#0057a8"])!;
    expect(p.accent).toBe("#0057a8");
    expect(p.primary).toBe(deriveAnchor("#0057a8"));
    expect(contrastRatio(p.primary, "#ffffff")).toBeGreaterThan(
      contrastRatio(p.accent, "#ffffff"),
    );
  });

  it("mengurut dua warna berdasar luminansi, bukan urutan klik", () => {
    const a = makePersona(["#e3001b", "#1a1a2e"])!;
    const b = makePersona(["#1a1a2e", "#e3001b"])!;
    expect(a).toEqual(b);
  });

  it("mengembalikan null tanpa warna sah", () => {
    expect(makePersona([])).toBeNull();
    expect(makePersona(["bukan-warna"])).toBeNull();
  });
});

describe("turunan ekspor", () => {
  it("argb memakai format ExcelJS", () => {
    expect(argb("#001e41")).toBe("FF001E41");
    expect(argb("bukan-warna")).toBe("FF001E41");
  });

  it("tint jauh lebih terang dari sumbernya", () => {
    expect(contrastRatio(tint("#0057a8"), "#ffffff")).toBeLessThan(1.4);
  });

  it("hexToHslTriplet membulatkan ke bentuk yang dipakai shadcn", () => {
    expect(hexToHslTriplet("#0057a8")).toBe("209 100% 33%");
  });
});

/** Konversi HSL → heks lokal untuk test; produksi memakai hslToRgb. */
function hslHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = l - c / 2;
  const f = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}
