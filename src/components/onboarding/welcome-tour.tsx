import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon3d, type Icon3dName } from "@/components/shared/icon-3d";
import { ORG, SKM_TARGET_POIN } from "@/lib/constants";
import { useSession } from "@/lib/session";
import supabase from "@/lib/supabase/client";

interface Step {
  icon: Icon3dName;
  judul: string;
  isi: string;
  /** Satu pertanyaan yang benar-benar ditanyakan orang di layar ini. */
  tanya: string;
  jawab: string;
}

/*
  Enam langkah, bukan tur bertumpuk sorotan di atas antarmuka.

  Sorotan berbasis koordinat elemen pecah begitu tata letaknya berubah, dan
  aplikasi ini punya tiga modul yang bilah sampingnya berbeda antara ponsel dan
  layar lebar. Dialog polos memuat penjelasan yang sama, hidup di satu berkas,
  dan tidak pernah menunjuk tombol yang sudah pindah.
*/
const STEPS: Step[] = [
  {
    icon: "bulb",
    judul: "Selamat datang di Student Hub",
    isi: `Satu tempat untuk tiga hal yang selama ini tercecer: poin SKM, laporan magang di ${ORG.perusahaanMixed}, dan log book konsultasi dengan pembimbing. Semuanya bisa dicetak jadi dokumen resmi kampus.`,
    tanya: "Ini menggantikan berkas Excel dan Word saya?",
    jawab:
      "Ya. Isi datanya sekali di sini, lalu cetak atau ekspor kapan pun butuh berkasnya — formatnya sudah mengikuti format resmi.",
  },
  {
    icon: "key",
    judul: "Lengkapi profil dulu",
    isi: "Buka menu Akun dan isi nama pembimbing, jabatan, serta periode magang. Data ini yang tercetak di kop dan blok tanda tangan setiap dokumen.",
    tanya: "Kenapa NIM dan nama kampus tidak bisa diubah?",
    jawab:
      "Keduanya terkunci sejak pendaftaran karena ikut tercetak di dokumen resmi. Kalau ada salah ketik, hubungi admin.",
  },
  {
    icon: "medal",
    judul: `SKM — kejar ${SKM_TARGET_POIN} poin`,
    isi: "Catat prestasi, organisasi, sertifikasi, kepanitiaan, dan seminar; unggah sertifikatnya, poinnya dihitung otomatis sesuai standar kampus yang kamu pilih.",
    tanya: "Kegiatan saya bisa dipakai untuk apa lagi?",
    jawab:
      "LinkedIn Assistant mengubah kegiatan yang sudah tercatat jadi headline, About, dan bullet pengalaman yang siap disalin ke profil LinkedIn.",
  },
  {
    icon: "file-text",
    judul: "Task Report magang",
    isi: `Laporan harian selama magang: kategori kegiatan, uraian, dan foto dokumentasi. Ada feed bersama supaya kamu bisa melihat laporan rekan satu angkatan.`,
    tanya: "Bagaimana kalau pembimbing minta rekapnya?",
    jawab:
      "Menu Ekspor menyusun seluruh laporan jadi satu berkas Excel, dan halaman cetak menyiapkan versi A4 siap tanda tangan.",
  },
  {
    icon: "notebook",
    judul: "Log Book & Formulir 2",
    isi: `Catat tiap konsultasi dengan pembimbing beserta parafnya, lalu cetak Formulir 2 (${ORG.kodeSop}) langsung dari browser — tanpa menyalin ulang ke Word.`,
    tanya: "Pembimbing saya lebih dari satu, bisa?",
    jawab:
      "Bisa. Tambahkan mereka di menu Pembimbing, lalu setiap catatan konsultasi tinggal ditautkan ke pembimbing yang bersangkutan.",
  },
  {
    icon: "mobile",
    judul: "Pertanyaan lain",
    isi: "Aplikasi ini bisa dipasang di layar utama ponsel seperti aplikasi biasa — tawaran pemasangannya muncul sendiri di kunjungan berikutnya.",
    tanya: "Data saya aman?",
    jawab:
      "Catatan SKM, laporan, dan log book hanya bisa dibaca oleh akunmu sendiri. Penjelasan lengkapnya ada di halaman FAQ.",
  },
];

/**
 * Panduan awal yang muncul sekali, pada pembukaan pertama setelah mendaftar.
 *
 * Penandanya kolom `profiles.onboarding_at`, bukan localStorage: alur khas
 * aplikasi ini adalah daftar di laptop lalu dipakai sehari-hari di ponsel, dan
 * penanda per-peramban akan menayangkan ulang seluruh panduan di sana.
 *
 * Dipasang di AppLayout, menggantikan <InstallPrompt /> pada kunjungan pertama
 * — dua dialog bertumpuk pada menit pertama pemakaian adalah persis kesan yang
 * mau dihindari.
 */
export function WelcomeTour() {
  const { user, reloadProfile } = useSession();
  const [i, setI] = React.useState(0);
  const [open, setOpen] = React.useState(true);
  const step = STEPS[i];
  const terakhir = i === STEPS.length - 1;

  async function finish() {
    // Tutup dulu, simpan kemudian: kalau UPDATE-nya gagal (jaringan mati),
    // orangnya tetap keluar dari dialog dan panduan muncul lagi lain kali —
    // jauh lebih ringan daripada terjebak di dalam modal.
    setOpen(false);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarding_at: new Date().toISOString() })
      .eq("id", user.id);
    await reloadProfile();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && void finish()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center gap-2 text-center">
          <Icon3d name={step.icon} size={80} />
          <DialogTitle className="text-lg">{step.judul}</DialogTitle>
          <DialogDescription>{step.isi}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-foreground bg-muted px-3 py-2.5 text-left">
          <p className="flex items-start gap-1.5 text-[13px] font-semibold text-foreground">
            <HelpCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {step.tanya}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{step.jawab}</p>
        </div>

        <div
          className="flex items-center justify-center gap-1.5"
          role="group"
          aria-label={`Langkah ${i + 1} dari ${STEPS.length}`}
        >
          {STEPS.map((s, n) => (
            <span
              key={s.judul}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${
                n === i ? "w-5 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          {terakhir ? (
            <Button variant="ghost" size="sm" asChild onClick={() => void finish()}>
              <Link to="/faq">Buka FAQ lengkap</Link>
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => void finish()}>
              Lewati panduan
            </Button>
          )}

          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="outline" onClick={() => setI((n) => n - 1)}>
                <ArrowLeft aria-hidden />
                Kembali
              </Button>
            )}
            {terakhir ? (
              <Button variant="gradient" onClick={() => void finish()}>
                <Check aria-hidden />
                Mulai pakai
              </Button>
            ) : (
              <Button variant="gradient" onClick={() => setI((n) => n + 1)}>
                Lanjut
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
