import * as React from "react";
import { Link } from "react-router-dom";
import { MailCheck, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/shared/form-alert";
import supabase from "@/lib/supabase/client";
import { confirmUrl } from "@/lib/site-url";
import { describeError } from "@/lib/notify";
import { MAIL_SENDER, MAIL_SUBJECT_CONFIRM } from "@/lib/constants";

const COOLDOWN = 60;

/**
 * Menggantikan seluruh form pendaftaran setelah signUp berhasil.
 *
 * Sengaja bukan banner: form aslinya sepanjang delapan kolom dengan tombol
 * kirim di bawah, jadi pemberitahuan apa pun di atasnya berada di luar layar
 * persis pada saat dibutuhkan. Dengan formnya lenyap, halaman menyusut dan
 * narasi ini menjadi satu-satunya yang terlihat.
 */
export default function RegisterSuccess({
  email,
  unverified = false,
}: {
  email: string;
  /** Akunnya sudah ada dari pendaftaran sebelumnya dan belum diaktifkan. */
  unverified?: boolean;
}) {
  // Pendaftaran ulang atas akun yang belum aktif tidak memicu email baru dari
  // signUp, jadi menahan tombol kirim ulang 60 detik cuma membuat orang duduk
  // menunggu tanpa satu pun email dalam perjalanan.
  const [left, setLeft] = React.useState(unverified ? 0 : COOLDOWN);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<{ tone: "error" | "success"; text: string } | null>(null);

  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  React.useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(id);
  }, [left]);

  async function resend() {
    setBusy(true);
    setNote(null);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmUrl() },
    });
    setBusy(false);

    if (error) {
      setNote({ tone: "error", text: describeError(error) });
      return;
    }
    setLeft(COOLDOWN);
    setNote({ tone: "success", text: "Email dikirim ulang. Cek kotak masuk Anda sekali lagi." });
  }

  return (
    <div className="space-y-4 text-center">
      <span
        className="mx-auto flex size-14 items-center justify-center rounded-xl border border-foreground bg-success text-success-foreground"
        aria-hidden
      >
        <MailCheck className="size-7" />
      </span>

      <div>
        <h2 className="text-lg font-bold text-foreground">
          {unverified ? "Akun ini belum diverifikasi" : "Cek email kamu"}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {unverified ? (
            <>
              <strong className="break-all font-semibold text-foreground">{email}</strong> sudah
              pernah didaftarkan, tapi tautan verifikasinya belum diklik. Kirim ulang tautannya di
              bawah — passwordmu yang lama tetap berlaku.
            </>
          ) : (
            <>
              Kami mengirim satu tautan ke{" "}
              <strong className="break-all font-semibold text-foreground">{email}</strong>. Klik
              tombol di dalam email itu, lalu kamu bisa langsung masuk.
            </>
          )}
        </p>
      </div>

      {/*
        Yang dicari, bukan sekadar "cek spam".

        Emailnya datang dari pengirim Supabase, bukan dari alamat kampus mana
        pun, jadi orang yang menyapu kotak masuk mencari kata "Student Hub"
        sering melewatkannya. Dua baris ini sengaja bisa disalin apa adanya ke
        kotak pencarian email.
      */}
      <div className="rounded-lg border border-foreground bg-muted px-3 py-2.5 text-left">
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cari email dengan kata kunci ini
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
          Emailnya berbahasa Inggris dan dikirim atas nama Supabase — nama
          &ldquo;Student Hub&rdquo; tidak muncul di mana pun, jadi jangan mencarinya.
        </p>
        <dl className="mt-1.5 space-y-1 text-[12.5px]">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <dt className="shrink-0 text-muted-foreground">Dari</dt>
            <dd className="break-all font-mono font-medium text-foreground">{MAIL_SENDER}</dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <dt className="shrink-0 text-muted-foreground">Subjek</dt>
            <dd className="font-mono font-medium text-foreground">{MAIL_SUBJECT_CONFIRM}</dd>
          </div>
        </dl>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          Belum ada dalam 2 menit? Cek folder <strong>Spam</strong>, <strong>Promosi</strong>, atau{" "}
          <strong>Semua Email</strong> — pengirimnya bukan alamat kampus, jadi filter sering
          menyingkirkannya.
        </p>
      </div>

      {note && <FormAlert tone={note.tone}>{note.text}</FormAlert>}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={resend}
        loading={busy}
        disabled={left > 0}
      >
        {!busy && <RefreshCw aria-hidden />}
        {left > 0 ? `Kirim ulang email (${left}s)` : "Kirim ulang email"}
      </Button>

      <p className="text-[12.5px] text-muted-foreground">
        Sudah diverifikasi?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
