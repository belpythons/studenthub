import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icon3d, type Icon3dName } from "@/components/shared/icon-3d";
import {
  MAIL_SENDER,
  MAIL_SUBJECT_CONFIRM,
  ORG,
  REPORT_KATEGORI,
  SKM_KATEGORI,
  SKM_TARGET_POIN,
} from "@/lib/constants";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";

interface Entry {
  icon: Icon3dName;
  q: string;
  a: React.ReactNode;
}

/*
  Isi FAQ disusun dari README.md dan docs/FITUR-MODUL-*.md. Angka dan nama
  kategori dibaca dari lib/constants.ts, bukan diketik ulang — kalau syarat
  kelulusan atau daftar kategori berubah, halaman ini ikut tanpa disunting.
*/
const ENTRIES: Entry[] = [
  {
    icon: "bulb",
    q: "Aplikasi ini sebetulnya untuk apa?",
    a: (
      <>
        <p>
          Satu tempat untuk tiga tumpukan administrasi yang harus diurus mahasiswa
          selama Kerja Praktek / Magang: <strong>SKM</strong>, <strong>Task Report
          harian</strong>, dan <strong>Log Book konsultasi</strong>. Semuanya dicatat
          sekali, lalu bisa dicetak sebagai dokumen resmi atau diekspor ke Excel.
        </p>
        <p>
          Bawaannya disetel untuk peserta magang {ORG.perusahaanMixed} dari{" "}
          {ORG.kampus}, tetapi kop surat, logo, dan warnanya bisa diganti untuk
          kampus lain.
        </p>
      </>
    ),
  },
  {
    icon: "notebook",
    q: "Kenapa aplikasi ini dibuat?",
    a: (
      <>
        <p>
          Ketiga catatan itu biasanya dikerjakan manual di Word dan Excel, terpisah
          satu sama lain. Masalahnya bukan cuma repot:
        </p>
        <ul>
          <li>
            Dokumen resminya punya tata letak baku yang harus direproduksi persis —{" "}
            <strong>Formulir {ORG.kodeSop}</strong> misalnya sudah ditentukan margin,
            font, dan susunan kolomnya. Satu berkas Word yang diedit turun-temurun
            pasti melenceng.
          </li>
          <li>
            Data yang sama diketik berulang di beberapa berkas, jadi rekap akhir
            semester nyaris selalu tidak cocok dengan catatan hariannya.
          </li>
          <li>
            Poin SKM dihitung tangan dari tabel aturan kampus, dan salah hitung baru
            ketahuan saat pengajuan kelulusan.
          </li>
        </ul>
        <p>
          Di sini pencatatan dan pencetakan jadi satu alur: yang Anda isi tiap hari
          adalah yang keluar di dokumen, tanpa disalin ulang.
        </p>
      </>
    ),
  },
  {
    icon: "medal",
    q: "SKM itu apa, dan bagaimana poinnya dihitung?",
    a: (
      <>
        <p>
          <strong>Satuan Kegiatan Mahasiswa</strong> — portofolio kegiatan
          non-akademik yang jadi syarat kelulusan. Targetnya {SKM_TARGET_POIN} poin,
          terbagi ke {SKM_KATEGORI.length} kategori:
        </p>
        <ul>
          {SKM_KATEGORI.map((k) => (
            <li key={k.value}>{k.value}</li>
          ))}
        </ul>
        <p>
          Poin terisi otomatis begitu Anda memilih <em>tingkat</em> dan{" "}
          <em>peran</em> (mis. juara tingkat nasional vs peserta tingkat kampus),
          mengikuti aturan kampus yang aktif. Nilainya{" "}
          <strong>selalu bisa Anda timpa manual</strong> kalau pembimbing memutuskan
          lain — otomatisasi di sini membantu, bukan mengunci.
        </p>
        <p>
          Sertifikat atau SK diunggah sebagai bukti, dan asisten LinkedIn bisa
          mengubah entri SKM jadi teks siap tempel untuk profil atau CV.
        </p>
      </>
    ),
  },
  {
    icon: "calender",
    q: "Task Report dan Log Book — apa bedanya?",
    a: (
      <>
        <p>
          Keduanya sering tertukar karena sama-sama “catatan magang”, padahal isinya
          menjawab pertanyaan yang berbeda.
        </p>
        <p>
          <strong>Task Report</strong> menjawab <em>“hari ini saya mengerjakan
          apa”</em>. Satu entri per hari: jam mulai–selesai, kategori, judul,
          deskripsi, hasil, kendala, dan foto bila ada. Kategorinya{" "}
          {REPORT_KATEGORI.length} dan sudah ditetapkan: {REPORT_KATEGORI.join(", ")}.
        </p>
        <p>
          <strong>Log Book</strong> menjawab <em>“saya berkonsultasi dengan siapa dan
          hasilnya apa”</em>. Entrinya bernomor urut, terikat ke seorang pembimbing
          lapangan, mencatat topik, hasil, tindak lanjut, dan status paraf — lalu
          dicetak sebagai Formulir 2.
        </p>
        <p>
          Ringkasnya: Task Report adalah buku harian pekerjaan, Log Book adalah
          riwayat bimbingan.
        </p>
      </>
    ),
  },
  {
    icon: "chat-bubble",
    q: "Apakah pembimbing punya akun sendiri?",
    a: (
      <>
        <p>
          Tidak. Yang punya akun hanya mahasiswa. Pembimbing lapangan dicatat sebagai
          data (nama, jabatan, departemen) supaya bisa dirujuk entri log book dan
          muncul di dokumen cetak — bukan sebagai pengguna yang bisa masuk.
        </p>
        <p>
          Jalur umpan balik yang tersedia adalah kolom{" "}
          <strong>Komentar &amp; Feedback</strong> di halaman Daftar Kegiatan, yang
          bisa dilihat dan diisi semua peserta magang.
        </p>
      </>
    ),
  },
  {
    icon: "shield",
    q: "Centang paraf di aplikasi sama dengan tanda tangan resmi?",
    a: (
      <>
        <p>
          <strong>Bukan.</strong> Paraf di sini adalah penanda mandiri yang Anda
          centang sendiri untuk melacak entri mana yang sudah disetujui. Ia tidak
          punya kekuatan tanda tangan digital dan tidak diverifikasi siapa pun.
        </p>
        <p>
          Karena itu dokumen cetaknya tetap menyediakan kolom tanda tangan basah dan
          ruang untuk cap — pengesahan resmi tetap terjadi di atas kertas.
        </p>
      </>
    ),
  },
  {
    icon: "target",
    q: "Proyek Konsultasi dan Briefing Pack itu untuk apa?",
    a: (
      <>
        <p>
          Untuk kasus yang sering terjadi di lapangan: satu topik dikonsultasikan ke
          beberapa orang, dan saran mereka bertentangan.
        </p>
        <p>
          Sebuah <strong>Proyek Konsultasi</strong> mengelompokkan sesi-sesi log book
          di bawah satu topik, mencatat siapa saja konsultannya beserta bidang
          keahlian dan prioritas otoritasnya, lalu menyimpan setiap saran dengan
          status ala catatan keputusan: <em>diusulkan</em>, <em>diadopsi</em>,{" "}
          <em>ditolak</em>, atau <em>digantikan</em>. Riwayatnya tidak bisa diubah
          diam-diam.
        </p>
        <p>
          <strong>Briefing Pack</strong> merangkumnya jadi satu halaman untuk
          konsultan baru: situasi, kronologi keputusan yang sudah diambil, konflik
          yang masih terbuka, dan pertanyaan yang ingin Anda ajukan — bisa dibaca di
          layar atau dicetak A4.
        </p>
      </>
    ),
  },
  {
    icon: "folder",
    q: "Bisa dipakai kampus atau perusahaan lain?",
    a: (
      <>
        <p>
          Bisa. Di halaman <strong>Profil &amp; Pengesahan</strong> Anda dapat
          mengganti baris kop, judul dokumen, program studi, kode formulir, dan logo
          organisasi. Perubahannya langsung ikut ke kedua dokumen cetak dan ke berkas
          ekspor Excel.
        </p>
        <p>
          Saat Anda mengunggah logo baru,{" "}
          <strong>
            warna primer dan sekunder antarmuka ikut diturunkan otomatis dari logo
            itu
          </strong>
          , lalu dijepit supaya kontrasnya tetap memenuhi ambang keterbacaan.
          Hasilnya bisa Anda geser manual sebelum disimpan.
        </p>
      </>
    ),
  },
  {
    icon: "mobile",
    q: "Bisa dipasang seperti aplikasi biasa?",
    a: (
      <>
        <p>
          Bisa — ini sebuah PWA. Di Chrome atau Edge akan muncul tawaran{" "}
          <strong>Pasang Aplikasi</strong>; di Safari iOS lewat ikon Bagikan →
          “Tambahkan ke Layar Utama”. Setelah terpasang ia terbuka dari layar utama
          tanpa bilah browser.
        </p>
        <p>
          Tampilannya tetap bisa dibuka tanpa koneksi, tetapi isi laporan dan log
          book selalu diambil langsung dari server — jadi mencatat entri baru tetap
          butuh internet.
        </p>
      </>
    ),
  },
  {
    icon: "key",
    q: "Data saya disimpan di mana, dan siapa yang bisa melihatnya?",
    a: (
      <>
        <p>
          Di Supabase, dengan aturan akses per-baris: entri SKM, log book, pembimbing,
          proyek, dan berkas unggahan Anda hanya bisa dibaca oleh akun Anda sendiri.
        </p>
        <p>
          Satu-satunya yang terbuka adalah <strong>Daftar Kegiatan</strong> — laporan
          harian di sana memang dirancang untuk dilihat sesama peserta magang beserta
          komentarnya. Kalau sebuah catatan tidak ingin dibaca orang lain, jangan
          menaruhnya di laporan harian.
        </p>
      </>
    ),
  },
  {
    icon: "chat-bubble",
    q: "Email verifikasi tidak masuk, harus bagaimana?",
    a: (
      <>
        <p>
          Cari di kotak masuk pakai kata kunci ini, bukan kata "Student Hub" —
          pengirimnya bukan alamat kampus:
        </p>
        <ul>
          <li>
            Dari: <code>{MAIL_SENDER}</code>
          </li>
          <li>
            Subjek: <code>{MAIL_SUBJECT_CONFIRM}</code>
          </li>
        </ul>
        <p>
          Kalau tetap tidak ada, periksa folder <strong>Spam</strong>,{" "}
          <strong>Promosi</strong>, dan <strong>Semua Email</strong>. Layar setelah
          pendaftaran punya tombol <strong>Kirim ulang email</strong> yang bisa dipakai
          tiap 60 detik; mendaftar ulang dengan alamat yang sama juga akan membawa Anda
          ke layar itu, bukan membuat akun kedua.
        </p>
        <p>
          Tautannya berlaku 24 jam dan bisa dibuka di perangkat mana pun — mendaftar di
          laptop lalu mengklik dari ponsel tetap berhasil.
        </p>
      </>
    ),
  },
];

/*
  <details>/<summary> native, bukan akordion buatan sendiri: ia sudah membawa
  keyboard dan semantik ARIA, dan yang paling penting Ctrl+F peramban tetap
  menemukan jawaban yang sedang tertutup. Komponen buatan sendiri kehilangan
  ketiganya sekaligus menambah dependensi.
*/
function FaqItem({ entry, defaultOpen }: { entry: Entry; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-lg border border-foreground bg-card text-card-foreground shadow-card"
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <Icon3d name={entry.icon} size={40} className="shrink-0" />
        <h2 className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{entry.q}</h2>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>

      <div className="space-y-2.5 px-4 pb-4 pl-[4.25rem] text-[13px] leading-relaxed text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground [&_ul]:space-y-1.5">
        {entry.a}
      </div>
    </details>
  );
}

export default function FaqPage() {
  useTitle("FAQ & Tentang");
  const { user } = useSession();

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/icon.png"
            alt=""
            width={44}
            height={30}
            aria-hidden
            className="h-auto w-11 rounded-lg border border-foreground bg-white p-1"
          />
          <div>
            <h1 className="text-lg font-bold leading-tight">FAQ &amp; Tentang</h1>
            <p className="text-[12.5px] text-muted-foreground">
              Student Hub &amp; Internship Logbook
            </p>
          </div>
        </div>

        {/*
          Rutenya publik: calon pengguna yang belum punya akun justru yang paling
          butuh tahu aplikasi ini untuk apa. Tautannya menyesuaikan status sesi.
        */}
        <Button asChild variant="outline" size="sm">
          {user ? (
            <Link to="/dashboard">
              <ArrowLeft aria-hidden />
              Kembali ke Dashboard
            </Link>
          ) : (
            <Link to="/login">
              <LogIn aria-hidden />
              Masuk
            </Link>
          )}
        </Button>
      </header>

      <div className="space-y-3">
        {ENTRIES.map((entry, i) => (
          <FaqItem key={entry.q} entry={entry} defaultOpen={i < 2} />
        ))}
      </div>

      <p className="mt-8 text-center text-[11.5px] leading-relaxed text-muted-foreground">
        {ORG.kampus} · Program Studi Teknik Informatika
        <br />
        Program magang di {ORG.perusahaanMixed}, {ORG.lokasi}.
      </p>
    </main>
  );
}
