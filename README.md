# Student Hub & Internship Logbook

Implementasi dari spesifikasi di `D:\KOD ING\QOL\` — tiga modul dalam satu SPA React:

1. **Satuan Kegiatan Mahasiswa (SKM) & LinkedIn Assistant** → [docs/FITUR-MODUL-SKM.md](docs/FITUR-MODUL-SKM.md)
2. **Task Report Magang / PKL (PT Badak NGL)** → [docs/FITUR-MODUL-TASK-REPORT.md](docs/FITUR-MODUL-TASK-REPORT.md)
3. **Log Book Kegiatan & Konsultasi (STITEK `TI-SOP-17/FM-01`)** → [docs/FITUR-MODUL-LOGBOOK.md](docs/FITUR-MODUL-LOGBOOK.md)

Audit UX/QA beserta seluruh bug yang ditemukan dan diperbaiki:
→ [docs/UX-QA-AUDIT.md](docs/UX-QA-AUDIT.md)

---

## Stack

| Layer | Teknologi |
|---|---|
| Build | Vite 7 · React 18 · TypeScript |
| Routing | React Router 7 (`createBrowserRouter`) |
| Data | TanStack Query di atas `@supabase/supabase-js` |
| UI | shadcn/ui (Radix primitives) + Tailwind CSS · Poppins |
| Design system | **Claymorphism** — sudut membulat besar, permukaan lembut, bayangan ganda + sorot inset |
| Ikon | Lucide untuk seluruh ikon inline · [3dicons](https://3dicons.co) (CC0) sebagai aksen 3D di permukaan besar |
| Animasi | Framer Motion — seluruhnya menghormati `prefers-reduced-motion` |
| Tema | `next-themes` — Terang (bawaan) / Gelap |
| Notifikasi | Sonner (toast) |
| Database / Auth / Storage | Supabase (PostgreSQL 15, JWT Auth, Storage Buckets) |
| Backend | **Tidak ada.** Dua Supabase Edge Function untuk yang butuh rahasia |
| Ekspor Excel | ExcelJS, dijalankan di peramban |
| Cetak PDF | HTML + `@media print` A4, ditampilkan dalam modal pratinjau |
| PWA | `vite-plugin-pwa` (Workbox) |

Tidak ada server milik sendiri. Seluruh data mengalir dari peramban langsung ke
Supabase lewat RLS; hanya dua hal yang tidak boleh dipercayakan ke klien yang
berjalan sebagai Edge Function:

| Edge Function | Kenapa harus di server |
|---|---|
| `logo-upload` | Butuh service role: akun penggunanya belum ada saat logo dipilih |
| `linkedin-ai` | `GEMINI_API_KEY` tidak boleh masuk bundel peramban |

### Sistem Token

`src/globals.css` memuat **dua lapis** token, dan pembagian ini penting:

1. **Token semantik shadcn (HSL)** — `--background`, `--primary`,
   `--muted-foreground`, dan seterusnya. Punya nilai terang dan gelap. Semua
   komponen membaca dari sini.
2. **Token brand (hex)** — `--navy #001e41` · `--blue #0057a8` ·
   `--red #e3001b` · `--amber #f9a330`, diambil dari sistem referensi
   `http://10.10.1.187:8097`. **Dipatok ke nilai terang di kedua tema**, karena
   `src/pages/print/print.css` bergantung padanya dan hasil PDF tidak boleh
   berubah mengikuti tema tampilan.

Kontras teks memenuhi WCAG AA: `--muted-foreground` 5.9:1 pada tema terang,
6.1:1 pada tema gelap.

---

## Menjalankan

```bash
npm install
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`.

### Konfigurasi Supabase

`.env.local` (tidak masuk git) harus berisi:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SITE_URL=http://localhost:3000
```

> Awalan `VITE_` menggantikan `NEXT_PUBLIC_`, dan artinya sama: apa pun dengan
> awalan itu ikut masuk ke bundel peramban. Rahasia tidak boleh memakainya.

Variabel berikut **tidak pernah** menyentuh peramban — hanya skrip pemeliharaan di `scripts/` dan Edge Function:

```env
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<pooler-host>:5432/postgres
SUPABASE_ACCESS_TOKEN=<personal access token>   # npm run email:apply
GEMINI_API_KEY=<gemini key>                     # Edge Function linkedin-ai
```

> Host `db.<ref>.supabase.co` pada halaman *Direct connection* Supabase kini hanya menyediakan alamat IPv6. Bila jaringan Anda IPv4-only, pakai **Session pooler** (`aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`) — itulah nilai yang tersimpan di `.env.local`.

### Menyiapkan Database

Jalankan `supabase/schema.sql` satu kali. Dua cara:

```bash
node scripts/apply-schema.mjs      # butuh SUPABASE_DB_URL
```

atau salin isinya ke **SQL Editor** pada dashboard Supabase lalu jalankan.

Skrip itu idempoten (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`) sehingga aman dijalankan ulang. Isinya:

- 6 tabel: `profiles`, `skm_activities`, `internship_reports`, `report_comments`, `supervisors`, `logbook_entries`
- Trigger `on_auth_user_created` — membuat baris `profiles` otomatis saat pendaftaran
- Kebijakan Row Level Security untuk setiap tabel
- Bucket Storage `skm-certificates` dan `report-photos` beserta kebijakan aksesnya

Empat tabel inti mengikuti `QOL/README.md` apa adanya. Kolom dan tabel tambahan diberi komentar `-- EXTENSION:` beserta modul yang membutuhkannya.

### Pengaturan Auth

Pada dashboard Supabase → **Authentication → Providers → Email**: matikan *Confirm email* bila ingin pendaftaran langsung bisa masuk tanpa verifikasi email. Bila dibiarkan menyala, halaman `/register` menampilkan pesan untuk mengecek email lebih dahulu.

**Email ganda.** `signUp()` sengaja tidak memberi galat untuk alamat yang sudah
terdaftar — Supabase mengaburkannya demi anti *user-enumeration*, sehingga
pendaftaran kedua terlihat berhasil dan orangnya menunggu email yang tidak
pernah dikirim. `/register` karena itu memanggil RPC `status_email()`
(`supabase/schema.sql`) sebelum `signUp`, yang membaca
`auth.users.email_confirmed_at` dan mengembalikan tiga keadaan:

| Hasil | Yang terjadi di `/register` |
|---|---|
| `baru` | Pendaftaran lanjut seperti biasa |
| `terdaftar` | Galat "Email ini sudah terdaftar. Silakan masuk lewat halaman Masuk." |
| `belum_verifikasi` | Langsung ke layar verifikasi dengan tombol kirim ulang aktif |

Fungsi itu di-`GRANT` ke `anon` (harus — dipanggil sebelum ada akun), jadi ia
memang jadi celah enumerasi email. Ditukar sadar dengan alur pendaftaran yang
tidak berbohong; aplikasi ini internal kampus, bukan layanan publik.

**Panduan awal.** Kolom `profiles.onboarding_at` menandai modal panduan enam
langkah (`src/components/onboarding/welcome-tour.tsx`) sudah dilihat. Di kolom,
bukan localStorage: alur khasnya adalah mendaftar di laptop lalu memakai di
ponsel, dan penanda per-peramban akan menayangkan ulang panduan yang sama.
Untuk mengetesnya berulang: `UPDATE profiles SET onboarding_at = NULL WHERE
email = '...';`

### Persona Kampus (dok 05)

Halaman `/register` meminta logo kampus — **PNG berlatar transparan**, divalidasi
Edge Function `logo-upload` (magic byte, kanal alpha, bingkai tepi ≥95%
transparan). Warna dominan logo diekstrak jadi swatch; pengguna memilih satu atau
dua, dan warna itu mewarnai seluruh UI, dokumen cetak, serta workbook XLSX.
Pengguna tanpa logo tetap mendapat biru PT Badak NGL, byte-identik seperti
sebelumnya.

Jalur yang sama berlaku setelah pendaftaran: mengganti logo di **Profil &
Pengesahan** menurunkan ulang warna primer dan sekunder dari logo baru
(`src/lib/logo-canvas.ts` → `dominantColors()` → `makePersona()`), lengkap dengan penjepitan kontras,
dan hasilnya tetap bisa digeser manual sebelum disimpan.

Persona ini **belum sampai ke email verifikasi**. Templatenya sudah ditulis
(`supabase/emails/base.html` memakai `{{ .Data.logo_url }}` dan
`{{ .Data.warna_aksen }}`), tetapi Supabase menolak template kustom selama
proyek memakai pengirim email bawaan — lihat
[Template Email Verifikasi](#template-email-verifikasi).

---

## Skrip Pemeliharaan

| Skrip | Fungsi |
|---|---|
| `node scripts/apply-schema.mjs` | Menjalankan `supabase/schema.sql` ke database |
| `node scripts/seed-demo-data.mjs` | Reset + seed demo: menghapus akun dummy, lalu mengisi 15 kegiatan magang nyata (3–21 Agustus 2026) + 15 entri log book untuk akun demo `belvapranamasriwibowo@gmail.com`. Idempoten. |
| `node scripts/generate-pwa-icons.mjs` | Membangkitkan seluruh ikon PWA dari `public/icon.png` |
| `node scripts/ingest-branding-kb.mjs` | Meng-embed korpus `docs/branding-kb/*.md` ke tabel `branding_chunks` (butuh `GEMINI_API_KEY`) |
| `node scripts/_qa.mjs <outDir>` | Harness QA: login sungguhan, tangkapan layar, pemeriksaan perilaku |
| `node scripts/_pdf.mjs <outDir>` | Mencetak dokumen resmi (formulir2, rekap, briefing) ke PDF pada tema terang dan gelap |

Skrip Supabase memakai `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` dan
**tidak** pernah dijalankan oleh aplikasi. `seed-demo-data.mjs` hanya
menghapus akun yang tercantum eksplisit pada konstanta `DUMMY_EMAILS`, jadi
akun sungguhan yang mendaftar belakangan tidak akan pernah tersentuh.
Sumber datanya adalah sheet *Detail Kegiatan* pada berkas laporan XLSX —
`foto_url` dibiarkan kosong karena tangkapan layar aslinya tidak ikut di repo.

Dua skrip berawalan `_` butuh server `npm run dev` yang sedang berjalan.
Lokasi Chrome dicari otomatis lintas-OS (Windows/macOS/Linux) dan dapat
di-override dengan env `CHROME_PATH`. Kredensial `QA_EMAIL` / `QA_PASSWORD`
**wajib** diset — tidak ada lagi akun uji bawaan.

---

## Peta Rute

```
/login · /register                     autentikasi
/faq                                   FAQ & Tentang — publik, bisa dibaca tanpa akun
/offline                               fallback service worker (statis, tanpa sesi)
/dashboard                             ringkasan tiga modul
/account                               profil + blok pengesahan (mengisi kedua kop surat)

/skm · /skm/new · /skm/[id]/edit       portofolio SKM (persona kampus: ITS/UNAIR/Tel-U/BINUS/Kustom)
/skm/linkedin                          router penempatan + generator teks LinkedIn & Markdown
                                       (+ tulis-ulang AI dan chatbot panduan bila GEMINI_API_KEY diset)

/reports/feed                          daftar kegiatan seluruh peserta
/reports · /reports/new                laporan sendiri
/reports/[id] · /reports/[id]/edit     detail + komentar · ubah
/reports/export                        panel filter ekspor
/print/rekap-magang                    dokumen cetak A4 (kop mengikuti setelan "Kop Surat & Logo")

/logbook · /logbook/new                log book kerja praktek (+ select proyek opsional)
/logbook/[id] · /logbook/[id]/edit     detail entri · ubah
/logbook/supervisors                   kelola pembimbing (persona: peran, prioritas, bidang)
/logbook/rekap                         rekap konsultasi per atasan
/logbook/projects · /projects/[id]     proyek konsultasi multi-persona + papan saran ADR
/logbook/projects/[id]/briefing        Briefing Pack SBAR (layar)
/print/formulir2                       dokumen cetak A4 Formulir 2 (kop mengikuti setelan)
/print/briefing?project=<id>           dokumen cetak A4 Briefing Pack SBAR
```

Rutenya didefinisikan di `src/routes.tsx` (React Router `createBrowserRouter`).
Semua kecuali `/login`, `/register`, `/auth/confirm`, `/faq`, dan `/offline`
dibungkus `<RequireAuth>` dari `src/lib/session.tsx`, yang mengalihkan pengunjung
tanpa sesi ke `/login?next=…`. Tidak ada route API: ekspor dikerjakan di peramban
(`src/lib/export-client.ts`) dan asisten LinkedIn memanggil Edge Function
`linkedin-ai` langsung.

### Asisten LinkedIn: knowledge base, router, validator, chatbot

Sumber rancangan: `RisetBlueprintRAGPersonaLinkedIn.md` (riset mekanisme
LinkedIn + blueprint sistem RAG). Fase 1–2 blueprint sudah dibangun.

**Prinsipnya: pengetahuan platform ada di knowledge base, keputusan ada di rule
engine, dan model hanya mengekstraksi serta menulis.** Pembagian ini yang
menekan variansi output dibanding pendekatan "satu prompt besar".

| Bagian | Di mana | Butuh AI? |
|---|---|---|
| Knowledge base (8 berkas, 71 chunk) | `docs/branding-kb/*.md` → `branding_chunks` lewat `npm run kb:ingest` | hanya saat ingest |
| Achievement Router — 12 aturan Bab 4.3 | `supabase/functions/_shared/linkedin-router.ts` | **tidak**, jalan di peramban |
| Validator — 6 pemeriksaan Bab 7.6 | `supabase/functions/_shared/linkedin-validate.ts` | **tidak**, jalan di peramban |
| Tulis ulang draft (RAG) | `linkedin-ai` Edge Function, `action: "generate"` | ya |
| Chatbot Mode Panduan (RAG) | `linkedin-ai` Edge Function, `action: "chat"` | ya |

Router dan validator sengaja deterministik: bisa diuji regresi (golden set 20
kasus Bab 4.4 di `linkedin-router.test.ts`), konsisten, dan tetap berfungsi
meski `GEMINI_API_KEY` belum dipasang. Halaman `/skm/linkedin` karena itu tetap
berguna tanpa AI sama sekali — badge "sebaiknya masuk section apa" beserta
alasannya muncul dari kode, bukan dari model.

**Menambah pengetahuan:** tulis berkas baru di `docs/branding-kb/` dengan
heading `## [bahasa|seksi] Judul`, lalu `npm run kb:ingest` (idempoten — baris
per nama berkas dihapus dan ditulis ulang). Nilai `seksi` bebas; `platform`,
`rules`, `style`, dan `role` dipakai korpus blueprint, sedangkan `experience`,
`certification`, `award`, `volunteering`, dan `umum` dipakai saat menyusun
draft per section. Chat mencari lintas seluruh korpus.

Chunk yang berisi klaim tak pasti wajib membawa kualifikasinya di dalam teks
("menurut praktisi, belum dikonfirmasi LinkedIn"), dan chunk yang menjawab
pertanyaan mekanis wajib membawa tanggal verifikasi — chatbot mengutipnya apa
adanya. Tanpa itu, jawaban tentang batas karakter (fakta) terdengar sama
yakinnya dengan jawaban tentang "golden hour" (dugaan).

**Kuota dan rahasia.** Generasi draft dibatasi 20 per hari dan chat 30 per jam,
dihitung di tabel `rate_limits` lewat RPC `bump_rate_limit`. Dua RPC —
`bump_rate_limit` dan `match_branding_chunks` — sudah di-`REVOKE` dari role
`authenticated`, jadi Edge Function memanggilnya dengan klien service role
terpisah. Klien itu tidak pernah menyentuh data milik pengguna; untuk itu tetap
dipakai anon key + JWT pemanggil supaya RLS berlaku penuh.

### Filter tersimpan di URL

Setiap filter dan nomor halaman ditulis ke query string, sehingga tampilan bisa
di-*refresh*, ditelusuri dengan tombol Back/Forward, dan dibagikan sebagai
tautan:

```
/reports?q=Handover&kategori=Dokumentasi&page=2
/logbook?pembimbing=<uuid>&paraf=belum
/skm?tahun=2025%2F2026
```

---

## Struktur Direktori

```
app/
├─ docs/                    dokumentasi fitur per modul
├─ scripts/                 skrip pemeliharaan & QA (bukan bagian aplikasi)
├─ supabase/schema.sql      skema, RLS, bucket
├─ public/
│  ├─ logo.png              lockup penuh USTB — hanya kartu login/daftar
│  ├─ icon.png              lambang saja — sidebar, 404, offline, kop cetak, sumber ikon PWA
│  ├─ loading.mp4           animasi layar loading (FullPageSpinner)
│  ├─ icons/                ikon PWA hasil generate
│  └─ icons3d/              ikon 3D dekoratif (3dicons, CC0 — lihat LICENSE.md)
├─ index.html               entri Vite; manifest & service worker dibangkitkan plugin
├─ vite.config.ts           Vite + vite-plugin-pwa (manifest, workbox)
├─ components.json          konfigurasi shadcn/ui
└─ src/
   ├─ main.tsx              root render + provider + registerSW
   ├─ routes.tsx            seluruh definisi rute
   ├─ globals.css           token design system (claymorphism)
   ├─ hooks/                use-url-filters · use-unsaved-changes · use-export · use-refresh
   ├─ pages/
   │  ├─ AppLayout.tsx      shell terautentikasi
   │  ├─ login/ register/ auth/ faq/
   │  ├─ dashboard/ account/ skm/ reports/ logbook/
   │  └─ print/             dokumen cetak + print.css
   ├─ components/
   │  ├─ ui/                primitive shadcn/ui + password-input
   │  ├─ shared/            field · confirm-dialog · filter-bar · pagination ·
   │  │                     file-picker · stat-card · skeletons · empty-state ·
   │  │                     unsaved-bar · page-header · error-view · icon-3d
   │  ├─ motion/            primitive Framer Motion
   │  ├─ pwa/               install-prompt (dialog tawaran pasang)
   │  └─ layout/ skm/ reports/ logbook/ print/
   └─ lib/
      ├─ supabase/          client · config
      ├─ session.tsx        SessionProvider · RequireAuth · AuthOnly · signOut
      ├─ types.ts           cerminan schema.sql
      ├─ constants.ts       kategori resmi, batas ukuran, teks institusi
      ├─ format.ts          tanggal/jam Bahasa Indonesia
      ├─ skm-points.ts      tabel bobot poin SKM
      ├─ linkedin-format.ts tiga format LinkedIn + Markdown
      ├─ report-stats.ts    agregasi Section II–IV
      ├─ report-query.ts    filter + query bersama cetak/ekspor
      ├─ logbook-query.ts
      ├─ export.ts          baris & escaping CSV
      ├─ export-client.ts   unduhan CSV/XLSX di peramban
      ├─ upload.ts          Storage helper + progress unggahan
      ├─ persona.ts         warna kampus → token CSS (+ ambang kontras)
      ├─ logo-analyze.ts    warna dominan + tepi transparan (murni, teruji)
      ├─ logo-canvas.ts     pembacaan kanvas → logo-analyze
      ├─ pwa-install.ts     penangkap beforeinstallprompt
      ├─ navigation.ts      sumber kebenaran navigasi
      ├─ notify.ts          toast + penerjemah pesan error
      └─ utils.ts           cn()
```

---

## Template Email Verifikasi

Tiga template (`supabase/emails/`) dirakit dan dipasang oleh satu perintah:

```bash
npm run email:apply
```

Perintah itu juga menyetel **Site URL** dan **Redirect URLs** — bagian yang
berlaku di semua paket Supabase, dan yang memperbaiki tautan verifikasi.

> **Custom SMTP sengaja tidak dipakai.** Supabase menolak subjek maupun
> template kustom selama proyek memakai pengirim email bawaan, jadi yang
> benar-benar terkirim saat ini adalah email **bawaan Supabase yang berbahasa
> Inggris**, tanpa logo dan tanpa nama Student Hub. Penyedia SMTP yang bisa
> mengirim ke alamat mahasiswa mana pun semuanya berbayar pada volume yang
> dibutuhkan, dan itu dinilai belum sepadan. `npm run email:apply` tetap
> berguna: bagian `site_url` + `uri_allow_list`-nya berlaku di semua paket dan
> itulah yang membuat tautan verifikasi mendarat di `/auth/confirm`.

Konsekuensinya ditangani di UI, bukan disembunyikan. `MAIL_SENDER` dan
`MAIL_SUBJECT_CONFIRM` di `src/lib/constants.ts` memuat pengirim dan subjek
**bawaan Supabase** apa adanya:

```
Dari    Supabase Auth <noreply@mail.app.supabase.io>
Subjek  Confirm your email address
```

Keduanya ditampilkan layar "cek email kamu" (`RegisterSuccess.tsx`) dan entri
FAQ sebagai kata kunci yang bisa disalin ke kotak pencarian email, lengkap
dengan peringatan bahwa emailnya berbahasa Inggris dan tidak menyebut "Student
Hub" sama sekali. Tanpa itu, orang mencari nama aplikasi dan tidak menemukan
apa pun.

> **Kalau nanti SMTP jadi dipasang:** isi **Authentication → Emails → SMTP
> Settings**, jalankan `npm run email:apply` sampai ia mencetak
> `OK mailer_templates_confirmation_content`, lalu samakan kedua konstanta di
> atas dengan Sender name dan subjek baru. Batas ~2 email/jam pengirim bawaan
> juga hilang di titik itu.

Tautannya memakai `{{ .TokenHash }}`, bukan `{{ .ConfirmationURL }}`: yang
terakhir mengembalikan sesi lewat alur PKCE yang menyimpan *code verifier* di
peramban tempat pendaftaran dilakukan, sehingga gagal bagi siapa pun yang
mendaftar di laptop lalu membuka emailnya di ponsel.

---

## Deploy ke Vercel

Aplikasi ini adalah SPA statis: Vercel cukup menyajikan `dist/`. `vercel.json`
sudah memuat rewrite yang mengarahkan setiap path ke `index.html`, tanpanya
memuat ulang di `/logbook/123` akan menghasilkan 404.

1. Push repository ke GitHub.
2. Vercel → **Import Repository**. Framework preset: **Vite**. Output directory: `dist`.
3. Tambahkan Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   dan `VITE_SITE_URL` (domain produksi, tanpa garis miring di akhir).
4. **Deploy**.
5. Jalankan `npm run email:apply` sekali dengan `VITE_SITE_URL` sudah menunjuk
   domain produksi — perintah itu yang menyetel *Site URL* dan *Redirect URLs*
   di Supabase. Tanpa langkah ini, tautan verifikasi email ditolak.
6. Deploy Edge Function: `npm run fn:deploy`, lalu pasang rahasianya:
   `supabase secrets set GEMINI_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=...`

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`, dan
`GEMINI_API_KEY` **tidak boleh** dipasang di Vercel — semuanya dipakai skrip
lokal atau Edge Function, dan tidak ada satu pun yang boleh sampai ke peramban.

---

## Menyimpan Dokumen sebagai PDF

Buka `/print/rekap-magang` atau `/print/formulir2`, tekan **Cetak / Simpan PDF**,
lalu pada dialog cetak browser pilih tujuan **Save as PDF**. Toolbar tidak ikut
tercetak; ukuran kertas sudah dikunci A4 portrait lewat `@page`.

Kedua halaman cetak **selalu terang**, apa pun tema tampilan yang dipakai. Ini
diverifikasi otomatis: `scripts/_pdf.mjs` mencetak keduanya pada tema terang dan
gelap, dan hasilnya identik byte-per-byte.

---

## PWA

Aplikasi bisa dipasang ke layar utama. Manifest dan service worker dibangkitkan
`vite-plugin-pwa` (`vite.config.ts`, mode `generateSW`), bukan ditulis tangan:
Vite memberi hash pada setiap aset, jadi daftar precache tulisan tangan pasti
basi sejak build pertama.

| Jenis permintaan | Strategi |
|---|---|
| Navigasi halaman | Precache `index.html`, jatuh ke `/offline` saat gagal |
| Aset ber-hash (`/assets/*`) | Precache Workbox |
| Ikon PWA, ikon 3D, manifest | Precache Workbox |
| Google Fonts | Cache-first, maks 20 entri |
| Supabase, `/print/*` | Tidak disentuh sama sekali |

Aturan kerasnya tetap: **data per-pengguna tidak pernah disajikan dari cache** —
menyajikan log book peserta lain dari cache basi lebih buruk daripada sekadar
offline. `/print/*` juga dikecualikan dari fallback navigasi karena halamannya
dirender ke iframe dan harus selalu segar.

Tawaran pasang muncul sebagai dialog setelah ±6 detik, di aplikasi maupun di
halaman login/daftar; penolakannya diingat di `localStorage`. Event
`beforeinstallprompt` ditangkap `src/lib/pwa-install.ts` saat modul di-import,
bukan saat komponen mount — Chrome menembakkannya sekali dan sangat awal.

Perbarui ikon setelah mengganti `public/icon.png`:

```bash
node scripts/generate-pwa-icons.mjs
```
