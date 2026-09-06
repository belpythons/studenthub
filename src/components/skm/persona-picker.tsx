import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { ExternalLink, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { setSkmPersona } from "@/lib/skm-actions";
import type { SkmPreset } from "@/lib/skm-preset";

export function PersonaPicker({
  presets,
  active,
}: {
  presets: SkmPreset[];
  active: SkmPreset;
}) {
  const refresh = useRefresh();
  const confirm = useConfirm();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const pending = presets.find((p) => p.id === pendingId) ?? null;

  function onPick(id: string) {
    if (id === active.id) return;
    setPendingId(id);
    confirm.ask();
  }

  async function onConfirm() {
    if (!pendingId) return;
    confirm.setLoading(true);
    const result = await setSkmPersona(pendingId);
    if ("error" in result) {
      notifyError("Gagal mengganti persona", { description: describeError(result.error) });
      confirm.close();
      setPendingId(null);
      return;
    }
    notifySuccess("Persona diganti", {
      description: `${result.converted} entri dikonversi otomatis${
        result.tanpaPadanan ? `, ${result.tanpaPadanan} entri jadi poin manual (tinjau ulang)` : ""
      }.`,
    });
    confirm.close();
    setPendingId(null);
    refresh();
  }

  return (
    <>
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <GraduationCap className="size-3.5" aria-hidden />
              Persona Standar Poin
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Select value={active.id} onValueChange={onPick}>
                <SelectTrigger className="w-[260px]" aria-label="Pilih persona standar poin">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama} — target {p.target_poin}
                      {p.target_jam_sosial ? ` + ${p.target_jam_sosial} jam sosial` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={active.verifikasi === "resmi" ? "success" : "outline"}>
                {active.verifikasi === "resmi" ? "terverifikasi" : "sumber sekunder"}
              </Badge>
              {active.sumber_url && (
                <a
                  href={active.sumber_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                >
                  Pedoman resmi
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </div>

        {active.deskripsi && (
          <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
            {active.deskripsi}
          </p>
        )}
        <p className="mt-2 text-[11.5px] italic text-muted-foreground">
          Persona adalah simulasi standar untuk membangun portofolio &amp; personal branding —
          bukan transkrip resmi kampus bersangkutan.
        </p>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => {
          confirm.onOpenChange(open);
          if (!open) setPendingId(null);
        }}
        loading={confirm.loading}
        title={`Ganti persona ke ${pending?.nama ?? ""}?`}
        description="Poin entri yang mengikuti aturan persona akan dihitung ulang otomatis lewat peta kesetaraan tingkat."
        consequences={[
          "Entri berpoin manual tidak diubah, hanya ditandai untuk ditinjau",
          `Target kelulusan menjadi ${pending?.target_poin ?? "-"} poin${
            pending?.target_jam_sosial ? ` + ${pending.target_jam_sosial} jam sosial` : ""
          }`,
        ]}
        confirmLabel="Ya, ganti persona"
        onConfirm={onConfirm}
      />
    </>
  );
}
