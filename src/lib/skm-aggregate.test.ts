import { describe, expect, it } from "vitest";
import { aggregateSkm, persenTarget } from "./skm-aggregate";

const acts = [
  { kategori: "Prestasi / Kejuaraan", poin_skm: 20, jam_sosial: null },
  { kategori: "Prestasi / Kejuaraan", poin_skm: 25, jam_sosial: null },
  { kategori: "Pengalaman Organisasi", poin_skm: 12, jam_sosial: 5 },
  { kategori: "Kepanitiaan Event", poin_skm: null, jam_sosial: 2.5 },
];

describe("aggregateSkm", () => {
  it("totals and counts per category without rules", () => {
    const agg = aggregateSkm(acts);
    expect(agg.totalRaw).toBe(57);
    expect(agg.totalEfektif).toBe(57);
    expect(agg.totalJamSosial).toBe(7.5);
    expect(agg.countByKategori).toEqual({
      "Prestasi / Kejuaraan": 2,
      "Pengalaman Organisasi": 1,
      "Kepanitiaan Event": 1,
    });
  });

  it("applies cap_kategori and flags the overflow", () => {
    const agg = aggregateSkm(acts, [
      { kategori: "Prestasi / Kejuaraan", cap_kategori: 30 },
      { kategori: "Pengalaman Organisasi", cap_kategori: null },
    ]);
    const prestasi = agg.perKategori.find((k) => k.kategori === "Prestasi / Kejuaraan")!;
    expect(prestasi.poinRaw).toBe(45);
    expect(prestasi.poinEfektif).toBe(30);
    expect(prestasi.terlampaui).toBe(true);
    expect(agg.totalRaw).toBe(57);
    expect(agg.totalEfektif).toBe(42);
  });

  it("handles empty input", () => {
    const agg = aggregateSkm([]);
    expect(agg.totalRaw).toBe(0);
    expect(agg.totalEfektif).toBe(0);
    expect(agg.totalJamSosial).toBe(0);
    expect(agg.perKategori).toEqual([]);
  });
});

describe("persenTarget", () => {
  it("normalises to the persona target and clamps at 100", () => {
    expect(persenTarget(42, 60)).toBe(70);
    expect(persenTarget(4300, 1000)).toBe(100);
    expect(persenTarget(0, 50)).toBe(0);
    expect(persenTarget(10, 0)).toBe(0);
  });
});
