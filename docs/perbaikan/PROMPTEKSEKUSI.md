# Prompt Eksekusi Bertahap untuk Claude Code

Salin satu prompt per sesi, berurutan. Setiap tahap selesai = commit + `npm run verify` hijau
sebelum lanjut ke tahap berikutnya.

---

## Tahap 0 — Fondasi kualitas

```
Baca docs/perbaikan/00-AUDIT-KELAYAKAN-RILIS.md lalu kerjakan Tahap 0 (fondasi) saja:
1. Pasang vitest sebagai devDependency + vitest.config.ts, buat unit test pertama untuk
   src/lib/skm-points.ts, src/lib/format.ts, dan src/lib/export.ts sehingga `npm run verify` hijau.
2. Tambahkan CHECK constraint dasar di supabase/schema.sql secara idempoten
   (poin_skm >= 0, nomor_urut >= 1) sesuai temuan P0-3.
3. Buat seam server-side pertama: pindahkan mutasi create/update/delete skm_activities
   dari browser ke Server Action dengan validasi zod-like (tanpa menambah dependensi
   besar), sesuai temuan P0-2. Perilaku UI tidak boleh berubah.
Jangan kerjakan fitur lain dulu. Commit dengan pesan jelas per langkah.
```

## Tahap 1 — Kop surat fleksibel

```
Baca docs/perbaikan/03-TASKREPORT-KOP-SURAT-FLEKSIBEL.md dan implementasikan penuh sesuai
spesifikasinya: tabel letterhead_settings + bucket org-logos (aditif & idempoten di
supabase/schema.sql), resolver resolveLetterhead() di src/lib/letterhead.ts, alihkan
seluruh 15 titik hardcode pada tabel §1 dokumen itu, layout logo adaptif di print.css,
cache-busting logo (logo_versi, path berversi), kop Excel bergambar via ExcelJS addImage,
dan UI "Kop Surat & Logo" + live preview di halaman /account.
Aturan keras: tanpa setelan, output PDF kedua dokumen cetak harus identik dengan sebelum
perubahan (verifikasi dengan scripts/_pdf.mjs bila lingkungan memungkinkan; minimal
bandingkan markup yang dirender). Sistem inti Task Report PT Badak NGL tidak boleh berubah.
Ikuti bagian "Verifikasi saat implementasi" di dokumen. Tulis unit test untuk resolver.
```

## Tahap 2 — Persona standar poin SKM

```
Baca docs/perbaikan/01-SKM-PERSONA-STANDAR-POIN.md dan implementasikan penuh: tabel
institution_presets + skm_point_rules + kolom provenance (tingkat, rule_id, jam_sosial)
sesuai §3.2, seed 5 persona (ITS SKEM, UNAIR SKP, Tel-U TAK, BINUS SAT, Kustom) dari tabel
riset §2 lengkap dengan sumber_url dan flag verifikasi, pemilih persona di pengaturan,
form SKM membaca rule persona, konversi antar persona server-side dengan equivalence_key
(§3.3), progres ternormalisasi % target + bar jam sosial untuk BINUS, dan util agregasi
tunggal skm-aggregate.ts yang dipakai ketiga konsumen.
Sebelum seeding, verifikasi ulang angka bertanda ⚠ di dokumen ke pedoman resmi terbaru
tiap kampus (cari di web); bila tidak dapat dikonfirmasi, tetap seed dengan
verifikasi='sekunder'. Persona Kustom harus 1:1 dengan SKM_POINT_RULES lama sehingga
tidak ada regresi. Ikuti bagian "Verifikasi saat implementasi".
```

## Tahap 3 — RAG LinkedIn dengan Gemini

```
Baca docs/perbaikan/02-SKM-RAG-LINKEDIN-GEMINI.md dan implementasikan penuh: extension
pgvector + tabel branding_chunks + RPC match_branding_chunks + tabel linkedin_drafts
(§3.2), tulis korpus knowledge base docs/branding-kb/*.md sesuai §3.1 (dua bahasa),
script scripts/ingest-branding-kb.mjs, route handler POST /api/skm/linkedin +
GET /api/skm/linkedin/status memakai @google/genai dengan env GEMINI_API_KEY server-only
(gemini-embedding-001 768 dimensi untuk retrieval, model Gemini Flash terbaru untuk
generasi), cache input_hash, rate limit per-user per-hari, dan state machine
loading/error/fallback di linkedin-assistant.tsx.
Aturan keras: tanpa GEMINI_API_KEY seluruh halaman /skm/linkedin harus berfungsi persis
seperti sekarang (fallback template); API key tidak boleh muncul di bundle klien
(buktikan dengan grep hasil build); input pengguna diperlakukan sebagai data, bukan
instruksi (mitigasi prompt injection sesuai §3.5). Ikuti bagian "Verifikasi saat
implementasi".
```

## Tahap 4 — Logbook proyek multi-persona

```
Baca docs/perbaikan/04-LOGBOOK-KONSULTASI-PROYEK-MULTI-PERSONA.md dan implementasikan
penuh: skema aditif §3.3 (projects, project_advisors, advice, advice_relations, perluasan
supervisors menjadi persona, kolom project_id + updated_at di logbook_entries), halaman
/logbook/projects, /logbook/projects/[id] (timeline + papan saran per area + konflik
terbuka + tombol Putuskan), Briefing Pack SBAR di /logbook/projects/[id]/briefing dan
/print/briefing (A4, memakai infrastruktur print existing), integrasi form /logbook/new
(select proyek opsional + prompt catat saran), dan alur konflik tiga-pilihan
(menguatkan / bentrok / area lain) sesuai §3.4.
Aturan keras: imutabilitas saran ala ADR ditegakkan server-side (§3.3); Formulir 2
TI-SOP-17/FM-01 tidak boleh berubah sedikit pun; entri logbook lama tanpa proyek tetap
berfungsi & tercetak sama. Mutasi multi-baris dilakukan lewat Server Action transaksional.
Jalankan skenario uji studi kasus di bagian "Verifikasi saat implementasi" (proyek
"Penyusunan Jurnal", 3 persona, 2 saran bentrok) dan tulis unit test transisi status.
```

## Tahap 5 — Penutup rilis

```
Baca checklist "Definisi Layak Rilis" di docs/perbaikan/00-AUDIT-KELAYAKAN-RILIS.md §4
dan audit repo terhadap semuanya. Kerjakan sisa item yang belum terpenuhi dari daftar
P0/P1/P2 dokumen itu (antara lain: transaksi supervisor+entry P0-4, renumber atomik via
RPC P0-5, halaman detail /logbook/[id] P2-1, export logbook P2-2, sinkronisasi nama
pembimbing yang gagal P2-3, path Chrome harness QA agar jalan lintas-OS P2-6).
Perbarui docs/ (README + dokumen modul) agar mencerminkan fitur baru, jalankan
npm run verify sampai hijau, dan buat ringkasan perubahan untuk catatan rilis v1.0.
```
