import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Field, fieldAria } from "@/components/shared/field";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { deleteSupervisor, saveSupervisor } from "@/lib/logbook-actions";
import { describeError, notifyError, notifySuccess, notifyWarning } from "@/lib/notify";
import { Collapsible, Stagger, StaggerItem } from "@/components/motion/motion-primitives";
import type { Supervisor } from "@/lib/types";

export interface SupervisorRow extends Supervisor {
  jumlahKonsultasi: number;
}

const EMPTY_DRAFT = {
  nama: "",
  jabatan: "",
  departemen: "",
  peran: "",
  prioritas: "100",
  bidang: "",
  catatanGaya: "",
};

/** Peran persona konsultan (dok 04 §3.3). */
const PERAN_OPTIONS = ["Pembimbing Utama", "Pendamping", "Penguji", "Mentor", "Rekan"];
const NO_PERAN = "__none__";

export function SupervisorManager({ rows }: { rows: SupervisorRow[] }) {
  const refresh = useRefresh();
  const confirm = useConfirm();

  const [mode, setMode] = React.useState<"idle" | "add" | { id: string }>("idle");
  const [draft, setDraft] = React.useState(EMPTY_DRAFT);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<SupervisorRow | null>(null);

  const editingId = typeof mode === "object" ? mode.id : null;
  const panelOpen = mode !== "idle";

  function startAdd() {
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setMode("add");
  }

  function startEdit(s: Supervisor) {
    setDraft({
      nama: s.nama,
      jabatan: s.jabatan ?? "",
      departemen: s.departemen ?? "",
      peran: s.peran ?? "",
      prioritas: String(s.prioritas ?? 100),
      bidang: (s.bidang_keahlian ?? []).join(", "),
      catatanGaya: s.catatan_gaya ?? "",
    });
    setErrors({});
    setMode({ id: s.id });
  }

  function cancel() {
    setMode("idle");
    setErrors({});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();

    if (!draft.nama.trim()) {
      setErrors({ nama: "Nama pembimbing wajib diisi." });
      return;
    }

    setBusy(true);
    const bidang = draft.bidang
      .split(",")
      .map((b) => b.trim())
      .filter(Boolean);

    /*
      Rename + sinkronisasi salinan denormalisasi di logbook_entries kini satu
      transaksi RPC (P2-3) — salinan basi sunyi tidak mungkin lagi terjadi.
    */
    const result = await saveSupervisor({
      id: editingId ?? undefined,
      nama: draft.nama.trim(),
      jabatan: draft.jabatan.trim() || null,
      departemen: draft.departemen.trim() || null,
      peran: draft.peran || null,
      prioritas: Math.max(1, Math.min(999, Number(draft.prioritas) || 100)),
      bidang_keahlian: bidang.length ? bidang : null,
      catatan_gaya: draft.catatanGaya.trim() || null,
    });

    if ("error" in result) {
      notifyError("Gagal menyimpan pembimbing", { description: describeError(result.error) });
      setBusy(false);
      return;
    }

    notifySuccess(editingId ? "Data pembimbing diperbarui" : "Pembimbing ditambahkan", {
      description: draft.nama.trim(),
    });

    setBusy(false);
    cancel();
    refresh();
  }

  function askDelete(s: SupervisorRow) {
    if (s.jumlahKonsultasi > 0) {
      notifyWarning("Pembimbing masih dipakai", {
        description: `${s.nama} tercatat pada ${s.jumlahKonsultasi} entri log book. Ubah atau hapus entri tersebut lebih dahulu.`,
      });
      return;
    }
    setPendingDelete(s);
    confirm.ask();
  }

  async function doDelete() {
    if (!pendingDelete) return;
    confirm.setLoading(true);

    const result = await deleteSupervisor(pendingDelete.id);

    if ("error" in result) {
      notifyError("Gagal menghapus pembimbing", { description: describeError(result.error) });
      confirm.close();
      return;
    }

    notifySuccess("Pembimbing dihapus", { description: pendingDelete.nama });
    confirm.close();
    setPendingDelete(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      {!panelOpen && (
        <Button variant="gradient" onClick={startAdd}>
          <Plus aria-hidden />
          Tambah Pembimbing
        </Button>
      )}

      <Collapsible open={panelOpen}>
        <Card className="p-4">
          <form onSubmit={save} className="space-y-4">
            <p className="text-[13px] font-bold text-foreground">
              {editingId ? "Ubah Data Pembimbing" : "Pembimbing Baru"}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Nama" htmlFor="m-nama" required error={errors.nama}>
                <Input
                  {...fieldAria("m-nama", errors.nama)}
                  placeholder="mis. Saleh Nurdin"
                  value={draft.nama}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, nama: e.target.value }));
                    setErrors({});
                  }}
                />
              </Field>

              <Field label="Jabatan / Pangkat" htmlFor="m-jabatan">
                <Input
                  {...fieldAria("m-jabatan")}
                  placeholder="mis. Superintendent IT Planning"
                  value={draft.jabatan}
                  onChange={(e) => setDraft((d) => ({ ...d, jabatan: e.target.value }))}
                />
              </Field>

              <Field label="Departemen" htmlFor="m-dept">
                <Input
                  {...fieldAria("m-dept")}
                  placeholder="mis. IT / SHE-Q"
                  value={draft.departemen}
                  onChange={(e) => setDraft((d) => ({ ...d, departemen: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Peran Konsultasi"
                htmlFor="m-peran"
                optional="untuk proyek"
                hint="Persona pada proyek konsultasi multi-pembimbing."
              >
                <Select
                  value={draft.peran || NO_PERAN}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, peran: v === NO_PERAN ? "" : v }))
                  }
                >
                  <SelectTrigger id="m-peran">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PERAN}>Tidak ditentukan</SelectItem>
                    {PERAN_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Prioritas Otoritas"
                htmlFor="m-prioritas"
                hint="Kecil = lebih otoritatif; rekomendasi tie-break saat saran bentrok."
              >
                <Input
                  {...fieldAria("m-prioritas", null, true)}
                  type="number"
                  min={1}
                  max={999}
                  inputMode="numeric"
                  value={draft.prioritas}
                  onChange={(e) => setDraft((d) => ({ ...d, prioritas: e.target.value }))}
                />
              </Field>

              <Field
                label="Bidang Keahlian"
                htmlFor="m-bidang"
                optional="pisahkan dengan koma"
              >
                <Input
                  {...fieldAria("m-bidang")}
                  placeholder="mis. Metodologi, Statistika"
                  value={draft.bidang}
                  onChange={(e) => setDraft((d) => ({ ...d, bidang: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Catatan Gaya Komunikasi" htmlFor="m-gaya" optional="opsional">
              <Input
                {...fieldAria("m-gaya")}
                placeholder="mis. Suka data konkret; hindari asumsi tanpa referensi"
                value={draft.catatanGaya}
                onChange={(e) => setDraft((d) => ({ ...d, catatanGaya: e.target.value }))}
              />
            </Field>

            {editingId && (
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Perubahan nama dan jabatan ikut diterapkan pada seluruh entri log book pembimbing
                ini, agar Formulir 2 tetap konsisten.
              </p>
            )}

            <div className="flex gap-2">
              <Button type="submit" loading={busy}>
                {!busy && <Save aria-hidden />}
                {busy ? "Menyimpan…" : "Simpan"}
              </Button>
              <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
                <X aria-hidden />
                Batal
              </Button>
            </div>
          </form>
        </Card>
      </Collapsible>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Belum ada pembimbing terdaftar"
            description="Daftarkan atasan atau supervisor yang Anda ajak konsultasi agar bisa dipilih saat menambah entri log book."
            action={
              <Button variant="gradient" onClick={startAdd}>
                <Plus aria-hidden />
                Tambah Pembimbing
              </Button>
            }
          />
        ) : (
          <>
            {/* --- Mobile cards --- */}
            <Stagger className="divide-y-2 divide-foreground lg:hidden" as="ul">
              {rows.map((s) => (
                <StaggerItem key={s.id} as="li" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-foreground">{s.nama}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">
                        {[s.jabatan, s.departemen].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <Badge variant={s.jumlahKonsultasi > 0 ? "primary" : "outline"}>
                      {s.jumlahKonsultasi} konsultasi
                    </Badge>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => startEdit(s)}
                    >
                      <Pencil aria-hidden />
                      Ubah
                    </Button>
                    <Button
                      variant="outline-destructive"
                      size="sm"
                      onClick={() => askDelete(s)}
                      aria-label={`Hapus ${s.nama}`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            {/* --- Desktop table --- */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nama</TableHead>
                    <TableHead>Jabatan / Pangkat</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead className="text-right">Konsultasi</TableHead>
                    <TableHead>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-foreground">{s.nama}</TableCell>
                      <TableCell className="text-muted-foreground">{s.jabatan || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{s.departemen || "—"}</TableCell>
                      <TableCell className="text-right font-bold text-primary tnum">
                        {s.jumlahKonsultasi}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="outline" size="xs" onClick={() => startEdit(s)}>
                          <Pencil aria-hidden />
                          Ubah
                        </Button>
                        <Button
                          variant="outline-destructive"
                          size="xs"
                          className="ml-1.5"
                          onClick={() => askDelete(s)}
                          aria-label={`Hapus ${s.nama}`}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(next) => {
          confirm.onOpenChange(next);
          if (!next) setPendingDelete(null);
        }}
        loading={confirm.loading}
        title="Hapus pembimbing ini?"
        description={
          <>
            <span className="font-semibold text-foreground">{pendingDelete?.nama}</span> akan
            dihapus dari daftar pembimbing Anda.
          </>
        }
        consequences={["Tidak ada entri log book yang terpengaruh — pembimbing ini belum dipakai"]}
        confirmLabel="Ya, hapus"
        onConfirm={doDelete}
      />
    </div>
  );
}
