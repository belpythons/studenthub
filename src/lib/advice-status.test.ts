import { describe, expect, it } from "vitest";
import { ADVICE_STATUSES, canTransition, validateDecision } from "./advice-status";

describe("canTransition", () => {
  it("allows the ADR-legal transitions only", () => {
    expect(canTransition("diusulkan", "diadopsi")).toBe(true);
    expect(canTransition("diusulkan", "ditolak")).toBe(true);
    expect(canTransition("diusulkan", "di-supersede")).toBe(true);
    // supersede berantai: keputusan lama boleh digantikan keputusan baru
    expect(canTransition("diadopsi", "di-supersede")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(canTransition("diadopsi", "diusulkan")).toBe(false);
    expect(canTransition("diadopsi", "ditolak")).toBe(false);
    expect(canTransition("ditolak", "diadopsi")).toBe(false);
    expect(canTransition("di-supersede", "diadopsi")).toBe(false);
    for (const s of ADVICE_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });
});

describe("validateDecision", () => {
  it("accepts a valid conflict decision", () => {
    expect(
      validateDecision({
        winnerStatus: "diusulkan",
        loserStatuses: ["diusulkan", "diadopsi"],
        alasan: "Metodologi B lebih sesuai data",
      }),
    ).toBeNull();
  });

  it("requires a reason", () => {
    expect(
      validateDecision({ winnerStatus: "diusulkan", loserStatuses: [], alasan: "  " }),
    ).toMatch(/alasan/i);
  });

  it("requires the winner to still be diusulkan", () => {
    expect(
      validateDecision({ winnerStatus: "diadopsi", loserStatuses: [], alasan: "x" }),
    ).toMatch(/pemenang/i);
  });

  it("rejects losers in terminal states", () => {
    expect(
      validateDecision({
        winnerStatus: "diusulkan",
        loserStatuses: ["ditolak"],
        alasan: "x",
      }),
    ).toMatch(/ditolak/);
  });
});
