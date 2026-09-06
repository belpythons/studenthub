# Audit Kelayakan Rilis — Lintas Modul

> Hasil riset & audit menuju status **ready-to-release**. Dokumen ini murni analisa —
> tidak ada kode yang diubah. Detail desain per fitur ada di dokumen 01–04 pada folder
> yang sama. Tanggal audit: 30 Agustus 2026.

---

## Ringkasan Eksekutif

Aplikasi sudah kokoh sebagai MVP single-tenant (STITEK Bontang + PT Badak NGL):
alur CRUD lengkap, cetak A4 stabil, PWA berjalan, RLS per-user rapi. Namun untuk
layak rilis sebagai produk yang dipakai kampus manapun, ada tiga kelas pekerjaan:

1. **Konfigurabilitas** — identitas kampus (kop, logo, aturan poin SKM) saat ini
   di-hardcode pada level kode (`ORG`, `SKM_POINT_RULES`, `/logo.png`). Fitur 1 & 2
   pada dasarnya adalah pekerjaan memindahkan konstanta compile-time menjadi data runtime.
2. **Model data logbook** — konsep "proyek + banyak konsultan + riwayat keputusan"
   belum ada primitifnya sama sekali; logbook masih log datar. Fitur 3 adalah
   penambahan model data baru, bukan sekadar UI.
3. **Fondasi kualitas** — validasi server-side, transaksi, dan test harness yang
   saat ini absen; tanpa ini, fitur baru manapun berdiri di atas pondasi rapuh.

---

## 1. Inventaris Gap Teknis (temuan audit kode)

### P0 — memblokir rilis (integritas data & janji fitur)

| # | Temuan | Lokasi | Dampak |
|---|---|---|---|
| P0-1 | `npm run verify` **pasti gagal**: script `test: vitest run` ada di `package.json`, tetapi `vitest` tidak terpasang di `devDependencies` dan tidak ada satu pun file `*.test.*` | `package.json` | CI/rilis tidak punya gerbang mutu; klaim "verify" menyesatkan |
| P0-2 | Seluruh tulisan data dilakukan **langsung browser → Supabase (PostgREST)** tanpa Server Action / API route; validasi hanya di klien | `skm-form.tsx`, `logbook-form.tsx`, `report-form.tsx` | Nilai apa pun (mis. `poin_skm` 999999) bisa disimpan; standar poin "resmi" hanya bersifat anjuran |
| P0-3 | `skm_activities.poin_skm INT` **tanpa CHECK constraint** dan `kategori VARCHAR` bebas tanpa FK | `supabase/schema.sql:33-50` | Data kotor tidak bisa dicegah di lapisan mana pun |
| P0-4 | Insert supervisor + entry logbook **non-transaksional** — gagal di langkah kedua meninggalkan baris supervisor yatim | `logbook-form.tsx:138-171` | Data sampah menumpuk sunyi |
| P0-5 | Renumber nomor urut logbook = **2N round-trip non-atomik** (tulis `10000+i` lalu `i+1`); interupsi meninggalkan baris di 10000+ | `logbook-table.tsx:105-145` | Korupsi urutan pada dokumen resmi cetak |

### P1 — dibutuhkan oleh 3 fitur utama (fondasi bersama)

| # | Temuan | Dibutuhkan oleh |
|---|---|---|
| P1-1 | Tidak ada tabel konfigurasi/instansi apa pun; satu-satunya "setting" adalah kolom free-text di `profiles` (`instansi`, `tempat_kp`) yang tidak bisa dijadikan join key | Fitur 1 (persona SKM), Fitur 2 (kop surat) |
| P1-2 | Tidak ada konsep **role/admin** di RLS — semua policy `auth.uid() = user_id` | Fitur 1 (kelola preset), Fitur 3 (akses pembimbing) |
| P1-3 | Tidak ada **seam server-side** (nol Server Action, API route hanya `/api/export/*`) | Fitur 1 (validasi poin), RAG Gemini (API key wajib server-only) |
| P1-4 | Provenance poin SKM hilang — `tingkat` yang dipilih tidak pernah dipersist | Fitur 1 (rescaling antar persona mustahil tanpa ini) |
| P1-5 | Service worker mem-precache `/logo.png` cache-first (`sw.js:24,76`) — penggantian logo same-path akan tetap menampilkan logo lama | Fitur 2 (logo kampus) |
| P1-6 | Tidak ada `updated_at` / audit trail di `logbook_entries` — catatan keputusan bisa diedit tanpa jejak | Fitur 3 (imutabilitas keputusan) |

### P2 — kualitas rilis (tidak memblokir, tapi terlihat pengguna)

| # | Temuan | Lokasi |
|---|---|---|
| P2-1 | Logbook tidak punya halaman detail entri (`/logbook/[id]`), tidak seperti reports | `src/app/(app)/logbook/` |
| P2-2 | Logbook tidak punya export CSV/XLSX — `api/export/*` hard-wired ke `internship_reports` | `src/lib/export.ts:21` |
| P2-3 | Sinkronisasi nama pembimbing terdenormalisasi hanya memberi warning toast saat gagal → salinan basi sunyi | `supervisor-manager.tsx:94-105` |
| P2-4 | Agregasi poin SKM `reduce` di JS diulang di 3 tempat (`skm/page.tsx:24`, `dashboard/page.tsx:49`, `linkedin-format.ts:96`) — cap per-kategori nantinya harus diimplementasi 3× | lihat lokasi |
| P2-5 | String identitas tersebar di luar `ORG`: judul dokumen, footer cetak, subtitle sidebar, `manifest.webmanifest`, metadata layout | daftar lengkap di dok 03 |
| P2-6 | Harness QA (`scripts/_qa.mjs`, `_pdf.mjs`) bergantung path Chrome Windows hardcoded — tidak jalan di CI Linux | `scripts/` |

---

## 2. Peta Fitur → Dokumen Desain

| Fitur diminta | Dokumen | Inti perubahan |
|---|---|---|
| SKM: standar poin persona kampus | [01-SKM-PERSONA-STANDAR-POIN.md](01-SKM-PERSONA-STANDAR-POIN.md) | `SKM_POINT_RULES` (TS array) → tabel data `institution_presets` + `skm_point_rules`; target 50 → target per-persona; normalisasi progres % |
| SKM: RAG branding LinkedIn (Gemini) | [02-SKM-RAG-LINKEDIN-GEMINI.md](02-SKM-RAG-LINKEDIN-GEMINI.md) | pgvector + `gemini-embedding-001` + Gemini Flash lewat 1 API key; route handler server-side baru; fallback ke template existing |
| Task Report: kop surat fleksibel | [03-TASKREPORT-KOP-SURAT-FLEKSIBEL.md](03-TASKREPORT-KOP-SURAT-FLEKSIBEL.md) | Objek `ORG` compile-time → `letterhead_settings` runtime + bucket `org-logos`; sistem inti Badak NGL tidak berubah |
| Logbook: konsultasi proyek multi-persona | [04-LOGBOOK-KONSULTASI-PROYEK-MULTI-PERSONA.md](04-LOGBOOK-KONSULTASI-PROYEK-MULTI-PERSONA.md) | Tabel baru `projects`/`consultations`/`advice` (pola ADR) + Briefing Pack format SBAR; Formulir 2 tetap kompatibel |

---

## 3. Urutan Implementasi yang Direkomendasikan

Urutan ini meminimalkan pengerjaan ulang karena tiga fitur berbagi fondasi:

```
Tahap 0 — Fondasi (prasyarat semua fitur)
  0a. Pasang vitest + file test pertama (P0-1); jadikan `npm run verify` hijau.
  0b. Tambahkan seam server-side: Server Actions / route handlers untuk mutasi
      (P0-2) — mulai dari modul yang akan disentuh fitur (SKM dulu).
  0c. CHECK constraint dasar di schema.sql (poin_skm >= 0, dsb.) (P0-3).

Tahap 1 — Kop surat fleksibel (dok 03)
  Paling kecil risikonya, tidak menyentuh model data lain, memberi nilai rilis
  langsung ("bisa dipakai kampus manapun"). Sekaligus melahirkan pola
  "settings per-user + bucket upload" yang dipakai lagi di Tahap 2.

Tahap 2 — Persona standar poin SKM (dok 01)
  Butuh tabel preset + persist provenance (P1-4). UI form/progres menyesuaikan.

Tahap 3 — RAG LinkedIn Gemini (dok 02)
  Bergantung pada seam server-side (0b) dan membaca persona dari Tahap 2
  (nama kampus untuk konteks prompt). Bisa dirilis bertahap di belakang flag env.

Tahap 4 — Logbook proyek multi-persona (dok 04)
  Perubahan model data terbesar; memanfaatkan pola halaman detail + print yang
  sudah teruji dari tahap-tahap sebelumnya. Formulir 2 lama tetap jalan selama
  transisi karena skema bersifat aditif.
```

Prinsip lintas tahap:

- **Semua perubahan skema aditif & idempotent** (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`) agar kompatibel dengan pola `supabase/schema.sql`
  tunggal + `scripts/apply-schema.mjs` yang ada. Pertimbangkan folder
  `supabase/migrations/` begitu ada instalasi produksi pertama.
- **Tidak ada API key di klien.** Pola tulis-langsung-dari-browser yang ada tidak
  boleh ditiru untuk fitur yang menyentuh rahasia (Gemini) atau aturan resmi (poin).
- **Dokumen cetak adalah kontrak.** Perubahan apa pun diverifikasi terhadap
  `scripts/_pdf.mjs` (per README: hasil PDF tidak boleh berubah mengikuti tema).

---

## 4. Definisi "Layak Rilis" (checklist keluaran)

- [ ] `npm run verify` hijau (typecheck + lint + minimal 1 suite test per modul).
- [ ] Identitas kampus (teks kop + logo) dapat diganti dari UI tanpa build ulang.
- [ ] Persona SKM dapat dipilih; poin & target mengikuti persona; data lama termigrasi.
- [ ] Generator LinkedIn berfungsi dengan dan tanpa `GEMINI_API_KEY` (fallback template).
- [ ] Logbook mendukung ≥1 proyek dengan ≥2 konsultan dan menghasilkan Briefing Pack.
- [ ] Semua mutasi tervalidasi server-side; tidak ada penulisan poin/keputusan langsung dari browser.
- [ ] Cetak `rekap-magang`, `formulir2` (dan `briefing` baru) diverifikasi light/dark via `_pdf.mjs`.
