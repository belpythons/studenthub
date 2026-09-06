/**
 * Reset + seed data demo aplikasi.
 *
 * Menghapus akun dummy (beserta seluruh barisnya lewat cascade), lalu mengisi
 * ulang 15 kegiatan magang nyata milik akun demo — sumbernya sheet
 * "Detail Kegiatan" pada Laporan-Magang-Belva-Pranama-Sriwibowo-20260831.xlsx.
 * Idempoten: aman dijalankan berulang.
 *
 *   node scripts/seed-demo-data.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const KEEP_EMAIL = "belvapranamasriwibowo@gmail.com";
/** Hanya email yang tercantum di sini yang dihapus — akun lain tak disentuh. */
const DUMMY_EMAILS = ["belva.test@stitek.local"];

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: eList } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (eList) { console.error("listUsers:", eList.message); process.exit(1); }

// --- 1. Buang akun dummy. profiles.id -> auth.users(id) ON DELETE CASCADE
//        ikut menghapus reports, logbook, supervisors, skm, projects, advice.
for (const u of list.users.filter((u) => DUMMY_EMAILS.includes(u.email))) {
  const { error } = await admin.auth.admin.deleteUser(u.id);
  if (error) { console.error(`hapus ${u.email}:`, error.message); process.exit(1); }
  console.log("dihapus:", u.email, u.id);
}

const user = list.users.find((u) => u.email === KEEP_EMAIL);
if (!user) { console.error(`akun demo ${KEEP_EMAIL} tidak ada — daftarkan lewat /register dulu`); process.exit(1); }
const uid = user.id;

// --- 2. Kosongkan data lama akun demo supaya skrip ini idempoten.
for (const t of ["internship_reports", "logbook_entries"]) {
  const { error } = await admin.from(t).delete().eq("user_id", uid);
  if (error) { console.error(`bersihkan ${t}:`, error.message); process.exit(1); }
}

// --- 3. 15 kegiatan nyata, 3-21 Agustus 2026.
//        foto_url sengaja null: 7 tangkapan layar pada PDF asli tersimpan di
//        Storage server lama dan tidak ikut di repo.
const kegiatan = [
  {
    tanggal: "2026-08-03",
    jam_mulai: "07:30",
    jam_selesai: "16:00",
    kategori: "Belajar/Training",
    judul: "briefing kegiatan PKL dan pengenalan lingkungan kerja departemen IT di PT Badak NGL",
    deskripsi: "pembuatan badge, pemberian akses badge, pengenalan tempat dan lingkungan kerja di PT Badak NGL",
    output: "memiliki badge yang dapat mengakses masuk dalam gedung putih dan radio room di PT Badak NGL",
    kendala: null,
  },
  {
    tanggal: "2026-08-04",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Lainnya",
    judul: "mengikuti ajang finalis lomba KIDECO Innovation Challenge (KIC) 2026 yang diselenggarakan oleh Fakultas Sains dan Teknologi Informasi (FSTI) ITK Kategori Hackathon",
    deskripsi: "Registrasi ulang finalis dan pengujian perangkat (system readiness check: sensor IoT, modul telemetri, model AI, dan dashboard).Sesi pitching dan presentasi teknis di hadapan dewan juri (akademisi ITK & tim teknis PT Kideco Jaya Agung).Demonstrasi sistem langsung.Sesi tanya jawab mendalam mengenai arsitektur sistem, latency, keandalan perangkat di area tambang, dan skalabilitas solusi.",
    output: "Slide deck pitching dan demonstrasi fungsional sistem AI-IoT berjalan lancar.Catatan evaluasi & masukan dewan juri terkait akurasi model, efisiensi konsumsi daya sensor, dan cost-efficiency.Dokumentasi pengujian sistem dan lembar penilaian juri.",
    kendala: null,
  },
  {
    tanggal: "2026-08-05",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Lainnya",
    judul: "mengikuti ajang finalis lomba KIDECO Innovation Challenge (KIC) 2026 yang diselenggarakan oleh Fakultas Sains dan Teknologi Informasi (FSTI) ITK Kategori Hackathon",
    deskripsi: "Mengikuti Safety Induction standar K3 pertambangan di site PT Kideco Jaya Agung, Kabupaten Paser.Kunjungan lapangan (field observation) ke area operasional penambangan terbuka (pit area) dan fasilitas pendukung energi.Observasi kondisi riil lingkungan tambang (getaran, debu, kelembapan, dan blank spot jaringan) yang menjadi tantangan penerapan perangkat IoT.",
    output: "Catatan observasi lapangan terkait kondisi lingkungan kerja ekstrem (rugged environment).Identifikasi gap (kesenjangan teknis) antara prototipe lab dan spesifikasi hardware level industri (misal: kebutuhan sertifikasi IP67/IP68).",
    kendala: null,
  },
  {
    tanggal: "2026-08-06",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Lainnya",
    judul: "mengikuti ajang finalis lomba KIDECO Innovation Challenge (KIC) 2026 yang diselenggarakan oleh Fakultas Sains dan Teknologi Informasi (FSTI) ITK Kategori Hackathon",
    deskripsi: "Kunjungan ke area reklamasi lingkungan dan fasilitas pemantauan energi terbarukan PT Kideco.Sesi diskusi teknis dan sharing bersama divisi IT/Engineering Kideco mengenai integrasi API sistem perusahaan, protokol industri (Modbus/MQTT/LoRaWAN), dan keamanan data.Penyusunan penyesuaian rancangan lanjutan (technical roadmap) berdasarkan masukan praktisi industri.",
    output: "Dokumen analisis kelayakan teknis (technical feasibility notes) untuk implementasi skala nyata.Daftar rekomendasi optimasi model AI (misal: kebutuhan komputasi edge vs cloud) dan protokol transmisi data jarak jauh.",
    kendala: null,
  },
  {
    tanggal: "2026-08-07",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Lainnya",
    judul: "mengikuti ajang finalis lomba KIDECO Innovation Challenge (KIC) 2026 yang diselenggarakan oleh Fakultas Sains dan Teknologi Informasi (FSTI) ITK Kategori Hackathon",
    deskripsi: "Partisipasi dalam showcase/mini exhibition untuk memamerkan solusi digital kepada peserta kategori lain, sivitas akademika ITK, dan manajemen Kideco.Sesi networking dengan jajaran manajemen industri untuk peluang program magang atau riset hilirisasi.Menghadiri seremoni penutupan dan pengumuman pemenang (Awarding Night) KIC 2026.",
    output: "Sertifikat finalis/penghargaan juara dan portofolio proyek hackathon resmi.Kontak relasi profesional dengan praktisi industri energi & pertambangan.Dokumen rekapitulasi akhir log kegiatan yang siap digunakan untuk konversi SKS / pelaporan magang/kompetisi.",
    kendala: null,
  },
  {
    tanggal: "2026-08-10",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Belajar/Training",
    judul: "Konfigurasi Perangkat dan Integrasi Akses Jaringan Intranet PT Badak NGL",
    deskripsi: "Melakukan penyiapan dan konfigurasi koneksi jaringan pada perangkat laptop kerja untuk kebutuhan operasional di lingkungan IT PT Badak NGL. Kegiatan ini diawali dengan mengidentifikasi dan mendaftarkan MAC Address laptop kepada pihak administrator jaringan guna memperoleh perizinan hak akses resmi. Setelah proses pendaftaran selesai, laptop disambungkan ke jaringan hotspot Intranet PTB dan dihubungkan secara langsung dengan sistem WM Badak untuk memastikan integrasi autentikasi berjalan lancar serta seluruh portal internal perusahaan dapat diakses dengan baik.",
    output: "MAC Address perangkat berhasil terdaftar pada sistem perizinan jaringan, dan laptop telah terhubung secara penuh ke jaringan Intranet PTB serta sistem WM Badak dengan koneksi yang stabil dan siap digunakan.",
    kendala: null,
  },
  {
    tanggal: "2026-08-11",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Belajar/Training",
    judul: "Setup Environment Development Full Stack Java Spring Boot dan Oracle Developer Sesuai Standarisasi Perusahaan",
    deskripsi: "Melakukan instalasi dan konfigurasi lingkungan pengembangan (development environment) pada laptop kerja dengan menerapkan best practice web development sesuai standarisasi IT PT Badak NGL. Proses penyiapan ini mencakup instalasi Java Development Kit (JDK), penyiapan IDE, inisialisasi framework Spring Boot beserta dependensi proyek yang dibutuhkan, serta instalasi dan konfigurasi Oracle Developer untuk pengelolaan basis data. Pengaturan variabel lingkungan (environment variables) dan pengujian integrasi awal antara backend Spring Boot dengan database Oracle juga dilakukan guna memastikan ekosistem pengembangan siap digunakan untuk pengerjaan proyek.",
    output: "Lingkungan pengembangan Full Stack Java Spring Boot dan Oracle Developer berhasil terpasang dan terkonfigurasi secara penuh, dengan proyek lokal yang dapat dijalankan serta terkoneksi ke basis data Oracle secara stabil.",
    kendala: null,
  },
  {
    tanggal: "2026-08-12",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Dokumentasi",
    judul: "Penyusunan Draf Inisial Functional Design Document (FDD) Proyek CAR-IS",
    deskripsi: "Melakukan penyusunan draf awal dokumen Functional Design Document (FDD) untuk proyek Compliance Assurance for Regulation & Standard (CAR-IS). Kegiatan ini difokuskan pada pendefinisian ruang lingkup awal sistem, pemetaan kebutuhan fungsional dasar, serta perumusan alur proses bisnis terkait kepatuhan regulasi dan standar yang akan diterapkan di lingkungan perusahaan. Penyusunan dokumen inisial ini bertujuan untuk menetapkan acuan perancangan sistem dan keselarasan fungsi aplikasi sebelum masuk ke tahap spesifikasi teknis dan pengembangan lebih lanjut.",
    output: "Tersusunnya draf inisial dokumen FDD proyek CAR-IS yang memuat gambaran umum sistem, cakupan kebutuhan fungsional, dan dasar alur proses kepatuhan regulasi.",
    kendala: null,
  },
  {
    tanggal: "2026-08-13",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Belajar/Training",
    judul: "Eksplorasi Template Standarisasi Proyek dan Integrasi Database Oracle badak_util",
    deskripsi: "Mempelajari dan mengonfigurasi starter project template resmi berbasis best practice dari PT Badak NGL hingga berhasil dijalankan secara lokal (running local) pada lingkungan pengembangan. Selain mengeksplorasi struktur dan alur kode standar yang digunakan perusahaan, kegiatan ini juga mencakup penyiapan konfigurasi koneksi ke basis data Oracle badak_util, yaitu basis data terpusat yang memuat seluruh referensi dan integrasi data aplikasi dari portal utama PT Badak NGL, serta melakukan verifikasi keberhasilan pengambilan data dari basis data tersebut ke dalam proyek lokal.",
    output: "Template proyek standar perusahaan berhasil dipahami dan dijalankan secara lokal tanpa error, serta koneksi basis data Oracle badak_util telah terhubung secara penuh dan siap dimanfaatkan untuk kebutuhan pengembangan sistem.",
    kendala: null,
  },
  {
    tanggal: "2026-08-14",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Pekerjaan Utama",
    judul: "Inisiasi Pemisahan Service Function KPI dan Re-engineering ke Java Spring Boot sebagai Aplikasi Mandiri",
    deskripsi: "Melakukan analisis dan inisiasi pemisahan modul Function KPI dari ketergantungannya terhadap portal utama PT Badak NGL agar dapat berjalan secara mandiri (independent application). Kegiatan ini mencakup pemetaan alur proses dan logika bisnis dari codebase legacy yang semula menggunakan PHP Native, perancangan arsitektur ulang (re-engineering) menggunakan standarisasi perusahaan berbasis Java Spring Boot, serta penyiapan alur konfigurasi untuk pengoperasian service pada port server 187 di dalam Virtual Machine (VM) lingkungan IT internal.",
    output: "Terpetakannya dependensi dan logika bisnis Function KPI dari portal utama, tersusunnya rencana re-engineering dari PHP Native ke Java Spring Boot, serta terinisialisasinya struktur awal aplikasi mandiri yang siap dideploy pada port server 187 dalam VM.",
    kendala: "Diperlukan penelusuran menyeluruh terhadap baris kode legacy PHP Native yang minim dokumentasi guna memastikan seluruh formula dan logika perhitungan KPI dapat diadaptasi secara presisi ke dalam framework Java Spring Boot.",
  },
  {
    tanggal: "2026-08-17",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Pekerjaan Utama",
    judul: "Integrasi Autentikasi LDAP dan Implementasi Fitur Hapus Dokumen pada Aplikasi Function KPI",
    deskripsi: "Melakukan integrasi sistem autentikasi direktori LDAP internal PT Badak NGL ke dalam aplikasi mandiri Function KPI yang beroperasi pada alamat 10.10.1.187:8117/kpi. Konfigurasi LDAP diimplementasikan pada framework Spring Boot dengan mengarahkan koneksi ke URL ldap://rldapbtg.badaklng.com:389 serta menggunakan pola user DN cn={0},o=users untuk memvalidasi hak akses dan identitas pengguna pada modul unggah dokumen KPI. Selain itu, pengerjaan dilanjutkan dengan membangun fitur penghapusan (delete) berkas dokumen KPI baik dari sisi antarmuka pengguna maupun logika backend guna mengantisipasi kesalahan pengunggahan (human error) dan mempermudah pengelolaan arsip dokumen.",
    output: "Sistem autentikasi LDAP berhasil terintegrasi secara penuh pada alur unggah dokumen KPI, serta fitur penghapusan dokumen telah aktif dan teruji berjalan dengan baik pada server 10.10.1.187:8117/kpi untuk mencegah kesalahan input data.",
    kendala: null,
  },
  {
    tanggal: "2026-08-18",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Pekerjaan Utama",
    judul: "Pengembangan Fitur Pengaturan PIC Terintegrasi LDAP Berdasarkan Departemen dan Seksi pada Aplikasi Function KPI",
    deskripsi: "Mengembangkan fitur pengaturan Person in Charge (PIC) pada aplikasi Function KPI guna menetapkan hak akses spesifik bagi pengguna yang diizinkan untuk mengirimkan dokumen KPI. Fitur ini dirancang untuk memetakan otoritas pengiriman dokumen secara presisi berdasarkan posisi atau jabatan pengguna di masing-masing departemen dan seksi. Pengerjaan kegiatan ini juga mencakup integrasi modul pengaturan PIC tersebut dengan sistem autentikasi LDAP internal perusahaan, guna memastikan bahwa validasi identitas, pencarian struktur jabatan, dan pembatasan otorisasi akses berjalan secara dinamis serta sinkron dengan hierarki organisasi yang berlaku di PT Badak NGL.",
    output: "Modul pengaturan PIC telah berhasil dibangun dan terintegrasi secara penuh dengan sistem LDAP perusahaan, sehingga aplikasi mampu melakukan validasi dan pembatasan hak akses pengiriman dokumen KPI secara presisi berdasarkan posisi spesifik pengguna pada struktur departemen dan seksinya.",
    kendala: null,
  },
  {
    tanggal: "2026-08-19",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Pekerjaan Utama",
    judul: "Implementasi Fitur Switch Account dan Proteksi Autentikasi Login LDAP pada Modul Pengaturan PIC Function KPI",
    deskripsi: "Melakukan pengembangan fungsionalitas lanjutan pada modul pengaturan PIC aplikasi Function KPI dengan menambahkan fitur switch account berbasis direktori LDAP guna mempermudah proses delegasi peran dan pengujian sistem. Selain itu, diterapkan pula mekanisme gerbang autentikasi login berbasis LDAP pada akses menu pengaturan PIC untuk memperketat keamanan, memastikan modul konfigurasi tidak terbuka untuk umum, serta mencatat rekam jejak aktivitas pengguna (audit log) yang memiliki wewenang dalam mengubah konfigurasi PIC.",
    output: "Fitur switch account berbasis LDAP berhasil diimplementasikan pada modul pengaturan PIC, serta halaman konfigurasi PIC kini telah terproteksi secara penuh oleh mekanisme autentikasi login LDAP yang aman dan mampu membatasi akses dari pengguna yang tidak berwenang.",
    kendala: null,
  },
  {
    tanggal: "2026-08-20",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Pekerjaan Utama",
    judul: "Pengujian Fungsionalitas, Sinkronisasi LDAP, Standardisasi UI, dan Otomasi Penjadwalan Template Tahunan dengan Quartz Scheduler pada Function KPI",
    deskripsi: "Melakukan pengujian fungsionalitas secara menyeluruh pada aplikasi Function KPI yang telah dikembangkan, melaksanakan proses debugging, serta menuntaskan perbaikan kendala teknis atau bug yang teridentifikasi selama tahap pengujian. Kegiatan dilanjutkan dengan melakukan validasi untuk memastikan data pengguna pada aplikasi telah terisi secara akurat dan up-to-date dari sistem direktori LDAP perusahaan. Selain itu, dilakukan penyeragaman dan penerapan konsistensi design system pada antarmuka pengguna (UI) untuk tampilan data antartahun, serta membangun mekanisme otomatisasi penjadwalan (automated task scheduling) menggunakan pustaka Quartz Scheduler pada framework Spring Boot agar sistem dapat melakukan pembuatan template KPI tahun baru secara otomatis begitu terjadi pergantian periode tahun.",
    output: "Seluruh fungsionalitas utama aplikasi Function KPI berhasil teruji dengan baik dan berjalan stabil tanpa kendala teknis, data pengguna telah tersinkronisasi penuh dengan LDAP terkini, konsistensi desain UI antartahun telah terstandarisasi, dan mekanisme penjadwalan otomatis menggunakan Quartz Scheduler berhasil diaktifkan serta siap mengeksekusi pembuatan template tahunan baru secara otomatis.",
    kendala: null,
  },
  {
    tanggal: "2026-08-21",
    jam_mulai: "07:00",
    jam_selesai: "16:00",
    kategori: "Dokumentasi",
    judul: "Analisis dan Perbaikan Diagram Alur IT Service Request pada Siklus IT General Controls (ITGC)",
    deskripsi: "Mempelajari repositori diagram alur proses (flowchart) PT Badak NGL setelah diberikan hak akses, kemudian melakukan analisis dan peninjauan mendalam terhadap alur kerja layanan teknologi informasi yang ada. Kegiatan dilanjutkan dengan melakukan perbaikan dan pembaruan pada diagram alur IT Service Request dalam kerangka siklus IT General Controls (ITGC). Proses revisi ini difokuskan pada penyesuaian tahapan pengajuan, standardisasi alur persetujuan (approval), pemetaan batasan wewenang antarperan, serta penjaminan keselarasan alur diagram dengan prinsip tata kelola dan kepatuhan kontrol internal IT yang berlaku di perusahaan.",
    output: "Terselesaikannya pembaruan diagram alur IT Service Request pada siklus ITGC yang telah disempurnakan, lebih terstruktur, serta selaras dengan standar kepatuhan kontrol dan prosedur operasional internal IT PT Badak NGL.",
    kendala: null,
  },];

const { error: e1 } = await admin.from("internship_reports")
  .insert(kegiatan.map((k) => ({ user_id: uid, ...k })));
if (e1) { console.error("reports:", e1.message); process.exit(1); }

// --- 4. Log book Formulir 2. Nama pembimbing sengaja dikosongkan ("-") dan
//        paraf_status false supaya kolom paraf tercetak "( ......... )".
//        Isi nama sungguhan lewat /logbook; update_supervisor_sync akan
//        menyinkronkan kolom denormalisasi di sini.
const { error: e2 } = await admin.from("logbook_entries").insert(
  kegiatan.map((k, i) => ({
    user_id: uid,
    nomor_urut: i + 1,
    tanggal: k.tanggal,
    aktivitas_pekerjaan: k.judul,
    supervisor_id: null,
    pembimbing_nama: "-",
    paraf_status: false,
  })),
);
if (e2) { console.error("logbook:", e2.message); process.exit(1); }

const { error: e3 } = await admin.from("profiles").update({
  periode_mulai: kegiatan[0].tanggal,
  periode_selesai: kegiatan[kegiatan.length - 1].tanggal,
  lokasi_ttd: "Bontang",
}).eq("id", uid);
if (e3) { console.error("profile:", e3.message); process.exit(1); }

console.log(`seeded ${kegiatan.length} reports, ${kegiatan.length} logbook entries untuk ${KEEP_EMAIL}`);
