import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { setProjectAdvisors } from "@/lib/logbook-actions";
import type { Supervisor } from "@/lib/types";

/** Penugasan persona konsultan per proyek (project_advisors). */
export function AdvisorPicker({
  projectId,
  supervisors,
  selectedIds,
}: {
  projectId: string;
  supervisors: Supervisor[];
  selectedIds: string[];
}) {
  const refresh = useRefresh();
  const [checked, setChecked] = React.useState<Set<string>>(new Set(selectedIds));
  const [busy, setBusy] = React.useState(false);

  const dirty =
    checked.size !== selectedIds.length || selectedIds.some((id) => !checked.has(id));

  async function save() {
    setBusy(true);
    const result = await setProjectAdvisors(projectId, Array.from(checked));
    setBusy(false);
    if ("error" in result) {
      notifyError("Gagal menyimpan konsultan", { description: describeError(result.error) });
      return;
    }
    notifySuccess("Daftar konsultan proyek diperbarui");
    refresh();
  }

  if (supervisors.length === 0) {
    return (
      <p className="text-[12.5px] text-muted-foreground">
        Belum ada pembimbing/konsultan. Tambahkan lebih dulu di halaman{" "}
        <a className="font-medium text-primary hover:underline" href="/logbook/supervisors">
          Pembimbing
        </a>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {supervisors.map((s) => (
        <label key={s.id} className="flex cursor-pointer items-start gap-2.5">
          <Checkbox
            checked={checked.has(s.id)}
            onCheckedChange={(v) => {
              setChecked((prev) => {
                const next = new Set(prev);
                if (v) next.add(s.id);
                else next.delete(s.id);
                return next;
              });
            }}
            aria-label={`Libatkan ${s.nama}`}
          />
          <span className="min-w-0 text-[13px] leading-snug">
            <span className="flex flex-wrap items-center gap-1.5">
              <b>{s.nama}</b>
              {s.peran && <Badge variant="outline">{s.peran}</Badge>}
              <Badge variant="outline" title="Prioritas otoritas (kecil = lebih otoritatif)">
                prioritas {s.prioritas}
              </Badge>
            </span>
            {(s.bidang_keahlian?.length ?? 0) > 0 && (
              <span className="mt-0.5 block text-[12px] text-muted-foreground">
                {s.bidang_keahlian!.join(" · ")}
              </span>
            )}
          </span>
        </label>
      ))}

      {dirty && (
        <Button type="button" variant="gradient" size="sm" loading={busy} onClick={save}>
          <Users aria-hidden />
          Simpan Konsultan
        </Button>
      )}
    </div>
  );
}
