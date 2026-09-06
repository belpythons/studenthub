import { describe, expect, it } from "vitest";
import {
  durasiJam,
  formatBulan,
  formatBulanSingkat,
  formatHariTanggal,
  formatJam,
  formatRentangJam,
  formatTanggal,
  isOvernight,
  parseISODate,
  pluralJam,
  todayISO,
} from "./format";

describe("parseISODate / formatTanggal", () => {
  it("parses without timezone day-shift", () => {
    const d = parseISODate("2026-08-27");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(27);
  });

  it("formats Indonesian long dates", () => {
    expect(formatTanggal("2026-08-27")).toBe("27 Agustus 2026");
    expect(formatTanggal(null)).toBe("-");
    expect(formatTanggal("")).toBe("-");
  });
});

describe("formatHariTanggal", () => {
  it("renders the Formulir 2 day/date column", () => {
    // 2026-08-27 is a Thursday
    expect(formatHariTanggal("2026-08-27")).toBe("Kamis, 27/08/2026");
    expect(formatHariTanggal(null)).toBe("-");
  });
});

describe("formatBulan / formatBulanSingkat", () => {
  it("formats month labels", () => {
    expect(formatBulan("2026-08")).toBe("Agustus 2026");
    expect(formatBulanSingkat("2026-08-27")).toBe("Agu 2026");
    expect(formatBulanSingkat(null)).toBe("");
  });
});

describe("jam helpers", () => {
  it("formatJam trims seconds", () => {
    expect(formatJam("08:30:00")).toBe("08:30");
    expect(formatJam(null)).toBe("");
  });

  it("formatRentangJam handles both, one, or no ends", () => {
    expect(formatRentangJam("07:00", "16:00")).toBe("07:00–16:00");
    expect(formatRentangJam("07:00", null)).toBe("07:00");
    expect(formatRentangJam(null, null)).toBe("-");
  });

  it("marks overnight spans", () => {
    expect(isOvernight("22:00", "06:00")).toBe(true);
    expect(isOvernight("08:00", "16:00")).toBe(false);
    expect(formatRentangJam("22:00", "06:00")).toBe("22:00–06:00 (+1 hari)");
  });

  it("durasiJam adds 24h to negative (night-shift) spans", () => {
    expect(durasiJam("08:00", "16:30")).toBe(8.5);
    expect(durasiJam("22:00", "06:00")).toBe(8);
    expect(durasiJam(null, "06:00")).toBe(0);
  });
});

describe("todayISO", () => {
  it("returns local YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("pluralJam", () => {
  it("drops a trailing .0", () => {
    expect(pluralJam(8)).toBe("8 Jam");
    expect(pluralJam(8.5)).toBe("8.5 Jam");
  });
});
