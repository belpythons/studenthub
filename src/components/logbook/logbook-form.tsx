import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "@/hooks/use-refresh";
import { Plus, Save, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldAria } from "@/components/shared/field";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { UnsavedBar } from "@/components/shared/unsaved-bar";
import { QuickAdvice } from "@/components/logbook/quick-advice";
import { createClient } from "@/lib/supabase/client";
import { deleteLogbookEntry, saveLogbookEntry } from "@/lib/logbook-actions";
import { todayISO } from "@/lib/format";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { useDirtyState, useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { Collapsible } from "@/components/motion/motion-primitives";
import type { Advice, LogbookEntry, Project, Supervisor } from "@/lib/types";

const NEW_SUPERVISOR = "__new__";
const NO_PROJECT = "__none__";
const FORM_ID = "form-logbook";

interface FormState {
  nomor: string;
  tanggal: string;
  supervisorId: string;
  projectId: string;
  baruNama: string;
  baruJabatan: string;
  baruDepartemen: string;
  aktivitas: string;
  hasil: string;
  paraf: boolean;
}

export function LogbookForm({
  supervisors,
  nextNomor,
  /** Running numbers already in use, so a clash can be flagged before saving. */
  usedNomor,
  initial,
  projects = [],
  defaultProjectId = null,
}: {
  supervisors: Supervisor[];
  nextNomor: number;
  usedNomor: number[];
  initial?: LogbookEntry;
  /** Proyek aktif untuk select opsional (dok 04 §3.4). */
  projects?: Project[];
  defaultProjectId?: string | null;
}) {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const isEdit = Boolean(initial);
  const confirm = useConfirm();

  const initialState = React.useMemo<FormState>(
    () => ({
      nomor: String(initial?.nomor_urut ?? nextNomor),
      tanggal: initial?.tanggal ?? todayISO(),
      supervisorId: initial?.supervisor_id ?? supervisors[0]?.id ?? NEW_SUPERVISOR,
      projectId: initial?.project_id ?? defaultProjectId ?? NO_PROJECT,
      baruNama: "",
      baruJabatan: "",
      baruDepartemen: "",
      aktivitas: initial?.aktivitas_pekerjaan ?? "",
      hasil: initial?.hasil_tindak_lanjut ?? "",
      paraf: initial?.paraf_status ?? false,
    }),
    [initial, nextNomor, supervisors, defaultProjectId],
  );

  const [form, setForm] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  // Prompt "catat saran dari sesi ini?" setelah entri ber-proyek tersimpan.
  const [savedSession, setSavedSession] = React.useState<{
    entryId: string;
    projectId: string;
    supervisorId: string | null;
  } | null>(null);
  const [projectAdvice, setProjectAdvice] = React.useState<Advice[]>([]);

  React.useEffect(() => {
    if (!savedSession) return;
    let cancelled = false;
    createClient()
      .from("advice")
      .select("*")
      .eq("project_id", savedSession.projectId)
      .then(({ data }) => {
        if (!cancelled) setProjectAdvice((data ?? []) as Advice[]);
      });
    return () => {
      cancelled = true;
    };
  }, [savedSession]);

  const dirty = useDirtyState(form, initialState) && !savedSession;
  useUnsavedChanges(dirty && !busy, "Ada perubahan yang belum disimpan. Tinggalkan halaman ini?");

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  const addingNew = form.supervisorId === NEW_SUPERVISOR;

  /*
    A duplicate running number silently produced two rows numbered the same on
    the printed Formulir 2. This warns while the user is still in the form.
  */
  const nomorValue = Number(form.nomor);
  const nomorClash =
    Number.isFinite(nomorValue) &&
    nomorValue !== initial?.nomor_urut &&
    usedNomor.includes(nomorValue);

  function validate() {
    const next: Record<string, string> = {};
    if (!form.tanggal) next.tanggal = "Tanggal konsultasi wajib diisi.";
    if (!Number.isFinite(nomorValue) || nomorValue < 1) {
      next.nomor = "Nomor urut harus angka 1 atau lebih.";
    }
    if (!form.aktivitas.trim()) next.aktivitas = "Aktivitas atau topik konsultasi wajib diisi.";
    if (addingNew && !form.baruNama.trim()) {
      next.baruNama = "Nama pembimbing baru wajib diisi.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      notifyError("Ada isian yang perlu diperbaiki", {
        description: "Periksa kolom yang ditandai merah.",
      });
      return;
    }

    setBusy(true);

    try {
      const sup = supervisors.find((s) => s.id === form.supervisorId) ?? null;
      const projectId = form.projectId === NO_PROJECT ? null : form.projectId;

      // Supervisor baru + entri tersimpan dalam SATU transaksi RPC (P0-4).
      const result = await saveLogbookEntry({
        id: initial?.id,
        nomor_urut: nomorValue,
        tanggal: form.tanggal,
        aktivitas: form.aktivitas.trim(),
        supervisor_id: addingNew ? null : (sup?.id ?? null),
        baru_nama: addingNew ? form.baruNama.trim() : null,
        baru_jabatan: addingNew ? form.baruJabatan.trim() || null : null,
        baru_departemen: addingNew ? form.baruDepartemen.trim() || null : null,
        hasil: form.hasil.trim() || null,
        paraf: form.paraf,
        project_id: projectId,
      });
      if ("error" in result) throw new Error(result.error);

      const namaPembimbing = addingNew ? form.baruNama.trim() : (sup?.nama ?? "");
      notifySuccess(isEdit ? "Entri log book diperbarui" : "Entri log book tersimpan", {
        description: `No. ${nomorValue} · ${namaPembimbing}`,
      });

      // Sesi ber-proyek → tawarkan mencatat 0..n saran dari sesi ini dulu.
      if (!isEdit && projectId) {
        setBusy(false);
        setSavedSession({
          entryId: result.id,
          projectId,
          supervisorId: addingNew ? null : (sup?.id ?? null),
        });
        return;
      }

      navigate("/logbook");
      refresh();
    } catch (err) {
      notifyError("Gagal menyimpan entri", { description: describeError(err) });
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!initial) return;
    confirm.setLoading(true);

    const result = await deleteLogbookEntry(initial.id);

    if ("error" in result) {
      notifyError("Gagal menghapus entri", { description: describeError(result.error) });
      confirm.close();
      return;
    }

    notifySuccess("Entri log book dihapus", { description: `No. ${initial.nomor_urut}` });
    confirm.close();
    navigate("/logbook");
    refresh();
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4 pb-24 lg:pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Waktu & Penomoran</CardTitle>
            <CardDescription>
              Nomor urut menentukan kolom “No” pada Formulir 2 dan urutan barisnya.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal Konsultasi" htmlFor="tanggal" required error={errors.tanggal}>
              <Input
                {...fieldAria("tanggal", errors.tanggal)}
                type="date"
                value={form.tanggal}
                onChange={(e) => set("tanggal", e.target.value)}
              />
            </Field>

            <Field
              label="Nomor Urut"
              htmlFor="nomor"
              error={errors.nomor}
              hint={
                nomorClash
                  ? undefined
                  : isEdit
                    ? "Ubah bila ingin memindahkan posisi baris."
                    : `Nomor berikutnya yang belum terpakai: ${nextNomor}.`
              }
            >
              <Input
                {...fieldAria("nomor", errors.nomor, true)}
                type="number"
                min={1}
                inputMode="numeric"
                value={form.nomor}
                onChange={(e) => set("nomor", e.target.value)}
              />

              <Collapsible open={nomorClash}>
                <p className="flex items-start gap-1.5 pt-1.5 text-[12px] font-medium text-warning">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                  Nomor {form.nomor} sudah dipakai entri lain. Formulir 2 akan menampilkan dua baris
                  bernomor sama.
                </p>
              </Collapsible>
            </Field>

            {projects.length > 0 && (
              <Field
                label="Proyek Terkait"
                htmlFor="proyek"
                optional="opsional"
                hint="Sesi ber-proyek masuk ke timeline & Briefing Pack proyek itu."
                className="sm:col-span-2"
              >
                <Select value={form.projectId} onValueChange={(v) => set("projectId", v)}>
                  <SelectTrigger id="proyek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROJECT}>Tanpa proyek</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.judul}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pembimbing / Atasan</CardTitle>
            <CardDescription>
              Siapa yang Anda ajak konsultasi, beserta jabatannya.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field label="Pembimbing / Atasan" htmlFor="pembimbing" required>
              <Select
                value={form.supervisorId}
                onValueChange={(v) => set("supervisorId", v)}
              >
                <SelectTrigger id="pembimbing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nama}
                      {s.jabatan ? ` — ${s.jabatan}` : ""}
                    </SelectItem>
                  ))}
                  {supervisors.length > 0 && <SelectSeparator />}
                  <SelectItem value={NEW_SUPERVISOR}>+ Tambah Supervisor Baru</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Collapsible open={addingNew}>
              <div className="space-y-4 rounded-md border border-foreground bg-muted/40 p-3.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                  <Plus className="size-3.5" aria-hidden />
                  Supervisor Baru
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Nama" htmlFor="s-nama" required error={errors.baruNama}>
                    <Input
                      {...fieldAria("s-nama", errors.baruNama)}
                      placeholder="mis. Saleh Nurdin"
                      value={form.baruNama}
                      onChange={(e) => set("baruNama", e.target.value)}
                    />
                  </Field>

                  <Field label="Jabatan / Pangkat" htmlFor="s-jabatan">
                    <Input
                      {...fieldAria("s-jabatan")}
                      placeholder="mis. Superintendent IT Planning"
                      value={form.baruJabatan}
                      onChange={(e) => set("baruJabatan", e.target.value)}
                    />
                  </Field>

                  <Field label="Departemen" htmlFor="s-dept">
                    <Input
                      {...fieldAria("s-dept")}
                      placeholder="mis. IT / SHE-Q"
                      value={form.baruDepartemen}
                      onChange={(e) => set("baruDepartemen", e.target.value)}
                    />
                  </Field>
                </div>

                <p className="text-[11.5px] text-muted-foreground">
                  Supervisor ini akan tersimpan dan bisa dipilih lagi pada entri berikutnya.
                </p>
              </div>
            </Collapsible>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Isi Konsultasi</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field
              label="Aktivitas Pekerjaan / Topik Konsultasi"
              htmlFor="aktivitas"
              required
              error={errors.aktivitas}
              hint="Teks ini dicetak apa adanya pada kolom “Aktivitas Pekerjaan” Formulir 2."
            >
              <Textarea
                {...fieldAria("aktivitas", errors.aktivitas, true)}
                rows={3}
                placeholder="mis. Diskusi Prosedur Perhitungan Safety Man Hour untuk PKWTT & Tamu Zone 1"
                value={form.aktivitas}
                onChange={(e) => set("aktivitas", e.target.value)}
              />
            </Field>

            <Field label="Hasil & Tindak Lanjut" htmlFor="hasil" optional="opsional">
              <Textarea
                {...fieldAria("hasil")}
                rows={2}
                placeholder="Arahan yang diberikan dan langkah berikutnya…"
                value={form.hasil}
                onChange={(e) => set("hasil", e.target.value)}
              />
            </Field>

            <div className="flex items-start gap-2.5 rounded-md border border-foreground bg-muted/40 p-3">
              <Checkbox
                id="paraf"
                checked={form.paraf}
                onCheckedChange={(v) => set("paraf", v === true)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="paraf" className="cursor-pointer">
                  Sudah Di-paraf / Disetujui
                </Label>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  Penanda status saja. Formulir 2 tetap menyediakan ruang tanda tangan basah dan cap
                  sesuai standar TI-SOP-17/FM-01.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button type="submit" variant="gradient" loading={busy}>
              {!busy && <Save aria-hidden />}
              {busy ? "Menyimpan…" : "Simpan Entri"}
            </Button>
            <Button asChild variant="outline" disabled={busy}>
              <Link to="/logbook">Batal</Link>
            </Button>
          </div>

          {isEdit && (
            <Button
              type="button"
              variant="outline-destructive"
              onClick={confirm.ask}
              disabled={busy}
            >
              <Trash2 aria-hidden />
              Hapus
            </Button>
          )}
        </div>
      </form>

      <UnsavedBar
        visible={dirty && !busy}
        formId={FORM_ID}
        saving={busy}
        saveLabel="Simpan Entri"
        onDiscard={() => {
          setForm(initialState);
          setErrors({});
        }}
      />

      {/* Prompt ringan pasca-simpan: catat 0..n saran dari sesi ini (dok 04 §3.4). */}
      <Dialog
        open={Boolean(savedSession)}
        onOpenChange={(o) => {
          if (!o) {
            setSavedSession(null);
            navigate("/logbook");
            refresh();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat saran dari sesi ini?</DialogTitle>
            <DialogDescription>
              Entri tersimpan. Saran yang dicatat sekarang langsung masuk papan saran
              proyek — konflik terdeteksi saat lahir, bukan saat skripsi macet.
            </DialogDescription>
          </DialogHeader>

          {savedSession && (
            <QuickAdvice
              projectId={savedSession.projectId}
              advisors={supervisors}
              existingAdvice={projectAdvice}
              entryId={savedSession.entryId}
              defaultSupervisorId={savedSession.supervisorId}
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="gradient"
              onClick={() => {
                setSavedSession(null);
                navigate("/logbook");
                refresh();
              }}
            >
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        loading={confirm.loading}
        title="Hapus entri log book ini?"
        description={
          <>
            Entri nomor{" "}
            <span className="font-semibold text-foreground">{initial?.nomor_urut}</span> akan
            dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </>
        }
        consequences={[
          "Baris ini hilang dari Formulir 2 dan rekap konsultasi",
          "Nomor urut entri lain tidak berubah — rapikan bila perlu",
        ]}
        confirmLabel="Ya, hapus"
        onConfirm={onDelete}
      />
    </>
  );
}
