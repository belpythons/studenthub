# Modul 2 — Tracking Task Report Magang / PKL

Implementasi dari `QOL/modul-task-report/`. Modul ini mereplikasi sistem laporan harian yang aktif di `http://10.10.1.187:8097/` dan menghasilkan dokumen cetak sesuai `QOL/template kop.pdf`.

---

## Peta Rute

| Rute | Berkas | Fungsi |
|---|---|---|
| `/reports/feed` | `src/pages/reports/FeedPage.tsx` | Daftar kegiatan seluruh peserta (view-only untuk milik orang lain) |
| `/reports` | `src/pages/reports/MyReportsPage.tsx` | Laporan Saya + 4 KPI card |
| `/reports/new` | `src/pages/reports/ReportFormPage.tsx` | Form input laporan harian |
| `/reports/[id]` | `src/pages/reports/ReportDetailPage.tsx` | Detail + komentar & feedback |
| `/reports/[id]/edit` | `src/pages/reports/ReportFormPage.tsx` | Ubah + hapus |
| `/reports/export` | `src/pages/reports/ExportPage.tsx` | Panel filter & pilihan ekspor |
| `/print/rekap-magang` | `src/pages/print/RekapMagangPage.tsx` | Dokumen cetak A4 PT Badak NGL |
| _(tanpa rute)_ | `src/lib/export-client.ts` | Unduhan CSV / XLSX dibangun di peramban |

Logika: `src/lib/report-stats.ts` (agregasi), `src/lib/report-query.ts` (filter + query bersama), `src/lib/export.ts` (baris ekspor), `src/pages/print/print.css` (stylesheet A4).

---

## 1. Form Input — presisi terhadap `form.png`

Urutan, label, tanda wajib, dan placeholder mengikuti tangkapan layar asli:

| Field | Kontrol | Status | Validasi | Placeholder |
|---|---|---|---|---|
| Tanggal | `date` | **Wajib** | Default hari ini | — |
| Jam Mulai | `time` | Opsional | Format 24 jam | — |
| Jam Selesai | `time` | Opsional | Lebih awal dari Jam Mulai dibaca sebagai shift lintas hari | — |
| Kategori | `select` | Opsional | 6 opsi resmi, default `— Pilih kategori —` | — |
| Judul / Nama Kegiatan | `text` | **Wajib** | Maks 255 karakter | `mis. Membuat modul input data inventaris` |
| Deskripsi Kegiatan | `textarea` rows=3 | Opsional | — | `Jelaskan apa yang dikerjakan...` |
| Output / Hasil | `textarea` rows=2 | Opsional | — | `Hasil yang dicapai / dokumen / progres...` |
| Kendala (jika ada) | `textarea` rows=2 | Opsional | — | `Kendala yang dihadapi...` |
| Foto (opsional, maks 20MB) | `file` | Opsional | `image/*`, cek ukuran di sisi klien | — |

Tombol: `Simpan Laporan` (primary) dan `Batal` (outline), persis seperti `form.png`. Pada mode ubah, tombol `Hapus` muncul di sisi kanan.

Kategori kosong disimpan sebagai `Lainnya` — kolom `kategori` bertipe `NOT NULL` pada skema README sementara form menandainya opsional.

### Validasi Ukuran Foto

`FilePicker` di `src/components/shared/file-picker.tsx` mengangkat logika dari `02-FITUR-FORM-INPUT.md` apa adanya — batas 20 MB, pesan menyebutkan ukuran aktual dalam MB, input di-reset saat ditolak. Bedanya, pesan tampil sebagai alert di dalam form, bukan `window.alert()`.

Mengganti foto pada mode ubah menghapus foto lama dari bucket `report-photos`; menghapus laporan juga menghapus fotonya.

---

## 2. Daftar & Feed

**`/reports/feed`** — meniru halaman Daftar Kegiatan sistem referensi: KPI Total Laporan / Peserta Magang / Laporan Hari Ini / Sedang Ditampilkan, filter peserta + kategori + pencarian, tabel dengan kolom Peserta (nama + instansi). Tombol `Ubah` hanya muncul pada baris milik sendiri.

**`/reports`** — hanya laporan milik sendiri, dengan 4 KPI yang sama seperti Section II dokumen cetak.

Baris tabel menampilkan pill `Foto` dan `Kendala` sebagai penanda cepat. Deskripsi dipotong pada 180 karakter.

---

## 3. Detail & Komentar

Halaman detail menampilkan seluruh field, foto ukuran penuh, dan **thread Komentar & Feedback**. Setiap pengguna terautentikasi dapat berkomentar pada laporan siapa pun (jalur feedback pembimbing); menghapus komentar hanya bisa dilakukan penulisnya. Laporan milik orang lain memunculkan banner *"Ini laporan milik peserta lain — hanya bisa dilihat, tidak bisa diubah."*

---

## 4. Ekspor & Rekap

Panel `/reports/export` menyediakan:

- **Rentang tanggal** opsional dengan pintasan `Bulan ini` · `3 bulan terakhir` · `Reset`.
- **Filter kategori**.
- **Toggle isi dokumen** — sertakan foto (hanya versi cetak) dan sertakan komentar & feedback.
- Tiga aksi: **Buka Rekap** (cetak/PDF), **Unduh Excel (.xlsx)**, **Unduh CSV**.

Seluruh filter diteruskan sebagai query string yang sama ke ketiga target, sehingga isi PDF dan isi Excel selalu identik.

### Dokumen Cetak — `/print/rekap-magang`

Tata letak A4 mengikuti `template kop.pdf`:

```
[LOGO]  PT BADAK NGL
        Program Magang / Praktik Kerja Lapangan · Bontang, Kalimantan Timur
        ──────────────────────────────────────────────────────────────────
                       LAPORAN KEGIATAN MAGANG
                 <Nama> · Periode <awal> - s/d <akhir>

  I. IDENTITAS & PERIODE      (bar navy)
 II. RINGKASAN KEGIATAN       4 KPI box + 5 baris metrik
III. REKAP PER KATEGORI       jumlah · durasi · porsi
 IV. REKAP PER BULAN          sebaran sepanjang periode
  V. DAFTAR KEGIATAN          dikelompokkan per bulan
 VI. CATATAN KENDALA          hanya bila ada kendala
VII. PENGESAHAN               dua kolom tanda tangan
────────────────────────────────────────────────────────────────────────
Dicetak dari aplikasi Task Report Magang · PT Badak NGL | <timestamp> · oleh <nama>
```

Section **III**, **IV**, dan **VI** disembunyikan bila kosong — perilaku yang sama dengan sistem referensi, dan itulah sebabnya `template kop.pdf` (data kosong) melompat dari II langsung ke V. Nomor section Pengesahan menyesuaikan: `VI` bila tidak ada kendala, `VII` bila ada.

Blok pengesahan mengambil `pembimbing_nama` dan `pembimbing_jabatan` dari profil (`/account`). Bila belum diisi, kolom kanan hanya menampilkan nama perusahaan — sesuai `template kop.pdf`.

`@page { size: A4 portrait; margin: 10mm }`, `page-break-inside: avoid` pada setiap kartu kegiatan dan blok tanda tangan, `display: table-header-group` pada `thead` agar header tabel berulang di setiap halaman.

### Perhitungan Statistik

`src/lib/report-stats.ts`:

| Metrik | Rumus |
|---|---|
| Laporan Kegiatan | jumlah entri lolos filter |
| Hari Aktif | jumlah tanggal unik |
| Total Jam Kegiatan | Σ (`jam_selesai` − `jam_mulai`); entri tanpa jam dihitung 0 |
| Jenis Kategori | jumlah kategori berbeda |
| Rata-rata per hari aktif | Total Jam ÷ Hari Aktif |
| Kategori terbanyak | kategori dengan entri terbanyak |
| Kegiatan berkendala | entri dengan `kendala` tidak kosong |
| Kegiatan berfoto | entri dengan `foto_url` terisi |

Selisih negatif dibaca sebagai kegiatan yang melewati tengah malam (`+24 jam`), bukan 0 — lihat Putaran 2.

### Excel & CSV

- **`.xlsx`** — dua sheet. *Laporan Kegiatan*: 10 kolom, header navy, baris beku, autofilter, kolom durasi bernomor `0.00`. *Ringkasan*: identitas, periode, seluruh metrik, dan rekap per kategori.
- **`.csv`** — 10 kolom yang sama, escaping RFC 4180, diawali BOM UTF-8 agar Excel di Windows membaca karakter beraksen dengan benar.

---

## Skema & Keamanan

Tabel `internship_reports` mengikuti `README.md` apa adanya. Satu tabel tambahan:

```sql
CREATE TABLE report_comments (   -- EXTENSION
    id UUID PRIMARY KEY,
    report_id UUID REFERENCES internship_reports(id) ON DELETE CASCADE,
    user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
    isi TEXT NOT NULL,
    created_at TIMESTAMPTZ
);
```

RLS `internship_reports`: **SELECT terbuka** untuk seluruh pengguna terautentikasi (feed bersama, seperti sistem referensi), sedangkan INSERT / UPDATE / DELETE dibatasi `auth.uid() = user_id`. Query ekspor dan halaman cetak selalu memfilter `user_id` secara eksplisit — satu peserta tidak dapat mencetak rekap peserta lain.

---

## Yang Berbeda dari Sistem Referensi

- **Modul Tugas (`/tasks`)** tidak dibangun. Sistem referensi memilikinya, namun `QOL/modul-task-report/` tidak menyebutkannya sama sekali, dan tidak ada tabel untuk itu pada skema `README.md`.
- **Halaman publik `/performance`** juga tidak dibangun — di sini seluruh halaman memerlukan login.
- Sistem referensi memakai username; di sini autentikasi memakai **email + password** sesuai Supabase Auth pada `README.md`. Baris "Username Aplikasi" pada dokumen cetak diganti menjadi "Tempat Kerja Praktek".


---

## Putaran 2 — Peningkatan UX/UI

Rincian lengkap: [UX-QA-AUDIT.md](UX-QA-AUDIT.md)

**Berkas berganti nama** dan dibangun ulang di atas shadcn/ui:
`report-table.tsx`, `report-form.tsx`, `comment-thread.tsx`,
`reports/export/export-panel.tsx`, `print/print-toolbar.tsx`.

### Bug yang diperbaiki

- **Shift lintas hari kini bisa dicatat.** `22:00` → `06:00` dulu ditolak
  validasi dan dihitung 0 jam; sekarang dibaca sebagai 8 jam. Form menampilkan
  durasi hasil hitungan secara langsung plus badge **"Lintas hari"**, dan
  seluruh tampilan menandainya `22:00–06:00 (+1 hari)`.
- **Foto tidak lagi dihapus sebelum baris database.** Urutan lama membuat foto
  hilang permanen bila penghapusan baris gagal.
- **Rentang ekspor `dari > sampai`** dulu menghasilkan PDF kosong tanpa
  penjelasan. Sekarang diblokir dengan pesan, dan rentang yang berada di luar
  data memunculkan peringatan **sebelum** dokumen dibuat. Panel juga menampilkan
  tanggal kegiatan pertama dan terakhir milik pengguna.
- **Halaman cetak ikut gelap** saat tema gelap aktif, membuat area margin A4
  tercetak gelap dan isi terpotong di kanan. Seluruh override `@media print`
  kini `!important`; **diverifikasi** PDF tema terang dan gelap identik
  byte-per-byte.
- **Ekspor** dulu lewat route `/api/export/*` yang membalas halaman HTML login saat sesi habis; sekarang dikerjakan di peramban dan
  `401 JSON`.

### Yang berubah pada perilaku

- **Filter masuk ke URL** — `/reports?q=Handover&kategori=Dokumentasi&page=2`,
  termasuk filter peserta pada feed bersama.
- **Paginasi 20 baris.** Sebelumnya `/reports/feed` memuat seluruh tabel semua
  peserta — diproyeksikan ±280 KB JSON tiap navigasi pada 188 baris nyata.
- **Halaman ekspor hanya mengambil batas tanggal + jumlah** (`count: "exact",
  head: true`), bukan seluruh baris.
- **Toast pada setiap simpan/hapus**, menyebutkan judul dan durasi tercatat.
- **Unggah foto** dengan pratinjau, progress bar, dan tombol buang.
- **Thread komentar** memakai avatar, batas 1000 karakter dengan penghitung,
  dan dialog konfirmasi saat menghapus.
- **Tampilan mobile**: tabel 6–7 kolom diganti kartu.
- **Toolbar cetak** menyertakan satu baris instruksi menyimpan sebagai PDF.

---

## Pembaruan v1.0

- **Kop surat fleksibel**: identitas kop kedua dokumen cetak (baris kop, judul
  dokumen, identitas kampus Formulir 2, kode SOP, lokasi ttd, logo) kini
  setelan per-user di kartu "Kop Surat & Logo" halaman `/account` — lengkap
  dengan live preview dan tombol reset. Tanpa setelan, output identik dengan
  identitas bawaan PT Badak NGL / STITEK (diverifikasi terhadap baseline PDF).
- Resolver tunggal `src/lib/letterhead.ts`; logo unggahan tersimpan berversi di
  bucket `org-logos` (cache SW/CDN selalu ter-bypass); logo landscape didukung
  lewat layout adaptif; export Excel kini ber-kop bergambar dan nama file
  mengikuti judul dokumen.
