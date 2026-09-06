import * as React from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, fieldAria } from "@/components/shared/field";
import { FilePicker } from "@/components/shared/file-picker";
import { createClient } from "@/lib/supabase/client";
import { LogoRejected, analyzeLogo } from "@/lib/logo-canvas";
import { uploadOnboardingLogo } from "@/lib/logo-upload";
import { FormAlert } from "@/components/shared/form-alert";
import RegisterSuccess from "@/pages/register/RegisterSuccess";
import { confirmUrl } from "@/lib/site-url";
import { describeError } from "@/lib/notify";
import { MAX_LOGO_SIZE, MIN_PASSWORD, ORG } from "@/lib/constants";
import { makePersona, personaCss, type Persona } from "@/lib/persona";
import type { Swatch } from "@/lib/logo-analyze";
import { AnimatePresence } from "@/components/motion/motion-primitives";

export default function RegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    nama_lengkap: "",
    nim: "",
    email: "",
    instansi: ORG.kampus,
    tempat_kp: ORG.perusahaanMixed,
    password: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  /** Berisi alamat email begitu pendaftaran diterima; menggantikan seluruh form. */
  const [sent, setSent] = React.useState<string | null>(null);
  /** True bila akunnya sudah ada tapi belum diverifikasi, bukan baru dibuat. */
  const [unverified, setUnverified] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Persona kampus (dok 05). Logo diunggah begitu dipilih, bukan saat submit —
  // swatch harus sudah ada sebelum pengguna bisa memilih warnanya.
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [swatches, setSwatches] = React.useState<Swatch[]>([]);
  const [picked, setPicked] = React.useState<string[]>([]);

  const persona: Persona | null = React.useMemo(() => makePersona(picked), [picked]);

  async function onLogoChange(file: File | null, pickerError: string | null) {
    setLogoFile(file);
    setLogoError(pickerError);
    setLogoUrl(null);
    setSwatches([]);
    setPicked([]);
    if (!file || pickerError) return;

    setAnalyzing(true);
    try {
      // Analisis dulu, unggah kemudian: logo yang ditolak tidak perlu pernah
      // menyentuh bucket, dan pemilih warna muncul tanpa menunggu jaringan.
      const found = await analyzeLogo(file);
      setSwatches(found);
      setPicked(found.slice(0, 1).map((sw) => sw.hex));

      const url = await uploadOnboardingLogo(file);
      setLogoUrl(url);
    } catch (err) {
      setLogoError(
        err instanceof LogoRejected ? err.message : describeError(err),
      );
      setLogoFile(null);
      setSwatches([]);
      setPicked([]);
    } finally {
      setAnalyzing(false);
    }
  }

  function togglePick(hex: string) {
    setPicked((cur) =>
      cur.includes(hex)
        ? cur.filter((h) => h !== hex)
        : cur.length < 2
          ? [...cur, hex]
          : [cur[1], hex],
    );
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear the field's error the moment the user starts fixing it.
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
    if (!form.nim.trim()) next.nim = "NIM wajib diisi.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Format email belum benar.";
    if (form.password.length < MIN_PASSWORD) {
      next.password = `Password minimal ${MIN_PASSWORD} karakter.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setBusy(true);
    const supabase = createClient();
    const email = form.email.trim();

    /*
      Baca database dulu.

      signUp() TIDAK memberi galat untuk email yang sudah terdaftar — Supabase
      mengaburkannya demi anti user-enumeration, lalu mengembalikan pengguna
      palsu tanpa sesi. Tanpa pengecekan ini, pendaftaran kedua dengan alamat
      yang sama berakhir di layar "cek email kamu" untuk email yang tidak
      pernah dikirim.

      Galat RPC-nya sengaja diabaikan: jaringan bermasalah atau skema belum
      dipasang tidak boleh memblokir orang mendaftar. Cek identities di bawah
      yang menangkap sisanya.
    */
    const { data: status } = await supabase.rpc("status_email", { p_email: email });

    if (status === "terdaftar") {
      setFormError("Email ini sudah terdaftar. Silakan masuk lewat halaman Masuk.");
      setErrors((e) => ({ ...e, email: "Sudah dipakai akun lain." }));
      setBusy(false);
      return;
    }

    if (status === "belum_verifikasi") {
      // Akunnya ada tapi belum aktif: yang dibutuhkan tombol kirim ulang,
      // bukan galat merah yang menyuruh masuk ke akun yang belum bisa dipakai.
      setUnverified(true);
      setSent(email);
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        // Tanpa ini Supabase memakai Site URL, dan pengguna yang sudah
        // terverifikasi mendarat di /login alih-alih masuk ke aplikasi.
        emailRedirectTo: confirmUrl(),
        data: {
          nama_lengkap: form.nama_lengkap.trim(),
          nim: form.nim.trim(),
          instansi: form.instansi.trim(),
          tempat_kp: form.tempat_kp.trim(),
          // Kunci persona sengaja dihilangkan seluruhnya bila tak ada logo,
          // supaya {{ if .Data.logo_url }} pada template email Supabase jatuh
          // ke cabang bawaan alih-alih merender gambar kosong.
          ...(logoUrl && persona
            ? {
                logo_url: logoUrl,
                warna_primer: persona.primary,
                warna_aksen: persona.accent,
              }
            : {}),
        },
      },
    });

    if (error) {
      setFormError(
        /already registered|already been registered/i.test(error.message)
          ? "Email ini sudah terdaftar. Silakan masuk."
          : describeError(error),
      );
      setBusy(false);
      return;
    }

    // Jaring pengaman bila RPC di atas gagal: pengguna palsu yang dikembalikan
    // untuk email terdaftar selalu punya identities kosong.
    if (data.user && data.user.identities?.length === 0) {
      setFormError("Email ini sudah terdaftar. Silakan masuk lewat halaman Masuk.");
      setErrors((e) => ({ ...e, email: "Sudah dipakai akun lain." }));
      setBusy(false);
      return;
    }

    // No session means the project still requires email confirmation.
    if (!data.session) {
      setSent(email);
      setBusy(false);
      return;
    }

    navigate("/dashboard", { replace: true });
  }

  const strength =
    form.password.length === 0
      ? null
      : form.password.length < MIN_PASSWORD
        ? "kurang"
        : form.password.length < 10
          ? "cukup"
          : "kuat";

  if (sent) return <RegisterSuccess email={sent} unverified={unverified} />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <AnimatePresence initial={false}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
      </AnimatePresence>

      <Field label="Nama Lengkap" htmlFor="nama" required error={errors.nama_lengkap}>
        <Input
          {...fieldAria("nama", errors.nama_lengkap)}
          value={form.nama_lengkap}
          onChange={(e) => set("nama_lengkap", e.target.value)}
          autoComplete="name"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="NIM" htmlFor="nim" required error={errors.nim}>
          <Input
            {...fieldAria("nim", errors.nim)}
            value={form.nim}
            onChange={(e) => set("nim", e.target.value)}
          />
        </Field>

        <Field label="Email" htmlFor="email" required error={errors.email}>
          <Input
            {...fieldAria("email", errors.email)}
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label="Instansi / Sekolah" htmlFor="instansi">
        <Input
          {...fieldAria("instansi")}
          value={form.instansi}
          onChange={(e) => set("instansi", e.target.value)}
        />
      </Field>

      {/* Persona kampus — logo mewarnai email verifikasi, aplikasi, dan ekspor. */}
      {persona && <style dangerouslySetInnerHTML={{ __html: personaCss(persona) }} />}

      <Field
        label="Logo Kampus"
        htmlFor="logo"
        hint="PNG tanpa background, maksimal 2 MB. Logo ini dipakai pada email verifikasi, kop dokumen, dan seluruh hasil ekspor."
        error={logoError ?? undefined}
      >
        <FilePicker
          id="logo"
          accept="image/png"
          maxBytes={MAX_LOGO_SIZE}
          file={logoFile}
          onFileChange={onLogoChange}
          disabled={busy || analyzing}
          hint={analyzing ? "Menganalisis logo…" : undefined}
        />
      </Field>

      {swatches.length > 0 && (
        <Field
          label="Warna Utama"
          htmlFor="warna"
          hint="Pilih satu atau dua warna dominan logo. Yang lebih gelap dipakai untuk kop dokumen, yang lebih terang untuk tombol dan tautan."
        >
          <div id="warna" className="flex flex-wrap items-center gap-2">
            {swatches.map((s) => {
              const on = picked.includes(s.hex);
              return (
                <button
                  key={s.hex}
                  type="button"
                  onClick={() => togglePick(s.hex)}
                  aria-pressed={on}
                  title={`${s.hex} · ${Math.round(s.share * 100)}% area logo`}
                  className={`size-9 rounded-full border-2 transition ${
                    on ? "border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background" : "border-border"
                  }`}
                  style={{ background: s.hex }}
                >
                  <span className="sr-only">
                    {on ? "Batalkan pilih" : "Pilih"} warna {s.hex}
                  </span>
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Tempat Kerja Praktek" htmlFor="tempat">
        <Input
          {...fieldAria("tempat")}
          value={form.tempat_kp}
          onChange={(e) => set("tempat_kp", e.target.value)}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        error={errors.password}
        hint={
          strength
            ? `Panjang ${form.password.length} karakter — kekuatan ${strength}.`
            : `Minimal ${MIN_PASSWORD} karakter.`
        }
      >
        <PasswordInput
          {...fieldAria("password", errors.password, true)}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          autoComplete="new-password"
        />
      </Field>

      <Button
        type="submit"
        variant="gradient"
        loading={busy}
        disabled={analyzing}
        className="w-full"
      >
        {!busy && <UserPlus aria-hidden />}
        {busy ? "Memproses…" : "Daftar"}
      </Button>
    </form>
  );
}
