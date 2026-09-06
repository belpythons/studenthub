import * as React from "react";
import { KeyRound, LogOut, Mail, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, fieldAria } from "@/components/shared/field";
import { FormAlert } from "@/components/shared/form-alert";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { AnimatePresence } from "@/components/motion/motion-primitives";
import supabase from "@/lib/supabase/client";
import { confirmUrl } from "@/lib/site-url";
import { MIN_PASSWORD } from "@/lib/constants";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";

type Note = { tone: "error" | "success"; text: string } | null;

export function AccountSecurity({ email }: { email: string }) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
          Akun &amp; Keamanan
        </CardTitle>
        <CardDescription>
          Ganti password atau alamat email Anda. NIM dan nama kampus tidak bisa diubah dari sini.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ChangePassword email={email} />
        <div className="border-t border-foreground pt-6">
          <ChangeEmail current={email} />
        </div>
        <div className="border-t border-foreground pt-6">
          <SignOutEverywhere />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- password */

function ChangePassword({ email }: { email: string }) {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [note, setNote] = React.useState<Note>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);

    const next_: Record<string, string> = {};
    if (!current) next_.current = "Masukkan password Anda saat ini.";
    if (next.length < MIN_PASSWORD) next_.next = `Password minimal ${MIN_PASSWORD} karakter.`;
    if (next !== confirm) next_.confirm = "Konfirmasi password tidak cocok.";
    setErrors(next_);
    if (Object.keys(next_).length) return;

    setBusy(true);

    /*
      Verifikasi password lama dulu, baru tulis yang baru.

      updateUser({ password }) hanya butuh sesi yang masih hidup. Tanpa langkah
      ini, siapa pun yang menemukan perangkat dengan sesi tertinggal terbuka
      bisa mengunci pemiliknya keluar dari akunnya sendiri.
    */
    const { error: reauth } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauth) {
      setBusy(false);
      setErrors({ current: "Password saat ini salah." });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);

    if (error) {
      setNote({ tone: "error", text: describeError(error) });
      return;
    }

    setCurrent("");
    setNext("");
    setConfirm("");
    notifySuccess("Password diperbarui", {
      description: "Pakai password baru ini saat masuk berikutnya.",
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden />
        Ganti Password
      </p>

      <AnimatePresence initial={false}>
        {note && <FormAlert tone={note.tone}>{note.text}</FormAlert>}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Password Saat Ini" htmlFor="pw-lama" required error={errors.current}>
          <PasswordInput
            {...fieldAria("pw-lama", errors.current, true)}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>

        <Field
          label="Password Baru"
          htmlFor="pw-baru"
          required
          error={errors.next}
          hint={`Minimal ${MIN_PASSWORD} karakter.`}
        >
          <PasswordInput
            {...fieldAria("pw-baru", errors.next, true)}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>

        <Field label="Ulangi Password Baru" htmlFor="pw-ulang" required error={errors.confirm}>
          <PasswordInput
            {...fieldAria("pw-ulang", errors.confirm, true)}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" loading={busy}>
        {!busy && <KeyRound aria-hidden />}
        Simpan Password Baru
      </Button>
    </form>
  );
}

/* ---------------------------------------------------------------- email */

function ChangeEmail({ current }: { current: string }) {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<Note>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNote(null);

    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Format email belum benar.");
      return;
    }
    if (value.toLowerCase() === current.toLowerCase()) {
      setError("Itu alamat email Anda yang sekarang.");
      return;
    }
    setError(null);
    setBusy(true);

    const { error: err } = await supabase.auth.updateUser(
      { email: value },
      { emailRedirectTo: confirmUrl() },
    );
    setBusy(false);

    if (err) {
      setNote({ tone: "error", text: describeError(err) });
      return;
    }

    setEmail("");
    setNote({
      tone: "success",
      text:
        `Tautan konfirmasi dikirim ke ${value}. ` +
        "Alamat lama masih berlaku sampai tautan itu diklik. Bila proyek ini " +
        "mengaktifkan Secure email change, cek juga kotak masuk alamat lama.",
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <Mail className="size-4 text-muted-foreground" aria-hidden />
        Ganti Email
      </p>

      <AnimatePresence initial={false}>
        {note && <FormAlert tone={note.tone}>{note.text}</FormAlert>}
      </AnimatePresence>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email Sekarang" htmlFor="email-lama">
          <Input
            {...fieldAria("email-lama")}
            value={current}
            readOnly
            disabled
            className="cursor-not-allowed bg-muted text-muted-foreground"
          />
        </Field>

        <Field
          label="Email Baru"
          htmlFor="email-baru"
          required
          error={error}
          hint="Perlu diverifikasi lewat tautan yang kami kirim."
        >
          <Input
            {...fieldAria("email-baru", error)}
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </div>

      <Button type="submit" loading={busy}>
        {!busy && <Mail aria-hidden />}
        Kirim Tautan Verifikasi
      </Button>
    </form>
  );
}

/* --------------------------------------------------------------- logout */

function SignOutEverywhere() {
  const confirm = useConfirm();

  async function onConfirm() {
    confirm.setLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      notifyError("Gagal keluar dari semua perangkat", { description: describeError(error) });
      confirm.close();
      return;
    }
    // SessionProvider menangkap peristiwa SIGNED_OUT dan RequireAuth yang
    // mengalihkan ke /login; tidak perlu navigate() manual di sini.
    confirm.close();
  }

  return (
    <>
      <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <LogOut className="size-4 text-muted-foreground" aria-hidden />
        Keluar dari Semua Perangkat
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Mengakhiri sesi di setiap peramban dan ponsel yang pernah Anda pakai masuk. Lakukan
        ini bila perangkat Anda hilang atau setelah mengganti password.
      </p>
      <Button type="button" variant="outline-destructive" className="mt-3" onClick={confirm.ask}>
        <LogOut aria-hidden />
        Keluar dari Semua Perangkat
      </Button>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        loading={confirm.loading}
        title="Keluar dari semua perangkat?"
        description="Semua sesi diakhiri, termasuk yang sedang Anda pakai sekarang."
        consequences={["Anda harus masuk lagi di setiap perangkat"]}
        confirmLabel="Ya, keluarkan semua"
        onConfirm={onConfirm}
      />
    </>
  );
}
