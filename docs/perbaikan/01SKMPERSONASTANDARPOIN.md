# SKM — Persona Kampus & Standar Poin Berbasis Universitas Top Indonesia

> Riset komparatif standar poin kegiatan mahasiswa dari universitas Indonesia yang
> sistemnya terdata jelas, dan desain fitur **Persona Kampus**: pengguna memilih
> "seakan-akan SKM-nya di-setup di kampus X", lalu aturan poin, kategori, dan target
> kelulusan mengikuti kampus tersebut. Dokumen desain — belum dieksekusi.

---

## 1. Kondisi Saat Ini

- Aturan poin = 18 rule hardcoded dalam `SKM_POINT_RULES` (`src/lib/skm-points.ts:17-45`),
  5 kategori, bobot 2–25 poin. Mengubah bobot = edit kode + redeploy.
- Target kelulusan = konstanta tunggal `SKM_TARGET_POIN = 50` (`src/lib/constants.ts:23`).
- **Tidak ada dimensi universitas**: tidak ada tabel institusi, tidak ada join key
  (`profiles.instansi` adalah teks bebas), dan `tingkat` yang dipilih pengguna tidak
  pernah disimpan (`skm-form.tsx` — state React saja), sehingga asal-usul angka poin
  hilang setelah simpan.
- Poin ditulis langsung browser → Supabase tanpa validasi server dan tanpa CHECK
  constraint (`supabase/schema.sql:33-50`).

Dokumen modul sendiri sudah mengakui gap ini: *"Aturan poin SKM resmi STITEK belum
tersedia"* (`docs/FITUR-MODUL-SKM.md`).

---

## 2. Riset: Empat Sistem Poin yang Terdata Jelas

Dipilih empat universitas yang (a) masuk jajaran atas pemeringkatan nasional, dan
(b) sistem poinnya punya dasar regulasi + angka yang terdokumentasi publik. Sesuai
arahan, tidak semua universitas — empat ini sudah mewakili empat karakter skala yang
berbeda. **Catatan verifikasi**: situs resmi kampus tidak dapat diakses langsung dari
lingkungan riset ini (diblokir proxy), sehingga angka diambil dari halaman resmi via
indeks pencarian + sumber sekunder; baris bertanda ⚠ perlu dicek ulang ke pedoman
resmi terbaru saat implementasi seeding data.

### 2.1 ITS — SKEM (Satuan Kegiatan Ekstrakurikuler Mahasiswa)

- **Dasar**: Peraturan ITS No. 3112/I2/KM/2008; diperbarui sebagai sistem SKEM 2021
  yang menjadi basis data pemeringkatan kemahasiswaan nasional & internasional (THE/QS).
- **Bidang**: penalaran & keilmuan; minat & bakat; organisasi & kepemimpinan;
  kepedulian sosial (versi 2021 menilai aspek kompetisi, organisasi, pengabdian
  masyarakat, internasionalisasi).
- **Contoh bobot** (skala ribuan): finalis tingkat internasional **1000**;
  juara I–III regional **750**; juara I–III tingkat institut **500**; ketua organisasi
  (SK Rektor) **500**. ⚠ Rentang predikat contoh D3: Cukup 750–1000, Cukup Baik 1001–1500.
- **Sifat**: SKEM tercetak sebagai transkrip pendamping ijazah; syarat yudisium.
- Sumber: [Konsep SKEM — Dept. Teknologi Informasi ITS](https://www.its.ac.id/it/id/mahasiswa/konsep-satuan-kredit-ekstrakulikuler-mahasiswa/),
  [SKEM ITS 2021 (PDF sosialisasi Dept. T. Sipil)](https://www.its.ac.id/tsipil/wp-content/uploads/sites/30/2020/09/SKEM-ITS_24-Feb-2021.pdf),
  [Peraturan SKEM Mahasiswa ITS](https://www.scribd.com/document/417656934/450102-SK-Skem-Baru).

### 2.2 UNAIR — SKP (Sistem Kredit Prestasi)

- **Kewajiban**: minimum **75 SKP** untuk S1 (D3: **60 SKP**), dikumpulkan sejak
  semester pertama; direkap dalam **Transkrip Kegiatan Mahasiswa (TKM)** — prasyarat wisuda.
- **Distribusi**: kegiatan wajib universitas **35 SKP** (PKKMB, dsb.) + minimum
  **40 SKP** dari bidang pilihan: organisasi & kepemimpinan; penalaran & keilmuan;
  minat, bakat & kegemaran; kepedulian sosial; kegiatan lainnya.
- **Karakter**: satu-satunya dari empat sistem ini yang memisahkan blok *wajib* vs
  *pilihan* — pola yang bagus untuk kampus dengan kegiatan orientasi terstruktur.
- ⚠ Bobot per kegiatan (mis. juara internasional ratusan SKP) bervariasi antar
  pedoman fakultas; gunakan pedoman fakultas sebagai sumber seeding, bukan satu angka universal.
- Sumber: [Apa Itu SKP UNAIR?](https://unair.ac.id/apa-itu-skp-unair-ini-penjelasannya/),
  [Informasi SKP — Kemahasiswaan UNAIR](https://kemahasiswaan.unair.ac.id/en/sistem-kredit-prestasi/),
  [Buku SKP FIKKIA UNAIR (PDF)](https://fikkia.unair.ac.id/wp-content/uploads/2023/08/Buku-SKP.pdf),
  [Tips SKP dari peraih 1000+ poin — FISIP UNAIR](https://fisip.unair.ac.id/slug-tips-skp-unair-1000-poin/).

### 2.3 Telkom University — TAK (Transkrip Aktivitas Kemahasiswaan)

- **Dasar**: KR 2971/2014 tentang TAK; dikelola Direktorat Kemahasiswaan.
- **Kewajiban**: nilai TAK minimum **60** menjadi **syarat pendaftaran sidang Tugas
  Akhir** (ditegaskan berulang di pengumuman sidang fakultas), juga syarat beasiswa
  dan pemilihan mahasiswa berprestasi; dinyatakan sebagai Indeks Kegiatan Kumulatif (IKK).
- **Karakter**: skala puluhan, gesekan administrasi rendah, sangat terikat ke gerbang
  akademik (sidang TA) — paling mirip dengan skala bawaan aplikasi saat ini (target 50).
- Sumber: [TAK — Telkom University](https://telkomuniversity.ac.id/en/transkrip-aktivitas-kemahasiswaan/),
  [KR 2971/2014 (PDF)](https://telkomuniversity.ac.id/wp-content/uploads/2017/12/KR_2971-2014_-_Transkrip_Aktivitas_Kemahasiswaan_TAK.pdf),
  [FAQ TAK — Ditmawa Tel-U](https://studentaffairs.telkomuniversity.ac.id/en/faq-tak/),
  [Pengajuan Sidang — Fak. Teknik Elektro](https://bte.telkomuniversity.ac.id/pengajuan-sidang-tingkat/).

### 2.4 BINUS University — SAT (Student Activity Transcript)

- **Kewajiban**: minimum **120 SAT points** + **30 jam** kegiatan sosial (community
  service hours) sebagai syarat kelulusan.
- **Karakter**: dua dimensi terpisah (poin aktivitas + jam sosial) — satu-satunya
  sistem di sini yang menghitung *jam*, bukan hanya poin; poin diperoleh dari kegiatan
  yang diselenggarakan/disetujui BINUS di dalam maupun luar kampus.
- Sumber: [SAT — BINUS Student](https://student.binus.ac.id/sat/),
  [Student Activity Transcript — SCAC BINUS](https://student-activity.binus.ac.id/2015/10/12/student-activity-transcript-sat/),
  [Study Completion Requirements — BINUS International](https://international.binus.ac.id/communications/study-completion-requirements/).

### 2.5 Sintesis: mengapa "multiplier" saja tidak cukup

| Sistem | Skala poin | Target lulus S1 | Struktur khas |
|---|---|---|---|
| ITS SKEM | ribuan (500–1000+/item) | predikat berjenjang ⚠ | 4 bidang + predikat, basis pemeringkatan |
| UNAIR SKP | puluhan–ratusan | **75** (D3 60) | blok wajib 35 + pilihan ≥40 |
| Tel-U TAK | puluhan | **60** (gerbang sidang TA) | terikat gerbang akademik |
| BINUS SAT | ratusan | **120** + 30 jam sosial | poin **dan** jam terpisah |
| (Existing app) | satuan–puluhan (2–25/item) | 50 | 5 kategori bawaan |

Skala antar kampus berbeda 1–2 orde magnitudo dan **strukturnya** berbeda (blok
wajib, jam sosial, predikat). Maka persona harus berupa **paket aturan lengkap**
(rule + target + struktur), bukan pengali terhadap tabel bawaan, dan progres
ditampilkan sebagai **% terhadap target persona** agar antar persona tetap sebanding.

---

## 3. Desain Fitur: Persona Kampus

### 3.1 Pengalaman pengguna

1. Di pengaturan SKM (atau onboarding), pengguna memilih persona:
   **ITS (SKEM)** · **UNAIR (SKP)** · **Telkom University (TAK)** · **BINUS (SAT)** ·
   **Kustom** (bawaan aplikasi saat ini — baseline STITEK).
2. Form input SKM: dropdown *Tingkat/Peran* berisi rule milik persona; poin terisi
   otomatis dari rule persona; override manual tetap boleh (ditandai "manual").
3. Progress bar: `total / target persona` (mis. 4300/… ITS vs 42/60 Tel-U) + persentase;
   untuk persona BINUS ditampilkan bar kedua "jam sosial /30".
4. Ganti persona kapan saja → poin **dihitung ulang otomatis** untuk entri yang punya
   provenance rule (lihat 3.3); entri manual ditandai "perlu tinjau" dan tidak diubah diam-diam.
5. Disclaimer tetap tampil: persona adalah *simulasi standar* untuk membangun
   portofolio & personal branding, bukan transkrip resmi kampus bersangkutan.

### 3.2 Model data (aditif terhadap `supabase/schema.sql`)

```sql
-- Preset persona (seed dari riset bagian 2; editable admin di masa depan)
CREATE TABLE IF NOT EXISTS institution_presets (
    id          VARCHAR(40) PRIMARY KEY,          -- 'its-skem' | 'unair-skp' | 'telu-tak' | 'binus-sat' | 'custom'
    nama        VARCHAR(120) NOT NULL,             -- 'ITS — SKEM'
    deskripsi   TEXT,
    target_poin INT NOT NULL,                      -- 950(⚠)/75/60/120/50
    target_jam_sosial INT,                         -- hanya BINUS: 30
    sumber_url  TEXT,                              -- tautan pedoman resmi
    verifikasi  VARCHAR(20) NOT NULL DEFAULT 'sekunder'  -- 'resmi' | 'sekunder'
);

CREATE TABLE IF NOT EXISTS skm_point_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preset_id   VARCHAR(40) NOT NULL REFERENCES institution_presets(id) ON DELETE CASCADE,
    kategori    VARCHAR(100) NOT NULL,             -- kategori milik persona (boleh beda dari 5 bawaan)
    tingkat     VARCHAR(160) NOT NULL,
    poin        INT NOT NULL CHECK (poin >= 0),
    cap_kategori INT,                              -- batas maksimal poin dari kategori ini (umum di pedoman SKP)
    urutan      INT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS skm_point_rules_unik
    ON skm_point_rules (preset_id, kategori, tingkat);

-- Pilihan persona per pengguna
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skm_preset_id VARCHAR(40)
    REFERENCES institution_presets(id) DEFAULT 'custom';

-- Provenance poin (perbaikan P1-4 pada audit)
ALTER TABLE skm_activities ADD COLUMN IF NOT EXISTS tingkat VARCHAR(160);
ALTER TABLE skm_activities ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES skm_point_rules(id) ON DELETE SET NULL;
ALTER TABLE skm_activities ADD COLUMN IF NOT EXISTS jam_sosial NUMERIC(5,1); -- dukung dimensi jam (BINUS)
ALTER TABLE skm_activities ADD CONSTRAINT skm_poin_non_negatif CHECK (poin_skm >= 0); -- idempoten via DO-block
```

Seed `skm_point_rules` diisi dari tabel riset bagian 2 (dengan `verifikasi='sekunder'`
untuk baris ⚠). Persona **Kustom** = migrasi 1:1 dari `SKM_POINT_RULES` existing,
sehingga perilaku lama terjaga.

### 3.3 Logika konversi antar persona

- Entri dengan `rule_id` terisi → saat ganti persona, cari rule padanan lewat
  **peta kesetaraan tingkat** (`equivalence_key` per rule, mis. `juara-internasional`,
  `ketua-organisasi`, `peserta-workshop-internal`) lalu tulis ulang `poin_skm`.
  Peta ini dibuat saat seeding (setiap rule diberi kunci semantik yang sama lintas persona).
- Entri manual (`rule_id IS NULL`) → poin dibiarkan, ditandai badge "poin manual —
  tinjau ulang untuk persona X".
- Konversi dijalankan **server-side** (Server Action/route) dalam satu transaksi;
  ini alasan tambahan mengapa mutasi poin harus pindah dari browser (audit P0-2).

### 3.4 Dampak ke kode existing

| Titik | Perubahan |
|---|---|
| `src/lib/skm-points.ts` | `SKM_POINT_RULES`/`rulesFor()`/`suggestPoin()` menjadi pembaca data preset (fetch per persona), bukan konstanta; dipertahankan sebagai fallback offline persona Kustom |
| `src/lib/constants.ts:23` | `SKM_TARGET_POIN` → hanya default persona Kustom; konsumen membaca `preset.target_poin` |
| `src/components/skm/skm-form.tsx` | dropdown tingkat dari rules persona; simpan `tingkat` + `rule_id`; kirim via Server Action |
| `src/components/skm/skm-progress.tsx`, `src/app/(app)/dashboard/page.tsx` | target dari persona; bar kedua jam sosial bila `target_jam_sosial` ada; tampilkan cap kategori bila `cap_kategori` terlampaui |
| `src/app/(app)/skm/page.tsx` | agregasi pindah ke satu util (`skm-aggregate.ts`) agar cap kategori tidak diimplementasi 3× (audit P2-4) |
| RLS | `institution_presets` & `skm_point_rules`: `SELECT` untuk semua authenticated; tulis hanya service role (belum ada admin UI — cukup seed script) |

### 3.5 Insight tambahan (inovasi dari data riset)

- **Predikat, bukan hanya angka** (dari ITS): tampilkan predikat persona
  (mis. "Cukup Baik") di samping persentase — memberi narasi personal branding
  yang lebih kuat daripada angka mentah.
- **Blok wajib vs pilihan** (dari UNAIR): persona dapat mendeklarasikan
  `cap_kategori`/kuota minimum per bidang; progress bar pecah per blok.
- **Jam sosial** (dari BINUS): kolom `jam_sosial` membuat portofolio merekam
  volunteer hours — nilai jual tinggi di LinkedIn (section *Volunteering*), dan
  menjadi konteks tambahan untuk RAG di dokumen 02.
- **Transkrip pendamping** (dari ITS/UNAIR): `portfolioMarkdown()` existing dapat
  dikembangkan menjadi "Transkrip Kegiatan" PDF bergaya TKM/SKEM per persona —
  memakai infrastruktur print A4 yang sudah ada.

---

## 4. Verifikasi saat implementasi

1. Unit test `skm-aggregate` + konversi persona (kasus: rule padanan ada/tidak, cap terlampaui, entri manual).
2. Seed keempat persona → cek form menampilkan rule yang benar dan progres = %target persona.
3. Ganti persona bolak-balik → total poin konsisten, entri manual tidak berubah.
4. Coba tulis `poin_skm` liar langsung via PostgREST → harus ditolak (CHECK + policy).
5. Lengkapi baris ⚠ dengan angka pedoman resmi terbaru; perbarui `verifikasi='resmi'`.
