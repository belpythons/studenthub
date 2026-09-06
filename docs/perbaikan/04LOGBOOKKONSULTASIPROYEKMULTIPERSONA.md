# Logbook — Konsultasi Proyek Multi-Persona dengan Riwayat Keputusan

> Redesain konsep logbook menjadi sistem **proyek fleksibel** yang melibatkan banyak
> konsultan (persona), di mana setiap persona baru yang dikonsultasikan langsung
> mendapat kejelasan: keputusan apa yang sudah diambil, arahan & saran siapa saja yang
> sudah masuk, mencakup area apa, dan mana yang bentrok. Dokumen riset + desain —
> belum dieksekusi.

---

## 1. Masalah (studi kasus pemilik project)

Saat menyusun jurnal, pemilik project berkonsultasi ke banyak dosen. Akibatnya:

1. **Kehilangan track** saran siapa yang harus dipakai;
2. Saran **saling bentrok**, dan antar dosen tidak saling berkomunikasi sehingga
   konflik tidak pernah terlihat apalagi terselesaikan;
3. Keputusan jadi sulit diambil → akhirnya menyerah pada **satu konsultan saja**,
   kehilangan nilai dari keragaman masukan.

### Validasi dari literatur

- Riset supervisi tesis menegaskan konflik feedback antar pembimbing adalah hal
  lumrah, bukan anomali: tesis bukan ujian pilihan ganda, pembimbing hampir pasti
  berkata berbeda. Strategi yang direkomendasikan: (a) feedback yang bentrok harus
  **dikontekstualisasikan**, mahasiswa tidak boleh dibiarkan menyelesaikannya
  sendirian; (b) upayakan resolusi dengan semua pihak; (c) bila buntu, ikuti
  **pembimbing utama** sebagai aturan praktis.
  Sumber: [Dealing with conflicting feedback — Master Academia](https://master-academia.com/conflicting-feedback/),
  [Help! My Supervisors Disagree! — Thesislink AUT](https://thesislink.aut.ac.nz/?p=5952),
  [Supervisi tesis EAL Swedia–Indonesia — Frontiers in Education (2023)](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2023.1118436/full),
  [Peran ganda pembimbing — European Journal of Higher Education (2023)](https://www.tandfonline.com/doi/full/10.1080/21568235.2022.2162560).
- Jurnal sistem informasi Indonesia memvalidasi akar masalahnya: *"riwayat bimbingan
  yang tidak terdokumentasi dengan baik menyulitkan dosen pembimbing melakukan evaluasi
  berdasarkan bimbingan sebelumnya"* — dan solusi umumnya baru sebatas merekam riwayat
  per sesi, belum menyentuh konflik antar pembimbing.
  Sumber: [SI Monitoring Bimbingan Skripsi — SITECH UMK](https://jurnal.umk.ac.id/index.php/sitech/article/view/4424),
  [SI Monitoring Skripsi — Jurnal Simtek](https://ejournal.catursakti.ac.id/index.php/simtek/article/view/152),
  [Aplikasi MOBI — JPKM Nusantara](https://ejournal.sisfokomtek.org/index.php/jpkm/article/view/2882).

### Inovasi yang diadaptasi (lintas domain, terbukti)

1. **ADR (Architecture Decision Records)** — praktik rekayasa perangkat lunak
   (Nygard 2011; ThoughtWorks Technology Radar: *Adopt*): setiap keputusan dicatat
   dengan **Status** (diusulkan/diterima/di-supersede), **Konteks**, **Keputusan**,
   **Konsekuensi**; keputusan yang berubah **tidak diedit** — dibuat catatan baru yang
   men-*supersede* yang lama. Persis primitif yang dibutuhkan agar "saran siapa yang
   dipakai" tidak pernah hilang.
   Sumber: [Documenting Architecture Decisions — Cognitect/Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions),
   [ADR — Azure Well-Architected](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record),
   [Kumpulan template ADR — GitHub](https://github.com/architecture-decision-record/architecture-decision-record).
2. **SBAR (Situation–Background–Assessment–Recommendation)** — protokol briefing
   handoff dari dunia klinis/militer; riset menunjukkan peningkatan efektivitas
   komunikasi yang signifikan (satu studi: 77% → 100%) dan bukti moderat perbaikan
   keselamatan (BMJ Open systematic review 2018). Konsultasi dengan dosen **baru**
   adalah handoff: dosen menerima "pasien" (proyek) yang riwayatnya tidak ia saksikan.
   Sumber: [Efektivitas kerangka dokumentasi SBAR — PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12431931/),
   [SBAR & patient safety — Univ. of Tennessee](https://scholar.utc.edu/cgi/viewcontent.cgi?article=1070&context=honors-theses).

---

## 2. Kondisi Codebase Saat Ini

Logbook = **log datar per-user** (`logbook_entries`, `supabase/schema.sql:106-124`)
dengan satu-satunya struktur berupa FK opsional `supervisor_id` (`supervisors` hanya
nama/jabatan/departemen, `schema.sql:92-101`). Yang **tidak ada**:

| Kebutuhan | Status |
|---|---|
| Entitas proyek / `project_id` | Tidak ada — pengelompokan hanya lewat pencarian teks bebas |
| Keterkaitan antar entri (thread/supersede) | Tidak ada (`parent_id`/`supersedes_id` nihil) |
| Status keputusan | Tidak ada — hanya `hasil_tindak_lanjut TEXT` bebas |
| Deteksi/penyelesaian konflik antar saran | Tidak ada sama sekali |
| Briefing untuk konsultan baru | Tidak ada — `/logbook/rekap` justru kebalikannya (per-dosen melihat ke belakang, bukan per-proyek melihat ke depan) |
| `updated_at`/jejak audit | Tidak ada — catatan bisa diedit tanpa jejak |
| Akses pembimbing | Tidak mungkin — RLS ketat `auth.uid() = user_id` (`schema.sql:209-215`), pembimbing tanpa akun (diakui `docs/FITUR-MODUL-LOGBOOK.md:138`) |

Batasan yang harus dihormati: **Formulir 2 (TI-SOP-17/FM-01) adalah kontrak cetak
4 kolom tetap** (No / Hari-Tanggal / Aktivitas / Nama & Paraf) — kekayaan data baru
tidak boleh mengubahnya; dan `nomor_urut` adalah nomor posisi cetak manual non-unique
(dengan renumber 2N non-atomik, lihat audit P0-5) — urutan proyek butuh sumbu sendiri.

---

## 3. Desain Konsep: "Proyek → Konsultasi → Saran → Keputusan → Briefing"

### 3.1 Model mental

```
PROYEK (jurnal, TA, lomba, apa pun — fleksibel)
 ├─ PERSONA KONSULTAN (dosen A, dosen B, mentor industri, …)
 │    └─ peran + bidang keahlian + prioritas otoritas (tie-break)
 ├─ KONSULTASI (sesi; kompatibel dengan entri logbook cetak)
 │    └─ menghasilkan 0..n SARAN
 ├─ SARAN (unit terkecil; punya AREA cakupan, mis. "metodologi", "bab 2")
 │    ├─ status: diusulkan → diadopsi | ditolak | di-supersede (pola ADR)
 │    ├─ relasi: BENTROK-DENGAN saran lain · MENGUATKAN saran lain
 │    └─ keputusan adopsi = memilih saran + alasan (tidak menghapus yang kalah)
 └─ BRIEFING PACK (dihasilkan otomatis, format SBAR)
      → dibawa/ditunjukkan ke persona BARU sebelum sesi pertama mereka
```

Kunci anti-bentrok ada di dua tempat:

- **Area cakupan**: dua saran hanya mungkin bentrok bila menyentuh area yang sama.
  Saat mahasiswa mencatat saran baru pada area yang sudah punya saran *diadopsi*,
  UI langsung menawarkan: "menguatkan yang ada" / "bentrok — catat sebagai konflik" /
  "area berbeda". Konflik jadi **terlihat pada saat lahir**, bukan saat skripsi macet.
- **Keputusan eksplisit ala ADR**: konflik ditutup dengan mengadopsi satu saran
  (atau sintesis baru) + alasan; saran yang kalah berstatus `di-supersede` dengan
  tautan ke penggantinya — riwayat "kenapa dulu tidak pakai saran Bu X" tetap ada.
  Sesuai literatur, field `prioritas otoritas` persona (pembimbing utama > penguji >
  mentor) menjadi rekomendasi default tie-break, bukan aturan kaku.

### 3.2 Briefing Pack (inti solusi untuk "persona baru")

Halaman + dokumen cetak per proyek, terstruktur SBAR:

| Bagian | Isi (otomatis dari data) |
|---|---|
| **S — Situation** | Judul & jenis proyek, fase saat ini, target/deadline, konsultan yang terlibat (siapa, peran, area) |
| **B — Background** | Kronologi ringkas konsultasi (tanggal, dengan siapa, topik) + keputusan yang sudah **diadopsi** per area beserta alasannya |
| **A — Assessment** | Konflik **terbuka** (saran A vs saran B, area, siapa penyaran) + saran berstatus *diusulkan* yang belum diputuskan |
| **R — Recommendation** | Apa yang ingin ditanyakan ke persona baru ini (diisi mahasiswa saat menyiapkan sesi) |

Dengan ini dosen baru tidak memberi saran dalam ruang hampa: ia melihat keputusan
yang sudah diambil (bisa memilih menghormatinya atau menantangnya secara sadar),
melihat konflik yang ada (bisa menjadi penengah), dan sarannya otomatis masuk ke
sistem yang sama — *setiap konsultasi baru memperjelas, bukan menambah kabur*.

### 3.3 Model data (aditif & idempotent, gaya `schema.sql` existing)

```sql
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    jenis VARCHAR(60) NOT NULL DEFAULT 'Lainnya',   -- Jurnal | Tugas Akhir | Lomba | KP | Lainnya
    deskripsi TEXT, fase VARCHAR(60), target_tanggal DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif',    -- aktif | selesai | arsip
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Persona = perluasan supervisors (tabel existing dipakai ulang, tidak diganti)
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS peran VARCHAR(60);            -- Pembimbing Utama | Pendamping | Penguji | Mentor | Rekan
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS bidang_keahlian TEXT[];
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS prioritas INT NOT NULL DEFAULT 100;  -- kecil = lebih otoritatif (tie-break)
ALTER TABLE supervisors ADD COLUMN IF NOT EXISTS catatan_gaya TEXT;            -- preferensi komunikasi persona

CREATE TABLE IF NOT EXISTS project_advisors (        -- penugasan persona per proyek
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES supervisors(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, supervisor_id)
);

-- Jembatan kompatibilitas: sesi konsultasi = entri logbook + konteks proyek
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES projects(id) ON DELETE SET NULL;      -- nullable: entri lama & non-proyek tetap sah
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;   -- audit P1-6

CREATE TABLE IF NOT EXISTS advice (                  -- saran: unit terkecil pengetahuan
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entry_id UUID REFERENCES logbook_entries(id) ON DELETE SET NULL,   -- sesi asal
    supervisor_id UUID REFERENCES supervisors(id) ON DELETE SET NULL,
    penyaran_nama VARCHAR(255) NOT NULL,             -- denormalisasi (pola pembimbing_nama existing)
    area VARCHAR(120) NOT NULL,                      -- 'Metodologi', 'Bab 2', bebas + autosuggest per proyek
    isi TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'diusulkan', -- diusulkan | diadopsi | ditolak | di-supersede
    alasan_status TEXT,                              -- 'Konteks/Konsekuensi' ala ADR saat status berubah
    superseded_by UUID REFERENCES advice(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);
CREATE INDEX IF NOT EXISTS advice_project_idx ON advice (project_id, area, status);

CREATE TABLE IF NOT EXISTS advice_relations (        -- bentrok / menguatkan
    a_id UUID NOT NULL REFERENCES advice(id) ON DELETE CASCADE,
    b_id UUID NOT NULL REFERENCES advice(id) ON DELETE CASCADE,
    jenis VARCHAR(20) NOT NULL,                      -- 'bentrok' | 'menguatkan'
    catatan TEXT,
    resolved_by UUID REFERENCES advice(id) ON DELETE SET NULL,  -- keputusan yang menutup konflik
    PRIMARY KEY (a_id, b_id),
    CHECK (a_id <> b_id)
);
```

Aturan imutabilitas (pola ADR, ditegakkan server-side): `advice.isi` **tidak dapat
diedit** setelah dibuat berstatus selain `diusulkan`; perubahan pikiran = saran baru
+ `superseded_by`. RLS semua tabel baru mengikuti pola "own rows" existing.

### 3.4 Halaman & alur

| Rute | Fungsi |
|---|---|
| `/logbook/projects` | Daftar proyek + ringkasan (konsultan, konflik terbuka, keputusan terakhir) |
| `/logbook/projects/[id]` | Detail proyek: timeline konsultasi, **papan saran per area** (kolom status), daftar konflik terbuka dengan tombol "putuskan" |
| `/logbook/projects/[id]/briefing` + `/print/briefing` | Briefing Pack SBAR (layar + cetak A4, memakai infrastruktur `print/` existing) |
| `/logbook/new` (existing) | Ditambah select proyek opsional; setelah simpan entri, prompt ringan "catat saran dari sesi ini?" (0..n saran cepat: area + isi) |
| `/logbook` (existing) | Kolom/badge proyek pada tabel; filter per proyek |

Alur konflik: saran baru pada area yang sudah punya saran diadopsi/diusulkan →
dialog tiga pilihan (menguatkan / bentrok / area lain) → bila bentrok, muncul di
"Konflik Terbuka" proyek → mahasiswa (kapan pun, idealnya setelah konsultasi
berikutnya) menekan **Putuskan**: pilih saran pemenang atau tulis sintesis baru,
wajib isi alasan; sistem menandai yang kalah `di-supersede`, konflik tertutup dengan
`resolved_by`.

### 3.5 Kompatibilitas & akses pembimbing

- **Formulir 2 tidak berubah**: sesi konsultasi tetap `logbook_entries`; kolom
  Aktivitas tetap `aktivitas_pekerjaan`. Saran/keputusan hidup di layar & Briefing
  Pack (dokumen cetak **baru**, bukan modifikasi FM-01). Entri tanpa proyek tetap
  berjalan seperti sekarang (fleksibel — tidak semua bimbingan butuh proyek).
- **Akses dosen tanpa akun** (fase 2, opsional): tautan **share token read-only**
  per proyek ke Briefing Pack (tabel `project_shares` dengan token + kedaluwarsa,
  dilayani route server-side ber-service-role, bukan pelonggaran RLS). Fase 1 cukup
  cetak/PDF — sesuai kebiasaan dosen dan nol perubahan model akses.
- Nomor urut cetak (`nomor_urut`) tidak dipakai untuk urutan proyek — timeline
  proyek memakai `tanggal`/`created_at`.

---

## 4. Verifikasi saat implementasi

1. Unit test aturan status saran (transisi sah/tidak sah, supersede berantai,
   konflik tertutup harus punya `resolved_by` + alasan).
2. Skenario studi kasus: proyek "Penyusunan Jurnal", 3 persona, 2 saran bentrok di
   area "Metodologi" → putuskan → Briefing Pack menampilkan keputusan + alasan, dan
   konflik hilang dari daftar terbuka; dosen ke-4 (baru) melihat semuanya di satu halaman.
3. Entri logbook lama (tanpa proyek) tetap tampil & tercetak di Formulir 2 tanpa perubahan
   (`scripts/_pdf.mjs`).
4. Uji cetak `/print/briefing` light/dark A4.
5. RLS: user lain tidak bisa membaca proyek/saran; share token hanya membuka
   Briefing Pack proyek terkait dan kedaluwarsa benar.
