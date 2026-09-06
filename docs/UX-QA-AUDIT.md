# Audit UX/QA & Peningkatan — Putaran 2

Dokumen ini mencatat hasil audit menyeluruh atas aplikasi hasil putaran pertama, temuan yang **terverifikasi** (bukan dugaan), dan apa yang dikerjakan untuk memperbaikinya.

Prinsip yang dipakai: **pengguna harus selalu tahu apa yang sedang terjadi, apa yang berubah, dan bagaimana membatalkannya.**

---

## A. Bug yang ditemukan dan diperbaiki

### A1. Simpan profil melaporkan sukses padahal tidak menyimpan apa pun

`ProfileForm` memakai `.update().eq("id", userId)`. PostgREST membalas **204 tanpa error** ketika tidak ada baris yang cocok, sehingga UI menampilkan "Profil tersimpan." meski baris `profiles` tidak ada — dan kop surat kedua dokumen cetak tetap kosong selamanya.

**Perbaikan** — `.upsert(..., { onConflict: "id" }).select("id").maybeSingle()`. Baris dibuat bila belum ada, dan hasil tulis **diverifikasi**, bukan diasumsikan. Bila server tidak memulangkan baris, pengguna diberi tahu bahwa penyimpanan gagal.
`src/components/layout/profile-form.tsx`

### A2. Berkas Storage dihapus sebelum baris database

Urutan lama: hapus foto/sertifikat → hapus baris. Bila penghapusan baris gagal, berkasnya sudah hilang permanen sementara datanya masih ada.

**Perbaikan** — urutan dibalik pada seluruh alur hapus dan ganti-berkas: baris ditulis/dihapus lebih dulu, berkas menyusul. `removePublicFile` juga tidak lagi pernah menggagalkan aksi pengguna; berkas yatim tidak berbahaya.
`src/lib/upload.ts`, `skm-form.tsx`, `report-form.tsx`

### A3. Shift lintas hari mustahil diinput

`22:00` → `06:00` ditolak validasi, dan `durasiJam()` memulangkan `0`. Peserta shift malam tidak bisa mencatat jam sama sekali.

**Perbaikan** — durasi negatif kini dibaca sebagai kegiatan yang melewati tengah malam (`+24 jam`). Form menampilkan durasi hasil hitungan secara langsung plus badge **"Lintas hari"**, dan `formatRentangJam` menandainya `22:00–06:00 (+1 hari)` agar tidak terbaca sebagai salah ketik.
`src/lib/format.ts` (`isOvernight`, `durasiJam`), `report-form.tsx`

### A4. Nomor urut log book boleh duplikat tanpa peringatan

Formulir 2 bisa tercetak dengan dua baris bernomor sama.

**Perbaikan** — tiga lapis: form memperingatkan saat nomor bertabrakan (sebelum disimpan), halaman daftar menampilkan banner berisi nomor-nomor yang ganda, dan tersedia aksi **"Rapikan penomoran"** yang menomori ulang 1..n mengikuti urutan tanggal (dua tahap dengan offset sementara agar tidak ada nilai kembar di tengah proses).
`logbook-form.tsx`, `logbook-table.tsx`

### A5. Kontras teks di bawah WCAG AA

Terukur dari palet lama: `--muted #6b7c93` = **4.26:1** (butuh 4.5), placeholder `#9aa8bb` = **2.42:1**, judul grup sidebar `#6d87ab` = **3.79:1**. `.hint` dipakai di puluhan tempat.

**Perbaikan** — `--muted-foreground` dinaikkan ke **5.9:1** pada tema terang dan **6.1:1** pada tema gelap; placeholder memakai `muted-foreground/80`; warna sidebar dinaikkan. Fokus kini punya satu perlakuan ring yang konsisten di seluruh aplikasi.

### A6. Tidak ada satu pun `loading.tsx` atau `error.tsx`

Semua halaman `force-dynamic`, jadi setiap navigasi menunggu Supabase tanpa umpan balik apa pun, dan kegagalan query memunculkan layar error mentah Next tanpa jalan kembali.

**Perbaikan** — skeleton per rute yang bentuknya mengikuti tata letak halaman sesungguhnya (`ListPageSkeleton`, `FormSkeleton`), `error.tsx` dengan tombol **Coba lagi** yang menjalankan ulang server component, `global-error.tsx` untuk kegagalan di root layout, dan `not-found.tsx` yang menjelaskan tiga kemungkinan penyebabnya.

### A7. Tidak ada paginasi

`/reports/feed` memuat seluruh tabel semua peserta. Diproyeksikan ±280 KB JSON tiap navigasi pada 188 baris nyata.

**Perbaikan** — paginasi 20 baris per halaman pada semua daftar, dengan keterangan eksplisit "Menampilkan 21–40 dari 188". Halaman ekspor kini hanya mengambil **batas tanggal + jumlah** (`count: "exact", head: true`) alih-alih seluruh baris. Dashboard hanya menarik kolom yang dipakainya.

### A8. Filter hilang saat refresh dan tidak bisa dibagikan

Seluruh filter hidup di `useState`.

**Perbaikan** — `useUrlFilters` menaruh setiap filter di query string. Refresh, tombol Back/Forward, dan berbagi tautan kini semuanya bekerja. Pencarian di-debounce 300 ms dan memakai `router.replace(..., { scroll: false })` agar tidak menumpuk riwayat per ketikan atau melompat ke atas halaman.

### A9. Drawer dan lightbox tanpa dukungan keyboard

Tidak ada Escape, focus trap, focus restore, maupun scroll lock.

**Perbaikan** — keduanya diganti primitive Radix (`Sheet`, `Dialog`) yang membawa perilaku itu secara bawaan. Diverifikasi otomatis: drawer terbuka lalu tertutup dengan Escape.

### A10. Enam `window.confirm` dan satu `window.alert`

Tidak bisa di-style, tidak accessible, dan tidak menjelaskan konsekuensi.

**Perbaikan** — `ConfirmDialog` berbasis Radix `AlertDialog`. Setiap konfirmasi hapus menyebutkan **nama catatannya**, menyatakan bahwa tindakan tidak dapat dibatalkan, dan **merinci apa lagi yang ikut terhapus** (foto, komentar, poin SKM). Tombol aman (`Batal`) yang menerima fokus awal, dan dialog tetap terbuka selama permintaan berjalan.

### A11. Tabel 7 kolom di layar ponsel

**Perbaikan** — di bawah `lg`, setiap tabel dirender sebagai daftar kartu; tabel penuh hanya muncul di desktop. Tidak ada lagi scroll horizontal.

### A12. Belum PWA

Tidak ada `viewport`, `theme-color`, manifest, atau service worker.

**Perbaikan** — lihat bagian D.

### A13. `FilterBar` menghasilkan `id` DOM ganda *(ditemukan saat perbaikan)*

Versi awal me-render `children` dua kali (salinan mobile dan desktop), sehingga setiap kontrol punya `id` kembar dan asosiasi `<label for>` serta `aria-describedby` rusak.

**Perbaikan** — `children` di-render tepat sekali; visibilitas diatur murni lewat CSS. Ada pemeriksaan otomatis yang memastikan tidak ada `id` ganda di lima halaman.

### A14. Hydration mismatch pada `CountUp` *(ditemukan harness QA)*

State awal disemai dari `useReducedMotion()`, yang bernilai `null` di server dan mengikuti setelan OS di klien. Akibatnya server menulis `0`, klien menulis `8`, dan React membuang hasil SSR lalu me-render ulang di klien.

**Perbaikan** — state awal selalu `value` (angka sebenarnya juga ikut ada di HTML, bagus untuk pembaca layar), lalu animasi dijalankan dari 0 di dalam *layout effect* sehingga tidak ada kedipan.

### A15. `Functions cannot be passed directly to Client Components` *(ditemukan harness QA)*

`StatCard` adalah Client Component dan menerima `icon={FileText}` — sebuah fungsi — dari Server Component. Halaman `/reports`, `/reports/feed`, dan `/logbook` **crash** ke error boundary.

**Perbaikan** — prop `icon` sekarang bertipe `React.ReactNode` dan dipanggil sebagai elemen: `icon={<FileText />}`. Elemen bisa diserialisasi, fungsi tidak.

### A16. Halaman cetak ikut menjadi gelap saat tema gelap aktif *(ditemukan saat verifikasi PDF)*

`print.css` dan Tailwind globals sama-sama berakhir sebagai berkas bernama `layout.css`, dan urutannya di bundle bukan sesuatu yang bisa diandalkan. Terukur di bawah emulasi print, override `background` dan `padding` **kalah** dari `body { @apply bg-background }`: area margin A4 tercetak gelap dan isi terpotong di kanan.

**Perbaikan** — seluruh deklarasi di blok `@media print` diberi `!important`, plus token terang dipaksa pada `.print-root`. **Diverifikasi:** PDF tema terang dan tema gelap sekarang **identik byte-per-byte** untuk kedua dokumen.

### A17. Rute API mengembalikan HTML login, bukan 401

**Perbaikan** — `middleware.ts` membalas `401 JSON` untuk `/api/*` dan hanya mengalihkan peramban ke `/login`. Manifest, service worker, dan folder ikon juga dikeluarkan dari matcher agar bisa diakses tanpa sesi.

---

## B. Peningkatan kendali & kejelasan

| Sebelumnya | Sekarang |
|---|---|
| Simpan → langsung pindah halaman, tanpa konfirmasi apa pun | **Toast** menyebutkan apa yang tersimpan (mis. "Kegiatan SKM tersimpan · Ketua Divisi Web Development · 8 poin") |
| Pesan error mentah PostgREST | `describeError()` menerjemahkan kode umum ke bahasa yang bisa ditindaklanjuti (duplikat, foreign key, RLS, sesi kedaluwarsa, koneksi, ukuran berkas) |
| Validasi hanya saat submit | Validasi inline per-field, error hilang begitu pengguna mulai memperbaikinya, `aria-invalid` + `aria-describedby` tersambung |
| Unggah 20 MB tanpa umpan balik | **Progress bar byte-nyata** (lewat XHR, karena supabase-js tidak punya event progress), thumbnail pratinjau, ukuran berkas vs batas, dan tombol buang |
| Pindah halaman membuang input tanpa peringatan | **Bar "ada perubahan belum disimpan"** yang menetap di layar, tombol Simpan yang bisa dijangkau dari mana saja, tombol **Kembalikan**, plus penjagaan `beforeunload` dan intersepsi klik tautan |
| Rentang ekspor salah → PDF kosong tanpa penjelasan | Rentang terbalik diblokir dengan penjelasan; rentang di luar data memunculkan peringatan **sebelum** dokumen dibuat; panel menampilkan tanggal kegiatan pertama dan terakhir milik pengguna |
| Daftar kosong terlihat sama dengan hasil filter kosong | Dua *empty state* berbeda: "belum ada data" menawarkan aksi membuat, "tidak ada yang cocok" menawarkan reset filter |
| Tidak jelas berapa baris yang tersembunyi filter | "1 dari 6 laporan cocok dengan filter", dengan `aria-live` |
| Progress SKM hanya menunjukkan capaian | Menyebutkan sisa yang dibutuhkan: "Butuh 42 poin lagi untuk memenuhi syarat kelulusan" |
| Profil belum lengkap tidak terdeteksi | Dashboard menampilkan pengingat bahwa NIM dan pembimbing dipakai pada kop surat |
| Menyalin teks LinkedIn gagal senyap di konteks non-HTTPS | Ada fallback `execCommand`, dan bila tetap gagal pengguna diberi instruksi Ctrl+C |
| Versi baru aplikasi tersaji senyap | Service worker menawarkan **"Muat ulang"** saat versi baru siap |
| Koneksi putus tidak terlihat | Toast **"Anda sedang offline"** yang menetap, dan konfirmasi saat koneksi kembali |

---

## C. Desain frontend

**shadcn/ui penuh.** 20 primitive di `src/components/ui/` (Button, Input, Textarea, Label, Select, Checkbox, Card, Badge, Table, Dialog, AlertDialog, Sheet, Tooltip, Popover, Progress, Avatar, Skeleton, Separator, DropdownMenu, Sonner). Vanilla CSS lama dibuang seluruhnya kecuali `print.css`, yang memang harus tetap independen.

**Token HSL + dark mode.** `globals.css` mendefinisikan token semantik shadcn untuk tema terang dan gelap, ditambah lapisan token brand (hex) yang **dipatok ke nilai terang di kedua tema** karena dipakai `print.css`. Toggle tema: Terang / Gelap / Ikuti sistem (`next-themes`, `disableTransitionOnChange`).

**Ikon Lucide** — set ikon resmi shadcn — distandarkan lewat `[&_svg]:size-4` pada varian tombol, jadi ukuran dan stroke seragam tanpa perlu diatur di setiap pemakaian. Satu sumber kebenaran navigasi di `src/lib/navigation.ts`; pencocokan rute aktif kini eksplisit per-prefix, menggantikan regex heksadesimal yang kebetulan bekerja tapi akan salah untuk rute baru yang hanya berisi huruf a–f.

**Framer Motion**, semuanya menghormati `prefers-reduced-motion` melalui `MotionConfig reducedMotion="user"` plus satu aturan `@media (prefers-reduced-motion: reduce)`:

- transisi antar halaman (fade + geser 6px, `mode="wait"`)
- stagger pada grid KPI dan daftar kartu
- indikator aktif sidebar dan bottom tab yang **meluncur** antar item (`layoutId`)
- `Collapsible` untuk panel supervisor baru, peringatan, dan filter
- `CountUp` pada setiap angka KPI
- bar perubahan-belum-disimpan masuk dengan spring
- dialog/sheet/toast memakai animasi `tailwindcss-animate`

---

## D. PWA & mobile

**Manifest** (`public/manifest.webmanifest`) — `display: standalone`, `start_url: /dashboard`, `theme_color: #0a2a5e`, ikon `any` + **maskable**, dan tiga **shortcut** (Buat Laporan · Tambah Entri Log Book · Tambah Kegiatan SKM).

**Ikon** dibangkitkan dari `logo.png` oleh `scripts/generate-pwa-icons.mjs` (192/512 biasa, 192/512 maskable, apple-touch 180, favicon 16/32). Ikon maskable dipotong ke **lambang saja** — kotak batasnya diukur programatik dari berkas sumber — karena mask lingkaran Android akan membuang wordmark "STITEK", dan wordmark biru tua itu tidak punya kontras cukup di atas latar navy.

**Service worker** (`public/sw.js`) ditulis tangan, bukan dibangkitkan, karena aplikasi ini punya satu aturan keras: **data per-pengguna tidak boleh pernah disajikan dari cache.** Menyajikan log book peserta lain dari cache basi lebih buruk daripada sekadar offline.

| Jenis permintaan | Strategi |
|---|---|
| Navigasi halaman | Network-first, jatuh ke halaman `/offline` |
| `/_next/static/*` | Cache-first (nama berkas ber-hash, tidak mungkin basi) |
| Ikon & manifest | Stale-while-revalidate |
| Supabase, `/api/*`, `/auth/*`, `/print/*`, payload RSC | **Tidak disentuh sama sekali** |

**Tawaran pasang aplikasi** memakai `beforeinstallprompt` bila tersedia (Chrome/Edge → dialog instalasi asli). Di iOS Safari yang tidak punya API itu, kartunya **menjelaskan jalur Bagikan → Tambahkan ke Layar Utama** alih-alih memberi tombol palsu. Penolakan diingat agar tidak mengganggu lagi.

**Mobile:**

- **Bottom tab bar** 4 tujuan dengan `env(safe-area-inset-bottom)`, plus FAB yang tujuannya menyesuaikan bagian yang sedang dibuka
- Drawer Radix `Sheet` untuk menu lengkap
- Tabel → kartu di bawah `lg`
- Filter mengumpul di balik satu tombol dengan penghitung jumlah filter aktif
- Target sentuh ≥ 40px (tombol `h-10`, item nav `min-h-10`)
- `viewport-fit=cover`, `maximumScale: 5` (mengunci zoom akan melanggar WCAG 1.4.4)
- `theme-color` mengikuti skema warna

---

## E. Kualitas kode

- `src/lib/notify.ts` — satu tempat aplikasi berbicara soal hasil mutasi
- `src/components/shared/field.tsx` — satu bentuk untuk setiap field, termasuk kabel a11y-nya
- `src/lib/navigation.ts` — satu sumber kebenaran navigasi
- `src/hooks/use-url-filters.ts`, `use-unsaved-changes.ts` — perilaku lintas halaman yang dulu diduplikasi
- `cn()` dari `clsx` + `tailwind-merge`; varian lewat `class-variance-authority`
- `tsc --noEmit` bersih, `next lint` bersih, `next build` bersih (27 rute)

### Harness QA otomatis

`scripts/_qa.mjs` menjalankan Chrome sungguhan (puppeteer-core), login sebagai pengguna nyata, mengambil **29 tangkapan layar** (desktop/mobile × terang/gelap), dan menegaskan sepuluh perilaku:

```
ok   delete opens AlertDialog          ok   overnight shift accepted
ok   filters restore from URL          ok   certificate dialog keyboard
ok   search writes to URL              ok   no duplicate DOM ids
ok   unsaved bar appears               ok   PWA manifest
ok   toast on invalid submit           ok   skip link focusable
```

Harness inilah yang menemukan A13, A14, dan A15 — tiga bug yang tidak terlihat pada `tsc` maupun `next build`, dan dua di antaranya membuat halaman crash. Kini nol error console di seluruh rute.

`scripts/_pdf.mjs` mencetak kedua dokumen resmi ke PDF pada tema terang **dan** gelap, lalu membandingkan ukurannya — cara memastikan tampilan aplikasi tidak pernah bisa mengubah hasil cetak.

---

## F. Yang sengaja tidak dikerjakan

- **`useUnsavedChanges` masih memakai `window.confirm`** untuk intersepsi klik tautan. `beforeunload` wajib memakai dialog asli peramban, dan intersepsi tautan harus **sinkron** — App Router tidak menyediakan hook navigasi yang bisa dibatalkan secara asinkron. Kerugiannya dikurangi oleh bar perubahan-belum-disimpan yang selalu terlihat.
- **Halaman cetak tidak dark-mode-kan.** Disengaja: hasil PDF harus stabil.
- **Data offline read-only belum ada.** Menyimpan laporan per-pengguna di cache berisiko membocorkan data antar akun pada perangkat bersama; halaman `/offline` menyatakan hal ini secara terbuka.
- **Aturan poin SKM** masih nilai bawaan dan tetap perlu diverifikasi ke pihak kampus.
