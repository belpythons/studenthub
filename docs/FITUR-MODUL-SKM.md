# Modul 1 — Satuan Kegiatan Mahasiswa (SKM) & LinkedIn Assistant

Implementasi dari `QOL/modul-skm/`. Dokumen ini mencatat **fitur yang benar-benar terbangun**, lokasi berkasnya, dan perbedaan terhadap spesifikasi.

---

## Peta Rute

| Rute | Berkas | Fungsi |
|---|---|---|
| `/skm` | `src/pages/skm/SkmListPage.tsx` | Dashboard poin + daftar & filter kegiatan |
| `/skm/new` | `src/pages/skm/SkmFormPage.tsx` | Form tambah kegiatan |
| `/skm/[id]/edit` | `src/pages/skm/SkmFormPage.tsx` | Form ubah + hapus |
| `/skm/linkedin` | `src/pages/skm/LinkedInPage.tsx` | Generator teks LinkedIn & Markdown |

Komponen: `src/components/skm/{skm-progress,skm-list,skm-form,linkedin-assistant,certificate-preview}.tsx`
Logika: `src/lib/skm-points.ts`, `src/lib/linkedin-format.ts`

---

## 1. Form Input SKM

Seluruh field pada `02-FITUR-PRESTASI-ORGANISASI.md` terimplementasi:

| Field | Kontrol | Status | Catatan |
|---|---|---|---|
| Kategori Kegiatan | `select` | Wajib | 5 opsi lengkap dengan emoji: 🥇 Prestasi / Kejuaraan, 🏛️ Pengalaman Organisasi, 📜 Sertifikasi / Lisensi, 🎪 Kepanitiaan Event, 🎓 Workshop / Seminar / Pelatihan |
| **Tingkat / Peran** | `select` | Opsional | **Tambahan** — memicu perhitungan poin otomatis |
| Judul Kegiatan / Peran | `text` (maks 255) | Wajib | Placeholder sesuai spesifikasi |
| Penyelenggara / Instansi | `text` (maks 255) | Wajib | Placeholder sesuai spesifikasi |
| Tanggal Mulai | `date` | Wajib | Default hari ini |
| Tanggal Selesai | `date` | Opsional | Divalidasi tidak boleh mendahului Tanggal Mulai |
| Bobot Poin SKM | `number` | Opsional | Terisi otomatis dari tingkat, selalu bisa ditimpa manual |
| Skill Tags | tag input | Opsional | Enter / koma / Tab menambah tag; Backspace menghapus tag terakhir |
| Deskripsi Pencapaian | `textarea` (4 baris) | Opsional | Satu baris = satu bullet pada output LinkedIn |
| **Credential ID** | `text` (maks 120) | Opsional | **Tambahan** — dibutuhkan baris `Credential ID` format sertifikasi LinkedIn |
| Upload Bukti Sertifikat / SK | `file` | Opsional | `image/*` + `application/pdf`, batas 20 MB dicek di sisi klien, diunggah ke bucket `skm-certificates` |

Mengganti berkas pada mode ubah akan menghapus berkas lama dari Storage. Menghapus entri juga menghapus berkasnya.

### Perhitungan Poin Otomatis

`src/lib/skm-points.ts` memuat tabel `SKM_POINT_RULES` — 18 aturan bobot lintas 5 kategori. Spesifikasi menyebut poin "input manual atau hitung otomatis berdasarkan aturan SKM kampus"; tabel ini adalah **nilai bawaan** dan perlu disesuaikan bila aturan SKM STITEK berbeda. Ubah satu berkas itu saja — form dan dropdown mengikuti otomatis.

Contoh bobot: Prestasi Internasional Juara 1–3 = 25 · Nasional = 20 · Ketua Organisasi = 12 · Sertifikasi Internasional = 15 · Anggota Panitia = 3 · Peserta Workshop Regional = 2.

---

## 2. Dashboard SKM

`SkmProgress` menampilkan blok yang diminta spesifikasi:

- **Total poin** terhadap target kelulusan (`SKM_TARGET_POIN = 50`, di `src/lib/constants.ts`).
- **Progress bar** + badge persentase; berubah menjadi hijau "Syarat Kelulusan Terpenuhi" saat target tercapai.
- **Chip hitungan per kategori** — Prestasi / Organisasi / Sertifikasi / Kepanitiaan / Workshop.

### Filtering & Pencarian

- Search bar mencakup **judul, penyelenggara, dan skill tag** sekaligus.
- Filter kategori.
- Filter **tahun akademik** — dihitung dengan batas 1 Agustus (kegiatan 15 Sep 2025 → `2025/2026`).
- **Pratinjau sertifikat** (Radix `Dialog`): gambar ditampilkan langsung, PDF di-render dalam `iframe`, plus tautan "Buka di tab baru".

Seluruh filter berjalan di sisi klien atas data yang sudah dimuat, namun nilainya disimpan di URL — lihat Putaran 2.

---

## 3. LinkedIn & Resume Assistant

Alur sesuai diagram `03-FITUR-LINKEDIN-ASSISTANT.md`: pilih entri → pilih target section → teks ter-generate → 1-click copy.

Section yang dipilih **otomatis menyesuaikan kategori** entri (Prestasi → Honors & Awards, Sertifikasi → Licenses & Certifications, sisanya → Experience), dan tetap bisa diganti manual.

### Format Output

Ketiga format direproduksi persis seperti spesifikasi:

1. **Experience / Leadership** — `Title` / `Company` / `Dates` / `Description:` berisi bullet `•` per baris deskripsi / `Skills: a · b · c`
2. **Licenses & Certifications** — `Name` / `Issuing Organization` / `Issue Date` / `Credential ID` / `Credential URL` (URL publik berkas di Storage) / `Skills`
3. **Honors & Awards** — `Title` / `Associated with` (instansi kampus) / `Issuer` / `Issue Date` / `Description`

Baris opsional (`Credential ID`, `Credential URL`, `Skills`, `Description`) dihilangkan bila datanya kosong, sehingga tidak ada label menggantung.

### Copy & Export

- **1-Click Copy** memakai Clipboard API, dengan fallback `execCommand("copy")` untuk konteks non-HTTPS (mis. akses via IP LAN).
- Tombol berubah hijau "Tersalin!" selama 1,8 detik, disertai toast konfirmasi.
- **Markdown Export** merangkum seluruh portofolio — dikelompokkan per kategori, memuat judul, penyelenggara, rentang tanggal, deskripsi, skill tag dalam backtick, dan tautan sertifikat.

---

## Skema & Keamanan

Tabel `skm_activities` mengikuti `README.md` apa adanya, dengan satu tambahan:

```sql
credential_id VARCHAR(120)   -- EXTENSION: baris "Credential ID" format sertifikasi LinkedIn
```

RLS: kebijakan `skm own rows` — portofolio bersifat **privat**, hanya pemilik baris (`auth.uid() = user_id`) yang dapat membaca maupun menulis. Bucket `skm-certificates` bersifat publik untuk dibaca (agar `Credential URL` dapat dibuka siapa pun yang diberi tautan) namun hanya pemilik yang dapat mengunggah/menghapus di folder `<user_id>/`.

---

## Yang Belum Ada

- **Aturan poin SKM resmi STITEK** belum tersedia sebagai dokumen acuan; `SKM_POINT_RULES` berisi bobot bawaan yang wajar dan perlu diverifikasi ke pihak kampus.
- Tidak ada ekspor PDF khusus modul SKM — spesifikasi tidak memintanya. Ekspor cetak hanya ada pada Modul Task Report dan Modul Logbook.


---

## Putaran 2 — Peningkatan UX/UI

Rincian lengkap: [UX-QA-AUDIT.md](UX-QA-AUDIT.md)

**Berkas berganti nama** ke konvensi kebab-case dan seluruhnya dibangun ulang di
atas shadcn/ui: `skm-list.tsx`, `skm-form.tsx`, `skm-progress.tsx`,
`linkedin-assistant.tsx`, `certificate-preview.tsx`.

### Yang berubah pada perilaku

- **Filter masuk ke URL.** `/skm?q=hackathon&kategori=Prestasi+%2F+Kejuaraan&tahun=2025%2F2026`
  bisa di-refresh, ditelusuri dengan Back/Forward, dan dibagikan. Pencarian
  di-debounce 300 ms.
- **Paginasi 20 baris**, dengan keterangan "Menampilkan 21–40 dari 118".
- **Progress SKM menyebutkan sisanya**: "Butuh 42 poin lagi untuk memenuhi
  syarat kelulusan", bukan hanya persentase capaian.
- **Unggah sertifikat** kini menampilkan thumbnail pratinjau, ukuran berkas
  terhadap batas 20 MB, progress bar byte-nyata, dan tombol buang. Berkas lama
  hanya dihapus **setelah** baris database berhasil ditulis.
- **Hapus kegiatan** memakai dialog Radix yang menyebutkan judulnya, menyatakan
  poin berapa yang akan hilang dari total, dan menyebut bahwa berkas bukti ikut
  terhapus.
- **Pratinjau sertifikat** memakai Radix `Dialog`: Escape menutup, fokus
  ter-trap dan dipulihkan, scroll halaman terkunci. Versi lama tidak punya satu
  pun dari itu.
- **Perubahan belum disimpan** memunculkan bar menetap dengan tombol Simpan dan
  Kembalikan, plus penjagaan saat menutup tab.
- **Validasi inline** per-field; error hilang begitu pengguna mulai memperbaiki.
- **Salin teks LinkedIn** punya fallback `execCommand` untuk konteks non-HTTPS
  (mis. diakses lewat IP LAN), dan bila tetap gagal pengguna diberi instruksi
  Ctrl+C alih-alih gagal senyap.
- **Tampilan mobile**: tabel 6 kolom diganti kartu; pemilih entri pada LinkedIn
  Assistant menjadi rail horizontal.
- **Tag input** kini memecah daftar yang dipisah koma, baik diketik maupun
  di-paste.

---

## Pembaruan v1.0

- **Persona kampus**: aturan poin kini data runtime (`institution_presets` +
  `skm_point_rules`, seed ITS SKEM 1000 / UNAIR SKP 75 / Tel-U TAK 60 /
  BINUS SAT 120+30 jam sosial / Kustom = baseline lama). Pemilih persona di
  `/skm`; konversi antar persona satu transaksi RPC lewat `equivalence_key`;
  entri manual tidak diubah diam-diam. Provenance `tingkat`/`rule_id`/
  `jam_sosial` tersimpan di `skm_activities`.
- **Mutasi terpusat** (`src/lib/skm-actions.ts`) dengan validasi
  server-side; CHECK `poin_skm >= 0` di DB.
- **Agregasi tunggal** `src/lib/skm-aggregate.ts` (dipakai /skm, dashboard,
  portfolioMarkdown) — mendukung cap kategori dan total jam sosial.
- **LinkedIn Assistant AI (RAG)**: tombol "Tulis ulang dengan AI" muncul bila
  `GEMINI_API_KEY` diset; retrieval dari korpus `docs/branding-kb/` via
  pgvector; cache + riwayat draft di `linkedin_drafts`; tanpa key, template
  deterministik lama tetap bekerja penuh. Lihat `docs/RILIS-v1.0.md`.
