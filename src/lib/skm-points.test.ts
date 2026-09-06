import { describe, expect, it } from "vitest";
import { SKM_KATEGORI } from "./constants";
import { SKM_POINT_RULES, rulesFor, suggestPoin } from "./skm-points";

describe("SKM_POINT_RULES", () => {
  it("has 18 rules across the 5 built-in categories", () => {
    expect(SKM_POINT_RULES).toHaveLength(18);
    const kategoriSet = new Set(SKM_POINT_RULES.map((r) => r.kategori));
    expect(kategoriSet.size).toBe(5);
    for (const k of SKM_KATEGORI) expect(kategoriSet.has(k.value)).toBe(true);
  });

  it("has non-negative points and unique (kategori, tingkat) pairs", () => {
    const seen = new Set<string>();
    for (const r of SKM_POINT_RULES) {
      expect(r.poin).toBeGreaterThanOrEqual(0);
      const key = `${r.kategori}|${r.tingkat}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe("rulesFor", () => {
  it("returns only rules of the requested category", () => {
    const rules = rulesFor("Prestasi / Kejuaraan");
    expect(rules).toHaveLength(5);
    expect(rules.every((r) => r.kategori === "Prestasi / Kejuaraan")).toBe(true);
  });

  it("returns an empty array for an unknown category", () => {
    expect(rulesFor("Tidak Ada")).toEqual([]);
  });
});

describe("suggestPoin", () => {
  it("returns the rule's weight for a known pair", () => {
    expect(suggestPoin("Prestasi / Kejuaraan", "Internasional — Juara 1/2/3")).toBe(25);
    expect(suggestPoin("Kepanitiaan Event", "Anggota Panitia")).toBe(3);
  });

  it("returns 0 for an unknown pair", () => {
    expect(suggestPoin("Prestasi / Kejuaraan", "Juara Dunia")).toBe(0);
    expect(suggestPoin("", "")).toBe(0);
  });
});
