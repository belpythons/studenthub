import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { CheckCircle2, Gavel, ShieldAlert, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";
import { QuickAdvice } from "@/components/logbook/quick-advice";
import { ADVICE_STATUS_BADGE, validateDecision } from "@/lib/advice-status";
import { openConflicts } from "@/lib/project-query";
import { formatTanggal } from "@/lib/format";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { decideConflict, decideSynthesis, setAdviceStatus } from "@/lib/logbook-actions";
import type { Advice, AdviceRelation, AdviceStatus, Supervisor } from "@/lib/types";

function AdviceItem({
  advice,
  supersededBy,
  onDecide,
}: {
  advice: Advice;
  supersededBy?: Advice | null;
  onDecide: (a: Advice, status: "diadopsi" | "ditolak") => void;
}) {
  const badge = ADVICE_STATUS_BADGE[advice.status as AdviceStatus];
  const dim = advice.status === "ditolak" || advice.status === "di-supersede";
  return (
    <div className={`rounded-md border border-foreground p-3 ${dim ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <b className="text-[13px]">{advice.penyaran_nama}</b>
        {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
        <span className="text-[11.5px] text-muted-foreground">
          {formatTanggal(advice.created_at.slice(0, 10))}
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed">{advice.isi}</p>
      {advice.alasan_status && (
        <p className="mt-1.5 text-[12px] italic text-muted-foreground">
          Alasan: {advice.alasan_status}
        </p>
      )}
      {supersededBy && (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Digantikan oleh saran {supersededBy.penyaran_nama}.
        </p>
      )}
      {advice.status === "diusulkan" && (
        <div className="mt-2 flex gap-1.5">
          <Button type="button" variant="outline" size="xs" onClick={() => onDecide(advice, "diadopsi")}>
            <CheckCircle2 aria-hidden />
            Adopsi
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => onDecide(advice, "ditolak")}>
            <XCircle aria-hidden />
            Tolak
          </Button>
        </div>
      )}
    </div>
  );
}

export function AdviceBoard({
  projectId,
  advice,
  relations,
  advisors,
}: {
  projectId: string;
  advice: Advice[];
  relations: AdviceRelation[];
  advisors: Supervisor[];
}) {
  const refresh = useRefresh();
  const byId = React.useMemo(() => new Map(advice.map((a) => [a.id, a])), [advice]);

  // ---- dialog adopsi/tolak tunggal ----
  const [single, setSingle] = React.useState<{ advice: Advice; status: "diadopsi" | "ditolak" } | null>(null);
  const [alasan, setAlasan] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // ---- dialog putuskan konflik ----
  const [conflict, setConflict] = React.useState<{ a: Advice; b: Advice } | null>(null);
  const [winner, setWinner] = React.useState<"a" | "b" | "sintesis">("a");
  const [sintesis, setSintesis] = React.useState("");

  const konflik = openConflicts(relations)
    .map((r) => ({ a: byId.get(r.a_id), b: byId.get(r.b_id) }))
    .filter((k): k is { a: Advice; b: Advice } => Boolean(k.a && k.b));

  const areas = React.useMemo(() => {
    const map = new Map<string, Advice[]>();
    for (const a of advice) {
      map.set(a.area, [...(map.get(a.area) ?? []), a]);
    }
    const order: Record<string, number> = { diadopsi: 0, diusulkan: 1, ditolak: 2, "di-supersede": 3 };
    return Array.from(map.entries()).map(([area, list]) => ({
      area,
      list: list.sort((x, y) => (order[x.status] ?? 9) - (order[y.status] ?? 9)),
    }));
  }, [advice]);

  async function submitSingle() {
    if (!single) return;
    const err = validateDecision({
      winnerStatus: single.advice.status as AdviceStatus,
      loserStatuses: [],
      alasan,
    });
    if (err && single.status === "diadopsi") {
      notifyError(err);
      return;
    }
    if (!alasan.trim()) {
      notifyError("Alasan keputusan wajib diisi.");
      return;
    }
    setBusy(true);
    const result = await setAdviceStatus(single.advice.id, single.status, alasan);
    setBusy(false);
    if ("error" in result) {
      notifyError("Gagal menyimpan keputusan", { description: describeError(result.error) });
      return;
    }
    notifySuccess(single.status === "diadopsi" ? "Saran diadopsi" : "Saran ditolak");
    setSingle(null);
    setAlasan("");
    refresh();
  }

  async function submitConflict() {
    if (!conflict) return;
    if (!alasan.trim()) {
      notifyError("Alasan keputusan wajib diisi.");
      return;
    }
    if (winner === "sintesis" && !sintesis.trim()) {
      notifyError("Isi sintesis wajib diisi.");
      return;
    }
    setBusy(true);
    const result =
      winner === "sintesis"
        ? await decideSynthesis(conflict.a.id, conflict.b.id, sintesis, alasan)
        : await decideConflict(
            winner === "a" ? conflict.a.id : conflict.b.id,
            [winner === "a" ? conflict.b.id : conflict.a.id],
            alasan,
          );
    setBusy(false);
    if ("error" in result) {
      notifyError("Gagal memutuskan konflik", { description: describeError(result.error) });
      return;
    }
    notifySuccess("Konflik diputuskan", {
      description: "Saran yang kalah ditandai di-supersede; riwayatnya tetap tersimpan.",
    });
    setConflict(null);
    setAlasan("");
    setSintesis("");
    refresh();
  }

  return (
    <div className="space-y-4">
      {konflik.length > 0 && (
        <Card className="border-warning/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-warning" aria-hidden />
              Konflik Terbuka ({konflik.length})
            </CardTitle>
            <CardDescription>
              Dua saran menyentuh area yang sama dan saling bentrok. Putuskan satu (atau
              tulis sintesis) — yang kalah tidak dihapus, hanya di-supersede.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {konflik.map((k) => (
              <div key={`${k.a.id}-${k.b.id}`} className="rounded-md border border-foreground p-3">
                <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                  Area: {k.a.area}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[k.a, k.b].map((a) => (
                    <div key={a.id} className="rounded-md bg-muted/40 p-2.5 text-[13px]">
                      <b>{a.penyaran_nama}</b>
                      <p className="mt-0.5 text-muted-foreground">{a.isi}</p>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  className="mt-2.5"
                  onClick={() => {
                    setConflict(k);
                    setWinner("a");
                    setAlasan("");
                    setSintesis("");
                  }}
                >
                  <Gavel aria-hidden />
                  Putuskan
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Papan Saran per Area</CardTitle>
          <CardDescription>
            Setiap saran adalah catatan ala ADR: sekali diputuskan, isinya terkunci —
            perubahan pikiran dicatat sebagai saran baru yang menggantikan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <QuickAdvice
            projectId={projectId}
            advisors={advisors}
            existingAdvice={advice}
            onCreated={() => refresh()}
          />

          {areas.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Belum ada saran tercatat untuk proyek ini.
            </p>
          ) : (
            areas.map(({ area, list }) => (
              <div key={area}>
                <p className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                  {area}
                </p>
                <div className="space-y-2">
                  {list.map((a) => (
                    <AdviceItem
                      key={a.id}
                      advice={a}
                      supersededBy={a.superseded_by ? byId.get(a.superseded_by) : null}
                      onDecide={(adv, status) => {
                        setSingle({ advice: adv, status });
                        setAlasan("");
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* ---------- Dialog adopsi / tolak ---------- */}
      <Dialog open={Boolean(single)} onOpenChange={(o) => !o && setSingle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {single?.status === "diadopsi" ? "Adopsi saran ini?" : "Tolak saran ini?"}
            </DialogTitle>
            <DialogDescription>{single?.advice.isi}</DialogDescription>
          </DialogHeader>
          <Field label="Alasan (Konteks/Konsekuensi ala ADR)" htmlFor="dec-alasan" required>
            <Textarea
              id="dec-alasan"
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Mengapa keputusan ini diambil?"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSingle(null)}>
              Batal
            </Button>
            <Button type="button" variant="gradient" loading={busy} onClick={submitSingle}>
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Dialog putuskan konflik ---------- */}
      <Dialog open={Boolean(conflict)} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Putuskan konflik — {conflict?.a.area}</DialogTitle>
            <DialogDescription>
              Pilih saran yang diadopsi, atau tulis sintesis baru dari keduanya.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {conflict &&
              (
                [
                  ["a", conflict.a],
                  ["b", conflict.b],
                ] as const
              ).map(([key, a]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-foreground p-2.5 text-[13px] has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]"
                >
                  <input
                    type="radio"
                    name="conflict-winner"
                    className="mt-1"
                    checked={winner === key}
                    onChange={() => setWinner(key)}
                  />
                  <span>
                    <b>{a.penyaran_nama}</b>
                    <span className="mt-0.5 block text-muted-foreground">{a.isi}</span>
                  </span>
                </label>
              ))}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-foreground p-2.5 text-[13px] has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]">
              <input
                type="radio"
                name="conflict-winner"
                className="mt-1"
                checked={winner === "sintesis"}
                onChange={() => setWinner("sintesis")}
              />
              <span className="min-w-0 flex-1">
                <b>Sintesis baru dari keduanya</b>
                {winner === "sintesis" && (
                  <Textarea
                    className="mt-1.5"
                    rows={2}
                    value={sintesis}
                    onChange={(e) => setSintesis(e.target.value)}
                    placeholder="Rumusan keputusan gabungan…"
                  />
                )}
              </span>
            </label>
          </div>

          <Field label="Alasan keputusan" htmlFor="conf-alasan" required>
            <Textarea
              id="conf-alasan"
              rows={2}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Mengapa saran ini yang dipakai?"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConflict(null)}>
              Batal
            </Button>
            <Button type="button" variant="gradient" loading={busy} onClick={submitConflict}>
              <Gavel aria-hidden />
              Putuskan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
