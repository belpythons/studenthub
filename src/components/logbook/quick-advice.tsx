import * as React from "react";
import { Lightbulb, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/shared/field";
import { ADVICE_STATUS_BADGE } from "@/lib/advice-status";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { createAdvice } from "@/lib/logbook-actions";
import type { Advice, AdviceStatus, Supervisor } from "@/lib/types";

const TANPA_PENYARAN = "__none__";

/**
 * Form saran cepat (area + isi + penyaran) dengan alur konflik tiga-pilihan
 * (dok 04 §3.4): saran baru pada area yang sudah punya saran diusulkan/
 * diadopsi memicu dialog menguatkan / bentrok / area lain.
 */
export function QuickAdvice({
  projectId,
  advisors,
  existingAdvice,
  entryId = null,
  defaultSupervisorId = null,
  onCreated,
}: {
  projectId: string;
  advisors: Supervisor[];
  /** Seluruh saran proyek (untuk deteksi area & autosuggest). */
  existingAdvice: Advice[];
  entryId?: string | null;
  defaultSupervisorId?: string | null;
  onCreated?: () => void;
}) {
  const [area, setArea] = React.useState("");
  const [isi, setIsi] = React.useState("");
  const [supervisorId, setSupervisorId] = React.useState(
    defaultSupervisorId ?? TANPA_PENYARAN,
  );
  const [busy, setBusy] = React.useState(false);

  // Dialog tiga-pilihan
  const [choiceOpen, setChoiceOpen] = React.useState(false);
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [localAdvice, setLocalAdvice] = React.useState<Advice[]>(existingAdvice);
  React.useEffect(() => setLocalAdvice(existingAdvice), [existingAdvice]);

  const areas = React.useMemo(
    () => Array.from(new Set(localAdvice.map((a) => a.area))).sort(),
    [localAdvice],
  );

  const sameArea = React.useMemo(
    () =>
      localAdvice.filter(
        (a) =>
          a.area.trim().toLowerCase() === area.trim().toLowerCase() &&
          (a.status === "diusulkan" || a.status === "diadopsi"),
      ),
    [localAdvice, area],
  );

  async function submit(relasi: "bentrok" | "menguatkan" | null) {
    setBusy(true);
    const result = await createAdvice({
      project_id: projectId,
      area: area.trim(),
      isi: isi.trim(),
      supervisor_id: supervisorId === TANPA_PENYARAN ? null : supervisorId,
      entry_id: entryId,
      penyaran: null,
      relasi_jenis: relasi,
      relasi_dengan: relasi ? targetId : null,
    });
    setBusy(false);

    if ("error" in result) {
      notifyError("Gagal mencatat saran", { description: describeError(result.error) });
      return;
    }

    setLocalAdvice((prev) => [
      ...prev,
      {
        id: result.id,
        user_id: "",
        project_id: projectId,
        entry_id: entryId,
        supervisor_id: supervisorId === TANPA_PENYARAN ? null : supervisorId,
        penyaran_nama:
          advisors.find((s) => s.id === supervisorId)?.nama ?? "Tidak disebutkan",
        area: area.trim(),
        isi: isi.trim(),
        status: "diusulkan",
        alasan_status: null,
        superseded_by: null,
        decided_at: null,
        created_at: new Date().toISOString(),
      },
    ]);
    setChoiceOpen(false);
    setArea("");
    setIsi("");
    notifySuccess("Saran tercatat", {
      description: relasi === "bentrok" ? "Konflik masuk ke daftar Konflik Terbuka proyek." : undefined,
    });
    onCreated?.();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!area.trim() || !isi.trim()) {
      notifyError("Area dan isi saran wajib diisi.");
      return;
    }
    if (sameArea.length > 0) {
      // Konflik terlihat pada saat lahir, bukan saat skripsi macet.
      setTargetId(
        (sameArea.find((a) => a.status === "diadopsi") ?? sameArea[sameArea.length - 1]).id,
      );
      setChoiceOpen(true);
      return;
    }
    void submit(null);
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Area saran" htmlFor="qa-area" hint="mis. Metodologi, Bab 2, Judul">
            <>
              <Input
                id="qa-area"
                list="qa-area-list"
                maxLength={120}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Metodologi"
              />
              <datalist id="qa-area-list">
                {areas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </>
          </Field>

          <Field label="Penyaran" htmlFor="qa-penyaran">
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger id="qa-penyaran">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TANPA_PENYARAN}>Tidak disebutkan</SelectItem>
                {advisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nama}
                    {s.peran ? ` — ${s.peran}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Isi saran" htmlFor="qa-isi">
          <Textarea
            id="qa-isi"
            rows={2}
            maxLength={10000}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Apa yang disarankan pada sesi ini?"
          />
        </Field>

        <Button type="submit" variant="outline" size="sm" loading={busy}>
          {!busy && <Plus aria-hidden />}
          Catat Saran
        </Button>
      </form>

      <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="size-4" aria-hidden />
              Area “{area.trim()}” sudah punya saran
            </DialogTitle>
            <DialogDescription>
              Bagaimana hubungan saran baru ini dengan yang sudah ada?
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-56 space-y-2 overflow-y-auto scrollbar-thin">
            {sameArea.map((a) => {
              const badge = ADVICE_STATUS_BADGE[a.status as AdviceStatus];
              return (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-foreground p-2.5 text-[13px] has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]"
                >
                  <input
                    type="radio"
                    name="qa-target"
                    className="mt-1"
                    checked={targetId === a.id}
                    onChange={() => setTargetId(a.id)}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <b>{a.penyaran_nama}</b>
                      {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
                    </span>
                    <span className="mt-0.5 block text-muted-foreground">{a.isi}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={busy} onClick={() => submit("menguatkan")}>
              Menguatkan yang dipilih
            </Button>
            <Button type="button" variant="outline-destructive" disabled={busy} onClick={() => submit("bentrok")}>
              Bentrok — catat konflik
            </Button>
            <Button type="button" variant="gradient" disabled={busy} onClick={() => submit(null)}>
              Area lain / tanpa relasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
