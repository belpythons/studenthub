# Dok 05 — Persona Kampus: Logo PNG Transparan → Email Berlogo → Warna Merek

## 1. Masalah

Aplikasi terkunci pada satu identitas visual: biru PT Badak NGL (`--navy #001e41`,
`--blue #0057a8`) tertanam di `globals.css`, sembilan tempat pada `print.css`, dua
konstanta ARGB pada rute XLSX, dan delapan literal heks di komponen. Kop surat
sudah bisa diganti per pengguna sejak dok 03, tetapi warnanya tidak — mahasiswa
dari kampus lain memakai aplikasi yang secara visual masih milik perusahaan orang
lain, dan seluruh PDF/XLSX yang keluar pun begitu.

## 2. Bentuk akhir

1. Saat mendaftar, calon pengguna mengunggah logo kampus — **wajib PNG dengan
   latar transparan**.
2. Sistem membaca warna dominan logo dan menawarkannya sebagai swatch. Pengguna
   memilih **satu atau dua** warna; halaman pendaftaran langsung berubah warna.
3. Email verifikasi Supabase menampilkan logo dan warna kampus tersebut.
4. Setelah masuk, seluruh UI, seluruh dokumen cetak, dan workbook XLSX memakai
   warna itu.

## 3. Model data

`letterhead_settings` bertambah dua kolom nullable:

| Kolom | Peran |
|---|---|
| `warna_primer` | **jangkar gelap** → `--navy` (kop cetak, bilah seksi, sidebar) |
| `warna_aksen` | **warna kerja** → `--blue` dan `--primary` (tombol, tautan, fokus) |

Keduanya `VARCHAR(7)`, sengaja **tanpa CHECK constraint**: PostgreSQL tidak punya
`ADD CONSTRAINT IF NOT EXISTS` (akan merusak idempotensi `schema.sql`), dan
pelanggaran constraint di dalam trigger signup membatalkan seluruh pendaftaran.
Validasi ada di `saveLetterhead` lewat `vHexColor`.

`handle_new_user()` kini juga menyisipkan baris `letterhead_settings` dari
`raw_user_meta_data` bila `logo_url` terisi. Seluruh nilai adalah ekstraksi `->>`
polos tanpa cast — fungsi ini **tidak boleh** bisa raise. Jangan "memperbaikinya"
kelak dengan domain type atau constraint.

## 4. Berkas

| Berkas | Peran |
|---|---|
| `src/lib/persona.ts` | Seluruh matematika warna. Murni, tanpa dependensi. |
| `src/lib/logo-analyze.ts` | `edgeTransparency` + `dominantColors` atas RGBA mentah. Murni. |
| `src/app/api/onboarding/logo/route.ts` | Unggah publik + validasi + analisis (service role, sharp). |
| `src/app/register/RegisterForm.tsx` | FilePicker, pemilih swatch, pratinjau `<style>` hidup. |
| `src/app/(app)/layout.tsx` | `<style id="persona-kampus">` untuk aplikasi. |
| `src/app/print/layout.tsx` | Atribut `style` pada `.print-root` untuk cetak. |
| `src/app/api/export/xlsx/route.ts` | `NAVY` / `HEAD_BG` dari persona. |

### Kenapa `<style>` di aplikasi tapi atribut `style` di cetak

Bukan inkonsistensi, keduanya wajib begitu:

- **Aplikasi** — Radix mem-portal dialog, sheet, dropdown, dan tooltip ke
  `document.body`, di luar subtree layout. Atribut style pada pembungkus tidak
  akan menjangkaunya; elemen `<style>` berlaku dokumen-lebar.
- **Cetak** — `print.css` mendeklarasikan ulang set token pada `.print-root`
  itu sendiri (blok isolasi tema). Blok `:root` punya kelas spesifisitas yang
  sama, jadi pemenangnya bergantung urutan bundel. Atribut `style` menang mutlak.

Selektor yang dipakai `personaCss` adalah `html:root` (0,1,1) dan
`html:root.dark` (0,2,1) — keduanya mengalahkan `:root` dan `.dark` milik
`globals.css` tanpa bergantung urutan.

## 5. Matematika warna

**Yang dijepit adalah luminansi relatif WCAG, bukan lightness HSL.** `L` tidak
melacak terang yang dipersepsi lintas hue: `hsl(50 100% 46%)` kuning menyilaukan
sementara `hsl(209 100% 46%)` biru nyaman. Menjepit `L` justru meleset persis
pada kasus logo kuning pucat yang menjadi alasan penjepitan ini ada.

| Ambang | Nilai | Alasan |
|---|---|---|
| Terang, warna kerja | `[0,008 … 0,175]` | kontras ≥ 4,5:1 vs putih → `--primary-foreground: white` selalu aman |
| Gelap, warna kerja | `[0,22 … 0,62]` | kontras ≥ 4,5:1 vs `--background` gelap |
| Jangkar | `≤ 0,05` | cukup pekat untuk menyandang teks putih di kop cetak |

Saturasi **tidak** dijepit — lambang kampus monokrom harus tetap abu.

Contoh nyata: logo hijau/kuning menghasilkan `#1b5e20` → jangkar `#144618`
(kontras 10,94 vs putih) dan `#f9a825` → aksen `#9f6404` (kontras 4,89).

**Persona bawaan adalah titik tetap.** `#0057a8` (luminansi 0,098) dan `#001e41`
(0,0131) sudah di dalam rentang, jadi tidak tersentuh; `personaVars(DEFAULT)`
menghasilkan `--navy: #001e41` dan `--primary: 209 100% 33%` persis seperti yang
tertulis di `globals.css`, dan `personaCss(DEFAULT)` mengembalikan `""` sehingga
tidak ada tag yang dirender sama sekali. Ini diuji di `persona.test.ts` sebagai
jaminan nol-regresi dan **jangan dilonggarkan**.

### Token baru `--navy-hsl`

Tailwind 3 mengurai heks *literal* saat build untuk mengemit `rgb(… / .7)`, dan
diam-diam membuang modifier opasitas bila warnanya datang lewat `var()`. Karena
itu `--navy` punya kembaran triplet HSL, dan tiga overlay modal (`dialog`,
`alert-dialog`, `sheet`) ditulis `bg-[hsl(var(--navy-hsl)/0.7)]`. Memakai
`--primary` di sana salah: di tema gelap nilainya versi terang, dan tirai modal
jadi tidak terbaca.

## 6. Validasi logo

Rute `POST /api/onboarding/logo` bersifat **publik** — akun calon pengguna belum
ada, sedangkan RLS Storage hanya mengizinkan `authenticated` menulis di prefix
uid-nya sendiri. Karena itu rute ini memakai service role dan menegakkan seluruh
pemeriksaan sendiri, gagal-cepat:

| # | Cek | Gagal |
|---|---|---|
| 1 | rate limit 5 per 10 menit per IP | 429 |
| 2 | `size ≤ MAX_LOGO_SIZE` (2 MB) | 413 |
| 3 | magic byte `89 50 4E 47 0D 0A 1A 0A` | 415 |
| 4 | `sharp().metadata().hasAlpha` | 422 |
| 5 | `edgeTransparency ≥ 0,95` | 422, menyebut persentase terukur |
| 6 | `dominantColors` tidak kosong | 422 |

`hasAlpha` benar juga untuk PNG palet ber-`tRNS`, yang lolos dari sekadar membaca
colour type di IHDR. Pada langkah 5–6, **`kernel: "nearest"` wajib** saat resize:
Lanczos bawaan mencampur alpha, sehingga logo berlatar solid bisa lolos di sudut
dan logo yang benar malah ditolak.

Berkas disimpan di `org-logos/pending/<uuid>.png`. `saveLetterhead` menerima
prefix `pending/` selain prefix uid pengguna — bucket ini publik-baca, jadi
menerimanya tidak lebih lemah daripada menerima folder sendiri.

`sharp` dipindahkan dari `devDependencies` ke `dependencies`. Ia memang harus
pindah: build produksi yang memangkas devDeps sebelumnya terkirim tanpanya.

## 7. Template email Supabase — LANGKAH MANUAL

Tidak ada kode email di repo ini. Personalisasi dilakukan di
**Dashboard Supabase → Authentication → Email Templates → Confirm signup**.
Template memakai sintaks Go; `{{ .Data }}` adalah `raw_user_meta_data` yang
dikirim `RegisterForm.tsx`, yaitu `logo_url`, `warna_primer`, `warna_aksen`,
`instansi`, dan `nama_lengkap`.

```html
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
  {{ if .Data.logo_url }}
    <img src="{{ .Data.logo_url }}" alt="Logo {{ .Data.instansi }}" height="72"
         style="display:block;margin:0 auto 20px;max-width:180px">
  {{ end }}

  <h2 style="text-align:center;margin:0 0 4px;font-size:20px;color:{{ if .Data.warna_primer }}{{ .Data.warna_primer }}{{ else }}#001e41{{ end }}">
    {{ if .Data.instansi }}{{ .Data.instansi }}{{ else }}Task Report Magang{{ end }}
  </h2>
  <p style="text-align:center;margin:0 0 24px;font-size:13px;color:#55677f">
    Student Hub &amp; Internship Logbook
  </p>

  <p style="font-size:15px;line-height:1.6;color:#1e293b">
    Halo{{ if .Data.nama_lengkap }} <b>{{ .Data.nama_lengkap }}</b>{{ end }},
    akun Anda sudah dibuat. Klik tombol di bawah untuk mengaktifkannya.
  </p>

  <p style="text-align:center;margin:28px 0">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;padding:12px 28px;border-radius:8px;text-decoration:none;
              font-weight:600;color:#ffffff;
              background:{{ if .Data.warna_aksen }}{{ .Data.warna_aksen }}{{ else }}#0057a8{{ end }}">
      Verifikasi Email
    </a>
  </p>

  <p style="font-size:12px;color:#55677f;line-height:1.6">
    Bila tombol tidak berfungsi, salin tautan ini ke peramban:<br>
    <span style="word-break:break-all">{{ .ConfirmationURL }}</span>
  </p>
</div>
```

Catatan penting:

- **`alt` pada `<img>` wajib.** Banyak klien email memblokir gambar remote secara
  bawaan; email harus tetap terbaca tanpa gambar.
- Warna ditulis inline sebagai heks, bukan variabel CSS — klien email tidak
  mendukung `var()`.
- Kunci persona sengaja **dihilangkan seluruhnya** dari metadata saat pengguna
  tidak mengunggah logo, sehingga `{{ if .Data.logo_url }}` jatuh ke cabang
  bawaan alih-alih merender gambar kosong.

### Batasan yang harus disampaikan

**Nama dan alamat pengirim tetap global per-project** (`noreply@mail.app.supabase.io`
pada SMTP bersama Supabase). Isi email bisa per-kampus, pengirimnya tidak.
Membuatnya benar-benar "dari kampus" memerlukan SMTP sendiri — pasang Custom
SMTP di dashboard Supabase (nama pengirim jadi milik Anda, tetap satu untuk semua
kampus) atau kirim email sendiri lewat penyedia seperti Resend (butuh dependensi,
kredensial, dan domain terverifikasi).

## 8. Utang yang diterima sadar

- Objek `org-logos/pending/` dari pendaftaran yang ditinggalkan menumpuk. Sapu
  dengan cron bila bucket membengkak. Ditandai `ponytail:` di rute.
- Rate limit memakai `Map` per-instance; tidak cukup bila aplikasi pernah
  berjalan multi-region.
- Ikon PWA dan `manifest.webmanifest` **tidak** ikut persona — keduanya aset
  build-time (`scripts/generate-pwa-icons.mjs`). Membuatnya per-kampus butuh
  route `app/manifest.ts` dinamis dan pembangkitan ikon saat runtime.
- `AuthCard` pada `/register` masih menampilkan `/logo.png` bawaan; logo kampus
  tampil di kartu pratinjau milik form. Menaruhnya di kop kartu butuh prop baru
  yang menembus komponen yang juga dipakai `/login`.

## 9. Verifikasi yang sudah dijalankan

- `npm run verify` hijau: 9 berkas test, 74 test.
- Keempat jalur penolakan rute diuji dengan berkas nyata: JPEG bernama `.png`
  (415), PNG tanpa alpha (422), PNG berlatar putih (422 "0% transparan"), logo
  sah (200 + dua swatch); permintaan ke-6 dalam jendela → 429.
- Persona hijau/kuning: dashboard dan `/account` berwarna di tema terang dan
  gelap; `/print/rekap-magang` dan `/print/formulir2` **byte-identik** antara
  tema terang dan gelap (pinning terjaga).
- XLSX kedua dataset (`Laporan Kegiatan` dan `Log Book`) memakai `FF144618` —
  membuktikan `fetchLetterhead` sudah dinaikkan ke atas cabang logbook.
- Baris `letterhead_settings` dihapus → dashboard dan cetak kembali biru Badak,
  dan `<style id="persona-kampus">` tidak dirender sama sekali.
