import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { FileSignature, Save, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, fieldAria } from "@/components/shared/field";
import { UnsavedBar } from "@/components/shared/unsaved-bar";
import { createClient } from "@/lib/supabase/client";
import { ORG } from "@/lib/constants";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { useDirtyState, useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import type { Profile } from "@/lib/types";

const FORM_ID = "form-profil";

export function ProfileForm({
  userId,
  email,
  initial,
}: {
  userId: string;
  email: string;
  initial: Profile | null;
}) {
  const refresh = useRefresh();

  /*
    handle_new_user() memasang '-' sebagai placeholder ketika pendaftaran tidak
    membawa NIM. Memperlakukan placeholder itu sebagai nilai sah akan mengunci
    pengguna selamanya pada tanda hubung — sama seperti syarat pada trigger
    profiles_identity_locked.
  */
  const nimLocked = Boolean(initial?.nim && initial.nim !== "-");

  const initialState = React.useMemo(
    () => ({
      nama_lengkap: initial?.nama_lengkap ?? "",
      nim: nimLocked ? initial!.nim : "",
      prodi: initial?.prodi ?? "Teknik Informatika",
      tempat_kp: initial?.tempat_kp ?? ORG.perusahaanMixed,
      pembimbing_nama: initial?.pembimbing_nama ?? "",
      pembimbing_jabatan: initial?.pembimbing_jabatan ?? "",
      lokasi_ttd: initial?.lokasi_ttd ?? ORG.lokasi,
      periode_mulai: initial?.periode_mulai ?? "",
      periode_selesai: initial?.periode_selesai ?? "",
    }),
    [initial, nimLocked],
  );

  const [form, setForm] = React.useState(initialState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);

  const dirty = useDirtyState(form, initialState);
  useUnsavedChanges(dirty && !busy, "Ada perubahan yang belum disimpan. Tinggalkan halaman ini?");

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.nama_lengkap.trim()) next.nama_lengkap = "Nama lengkap wajib diisi.";
    if (!nimLocked && !form.nim.trim()) next.nim = "NIM wajib diisi.";
    if (
      form.periode_mulai &&
      form.periode_selesai &&
      form.periode_selesai < form.periode_mulai
    ) {
      next.periode_selesai = "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.";
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

    /*
      Upsert, not update.

      `.update().eq("id", …)` returns 204 with no error when it matches zero
      rows, so a missing profiles row produced a "Profil tersimpan." message
      while nothing was written — and the print letterheads stayed blank. The
      upsert creates the row when absent, and `.select()` makes the write
      verifiable instead of assumed.
    */
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email,
          nama_lengkap: form.nama_lengkap.trim(),
          /*
            nim hanya ikut selama belum terkunci; instansi tidak pernah ikut.
            Trigger profiles_identity_locked menolak perubahan keduanya begitu
            bernilai nyata, jadi mengirimkannya kembali akan menggagalkan
            seluruh simpanan hanya karena kolom yang memang tidak berubah.
          */
          ...(nimLocked ? {} : { nim: form.nim.trim() }),
          ...(initial ? {} : { instansi: ORG.kampus }),
          prodi: form.prodi.trim() || null,
          tempat_kp: form.tempat_kp.trim() || null,
          pembimbing_nama: form.pembimbing_nama.trim() || null,
          pembimbing_jabatan: form.pembimbing_jabatan.trim() || null,
          lokasi_ttd: form.lokasi_ttd.trim() || null,
          periode_mulai: form.periode_mulai || null,
          periode_selesai: form.periode_selesai || null,
        },
        { onConflict: "id" },
      )
      .select("id")
      .maybeSingle();

    setBusy(false);

    if (error) {
      notifyError("Gagal menyimpan profil", { description: describeError(error) });
      return;
    }

    if (!data) {
      notifyError("Profil tidak tersimpan", {
        description: "Server tidak mengembalikan data tersimpan. Coba muat ulang halaman.",
      });
      return;
    }

    notifySuccess("Profil tersimpan", {
      description: "Kop surat dan blok pengesahan pada kedua dokumen cetak ikut diperbarui.",
    });
    refresh();
  }

  const pengesahanKosong = !form.pembimbing_nama.trim();

  return (
    <>
      <form id={FORM_ID} onSubmit={onSubmit} noValidate className="space-y-4 pb-24 lg:pb-20">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-4 text-muted-foreground" aria-hidden />
              Identitas Mahasiswa
            </CardTitle>
            <CardDescription>
              Mengisi identitas pada Formulir 2 dan Section I dokumen rekap magang.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Lengkap" htmlFor="nama" required error={errors.nama_lengkap}>
                <Input
                  {...fieldAria("nama", errors.nama_lengkap)}
                  value={form.nama_lengkap}
                  onChange={(e) => set("nama_lengkap", e.target.value)}
                  autoComplete="name"
                />
              </Field>

              {nimLocked ? (
                <Field
                  label="NIM"
                  htmlFor="nim"
                  hint="Terkunci sejak pendaftaran. Hubungi admin bila keliru."
                >
                  <Input
                    {...fieldAria("nim")}
                    value={initial!.nim}
                    readOnly
                    disabled
                    className="cursor-not-allowed bg-muted text-muted-foreground"
                  />
                </Field>
              ) : (
                <Field
                  label="NIM"
                  htmlFor="nim"
                  required
                  error={errors.nim}
                  hint="Sekali disimpan, NIM tidak bisa diubah lagi. Periksa dulu."
                >
                  <Input
                    {...fieldAria("nim", errors.nim)}
                    value={form.nim}
                    onChange={(e) => set("nim", e.target.value)}
                  />
                </Field>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Program Studi" htmlFor="prodi">
                <Input
                  {...fieldAria("prodi")}
                  value={form.prodi}
                  onChange={(e) => set("prodi", e.target.value)}
                />
              </Field>

              <Field
                label="Instansi / Sekolah"
                htmlFor="instansi"
                hint="Terkunci sejak pendaftaran."
              >
                <Input
                  {...fieldAria("instansi")}
                  value={initial?.instansi ?? ORG.kampus}
                  readOnly
                  disabled
                  className="cursor-not-allowed bg-muted text-muted-foreground"
                />
              </Field>

              <Field label="Tempat Kerja Praktek" htmlFor="tempat">
                <Input
                  {...fieldAria("tempat")}
                  value={form.tempat_kp}
                  onChange={(e) => set("tempat_kp", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Periode Magang — Mulai" htmlFor="p-mulai">
                <Input
                  {...fieldAria("p-mulai")}
                  type="date"
                  value={form.periode_mulai}
                  onChange={(e) => set("periode_mulai", e.target.value)}
                />
              </Field>

              <Field
                label="Periode Magang — Selesai"
                htmlFor="p-selesai"
                error={errors.periode_selesai}
              >
                <Input
                  {...fieldAria("p-selesai", errors.periode_selesai)}
                  type="date"
                  min={form.periode_mulai || undefined}
                  value={form.periode_selesai}
                  onChange={(e) => set("periode_selesai", e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="size-4 text-muted-foreground" aria-hidden />
              Blok Pengesahan
            </CardTitle>
            <CardDescription>
              Mengisi kolom tanda tangan pada Formulir 2 dan lembar Pengesahan rekap magang.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nama Pembimbing Lapangan" htmlFor="pb-nama">
                <Input
                  {...fieldAria("pb-nama")}
                  placeholder="mis. Saleh Nurdin"
                  value={form.pembimbing_nama}
                  onChange={(e) => set("pembimbing_nama", e.target.value)}
                />
              </Field>

              <Field label="Jabatan Pembimbing Lapangan" htmlFor="pb-jabatan">
                <Input
                  {...fieldAria("pb-jabatan")}
                  placeholder="mis. Superintendent IT Planning"
                  value={form.pembimbing_jabatan}
                  onChange={(e) => set("pembimbing_jabatan", e.target.value)}
                />
              </Field>

              <Field label="Lokasi Tanda Tangan" htmlFor="lokasi">
                <Input
                  {...fieldAria("lokasi")}
                  placeholder="Bontang"
                  value={form.lokasi_ttd}
                  onChange={(e) => set("lokasi_ttd", e.target.value)}
                />
              </Field>
            </div>

            {pengesahanKosong && (
              <p className="rounded-md border border-foreground bg-muted/50 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
                Dibiarkan kosong: Formulir 2 akan memakai pembimbing yang paling sering muncul pada
                entri log book Anda, dan dokumen rekap hanya menampilkan nama perusahaan.
              </p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" variant="gradient" loading={busy}>
          {!busy && <Save aria-hidden />}
          {busy ? "Menyimpan…" : "Simpan Profil"}
        </Button>
      </form>

      <UnsavedBar
        visible={dirty && !busy}
        formId={FORM_ID}
        saving={busy}
        saveLabel="Simpan Profil"
        onDiscard={() => {
          setForm(initialState);
          setErrors({});
        }}
      />
    </>
  );
}
