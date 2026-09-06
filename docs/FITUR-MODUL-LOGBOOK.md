# Modul 3 — Log Book Kegiatan & Konsultasi (Formulir 2 STITEK)

Implementasi dari `QOL/modul-logbook/`. Modul ini mencatat aktivitas Kerja Praktek dan konsultasi lintas pembimbing, lalu mencetaknya sebagai dokumen resmi `TI-SOP-17/FM-01`.

---

## Peta Rute

| Rute | Berkas | Fungsi |
|---|---|---|
| `/logbook` | `src/pages/logbook/LogbookPage.tsx` | Daftar entri + filter pembimbing + 4 KPI |
| `/logbook/new` | `src/pages/logbook/LogbookFormPage.tsx` | Form tambah entri / konsultasi |
| `/logbook/[id]/edit` | `src/pages/logbook/LogbookFormPage.tsx` | Ubah + hapus |
| `/logbook/supervisors` | `src/pages/logbook/SupervisorsPage.tsx` | CRUD pembimbing + hitungan konsultasi |
| `/logbook/rekap` | `src/pages/logbook/RekapKonsultasiPage.tsx` | Rekap konsultasi dikelompokkan per atasan |
| `/print/formulir2` | `src/pages/print/Formulir2Page.tsx` | Dokumen cetak A4 Formulir 2 |

Komponen: `src/components/logbook/{logbook-form,logbook-table,supervisor-manager}.tsx`
Query bersama: `src/lib/logbook-query.ts`

---

## 1. Form Input Konsultasi

Mengikuti mockup `03-FITUR-MULTI-SUPERVISOR.md`:

| Field | Kontrol | Status | Catatan |
|---|---|---|---|
| Tanggal Konsultasi | `date` | Wajib | Default hari ini |
| Nomor Urut | `number` | Otomatis | Terisi otomatis = nomor tertinggi + 1; bisa disunting agar urutan pada Formulir 2 dapat diatur |
| Pembimbing / Atasan | `select` | Wajib | Berisi seluruh pembimbing terdaftar + opsi **`+ Tambah Supervisor Baru`** |
| ↳ Nama / Jabatan / Departemen | `text` | — | Muncul inline saat opsi "Tambah Supervisor Baru" dipilih; supervisor dibuat dan langsung dipakai saat disimpan |
| Aktivitas / Topik Konsultasi | `textarea` | Wajib | — |
| Hasil & Tindak Lanjut | `textarea` | Opsional | Poin 3 pada daftar kejelasan spesifikasi |
| Status Paraf | `checkbox` | — | `Sudah Di-paraf / Disetujui` |

Empat kejelasan yang dituntut spesifikasi semuanya tercakup: **siapa yang dikonsultasikan** (nama + jabatan + departemen), **topik/arahan**, **hasil & tindak lanjut**, dan **status paraf**.

---

## 2. Tracking Multi-Supervisor

Halaman **`/logbook/supervisors`** mengelola daftar orang berpangkat yang diajak konsultasi — mis. *Manager IT, Lead Engineer Production Planning, Senior Supervisor SHE-Q, Specialist Data*. Setiap baris menampilkan jumlah konsultasi yang tercatat.

- Menyunting nama/jabatan seorang pembimbing **ikut memperbarui seluruh entri log book miliknya**, sehingga dokumen cetak tetap konsisten.
- Pembimbing yang masih dipakai entri tidak bisa dihapus; sistem menyebutkan berapa entri yang menahannya.

Halaman **`/logbook/rekap`** menghasilkan tampilan yang diminta spesifikasi — satu kartu per atasan, berisi tabel `Tanggal · Topik Konsultasi · Status Paraf` dengan badge **`Verified ✓`** dan **`Pending`**, diurutkan dari atasan dengan konsultasi terbanyak. Setiap kartu memiliki tautan cetak Formulir 2 yang hanya memuat entri pembimbing tersebut.

Filter pembimbing juga tersedia langsung di `/logbook`.

---

## 3. Dokumen Cetak — Formulir 2

`/print/formulir2` mereproduksi `QOL/log book.docx` (`TI-SOP-17/FM-01`).

### Spesifikasi Layout

Mengikuti `02-FITUR-FORMULIR2-TEMPLATE.md` secara harfiah:

| Elemen | Nilai |
|---|---|
| Ukuran kertas | A4 Portrait |
| Margin | 2,5 cm pada keempat sisi (`@page margin: 10mm` + padding sheet 15mm) |
| Font | `Times New Roman`, 12pt; header kop 12pt bold, kode SOP 10,5pt |
| Border kop | Kotak ganda tebal-tipis — luar `1.5pt`, sekat sel `1pt` |
| Border tabel | Hitam solid `1px`, padding sel `6px 8px` |

### Struktur

```
┌────────┬──────────────────────────────┬───────────────────────────┐
│ [LOGO] │ SEKOLAH TINGGI TEKNOLOGI     │ FORM KEHADIRAN DAN        │
│        │ BONTANG                      │ AKTIFITAS KERJA PRAKTEK   │
│        │ PROGRAM STUDI TEKNIK INFORM. │ TI-SOP-17/FM-01           │
└────────┴──────────────────────────────┴───────────────────────────┘

Nama Mahasiswa        :  <profil>
NIM                   :  <profil>
Tempat Kerja Praktek  :  <profil>

┌────┬────────────────┬──────────────────────┬──────────────────────────────────┐
│ No │ Hari/Tanggal   │ Aktivitas Pekerjaan  │ Nama dan Paraf Pembimbing Lapangan│
└────┴────────────────┴──────────────────────┴──────────────────────────────────┘

                                        <Lokasi>, <dd Bulan yyyy>
                                        Pembimbing Lapangan
                                        <Jabatan Pembimbing Lapangan>

                                        <<Tanda tangan dan Cap>>

                                        (Nama Pembimbing Lapangan)
```

Kolom **Hari/Tanggal** ditulis `Selasa, 07/07/2026` — nama hari dihitung dari tanggal, sesuai judul kolom "Hari/Tanggal" pada docx.

Kolom **Nama dan Paraf** memuat tiga baris: nama tebal, jabatan miring, lalu `( sudah diparaf )` bila `paraf_status = true` atau `( ......... )` sebagai ruang paraf manual bila belum.

Blok tanda tangan mengambil pembimbing utama dari profil (`/account`). Bila belum diatur, sistem memilih pembimbing yang **paling sering** muncul pada entri yang dicetak. Bila keduanya kosong, placeholder asli docx (`<<Diisi dengan Jabatan Pembimbing Lapangan>>` dan `(Nama Pembimbing Lapangan)`) tetap dicetak agar bisa diisi tangan.

Log book kosong tetap mencetak satu baris bernomor 1 — formulir siap diisi manual.

Filter opsional `?pembimbing=<id>` mencetak Formulir 2 khusus satu pembimbing.

---

## Skema & Keamanan

Tabel `logbook_entries` mengikuti `README.md`, dengan dua kolom dan satu tabel tambahan:

```sql
CREATE TABLE supervisors (       -- EXTENSION
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(255),
    departemen VARCHAR(255),
    created_at TIMESTAMPTZ
);

ALTER TABLE logbook_entries
  ADD supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,  -- EXTENSION
  ADD hasil_tindak_lanjut TEXT;                                          -- EXTENSION
```

`pembimbing_nama` dan `pembimbing_jabatan` sengaja **tetap disimpan di baris entri** (denormalisasi) walaupun sudah ada `supervisor_id`. Alasannya: bila sebuah entri kehilangan relasi supervisor (misal supervisor dihapus → `SET NULL`), Formulir 2 yang sudah pernah dicetak tetap dapat direproduksi dengan kata-kata yang sama.

Kolom `profiles` yang dipakai blok pengesahan — `pembimbing_nama`, `pembimbing_jabatan`, `lokasi_ttd` — juga merupakan EXTENSION.

RLS: `supervisors` dan `logbook_entries` sepenuhnya **privat**; hanya pemilik baris yang dapat membaca dan menulis.

---

## Yang Belum Ada

- **Paraf digital sesungguhnya** (tanda tangan gambar / verifikasi oleh akun pembimbing) belum ada. `paraf_status` adalah penanda yang dicentang mahasiswa sendiri; dokumen cetak tetap menyediakan ruang tanda tangan basah dan cap, sesuai standar `TI-SOP-17/FM-01`.
- Pembimbing tidak memiliki akun sendiri — spesifikasi tidak menyebut peran pengguna kedua, dan skema `README.md` tidak memiliki kolom peran.


---

## Putaran 2 — Peningkatan UX/UI

Rincian lengkap: [UX-QA-AUDIT.md](UX-QA-AUDIT.md)

**Berkas berganti nama** dan dibangun ulang di atas shadcn/ui:
`logbook-table.tsx`, `logbook-form.tsx`, `supervisor-manager.tsx`.

### Bug yang diperbaiki

- **Nomor urut ganda** dulu lolos tanpa peringatan dan mencetak dua baris
  bernomor sama pada Formulir 2. Sekarang ditangani tiga lapis:
  1. Form memperingatkan saat nomor bertabrakan, **sebelum** disimpan.
  2. Halaman daftar menampilkan banner berisi nomor-nomor yang ganda.
  3. Tersedia aksi **"Rapikan penomoran"** yang menomori ulang 1..n mengikuti
     urutan tanggal. Dijalankan dua tahap dengan offset sementara agar tidak ada
     nilai kembar di tengah proses, dan dialog konfirmasinya menyatakan bahwa
     Formulir 2 yang sudah dicetak tidak lagi cocok nomornya.
- **`window.alert`** saat mencoba menghapus pembimbing yang masih dipakai kini
  menjadi toast peringatan yang menyebutkan jumlah entri penahannya.

### Yang berubah pada perilaku

- **Filter masuk ke URL** — `/logbook?pembimbing=<uuid>&paraf=belum`. Filter
  status paraf (Sudah / Menunggu) adalah tambahan baru.
- **Paginasi 20 baris.**
- **Menyunting nama pembimbing** tetap menyinkronkan seluruh entri log book
  miliknya. Bila sinkronisasi itu gagal, pengguna sekarang **diberi tahu** lewat
  toast peringatan, bukan gagal senyap.
- **Panel supervisor baru** memakai animasi collapse, bukan muncul mendadak.
- **Checkbox paraf** kini menjelaskan bahwa itu penanda status saja dan Formulir
  2 tetap menyediakan ruang tanda tangan basah dan cap.
- **Tampilan mobile**: tabel 6 kolom diganti kartu; nama dan jabatan pembimbing
  dikelompokkan dalam blok tersendiri.
- **Toolbar cetak** menyertakan pengingat margin 2,5 cm dan A4 portrait.

---

## Pembaruan v1.0

- **Proyek konsultasi multi-persona** (`/logbook/projects`): proyek →
  konsultan (persona: peran, prioritas otoritas, bidang keahlian) → sesi
  (entri logbook ber-`project_id` opsional) → saran per area dengan status ala
  ADR (diusulkan/diadopsi/ditolak/di-supersede). Imutabilitas ditegakkan
  trigger DB; keputusan konflik (termasuk sintesis) via RPC transaksional.
- **Briefing Pack SBAR** per proyek (layar + `/print/briefing` A4) — bekal
  konsultan baru: situasi, kronologi + keputusan diadopsi, konflik terbuka,
  dan pertanyaan yang disiapkan mahasiswa.
- **Alur konflik tiga-pilihan** saat mencatat saran pada area yang sudah punya
  saran: menguatkan / bentrok / area lain.
- **Pengerasan**: supervisor baru + entri = satu transaksi RPC (P0-4);
  renumber atomik (P0-5); halaman detail `/logbook/[id]` (P2-1); export
  CSV/XLSX `?dataset=logbook` (P2-2); rename pembimbing tersinkron atomik ke
  salinan denormalisasi (P2-3); `updated_at` otomatis (P1-6).
- **Formulir 2 TI-SOP-17/FM-01 tidak berubah** — seluruh kekayaan data baru
  hidup di layar dan Briefing Pack.
