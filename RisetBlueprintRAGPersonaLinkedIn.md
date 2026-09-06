# Riset dan Blueprint Sistem RAG untuk Formatting Persona dan Prestasi di LinkedIn

> Riset mendalam mekanisme LinkedIn — struktur profil, distribusi konten, dan pencarian kandidat — beserta rancangan sistem yang memetakan catatan prestasi menjadi entri profil, persona role, dan naskah publikasi.

| Aspek | Keterangan |
|---|---|
| Disusun untuk | PT Badak NGL |
| Tanggal | 4 September 2026 |
| Cakupan role | Seluruh bidang IT (15 role: AI/ML, data, infrastruktur, cloud, DevOps/SRE, keamanan IT dan OT, software, otomasi dan instrumentasi, support, analis, manajemen proyek) |
| Isi | 10 bab riset dan rancangan + 3 lampiran (taxonomy role, template prompt, daftar sumber) |
| Status pengetahuan platform | Diverifikasi September 2026; sebagian butir memerlukan verifikasi ulang manual (lihat Bab 10.4) |

---

## Daftar Isi

1. [Ringkasan Eksekutif](#ringkasan-eksekutif)
2. [Metodologi Riset dan Tingkat Keandalan Sumber](#metodologi-riset-dan-tingkat-keandalan-sumber)
3. [Bab 2 — Peta Lengkap Profil LinkedIn](#peta-lengkap-profil-linkedin)
4. [Bab 3 — Mekanisme Distribusi Konten dan Anatomi Post](#mekanisme-distribusi-konten-dan-anatomi-post)
5. [Bab 4 — Aturan Penempatan Prestasi (Achievement Router)](#aturan-penempatan-prestasi-achievement-router)
6. [Bab 5 — Cara Perekrut Menemukan Kandidat](#cara-perekrut-menemukan-kandidat)
7. [Bab 6 — Persona: Memformat Diri sebagai Role yang Diincar](#persona-memformat-diri-sebagai-role-yang-diincar)
8. [Bab 7 — Blueprint Sistem RAG](#blueprint-sistem-rag)
9. [Bab 8 — Konfigurasi Chatbot](#konfigurasi-chatbot)
10. [Bab 9 — Contoh End-to-End](#contoh-end-to-end)
11. [Bab 10 — Evaluasi, Risiko, dan Roadmap](#evaluasi-risiko-dan-roadmap)
12. [Lampiran A — Taxonomy Role IT](#lampiran-a--taxonomy-role-it)
13. [Lampiran B — Template Prompt](#lampiran-b--template-prompt)
14. [Lampiran C — Sumber Riset](#lampiran-c--sumber-riset)


## Ringkasan Eksekutif

Dokumen ini adalah hasil riset mendalam terhadap cara kerja LinkedIn (struktur profil, mekanisme distribusi konten, dan mekanisme pencarian kandidat oleh perekrut) yang kemudian diterjemahkan menjadi **blueprint teknis sistem RAG** untuk memformat catatan prestasi menjadi persona dan konten LinkedIn yang siap dipublikasikan.

Sistem yang dirancang menjawab empat pertanyaan yang Anda ajukan, dan setiap pertanyaan dipetakan menjadi satu komponen sistem yang dapat diuji secara terpisah:

1. **Sebaiknya prestasi dikirim ke LinkedIn sebagai apa?** → dijawab oleh *Achievement Router* (Bab 4): rule engine deterministik 12 aturan yang memetakan satu prestasi ke satu atau lebih dari 11 destinasi LinkedIn (Experience, Licenses & Certifications, Projects, Honors & Awards, Publications, Courses, Volunteer, Education-description, Featured, Post, dan "tidak diposting sama sekali").
2. **Format persona sebagai role apa?** → dijawab oleh *Persona Composer* (Bab 5 dan Bab 6): menyusun Headline, About, urutan Skills, dan penekanan Experience berdasarkan taxonomy 15 role IT beserta job title, hard skill, sertifikasi, dan metrik yang dihargai untuk masing-masing.
3. **Pekerjaan apa yang sedang diincar?** → dijawab oleh *Target Role Profile* dan *Keyword Gap Analyzer*: satu objek konfigurasi berisi role target (maksimal 2–3), yang menjadi filter retrieval sekaligus rubrik penilaian; setiap prestasi dinilai relevansinya terhadap role target sebelum diformat.
4. **Konfigurasi chatbot yang paham cara kerja LinkedIn** → dijawab oleh *Platform Knowledge Base* (KB-PLATFORM, Bab 2) dan konfigurasi agent di Bab 8: chatbot dapat menjawab "field apa saja yang harus diisi", "di mana lokasi menu-nya", "berapa batas karakternya", dan "bagaimana langkah kliknya" dengan jawaban yang bersumber dari knowledge base, bukan dari ingatan model.

#### Sepuluh temuan riset yang paling mengubah desain sistem

- LinkedIn merombak total mesin feed-nya menjadi arsitektur dua tahap berbasis LLM (unified retrieval dengan dual encoder + sequential ranking generatif). Konsekuensinya: **distribusi konten sekarang berbasis kesamaan topik/minat, bukan lagi berbasis daftar follower**. Sistem harus menghasilkan konten yang konsisten secara topikal agar "otoritas topik" akun terbentuk.
- **Dwell time dan saves adalah sinyal terkuat**, jauh di atas likes. Ini mengubah target penulisan: post harus cukup panjang dan cukup berisi untuk ditahan dibaca, bukan sekadar pengumuman dua baris.
- **Panjang post optimal 1.300–2.500 karakter** (dari maksimum 3.000) — sekitar 27% lebih tinggi engagement-nya dibanding post di bawah 400 karakter. Preview terpotong di ~140 karakter (mobile) dan ~210 karakter (desktop), sehingga hook wajib utuh sebelum batas itu.
- **Skill Assessments sudah dihapus permanen** oleh LinkedIn (badge dicabut dari semua profil pada 2024) dan **Creator Mode juga sudah dihapus** sebagai toggle (fitur-fiturnya kini default untuk semua akun). Model bahasa yang dilatih sebelum 2024 hampir pasti masih menyarankan keduanya — ini alasan konkret mengapa sistem ini harus berbasis RAG, bukan pengetahuan internal model.
- Hashtag **bukan lagi mekanisme distribusi** sejak fitur "follow hashtag" dihapus; fungsinya kini hanya sinyal topik dan pencarian. Optimal 2–3 hashtag. **Tag orang lebih berpengaruh daripada hashtag**, dengan batas praktis ~5 orang.
- Terdapat **penalti reach untuk mengedit post setelah publikasi**, paling besar bila edit dilakukan setelah 30–90 menit. Implikasi: validasi harus terjadi sebelum publikasi, bukan sesudah — maka sistem wajib punya lapisan validator otomatis dan approval manusia sebelum konten keluar.
- LinkedIn secara aktif menekan konten "AI slop" (konten generik tanpa data first-party). Sistem RAG yang menulis dari prestasi nyata dengan angka konkret berada di sisi aman, **asalkan output selalu berisi detail spesifik dan bukan template kosong yang berulang**. Ini menjadi guardrail wajib: dilarang menghasilkan post tanpa minimal satu fakta spesifik milik pengguna.
- Pada sisi pencarian, LinkedIn Recruiter menggunakan **Boolean search dengan pencocokan frasa eksak** dan tidak mendukung wildcard. Karena bobot antar-field tidak pernah dipublikasikan resmi dan sumber pihak ketiga saling bertentangan, strategi paling aman adalah **redundansi keyword terkendali** di lima titik: Headline, Job Title, Skills (top 3 di-pin), About, dan minimal satu bullet Experience.
- **Magang, Kerja Praktek, dan PKL harus masuk Experience, bukan Volunteer atau Education** — karena perekrut memfilter lewat field Experience. Sebaliknya, **kursus/bootcamp tidak boleh dicantumkan sebagai Experience** karena dianggap menyesatkan.
- **Kelebihan sertifikat kecil justru menurunkan kredibilitas.** Batas sehat: 3–7 sertifikasi paling relevan dan 2–3 penghargaan. Karena itu router prestasi bukan hanya memutuskan "masuk ke mana", tapi juga berwenang memutuskan **"tidak masuk profil sama sekali, cukup jadi post"** atau **"lewati saja"**.

> **Kesimpulan desain:** klasifikasi prestasi tidak diserahkan sepenuhnya ke LLM. Rule engine deterministik menjadi lapisan keputusan utama (dapat diaudit, konsisten, dapat diuji regresi), sedangkan RAG + LLM berperan untuk (a) mengekstraksi atribut dari deskripsi bebas, (b) menangani kasus ambigu, dan (c) menulis naskah. Pola ini menurunkan variansi output secara drastis dibanding pendekatan "satu prompt besar".

---

## Metodologi Riset dan Tingkat Keandalan Sumber

Riset dilakukan melalui penelusuran web pada September 2026 terhadap tiga lapis sumber. Penting untuk sistem RAG: setiap fakta dalam knowledge base harus membawa metadata tingkat keandalannya, karena LinkedIn tidak mempublikasikan sebagian besar mekanisme internalnya.

| Tingkat | Definisi | Contoh dalam dokumen ini | Perlakuan di sistem |
|---|---|---|---|
| A — Resmi/terstruktur | Dokumentasi skema data resmi LinkedIn di Microsoft Learn, blog engineering LinkedIn, paper riset LinkedIn, halaman LinkedIn Help | Daftar field tiap section profil, 14 kategori Volunteer cause, 5 level Language proficiency, arsitektur feed dua tahap | Dipakai sebagai fakta. Boleh dinyatakan tanpa hedging. |
| B — Riset pihak ketiga berskala besar | Analisis ratusan ribu hingga jutaan post oleh firma riset (AuthoredUp, Socialinsider, laporan Algorithm Insights) | Panjang post optimal, engagement rate per format, batas karakter | Dipakai sebagai rekomendasi. Wajib disertai kualifikasi "berdasarkan riset X". |
| C — Klaim komunitas/praktisi | Blog SEO, konsultan LinkedIn, artikel karier tanpa metodologi terbuka | Durasi "golden hour", persentase penalti link, bobot field pencarian | Dipakai sebagai heuristik. Tidak boleh dinyatakan sebagai fakta oleh chatbot. |

#### Kontradiksi yang ditemukan dan harus dikelola sistem

Beberapa fakta berbeda antar sumber. Sistem tidak boleh menyembunyikannya — knowledge base harus menyimpan kedua nilai dengan penanda konflik, dan chatbot menjawab dengan menyebutkan rentangnya.

| Topik | Klaim A | Klaim B | Rekomendasi sistem |
|---|---|---|---|
| Jumlah maksimum Skills | 50 skill (batas lama, masih disebut banyak sumber 2026) | 100 skill (dinaikkan sekitar Februari 2024) | Pakai target aman 45–50 skill berkualitas. Simpan keduanya sebagai fakta berkonflik, verifikasi manual di akun. |
| Skill yang bisa di-pin | 3 skill teratas | 5 skill teratas | Optimalkan untuk 3 slot pertama (aman untuk kedua kasus). |
| Efek link eksternal pada reach | Turun hingga 60% | Justru naik 5% menurut analisis 1,8 juta post 2025 | Default: hindari link mentah di badan post. Gunakan native document/artikel. Jangan klaim angka apa pun ke pengguna. |
| Link di komentar pertama | Masih efektif sebagai workaround | Sudah di-patch dan terkena penalti serupa | Jangan jadikan strategi andalan; tandai sebagai tidak pasti. |
| Reorder section profil | Bisa drag-and-drop antar section | Urutan section besar sudah dikunci LinkedIn; hanya urutan item di dalam section dan isi Featured yang bisa diatur | Ajarkan pengguna mengatur urutan item dalam section dan kurasi Featured; jangan janjikan reorder antar-section. |
| Durasi jendela kritis pasca-publikasi | 60 menit | 90 menit | Nyatakan sebagai "sekitar 1–1,5 jam pertama", tandai sebagai heuristik komunitas (tingkat C). |

> **Catatan penting untuk pemeliharaan:** LinkedIn mengubah UI dan kebijakannya beberapa kali setahun dan sering melakukan A/B testing sehingga tampilan antar akun bisa berbeda. Setiap dokumen di knowledge base wajib punya field `last_verified` dan sistem harus menampilkan tanggal verifikasi ketika menjawab pertanyaan mekanis ("di mana tombolnya"). Rekomendasi siklus verifikasi ulang: 3 bulan untuk KB-PLATFORM, 6 bulan untuk KB-ROLE.

---

## Peta Lengkap Profil LinkedIn

Bab ini adalah materi mentah untuk **KB-PLATFORM** — knowledge base yang membuat chatbot mampu menjawab "apa saja yang harus diisi, di mana, dan bagaimana". Setiap baris tabel di bawah ini dirancang untuk menjadi satu chunk dengan metadata `linkedin_section`.

### 2.1 Anatomi profil: 24 titik pengisian persona

Profil LinkedIn bukan satu formulir, melainkan kumpulan section yang ditambahkan lewat tombol **Add profile section**, dikelompokkan menjadi tiga kategori: **Core**, **Recommended**, dan **Additional**.

| Kelompok | Section | Fungsi utama untuk persona |
|---|---|---|
| Intro (selalu ada) | Profile photo, Background photo, Name, Pronouns, Name pronunciation, Custom URL, Location, Industry | Identitas visual dan metadata dasar; Custom URL menjadi alamat kanonik yang dipakai di CV dan email. |
| Core | About, Experience, Education, Skills, Career break | Tulang punggung persona dan objek utama pencarian perekrut. |
| Recommended | Featured, Licenses & Certifications, Courses, Recommendations | Bukti dan validasi sosial; Featured adalah etalase kurasi tepat di bawah About. |
| Additional | Projects, Publications, Honors & Awards, Volunteer experience, Test scores, Languages, Organizations, Patents, Causes you care about | Tempat pendaratan sebagian besar "prestasi" yang bukan pekerjaan dan bukan sertifikasi. |
| Di luar Add section | Headline, Open to work / Open to hiring / Providing services, Services page, Newsletter, Articles | Headline diedit lewat Edit Intro; status "Open to" diatur lewat tombol biru di bawah headline. |

> **Jalur UI generik:** Desktop: **Me → View Profile → Add profile section → pilih Core / Recommended / Additional → pilih section → isi form → Save.** Mobile: **tap foto profil → View profile → Add section → kategori → section → Save.** Untuk mengedit item yang sudah ada, gunakan ikon pensil pada section terkait; untuk menambah item kedua pada section yang sama, gunakan tombol **+** di header section.

### 2.2 Batas karakter — tabel acuan wajib untuk validator

Angka berikut menjadi konstanta keras di modul validasi. Sistem harus menolak (bukan memotong diam-diam) output yang melampaui batas, dan memberi peringatan bila melampaui batas "aman tampil".

| Field | Batas maksimum | Batas efektif tampil | Catatan implementasi |
|---|---|---|---|
| Headline | 220 karakter | ~60–80 karakter pertama tampil di kartu hasil pencarian dan tampilan mobile | Letakkan role target dan 2 skill terpenting di 80 karakter pertama. |
| About / Summary | 2.600 karakter | ~200–300 karakter sebelum tombol "…see more" | Kalimat 1–3 harus berdiri sendiri sebagai pitch; ini juga yang dipakai Google sebagai deskripsi. |
| Deskripsi Experience | 2.000 karakter per posisi | — | Cukup untuk 5–7 bullet berformula XYZ. |
| Judul posisi (Title) | 100 karakter | — | Cukup untuk "Job Title yang di-search" + kualifikasi singkat. |
| Post (update feed) | 3.000 karakter | ~140 karakter (mobile) / ~210 karakter (desktop) | Target penulisan 1.300–2.500 karakter; hook wajib selesai sebelum karakter ke-140. |
| Komentar | 1.250 karakter | — | Dipakai untuk balasan bernilai tambah, bukan untuk menaruh link. |
| Artikel LinkedIn | ~110.000 karakter | — | Untuk narasi panjang (studi kasus proyek, laporan teknis). |
| Nama newsletter | ~30 karakter | — | Nama tidak mudah diubah; pilih sekali dengan hati-hati. |
| Pertanyaan poll / opsi poll | 140 / 30 karakter | — | Performa poll turun drastis; tidak direkomendasikan untuk pengumuman prestasi. |
| Nama depan / nama belakang | 20 / 40 karakter | — | Gelar profesional sebaiknya di Headline, bukan menumpuk di nama. |
| Custom URL | 5–30 karakter, huruf dan angka | — | Format disarankan: nama depan + nama belakang + pembeda singkat. |
| Catatan connection request | 300 karakter | — | Relevan bila sistem juga membantu outreach. |
| Rekomendasi (Recommendations) | 3.000 karakter | — | Ditulis oleh orang lain; sistem hanya membantu menyusun permintaan. |
| Pesan langsung / InMail body | 8.000 / 2.000 karakter | — | Relevan untuk modul follow-up ke perekrut. |

#### Spesifikasi media

- Foto profil: rasio 1:1, disarankan 400 × 400 px.
- Foto latar (banner): rasio 4:1, disarankan 1584 × 396 px. Bagian tepi terpotong di tampilan mobile — letakkan teks penting di tengah.
- Carousel / document post: format PDF, PPTX, atau DOCX; rasio portrait 1080 × 1350 px paling optimal untuk layar mobile; 5–15 halaman (paling baik 8–10); margin aman 50 px; ukuran font minimal setara 24 pt.
- Video: unggah native (bukan tautan YouTube), orientasi vertikal, wajib bertakarir teks karena mayoritas ditonton tanpa suara. Terdapat perbedaan rekomendasi durasi antar sumber: satu riset menyarankan 2–3 menit, riset lain menyarankan di bawah 60 detik.

### 2.3 Field per section — spesifikasi form

Daftar field di bawah ini berasal dari dokumentasi skema data resmi (tingkat keandalan A) sehingga dapat dipakai langsung sebagai **output schema** yang akan diisi oleh sistem, lalu disalin pengguna ke form LinkedIn.

#### Experience (Position)

| Field | Wajib | Keterangan / nilai yang valid |
|---|---|---|
| Title | Ya | Maksimum 100 karakter. Gunakan judul yang benar-benar dicari perekrut, bukan judul internal perusahaan. |
| Employment type | Tidak | Full-time, Part-time, Self-employed, Freelance, Contract, Internship, Apprenticeship, Seasonal (opsi bervariasi per negara). |
| Company name | Ya | Pilih dari daftar perusahaan agar logo dan halaman perusahaan ikut tertaut. |
| Location + Location type | Tidak | Location type: On-site, Hybrid, Remote. Lokasi bersifat filter keras pada pencarian perekrut. |
| Start date / End date | Ya / kondisional | Hanya bulan dan tahun. End date kosong berarti posisi saat ini. |
| Description | Tidak | Maksimum 2.000 karakter. Ini kanal utama keyword Experience. |
| Skills | Tidak | Kaitkan skill ke posisi ini — memperkuat Skills Match saat melamar. |
| Media | Tidak | Lampiran dokumen, gambar, atau tautan. |

Beberapa posisi pada perusahaan yang sama akan otomatis dikelompokkan (position grouping) sehingga promosi tampil sebagai jenjang, bukan sebagai dua pekerjaan terpisah.

#### Licenses & Certifications

| Field | Wajib | Keterangan |
|---|---|---|
| Name | Ya | Tulis nama resmi lengkap sesuai penerbit, bukan singkatan buatan sendiri — inilah yang dicocokkan filter perekrut dan ATS. |
| Issuing organization | Ya | Pilih dari daftar agar tertaut ke halaman perusahaan penerbit. |
| Issue date / Expiration date | Ya / tidak | Bulan dan tahun. Kosongkan expiration bila tidak kedaluwarsa; jangan biarkan sertifikat kedaluwarsa tampil. |
| Credential ID | Tidak | Meningkatkan kepercayaan saat verifikasi. Tidak terbukti menaikkan peringkat pencarian. |
| Credential URL | Tidak | Tautan verifikasi publik (mis. halaman badge penerbit). |
| Skills | Tidak | Kaitkan 2–5 skill yang dibuktikan sertifikat ini. |

#### Projects

| Field | Wajib | Keterangan |
|---|---|---|
| Project name | Ya | Gunakan nama yang deskriptif dan mengandung keyword teknis. |
| Associated with | Tidak | Kaitkan ke entri Experience atau Education tertentu agar konteksnya jelas. |
| Start / End date, atau proyek berjalan | Tidak | Tersedia opsi proyek satu waktu vs berkelanjutan. |
| Description | Tidak | Tempat terbaik menerapkan pola Situation–Action–Result secara naratif. |
| Contributors | Tidak | Tag rekan tim (mereka akan mendapat notifikasi permintaan). |
| Skills, Media / Link | Tidak | Tautan repositori, demo, atau dokumen. |

#### Honors & Awards, Publications, Courses, Test Scores, Organizations, Patents, Languages, Volunteer

| Section | Field |
|---|---|
| Honors & Awards | Title (wajib), Issuer, Issue date, Associated with (posisi/pendidikan terkait), Description |
| Publications | Title (wajib), Publication/Publisher, Publication date, Authors (wajib termasuk diri sendiri), Description, URL |
| Courses | Course name, Course number, Associated with |
| Test Scores | Test name (wajib), Score, Date, Description, Associated with |
| Organizations | Organization name, Position held, Start/End date, Description, Associated with |
| Patents | Title (wajib), Inventors (wajib), Patent office (kode negara, wajib), status Pending/Issued; jika pending: Application number + Filing date; jika issued: Patent number + Issue date; Description, URL |
| Languages | Language (wajib) + Proficiency: Elementary, Limited working, Professional working, Full professional, Native or bilingual |
| Volunteer experience | Organization (wajib), Role (wajib), Cause, Start/End date atau penanda kegiatan sekali jalan, Description; 14 pilihan Cause termasuk education, environment, health, science and technology, social services, humanitarian relief |
| Career break | Career break type (13 pilihan: caregiving, gap year, layoff, professional development, relocation, travel, dll.), Start/End date, Location, Description |

### 2.4 Section mana yang benar-benar terindeks

Ini menentukan ke mana keyword harus ditempatkan. Kolom terakhir adalah bobot yang dipakai *Keyword Placement Planner* di Bab 6.

| Section | Terindeks Google | Terindeks pencarian perekrut | Prioritas penempatan keyword |
|---|---|---|---|
| Name | Ya (title tag) | Ya | — |
| Headline | Ya (title tag) | Ya, sangat tinggi | 1 (tertinggi) |
| Job Title pada Experience | Ya | Ya, field khusus pada Boolean search | 1 |
| Skills | Ya | Ya, dipakai filter dan Skills Match | 2 |
| About | Ya (300 karakter awal jadi deskripsi) | Ya, lewat field Keywords | 3 |
| Deskripsi Experience | Ya | Ya, lewat field Keywords | 3 |
| Licenses & Certifications | Ya | Ya, tersedia filter khusus | 4 |
| Education | Ya | Ya | 5 |
| Projects, Publications, Honors, Courses, Volunteer, Organizations | Ya | Ya, bobot lebih rendah | 6 |
| Featured | Judul dan tautan terindeks | Sebagian | Bukan untuk keyword, tapi untuk konversi |
| Foto, Pronouns, Name pronunciation | Tidak (bukan teks) | Tidak | — |
| Preferensi Open to Work (mode privat) | Tidak | Ya, hanya untuk pengguna LinkedIn Recruiter | Aktifkan sebagai sinyal, bukan keyword |

> **Prasyarat mutlak:** seluruh indeksasi Google hanya berlaku bila profil disetel publik melalui **Settings → Visibility → Edit your public profile**. Sistem harus memasukkan ini sebagai item pertama pada checklist onboarding pengguna.

### 2.5 Fitur yang sudah dihapus atau berubah — daftar anti-halusinasi

Daftar ini wajib dimuat ke KB-PLATFORM dengan penanda `status: deprecated`, karena model bahasa yang dilatih sebelum 2024 kemungkinan besar masih menyarankannya.

| Fitur | Status | Implikasi |
|---|---|---|
| Skill Assessments (badge "Verified Skill") | Dihentikan; badge dihapus dari seluruh profil pada 2024 | Chatbot tidak boleh menyarankan "ambil skill assessment". Alternatifnya: sertifikasi resmi, Projects dengan artefak, dan Recommendations. |
| Creator Mode (toggle) | Dihapus sekitar awal 2024 | Tidak perlu "mengaktifkan creator mode". Featured, tombol Follow, analitik profil, dan Newsletter kini tersedia default. |
| Follow hashtag sebagai kanal distribusi | Dihapus | Hashtag bukan mekanisme reach; batasi 2–3 untuk sinyal topik dan pencarian. |
| Bagian "Talks about #..." di profil | Dihapus bersama Creator Mode | Positioning topik dipindahkan ke Headline dan About. |
| Social Selling Index (SSI) | Masih ada tetapi tidak lagi ditonjolkan LinkedIn sebagai metrik performa | Tidak dipakai sebagai KPI sistem; ini alat sales, bukan ukuran kualitas personal branding. |
| Reorder antar-section profil | Kemungkinan besar sudah dikunci; hanya urutan item dalam section dan Featured yang bisa diatur | Sistem menyarankan kurasi Featured dan pengurutan item, bukan pemindahan section. |

---

## Mekanisme Distribusi Konten dan Anatomi Post

Bab ini menjadi materi **KB-STYLE**: aturan yang dipakai generator untuk menulis post, memilih format, dan menentukan waktu publikasi.

### 3.1 Cara kerja feed LinkedIn saat ini

LinkedIn telah mengganti kumpulan pipeline retrieval lamanya (kronologis, tren geografis, collaborative filtering, berbasis industri) dengan arsitektur dua tahap berbasis model bahasa:

1. **Unified retrieval (dual encoder).** Profil anggota dan konten post sama-sama diubah menjadi teks terstruktur lalu di-encode ke satu ruang embedding bersama, sehingga pencocokan terjadi secara semantik. Tahap ini juga menangani cold-start: anggota atau konten baru tetap bisa dicocokkan karena minatnya disimpulkan dari data profil.
2. **Sequential ranking (rekomender generatif).** Ribuan interaksi historis anggota diproses sebagai urutan temporal oleh transformer, kemudian digabung dengan fitur konteks dan dipisahkan menjadi tugas pasif (klik, skip, dwell) dan aktif (like, comment, share).

Konsekuensi praktis untuk sistem yang kita bangun: **kecocokan topik mengalahkan hubungan koneksi**. Post tidak otomatis sampai ke semua follower. Konsistensi topik dari waktu ke waktu membentuk "otoritas topik" yang menaikkan peluang distribusi post berikutnya di area yang sama. Ini alasan mengapa sistem perlu menyimpan riwayat topik post (KB-USER) dan menjaga agar konten prestasi tetap berada dalam 2–3 klaster topik yang konsisten dengan role target.

#### Hierarki sinyal peringkat

| Sinyal | Kekuatan relatif | Cara sistem meresponsnya |
|---|---|---|
| Saves / simpan post | Paling kuat (disebut beberapa kali lipat nilai like) | Tulis konten yang layak disimpan: checklist, ringkasan langkah, daftar sumber belajar. |
| Dwell time | Sangat kuat; dasar "depth score" | Panjang 1.300–2.500 karakter, paragraf pendek, ada bagian yang menuntut dibaca (angka, langkah, cerita). |
| Komentar, terutama balasan berantai | Kuat | Akhiri dengan pertanyaan otentik yang bisa dijawab dengan pengalaman, bukan dengan "ya/tidak". |
| Repost dan share via pesan pribadi | Kuat | Sediakan satu insight yang layak diteruskan ke rekan kerja. |
| Like / reaksi | Paling lemah | Tidak dijadikan target optimasi. |
| Sinyal negatif (skip cepat, hide, report) | Menurunkan distribusi | Hindari hook clickbait yang tidak dipenuhi isi post. |

### 3.2 Format konten dan performanya

| Format | Posisi performa | Kapan dipakai untuk prestasi |
|---|---|---|
| Document / carousel (PDF) | Tertinggi secara konsisten | Prestasi dengan proses yang bisa dipecah: ringkasan proyek, "5 pelajaran dari sertifikasi X", studi kasus. 8–10 halaman. |
| Video native | Kuat, tetapi persaingan makin ketat | Demo produk, potongan sesi berbicara di depan publik, walkthrough hasil proyek. |
| Multi-image | Kuat | Dokumentasi lapangan, sebelum–sesudah, foto tim. |
| Teks + satu gambar | Format paling umum; naik ~50% bila menampilkan wajah manusia | Default untuk pengumuman sertifikasi, promosi, kelulusan. |
| Teks saja | Menurun | Hanya untuk refleksi singkat berbobot tinggi. |
| Poll | Turun drastis, hampir tidak efektif | Tidak direkomendasikan untuk pengumuman prestasi. |
| Artikel | Bagus untuk pencarian Google, bukan untuk reach feed | Studi kasus panjang yang ingin dijadikan aset permanen di Featured. |
| Newsletter | Melewati filter feed: dikirim sebagai notifikasi dan email ke pelanggan | Bila pengguna ingin membangun audiens tetap dalam satu tema. |

### 3.3 Anatomi post prestasi yang tidak terdengar pamer

Struktur enam blok berikut menjadi template wajib generator. Setiap blok punya batasan dan larangan yang dapat divalidasi otomatis.

| Blok | Target panjang | Aturan | Larangan |
|---|---|---|---|
| 1. Hook | ≤ 140 karakter, satu kalimat utuh | Menyatakan masalah, angka mengejutkan, atau ketegangan nyata | Dilarang membuka dengan "I am excited to announce", "Alhamdulillah akhirnya", atau emoji beruntun |
| 2. Konteks | 2–4 baris | Situasi awal, kendala, atau kegagalan yang mendahului | Jangan langsung ke hasil |
| 3. Inti pencapaian | 3–6 baris | Wajib memuat minimal satu angka atau fakta spesifik yang dapat dipertanggungjawabkan | Dilarang mengarang metrik; bila tidak ada angka, gunakan ukuran skala/kualitatif yang jujur |
| 4. Kredit | 1–2 baris | Sebut nama mentor, tim, atau institusi; tag maksimal 5 orang yang benar-benar terlibat | Jangan tag orang tidak relevan atau berulang |
| 5. Pelajaran | 3–5 baris | Ubah pengalaman menjadi hal yang bisa dipakai pembaca; ini yang membuat post layak disimpan | Hindari nasihat generik tanpa konteks |
| 6. CTA + hashtag | 1 baris + 2–3 hashtag | Pertanyaan terbuka yang relevan dengan isi | Dilarang engagement bait ("komen YES kalau setuju") |

#### Aturan waktu dan frekuensi

- Beri jeda 1–2 minggu antara momen pencapaian dan waktu posting agar isi post reflektif, bukan reaktif. Ini juga memberi waktu bagi validasi angka.
- Jaga jarak minimal 24 jam antar post dari akun yang sama.
- Frekuensi sehat untuk akun profesional: 3–5 post per minggu. Untuk akun yang hanya memposting prestasi, kepadatan ini tidak relevan — yang penting jaraknya.
- Hindari mengedit post setelah publikasi, terutama pada rentang 30–90 menit pertama. Koreksi ketik kecil relatif aman; menambahkan tautan setelah publikasi dilaporkan berdampak paling besar.
- Waktu posting: tidak ada konsensus jam pasti antar riset. Perlakukan sebagai parameter yang diuji sendiri per akun, bukan sebagai fakta.

### 3.4 Praktik berisiko yang harus dicegah sistem

| Praktik | Risiko | Guardrail di sistem |
|---|---|---|
| Engagement pod / saling like terjadwal | Terdeteksi sebagai pola artifisial; penurunan impresi drastis | Sistem tidak boleh menyarankan atau memfasilitasi pod. |
| Konten AI generik tanpa data pribadi | Ditekan distribusinya di luar koneksi langsung | Validator menolak output yang tidak memuat minimal satu entitas spesifik (angka, nama sistem, nama organisasi, tanggal). |
| Engagement bait | Diturunkan jangkauannya | Daftar frasa terlarang pada validator. |
| Link mentah di badan post | Dampak tidak pasti; sumber saling bertentangan | Default tanpa link; bila perlu gunakan dokumen native atau artikel LinkedIn. |
| Hashtag berlebihan dan tag massal | Terbaca spam | Batas keras: 3 hashtag, 5 mention. |
| Klaim prestasi yang tidak bisa diverifikasi | Risiko reputasi saat wawancara | Setiap angka pada output harus memiliki rujukan pada catatan prestasi sumber; bila tidak ada, angka tidak boleh muncul. |

### 3.5 Fitur otomatis LinkedIn yang harus diketahui chatbot

- **Notifikasi perubahan profil.** Perubahan pada Experience dan Education memicu pemberitahuan ke jaringan. Toggle "Notify network" muncul di form saat menambah posisi, dan pengaturan permanennya ada di **Settings & Privacy → Visibility → Share job changes, education changes, and work anniversaries from profile**. Toggle harus dimatikan **sebelum** melakukan perubahan; mematikan setelahnya tidak menarik kembali notifikasi yang sudah terkirim. Notifikasi bisa muncul hingga dua jam setelah perubahan.
- **Penambahan sertifikasi** umumnya tidak memicu notifikasi sebesar perubahan posisi; LinkedIn menawarkan opsi membagikan sebagai post setelah sertifikat ditambahkan, dan banyak penerbit badge menyediakan tombol "Add to LinkedIn Profile" yang mengisi field secara otomatis.
- **Notifikasi kehadiran event** diatur terpisah pada pengaturan event tersebut.
- **Post otomatis yang dihasilkan LinkedIn bersifat generik.** Justru di sinilah nilai tambah sistem: menulis post naratif yang jauh lebih baik daripada kartu ucapan bawaan.

> **Urutan publikasi yang disarankan sistem:** (1) matikan toggle notifikasi bila tidak ingin broadcast otomatis; (2) tambahkan entri ke section profil; (3) perbarui Headline/Skills bila perlu; (4) unggah bukti ke Featured; (5) baru terbitkan post naratif. Urutan ini mencegah jaringan menerima dua sinyal terpisah untuk satu peristiwa.

---

## Aturan Penempatan Prestasi (Achievement Router)

Ini adalah jantung sistem: pertanyaan "prestasi ini sebaiknya dikirim sebagai apa" dijawab oleh rule engine deterministik, bukan oleh LLM. LLM hanya bertugas mengekstraksi atribut dari deskripsi bebas menjadi objek terstruktur, lalu rule engine memutuskan.

### 4.1 Definisi dan kriteria kelayakan tiap destinasi

| Destinasi | Layak masuk bila | Tidak layak / risiko |
|---|---|---|
| Experience | Ada peran formal dengan judul, organisasi, dan rentang waktu: pekerjaan tetap, magang (dibayar maupun tidak), Kerja Praktek/PKL, freelance atau kontrak dengan klien jelas, promosi, peran formal di usaha sendiri | Kursus atau bootcamp tanpa hubungan kerja formal. Mencantumkannya di sini dianggap menyesatkan dan berisiko saat verifikasi referensi. |
| Licenses & Certifications | Kredensial dari penerbit pihak ketiga yang dapat diverifikasi, umumnya disertai ujian dan Credential ID/URL | Menumpuk sertifikat "completion" tanpa ujian; ini penyebab utama profil terlihat penuh tapi dangkal. |
| Courses | Mata kuliah atau pelatihan yang diikuti tanpa kredensial pihak ketiga yang kuat | Jangan mencatat ulang hal yang sudah masuk Certifications. |
| Education | Pendidikan formal berjenjang. Skripsi/tugas akhir cukup diringkas pada field Description | Kursus online singkat dan bootcamp non-akreditasi. |
| Projects | Ada deliverable konkret: aplikasi, repositori, dataset, laporan, desain, sistem yang berjalan | Kegiatan tanpa artefak (sekadar menghadiri pelatihan). |
| Honors & Awards | Pengakuan formal: juara lomba, penghargaan tingkat perusahaan, beasiswa prestasi, pengakuan industri | Penghargaan mikro atau internal tim kecil; batasi 2–3 entri paling bergengsi. |
| Publications | Karya yang diterbitkan pihak penerbit: jurnal, prosiding, buku, media dengan proses editorial | Tulisan blog pribadi atau post LinkedIn biasa. |
| Volunteer Experience | Peran berbasis kegiatan sosial pada organisasi nirlaba | Magang tidak dibayar di perusahaan komersial — itu tetap Experience. |
| Featured | Bukti visual atau tautan bernilai tinggi: badge sertifikat besar, repositori, portofolio, rekaman presentasi, artikel penting | Item kecil; Featured adalah etalase, bukan gudang. Batasi 3–5 item. |
| Post | Momen yang layak dirayakan atau diceritakan tetapi tidak cukup berbobot menjadi entri permanen; atau pendamping entri profil yang besar | Bukan pengganti entri permanen untuk kredensial besar. |
| Tidak diposting | Prestasi terlalu kecil, tidak relevan dengan role target, atau sudah terwakili entri lain yang lebih tinggi tingkatannya | — |

### 4.2 Skema atribut input

Rule engine bekerja di atas objek terstruktur berikut. Semua atribut diisi oleh modul ekstraksi (LLM + RAG), dengan konfirmasi pengguna untuk atribut yang tidak dapat disimpulkan.

```text
achievement = {
  id, title, narrative_raw,
  kind: enum[ job_role, internship, freelance_or_contract, promotion,
              volunteer_role, certification_exam, digital_badge,
              mooc_completion, university_course, competition_result,
              internal_award, academic_paper, conference_paper,
              speaking_engagement, open_source_project, personal_project,
              capstone_or_thesis, one_time_short_event, community_org_role ],

  has_defined_role_and_duration : bool   // ada title + organisasi + rentang tanggal
  org_is_nonprofit_or_cause_based: bool
  is_paid                       : bool | null
  duration_days                 : number
  issuer_is_third_party_verifiable : bool  // ada credential id / url verifikasi
  issuer_prestige               : enum[none, low, high]
  required_proctored_exam       : bool
  has_tangible_artifact         : bool   // kode, aplikasi, dokumen, rekaman, demo
  is_competitive_and_won        : bool
  traction_signal               : bool   // jumlah pengguna, bintang repo, adopsi
  is_relevant_to_target_role    : bool   // dihitung oleh Role Matcher
  relevance_score               : 0..1
  is_academic_credit_required   : bool   // KP / PKL / skripsi
  confidentiality               : enum[public, internal, restricted]
  metrics[]                     : { name, value, unit, verifiable }
  skills[]                      : string
  collaborators[]               : string
  evidence[]                    : { type, url }
  occurred_at, ended_at
  profile_stage                 : enum[student, fresh_grad, career_switcher, professional]
}
```

### 4.3 Aturan keputusan (dievaluasi berurutan, hasil dapat berlipat)

```text
RULE 1 — Peran kerja formal
IF kind IN {job_role, internship, freelance_or_contract, promotion}
   AND has_defined_role_and_duration
THEN target += Experience
     IF NOT is_paid AND org_is_nonprofit_or_cause_based
        THEN target := Volunteer_Experience   // menggantikan, bukan menambah
     // magang tidak dibayar di perusahaan komersial TETAP Experience

RULE 2 — Kerelawanan
IF kind = volunteer_role AND org_is_nonprofit_or_cause_based
THEN target += Volunteer_Experience
     IF has_tangible_artifact AND duration_days >= 30 THEN target += Projects

RULE 3 — Sertifikasi dan badge
IF kind IN {certification_exam, digital_badge} AND issuer_is_third_party_verifiable
THEN target += Licenses_Certifications
     IF issuer_prestige = high AND is_relevant_to_target_role
        THEN target += Featured, target += Post,
             propose_update(Headline), propose_update(About), propose_update(Skills)

RULE 4 — Kursus daring
IF kind = mooc_completion THEN
   IF NOT required_proctored_exam AND issuer_prestige = low THEN
      IF exists_higher_certification_in_same_skill(profile)
         THEN target := SKIP   // cukup tambahkan skill-nya
         ELSE target += Licenses_Certifications (priority = low)
   ELSE IF no_formal_certificate THEN target += Courses
   IF has_tangible_artifact THEN target += Projects   // capstone

RULE 5 — Lomba dan penghargaan
IF kind IN {competition_result, internal_award} AND is_competitive_and_won
THEN target += Honors_Awards
     IF has_tangible_artifact THEN target += Projects
     IF issuer_prestige = high THEN target += Featured, target += Post
IF kind = competition_result AND NOT is_competitive_and_won THEN
     IF has_tangible_artifact THEN target += Projects ELSE target := Post_only

RULE 6 — Publikasi
IF kind IN {academic_paper, conference_paper}
THEN target += Publications, target += Featured, target += Post

RULE 7 — Menjadi pembicara
IF kind = speaking_engagement THEN
   IF duration_days <= 1 AND issuer_prestige != high AND NOT has_tangible_artifact
      THEN target := Post_only
   ELSE IF has_tangible_artifact THEN target += Featured (rekaman/slide)
   IF diundang institusi bergengsi OR keynote berulang THEN target += Honors_Awards

RULE 8 — Proyek pribadi dan open source
IF kind IN {open_source_project, personal_project}
THEN target += Projects, target += Featured
     IF traction_signal THEN target += Post

RULE 9 — Kampus
IF kind = capstone_or_thesis
THEN target += Projects (bila ada artefak),
     propose_update(Education.description)
IF kind = internship AND is_academic_credit_required
THEN target := Experience (employment_type = Internship)   // bukan Education, bukan Volunteer

RULE 10 — Partisipasi pasif
IF kind = one_time_short_event AND duration_days <= 1
   AND NOT issuer_is_third_party_verifiable
   AND NOT is_competitive_and_won AND NOT has_tangible_artifact
THEN target := Post_only

RULE 11 — Pencegahan penumpukan (dijalankan setelah semua aturan)
IF count(Licenses_Certifications) > 7
   OR exists(entri level dasar yang skill-nya sudah dicakup entri lanjutan)
THEN prune(low_value_entries) dan usulkan pemindahan bukti ke satu tautan portofolio di Featured
IF count(Honors_Awards) > 3 THEN prune ke 3 yang paling relevan dengan role target

RULE 12 — Kerahasiaan dan notifikasi
IF confidentiality != public
THEN hapus nama klien/sistem internal, ganti dengan deskripsi generik;
     jika masih sensitif, target := SKIP dan beri alasan
IF target includes Experience OR Education
THEN tampilkan instruksi mematikan toggle "Notify network" sebelum menyimpan
```

### 4.4 Tabel keputusan untuk kasus konkret

| Prestasi | Destinasi | Alasan |
|---|---|---|
| Lulus AWS Certified Solutions Architect (ujian berbayar, ada Credential ID) | Licenses & Certifications + Featured + Post + usul perbarui Headline/Skills | Penerbit bergengsi, dapat diverifikasi, relevan dengan role target |
| Selesai kursus gratis "Intro to Python" tanpa ujian, sudah punya sertifikasi Python lanjutan | Lewati (cukup pastikan skill Python ada) | Nilai sinyal rendah dan tumpang tindih; mencegah penumpukan |
| Sertifikat kompetensi dengan ujian dan Credential ID dari lembaga pelatihan lokal | Licenses & Certifications | Ada penerbit pihak ketiga dan asesmen formal |
| Juara 1 hackathon nasional dengan produk yang benar-benar dijalankan | Honors & Awards + Projects + Featured + Post | Kompetitif, ada artefak, prestise tinggi |
| Ikut hackathon, tidak menang, prototipe tidak selesai | Post saja | Tidak kompetitif menang dan tidak ada artefak |
| Paper diterima di konferensi | Publications + Featured + Post | Ada penerbit dan tautan permanen |
| Menjadi pemateri webinar internal satu jam tanpa rekaman | Post saja | Durasi pendek, tidak dapat diverifikasi, tanpa artefak |
| Keynote di konferensi industri dengan rekaman video | Featured (video) + Honors & Awards + Post | Prestise dan ada artefak |
| Magang tiga bulan di perusahaan komersial (tidak dibayar) | Experience dengan employment type Internship | Perekrut memfilter lewat Experience |
| Kerja Praktek / PKL untuk syarat kelulusan | Experience (Internship) | Sama seperti magang, meskipun wajib akademik |
| Tugas akhir menghasilkan aplikasi yang dipakai | Projects + ringkasan di Description Education | Ada deliverable konkret |
| Promosi dari Staff ke Supervisor di perusahaan yang sama | Experience (posisi baru; otomatis dikelompokkan) | Perubahan peran formal, bukan penghargaan |
| Membuat tool open source dengan pengguna nyata | Projects + Featured + Post | Ada artefak dan sinyal adopsi |
| Panitia bakti sosial di yayasan nirlaba | Volunteer Experience | Berbasis kegiatan sosial dan nirlaba |
| Panitia konferensi profesional berskala besar (komersial) | Experience | Skala dan sifat kerja setara profesional |
| Employee of the Quarter tingkat perusahaan | Honors & Awards | Pengakuan formal dari institusi |
| Pujian informal "MVP minggu ini" dari tim kecil | Post saja, opsional | Terlalu kecil untuk entri permanen |
| Menyelesaikan proyek internal yang bersifat rahasia | Projects dengan deskripsi yang disamarkan, atau lewati | Aturan kerahasiaan mendahului aturan visibilitas |
| Sertifikasi kedaluwarsa yang tidak diperpanjang | Hapus dari profil | Menandakan profil tidak dirawat |
| Bootcamp dengan capstone project | Courses (modul) + Projects (capstone) | Pembelajaran dan deliverable dipisahkan; bukan Experience |

### 4.5 Formula penulisan yang dipakai per destinasi

| Destinasi | Formula | Contoh pola |
|---|---|---|
| Bullet Experience | XYZ: "Mencapai [X] terukur dengan [Y] melalui [Z]" | "Menurunkan waktu pemulihan gangguan jaringan 35% (dari 45 ke 29 menit rata-rata) dengan membangun dasbor pemantauan terpusat untuk 120 perangkat." |
| Deskripsi Projects | Situation – Action – Result secara naratif | Konteks masalah, keputusan teknis yang diambil beserta alasannya, hasil terukur, dan pembelajaran. |
| Honors & Awards | Apa, dari siapa, dari berapa peserta, atas dasar apa | "Juara 1 dari 84 tim, dinilai atas kelayakan teknis dan dampak operasional." |
| Certifications | Nama resmi lengkap, penerbit resmi, ID dan URL verifikasi | Hindari singkatan tidak resmi karena merusak pencocokan Boolean dan ATS. |
| About | Hook → peran dan kekuatan inti → 2–3 pencapaian terukur → arah ke depan → ajakan | Tiga kalimat pertama harus berdiri sendiri karena sisanya tersembunyi di balik "see more". |
| Post | Hook → konteks → pencapaian berangka → kredit → pelajaran → pertanyaan | Lihat Bab 3.3. |

> **Aturan integritas angka:** setiap metrik yang muncul di output harus dapat ditelusuri ke field `metrics[]` pada catatan prestasi sumber, dengan `verifiable = true`. Bila pengguna tidak dapat mempertanggungjawabkan angkanya saat wawancara, angka itu lebih berbahaya daripada tidak ada angka sama sekali. Sistem lebih baik menulis "menangani ratusan permintaan per bulan" daripada mengarang "1.284 permintaan".

---

## Cara Perekrut Menemukan Kandidat

Persona yang bagus tetapi tidak ditemukan sama saja dengan tidak ada. Bab ini menjelaskan mekanisme penemuan, yang menjadi dasar modul *Keyword Placement Planner*.

### 5.1 LinkedIn Recruiter: Boolean search

Perekrut mencari dengan operator Boolean pada field-field terpisah (Title, Company, Keywords, School, dan lain-lain). Karakteristik yang berdampak langsung pada cara kita menulis profil:

| Karakteristik | Detail | Implikasi untuk penulisan profil |
|---|---|---|
| Operator yang didukung | AND, OR, NOT, tanda kutip untuk frasa eksak, tanda kurung untuk pengelompokan | Tulis judul dan skill dalam bentuk frasa lengkap yang biasa dipakai perekrut. |
| Wildcard | Tidak didukung | Jangan mengandalkan potongan kata; tulis bentuk penuh. |
| Stemming | Ada, terbatas (manage → manager, management) | Tidak menutupi perbedaan penulisan teknis seperti Node.js vs NodeJS. |
| Panjang query | Sekitar 300 karakter per field | Perekrut hanya memuat beberapa varian; pilih varian paling umum. |
| Field Title | Mencocokkan judul posisi saat ini dan sebelumnya secara ketat | Judul posisi harus memakai istilah pasar, bukan istilah internal perusahaan. |
| Filter Location | Bersifat filter keras | Lokasi harus terisi dan sesuai target pasar kerja. |

Contoh query yang lazim dipakai perekrut, untuk diuji sebagai test case sistem:

```text
("Data Engineer" OR "Analytics Engineer") AND (Python OR PySpark) AND (Airflow OR dbt)
("Network Engineer" OR "Infrastructure Engineer") AND (CCNA OR CCNP) AND (BGP OR OSPF)
("OT Security" OR "ICS Security" OR "SCADA") AND ("IEC 62443" OR NERC) NOT (sales OR recruiter)
```

> **Strategi redundansi terkendali:** karena bobot antar-field tidak pernah dipublikasikan dan sumber pihak ketiga saling bertentangan (sebagian menyebut Headline dominan, sebagian menyebut Experience dominan), sistem menempatkan setiap keyword inti di lima titik: **Headline, Job Title, tiga Skill teratas, satu kalimat About, dan satu bullet Experience.** Redundansi ini bukan keyword stuffing selama setiap kemunculannya berada dalam kalimat yang wajar.

### 5.2 Spotlights dan sinyal perilaku

Selain teks profil, LinkedIn Recruiter menandai kandidat dengan label yang sebagian besar berasal dari perilaku, bukan dari isi profil.

| Spotlight | Arti | Bisa dipengaruhi sistem? |
|---|---|---|
| Open to Work | Kandidat mengaktifkan sinyal mencari kerja (mode privat khusus perekrut atau publik dengan bingkai hijau) | Ya — sistem menyarankan mengaktifkan mode privat, mengisi hingga 5 judul pekerjaan target, lokasi, jenis pekerjaan, dan tipe tempat kerja |
| Recently active | Aktif dalam kurang lebih 30 hari terakhir | Ya — jadwal posting prestasi secara tidak langsung menjaga status ini |
| Past applicant | Pernah melamar ke perusahaan tersebut | Tidak langsung |
| Company alumni | Pernah bekerja di perusahaan yang sama dengan tim perekrut | Ya, secara tidak langsung — alasan kuat untuk **tidak menghapus riwayat kerja lama** dari profil |
| Engaged with talent brand | Pernah berinteraksi dengan konten perusahaan | Ya — sistem dapat menyarankan mengikuti dan berkomentar pada halaman perusahaan target |
| Likelihood of interest | Skor prediktif berbasis aktivitas pencarian kerja | Tidak langsung |

### 5.3 Kelengkapan profil

LinkedIn memiliki pengukur kekuatan profil dengan tingkat tertinggi "All-Star". Syarat umumnya: foto profil, minimal satu posisi dengan deskripsi, pendidikan, minimal lima skill, ringkasan About, lokasi dan industri terisi, serta minimal 50 koneksi. Klaim populer bahwa profil lengkap dilihat berkali-kali lipat lebih sering banyak diulang tanpa sumber resmi, sehingga diperlakukan sebagai heuristik. Yang pasti dan lebih penting: **field yang kosong tidak menghasilkan keyword apa pun**, sehingga profil tidak akan muncul pada pencarian Boolean apa pun terlepas dari mekanisme peringkatnya.

### 5.4 Skills dan Skills Match

- Terdapat perbedaan sumber mengenai batas maksimum skill (50 versus 100). Target praktis yang aman: 45–50 skill yang benar-benar dikuasai.
- Tiga skill teratas dapat disematkan (sebagian sumber menyebut lima). Slot pertama ini adalah sinyal visual terkuat — isi dengan skill role prioritas pertama.
- Skill dapat dikaitkan ke entri Experience, Education, dan Certifications tertentu. Pengaitan ini memperkuat fitur Skills Match yang membandingkan skill profil dengan skill pada lowongan.
- Perekrut dapat memfilter berdasarkan kecocokan skill, bukan hanya judul pekerjaan — inilah jalur masuk bagi kandidat lintas bidang yang judul jabatannya berbeda tetapi skill-nya relevan.
- Endorsement berfungsi sebagai bukti sosial; bobot pastinya terhadap peringkat tidak dikonfirmasi.
- Skill Assessment sudah tidak tersedia — jangan menyarankannya.

#### Cara memilih skill secara sistematis

1. Ambil 5–8 lowongan nyata untuk role target.
2. Ekstraksi frasa skill dari bagian requirements, hitung frekuensinya.
3. Ambil 10–15 skill dengan frekuensi tertinggi yang benar-benar dikuasai pengguna sebagai inti.
4. Isi sisanya dengan skill pendukung dan varian penulisan yang umum.
5. Sematkan tiga skill yang paling dekat dengan role prioritas pertama.

### 5.5 LinkedIn versus ATS: dua mesin yang berbeda

| Aspek | LinkedIn Recruiter | ATS |
|---|---|---|
| Sumber data | Field terstruktur yang sudah rapi | Hasil parsing dokumen PDF/DOCX yang diunggah — rawan gagal baca |
| Mekanisme | Boolean search aktif oleh perekrut | Pencocokan keyword otomatis terhadap deskripsi lowongan, sering dengan skor |
| Sensitivitas format visual | Rendah | Sangat tinggi |
| Risiko utama | Tidak muncul karena keyword tidak ada | Tidak terbaca karena format dokumen merusak parsing |

#### Yang merusak parsing ATS (relevan bila sistem juga mengekspor CV)

- Tabel dan tata letak multi-kolom — parser membaca per baris halaman sehingga isi antar kolom tercampur.
- Text box dan layer grafis dari aplikasi desain — isinya bisa hilang seluruhnya.
- Kontak yang diletakkan di header atau footer dokumen — banyak ATS mengabaikan area ini.
- Font tidak standar, ikon, dan emoji — berubah menjadi karakter rusak.
- Diagram batang tingkat penguasaan skill — tidak terbaca sebagai teks; tulis eksplisit, misalnya "Python (mahir)".
- Judul section kreatif — gunakan judul standar: Work Experience, Education, Skills, Certifications.
- Format tanggal tidak konsisten — gunakan pola seragam seperti "Jan 2021 – Mar 2023".

> **Aturan penulisan ganda:** tulis bentuk panjang beserta singkatannya pada kemunculan pertama, misalnya "Retrieval-Augmented Generation (RAG)", "Site Reliability Engineering (SRE)", "Operational Technology (OT)". Ini membuat satu tulisan cocok baik untuk pencarian yang memakai singkatan maupun yang memakai bentuk panjang.

---

## Persona: Memformat Diri sebagai Role yang Diincar

Bab ini menjawab dua pertanyaan Anda sekaligus: "format persona sebagai role apa" dan "pekerjaan apa yang sedang diincar". Keduanya diformalkan menjadi satu objek konfigurasi yang menjadi sumber kebenaran bagi seluruh proses generasi.

### 6.1 Objek Target Role Profile

```text
target_role_profile = {
  primary: {
    role_key       : "ai_ml_engineer",
    display_titles : ["AI Engineer", "Machine Learning Engineer", "Applied AI Engineer"],
    seniority      : "mid",
    must_have_keywords : ["Python", "RAG", "LLM", "Vector Database", "Docker"],
    nice_to_have       : ["LangGraph", "vLLM", "Kubernetes"],
    valued_certifications : ["AWS Certified Machine Learning", "Azure AI Engineer Associate"],
    valued_metrics : ["latency", "biaya token", "akurasi", "jumlah pengguna"]
  },
  secondary: { role_key: "ot_it_cybersecurity", weight: 0.35 },
  common_thread  : "membangun sistem cerdas di lingkungan industri",
  target_market  : { locations: ["Indonesia"], work_type: ["On-site","Hybrid"] },
  language_policy: { profile: "en", posts: "id_with_en_terms" },
  exclusions     : ["sales", "recruiting"]   // jangan pernah dimunculkan
}
```

Objek ini dipakai pada empat titik: (1) filter metadata saat retrieval, (2) skor relevansi tiap prestasi, (3) rubrik penilaian output, (4) analisis kesenjangan keyword antara profil saat ini dan role target.

### 6.2 Formula Headline

Pola dasar yang berlaku lintas role, dengan batas 220 karakter dan 80 karakter pertama sebagai bagian paling kritis:

```text
[Seniority] [Job Title yang dicari perekrut] | [2-3 hard skill/tools] | [nilai atau dampak]
```

| Role | Contoh headline |
|---|---|
| AI/ML Engineer | Machine Learning Engineer \| RAG, LLM Ops, Python, Vector Search \| Membawa model dari notebook ke produksi |
| Cloud/DevOps | DevOps Engineer \| Kubernetes, Terraform, GitLab CI \| Menurunkan waktu rilis dari jam menjadi menit |
| Network/Infrastructure | Network Engineer \| BGP, OSPF, SD-WAN, Fiber Optic \| Menjaga jaringan pabrik 24/7 tetap tersedia |
| OT/IT Cybersecurity | OT/ICS Cybersecurity Engineer \| IEC 62443, Purdue Model, SCADA/DCS \| Mengamankan aset kritis tanpa menghentikan produksi |
| Data Engineer | Data Engineer \| Spark, Airflow, dbt, Snowflake \| Membangun pipeline yang bisa dipercaya tim bisnis |
| Automation/Instrumentation | Instrumentation & Control Engineer \| PLC, DCS, HART, Functional Safety \| Meningkatkan keandalan proses dan menekan downtime |
| Multi-role (T-shaped) | IT Infrastructure & Automation Professional \| Network, OT Security, Python Automation \| Menghubungkan dunia IT dan OT di industri proses |

- Hindari kata kosong seperti "passionate", "ninja", "enthusiast" — tidak ada perekrut yang mencarinya lewat Boolean.
- Maksimal 2–3 judul role eksplisit. Lebih dari itu justru mengencerkan sinyal pada field Title.
- Jangan mengganti positioning secara drastis dan berulang; konsistensi membangun otoritas topik pada algoritma sekaligus kredibilitas pada manusia.

### 6.3 Struktur About

Tujuh blok berikut menjadi template generator, dengan alokasi karakter agar total tetap di bawah 2.600 dan tiga kalimat pertama berdiri sendiri.

| Blok | Alokasi | Isi |
|---|---|---|
| 1. Hook | ~200 karakter | Pernyataan posisi yang bisa dibaca berdiri sendiri sebelum tombol "see more" |
| 2. Peran dan kekuatan inti | ~250 karakter | Jabatan saat ini, domain, dan kompetensi teknis utama |
| 3. Pencapaian terkuantifikasi | ~700 karakter | 2–4 butir dengan formula XYZ, diambil dari prestasi berskor relevansi tertinggi |
| 4. Cara kerja / pendekatan | ~400 karakter | Bagaimana masalah biasanya diselesaikan; membedakan dari kandidat lain |
| 5. Kompetensi role sekunder | ~300 karakter | Hanya bila ada role sekunder; disambungkan lewat common thread |
| 6. Sisi manusia | ~250 karakter | Kontribusi komunitas, open source, mentoring — memberi tekstur |
| 7. Arah dan ajakan | ~200 karakter | Ke mana ingin melangkah dan cara menghubungi |

### 6.4 Menyasar beberapa role tanpa terlihat tidak fokus

1. **Temukan benang merah.** Cari tema yang menyatukan seluruh role target, lalu jadikan itu narasi utama. Contoh untuk profil IT industri: "menghubungkan sistem IT dan OT di lingkungan pabrik" menyatukan infrastruktur, keamanan OT, dan otomasi.
2. **Gunakan headline berbentuk T.** Bagian horizontal berupa payung yang menangkap pencarian umum, bagian vertikal berupa 2–3 tools spesifik yang menangkap pencarian Boolean.
3. **Batasi role eksplisit maksimal tiga.**
4. **Atur urutan skill berdasarkan prioritas.** Tiga slot pertama untuk role prioritas satu; role sekunder mengisi urutan berikutnya, bukan slot yang disematkan.
5. **Tulis bullet Experience yang bercabang dua.** Pada satu posisi yang relevan untuk dua role, buat bullet terpisah yang masing-masing menonjolkan sisi berbeda, sehingga keyword kedua role sama-sama terindeks.
6. **Arahkan About ke depan, bukan ke belakang.** Persona adalah alat untuk mencapai posisi berikutnya, bukan sekadar ringkasan riwayat.

### 6.5 Analisis kesenjangan keyword

Modul ini menghitung selisih antara keyword yang dituntut role target dan keyword yang benar-benar ada di profil, lalu mengubahnya menjadi antrean pekerjaan.

```text
gap_report = {
  role_key: "ai_ml_engineer",
  coverage: 0.62,
  missing_must_have: ["Vector Database", "Docker"],
  present_but_weak: [
     { keyword: "RAG", found_in: ["about"], missing_in: ["headline","skills","experience"] }
  ],
  actions: [
     { type: "add_skill", value: "Vector Databases (Qdrant, pgvector)" },
     { type: "rewrite_headline", reason: "keyword utama belum ada di 80 karakter pertama" },
     { type: "request_achievement", prompt: "Adakah proyek yang memakai Docker? Ceritakan singkat." }
  ]
}
```

> **Aksi request_achievement adalah fitur kunci:** ketika sistem menemukan kesenjangan, ia tidak mengarang pengalaman — ia **meminta prestasi baru kepada pengguna**. Inilah yang membuat sistem penyimpanan prestasi dan RAG saling mengisi: kesenjangan pada persona menjadi permintaan input, dan input baru menutup kesenjangan.

---

## Blueprint Sistem RAG

Bagian ini menerjemahkan seluruh riset menjadi rancangan sistem yang dapat dibangun. Prinsip utamanya: **pengetahuan platform ada di knowledge base, keputusan ada di rule engine, dan LLM hanya bertugas mengekstraksi serta menulis.**

### 7.1 Arsitektur tingkat tinggi

```text
   [ Sumber prestasi ]                 [ Knowledge Base (vektor + keyword) ]
   form / chat / import                KB-PLATFORM  mekanik & field LinkedIn
          |                            KB-RULES     aturan penempatan
          v                            KB-STYLE     pola tulisan & algoritma feed
   1. INGEST & NORMALISASI             KB-ROLE      taxonomy role IT
          |                            KB-USER      profil, riwayat, gaya bahasa
          v                                   |
   2. EKSTRAKSI ATRIBUT  <---- retrieval -----+
      (LLM terstruktur)                       |
          |                                   |
          v                                   |
   3. ROLE MATCHER  <------------------------+
      skor relevansi terhadap target_role_profile
          |
          v
   4. ACHIEVEMENT ROUTER   (rule engine deterministik, 12 aturan)
      keluar: daftar destinasi + alasan + aturan yang menyala
          |
          v
   5. GENERATOR PER KANAL  <---- retrieval KB-PLATFORM + KB-STYLE + KB-USER
      payload Experience / Certification / Project / Post / Headline / About
          |
          v
   6. VALIDATOR   batas karakter, frasa terlarang, integritas angka,
                  kerahasiaan, kesesuaian keyword role
          |
          v
   7. HUMAN REVIEW (wajib)  -> setujui / revisi / tolak
          |
          v
   8. EKSPOR  payload + instruksi UI langkah demi langkah + checklist urutan publikasi
          |
          v
   9. FEEDBACK LOOP -> simpan versi final & suntingan manusia ke KB-USER
```

Tahap 7 tidak boleh dilewati. Selain alasan kualitas, ada alasan teknis: mengedit post setelah publikasi menurunkan jangkauan, dan menghapus entri profil yang salah meninggalkan jejak notifikasi yang sudah terkirim ke jaringan.

### 7.2 Skema data prestasi (sistem penyimpanan prestasi)

Ini adalah kontrak antara aplikasi penyimpanan prestasi milik Anda dan sistem RAG. Semakin lengkap field terisi saat input, semakin sedikit pekerjaan ekstraksi dan semakin sedikit halusinasi.

```text
{
  "id": "ACH-2026-014",
  "created_at": "2026-03-14T09:12:00+08:00",
  "title": "AWS Certified Solutions Architect - Associate",
  "narrative_raw": "teks bebas dari pengguna, bahasa apa pun",
  "kind": "certification_exam",
  "occurred_at": "2026-03-11",  "ended_at": null,
  "organization": { "name": "Amazon Web Services", "type": "vendor", "prestige": "high" },
  "credential": {
    "id": "AWS-SAA-XXXXXX",
    "url": "https://verify.example/...",
    "expires_at": "2029-03-11",
    "proctored_exam": true
  },
  "role_context": { "position": "IT Infrastructure Engineer", "employer": "..." },
  "duration_days": 1,
  "is_paid": null,
  "artifacts": [ { "type": "badge", "url": "..." } ],
  "metrics": [ { "name": "skor", "value": 842, "unit": "/1000", "verifiable": true } ],
  "skills": ["AWS","VPC","IAM","High Availability"],
  "collaborators": [],
  "confidentiality": "public",
  "evidence_level": "verified",        // verified | self_reported | claimed
  "language_of_source": "id",
  "user_notes": "hal yang tidak boleh disebut di publik"
}
```

#### Field yang paling sering kosong dan cara sistem menanganinya

| Field | Dampak bila kosong | Strategi |
|---|---|---|
| metrics | Post menjadi generik dan berisiko ditekan sebagai konten dangkal | Chatbot mengajukan pertanyaan lanjutan spesifik: "Berapa lama sebelumnya dan berapa sesudahnya?" |
| confidentiality | Risiko membocorkan informasi internal perusahaan | Default aman: `internal`. Sistem hanya menaikkan ke `public` setelah pengguna mengonfirmasi. |
| issuer_prestige | Salah menentukan apakah layak masuk Featured | Diisi dari KB-ROLE (daftar sertifikasi yang dihargai per role); bila tidak dikenal, default `low` dan ditanyakan. |
| artifacts | Prestasi bagus jatuh ke Post-only padahal layak jadi Projects | Sistem bertanya eksplisit: "Apakah ada tautan, dokumen, repositori, atau rekaman?" |

### 7.3 Rancangan knowledge base

Lima korpus terpisah, masing-masing dengan strategi chunking dan filter yang berbeda. Pemisahan ini penting: pertanyaan mekanis ("di mana tombolnya") dan pertanyaan gaya ("bagaimana menulis hook") membutuhkan konteks yang berbeda dan tidak boleh saling mengotori.

| Korpus | Isi | Unit chunk | Kapan diambil |
|---|---|---|---|
| KB-PLATFORM | Bab 2 dan 3.5 dokumen ini: section, field, batas karakter, jalur UI, indeksasi, fitur yang sudah dihapus | Satu chunk per section LinkedIn (150–400 token), disertai tabel field utuh | Saat menyusun payload, saat menjawab pertanyaan "bagaimana caranya" |
| KB-RULES | Bab 4: definisi destinasi, 12 aturan, 20 kasus contoh | Satu chunk per aturan dan per kasus contoh | Saat routing ambigu dan saat menjelaskan alasan keputusan |
| KB-STYLE | Bab 3: algoritma, format, anatomi post, larangan, formula XYZ/SAR | Satu chunk per pola atau larangan | Saat generasi teks |
| KB-ROLE | Lampiran A: 15 role IT beserta judul, skill, sertifikasi, metrik | Satu chunk per role | Saat Role Matcher dan penyusunan Headline/Skills |
| KB-USER | Profil pengguna saat ini, seluruh prestasi terdahulu, post yang sudah terbit, suntingan manusia, gaya bahasa | Satu chunk per prestasi dan per post | Hampir selalu — untuk konsistensi dan mencegah duplikasi |

#### Metadata wajib pada setiap chunk

```text
{
  "doc_id": "kbp-experience-001",
  "kb": "KB-PLATFORM",
  "linkedin_section": "experience",       // filter utama
  "topic": ["field_spec","ui_path","char_limit"],
  "role_family": ["*"],                   // atau ["ai_ml","cybersecurity", ...]
  "confidence_level": "A",                // A resmi | B riset | C komunitas
  "status": "active",                     // active | deprecated
  "source_url": "...",
  "last_verified": "2026-09-04",
  "locale": "id",
  "conflicts_with": ["kbp-skills-limit-100"]
}
```

> **Dua metadata yang sering dilupakan tetapi menentukan:** `status: deprecated` mencegah sistem menyarankan Skill Assessment atau Creator Mode, dan `confidence_level` memaksa chatbot memberi kualifikasi ketika menjawab dari sumber tingkat C. Tanpa keduanya, sistem akan terdengar sama yakinnya saat menyebut batas karakter (fakta) dan saat menyebut "golden hour" (dugaan).

#### Strategi chunking dan retrieval

- **Chunk kecil untuk pencarian, dokumen induk untuk konteks.** Indeks berisi potongan 150–400 token; ketika sebuah potongan terpilih, yang dikirim ke LLM adalah section induknya secara utuh. Ini penting karena tabel field tidak boleh terpotong di tengah.
- **Pencarian hibrida.** Gabungkan pencarian vektor dengan pencarian kata kunci (BM25) lalu gabungkan peringkatnya. Istilah seperti "Credential URL", "IEC 62443", atau "OSPF" adalah token langka yang sering meleset pada pencarian vektor murni.
- **Filter metadata sebelum peringkat.** Setiap permintaan retrieval menyertakan filter `kb` dan, bila diketahui, `linkedin_section` serta `role_family`. Ini mencegah aturan gaya menulis muncul saat yang dibutuhkan adalah spesifikasi field.
- **Kuota per korpus, bukan top-k global.** Contoh konfigurasi generasi post: KB-STYLE 5 chunk, KB-PLATFORM 2, KB-USER 4, KB-ROLE 2. Tanpa kuota, satu korpus akan mendominasi konteks.
- **Reranker lintas-bahasa.** Karena catatan prestasi berbahasa Indonesia sedangkan istilah LinkedIn berbahasa Inggris, gunakan model embedding dan reranker multibahasa; uji khusus untuk kueri campur kode.
- **Perluasan kueri.** Sebelum retrieval, perluas kueri dengan sinonim dari KB-ROLE, misalnya "sertifikat" → "certification, licenses, credential, badge".

### 7.4 Alur pemrosesan langkah demi langkah

| Tahap | Masukan | Proses | Keluaran | Model |
|---|---|---|---|---|
| 1. Ingest | Form atau percakapan | Normalisasi tanggal, deteksi bahasa, deduplikasi terhadap KB-USER | Draf record | Tanpa LLM |
| 2. Ekstraksi | narrative_raw + KB-ROLE | Isi seluruh atribut boolean dan enum; tandai yang tidak yakin | Record terstruktur + daftar pertanyaan | LLM dengan structured output |
| 3. Klarifikasi | Daftar pertanyaan | Tanya pengguna maksimal 3 pertanyaan sekaligus, paling berdampak dahulu | Record lengkap | Dialog |
| 4. Role Matcher | Record + target_role_profile + KB-ROLE | Hitung relevance_score dari irisan skill, kesesuaian metrik, dan kedekatan judul | Skor 0–1 + keyword yang tertutupi | Deterministik + embedding |
| 5. Router | Record lengkap | Jalankan 12 aturan; kumpulkan aturan yang menyala | Destinasi + alasan | Deterministik |
| 6. Generator | Destinasi + konteks retrieval | Satu panggilan per kanal, bukan satu panggilan untuk semua | Payload per kanal | LLM |
| 7. Validator | Payload | Cek 8 kategori (lihat 7.6) | Lolos / daftar pelanggaran | Deterministik + LLM juri |
| 8. Review | Payload valid | Tampilkan bersama alasan dan aturan yang menyala | Persetujuan | Manusia |
| 9. Ekspor | Payload disetujui | Susun instruksi UI dan urutan publikasi | Paket siap salin-tempel | Template |

> **Mengapa satu panggilan LLM per kanal:** gaya bahasa Headline, deskripsi Experience, dan post feed sangat berbeda. Menggabungkannya dalam satu prompt membuat model mencampur register dan hampir selalu melanggar batas karakter salah satu kanal. Pemisahan juga membuat kegagalan mudah dilacak dan biaya mudah dikendalikan.

### 7.5 Skema keluaran

```text
{
  "achievement_id": "ACH-2026-014",
  "classification": {
    "primary_section": "licenses_certifications",
    "secondary_sections": ["featured", "post"],
    "profile_updates": ["headline", "skills", "about"],
    "rules_fired": ["RULE-3", "RULE-3b"],
    "confidence": 0.94,
    "reasoning_id": "penerbit bergengsi, terverifikasi, relevan role utama",
    "alternatives_considered": [ { "section": "courses", "rejected_because": "ada ujian proctored" } ]
  },
  "role_alignment": { "role_key": "ai_ml_engineer", "relevance_score": 0.88,
                      "keywords_covered": ["AWS","High Availability"] },
  "payloads": {
    "licenses_certifications": {
      "name": "AWS Certified Solutions Architect - Associate",
      "issuing_organization": "Amazon Web Services",
      "issue_date": "2026-03", "expiration_date": "2029-03",
      "credential_id": "AWS-SAA-XXXXXX", "credential_url": "https://...",
      "skills": ["AWS","VPC","IAM","High Availability","Cost Optimization"]
    },
    "featured": { "type": "link", "title": "...", "url": "..." },
    "post": {
      "format": "text_image",
      "hook": "...",            // <= 140 karakter
      "body": "...",
      "cta": "...",
      "hashtags": ["#CloudEngineering","#AWS"],
      "mentions": [],
      "char_count": 1780,
      "suggested_publish_after": "2026-03-25"
    },
    "headline": { "current": "...", "proposed": "...", "char_count": 187 }
  },
  "ui_instructions": [
    { "step": 1, "action": "Matikan Settings > Visibility > Share job changes ...",
      "why": "mencegah notifikasi ganda" },
    { "step": 2, "action": "View Profile > Add profile section > Recommended >
                 Add licenses & certifications", "fields": { ... } }
  ],
  "validation": { "passed": true, "warnings": ["headline 187/220 karakter"] },
  "provenance": [ { "claim": "batas 220 karakter", "doc_id": "kbp-headline-001",
                    "confidence_level": "B", "last_verified": "2026-09-04" } ]
}
```

### 7.6 Validator: delapan pemeriksaan wajib

| Pemeriksaan | Cara kerja | Aksi bila gagal |
|---|---|---|
| Batas karakter | Bandingkan dengan tabel di Bab 2.2 untuk setiap field | Tolak dan minta regenerasi dengan target panjang eksplisit |
| Panjang hook | Kalimat pertama post harus utuh dalam 140 karakter | Regenerasi hanya bagian hook |
| Integritas angka | Setiap angka pada output harus cocok dengan `metrics[]` sumber | Hapus angka atau minta konfirmasi pengguna |
| Frasa terlarang | Daftar hitam: pembuka klise, engagement bait, klaim superlatif tanpa bukti | Regenerasi bagian terkait |
| Kekhasan (anti konten generik) | Hitung jumlah entitas spesifik: nama sistem, angka, organisasi, tanggal. Minimal 2 untuk post | Kembalikan ke tahap klarifikasi untuk meminta detail |
| Kerahasiaan | Cocokkan dengan daftar istilah internal dan `user_notes`; periksa nama klien dan sistem produksi | Samarkan atau blokir |
| Kesesuaian keyword role | Pastikan minimal satu must_have_keyword muncul secara wajar | Beri saran penyisipan, bukan penambahan paksa |
| Duplikasi | Bandingkan kemiripan dengan post terdahulu di KB-USER | Peringatkan bila terlalu mirip dengan konten 90 hari terakhir |

### 7.7 Tumpukan teknologi yang disarankan

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Penyimpanan prestasi | PostgreSQL | Data terstruktur, relasi ke pengguna dan versi, mudah diaudit |
| Indeks vektor | pgvector pada Postgres yang sama, atau Qdrant bila korpus tumbuh besar | Menghindari sinkronisasi dua basis data selama korpus masih kecil (di bawah ratusan ribu chunk) |
| Pencarian kata kunci | Full-text search bawaan Postgres atau OpenSearch | Diperlukan untuk istilah teknis langka |
| Embedding | Model multibahasa yang menangani Indonesia dan Inggris dalam satu ruang | Catatan prestasi berbahasa Indonesia, istilah platform berbahasa Inggris |
| Reranker | Cross-encoder multibahasa | Menaikkan presisi pada kueri campur kode |
| Orkestrasi | n8n untuk alur, dengan layanan Python terpisah untuk rule engine dan validator | Selaras dengan pola BADI yang sudah Anda jalankan; rule engine sebaiknya kode, bukan node visual, agar dapat diuji regresi |
| Routing LLM | Model kecil untuk ekstraksi dan validasi, model besar untuk penulisan naskah | Sebagian besar panggilan adalah ekstraksi terstruktur yang tidak memerlukan model besar |
| Antarmuka | Web app untuk input prestasi dan halaman review; chatbot untuk tanya jawab mekanik LinkedIn | Review adalah tahap wajib sehingga butuh antarmuka yang nyaman, bukan chat murni |

> **Catatan integrasi:** sistem ini tidak memublikasikan ke LinkedIn secara otomatis. Publikasi otomatis untuk profil pribadi berada di wilayah abu-abu ketentuan layanan LinkedIn dan berisiko terhadap akun. Rancangan ini berhenti pada "paket siap salin-tempel beserta instruksi klik", yang justru sejalan dengan kebutuhan review manusia dan dengan penalti mengedit post setelah publikasi.

---

## Konfigurasi Chatbot

Chatbot memiliki dua mode yang berbagi knowledge base tetapi berbeda kebijakan jawaban.

| Mode | Tujuan | Sumber utama | Gaya jawaban |
|---|---|---|---|
| Mode Panduan (How-to) | Menjawab "apa yang harus diisi, di mana, bagaimana caranya, berapa batasnya" | KB-PLATFORM | Langkah bernomor, sebutkan jalur menu persis, sertakan batas karakter dan tanggal verifikasi |
| Mode Penyusun (Composer) | Menerima prestasi lalu menghasilkan payload dan naskah | Seluruh korpus + rule engine | Tanya dulu bila data kurang, tampilkan alasan keputusan, selalu berakhir pada review manusia |

### 8.1 System prompt inti

```text
PERAN
Anda adalah asisten yang membantu satu pengguna membangun persona profesional
di LinkedIn dan memformat catatan prestasinya. Anda bukan penulis konten umum.

SUMBER KEBENARAN
1. Seluruh fakta tentang mekanisme LinkedIn HARUS berasal dari konteks yang
   diberikan (KB-PLATFORM, KB-RULES, KB-STYLE, KB-ROLE). Jangan menjawab dari
   ingatan sendiri. LinkedIn berubah cepat dan sebagian fitur yang Anda ingat
   sudah dihapus.
2. Bila konteks tidak memuat jawaban, katakan tidak tahu dan sebutkan apa yang
   perlu diverifikasi langsung di aplikasi LinkedIn.
3. Setiap chunk membawa confidence_level. Untuk tingkat C, jawab dengan
   kualifikasi ("menurut praktisi, belum dikonfirmasi LinkedIn").
4. Jangan pernah menyarankan fitur berstatus deprecated.

KEPUTUSAN PENEMPATAN
5. Keputusan destinasi prestasi diambil oleh alat classify_achievement.
   Jangan menebak sendiri. Tugas Anda menjelaskan hasilnya dengan bahasa manusia.

INTEGRITAS
6. DILARANG mengarang angka, nama organisasi, tanggal, atau pencapaian.
   Bila data kurang, ajukan pertanyaan, jangan mengisi sendiri.
7. Bila prestasi menyangkut informasi internal perusahaan, samarkan detail
   yang sensitif dan konfirmasikan kepada pengguna sebelum melanjutkan.
8. Semua keluaran adalah draf yang harus disetujui pengguna sebelum dipakai.

GAYA
9. Bahasa percakapan: Indonesia. Istilah antarmuka LinkedIn tetap Inggris.
10. Naskah profil mengikuti language_policy pada target_role_profile.
11. Hindari pembuka klise dan engagement bait. Hindari nada memamerkan:
    ceritakan proses dan pelajaran, beri kredit ke pihak lain.
12. Untuk pertanyaan mekanis, jawab dengan langkah bernomor, bukan paragraf.

BATASAN
13. Patuhi batas karakter yang tercantum di konteks; sebutkan hitungan karakter
    pada setiap naskah yang Anda hasilkan.
14. Maksimal 3 hashtag dan 5 mention.
15. Jangan menyarankan otomatisasi publikasi, pembelian engagement, atau pod.
```

### 8.2 Alat (tools) yang tersedia bagi agent

| Alat | Masukan | Keluaran | Catatan |
|---|---|---|---|
| search_kb | query, kb[], linkedin_section?, role_family?, k | Chunk beserta metadata | Wajib dipanggil sebelum menjawab pertanyaan faktual apa pun |
| classify_achievement | objek achievement | Destinasi, aturan yang menyala, confidence | Rule engine deterministik; bukan LLM |
| get_role_taxonomy | role_key | Judul, skill, sertifikasi, metrik | Dipakai untuk Headline, Skills, dan pertanyaan lanjutan |
| analyze_keyword_gap | profil saat ini, target_role_profile | coverage, missing, actions | Menghasilkan permintaan prestasi baru |
| draft_payload | destinasi, achievement, konteks | Payload per kanal | Satu panggilan per kanal |
| validate_payload | payload | passed, violations[] | Delapan pemeriksaan pada Bab 7.6 |
| save_achievement / update_profile_state | record | ack | Menulis ke KB-USER untuk konsistensi berikutnya |

### 8.3 Kebijakan dialog

1. **Selalu retrieval sebelum menjawab fakta.** Termasuk untuk pertanyaan yang tampak sepele seperti batas karakter.
2. **Maksimal tiga pertanyaan sekaligus,** diurutkan berdasarkan dampaknya terhadap kualitas keluaran. Pertanyaan tentang angka dan artefak selalu didahulukan.
3. **Tampilkan keputusan sebelum naskah.** Pengguna melihat "prestasi ini masuk ke Certifications + Featured + Post karena ..." lebih dahulu, baru naskahnya. Ini membangun kepercayaan sekaligus memudahkan koreksi.
4. **Sediakan jalur bantahan.** Bila pengguna tidak setuju dengan penempatan, sistem mencatat penolakan beserta alasannya sebagai data untuk penyempurnaan aturan — bukan langsung mengubah aturan.
5. **Jangan menawarkan publikasi otomatis.** Akhiri dengan paket salin-tempel dan checklist urutan langkah.
6. **Selalu sertakan hitungan karakter** pada setiap naskah agar pengguna dapat memangkas sendiri bila perlu.

### 8.4 Contoh percakapan Mode Panduan

```text
Pengguna : Sertifikat saya isinya di mana ya, dan apa saja yang harus diisi?

Agent    : [search_kb(kb=["KB-PLATFORM"], linkedin_section="certifications")]

Jawaban  : Lokasinya di section Licenses & Certifications.
           Langkah (desktop):
           1. Klik Me > View Profile
           2. Klik Add profile section
           3. Buka kelompok Recommended
           4. Pilih Add licenses & certifications
           Field yang perlu diisi:
           - Name: tulis nama resmi lengkap sesuai penerbit, jangan disingkat
           - Issuing organization: pilih dari daftar agar logonya ikut tampil
           - Issue date dan Expiration date (bulan dan tahun)
           - Credential ID dan Credential URL bila tersedia
           - Skills: kaitkan 2 sampai 5 skill yang dibuktikan sertifikat ini
           Catatan: Skill Assessment sudah dihentikan LinkedIn, jadi tidak ada
           badge tes yang bisa ditambahkan. (diverifikasi 4 September 2026)
```

---

## Contoh End-to-End

Tiga contoh berikut menelusuri satu prestasi dari input mentah hingga paket siap pakai. Contoh sengaja dipilih dari tiga tipe berbeda agar dapat dijadikan test case regresi.

### 9.1 Contoh A — Sertifikasi vendor besar

#### Input mentah

```text
"Kemarin akhirnya lulus ujian AWS Solutions Architect Associate.
 Belajar 3 bulan sambil kerja, gagal sekali di percobaan pertama."
```

#### Hasil ekstraksi

| Atribut | Nilai | Sumber |
|---|---|---|
| kind | certification_exam | Ekstraksi |
| issuer_prestige | high | KB-ROLE (daftar sertifikasi yang dihargai) |
| issuer_is_third_party_verifiable | true | Ekstraksi + konfirmasi pengguna atas Credential ID |
| required_proctored_exam | true | KB-ROLE |
| metrics | kosong → sistem bertanya | Klarifikasi |
| is_relevant_to_target_role | true (skor 0,88) | Role Matcher |

#### Pertanyaan klarifikasi yang diajukan sistem

1. Boleh saya cantumkan Credential ID dan tautan verifikasinya?
2. Berapa lama total persiapan dan berapa jam belajar per minggu? (untuk detail konkret pada post)
3. Apakah ada pekerjaan nyata yang memakai materi ini, misalnya migrasi atau perancangan arsitektur? (untuk menautkan sertifikasi ke bukti kerja)

#### Keputusan router

Aturan yang menyala: **RULE 3** dan cabang prestise tingginya. Destinasi: **Licenses & Certifications** (utama) + **Featured** + **Post**, dengan usulan pembaruan **Headline**, **Skills**, dan satu kalimat pada **About**.

#### Payload yang dihasilkan

```text
Licenses & Certifications
  Name                : AWS Certified Solutions Architect - Associate
  Issuing organization: Amazon Web Services (AWS)
  Issue date          : Mar 2026     Expiration: Mar 2029
  Credential ID / URL : <diisi pengguna>
  Skills              : AWS, VPC, IAM, High Availability, Cost Optimization

Headline (usulan, 178 karakter)
  Cloud & Infrastructure Engineer | AWS Certified Solutions Architect |
  VPC, IAM, Terraform | Merancang infrastruktur yang tahan gangguan

Post (1.740 karakter, format teks + gambar)
  Hook   : "Percobaan pertama saya gagal 90 poin dari batas lulus." (56 karakter)
  Konteks: alasan mengambil sertifikasi, kendala belajar sambil bekerja shift
  Inti   : lulus pada percobaan kedua setelah mengubah cara belajar, dengan
           angka yang dapat dipertanggungjawabkan (durasi, jumlah lab)
  Kredit : rekan tim dan komunitas yang membantu
  Pelajar: tiga hal konkret yang akan berguna bagi pembaca yang sedang belajar
  CTA    : pertanyaan terbuka tentang strategi belajar sambil bekerja
  Hashtag: #AWSCertified #CloudEngineering
```

#### Instruksi urutan publikasi

1. Tambahkan entri di Licenses & Certifications terlebih dahulu (tidak memicu broadcast sebesar perubahan posisi).
2. Perbarui Headline dan Skills.
3. Tambahkan badge ke Featured.
4. Tunggu 7–14 hari, lalu terbitkan post naratif.
5. Jangan mengedit post setelah terbit kecuali salah ketik kecil.

### 9.2 Contoh B — Proyek internal dengan data sensitif

#### Input mentah

```text
"Selesai bikin sistem deteksi APD pakai kamera di area kilang, model YOLO,
 sekarang dipakai buat monitoring 6 titik. Data internal perusahaan."
```

#### Titik keputusan

- `confidentiality` diset `internal` secara default, sehingga **RULE 12** menyala lebih dahulu daripada aturan publikasi.
- `has_tangible_artifact` bernilai true (sistem berjalan), sehingga **RULE 8** mengarahkan ke **Projects**.
- Tidak ada penerbit pihak ketiga, sehingga bukan Certifications.
- Karena sistem berjalan di lingkungan produksi milik perusahaan, sistem **tidak** otomatis mengusulkan post; ia bertanya lebih dahulu.

#### Yang ditanyakan sistem sebelum menghasilkan apa pun

1. Apakah Anda sudah mendapat izin untuk membicarakan proyek ini secara publik?
2. Bolehkah nama lokasi dan jumlah titik disebutkan, atau perlu digeneralisasi?
3. Angka apa yang boleh dipublikasikan — misalnya cakupan area, tingkat akurasi, atau penurunan temuan pelanggaran?

#### Hasil

| Destinasi | Bentuk | Perlakuan kerahasiaan |
|---|---|---|
| Projects | Judul netral: "Computer vision untuk pemantauan kepatuhan alat pelindung diri" | Nama fasilitas dan lokasi presisi dihapus; deskripsi memakai istilah generik "fasilitas industri proses" |
| Experience (deskripsi) | Satu bullet berformula XYZ pada posisi terkait | Angka hanya yang disetujui |
| Post | Ditunda hingga izin tertulis diperoleh; bila tidak, tidak diterbitkan | Sistem mencatat status "menunggu izin", bukan menghapus prestasinya |
| Featured | Tidak, kecuali ada materi yang memang boleh publik | — |

> **Pelajaran desain dari contoh ini:** aturan kerahasiaan harus dievaluasi sebelum aturan visibilitas. Banyak sistem serupa gagal di titik ini karena memperlakukan semua prestasi sebagai bahan konten. Untuk pengguna yang bekerja di lingkungan industri dengan aturan keamanan informasi ketat, default yang benar adalah "tidak publik sampai dikonfirmasi".

### 9.3 Contoh C — Kerja Praktek mahasiswa

#### Input mentah

```text
"Kerja praktek 2 bulan di sebuah perusahaan, bikin kajian sistem presensi
 karyawan, hasilnya laporan dan rekomendasi sistem baru."
```

#### Keputusan

| Pertanyaan | Jawaban sistem | Aturan |
|---|---|---|
| Masuk Experience atau Education? | Experience, dengan Employment type = Internship | RULE 9 — KP/PKL diperlakukan sebagai magang karena perekrut memfilter lewat Experience |
| Masuk Volunteer? | Tidak, karena organisasinya komersial | RULE 1 |
| Laporan kajian jadi apa? | Projects, dikaitkan ke entri Experience tersebut | RULE 9 — ada artefak |
| Perlu jadi post? | Opsional; layak bila ada temuan yang berguna bagi orang lain | RULE 10 tidak menyala karena durasi lebih dari satu hari dan ada artefak |
| Perlu update Headline? | Ya untuk mahasiswa: cantumkan bidang studi dan minat role target | Persona Composer, mode profile_stage = student |

#### Catatan khusus profil mahasiswa

- Organisasi kampus dan kepanitiaan dapat mengisi Experience bila belum ada pengalaman kerja formal; kepanitiaan murni sosial masuk Volunteer.
- Tugas akhir diringkas pada field Description di Education, dan bila menghasilkan artefak, ditambahkan sebagai Projects.
- Sertifikat pelatihan tanpa ujian sebaiknya masuk Courses, bukan menumpuk di Licenses & Certifications.
- Headline mahasiswa yang efektif menyebut bidang studi, minat role, dan satu hingga dua tools yang benar-benar dikuasai.

---

## Evaluasi, Risiko, dan Roadmap

### 10.1 Metrik evaluasi

| Lapisan | Metrik | Cara ukur | Target awal |
|---|---|---|---|
| Retrieval | Recall@5 terhadap pertanyaan berlabel | 60 pertanyaan uji dengan chunk jawaban yang sudah ditandai | ≥ 0,90 |
| Klasifikasi | Akurasi destinasi utama | Golden set 100 prestasi berlabel manual (gunakan 20 kasus di Bab 4.4 sebagai inti) | ≥ 0,92 |
| Klasifikasi | Tingkat kesalahan berbahaya | Kasus kursus yang masuk Experience, atau prestasi rahasia yang lolos ke post | 0 toleransi |
| Validator | Pelanggaran batas karakter lolos ke pengguna | Uji otomatis pada setiap keluaran | 0 |
| Generasi | Jarak suntingan manusia | Persentase teks yang diubah pengguna sebelum menyetujui | < 25% setelah 50 iterasi |
| Generasi | Kekhasan | Jumlah entitas spesifik per 1.000 karakter | ≥ 3 |
| Hasil akhir | Kelengkapan profil dan cakupan keyword role | Skor coverage dari analyze_keyword_gap | Naik dari baseline ke ≥ 0,85 |
| Hasil akhir | Sinyal eksternal | Jumlah tampilan profil, pencarian yang memunculkan profil, pesan dari perekrut | Dipantau, bukan dijadikan target optimasi |

> **Peringatan metrik:** jangan menjadikan engagement post sebagai fungsi objektif sistem. Optimasi terhadap engagement mendorong konten sensasional dan pola engagement bait, yang justru berisiko ditekan platform dan merusak kredibilitas profesional. Fungsi objektif yang benar adalah **kecocokan persona dengan role target dan akurasi penempatan prestasi**.

### 10.2 Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Pengetahuan platform kedaluwarsa | Chatbot menyarankan menu atau fitur yang sudah tidak ada | Field `last_verified`, siklus verifikasi 3 bulan, penandaan `deprecated`, tampilkan tanggal verifikasi pada jawaban mekanis |
| Model mengarang angka | Kredibilitas pengguna runtuh saat wawancara | Validator integritas angka; angka wajib bersumber dari `metrics[]` |
| Kebocoran informasi internal | Masalah kepatuhan di tempat kerja | Default `internal`, RULE 12 dievaluasi lebih dulu, konfirmasi eksplisit sebelum publik |
| Keluaran terasa seragam dan generik | Distribusi ditekan platform, pembaca kehilangan minat | Kuota entitas spesifik, variasi struktur, pemeriksaan kemiripan terhadap post terdahulu |
| Profil penuh sertifikat kecil | Persepsi kompetensi menurun | RULE 11 pemangkasan, batas 3–7 sertifikasi dan 2–3 penghargaan |
| Ketergantungan pada satu sumber riset | Rekomendasi salah arah bila sumber keliru | Metadata confidence_level, simpan fakta berkonflik, jangan sebut angka klaim tingkat C sebagai fakta |
| Otomatisasi publikasi | Risiko terhadap akun | Sistem berhenti pada paket salin-tempel |

### 10.3 Roadmap implementasi

| Tahap | Lingkup | Keluaran yang bisa dipakai | Perkiraan |
|---|---|---|---|
| Fase 1 — Fondasi | Skema data prestasi, KB-PLATFORM dan KB-RULES dari dokumen ini, retrieval hibrida sederhana, Mode Panduan | Chatbot yang sudah bisa menjawab "isi di mana, field apa, batas berapa" dengan benar | 2–3 minggu |
| Fase 2 — Router | Rule engine 12 aturan sebagai kode, ekstraksi atribut, golden set 100 kasus, antarmuka review | Sistem sudah bisa menjawab "prestasi ini dikirim sebagai apa" dengan alasan | 2–3 minggu |
| Fase 3 — Persona | KB-ROLE, target_role_profile, Headline dan About generator, analisis kesenjangan keyword | Persona lengkap untuk satu role target, plus antrean permintaan prestasi | 3 minggu |
| Fase 4 — Naskah | KB-STYLE, generator post per format, delapan validator, checklist urutan publikasi | Paket siap salin-tempel end-to-end | 3 minggu |
| Fase 5 — Pemeliharaan | Loop umpan balik dari suntingan manusia, dasbor metrik, jadwal verifikasi ulang knowledge base | Sistem yang membaik seiring pemakaian | berkelanjutan |

### 10.4 Yang perlu diverifikasi ulang secara manual

Butir-butir berikut tidak dapat dipastikan dari sumber publik dan sebaiknya dicek langsung pada akun LinkedIn aktif sebelum dimasukkan ke knowledge base sebagai fakta tingkat A:

- Pengelompokan Core / Recommended / Additional untuk setiap section (LinkedIn kerap mengubahnya dan melakukan A/B testing).
- Batas jumlah Skills yang berlaku pada akun Anda (50 atau 100) dan jumlah skill yang dapat disematkan (3 atau 5).
- Apakah reorder antar-section masih tersedia.
- Jumlah maksimum judul pekerjaan dan lokasi pada preferensi Open to Work.
- Apakah penambahan sertifikasi memicu notifikasi ke jaringan pada versi aplikasi saat ini.
- Batas karakter untuk field yang tidak terdokumentasi resmi (nama perusahaan, deskripsi Volunteer, judul Projects).

---

## Lampiran A — Taxonomy Role IT

Materi mentah untuk KB-ROLE. Setiap role menjadi satu chunk dengan metadata `role_family`. Skill dipilih sebagian sesuai penguasaan nyata pengguna — jangan mengisi seluruh daftar tanpa bukti pengalaman.

### A.1 Kelompok AI, Data, dan Machine Learning

| Role | Judul yang dicari perekrut | Hard skill inti | Sertifikasi yang dihargai | Metrik yang bernilai |
|---|---|---|---|---|
| AI / GenAI Engineer | AI Engineer; Machine Learning Engineer; Applied AI Engineer; LLM Engineer; Generative AI Engineer | Python; Retrieval-Augmented Generation (RAG); prompt engineering; LangChain; LlamaIndex; vector database (Qdrant, pgvector, Pinecone, Weaviate); embeddings dan semantic search; fine-tuning (LoRA/QLoRA); kuantisasi model; Hugging Face Transformers; FastAPI; Docker; Kubernetes; vLLM; multi-agent / LangGraph; evaluasi LLM; observability LLM | AWS Certified Machine Learning; Google Cloud Professional ML Engineer; Microsoft Azure AI Engineer Associate | Latensi inferensi; biaya token per permintaan; tingkat halusinasi; deflection tiket; jumlah pengguna aktif; akurasi retrieval |
| Data Scientist | Data Scientist; Applied Scientist; Research Scientist | Python; R; SQL; scikit-learn; PyTorch; TensorFlow; XGBoost; pandas; NumPy; deep learning; NLP; computer vision; time series; A/B testing; uji hipotesis; feature engineering; MLflow; visualisasi data | AWS Certified Machine Learning; Google Professional Data Engineer; Azure Data Scientist Associate | Akurasi, precision, recall, F1, ROC-AUC pada model produksi; dampak bisnis; penurunan galat prediksi |
| Data Engineer | Data Engineer; Analytics Engineer; Big Data Engineer; ETL Developer | Apache Spark / PySpark; Airflow; dbt; Kafka; SQL; Python; Snowflake; BigQuery; Databricks; Delta Lake / Iceberg; data modeling (star schema, SCD); CDC; Terraform; Docker; kualitas data; data governance; CI/CD | AWS Certified Data Engineer; Databricks Certified Data Engineer; Google Professional Data Engineer; SnowPro Core; Azure Data Engineer Associate | Waktu jalan pipeline; volume data per hari; kesegaran data terhadap SLA; penurunan biaya penyimpanan dan komputasi; tingkat kegagalan pipeline |
| MLOps Engineer | MLOps Engineer; ML Platform Engineer; ML Infrastructure Engineer | MLflow; Kubeflow; Weights & Biases; Airflow; Docker; Kubernetes; CI/CD; SageMaker; Vertex AI; model monitoring dan drift detection; model serving; feature store; Terraform; Python | AWS Certified DevOps/MLOps; Google Cloud Professional ML Engineer; Azure AI Engineer Associate | Waktu dari pelatihan ke produksi; ketersediaan layanan model; jumlah model yang dikelola; penurunan biaya inferensi |

### A.2 Kelompok Infrastruktur, Cloud, dan Operasi

| Role | Judul yang dicari perekrut | Hard skill inti | Sertifikasi yang dihargai | Metrik yang bernilai |
|---|---|---|---|---|
| Network / Infrastructure Engineer | Network Engineer; Infrastructure Engineer; System Engineer; Network Administrator | Cisco IOS/NX-OS; Juniper Junos; BGP; OSPF; VLAN, trunking, STP; SD-WAN; MPLS; IPsec VPN; NGFW; segmentasi jaringan; Wireshark; SNMP; Zabbix / PRTG / SolarWinds; fiber optic dan kabel struktur; high availability; wireless 802.11; NAC; IDS/IPS; otomasi jaringan dengan Python dan Ansible | CCNA; CCNP; CCIE; JNCIA; CompTIA Network+; AWS Advanced Networking | Ketersediaan jaringan; waktu pemulihan gangguan; jumlah perangkat yang dikelola; penurunan biaya sirkuit; waktu penerapan konfigurasi |
| Cloud Engineer | Cloud Engineer; Cloud Solutions Architect; Cloud Infrastructure Engineer | AWS; Azure; Google Cloud; Terraform; CloudFormation; Ansible; Infrastructure as Code; IAM; enkripsi dan kepatuhan; jaringan cloud (VPC); serverless; disaster recovery; FinOps dan optimasi biaya; Python / Bash / PowerShell; monitoring | AWS Certified Solutions Architect; Google Professional Cloud Architect; HashiCorp Terraform Associate; Azure Administrator / Architect | Penghematan biaya cloud; skala infrastruktur yang dikelola; waktu penyediaan sumber daya; ketersediaan layanan |
| DevOps Engineer | DevOps Engineer; Platform Engineer; Build and Release Engineer | Kubernetes; Docker; Helm; Terraform; GitLab CI / GitHub Actions / Jenkins; ArgoCD dan GitOps; Prometheus dan Grafana; Linux; Python / Bash / Go; manajemen rahasia; deployment blue-green dan canary; service mesh; DevSecOps | AWS Certified DevOps Engineer Professional; Certified Kubernetes Administrator (CKA); Azure DevOps Engineer Expert; Terraform Associate | Frekuensi rilis; waktu rilis; mean time to recovery; tingkat kegagalan perubahan |
| Site Reliability Engineer | Site Reliability Engineer; SRE; Production Engineer | Kubernetes; observability (Prometheus, Grafana, ELK, Datadog); manajemen insiden dan on-call; SLI, SLO, error budget; chaos engineering; capacity planning; Linux; Go / Python; basis data terdistribusi; load balancing | CKA; Google Professional DevOps Engineer; AWS DevOps Engineer; RHCE | Ketersediaan sistem; penurunan downtime; MTTR; kepatuhan error budget; penghematan biaya infrastruktur |
| IT Support / Sysadmin | IT Support Specialist; Help Desk Analyst; System Administrator; Desktop Support Engineer | Active Directory dan Group Policy; Windows Server; PowerShell; Microsoft 365 (Exchange Online, SharePoint, Teams); Intune / SCCM; Linux dasar; TCP/IP, DNS, DHCP, VPN; ServiceNow / Jira Service Desk; ITIL; backup dan pemulihan; manajemen aset | CompTIA A+; CompTIA Network+; CompTIA Security+; ITIL Foundation; Microsoft 365 Fundamentals | Kepatuhan SLA; first call resolution; volume tiket terselesaikan; waktu penanganan rata-rata; kepuasan pengguna |

### A.3 Kelompok Keamanan

| Role | Judul yang dicari perekrut | Hard skill inti | Sertifikasi yang dihargai | Metrik yang bernilai |
|---|---|---|---|---|
| IT Security / SOC Analyst | SOC Analyst; Cybersecurity Analyst; Incident Responder; Threat Hunter | SIEM (Splunk, Sentinel, Wazuh); EDR dan NDR; IDS/IPS; analisis log dan lalu lintas jaringan; MITRE ATT&CK; manajemen kerentanan; DFIR; analisis malware; SOAR; keamanan cloud; Python dan PowerShell; penulisan kueri deteksi | CompTIA Security+; ISC2 Certified in Cybersecurity; CySA+; GCIH; GCIA; CISSP untuk jenjang senior | Jumlah alert yang ditangani; MTTD dan MTTR; jumlah insiden yang berhasil dibendung; penurunan false positive |
| OT / ICS Security | OT Security Engineer; ICS Security Specialist; SCADA Security; Industrial Cybersecurity Engineer | SCADA; PLC; RTU; HMI; DCS; Purdue Model; protokol industri (Modbus, DNP3, OPC-UA, Profinet); segmentasi OT/IT dan DMZ industri; IEC 62443; NERC CIP; manajemen aset ICS; deteksi anomali; respons insiden pada lingkungan proses; penilaian risiko | GICSP; GRID; GCIP; sertifikat IEC 62443; CompTIA Security+; SANS ICS410 | Jumlah aset OT yang terpetakan dan terlindungi; tingkat kepatuhan terhadap IEC 62443 atau NERC CIP; penambalan tanpa menghentikan produksi; penurunan risiko pada sistem kritis |

### A.4 Kelompok Pengembangan, Otomasi, dan Manajemen

| Role | Judul yang dicari perekrut | Hard skill inti | Sertifikasi yang dihargai | Metrik yang bernilai |
|---|---|---|---|---|
| Software Engineer | Software Engineer; Backend Engineer; Full-Stack Developer | TypeScript / JavaScript; Python; Java; Go; React / Next.js; Node.js; Spring Boot; Django / FastAPI; REST, GraphQL, gRPC; PostgreSQL dan MySQL; Redis; Kafka; Docker dan Kubernetes; pengujian dan TDD; system design; microservices; observability; Git | AWS Certified Developer; Oracle Certified Professional Java; Azure Developer Associate (portofolio biasanya lebih dihargai daripada sertifikasi) | Penurunan latensi; ketersediaan layanan; cakupan pengujian; skala sistem; waktu siklus pengiriman fitur |
| Automation & Instrumentation / Industrial IoT | Instrumentation and Control Engineer; Automation Engineer; Controls Engineer; SCADA Engineer; DCS Engineer | PLC (Siemens, Allen-Bradley, Schneider); SCADA (WinCC, Wonderware, iFIX); DCS (Yokogawa, Honeywell, ABB); PID tuning; desain HMI; sensor dan pengondisian sinyal; loop diagram; protokol HART, Modbus, Profibus, OPC; data acquisition; functional safety dan SIL; MATLAB; LabVIEW; AutoCAD Electrical; edge computing industri | ISA Certified Automation Professional (CAP); ISA Certified Control Systems Technician (CCST); sertifikasi vendor PLC; GICSP bila merangkap keamanan | Peningkatan ketersediaan proses; penurunan downtime tak terencana; akurasi pengendalian; penghematan energi; jumlah loop atau sistem yang dikelola |
| Business / Data Analyst | Business Analyst; Data Analyst; Business Intelligence Analyst; IT Business Analyst | SQL; Power BI; Tableau; Looker; Excel lanjutan; Python atau R; requirements gathering dan user story; gap analysis; BPMN; Agile dan Scrum; Jira dan Confluence; data modeling; desain dasbor; UAT; Lean Six Sigma | CBAP; ECBA; PMI-PBA; Certified Scrum Master; Lean Six Sigma Green Belt | Peningkatan efisiensi proses; penghematan biaya; percepatan pengiriman; jumlah proses yang disederhanakan |
| IT Project Manager | IT Project Manager; Technical Project Manager; Delivery Manager | Jira; Microsoft Project; Confluence; SDLC; Agile, Scrum, SAFe, Waterfall; manajemen risiko; manajemen anggaran; manajemen vendor; RAID log; manajemen perubahan; koordinasi migrasi dan go-live; pelaporan dengan Power BI | PMP; PMI-ACP; Certified ScrumMaster; PRINCE2; SAFe Agilist | Ketepatan anggaran; ketepatan jadwal; jumlah dan ukuran proyek yang dikelola; penurunan waktu siklus proyek |

---

## Lampiran B — Template Prompt

### B.1 Prompt ekstraksi atribut

```text
TUGAS
Ubah catatan prestasi berikut menjadi objek terstruktur. Jangan menyimpulkan
apa pun yang tidak dinyatakan. Untuk setiap field yang tidak dapat dipastikan,
isi null dan tambahkan pertanyaan klarifikasi pada daftar questions.

KONTEKS TAXONOMY ROLE
{{ retrieval: KB-ROLE untuk role target, 2 chunk }}

CATATAN PRESTASI
{{ narrative_raw }}

ATURAN
- issuer_prestige diisi high hanya bila penerbit ada pada daftar sertifikasi
  yang dihargai di konteks taxonomy; selain itu low atau none.
- metrics hanya diisi bila angkanya benar-benar disebut pengguna.
- confidentiality default internal bila menyangkut sistem, klien, atau data
  milik perusahaan tempat pengguna bekerja.
- questions maksimal 3, diurutkan dari yang paling berpengaruh pada kualitas
  keluaran akhir (angka dan artefak lebih dahulu).

KELUARAN
JSON sesuai skema achievement. Tanpa penjelasan tambahan.
```

### B.2 Prompt penulisan post

```text
PERAN
Anda menulis satu post LinkedIn untuk pengguna, dalam suaranya sendiri.

DATA PRESTASI (satu-satunya sumber fakta)
{{ achievement JSON }}

GAYA PENGGUNA
{{ retrieval: KB-USER, 3 post terakhir yang disetujui }}

ATURAN GAYA DAN PLATFORM
{{ retrieval: KB-STYLE, 5 chunk }}

STRUKTUR WAJIB
1 Hook maksimal 140 karakter, satu kalimat utuh, bukan pengumuman.
2 Konteks: situasi awal, kendala, atau kegagalan yang mendahului.
3 Inti pencapaian dengan minimal satu angka dari metrics[]. Dilarang keras
  menambah angka yang tidak ada di data.
4 Kredit kepada orang atau institusi yang benar-benar terlibat.
5 Pelajaran yang bisa dipakai pembaca.
6 Satu pertanyaan terbuka. Maksimal 3 hashtag.

BATASAN
- Total 1.300 sampai 2.500 karakter.
- Paragraf maksimal 3 baris, beri baris kosong antar paragraf.
- Dilarang: "I am excited to announce", "thrilled", "humbled", emoji beruntun,
  ajakan komentar berhadiah, klaim superlatif tanpa bukti.
- Bahasa mengikuti language_policy.

KELUARAN
JSON { hook, body, cta, hashtags[], char_count }.
```

### B.3 Prompt penyusunan Headline

```text
TUGAS
Hasilkan 3 alternatif headline, masing-masing di bawah 220 karakter, dengan
kata kunci utama role target muncul dalam 80 karakter pertama.

MASUKAN
target_role_profile: {{ ... }}
headline saat ini  : {{ ... }}
prestasi teratas    : {{ 3 prestasi dengan relevance_score tertinggi }}
taxonomy role       : {{ retrieval KB-ROLE }}

POLA
[Seniority] [Job Title] | [2-3 hard skill] | [nilai atau dampak]

ATURAN
- Maksimal 3 judul role eksplisit.
- Dilarang kata kosong: passionate, enthusiast, ninja, guru, rockstar.
- Sertakan hitungan karakter dan daftar keyword yang tercakup untuk tiap opsi.
- Bila ada role sekunder, satu opsi harus berbentuk T (payung + spesialisasi).
```

### B.4 Prompt juri validasi (LLM sebagai pemeriksa)

```text
TUGAS
Periksa naskah berikut terhadap daftar aturan. Untuk setiap aturan, jawab
lolos atau langgar beserta kutipan bagian yang melanggar.

ATURAN
R1 Hook selesai dalam 140 karakter dan merupakan kalimat utuh.
R2 Setiap angka pada naskah ada pada daftar metrics yang diberikan.
R3 Tidak ada frasa pada daftar terlarang.
R4 Terdapat minimal 2 entitas spesifik (nama sistem, organisasi, angka, tanggal).
R5 Tidak menyebut informasi yang ditandai rahasia.
R6 Tidak ada klaim yang tidak didukung data prestasi.
R7 Panjang total di dalam rentang yang ditentukan.
R8 Nada tidak memamerkan: ada kredit ke pihak lain dan ada pelajaran.

KELUARAN
JSON { passed: bool, violations: [ { rule, quote, suggestion } ] }
```

---

## Lampiran C — Sumber Riset

Dikelompokkan berdasarkan tingkat keandalan. URL disertakan agar dapat dimasukkan sebagai field `source_url` pada knowledge base.

#### Tingkat A — Dokumentasi resmi dan semi-resmi

- Dokumentasi skema field profil LinkedIn (Microsoft Learn): learn.microsoft.com/en-us/linkedin/shared/references/v2/profile — beserta halaman turunannya untuk position, education, certification, project, honor, publication, course, patent, language, organization, test-score, volunteering-experience, skill
- LinkedIn Engineering: "Engineering the next generation of LinkedIn’s Feed" — linkedin.com/blog/engineering/feed
- Paper riset LinkedIn tentang sequential recommender untuk peringkat feed — arxiv.org
- LinkedIn Help: Add sections to your profile; Manage your profile Experience section; Manage Licenses & certifications; Manage Honors & awards; Featured Section FAQs; Position grouping; Country specific employment types; Let recruiters know you are Open to Work; Manage your public profile URL; Share profile updates with your network; Spotlights in Recruiter and Jobs; Skill Assessments — no longer available; Your Profile level meter
- LinkedIn News: pengumuman fitur Career Break (2022) — news.linkedin.com

#### Tingkat B — Riset pihak ketiga berskala besar

- AuthoredUp — analisis batas karakter dan panjang post optimal dari ratusan ribu post: authoredup.com/blog/linkedin-character-limit
- Socialinsider — benchmark organik LinkedIn dan praktik terbaik 2026: socialinsider.io/blog/linkedin-best-practices dan socialinsider.io/social-media-benchmarks/linkedin
- Laporan Algorithm Insights (Richard van der Blom) — analisis jutaan post: richardvanderblom.com
- Jobscan — riset parsing ATS: jobscan.co/blog/resume-tables-columns-ats dan jobscan.co/blog/ats-formatting-mistakes
- Jobscan — kumpulan pola headline dan summary: jobscan.co/blog/impactful-linkedin-headline-examples
- John Espirian — riwayat perubahan batas karakter LinkedIn: espirian.co.uk/linkedin-character-limits

#### Tingkat C — Analisis praktisi dan blog industri

- Hootsuite — cara kerja algoritma LinkedIn: blog.hootsuite.com/linkedin-algorithm
- Agorapulse, DigitalApplied, Dataslayer, ContentIn — pembahasan perubahan algoritma, golden hour, format konten, dan hashtag
- Oktopost — praktik terbaik carousel LinkedIn
- Social Media Today — penghapusan Creator Mode
- Neil Patel — penekanan konten AI generik oleh LinkedIn
- ConnectSafely — analisis dampak mengedit post terhadap jangkauan
- HeroHunt, Juicebox, ScopeRecruiting, Scale.jobs — mekanisme LinkedIn Recruiter dan Boolean search
- Teal, ResumeWorded, ResumeAdapter, ResumeAtlas, TheEndorse, Prepzee, Infosec Institute, Vista Projects — taxonomy keyword dan sertifikasi per role
- AskCruit, The LinkedIn Engineer, Octopus CRM, Careerflow, Jobright, Skill Academy — kaidah penempatan sertifikasi, penghargaan, magang, dan profil mahasiswa
- Cultivitae — strategi profil untuk beberapa role target

> **Cara memakai lampiran ini:** saat memuat knowledge base, setiap butir sumber menjadi metadata pada chunk yang berasal darinya. Ketika chatbot menjawab pertanyaan mekanis, ia menyebut tingkat keandalan dan tanggal verifikasi. Inilah yang membedakan sistem RAG yang dapat dipercaya dari chatbot yang sekadar terdengar meyakinkan.

