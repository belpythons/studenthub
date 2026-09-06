/**
 * Satu-satunya tempat agregasi poin SKM (audit P2-4) — dipakai halaman SKM,
 * dashboard, dan portfolioMarkdown, sehingga cap kategori cukup hidup di sini.
 */

export interface AggregatableActivity {
  kategori: string;
  poin_skm: number | null;
  jam_sosial?: number | null;
}

export interface CapRule {
  kategori: string;
  cap_kategori: number | null;
}

export interface KategoriAggregate {
  kategori: string;
  jumlah: number;
  poinRaw: number;
  /** Poin setelah cap kategori (bila persona menetapkan cap). */
  poinEfektif: number;
  cap: number | null;
  terlampaui: boolean;
}

export interface SkmAggregate {
  totalRaw: number;
  /** Total setelah cap per kategori — angka yang dibandingkan ke target. */
  totalEfektif: number;
  totalJamSosial: number;
  countByKategori: Record<string, number>;
  perKategori: KategoriAggregate[];
}

export function aggregateSkm(
  activities: AggregatableActivity[],
  rules: CapRule[] = [],
): SkmAggregate {
  const capByKategori = new Map<string, number>();
  for (const r of rules) {
    if (r.cap_kategori != null && !capByKategori.has(r.kategori)) {
      capByKategori.set(r.kategori, r.cap_kategori);
    }
  }

  const byKategori = new Map<string, { jumlah: number; poin: number }>();
  let totalJamSosial = 0;
  for (const a of activities) {
    const g = byKategori.get(a.kategori) ?? { jumlah: 0, poin: 0 };
    g.jumlah += 1;
    g.poin += a.poin_skm ?? 0;
    byKategori.set(a.kategori, g);
    totalJamSosial += Number(a.jam_sosial ?? 0);
  }

  const perKategori: KategoriAggregate[] = Array.from(byKategori.entries()).map(
    ([kategori, g]) => {
      const cap = capByKategori.get(kategori) ?? null;
      const poinEfektif = cap != null ? Math.min(g.poin, cap) : g.poin;
      return {
        kategori,
        jumlah: g.jumlah,
        poinRaw: g.poin,
        poinEfektif,
        cap,
        terlampaui: cap != null && g.poin > cap,
      };
    },
  );

  return {
    totalRaw: perKategori.reduce((s, k) => s + k.poinRaw, 0),
    totalEfektif: perKategori.reduce((s, k) => s + k.poinEfektif, 0),
    totalJamSosial,
    countByKategori: Object.fromEntries(
      perKategori.map((k) => [k.kategori, k.jumlah]),
    ),
    perKategori,
  };
}

/** Progres ternormalisasi terhadap target persona, 0–100. */
export function persenTarget(total: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((total / target) * 100));
}
