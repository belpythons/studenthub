import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "@/hooks/use-refresh";
import { Clock, Moon, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field, fieldAria } from "@/components/shared/field";
import { FilePicker } from "@/components/shared/file-picker";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { UnsavedBar } from "@/components/shared/unsaved-bar";
import { createClient } from "@/lib/supabase/client";
import { removePublicFile, uploadPublicFile } from "@/lib/upload";
import { MAX_PHOTO_SIZE, REPORT_KATEGORI, STORAGE_BUCKET_PHOTOS } from "@/lib/constants";
import { durasiJam, isOvernight, pluralJam, todayISO } from "@/lib/format";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { useDirtyState, useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { InternshipReport } from "@/lib/types";

const NO_KATEGORI = "belum";
const FORM_ID = "form-laporan";

interface FormState {
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  kategori: string;
  judul: string;
  deskripsi: string;
  output: string;
  kendala: string;
}

export function ReportForm({ userId, initial }: { userId: string; initial?: InternshipReport }) {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const isEdit = Boolean(initial);
  const confirm = useConfirm();

  const initialState = React.useMemo<FormState>(
    () => ({
      tanggal: initial?.tanggal ?? todayISO(),
      jamMulai: initial?.jam_mulai?.slice(0, 5) ?? "",
      jamSelesai: initial?.jam_selesai?.slice(0, 5) ?? "",
      kategori: initial?.kategori ?? NO_KATEGORI,
      judul: initial?.judul ?? "",
      deskripsi: initial?.deskripsi ?? "",
      output: initial?.output ?? "",
      kendala: initial?.kendala ?? "",
    }),
    [initial],
  );

  const [form, setForm] = React.useState<FormState>(initialState);
  const [file, setFile] = React.useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [progress, setProgress] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  const dirty = useDirtyState(form, initialState) || Boolean(file) || removeExisting;
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

  const overnight = isOvernight(form.jamMulai, form.jamSelesai);
  const durasi = durasiJam(form.jamMulai, form.jamSelesai);

  function validate() {
    const next: Record<string, string> = {};
    if (!form.tanggal) next.tanggal = "Tanggal wajib diisi.";
    if (form.tanggal > todayISO()) {
      next.tanggal = "Tanggal tidak boleh di masa depan.";
    }
    if (!form.judul.trim()) next.judul = "Judul kegiatan wajib diisi.";
    if (form.jamSelesai && !form.jamMulai) {
      next.jamMulai = "Isi jam mulai bila jam selesai diisi.";
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
    const supabase = createClient();
    const previousUrl = initial?.foto_url ?? null;

    try {
      let fotoUrl = removeExisting ? null : previousUrl;

      if (file) {
        setProgress(0);
        fotoUrl = await uploadPublicFile(
          supabase,
          STORAGE_BUCKET_PHOTOS,
          userId,
          file,
          setProgress,
        );
      }

      const payload = {
        user_id: userId,
        tanggal: form.tanggal,
        jam_mulai: form.jamMulai || null,
        jam_selesai: form.jamSelesai || null,
        // kategori is NOT NULL in the schema while the form treats it as
        // optional, matching form.png — "Lainnya" is the documented fallback.
        kategori: form.kategori === NO_KATEGORI ? "Lainnya" : form.kategori,
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim() || null,
        output: form.output.trim() || null,
        kendala: form.kendala.trim() || null,
        foto_url: fotoUrl,
      };

      const { error } = isEdit
        ? await supabase.from("internship_reports").update(payload).eq("id", initial!.id)
        : await supabase.from("internship_reports").insert(payload);

      if (error) throw error;

      if ((file || removeExisting) && previousUrl && previousUrl !== fotoUrl) {
        await removePublicFile(supabase, STORAGE_BUCKET_PHOTOS, previousUrl);
      }

      notifySuccess(isEdit ? "Laporan diperbarui" : "Laporan tersimpan", {
        description: durasi
          ? `${payload.judul} · ${pluralJam(durasi)}`
          : payload.judul,
      });

      navigate("/reports");
      refresh();
    } catch (err) {
      notifyError("Gagal menyimpan laporan", { description: describeError(err) });
      setBusy(false);
      setProgress(null);
    }
  }

  async function onDelete() {
    if (!initial) return;
    confirm.setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("internship_reports").delete().eq("id", initial.id);

    if (error) {
      notifyError("Gagal menghapus laporan", { description: describeError(error) });
      confirm.close();
      return;
    }

    await removePublicFile(supabase, STORAGE_BUCKET_PHOTOS, initial.foto_url);

    notifySuccess("Laporan dihapus", { description: initial.judul });
    confirm.close();
    navigate("/reports");
    refresh();
  }

  return (
    <>
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4 pb-24 lg:pb-20">
        <Card>
          <CardHeader>
            <CardTitle>Waktu & Kategori</CardTitle>
            <CardDescription>
              Jam boleh dikosongkan. Kegiatan yang melewati tengah malam dihitung otomatis.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Tanggal" htmlFor="tanggal" required error={errors.tanggal}>
                <Input
                  {...fieldAria("tanggal", errors.tanggal)}
                  type="date"
                  max={todayISO()}
                  value={form.tanggal}
                  onChange={(e) => set("tanggal", e.target.value)}
                />
              </Field>

              <Field label="Jam Mulai" htmlFor="jam-mulai" error={errors.jamMulai}>
                <Input
                  {...fieldAria("jam-mulai", errors.jamMulai)}
                  type="time"
                  value={form.jamMulai}
                  onChange={(e) => set("jamMulai", e.target.value)}
                />
              </Field>

              <Field label="Jam Selesai" htmlFor="jam-selesai">
                <Input
                  {...fieldAria("jam-selesai")}
                  type="time"
                  value={form.jamSelesai}
                  onChange={(e) => set("jamSelesai", e.target.value)}
                />
              </Field>
            </div>

            {/* Live duration read-out — confirms the app understood the input. */}
            {durasi > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
                <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <p className="text-[12.5px] text-muted-foreground" aria-live="polite">
                  Durasi tercatat{" "}
                  <span className="font-semibold text-foreground tnum">{pluralJam(durasi)}</span>
                </p>
                {overnight && (
                  <Badge variant="warning">
                    <Moon aria-hidden />
                    Lintas hari
                  </Badge>
                )}
              </div>
            )}

            <Field
              label="Kategori"
              htmlFor="kategori"
              hint={
                form.kategori === NO_KATEGORI
                  ? "Bila dibiarkan kosong, kegiatan dicatat sebagai “Lainnya”."
                  : undefined
              }
            >
              <Select value={form.kategori} onValueChange={(v) => set("kategori", v)}>
                <SelectTrigger id="kategori">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_KATEGORI}>— Pilih kategori —</SelectItem>
                  {REPORT_KATEGORI.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Isi Kegiatan</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field
              label="Judul / Nama Kegiatan"
              htmlFor="judul"
              required
              error={errors.judul}
              hint={`${form.judul.length}/255 karakter`}
            >
              <Input
                {...fieldAria("judul", errors.judul, true)}
                maxLength={255}
                placeholder="mis. Membuat modul input data inventaris"
                value={form.judul}
                onChange={(e) => set("judul", e.target.value)}
              />
            </Field>

            <Field label="Deskripsi Kegiatan" htmlFor="deskripsi">
              <Textarea
                {...fieldAria("deskripsi")}
                rows={3}
                placeholder="Jelaskan apa yang dikerjakan..."
                value={form.deskripsi}
                onChange={(e) => set("deskripsi", e.target.value)}
              />
            </Field>

            <Field label="Output / Hasil" htmlFor="output">
              <Textarea
                {...fieldAria("output")}
                rows={2}
                placeholder="Hasil yang dicapai / dokumen / progres..."
                value={form.output}
                onChange={(e) => set("output", e.target.value)}
              />
            </Field>

            <Field
              label="Kendala"
              htmlFor="kendala"
              optional="jika ada"
              hint="Kendala yang dicatat di sini ikut muncul pada bagian Catatan Kendala dokumen rekap."
            >
              <Textarea
                {...fieldAria("kendala", null, true)}
                rows={2}
                placeholder="Kendala yang dihadapi..."
                value={form.kendala}
                onChange={(e) => set("kendala", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Foto Kegiatan</CardTitle>
            <CardDescription>
              Muncul pada dokumen rekap bila opsi “Sertakan foto” diaktifkan saat ekspor.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Field
              label="Foto"
              htmlFor="foto"
              optional="opsional, maks 20MB"
              error={errors.foto}
            >
              <FilePicker
                id="foto"
                accept="image/*"
                maxBytes={MAX_PHOTO_SIZE}
                file={file}
                progress={progress}
                disabled={busy}
                hint="JPG, PNG atau WEBP · maksimal 20 MB"
                existingUrl={removeExisting ? null : initial?.foto_url}
                onRemoveExisting={() => setRemoveExisting(true)}
                onFileChange={(next, error) => {
                  setFile(next);
                  setErrors((e) => {
                    const n = { ...e };
                    if (error) n.foto = error;
                    else delete n.foto;
                    return n;
                  });
                }}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button type="submit" variant="gradient" loading={busy}>
              {!busy && <Save aria-hidden />}
              {busy ? "Menyimpan…" : "Simpan Laporan"}
            </Button>
            <Button asChild variant="outline" disabled={busy}>
              <Link to="/reports">Batal</Link>
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
        saveLabel="Simpan Laporan"
        onDiscard={() => {
          setForm(initialState);
          setFile(null);
          setRemoveExisting(false);
          setErrors({});
        }}
      />

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        loading={confirm.loading}
        title="Hapus laporan kegiatan ini?"
        description={
          <>
            <span className="font-semibold text-foreground">{initial?.judul}</span> akan dihapus
            permanen. Tindakan ini tidak dapat dibatalkan.
          </>
        }
        consequences={[
          "Kegiatan hilang dari rekap, statistik, dan dokumen cetak",
          ...(initial?.foto_url ? ["Foto kegiatan ikut terhapus"] : []),
          "Komentar & feedback pada laporan ini ikut terhapus",
        ]}
        confirmLabel="Ya, hapus"
        onConfirm={onDelete}
      />
    </>
  );
}
