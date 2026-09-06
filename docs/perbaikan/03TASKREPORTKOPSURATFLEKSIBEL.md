# Task Report — Kop Surat Fleksibel per Universitas

> Sistem monitoring magang/PKL sudah dikonfigurasi mengikuti alur PT Badak NGL dan
> **tidak diubah**. Dokumen ini mendesain satu hal saja: identitas kop surat (baris
> teks + logo) menjadi dapat disesuaikan dengan universitas manapun. Dokumen desain —
> belum dieksekusi.

---

## 1. Kondisi Saat Ini: identitas kop adalah konstanta compile-time

Seluruh identitas terkonsentrasi di objek `ORG` (`src/lib/constants.ts:33-43`):
`kampus`, `kampusUpper`, `prodiUpper`, `formulirTitle`, `kodeSop`, `perusahaan`,
`perusahaanMixed`, `perusahaanSub`, `lokasi` — frozen `as const`, diimpor 5+ file.
Logo satu-satunya: `public/logo.png` (237×231, krest STITEK), direferensikan sebagai
string literal.

### Peta lengkap titik hardcode yang harus dialihkan ke data runtime

| # | Lokasi | Isi | Kanal |
|---|---|---|---|
| 1 | `src/app/print/rekap-magang/page.tsx:69` | `<img src="/logo.png">` kop | PDF/print |
| 2 | `rekap-magang/page.tsx:71-72` | `ORG.perusahaan` + `ORG.perusahaanSub` (2 baris kop) | PDF/print |
| 3 | `rekap-magang/page.tsx:77` | Judul literal `LAPORAN KEGIATAN MAGANG` (tidak lewat ORG) | PDF/print |
| 4 | `rekap-magang/page.tsx:88,90,285,293` | Fallback `ORG.kampus`/`ORG.perusahaanMixed` (profil menang bila terisi) | PDF/print |
| 5 | `rekap-magang/page.tsx:299` | Footer `Dicetak dari aplikasi Task Report Magang · PT Badak NGL` — **tidak bisa ditimpa** | PDF/print |
| 6 | `src/app/print/formulir2/page.tsx:46-59` | Kop tabel 3 sel: logo + `kampusUpper/prodiUpper` + `formulirTitle/kodeSop` | PDF/print |
| 7 | `src/app/api/export/xlsx/route.ts:77-87` | Pseudo-kop teks (judul literal + `ORG.perusahaanSub`), tanpa gambar; warna `NAVY/HEAD_BG` ARGB hardcoded (`:13-14`) | Excel |
| 8 | `src/lib/export.ts:52-56` | Prefix nama file `laporan-magang-` | Excel/CSV |
| 9 | `src/app/(app)/reports/export/page.tsx:37` | Deskripsi "dokumen resmi PT Badak NGL" | UI |
| 10 | `src/app/(app)/reports/new/page.tsx:15` | Fallback header `"PT Badak NGL"` | UI |
| 11 | `src/components/layout/sidebar-nav.tsx:28,37` | Logo + subtitle `STITEK · PT Badak NGL` | UI |
| 12 | `src/components/layout/AuthCard.tsx:22`, `not-found.tsx:15`, `offline/page.tsx:18` | Logo halaman auth/error | UI |
| 13 | `src/app/layout.tsx:25`, `public/manifest.webmanifest` | Metadata & deskripsi PWA | UI/PWA |
| 14 | `public/sw.js:24,76` | `/logo.png` di PRECACHE, disajikan cache-first | PWA |
| 15 | `src/app/register/RegisterForm.tsx:23`, `profile-form.tsx:36-37`, `schema.sql:141` (trigger), `schema.sql:19-20` (default kolom) | Default `instansi`/`tempat_kp` terduplikasi 3 lapis | Data |

Serta batasan layout: `.badak-kop img` dipaksa kotak **46×46** `object-fit: contain`
(`src/app/print/print.css:70-74`) dan kop hanya mendukung **2 baris teks** (h1+p);
Formulir 2 memakai lebar 17 mm (`print.css:346-349`). Logo universitas berbentuk
landscape/wordmark akan tampak menyusut di kotak persegi.

---

## 2. Desain

### 2.1 Prinsip

1. **Alur dan format dokumen Badak NGL tetap** — susunan seksi I–VII, tabel, tanda
   tangan, statistik, semua tidak berubah. Yang menjadi data hanyalah *identitas*.
2. **Default = kondisi sekarang.** Tanpa setelan, aplikasi mencetak persis seperti
   hari ini (nilai `ORG` menjadi baris default). Tidak ada regresi bagi pengguna lama.
3. Setelan per-user (konsisten dengan arsitektur single-user existing); disiapkan
   agar mudah dinaikkan ke per-institusi bila konsep admin lahir (audit P1-2).

### 2.2 Model data (aditif)

```sql
CREATE TABLE IF NOT EXISTS letterhead_settings (
    user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    -- Kop dokumen rekap magang (perusahaan/instansi magang)
    kop_baris     TEXT[] NOT NULL DEFAULT ARRAY['PT BADAK NGL',
                    'Program Magang / Praktik Kerja Lapangan · Bontang, Kalimantan Timur'],
                  -- 1–4 baris; baris pertama dirender sebagai h1
    judul_dokumen VARCHAR(160) NOT NULL DEFAULT 'LAPORAN KEGIATAN MAGANG',
    -- Kop Formulir 2 (identitas kampus)
    kampus_upper  VARCHAR(160) NOT NULL DEFAULT 'SEKOLAH TINGGI TEKNOLOGI BONTANG',
    prodi_upper   VARCHAR(160) NOT NULL DEFAULT 'PROGRAM STUDI TEKNIK INFORMATIKA',
    formulir_title VARCHAR(160) NOT NULL DEFAULT 'FORM KEHADIRAN DAN AKTIFITAS KERJA PRAKTEK',
    kode_sop      VARCHAR(60)  NOT NULL DEFAULT 'TI-SOP-17/FM-01',
    lokasi_ttd    VARCHAR(120) NOT NULL DEFAULT 'Bontang',
    -- Logo
    logo_url      TEXT,                       -- URL publik bucket org-logos; NULL = /logo.png
    logo_versi    INT NOT NULL DEFAULT 0,     -- cache-busting (lihat 2.5)
    updated_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);
-- RLS: pola "own rows" existing (FOR ALL USING auth.uid() = user_id)
```

Bucket baru **`org-logos`** (public read; insert/update/delete dibatasi prefix
`<user_id>/` — meniru persis kebijakan `skm-certificates` di `schema.sql:220-247`).
Konstanta bucket ditambahkan di `constants.ts` bersama `STORAGE_BUCKET_*` yang ada.
Batas unggah: PNG/SVG/JPG ≤ 2 MB (validasi tipe & ukuran mengikuti pola
`file-picker.tsx`).

### 2.3 Resolver `getOrg()` — satu pintu pengganti import `ORG`

Util baru `src/lib/letterhead.ts`:

```ts
resolveLetterhead(profile, settings): Letterhead
// settings ?? nilai default (identik ORG lama) → tidak pernah null
```

Kelima belas titik pada tabel §1 membaca dari resolver ini (dilewatkan sebagai props
dari Server Component, pola yang sudah dipakai kedua halaman print untuk `profile`).
`ORG` lama dipertahankan hanya sebagai sumber nilai default di satu tempat.
Termasuk yang selama ini luput dari `ORG`: judul dokumen (#3), footer (#5 —
menjadi `Dicetak dari aplikasi Task Report Magang · {baris kop pertama}`), deskripsi
halaman export (#9), dan prefix nama file export (#8 → slug dari judul dokumen).

### 2.4 Layout logo adaptif (print.css)

- `.badak-kop img`: ganti kotak 46×46 fix menjadi `height: 46px; width: auto;
  max-width: 120px; object-fit: contain` — logo persegi tampil sama seperti sekarang,
  logo landscape/wordmark tidak lagi tergencet. Padanan untuk `.stitek-kop`
  (tinggi 17 mm, `width:auto; max-width: 30mm`).
- Print page tetap memakai `<img>` polos (bukan `next/image`) — keputusan existing
  yang benar untuk output print; tinggal `src={letterhead.logoSrc}`.
- **Race gambar remote saat print browser**: logo dari Supabase Storage dimuat dari
  origin lain; sebelum `window.print()` otomatis/manual, `PrintToolbar` menunggu
  `img.decode()` selesai (atau timeout 3s) agar PDF tidak berlubang. `scripts/_pdf.mjs`
  sudah aman (`networkidle2`).
- `next.config.mjs` sudah mengizinkan host Supabase untuk `next/image` — logo di
  sidebar (`sidebar-nav.tsx`) bisa langsung memakai URL bucket.

### 2.5 Service worker & PWA

- `public/sw.js` menyajikan `/logo.png` cache-first dari PRECACHE (`:24,76`). Logo
  unggahan **tidak boleh** menimpa path yang sama. Desain: URL logo selalu berbeda per
  unggahan (path bucket `<user_id>/logo-v<versi>.<ext>`, kolom `logo_versi` naik) —
  same-path replacement tidak pernah terjadi, cache SW dan cache CDN otomatis bypass.
- Ikon PWA (`scripts/generate-pwa-icons.mjs` membaca `public/logo.png` build-time)
  **tetap ikon aplikasi**, bukan ikon kampus — di luar cakupan kop surat; dicatat
  sebagai keterbatasan yang disengaja di UI unggah logo.

### 2.6 Kop Excel bergambar (ExcelJS)

`api/export/xlsx/route.ts` saat ini kop teks saja. Perbaikan:

- Route mengambil `letterhead_settings`; server-side `fetch` logo (URL publik bucket
  atau file lokal default) → `workbook.addImage({buffer, extension})` →
  `worksheet.addImage` di kiri atas sheet "Ringkasan"; baris judul memakai
  `judul_dokumen` + `kop_baris` (menggantikan literal `:77` dan `ORG.perusahaanSub` `:79`).
- Kegagalan fetch logo tidak menggagalkan export (kop teks tetap tercetak).
- Warna `NAVY/HEAD_BG` tetap hardcoded selaras token brand `globals.css` — konfigurasi
  warna **di luar cakupan** (kop = teks + logo saja, sesuai permintaan).
- CSV tetap tanpa kop (by design; hanya prefix nama file ikut `judul_dokumen`).

### 2.7 UI pengaturan

Perluasan halaman `account` (`src/app/(app)/account/page.tsx` — sudah bertagline
*"Data di sini mengisi kop surat…"*, jadi rumah alaminya):

- Kartu baru **"Kop Surat & Logo"**: editor 1–4 baris kop (add/remove baris), field
  judul dokumen, identitas kampus Formulir 2 (4 field), lokasi ttd; unggah logo
  dengan preview + tombol "kembalikan ke logo bawaan" (set `logo_url = NULL`).
- **Live preview kop** kedua dokumen (komponen kecil yang merender markup
  `.badak-kop`/`.stitek-kop` dengan CSS print di-scope) — pengguna melihat hasil
  sebelum mencetak.
- Tombol "Reset ke bawaan" mengembalikan seluruh default Badak NGL/STITEK.

---

## 3. Verifikasi saat implementasi

1. Tanpa baris `letterhead_settings` → hasil PDF `rekap-magang` & `formulir2`
   **byte-identik** dengan sebelum perubahan (pakai harness `scripts/_pdf.mjs`).
2. Isi kop kampus lain (mis. 3 baris + logo landscape) → periksa PDF light/dark,
   Excel (gambar tampil), nama file export, dan preview di `account`.
3. Ganti logo dua kali beruntun → SW & browser menampilkan versi terbaru tanpa
   hard-refresh (verifikasi `logo_versi` bekerja).
4. Unggah file non-gambar / >2 MB → ditolak dengan pesan jelas.
5. Grep sisa string hardcode: `PT Badak|STITEK|BONTANG|logo.png` di `src/` hanya
   boleh tersisa di `constants.ts` (default) dan aset PWA yang disengaja.
