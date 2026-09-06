import * as React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "@/hooks/use-refresh";
import { Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Field, fieldAria } from "@/components/shared/field";
import { FilePicker } from "@/components/shared/file-picker";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { UnsavedBar } from "@/components/shared/unsaved-bar";
import { createClient } from "@/lib/supabase/client";
import { removePublicFile, uploadPublicFile } from "@/lib/upload";
import { deleteSkmActivity, saveSkmActivity } from "@/lib/skm-actions";
import type { SkmPointRule } from "@/lib/skm-preset";
import { MAX_CERTIFICATE_SIZE, SKM_KATEGORI, STORAGE_BUCKET_CERTIFICATES } from "@/lib/constants";
import { todayISO } from "@/lib/format";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { useDirtyState, useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { SkmActivity } from "@/lib/types";

const NO_TINGKAT = "manual";

interface FormState {
  kategori: string;
  judul: string;
  penyelenggara: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  poin: string;
  jamSosial: string;
  tags: string[];
  deskripsi: string;
  credentialId: string;
}

export function SkmForm({
  userId,
  initial,
  rules,
  withJamSosial = false,
}: {
  userId: string;
  initial?: SkmActivity;
  /** Aturan poin persona aktif — mengisi dropdown Tingkat/Peran. */
  rules: SkmPointRule[];
  /** Persona BINUS: tampilkan input jam kegiatan sosial. */
  withJamSosial?: boolean;
}) {
  const navigate = useNavigate();
  const refresh = useRefresh();
  const isEdit = Boolean(initial);
  const confirm = useConfirm();

  const initialState = React.useMemo<FormState>(
    () => ({
      kategori: initial?.kategori ?? SKM_KATEGORI[0].value,
      judul: initial?.judul ?? "",
      penyelenggara: initial?.penyelenggara ?? "",
      tanggalMulai: initial?.tanggal_mulai ?? todayISO(),
      tanggalSelesai: initial?.tanggal_selesai ?? "",
      poin: String(initial?.poin_skm ?? 0),
      jamSosial: initial?.jam_sosial != null ? String(initial.jam_sosial) : "",
      tags: initial?.skill_tags ?? [],
      deskripsi: initial?.deskripsi ?? "",
      credentialId: initial?.credential_id ?? "",
    }),
    [initial],
  );

  const [form, setForm] = React.useState<FormState>(initialState);
  const [tingkat, setTingkat] = React.useState(initial?.rule_id ?? NO_TINGKAT);
  const [file, setFile] = React.useState<File | null>(null);
  const [removeExisting, setRemoveExisting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [progress, setProgress] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  const dirty = useDirtyState(form, initialState) || Boolean(file) || removeExisting;
  useUnsavedChanges(
    dirty && !busy,
    "Ada perubahan yang belum disimpan. Tinggalkan halaman ini?",
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  const tingkatOptions = React.useMemo(
    () => rules.filter((r) => r.kategori === form.kategori),
    [rules, form.kategori],
  );

  function onKategoriChange(value: string) {
    set("kategori", value);
    setTingkat(NO_TINGKAT);
  }

  function onTingkatChange(value: string) {
    setTingkat(value);
    if (value === NO_TINGKAT) return;
    const rule = rules.find((r) => r.id === value);
    if (rule) set("poin", String(rule.poin));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.judul.trim()) next.judul = "Judul kegiatan wajib diisi.";
    if (!form.penyelenggara.trim()) next.penyelenggara = "Penyelenggara wajib diisi.";
    if (!form.tanggalMulai) next.tanggalMulai = "Tanggal mulai wajib diisi.";
    if (form.tanggalSelesai && form.tanggalSelesai < form.tanggalMulai) {
      next.tanggalSelesai = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
    }
    if (Number(form.poin) < 0) next.poin = "Poin tidak boleh negatif.";
    if (form.jamSosial.trim() !== "" && !(Number(form.jamSosial) >= 0)) {
      next.jamSosial = "Jam sosial harus angka 0 atau lebih.";
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
    const previousUrl = initial?.certificate_url ?? null;

    try {
      let certificateUrl = removeExisting ? null : previousUrl;

      if (file) {
        setProgress(0);
        certificateUrl = await uploadPublicFile(
          supabase,
          STORAGE_BUCKET_CERTIFICATES,
          userId,
          file,
          setProgress,
        );
      }

      const selectedRule = rules.find((r) => r.id === tingkat) ?? null;
      const payload = {
        id: initial?.id,
        judul: form.judul.trim(),
        kategori: form.kategori,
        penyelenggara: form.penyelenggara.trim(),
        tanggal_mulai: form.tanggalMulai,
        tanggal_selesai: form.tanggalSelesai || null,
        poin_skm: Number(form.poin) || 0,
        deskripsi: form.deskripsi.trim() || null,
        skill_tags: form.tags.length ? form.tags : null,
        certificate_url: certificateUrl,
        credential_id: form.credentialId.trim() || null,
        tingkat: selectedRule?.tingkat ?? initial?.tingkat ?? null,
        rule_id: selectedRule?.id ?? null,
        jam_sosial: form.jamSosial.trim() === "" ? null : Number(form.jamSosial),
      };

      const result = await saveSkmActivity(payload);
      if ("error" in result) throw new Error(result.error);

      // Only once the row is safely written does the old file go.
      if ((file || removeExisting) && previousUrl && previousUrl !== certificateUrl) {
        await removePublicFile(supabase, STORAGE_BUCKET_CERTIFICATES, previousUrl);
      }

      notifySuccess(isEdit ? "Kegiatan SKM diperbarui" : "Kegiatan SKM tersimpan", {
        description: `${payload.judul} · ${payload.poin_skm} poin`,
      });

      navigate("/skm");
      refresh();
    } catch (err) {
      notifyError("Gagal menyimpan kegiatan", { description: describeError(err) });
      setBusy(false);
      setProgress(null);
    }
  }

  async function onDelete() {
    if (!initial) return;
    confirm.setLoading(true);

    const result = await deleteSkmActivity(initial.id);

    if ("error" in result) {
      notifyError("Gagal menghapus kegiatan", { description: describeError(result.error) });
      confirm.close();
      return;
    }

    // Row is gone; now the certificate can be discarded safely.
    await removePublicFile(createClient(), STORAGE_BUCKET_CERTIFICATES, initial.certificate_url);

    notifySuccess("Kegiatan SKM dihapus", { description: initial.judul });
    confirm.close();
    navigate("/skm");
    refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4 pb-20 lg:pb-0">
        <Card>
          <CardHeader>
            <CardTitle>Kategori & Bobot</CardTitle>
            <CardDescription>
              Pilih tingkat untuk mengisi poin otomatis. Nilainya tetap bisa Anda ubah manual.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategori Kegiatan" htmlFor="kategori" required>
              <Select value={form.kategori} onValueChange={onKategoriChange}>
                <SelectTrigger id="kategori">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKM_KATEGORI.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.emoji} {k.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Tingkat / Peran"
              htmlFor="tingkat"
              optional="untuk saran poin"
              hint="Menentukan bobot poin bawaan berdasarkan aturan SKM."
            >
              <Select value={tingkat} onValueChange={onTingkatChange}>
                <SelectTrigger id="tingkat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TINGKAT}>Isi poin manual</SelectItem>
                  {tingkatOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.tingkat} — {r.poin} poin
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detail Kegiatan</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field label="Judul Kegiatan / Peran" htmlFor="judul" required error={errors.judul}>
              <Input
                {...fieldAria("judul", errors.judul)}
                maxLength={255}
                placeholder="mis. Juara 1 Hackathon Nasional IT / Ketua Divisi Humas HIMA"
                value={form.judul}
                onChange={(e) => set("judul", e.target.value)}
              />
            </Field>

            <Field
              label="Penyelenggara / Instansi"
              htmlFor="penyelenggara"
              required
              error={errors.penyelenggara}
            >
              <Input
                {...fieldAria("penyelenggara", errors.penyelenggara)}
                maxLength={255}
                placeholder="mis. Kementerian Kominfo / Dicoding Indonesia / HMTI USTB"
                value={form.penyelenggara}
                onChange={(e) => set("penyelenggara", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Tanggal Mulai"
                htmlFor="mulai"
                required
                error={errors.tanggalMulai}
              >
                <Input
                  {...fieldAria("mulai", errors.tanggalMulai)}
                  type="date"
                  value={form.tanggalMulai}
                  onChange={(e) => set("tanggalMulai", e.target.value)}
                />
              </Field>

              <Field
                label="Tanggal Selesai"
                htmlFor="selesai"
                optional="opsional"
                error={errors.tanggalSelesai}
              >
                <Input
                  {...fieldAria("selesai", errors.tanggalSelesai)}
                  type="date"
                  min={form.tanggalMulai || undefined}
                  value={form.tanggalSelesai}
                  onChange={(e) => set("tanggalSelesai", e.target.value)}
                />
              </Field>

              <Field label="Bobot Poin SKM" htmlFor="poin" error={errors.poin}>
                <Input
                  {...fieldAria("poin", errors.poin)}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.poin}
                  onChange={(e) => set("poin", e.target.value)}
                />
              </Field>

              {withJamSosial && (
                <Field
                  label="Jam Kegiatan Sosial"
                  htmlFor="jamsos"
                  optional="opsional"
                  hint="Dihitung ke bar jam sosial persona (syarat BINUS: 30 jam)."
                  error={errors.jamSosial}
                >
                  <Input
                    {...fieldAria("jamsos", errors.jamSosial)}
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={form.jamSosial}
                    onChange={(e) => set("jamSosial", e.target.value)}
                  />
                </Field>
              )}
            </div>

            <Field
              label="Skill Tags"
              htmlFor="tags"
              optional="opsional"
              hint="Tekan Enter atau koma untuk menambah. Tag ini muncul pada baris Skills di LinkedIn."
            >
              <TagInput
                id="tags"
                value={form.tags}
                onChange={(tags) => set("tags", tags)}
                placeholder="React, ProjectManagement, PublicSpeaking…"
              />
            </Field>

            <Field
              label="Deskripsi Pencapaian & Tanggung Jawab"
              htmlFor="deskripsi"
              optional="opsional"
              hint="Satu baris = satu bullet pada format LinkedIn Experience."
            >
              <Textarea
                {...fieldAria("deskripsi", null, true)}
                rows={4}
                placeholder={"Memimpin tim berisi 5 developer…\nMeningkatkan partisipasi anggota sebesar 40%…"}
                value={form.deskripsi}
                onChange={(e) => set("deskripsi", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bukti Sertifikat</CardTitle>
            <CardDescription>
              Berkas ini dipakai sebagai Credential URL saat men-generate teks LinkedIn.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field label="Credential ID" htmlFor="credential" optional="opsional">
              <Input
                {...fieldAria("credential")}
                maxLength={120}
                placeholder="mis. SKM-CERT-2026-0881"
                value={form.credentialId}
                onChange={(e) => set("credentialId", e.target.value)}
              />
            </Field>

            <Field
              label="Bukti Sertifikat / SK"
              htmlFor="berkas"
              optional="opsional, maks 20MB"
              error={errors.berkas}
            >
              <FilePicker
                id="berkas"
                accept="image/*,application/pdf"
                maxBytes={MAX_CERTIFICATE_SIZE}
                file={file}
                progress={progress}
                disabled={busy}
                hint="Gambar atau PDF, maksimal 20 MB"
                existingUrl={removeExisting ? null : initial?.certificate_url}
                onRemoveExisting={() => setRemoveExisting(true)}
                onFileChange={(next, error) => {
                  setFile(next);
                  setErrors((e) => ({ ...e, berkas: error ?? "" }));
                  if (!error) {
                    setErrors((e) => {
                      const n = { ...e };
                      delete n.berkas;
                      return n;
                    });
                  }
                }}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button type="submit" variant="gradient" loading={busy}>
              {!busy && <Save aria-hidden />}
              {busy ? "Menyimpan…" : "Simpan Kegiatan"}
            </Button>
            <Button asChild variant="outline" disabled={busy}>
              <Link to="/skm">Batal</Link>
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

      <UnsavedBar visible={dirty && !busy} />

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        loading={confirm.loading}
        title="Hapus kegiatan SKM ini?"
        description={
          <>
            <span className="font-semibold text-foreground">{initial?.judul}</span> akan dihapus
            permanen. Tindakan ini tidak dapat dibatalkan.
          </>
        }
        consequences={[
          `Poin ${initial?.poin_skm ?? 0} akan berkurang dari total SKM Anda`,
          ...(initial?.certificate_url ? ["Berkas bukti sertifikat ikut terhapus"] : []),
        ]}
        confirmLabel="Ya, hapus"
        onConfirm={onDelete}
      />
    </>
  );
}
