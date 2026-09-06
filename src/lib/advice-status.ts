/**
 * Aturan transisi status saran (pola ADR, dok 04 §3.3). Cermin dari trigger
 * advice_guard di supabase/schema.sql — dipakai UI untuk menonaktifkan aksi
 * yang pasti ditolak server, dan diuji unit di sini.
 */
import type { AdviceStatus } from "./types";

export const ADVICE_STATUSES: AdviceStatus[] = [
  "diusulkan",
  "diadopsi",
  "ditolak",
  "di-supersede",
];

const TRANSITIONS: Record<AdviceStatus, AdviceStatus[]> = {
  diusulkan: ["diadopsi", "ditolak", "di-supersede"],
  diadopsi: ["di-supersede"],
  ditolak: [],
  "di-supersede": [],
};

export function canTransition(from: AdviceStatus, to: AdviceStatus): boolean {
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** Validasi keputusan konflik; null = sah, selain itu pesan kesalahan. */
export function validateDecision({
  winnerStatus,
  loserStatuses,
  alasan,
}: {
  winnerStatus: AdviceStatus;
  loserStatuses: AdviceStatus[];
  alasan: string;
}): string | null {
  if (!alasan.trim()) return "Alasan keputusan wajib diisi.";
  if (winnerStatus !== "diusulkan") {
    return "Pemenang konflik harus saran berstatus diusulkan.";
  }
  for (const s of loserStatuses) {
    if (!canTransition(s, "di-supersede")) {
      return `Saran berstatus ${s} tidak dapat di-supersede.`;
    }
  }
  return null;
}

export const ADVICE_STATUS_BADGE: Record<
  AdviceStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "outline" }
> = {
  diusulkan: { label: "diusulkan", variant: "warning" },
  diadopsi: { label: "diadopsi", variant: "success" },
  ditolak: { label: "ditolak", variant: "destructive" },
  "di-supersede": { label: "di-supersede", variant: "outline" },
};
