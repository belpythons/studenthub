# Catatan Rilis v1.0 — Student Hub & Internship Logbook

Tanggal: 31 Agustus 2026 · Branch: `feat/student-hub-and-logbook`

Rilis ini mengeksekusi keenam dokumen `docs/perbaikan/` (audit 00 + desain 01–04)
dalam enam tahap berurutan. Semua tahap ditutup `npm run verify` hijau
(typecheck + lint + 47 unit test) dan verifikasi fungsional end-to-end.

---

## Fitur Baru

### 1. Fondasi kualitas (Tahap 0 — audit P0-1/P0-2/P0-3)
- **vitest** terpasang; `npm run verify` kini benar-benar berjalan (sebelumnya
  script `test` menunjuk runner yang tidak terinstal). 7 suite / 47 test.
- **Server Actions** menggantikan pola tulis-langsung-dari-browser untuk seluruh
  mutasi SKM, logbook, pembimbing, proyek, dan saran — validasi server-side di
  `src/lib/validate.ts`, `user_id` selalu dari sesi.
- **CHECK constraint**: `poin_skm >= 0`, `nomor_urut >= 1` (idempoten via DO-block).

### 2. Kop surat fleksibel (Tahap 1 — dokumen 03)
- Tabel `letterhead_settings` + bucket `org-logos`; resolver tunggal
  `resolveLetterhead()` (`src/lib/letterhead.ts`).
- Seluruh titik hardcode identitas (kop cetak, judul dokumen, footer, Excel,
  nama file export, sidebar, deskripsi halaman) kini membaca resolver.
- **Tanpa setelan, output PDF identik dengan sebelum perubahan** (diverifikasi
  visual terhadap baseline `scripts/_pdf.mjs`); sistem inti Task Report
  PT Badak NGL tidak berubah.
- Logo adaptif (persegi/landscape) via kelas CSS kondisional; unggahan logo
  memakai path berversi sehingga cache SW/CDN selalu ter-bypass; kop Excel
  bergambar via ExcelJS `addImage`; UI "Kop Surat & Logo" + live preview +
  reset-ke-bawaan di `/account`.

### 3. Persona standar poin SKM (Tahap 2 — dokumen 01)
- Tabel `institution_presets` + `skm_point_rules` (seed 5 persona) + provenance
  `tingkat`/`rule_id`/`jam_sosial` di `skm_activities` (P1-4).
- Target diverifikasi ulang ke sumber (30 Agu 2026): **ITS SKEM 1000**
  (koreksi dari dugaan 950 di dokumen riset; D3 750), **UNAIR SKP 75**
  (35 wajib + ≥40 pilihan), **Tel-U TAK 60** (gerbang sidang TA),
  **BINUS SAT 120 + 30 jam sosial**. Bobot per kegiatan kampus adalah estimasi
  tersekala dari anchor pedoman → `verifikasi='sekunder'`.
- Persona **Kustom** = salinan 1:1 `SKM_POINT_RULES` lama — nol regresi.
- Konversi antar persona satu transaksi RPC `convert_skm_persona`
  (equivalence_key; entri manual tidak disentuh; teruji bolak-balik 20→850→20).
- Agregasi tunggal `skm-aggregate.ts` (P2-4) dipakai /skm, dashboard, dan
  portfolioMarkdown; progres % target persona + bar jam sosial BINUS +
  peringatan cap kategori.

### 4. LinkedIn Assistant RAG dengan satu API key Gemini (Tahap 3 — dokumen 02)
- pgvector + `branding_chunks` (RLS deny-all; akses hanya via RPC SECURITY
  DEFINER `match_branding_chunks`) + `linkedin_drafts` (cache + riwayat).
- Korpus KB dua bahasa terkurasi (36 chunk) di `docs/branding-kb/`, di-ingest
  `scripts/ingest-branding-kb.mjs` (gemini-embedding-001, 768 dimensi).
- `POST /api/skm/linkedin`: rate limit 20/hari, cache `input_hash` (panggilan
  identik tidak memanggil model), timeout 20 detik, degradasi ke template.
  Data pengguna dipagari `<data_kegiatan>` dan dideklarasikan sebagai data,
  bukan instruksi (mitigasi prompt injection).
- **`GEMINI_API_KEY` server-only terbukti**: grep hasil `next build` — 0
  kemunculan key maupun string "GEMINI" di `.next/static`. Tanpa key, halaman
  berperilaku persis seperti sebelumnya. Model default `gemini-3.7-flash`
  (override `GEMINI_MODEL`).

### 5. Logbook proyek multi-persona (Tahap 4 — dokumen 04)
- Skema aditif: `projects`, `project_advisors`, `advice`, `advice_relations`;
  `supervisors` diperluas jadi persona (peran, bidang keahlian, prioritas
  tie-break, catatan gaya); `logbook_entries` + `project_id` (nullable) +
  `updated_at` otomatis (P1-6).
- **Imutabilitas ala ADR ditegakkan trigger DB** `advice_guard`: isi terkunci
  begitu diputuskan; transisi dibatasi (diusulkan→diadopsi/ditolak/di-supersede,
  diadopsi→di-supersede); keputusan wajib beralasan.
- RPC transaksional: `create_advice`, `decide_conflict`, `decide_synthesis`,
  `set_project_advisors`.
- Halaman `/logbook/projects` (+detail: timeline, papan saran per area, konflik
  terbuka + tombol Putuskan/sintesis), **Briefing Pack SBAR** di layar dan
  `/print/briefing` (A4, kop letterhead, teruji light/dark).
- `/logbook/new`: select proyek opsional + prompt "catat saran dari sesi ini?"
  dengan alur konflik tiga-pilihan (menguatkan / bentrok / area lain).
- **Formulir 2 TI-SOP-17/FM-01 tidak berubah sedikit pun** — diverifikasi
  terhadap baseline; entri lama tanpa proyek tetap berfungsi & tercetak sama.
- Skenario studi kasus dokumen 04 (3 persona, 2 saran bentrok Metodologi →
  diputuskan) lulus 15/15 pemeriksaan end-to-end.

### 6. Penutup rilis (Tahap 5)
- **P0-4**: supervisor baru + entri logbook = satu transaksi RPC
  `save_logbook_entry` (tidak ada lagi baris supervisor yatim).
- **P0-5**: renumber atomik `renumber_logbook` — satu UPDATE ber-window,
  offset 10000 dihapus.
- **P2-1**: halaman detail `/logbook/[id]` (plus saran yang lahir dari sesi).
- **P2-2**: export log book CSV/XLSX (`?dataset=logbook`).
- **P2-3**: rename pembimbing + sinkronisasi salinan denormalisasi = satu
  transaksi RPC `update_supervisor_sync` (warning-only path dihapus).
- **P2-6**: harness QA lintas-OS (`scripts/_chrome.mjs`; override `CHROME_PATH`,
  `QA_EMAIL`/`QA_PASSWORD`); `_pdf.mjs` ikut mencetak Briefing Pack.

---

## Migrasi & Operasional
- Semua perubahan skema **aditif & idempoten** dalam `supabase/schema.sql`
  (aman dijalankan berulang; diuji 2× berturut pada tiap tahap). Terapkan
  dengan `npm run db:schema`, lalu `npm run kb:ingest` bila memakai fitur AI.
- Env baru (opsional): `GEMINI_API_KEY` (server-only), `GEMINI_MODEL`.
- Ikon PWA tetap ikon aplikasi (bukan logo kampus) — keterbatasan yang
  disengaja, tercatat di UI unggah logo.

## Penyimpangan sadar dari dokumen desain
1. **CSS logo adaptif via kelas kondisional** (bukan mengubah selektor dasar
   seperti dok 03 §2.4) — mengubah kotak 46×46 akan menggeser logo default 1px
   dan melanggar aturan "PDF identik tanpa setelan".
2. **`resolveLetterhead(settings)` tanpa parameter `profile`** — field profil
   tidak dipakai kop; fallback profil tetap di halamannya masing-masing.
3. **Seed rule persona memakai 5 kategori bawaan aplikasi** (kolom `kategori`
   tetap mendukung kategori bebas) agar form & konversi konsisten; label
   `tingkat` mengikuti istilah kampus masing-masing.
4. **RPC `match_branding_chunks` menerima filter `bahasa`** tambahan (dok 02
   hanya menyebut `filter_seksi`) untuk retrieval dwibahasa yang lebih tepat.
5. **Rate limit AI menghitung baris `linkedin_drafts` per hari** alih-alih
   tabel penghitung terpisah (cache hit tidak menambah hitungan).
6. **Share token pembimbing (dok 04 §3.5) tidak dikerjakan** — ditandai fase 2
   oleh dokumennya sendiri; Briefing Pack cetak/PDF mencukupi.
7. **`sw.js` tidak diubah** — dokumen menyebut `/logo.png` cache-first, aktualnya
   stale-while-revalidate; path logo berversi tetap menjamin kesegaran.
