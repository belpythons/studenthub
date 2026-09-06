-- =====================================================================
--  Student Hub & Internship Logbook — Supabase schema
--  Run this whole file once in the Supabase SQL Editor.
--
--  Source of truth for the four core tables: QOL/README.md (lines 53-107).
--  Every column marked "EXTENSION" is additive and required by a feature
--  described in the module docs but absent from the README schema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nama_lengkap VARCHAR(255) NOT NULL,
    nim VARCHAR(50) NOT NULL,
    prodi VARCHAR(100) DEFAULT 'Teknik Informatika',
    instansi VARCHAR(255) DEFAULT 'Universitas Sains dan Teknologi Bontang',
    tempat_kp VARCHAR(255) DEFAULT 'PT Badak NGL',
    email VARCHAR(255) UNIQUE NOT NULL,
    -- EXTENSION: signature block of Formulir 2 (modul-logbook/02) + recap period (modul-task-report/03)
    pembimbing_nama VARCHAR(255),
    pembimbing_jabatan VARCHAR(255),
    lokasi_ttd VARCHAR(120) DEFAULT 'Bontang',
    periode_mulai DATE,
    periode_selesai DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- EXTENSION: penanda modal panduan awal sudah dilihat (NULL = belum pernah).
-- Di kolom, bukan localStorage: mendaftar di laptop lalu masuk di ponsel tidak
-- boleh menayangkan ulang panduan yang sama.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------
-- 2. skm_activities
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skm_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    kategori VARCHAR(100) NOT NULL,
    penyelenggara VARCHAR(255) NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE,
    poin_skm INT DEFAULT 0,
    deskripsi TEXT,
    skill_tags TEXT[],
    certificate_url TEXT,
    -- EXTENSION: "Credential ID" line of the LinkedIn certification format (modul-skm/03)
    credential_id VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS skm_activities_user_idx ON skm_activities (user_id, tanggal_mulai DESC);

-- ---------------------------------------------------------------------
-- 3. internship_reports
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internship_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    jam_mulai TIME,
    jam_selesai TIME,
    kategori VARCHAR(100) NOT NULL,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    output TEXT,
    kendala TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS internship_reports_user_idx ON internship_reports (user_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS internship_reports_tanggal_idx ON internship_reports (tanggal DESC);

-- ---------------------------------------------------------------------
-- 4. report_comments   (EXTENSION)
--    Comment / feedback thread on a report — mirrors the reference app
--    and backs the "sertakan komentar" export toggle.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES internship_reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    isi TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS report_comments_report_idx ON report_comments (report_id, created_at);

-- ---------------------------------------------------------------------
-- 5. supervisors   (EXTENSION)
--    Multi-supervisor consultation tracking — modul-logbook/03.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supervisors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    jabatan VARCHAR(255),
    departemen VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS supervisors_user_idx ON supervisors (user_id, nama);

-- ---------------------------------------------------------------------
-- 6. logbook_entries
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logbook_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    nomor_urut INT NOT NULL,
    tanggal DATE NOT NULL,
    aktivitas_pekerjaan TEXT NOT NULL,
    pembimbing_nama VARCHAR(255) NOT NULL,
    pembimbing_jabatan VARCHAR(255),
    paraf_status BOOLEAN DEFAULT FALSE,
    -- EXTENSION: supervisor picker + per-supervisor recap (modul-logbook/03).
    -- pembimbing_nama / pembimbing_jabatan stay denormalised so an already
    -- printed Formulir 2 keeps its wording if a supervisor record is edited.
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    -- EXTENSION: "Hasil & Tindak Lanjut" (modul-logbook/03)
    hasil_tindak_lanjut TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS logbook_entries_user_idx ON logbook_entries (user_id, nomor_urut);

-- ---------------------------------------------------------------------
-- 7. Integrity constraints   (EXTENSION — audit P0-3)
--    ADD CONSTRAINT has no IF NOT EXISTS, so guard via pg_constraint.
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'skm_poin_non_negatif') THEN
        ALTER TABLE skm_activities
            ADD CONSTRAINT skm_poin_non_negatif CHECK (poin_skm >= 0);
    END IF;
    IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'logbook_nomor_urut_positif') THEN
        ALTER TABLE logbook_entries
            ADD CONSTRAINT logbook_nomor_urut_positif CHECK (nomor_urut >= 1);
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 8. letterhead_settings   (EXTENSION — dok 03 kop surat fleksibel)
--    Per-user letterhead identity for both printed documents. Absent row
--    = built-in Badak NGL / USTB defaults, so existing output is
--    untouched until the user opts in.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS letterhead_settings (
    user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    -- Kop dokumen rekap magang; 1–4 baris, baris pertama dirender sebagai h1
    kop_baris     TEXT[] NOT NULL DEFAULT ARRAY[
                    'PT BADAK NGL',
                    'Program Magang / Praktik Kerja Lapangan · Bontang, Kalimantan Timur'],
    judul_dokumen VARCHAR(160) NOT NULL DEFAULT 'LAPORAN KEGIATAN MAGANG',
    -- Kop Formulir 2 (identitas kampus)
    kampus_upper  VARCHAR(160) NOT NULL DEFAULT 'UNIVERSITAS SAINS DAN TEKNOLOGI BONTANG',
    prodi_upper   VARCHAR(160) NOT NULL DEFAULT 'PROGRAM STUDI TEKNIK INFORMATIKA',
    formulir_title VARCHAR(160) NOT NULL DEFAULT 'FORM KEHADIRAN DAN AKTIFITAS KERJA PRAKTEK',
    kode_sop      VARCHAR(60)  NOT NULL DEFAULT 'TI-SOP-17/FM-01',
    lokasi_ttd    VARCHAR(120) NOT NULL DEFAULT 'Bontang',
    -- Logo: NULL = /logo.png bawaan; unggahan disimpan pada path berversi
    -- "<user_id>/logo-v<versi>.<ext>" sehingga cache SW/CDN selalu ter-bypass
    logo_url      TEXT,
    logo_versi    INT NOT NULL DEFAULT 0,
    updated_at    TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- EXTENSION (dok 05): warna persona kampus. primer = jangkar gelap (--navy),
-- aksen = warna kerja (--blue / --primary). NULL pada keduanya = biru bawaan.
-- Sengaja tanpa CHECK: PG tak punya ADD CONSTRAINT IF NOT EXISTS (merusak
-- idempotensi berkas ini), dan pelanggarannya di dalam trigger signup akan
-- membatalkan seluruh pendaftaran. Validasi ada di saveLetterhead.
ALTER TABLE letterhead_settings ADD COLUMN IF NOT EXISTS warna_primer VARCHAR(7);
ALTER TABLE letterhead_settings ADD COLUMN IF NOT EXISTS warna_aksen  VARCHAR(7);

-- ---------------------------------------------------------------------
-- 9. Persona kampus SKM   (EXTENSION — dok 01)
--    institution_presets + skm_point_rules memindahkan SKM_POINT_RULES
--    compile-time menjadi data runtime. Seed di bawah; persona 'custom'
--    adalah salinan 1:1 aturan bawaan aplikasi (nol regresi).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS institution_presets (
    id          VARCHAR(40) PRIMARY KEY,           -- 'its-skem' | 'unair-skp' | 'telu-tak' | 'binus-sat' | 'custom'
    nama        VARCHAR(120) NOT NULL,
    deskripsi   TEXT,
    target_poin INT NOT NULL,
    target_jam_sosial INT,                         -- hanya BINUS: 30
    sumber_url  TEXT,
    verifikasi  VARCHAR(20) NOT NULL DEFAULT 'sekunder'   -- 'resmi' | 'sekunder'
);

CREATE TABLE IF NOT EXISTS skm_point_rules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preset_id   VARCHAR(40) NOT NULL REFERENCES institution_presets(id) ON DELETE CASCADE,
    kategori    VARCHAR(100) NOT NULL,
    tingkat     VARCHAR(160) NOT NULL,
    poin        INT NOT NULL CHECK (poin >= 0),
    cap_kategori INT,                              -- batas poin per kategori (belum dipakai seed)
    equivalence_key VARCHAR(80),                   -- kunci semantik lintas persona (dok 01 §3.3)
    urutan      INT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS skm_point_rules_unik
    ON skm_point_rules (preset_id, kategori, tingkat);

ALTER TABLE institution_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE skm_point_rules     ENABLE ROW LEVEL SECURITY;

-- Baca untuk semua pengguna terautentikasi; tulis hanya lewat seed/service role.
DROP POLICY IF EXISTS "presets readable" ON institution_presets;
CREATE POLICY "presets readable" ON institution_presets
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "point rules readable" ON skm_point_rules;
CREATE POLICY "point rules readable" ON skm_point_rules
    FOR SELECT TO authenticated USING (TRUE);

-- Seed persona (angka target diverifikasi ulang 30 Agu 2026; bobot rule kampus
-- adalah estimasi tersekala dari anchor pedoman → verifikasi='sekunder').
INSERT INTO institution_presets (id, nama, deskripsi, target_poin, target_jam_sosial, sumber_url, verifikasi) VALUES
  ('custom',    'Kustom (bawaan aplikasi)', 'Aturan poin bawaan Student Hub — baseline USTB Bontang.', 50, NULL,
   NULL, 'resmi'),
  ('its-skem',  'ITS — SKEM', 'Satuan Kegiatan Ekstrakurikuler Mahasiswa ITS. Minimum yudisium S1 1000 poin (D3 750); predikat Cukup s.d. Sangat Baik. Bobot per kegiatan = estimasi tersekala dari anchor pedoman.', 1000, NULL,
   'https://www.its.ac.id/it/id/mahasiswa/konsep-satuan-kredit-ekstrakulikuler-mahasiswa/', 'sekunder'),
  ('unair-skp', 'UNAIR — SKP', 'Sistem Kredit Prestasi UNAIR. Minimum S1 75 SKP (wajib universitas 35 + bidang pilihan ≥40); direkap dalam TKM, prasyarat wisuda. Bobot per kegiatan mengikuti pedoman fakultas (contoh: FIKKIA).', 75, NULL,
   'https://unair.ac.id/apa-itu-skp-unair-ini-penjelasannya/', 'sekunder'),
  ('telu-tak',  'Telkom University — TAK', 'Transkrip Aktivitas Kemahasiswaan Tel-U (KR 2971/2014). Nilai TAK minimum 60 adalah syarat pendaftaran sidang Tugas Akhir.', 60, NULL,
   'https://telkomuniversity.ac.id/en/transkrip-aktivitas-kemahasiswaan/', 'sekunder'),
  ('binus-sat', 'BINUS — SAT', 'Student Activity Transcript BINUS. Syarat lulus: minimum 120 SAT points + 30 jam kegiatan sosial (community service hours).', 120, 30,
   'https://student.binus.ac.id/sat/', 'sekunder')
ON CONFLICT (id) DO UPDATE SET
  nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, target_poin = EXCLUDED.target_poin,
  target_jam_sosial = EXCLUDED.target_jam_sosial, sumber_url = EXCLUDED.sumber_url,
  verifikasi = EXCLUDED.verifikasi;

-- Rule seed: 18 tingkat × 5 persona; equivalence_key identik lintas persona.
INSERT INTO skm_point_rules (preset_id, kategori, tingkat, poin, equivalence_key, urutan) VALUES
  -- ===== custom — salinan 1:1 SKM_POINT_RULES (src/lib/skm-points.ts) =====
  ('custom', 'Prestasi / Kejuaraan', 'Internasional — Juara 1/2/3', 25, 'juara-internasional', 1),
  ('custom', 'Prestasi / Kejuaraan', 'Nasional — Juara 1/2/3', 20, 'juara-nasional', 2),
  ('custom', 'Prestasi / Kejuaraan', 'Regional / Provinsi — Juara 1/2/3', 15, 'juara-regional', 3),
  ('custom', 'Prestasi / Kejuaraan', 'Internal Kampus — Juara 1/2/3', 10, 'juara-internal', 4),
  ('custom', 'Prestasi / Kejuaraan', 'Finalis / Peserta', 5, 'finalis-peserta', 5),
  ('custom', 'Pengalaman Organisasi', 'Ketua / Wakil Ketua', 12, 'ketua-organisasi', 1),
  ('custom', 'Pengalaman Organisasi', 'Pengurus Inti (Sekretaris / Bendahara)', 10, 'pengurus-inti', 2),
  ('custom', 'Pengalaman Organisasi', 'Ketua Divisi', 8, 'ketua-divisi', 3),
  ('custom', 'Pengalaman Organisasi', 'Anggota Pengurus', 5, 'anggota-pengurus', 4),
  ('custom', 'Sertifikasi / Lisensi', 'Internasional (AWS, Google, Cisco, dsb.)', 15, 'sertifikasi-internasional', 1),
  ('custom', 'Sertifikasi / Lisensi', 'Nasional (BNSP, Dicoding, dsb.)', 10, 'sertifikasi-nasional', 2),
  ('custom', 'Sertifikasi / Lisensi', 'Internal / Lembaga Pelatihan', 5, 'sertifikasi-internal', 3),
  ('custom', 'Kepanitiaan Event', 'Project Officer / Ketua Panitia', 8, 'ketua-panitia', 1),
  ('custom', 'Kepanitiaan Event', 'Koordinator Sie', 5, 'koordinator-sie', 2),
  ('custom', 'Kepanitiaan Event', 'Anggota Panitia', 3, 'anggota-panitia', 3),
  ('custom', 'Workshop / Seminar / Pelatihan', 'Pembicara / Narasumber', 10, 'pembicara', 1),
  ('custom', 'Workshop / Seminar / Pelatihan', 'Peserta — Internasional / Nasional', 4, 'peserta-eksternal', 2),
  ('custom', 'Workshop / Seminar / Pelatihan', 'Peserta — Regional / Internal', 2, 'peserta-internal', 3),
  -- ===== its-skem — skala ribuan (anchor: juara regional 750, juara institut 500, ketua organisasi SK Rektor 500) =====
  ('its-skem', 'Prestasi / Kejuaraan', 'Internasional — Juara/Finalis', 1000, 'juara-internasional', 1),
  ('its-skem', 'Prestasi / Kejuaraan', 'Nasional — Juara 1/2/3', 850, 'juara-nasional', 2),
  ('its-skem', 'Prestasi / Kejuaraan', 'Regional — Juara 1/2/3', 750, 'juara-regional', 3),
  ('its-skem', 'Prestasi / Kejuaraan', 'Tingkat Institut — Juara 1/2/3', 500, 'juara-internal', 4),
  ('its-skem', 'Prestasi / Kejuaraan', 'Finalis / Peserta Kompetisi', 250, 'finalis-peserta', 5),
  ('its-skem', 'Pengalaman Organisasi', 'Ketua Organisasi (SK Rektor)', 500, 'ketua-organisasi', 1),
  ('its-skem', 'Pengalaman Organisasi', 'Pengurus Inti', 400, 'pengurus-inti', 2),
  ('its-skem', 'Pengalaman Organisasi', 'Ketua Departemen / Divisi', 300, 'ketua-divisi', 3),
  ('its-skem', 'Pengalaman Organisasi', 'Staf / Anggota Pengurus', 200, 'anggota-pengurus', 4),
  ('its-skem', 'Sertifikasi / Lisensi', 'Sertifikasi Internasional', 500, 'sertifikasi-internasional', 1),
  ('its-skem', 'Sertifikasi / Lisensi', 'Sertifikasi Nasional', 300, 'sertifikasi-nasional', 2),
  ('its-skem', 'Sertifikasi / Lisensi', 'Sertifikasi Internal / Pelatihan', 150, 'sertifikasi-internal', 3),
  ('its-skem', 'Kepanitiaan Event', 'Ketua Panitia', 300, 'ketua-panitia', 1),
  ('its-skem', 'Kepanitiaan Event', 'Koordinator Sie', 200, 'koordinator-sie', 2),
  ('its-skem', 'Kepanitiaan Event', 'Anggota Panitia', 100, 'anggota-panitia', 3),
  ('its-skem', 'Workshop / Seminar / Pelatihan', 'Pembicara / Narasumber', 300, 'pembicara', 1),
  ('its-skem', 'Workshop / Seminar / Pelatihan', 'Peserta — Internasional / Nasional', 100, 'peserta-eksternal', 2),
  ('its-skem', 'Workshop / Seminar / Pelatihan', 'Peserta — Regional / Internal', 50, 'peserta-internal', 3),
  -- ===== unair-skp — skala puluhan-ratusan (pedoman fakultas, contoh FIKKIA) =====
  ('unair-skp', 'Prestasi / Kejuaraan', 'Internasional — Juara 1/2/3', 100, 'juara-internasional', 1),
  ('unair-skp', 'Prestasi / Kejuaraan', 'Nasional — Juara 1/2/3', 75, 'juara-nasional', 2),
  ('unair-skp', 'Prestasi / Kejuaraan', 'Regional / Provinsi — Juara 1/2/3', 50, 'juara-regional', 3),
  ('unair-skp', 'Prestasi / Kejuaraan', 'Internal Kampus — Juara 1/2/3', 30, 'juara-internal', 4),
  ('unair-skp', 'Prestasi / Kejuaraan', 'Finalis / Peserta', 15, 'finalis-peserta', 5),
  ('unair-skp', 'Pengalaman Organisasi', 'Ketua / Wakil Ketua', 40, 'ketua-organisasi', 1),
  ('unair-skp', 'Pengalaman Organisasi', 'Pengurus Inti', 30, 'pengurus-inti', 2),
  ('unair-skp', 'Pengalaman Organisasi', 'Ketua Divisi / Departemen', 25, 'ketua-divisi', 3),
  ('unair-skp', 'Pengalaman Organisasi', 'Anggota Pengurus', 15, 'anggota-pengurus', 4),
  ('unair-skp', 'Sertifikasi / Lisensi', 'Sertifikasi Internasional', 50, 'sertifikasi-internasional', 1),
  ('unair-skp', 'Sertifikasi / Lisensi', 'Sertifikasi Nasional', 30, 'sertifikasi-nasional', 2),
  ('unair-skp', 'Sertifikasi / Lisensi', 'Sertifikasi Internal / Pelatihan', 15, 'sertifikasi-internal', 3),
  ('unair-skp', 'Kepanitiaan Event', 'Ketua Panitia', 25, 'ketua-panitia', 1),
  ('unair-skp', 'Kepanitiaan Event', 'Koordinator Sie', 15, 'koordinator-sie', 2),
  ('unair-skp', 'Kepanitiaan Event', 'Anggota Panitia', 10, 'anggota-panitia', 3),
  ('unair-skp', 'Workshop / Seminar / Pelatihan', 'Pembicara / Narasumber', 30, 'pembicara', 1),
  ('unair-skp', 'Workshop / Seminar / Pelatihan', 'Peserta — Internasional / Nasional', 10, 'peserta-eksternal', 2),
  ('unair-skp', 'Workshop / Seminar / Pelatihan', 'Peserta — Regional / Internal', 5, 'peserta-internal', 3),
  -- ===== telu-tak — skala puluhan, gerbang sidang TA 60 =====
  ('telu-tak', 'Prestasi / Kejuaraan', 'Internasional — Juara 1/2/3', 30, 'juara-internasional', 1),
  ('telu-tak', 'Prestasi / Kejuaraan', 'Nasional — Juara 1/2/3', 20, 'juara-nasional', 2),
  ('telu-tak', 'Prestasi / Kejuaraan', 'Regional / Provinsi — Juara 1/2/3', 15, 'juara-regional', 3),
  ('telu-tak', 'Prestasi / Kejuaraan', 'Internal Kampus — Juara 1/2/3', 10, 'juara-internal', 4),
  ('telu-tak', 'Prestasi / Kejuaraan', 'Finalis / Peserta', 5, 'finalis-peserta', 5),
  ('telu-tak', 'Pengalaman Organisasi', 'Ketua / Wakil Ketua', 15, 'ketua-organisasi', 1),
  ('telu-tak', 'Pengalaman Organisasi', 'Pengurus Inti', 12, 'pengurus-inti', 2),
  ('telu-tak', 'Pengalaman Organisasi', 'Ketua Divisi', 10, 'ketua-divisi', 3),
  ('telu-tak', 'Pengalaman Organisasi', 'Anggota Pengurus', 6, 'anggota-pengurus', 4),
  ('telu-tak', 'Sertifikasi / Lisensi', 'Sertifikasi Internasional', 15, 'sertifikasi-internasional', 1),
  ('telu-tak', 'Sertifikasi / Lisensi', 'Sertifikasi Nasional', 10, 'sertifikasi-nasional', 2),
  ('telu-tak', 'Sertifikasi / Lisensi', 'Sertifikasi Internal / Pelatihan', 5, 'sertifikasi-internal', 3),
  ('telu-tak', 'Kepanitiaan Event', 'Ketua Panitia', 10, 'ketua-panitia', 1),
  ('telu-tak', 'Kepanitiaan Event', 'Koordinator Sie', 7, 'koordinator-sie', 2),
  ('telu-tak', 'Kepanitiaan Event', 'Anggota Panitia', 4, 'anggota-panitia', 3),
  ('telu-tak', 'Workshop / Seminar / Pelatihan', 'Pembicara / Narasumber', 10, 'pembicara', 1),
  ('telu-tak', 'Workshop / Seminar / Pelatihan', 'Peserta — Internasional / Nasional', 3, 'peserta-eksternal', 2),
  ('telu-tak', 'Workshop / Seminar / Pelatihan', 'Peserta — Regional / Internal', 2, 'peserta-internal', 3),
  -- ===== binus-sat — 120 poin + 30 jam sosial (jam dicatat di skm_activities.jam_sosial) =====
  ('binus-sat', 'Prestasi / Kejuaraan', 'Internasional — Juara 1/2/3', 50, 'juara-internasional', 1),
  ('binus-sat', 'Prestasi / Kejuaraan', 'Nasional — Juara 1/2/3', 40, 'juara-nasional', 2),
  ('binus-sat', 'Prestasi / Kejuaraan', 'Regional / Provinsi — Juara 1/2/3', 30, 'juara-regional', 3),
  ('binus-sat', 'Prestasi / Kejuaraan', 'Internal Kampus — Juara 1/2/3', 20, 'juara-internal', 4),
  ('binus-sat', 'Prestasi / Kejuaraan', 'Finalis / Peserta', 10, 'finalis-peserta', 5),
  ('binus-sat', 'Pengalaman Organisasi', 'Ketua / Wakil Ketua', 30, 'ketua-organisasi', 1),
  ('binus-sat', 'Pengalaman Organisasi', 'Pengurus Inti', 25, 'pengurus-inti', 2),
  ('binus-sat', 'Pengalaman Organisasi', 'Ketua Divisi', 20, 'ketua-divisi', 3),
  ('binus-sat', 'Pengalaman Organisasi', 'Anggota Pengurus', 10, 'anggota-pengurus', 4),
  ('binus-sat', 'Sertifikasi / Lisensi', 'Sertifikasi Internasional', 30, 'sertifikasi-internasional', 1),
  ('binus-sat', 'Sertifikasi / Lisensi', 'Sertifikasi Nasional', 20, 'sertifikasi-nasional', 2),
  ('binus-sat', 'Sertifikasi / Lisensi', 'Sertifikasi Internal / Pelatihan', 10, 'sertifikasi-internal', 3),
  ('binus-sat', 'Kepanitiaan Event', 'Ketua Panitia', 20, 'ketua-panitia', 1),
  ('binus-sat', 'Kepanitiaan Event', 'Koordinator Sie', 15, 'koordinator-sie', 2),
  ('binus-sat', 'Kepanitiaan Event', 'Anggota Panitia', 10, 'anggota-panitia', 3),
  ('binus-sat', 'Workshop / Seminar / Pelatihan', 'Pembicara / Narasumber', 20, 'pembicara', 1),
  ('binus-sat', 'Workshop / Seminar / Pelatihan', 'Peserta — Internasional / Nasional', 8, 'peserta-eksternal', 2),
  ('binus-sat', 'Workshop / Seminar / Pelatihan', 'Peserta — Regional / Internal', 4, 'peserta-internal', 3)
ON CONFLICT (preset_id, kategori, tingkat) DO UPDATE SET
  poin = EXCLUDED.poin, equivalence_key = EXCLUDED.equivalence_key, urutan = EXCLUDED.urutan;

-- Pilihan persona per pengguna + provenance poin (audit P1-4)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skm_preset_id VARCHAR(40)
    REFERENCES institution_presets(id) DEFAULT 'custom';
ALTER TABLE skm_activities ADD COLUMN IF NOT EXISTS tingkat VARCHAR(160);
ALTER TABLE skm_activities ADD COLUMN IF NOT EXISTS rule_id UUID
    REFERENCES skm_point_rules(id) ON DELETE SET NULL;
ALTER TABLE skm_activities ADD COLUMN IF NOT EXISTS jam_sosial NUMERIC(5,1);

-- Konversi antar persona: satu transaksi server-side (dok 01 §3.3).
-- SECURITY INVOKER — RLS "own rows" tetap berlaku untuk setiap UPDATE.
CREATE OR REPLACE FUNCTION convert_skm_persona(p_preset VARCHAR)
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user UUID := auth.uid();
    n_converted INT := 0;
    n_manual INT := 0;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Tidak terautentikasi';
    END IF;
    IF NOT EXISTS (SELECT FROM institution_presets WHERE id = p_preset) THEN
        RAISE EXCEPTION 'Persona tidak dikenal: %', p_preset;
    END IF;

    UPDATE profiles SET skm_preset_id = p_preset WHERE id = v_user;

    -- Entri ber-provenance: tulis ulang poin lewat peta kesetaraan tingkat.
    UPDATE skm_activities a
       SET poin_skm = nr.poin, rule_id = nr.id, tingkat = nr.tingkat
      FROM skm_point_rules orule
      JOIN skm_point_rules nr
        ON nr.preset_id = p_preset
       AND nr.equivalence_key = orule.equivalence_key
     WHERE a.user_id = v_user
       AND a.rule_id = orule.id
       AND orule.equivalence_key IS NOT NULL;
    GET DIAGNOSTICS n_converted = ROW_COUNT;

    -- Rule tanpa padanan di persona baru → jadikan manual (poin dibiarkan).
    UPDATE skm_activities a
       SET rule_id = NULL
     WHERE a.user_id = v_user
       AND a.rule_id IS NOT NULL
       AND NOT EXISTS (
           SELECT FROM skm_point_rules r
            WHERE r.id = a.rule_id AND r.preset_id = p_preset
       );
    GET DIAGNOSTICS n_manual = ROW_COUNT;

    RETURN json_build_object('converted', n_converted, 'tanpa_padanan', n_manual);
END;
$$;

-- ---------------------------------------------------------------------
-- 10. RAG LinkedIn branding   (EXTENSION — dok 02)
--     branding_chunks hanya diakses lewat RPC SECURITY DEFINER — RLS
--     deny-all (enable tanpa policy). linkedin_drafts = cache + riwayat.
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS branding_chunks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sumber     VARCHAR(160) NOT NULL,        -- nama file kb + heading
    bahasa     VARCHAR(5) NOT NULL DEFAULT 'id',
    seksi      VARCHAR(40),                  -- experience|certification|award|volunteering|umum
    konten     TEXT NOT NULL,
    embedding  vector(768) NOT NULL
);
CREATE INDEX IF NOT EXISTS branding_chunks_embedding_idx
    ON branding_chunks USING hnsw (embedding vector_cosine_ops);

ALTER TABLE branding_chunks ENABLE ROW LEVEL SECURITY;   -- deny-all by design

CREATE OR REPLACE FUNCTION match_branding_chunks(
    query_embedding vector(768),
    match_count INT DEFAULT 4,
    filter_seksi VARCHAR DEFAULT NULL,
    filter_bahasa VARCHAR DEFAULT NULL
)
RETURNS TABLE (id UUID, konten TEXT, sumber VARCHAR, seksi VARCHAR, similarity FLOAT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT bc.id, bc.konten, bc.sumber, bc.seksi,
           1 - (bc.embedding <=> query_embedding) AS similarity
      FROM branding_chunks bc
     WHERE (filter_seksi IS NULL OR bc.seksi = filter_seksi OR bc.seksi = 'umum')
       AND (filter_bahasa IS NULL OR bc.bahasa = filter_bahasa)
     ORDER BY bc.embedding <=> query_embedding
     LIMIT LEAST(GREATEST(match_count, 1), 8)
$$;

-- SECURITY DEFINER menembus RLS deny-all di atas, jadi hak panggilnya harus
-- dicabut juga — kalau tidak, siapa pun yang login bisa mengeruk korpus dari
-- konsol peramban dengan vektor buatan sendiri. Edge Function memanggilnya
-- lewat klien service role. Pola yang sama dipakai bump_rate_limit.
REVOKE ALL ON FUNCTION match_branding_chunks(vector, INT, VARCHAR, VARCHAR)
    FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS linkedin_drafts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES skm_activities(id) ON DELETE CASCADE,
    seksi       VARCHAR(40) NOT NULL,
    input_hash  VARCHAR(64) NOT NULL,        -- sha256(input) → cache hit tanpa panggil model
    draft       TEXT NOT NULL,
    model       VARCHAR(60) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);
CREATE INDEX IF NOT EXISTS linkedin_drafts_lookup
    ON linkedin_drafts (user_id, activity_id, seksi, input_hash, created_at DESC);

ALTER TABLE linkedin_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "linkedin drafts own rows" ON linkedin_drafts;
CREATE POLICY "linkedin drafts own rows" ON linkedin_drafts
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 11. Logbook proyek multi-persona   (EXTENSION — dok 04 §3.3)
--     Proyek → konsultasi (logbook_entries) → saran (pola ADR) →
--     keputusan → Briefing Pack. Semua aditif; Formulir 2 tidak berubah.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    jenis VARCHAR(60) NOT NULL DEFAULT 'Lainnya',   -- Jurnal | Tugas Akhir | Lomba | KP | Lainnya
    deskripsi TEXT,
    fase VARCHAR(60),
    target_tanggal DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif',    -- aktif | selesai | arsip
    pertanyaan_baru TEXT,                           -- bagian R (Recommendation) Briefing Pack
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects (user_id, status, created_at DESC);

-- Persona = perluasan supervisors (tabel existing dipakai ulang)
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS peran VARCHAR(60);            -- Pembimbing Utama | Pendamping | Penguji | Mentor | Rekan
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS bidang_keahlian TEXT[];
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS prioritas INT NOT NULL DEFAULT 100;  -- kecil = lebih otoritatif (tie-break)
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS catatan_gaya TEXT;

CREATE TABLE IF NOT EXISTS project_advisors (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES supervisors(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, supervisor_id)
);

-- Jembatan kompatibilitas: sesi konsultasi = entri logbook + konteks proyek
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES projects(id) ON DELETE SET NULL;     -- nullable: entri lama tetap sah
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;   -- audit P1-6

CREATE TABLE IF NOT EXISTS advice (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES logbook_entries(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    penyaran_nama VARCHAR(255) NOT NULL,            -- denormalisasi (pola pembimbing_nama)
    area VARCHAR(120) NOT NULL,
    isi TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'diusulkan', -- diusulkan | diadopsi | ditolak | di-supersede
    alasan_status TEXT,
    superseded_by UUID REFERENCES advice(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);
CREATE INDEX IF NOT EXISTS advice_project_idx ON advice (project_id, area, status);

CREATE TABLE IF NOT EXISTS advice_relations (
    a_id UUID NOT NULL REFERENCES advice(id) ON DELETE CASCADE,   -- saran baru
    b_id UUID NOT NULL REFERENCES advice(id) ON DELETE CASCADE,   -- saran lama
    jenis VARCHAR(20) NOT NULL,                     -- 'bentrok' | 'menguatkan'
    catatan TEXT,
    resolved_by UUID REFERENCES advice(id) ON DELETE SET NULL,    -- keputusan penutup konflik
    PRIMARY KEY (a_id, b_id),
    CHECK (a_id <> b_id)
);

ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE advice           ENABLE ROW LEVEL SECURITY;
ALTER TABLE advice_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects own rows" ON projects;
CREATE POLICY "projects own rows" ON projects
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "project advisors own" ON project_advisors;
CREATE POLICY "project advisors own" ON project_advisors
    FOR ALL TO authenticated
    USING (EXISTS (SELECT FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT FROM projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "advice own rows" ON advice;
CREATE POLICY "advice own rows" ON advice
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "advice relations own" ON advice_relations;
CREATE POLICY "advice relations own" ON advice_relations
    FOR ALL TO authenticated
    USING (EXISTS (SELECT FROM advice a WHERE a.id = a_id AND a.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT FROM advice a WHERE a.id = a_id AND a.user_id = auth.uid()));

-- Imutabilitas ala ADR (server-side, dok 04 §3.3): isi terkunci begitu
-- status meninggalkan 'diusulkan'; transisi status dibatasi.
CREATE OR REPLACE FUNCTION advice_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status <> 'diusulkan' AND NEW.isi <> OLD.isi THEN
        RAISE EXCEPTION 'Saran yang sudah diputuskan tidak dapat diedit — buat saran baru sebagai pengganti (pola ADR).';
    END IF;
    IF NEW.status <> OLD.status THEN
        IF NOT (
            (OLD.status = 'diusulkan' AND NEW.status IN ('diadopsi', 'ditolak', 'di-supersede'))
            OR (OLD.status = 'diadopsi' AND NEW.status = 'di-supersede')
        ) THEN
            RAISE EXCEPTION 'Transisi status saran % -> % tidak sah.', OLD.status, NEW.status;
        END IF;
        IF NEW.status = 'di-supersede' AND NEW.superseded_by IS NULL THEN
            RAISE EXCEPTION 'Status di-supersede wajib menautkan saran penggantinya.';
        END IF;
        IF NEW.status <> 'diusulkan' AND COALESCE(NEW.alasan_status, '') = '' THEN
            RAISE EXCEPTION 'Perubahan status saran wajib disertai alasan.';
        END IF;
        NEW.decided_at := COALESCE(NEW.decided_at, TIMEZONE('utc', NOW()));
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS advice_immutable ON advice;
CREATE TRIGGER advice_immutable
    BEFORE UPDATE ON advice
    FOR EACH ROW EXECUTE FUNCTION advice_guard();

-- updated_at otomatis (projects + logbook_entries)
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS projects_touch ON projects;
CREATE TRIGGER projects_touch BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS logbook_touch ON logbook_entries;
CREATE TRIGGER logbook_touch BEFORE UPDATE ON logbook_entries
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Mutasi multi-baris = satu transaksi RPC (SECURITY INVOKER, RLS berlaku).
CREATE OR REPLACE FUNCTION set_project_advisors(p_project UUID, p_supervisors UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF NOT EXISTS (SELECT FROM projects WHERE id = p_project AND user_id = auth.uid()) THEN
        RAISE EXCEPTION 'Proyek tidak ditemukan.';
    END IF;
    DELETE FROM project_advisors WHERE project_id = p_project;
    INSERT INTO project_advisors (project_id, supervisor_id)
    SELECT p_project, s.id FROM supervisors s
     WHERE s.id = ANY(p_supervisors) AND s.user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION create_advice(
    p_project UUID,
    p_area VARCHAR,
    p_isi TEXT,
    p_supervisor UUID DEFAULT NULL,
    p_entry UUID DEFAULT NULL,
    p_penyaran VARCHAR DEFAULT NULL,
    p_relasi_jenis VARCHAR DEFAULT NULL,           -- 'bentrok' | 'menguatkan'
    p_relasi_dengan UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_nama VARCHAR;
    v_id UUID;
BEGIN
    IF NOT EXISTS (SELECT FROM projects WHERE id = p_project AND user_id = v_user) THEN
        RAISE EXCEPTION 'Proyek tidak ditemukan.';
    END IF;
    IF p_relasi_jenis IS NOT NULL AND p_relasi_jenis NOT IN ('bentrok', 'menguatkan') THEN
        RAISE EXCEPTION 'Jenis relasi tidak dikenal: %', p_relasi_jenis;
    END IF;

    SELECT nama INTO v_nama FROM supervisors WHERE id = p_supervisor AND user_id = v_user;
    v_nama := COALESCE(v_nama, NULLIF(TRIM(p_penyaran), ''), 'Tidak disebutkan');

    INSERT INTO advice (user_id, project_id, entry_id, supervisor_id, penyaran_nama, area, isi)
    VALUES (v_user, p_project, p_entry, p_supervisor, v_nama, TRIM(p_area), TRIM(p_isi))
    RETURNING id INTO v_id;

    IF p_relasi_jenis IS NOT NULL AND p_relasi_dengan IS NOT NULL THEN
        INSERT INTO advice_relations (a_id, b_id, jenis)
        VALUES (v_id, p_relasi_dengan, p_relasi_jenis);
    END IF;

    RETURN v_id;
END;
$$;

-- Putuskan konflik: adopsi pemenang, supersede yang kalah, tutup relasinya.
CREATE OR REPLACE FUNCTION decide_conflict(p_winner UUID, p_losers UUID[], p_alasan TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    IF COALESCE(TRIM(p_alasan), '') = '' THEN
        RAISE EXCEPTION 'Alasan keputusan wajib diisi.';
    END IF;

    UPDATE advice SET status = 'diadopsi', alasan_status = p_alasan
     WHERE id = p_winner AND user_id = auth.uid() AND status = 'diusulkan';

    UPDATE advice SET status = 'di-supersede', superseded_by = p_winner, alasan_status = p_alasan
     WHERE id = ANY(p_losers) AND user_id = auth.uid() AND status IN ('diusulkan', 'diadopsi');

    UPDATE advice_relations SET resolved_by = p_winner
     WHERE jenis = 'bentrok' AND resolved_by IS NULL
       AND ( (a_id = p_winner AND b_id = ANY(p_losers))
          OR (b_id = p_winner AND a_id = ANY(p_losers))
          OR (a_id = ANY(p_losers) AND b_id = ANY(p_losers)) );
END;
$$;

-- Sintesis: keputusan baru menggantikan kedua saran yang bentrok.
CREATE OR REPLACE FUNCTION decide_synthesis(p_a UUID, p_b UUID, p_isi TEXT, p_alasan TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_project UUID;
    v_area VARCHAR;
    v_id UUID;
BEGIN
    IF COALESCE(TRIM(p_alasan), '') = '' THEN
        RAISE EXCEPTION 'Alasan keputusan wajib diisi.';
    END IF;
    SELECT project_id, area INTO v_project, v_area
      FROM advice WHERE id = p_a AND user_id = v_user;
    IF v_project IS NULL THEN
        RAISE EXCEPTION 'Saran tidak ditemukan.';
    END IF;

    INSERT INTO advice (user_id, project_id, penyaran_nama, area, isi, status, alasan_status, decided_at)
    VALUES (v_user, v_project, 'Sintesis (keputusan sendiri)', v_area, TRIM(p_isi),
            'diadopsi', p_alasan, TIMEZONE('utc', NOW()))
    RETURNING id INTO v_id;

    UPDATE advice SET status = 'di-supersede', superseded_by = v_id, alasan_status = p_alasan
     WHERE id IN (p_a, p_b) AND user_id = v_user AND status IN ('diusulkan', 'diadopsi');

    UPDATE advice_relations SET resolved_by = v_id
     WHERE jenis = 'bentrok' AND resolved_by IS NULL
       AND a_id IN (p_a, p_b) AND b_id IN (p_a, p_b);

    RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 12. Pengerasan rilis   (EXTENSION — audit P0-4, P0-5, P2-3)
--     Mutasi multi-baris logbook menjadi transaksi RPC tunggal.
-- ---------------------------------------------------------------------

-- P0-4 + P0-2: supervisor baru (opsional) + entri dalam SATU transaksi.
-- p_id NULL = create; terisi = update entri milik sendiri.
CREATE OR REPLACE FUNCTION save_logbook_entry(
    p_nomor INT,
    p_tanggal DATE,
    p_aktivitas TEXT,
    p_id UUID DEFAULT NULL,
    p_supervisor UUID DEFAULT NULL,
    p_baru_nama VARCHAR DEFAULT NULL,
    p_baru_jabatan VARCHAR DEFAULT NULL,
    p_baru_departemen VARCHAR DEFAULT NULL,
    p_hasil TEXT DEFAULT NULL,
    p_paraf BOOLEAN DEFAULT FALSE,
    p_project UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user UUID := auth.uid();
    v_sup supervisors%ROWTYPE;
    v_id UUID;
BEGIN
    IF p_nomor IS NULL OR p_nomor < 1 THEN
        RAISE EXCEPTION 'Nomor urut harus 1 atau lebih.';
    END IF;
    IF COALESCE(TRIM(p_aktivitas), '') = '' THEN
        RAISE EXCEPTION 'Aktivitas wajib diisi.';
    END IF;

    IF p_supervisor IS NOT NULL THEN
        SELECT * INTO v_sup FROM supervisors WHERE id = p_supervisor AND user_id = v_user;
        IF NOT FOUND THEN RAISE EXCEPTION 'Pembimbing tidak ditemukan.'; END IF;
    ELSIF COALESCE(TRIM(p_baru_nama), '') <> '' THEN
        INSERT INTO supervisors (user_id, nama, jabatan, departemen)
        VALUES (v_user, TRIM(p_baru_nama), NULLIF(TRIM(p_baru_jabatan), ''), NULLIF(TRIM(p_baru_departemen), ''))
        RETURNING * INTO v_sup;
    ELSE
        RAISE EXCEPTION 'Pilih pembimbing atau isi nama pembimbing baru.';
    END IF;

    IF p_project IS NOT NULL
       AND NOT EXISTS (SELECT FROM projects WHERE id = p_project AND user_id = v_user) THEN
        RAISE EXCEPTION 'Proyek tidak ditemukan.';
    END IF;

    IF p_id IS NULL THEN
        INSERT INTO logbook_entries
            (user_id, nomor_urut, tanggal, aktivitas_pekerjaan,
             pembimbing_nama, pembimbing_jabatan, supervisor_id,
             hasil_tindak_lanjut, paraf_status, project_id)
        VALUES
            (v_user, p_nomor, p_tanggal, TRIM(p_aktivitas),
             v_sup.nama, v_sup.jabatan, v_sup.id,
             NULLIF(TRIM(p_hasil), ''), COALESCE(p_paraf, FALSE), p_project)
        RETURNING id INTO v_id;
    ELSE
        UPDATE logbook_entries SET
            nomor_urut = p_nomor,
            tanggal = p_tanggal,
            aktivitas_pekerjaan = TRIM(p_aktivitas),
            pembimbing_nama = v_sup.nama,
            pembimbing_jabatan = v_sup.jabatan,
            supervisor_id = v_sup.id,
            hasil_tindak_lanjut = NULLIF(TRIM(p_hasil), ''),
            paraf_status = COALESCE(p_paraf, FALSE),
            project_id = p_project
        WHERE id = p_id AND user_id = v_user
        RETURNING id INTO v_id;
        IF v_id IS NULL THEN RAISE EXCEPTION 'Entri tidak ditemukan.'; END IF;
    END IF;

    RETURN v_id;
END;
$$;

-- P0-5: renumber atomik — satu UPDATE ber-window, tanpa offset 10000.
CREATE OR REPLACE FUNCTION renumber_logbook()
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    n INT;
BEGIN
    WITH ordered AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY tanggal, nomor_urut, created_at) AS rn
          FROM logbook_entries
         WHERE user_id = auth.uid()
    )
    UPDATE logbook_entries e
       SET nomor_urut = o.rn
      FROM ordered o
     WHERE e.id = o.id AND e.nomor_urut <> o.rn;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

-- P2-3: rename pembimbing + sinkronisasi salinan denormalisasi, satu transaksi.
CREATE OR REPLACE FUNCTION update_supervisor_sync(
    p_id UUID,
    p_nama VARCHAR,
    p_jabatan VARCHAR DEFAULT NULL,
    p_departemen VARCHAR DEFAULT NULL,
    p_peran VARCHAR DEFAULT NULL,
    p_prioritas INT DEFAULT 100,
    p_bidang TEXT[] DEFAULT NULL,
    p_catatan TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_user UUID := auth.uid();
BEGIN
    IF COALESCE(TRIM(p_nama), '') = '' THEN
        RAISE EXCEPTION 'Nama pembimbing wajib diisi.';
    END IF;

    UPDATE supervisors SET
        nama = TRIM(p_nama),
        jabatan = NULLIF(TRIM(p_jabatan), ''),
        departemen = NULLIF(TRIM(p_departemen), ''),
        peran = NULLIF(TRIM(p_peran), ''),
        prioritas = GREATEST(1, LEAST(999, COALESCE(p_prioritas, 100))),
        bidang_keahlian = p_bidang,
        catatan_gaya = NULLIF(TRIM(p_catatan), '')
    WHERE id = p_id AND user_id = v_user;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pembimbing tidak ditemukan.'; END IF;

    UPDATE logbook_entries
       SET pembimbing_nama = TRIM(p_nama),
           pembimbing_jabatan = NULLIF(TRIM(p_jabatan), '')
     WHERE supervisor_id = p_id AND user_id = v_user;
END;
$$;

-- =====================================================================
--  Status pendaftaran sebuah email, dibaca SEBELUM signUp
--
--  Supabase sengaja tidak memberi galat pada signUp untuk email yang sudah
--  terdaftar (anti user-enumeration): ia mengembalikan pengguna palsu tanpa
--  error, sehingga pendaftaran kedua terlihat berhasil dan orangnya menunggu
--  email yang tidak pernah datang.
--
--  Tiga keadaan, bukan dua. on_auth_user_created menyisipkan baris profiles
--  untuk pengguna yang belum verifikasi juga, jadi tabel profiles saja tidak
--  bisa membedakannya — auth.users.email_confirmed_at yang bisa.
--
--  Konsekuensi yang diterima sadar: fungsi ini MEMANG celah enumerasi email.
--  Ditukar dengan alur pendaftaran yang tidak berbohong; aplikasi ini internal
--  kampus, bukan layanan publik.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.status_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public, auth
AS $$
    SELECT COALESCE(
        (SELECT CASE WHEN u.email_confirmed_at IS NULL
                     THEN 'belum_verifikasi' ELSE 'terdaftar' END
           FROM auth.users u
          WHERE LOWER(u.email) = LOWER(TRIM(p_email))
          LIMIT 1),
        'baru');
$$;

-- Berbeda dari match_branding_chunks/bump_rate_limit yang dicabut dari anon:
-- yang ini justru harus bisa dipanggil sebelum ada akun.
REVOKE ALL ON FUNCTION public.status_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.status_email(TEXT) TO anon, authenticated;

-- =====================================================================
--  Auto-create a profile row when a user signs up
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nama_lengkap, nim, email, instansi, tempat_kp)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'nama_lengkap', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data ->> 'nim', '-'),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data ->> 'instansi', 'Universitas Sains dan Teknologi Bontang'),
        COALESCE(NEW.raw_user_meta_data ->> 'tempat_kp', 'PT Badak NGL')
    )
    ON CONFLICT (id) DO NOTHING;

    -- EXTENSION (dok 05): persona kampus dari metadata pendaftaran, sehingga
    -- warna sudah hidup begitu pengguna login pertama kali — tanpa kode klien.
    -- Semua nilai ekstraksi ->> polos tanpa cast: fungsi ini TIDAK BOLEH raise,
    -- karena galat apa pun di sini membatalkan seluruh signup.
    IF NULLIF(NEW.raw_user_meta_data ->> 'logo_url', '') IS NOT NULL THEN
        INSERT INTO public.letterhead_settings (
            user_id, logo_url, warna_primer, warna_aksen, kampus_upper
        )
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data ->> 'logo_url',
            NULLIF(NEW.raw_user_meta_data ->> 'warna_primer', ''),
            NULLIF(NEW.raw_user_meta_data ->> 'warna_aksen', ''),
            COALESCE(
                NULLIF(UPPER(NEW.raw_user_meta_data ->> 'instansi'), ''),
                'UNIVERSITAS SAINS DAN TEKNOLOGI BONTANG')
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
--  Row Level Security
--  profiles / internship_reports / report_comments are readable by every
--  authenticated user (the reference app shows a shared activity feed);
--  writes are always restricted to the owner.
-- =====================================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE skm_activities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE logbook_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE letterhead_settings ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "profiles readable by authenticated" ON profiles;
CREATE POLICY "profiles readable by authenticated" ON profiles
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "profiles insert own" ON profiles;
CREATE POLICY "profiles insert own" ON profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles update own" ON profiles;
CREATE POLICY "profiles update own" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- skm_activities — private portfolio
DROP POLICY IF EXISTS "skm own rows" ON skm_activities;
CREATE POLICY "skm own rows" ON skm_activities
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- internship_reports — shared feed, owner-only writes
DROP POLICY IF EXISTS "reports readable by authenticated" ON internship_reports;
CREATE POLICY "reports readable by authenticated" ON internship_reports
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "reports insert own" ON internship_reports;
CREATE POLICY "reports insert own" ON internship_reports
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reports update own" ON internship_reports;
CREATE POLICY "reports update own" ON internship_reports
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reports delete own" ON internship_reports;
CREATE POLICY "reports delete own" ON internship_reports
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- report_comments — anyone authenticated may read and comment, delete own only
DROP POLICY IF EXISTS "comments readable by authenticated" ON report_comments;
CREATE POLICY "comments readable by authenticated" ON report_comments
    FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS "comments insert own" ON report_comments;
CREATE POLICY "comments insert own" ON report_comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments delete own" ON report_comments;
CREATE POLICY "comments delete own" ON report_comments
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- supervisors / logbook_entries — private
DROP POLICY IF EXISTS "supervisors own rows" ON supervisors;
CREATE POLICY "supervisors own rows" ON supervisors
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "logbook own rows" ON logbook_entries;
CREATE POLICY "logbook own rows" ON logbook_entries
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- letterhead_settings — private
DROP POLICY IF EXISTS "letterhead own rows" ON letterhead_settings;
CREATE POLICY "letterhead own rows" ON letterhead_settings
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =====================================================================
--  Storage buckets
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('skm-certificates', 'skm-certificates', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Public read, owner-scoped writes. Uploads are stored under "<user_id>/<file>".
DROP POLICY IF EXISTS "qol public read" ON storage.objects;
CREATE POLICY "qol public read" ON storage.objects
    FOR SELECT USING (bucket_id IN ('skm-certificates', 'report-photos', 'org-logos'));

DROP POLICY IF EXISTS "qol owner upload" ON storage.objects;
CREATE POLICY "qol owner upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id IN ('skm-certificates', 'report-photos', 'org-logos')
        AND (STORAGE.FOLDERNAME(name))[1] = auth.uid()::TEXT
    );

DROP POLICY IF EXISTS "qol owner delete" ON storage.objects;
CREATE POLICY "qol owner delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id IN ('skm-certificates', 'report-photos', 'org-logos')
        AND (STORAGE.FOLDERNAME(name))[1] = auth.uid()::TEXT
    );


-- =====================================================================
-- Migrasi SPA: penegakan yang pindah dari kode aplikasi ke database
-- ---------------------------------------------------------------------
-- Setelah frontend menjadi SPA, server action dan API route yang dulu
-- menegakkan aturan-aturan di bawah ini berjalan di peramban. Aturan yang
-- benar-benar penting karena itu dipindahkan ke sini, tempat yang tidak bisa
-- dilewati dari konsol peramban.
-- =====================================================================

-- --------------------------------------------------------------- rate limit
-- Menggantikan penghitung Map di memori pada POST /api/onboarding/logo. Isolate
-- Edge Function didaur ulang kapan saja dan berjalan di banyak region, jadi
-- penghitung dalam proses mereset dirinya persis ketika paling dibutuhkan.
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key          TEXT PRIMARY KEY,
    hits         INT NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Tanpa policy = tertutup rapat. Hanya service role (Edge Function) yang masuk,
-- dan itu pun lewat RPC di bawah.

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
    p_key TEXT,
    p_window_minutes INT,
    p_max INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hits INT;
BEGIN
    INSERT INTO public.rate_limits AS r (key, hits, window_start)
    VALUES (p_key, 1, NOW())
    ON CONFLICT (key) DO UPDATE
        SET hits = CASE
                WHEN r.window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL
                THEN 1
                ELSE r.hits + 1
            END,
            window_start = CASE
                WHEN r.window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL
                THEN NOW()
                ELSE r.window_start
            END
    RETURNING r.hits INTO v_hits;

    RETURN v_hits > p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------- identitas terkunci
-- NIM dan nama kampus ditetapkan saat pendaftaran dan muncul di kop kedua
-- dokumen resmi. Trigger, bukan RLS: RLS mengatur baris mana yang boleh
-- disentuh, bukan kolom mana. Sengaja TANPA SECURITY DEFINER, sehingga service
-- role tetap bisa memperbaiki data lewat SQL editor.
CREATE OR REPLACE FUNCTION public.profiles_lock_identity() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_claims TEXT := COALESCE(current_setting('request.jwt.claims', TRUE), '');
BEGIN
    -- Jalur admin: SQL editor / psql tidak punya klaim JWT sama sekali, dan
    -- service_role memang dimaksudkan untuk memperbaiki data. Tanpa jalan keluar
    -- ini tidak ada seorang pun yang bisa membetulkan NIM yang salah ketik,
    -- karena trigger tetap menyala untuk peran apa pun.
    IF v_claims = '' OR v_claims LIKE '%"role":"service_role"%' THEN
        RETURN NEW;
    END IF;

    -- '-' adalah placeholder yang dipasang handle_new_user() ketika pendaftaran
    -- tidak menyertakan NIM. Memperlakukannya sebagai nilai sah akan mengunci
    -- pengguna itu selamanya pada tanda hubung.
    IF OLD.nim IS NOT NULL AND OLD.nim NOT IN ('', '-')
       AND NEW.nim IS DISTINCT FROM OLD.nim THEN
        RAISE EXCEPTION 'NIM terkunci sejak pendaftaran. Hubungi admin bila keliru.';
    END IF;

    IF OLD.instansi IS NOT NULL AND OLD.instansi <> ''
       AND NEW.instansi IS DISTINCT FROM OLD.instansi THEN
        RAISE EXCEPTION 'Nama kampus terkunci sejak pendaftaran. Hubungi admin bila keliru.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_identity_locked ON public.profiles;
CREATE TRIGGER profiles_identity_locked
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_lock_identity();

-- ------------------------------------------------------------- logo_url sah
-- Menggantikan allowlist di saveLetterhead(), yang kini berjalan di peramban.
-- "pending/" adalah prefix logo yang diunggah saat pendaftaran, sebelum akun
-- ada; bucket ini publik-baca, jadi menerimanya tidak lebih lemah daripada
-- menerima prefix milik sendiri.
CREATE OR REPLACE FUNCTION public.letterhead_check_logo() RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_base TEXT;
BEGIN
    IF NEW.logo_url IS NULL OR NEW.logo_url = '' THEN
        RETURN NEW;
    END IF;

    v_base := '/storage/v1/object/public/org-logos/';

    IF POSITION(v_base || NEW.user_id::TEXT || '/' IN NEW.logo_url) = 0
       AND POSITION(v_base || 'pending/' IN NEW.logo_url) = 0 THEN
        RAISE EXCEPTION 'URL logo harus berasal dari bucket org-logos milik Anda.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS letterhead_logo_checked ON public.letterhead_settings;
CREATE TRIGGER letterhead_logo_checked
    BEFORE INSERT OR UPDATE ON public.letterhead_settings
    FOR EACH ROW EXECUTE FUNCTION public.letterhead_check_logo();


-- =====================================================================
-- EXTENSION (identitas, 4 Sep 2026): STITEK -> Universitas Sains dan
-- Teknologi Bontang. DEFAULT pada CREATE TABLE di atas hanya berlaku untuk
-- instalasi baru, jadi basis data yang sudah jalan perlu ALTER + UPDATE.
-- Idempoten: UPDATE-nya bersyarat nilai lama, jalan kedua jadi no-op.
-- =====================================================================
ALTER TABLE profiles ALTER COLUMN instansi
    SET DEFAULT 'Universitas Sains dan Teknologi Bontang';
ALTER TABLE letterhead_settings ALTER COLUMN kampus_upper
    SET DEFAULT 'UNIVERSITAS SAINS DAN TEKNOLOGI BONTANG';

UPDATE profiles SET instansi = 'Universitas Sains dan Teknologi Bontang'
    WHERE instansi = 'Sekolah Tinggi Teknologi Bontang';
UPDATE letterhead_settings SET kampus_upper = 'UNIVERSITAS SAINS DAN TEKNOLOGI BONTANG'
    WHERE kampus_upper = 'SEKOLAH TINGGI TEKNOLOGI BONTANG';
