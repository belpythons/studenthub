import { AlertTriangle, CheckCircle2, HeartHandshake, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SKM_KATEGORI, SKM_TARGET_POIN } from "@/lib/constants";
import { persenTarget, type KategoriAggregate } from "@/lib/skm-aggregate";
import { CountUp, FadeIn } from "@/components/motion/motion-primitives";
import { cn } from "@/lib/utils";

export function SkmProgress({
  totalPoin,
  countByKategori,
  target = SKM_TARGET_POIN,
  targetJamSosial = null,
  totalJamSosial = 0,
  perKategori = [],
}: {
  totalPoin: number;
  countByKategori: Record<string, number>;
  /** Target persona aktif; default = baseline Kustom. */
  target?: number;
  /** Hanya persona BINUS: target jam kegiatan sosial. */
  targetJamSosial?: number | null;
  totalJamSosial?: number;
  /** Untuk peringatan cap kategori terlampaui. */
  perKategori?: KategoriAggregate[];
}) {
  const pct = persenTarget(totalPoin, target);
  const terpenuhi = totalPoin >= target;
  const sisa = Math.max(0, target - totalPoin);

  const jamPct = targetJamSosial ? persenTarget(totalJamSosial, targetJamSosial) : 0;
  const jamTerpenuhi = targetJamSosial != null && totalJamSosial >= targetJamSosial;
  const capTerlampaui = perKategori.filter((k) => k.terlampaui);

  return (
    <FadeIn>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <Target className="size-3.5" aria-hidden />
              Total Poin SKM
            </p>
            <p className="mt-1 text-3xl font-extrabold leading-none tracking-tight text-foreground">
              <CountUp value={totalPoin} />
              <span className="ml-1 text-base font-semibold text-muted-foreground">
                / {target} Poin
              </span>
            </p>
          </div>

          <Badge variant={terpenuhi ? "success" : "warning"} className="text-[11.5px]">
            {terpenuhi && <CheckCircle2 aria-hidden />}
            {terpenuhi ? "Syarat kelulusan terpenuhi" : `Terpenuhi ${pct}%`}
          </Badge>
        </div>

        <Progress
          value={pct}
          className="mt-4 h-2.5"
          indicatorClassName={cn(terpenuhi ? "bg-success" : "bg-primary")}
          aria-label={`Progres poin SKM ${totalPoin} dari ${target}`}
        />

        {/* States what is still needed, rather than only how far along you are. */}
        <p className="mt-2 text-[12px] text-muted-foreground">
          {terpenuhi
            ? "Target poin persona sudah tercapai. Kegiatan berikutnya menambah nilai portofolio."
            : `Butuh ${sisa} poin lagi untuk memenuhi target persona (${pct}%).`}
        </p>

        {targetJamSosial != null && (
          <div className="mt-4 border-t border-foreground pt-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                <HeartHandshake className="size-3.5" aria-hidden />
                Jam Kegiatan Sosial
              </p>
              <span className="text-[12.5px] font-semibold text-foreground">
                {totalJamSosial} / {targetJamSosial} jam
              </span>
            </div>
            <Progress
              value={jamPct}
              className="mt-2 h-2"
              indicatorClassName={cn(jamTerpenuhi ? "bg-success" : "bg-primary")}
              aria-label={`Progres jam sosial ${totalJamSosial} dari ${targetJamSosial}`}
            />
          </div>
        )}

        {capTerlampaui.length > 0 && (
          <p className="mt-3 flex items-start gap-1.5 rounded-md border border-foreground bg-muted/50 px-3 py-2 text-[12px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              Cap kategori terlampaui:{" "}
              {capTerlampaui
                .map((k) => `${k.kategori} (${k.poinRaw}/${k.cap})`)
                .join(", ")}{" "}
              — hanya {capTerlampaui.map((k) => k.poinEfektif).join(", ")} poin yang dihitung.
            </span>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-foreground pt-3.5">
          {SKM_KATEGORI.map((k) => {
            const n = countByKategori[k.value] ?? 0;
            return (
              <Badge key={k.value} variant={n > 0 ? "primary" : "outline"}>
                <span aria-hidden>{k.emoji}</span>
                {k.short}: <span className="tnum font-bold">{n}</span>
              </Badge>
            );
          })}
        </div>
      </Card>
    </FadeIn>
  );
}
