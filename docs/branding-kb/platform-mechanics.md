# Mekanika Platform LinkedIn (KB-PLATFORM)

Sumber: `RisetBlueprintRAGPersonaLinkedIn.md` Bab 2 dan 3.5.
Format heading chunk: `## [bahasa|seksi] Judul` — diparse oleh
`scripts/ingest-branding-kb.mjs`. Satu heading = satu chunk embedding.

Korpus ini menjawab pertanyaan mekanis: apa yang harus diisi, di mana menunya,
berapa batas karakternya, dan apa yang sudah tidak ada lagi.

## [id|platform] Peta section profil dan jalur menu

Profil LinkedIn bukan satu formulir, melainkan kumpulan section yang ditambahkan lewat tombol Add profile section, dikelompokkan menjadi Core, Recommended, dan Additional.

Intro (selalu ada): Profile photo, Background photo, Name, Pronouns, Name pronunciation, Custom URL, Location, Industry.
Core: About, Experience, Education, Skills, Career break.
Recommended: Featured, Licenses & Certifications, Courses, Recommendations.
Additional: Projects, Publications, Honors & Awards, Volunteer experience, Test scores, Languages, Organizations, Patents, Causes you care about.
Di luar Add section: Headline (lewat Edit Intro), Open to work / Open to hiring / Providing services (tombol biru di bawah headline), Services page, Newsletter, Articles.

Jalur UI desktop: Me > View Profile > Add profile section > pilih kelompok Core / Recommended / Additional > pilih section > isi form > Save.
Jalur UI mobile: tap foto profil > View profile > Add section > kategori > section > Save.
Mengedit item yang sudah ada: ikon pensil pada section terkait. Menambah item kedua pada section yang sama: tombol + di header section.

Pengelompokan Core / Recommended / Additional kerap diubah LinkedIn dan sedang di-A/B test, jadi urutannya bisa berbeda antar akun. Diverifikasi 4 September 2026.

## [id|platform] Batas karakter setiap field

Angka berikut dipakai sebagai konstanta keras oleh validator. Sistem menolak, bukan memotong diam-diam, output yang melampaui batas.

Headline: maksimum 220 karakter; hanya sekitar 60-80 karakter pertama yang tampil di kartu hasil pencarian dan di tampilan mobile. Letakkan role target dan 2 skill terpenting di 80 karakter pertama.
About atau Summary: maksimum 2.600 karakter; sekitar 200-300 karakter pertama tampil sebelum tombol "see more". Kalimat 1 sampai 3 harus berdiri sendiri sebagai pitch, dan bagian itu juga yang dipakai Google sebagai deskripsi halaman.
Deskripsi Experience: maksimum 2.000 karakter per posisi. Cukup untuk 5 sampai 7 bullet.
Judul posisi (Title): maksimum 100 karakter.
Post atau update feed: maksimum 3.000 karakter; preview terpotong di sekitar 140 karakter pada mobile dan 210 karakter pada desktop.
Komentar: 1.250 karakter. Artikel LinkedIn: sekitar 110.000 karakter. Nama newsletter: sekitar 30 karakter dan tidak mudah diubah.
Pertanyaan poll 140 karakter, opsi poll 30 karakter.
Nama depan 20 karakter, nama belakang 40 karakter. Gelar profesional sebaiknya di Headline, bukan menumpuk di nama.
Custom URL: 5 sampai 30 karakter, huruf dan angka.
Catatan connection request: 300 karakter. Rekomendasi: 3.000 karakter. Pesan langsung 8.000 karakter, InMail body 2.000 karakter.

Batas karakter untuk field yang tidak terdokumentasi resmi — nama perusahaan, deskripsi Volunteer, judul Projects — belum dapat dipastikan dan sebaiknya dicek langsung di akun. Diverifikasi 4 September 2026.

## [id|platform] Spesifikasi media dan gambar

Foto profil: rasio 1:1, disarankan 400 x 400 piksel.
Foto latar atau banner: rasio 4:1, disarankan 1584 x 396 piksel. Bagian tepi terpotong pada tampilan mobile, jadi letakkan teks penting di tengah.
Carousel atau document post: format PDF, PPTX, atau DOCX; rasio portrait 1080 x 1350 piksel paling optimal untuk layar mobile; 5 sampai 15 halaman, paling baik 8 sampai 10; margin aman 50 piksel; ukuran font minimal setara 24 pt.
Video: unggah native, bukan tautan YouTube. Orientasi vertikal, dan wajib bertakarir teks karena mayoritas ditonton tanpa suara. Rekomendasi durasi berbeda antar sumber riset: satu menyarankan 2 sampai 3 menit, yang lain menyarankan di bawah 60 detik. Perlakukan sebagai parameter yang diuji sendiri, bukan sebagai aturan.

## [id|platform] Field form Experience

Title: wajib, maksimum 100 karakter. Gunakan judul yang benar-benar dicari perekrut, bukan judul internal perusahaan.
Employment type: opsional. Pilihannya Full-time, Part-time, Self-employed, Freelance, Contract, Internship, Apprenticeship, Seasonal; opsi bervariasi per negara.
Company name: wajib. Pilih dari daftar agar logo dan halaman perusahaan ikut tertaut.
Location dan Location type: opsional. Location type berisi On-site, Hybrid, atau Remote. Lokasi bersifat filter keras pada pencarian perekrut, jadi sebaiknya diisi.
Start date dan End date: wajib dan kondisional; hanya bulan dan tahun. End date yang dikosongkan berarti posisi saat ini.
Description: opsional, maksimum 2.000 karakter. Ini kanal utama keyword pada Experience.
Skills: opsional. Kaitkan skill ke posisi ini untuk memperkuat Skills Match saat melamar.
Media: opsional, berupa lampiran dokumen, gambar, atau tautan.

Beberapa posisi pada perusahaan yang sama otomatis dikelompokkan (position grouping), sehingga promosi tampil sebagai jenjang, bukan sebagai dua pekerjaan terpisah.

## [id|platform] Field form Licenses and Certifications

Name: wajib. Tulis nama resmi lengkap sesuai penerbit, bukan singkatan buatan sendiri — nama inilah yang dicocokkan filter perekrut dan sistem ATS.
Issuing organization: wajib. Pilih dari daftar agar tertaut ke halaman perusahaan penerbit.
Issue date: wajib, bulan dan tahun. Expiration date: opsional; kosongkan bila tidak kedaluwarsa. Jangan biarkan sertifikat yang sudah kedaluwarsa tetap tampil — itu menandakan profil tidak dirawat.
Credential ID: opsional. Meningkatkan kepercayaan saat verifikasi, tetapi tidak terbukti menaikkan peringkat pencarian.
Credential URL: opsional. Tautan verifikasi publik, misalnya halaman badge penerbit.
Skills: opsional. Kaitkan 2 sampai 5 skill yang dibuktikan sertifikat ini.

Banyak penerbit badge menyediakan tombol "Add to LinkedIn Profile" yang mengisi field ini secara otomatis. Skill Assessment sudah dihentikan LinkedIn, jadi tidak ada badge tes yang bisa ditambahkan. Diverifikasi 4 September 2026.

## [id|platform] Field form Projects

Project name: wajib. Gunakan nama deskriptif yang mengandung keyword teknis.
Associated with: opsional. Kaitkan ke entri Experience atau Education tertentu agar konteksnya jelas.
Start date dan End date, atau penanda proyek berjalan: opsional. Tersedia opsi proyek satu waktu maupun berkelanjutan.
Description: opsional. Ini tempat terbaik menerapkan pola Situation-Action-Result secara naratif.
Contributors: opsional. Tag rekan tim; mereka akan menerima notifikasi permintaan.
Skills dan Media atau Link: opsional. Tautan repositori, demo, atau dokumen.

## [id|platform] Field form section tambahan

Honors and Awards: Title (wajib), Issuer, Issue date, Associated with (posisi atau pendidikan terkait), Description.
Publications: Title (wajib), Publication atau Publisher, Publication date, Authors (wajib termasuk diri sendiri), Description, URL.
Courses: Course name, Course number, Associated with.
Test Scores: Test name (wajib), Score, Date, Description, Associated with.
Organizations: Organization name, Position held, Start date dan End date, Description, Associated with.
Patents: Title (wajib), Inventors (wajib), Patent office berupa kode negara (wajib), status Pending atau Issued. Jika pending: Application number dan Filing date. Jika issued: Patent number dan Issue date. Ditambah Description dan URL.
Languages: Language (wajib) dan Proficiency dengan lima pilihan: Elementary, Limited working, Professional working, Full professional, Native or bilingual.
Volunteer experience: Organization (wajib), Role (wajib), Cause, Start dan End date atau penanda kegiatan sekali jalan, Description. Tersedia 14 pilihan Cause, termasuk education, environment, health, science and technology, social services, dan humanitarian relief.
Career break: Career break type dengan 13 pilihan (caregiving, gap year, layoff, professional development, relocation, travel, dan lainnya), Start dan End date, Location, Description.

## [id|platform] Section mana yang terindeks pencarian

Ini menentukan ke mana keyword harus ditempatkan. Angka prioritas 1 adalah yang tertinggi.

Name: terindeks Google lewat title tag dan terindeks pencarian perekrut.
Headline: terindeks Google lewat title tag, dan sangat tinggi bobotnya pada pencarian perekrut. Prioritas penempatan keyword 1.
Job Title pada Experience: terindeks Google, dan merupakan field khusus pada Boolean search perekrut. Prioritas 1.
Skills: terindeks keduanya, dipakai filter dan Skills Match. Prioritas 2.
About: terindeks Google (300 karakter awal menjadi deskripsi), dan masuk lewat field Keywords pada pencarian perekrut. Prioritas 3.
Deskripsi Experience: sama seperti About. Prioritas 3.
Licenses and Certifications: terindeks keduanya, tersedia filter khusus. Prioritas 4.
Education: terindeks keduanya. Prioritas 5.
Projects, Publications, Honors, Courses, Volunteer, Organizations: terindeks keduanya dengan bobot lebih rendah. Prioritas 6.
Featured: judul dan tautannya terindeks; fungsinya untuk konversi, bukan untuk keyword.
Foto, Pronouns, Name pronunciation: tidak terindeks karena bukan teks.
Preferensi Open to Work mode privat: tidak terindeks Google, tetapi terlihat oleh pengguna LinkedIn Recruiter. Aktifkan sebagai sinyal, bukan sebagai keyword.

Prasyarat mutlak: seluruh indeksasi Google hanya berlaku bila profil disetel publik lewat Settings > Visibility > Edit your public profile. Ini item pertama pada checklist onboarding.

## [id|platform] Fitur LinkedIn yang sudah dihapus

Daftar anti-halusinasi. Model bahasa yang dilatih sebelum 2024 kemungkinan besar masih menyarankan fitur-fitur di bawah ini. Semuanya sudah tidak ada — jangan pernah menyarankannya.

Skill Assessments beserta badge "Verified Skill": dihentikan, dan badge-nya dihapus dari seluruh profil pada 2024. Jangan menyarankan mengambil skill assessment. Alternatif yang masih berlaku: sertifikasi resmi dengan Credential ID, entri Projects yang punya artefak, dan Recommendations dari orang lain.
Creator Mode sebagai toggle: dihapus sekitar awal 2024. Tidak perlu mengaktifkan creator mode. Featured, tombol Follow, analitik profil, dan Newsletter kini tersedia sebagai default untuk semua akun.
Follow hashtag sebagai kanal distribusi: dihapus. Hashtag bukan lagi mekanisme reach; batasi 2 sampai 3 hashtag sebagai sinyal topik dan bantuan pencarian.
Bagian "Talks about" dengan daftar hashtag di profil: dihapus bersama Creator Mode. Positioning topik dipindahkan ke Headline dan About.
Social Selling Index atau SSI: masih ada tetapi tidak lagi ditonjolkan LinkedIn sebagai metrik performa. Ini alat sales, bukan ukuran kualitas personal branding — jangan dipakai sebagai KPI.
Reorder antar-section profil: kemungkinan besar sudah dikunci; yang masih bisa diatur hanya urutan item di dalam satu section dan isi Featured. Jangan menjanjikan pemindahan section.

Diverifikasi 4 September 2026.

## [id|platform] Notifikasi perubahan profil dan urutan publikasi

Perubahan pada Experience dan Education memicu pemberitahuan ke seluruh jaringan. Toggle "Notify network" muncul di dalam form saat menambah posisi, dan pengaturan permanennya ada di Settings and Privacy > Visibility > Share job changes, education changes, and work anniversaries from profile.

Toggle itu harus dimatikan sebelum melakukan perubahan. Mematikannya setelah perubahan tersimpan tidak menarik kembali notifikasi yang sudah terkirim. Notifikasi bisa muncul hingga dua jam setelah perubahan.

Penambahan sertifikasi umumnya tidak memicu notifikasi sebesar perubahan posisi. LinkedIn menawarkan opsi membagikannya sebagai post setelah sertifikat ditambahkan. Apakah perilaku ini masih sama pada versi aplikasi terbaru perlu dicek langsung di akun.

Urutan publikasi yang disarankan untuk satu peristiwa: (1) matikan toggle notifikasi bila tidak ingin broadcast otomatis; (2) tambahkan entri ke section profil; (3) perbarui Headline dan Skills bila perlu; (4) unggah bukti ke Featured; (5) baru terbitkan post naratif. Urutan ini mencegah jaringan menerima dua sinyal terpisah untuk satu peristiwa yang sama.

Post otomatis yang dihasilkan LinkedIn sendiri bersifat generik. Menulis post naratif sendiri hampir selalu lebih baik daripada kartu ucapan bawaan.

## [id|platform] Fakta yang berbeda antar sumber

Butir-butir berikut punya klaim yang saling bertentangan. Jangan menyebut salah satunya sebagai fakta tunggal; sebutkan rentangnya.

Jumlah maksimum Skills: sebagian sumber menyebut 50 (batas lama), sebagian menyebut 100 (dinaikkan sekitar Februari 2024). Pakai target aman 45 sampai 50 skill berkualitas, dan verifikasi manual di akun sendiri.
Jumlah skill yang bisa disematkan: sebagian sumber menyebut 3 teratas, sebagian menyebut 5. Optimalkan untuk 3 slot pertama karena itu aman untuk kedua kasus.
Efek link eksternal terhadap reach: satu klaim menyebut turun hingga 60 persen, klaim lain berdasarkan analisis 1,8 juta post tahun 2025 justru menyebut naik 5 persen. Default yang aman: hindari link mentah di badan post, gunakan dokumen native atau artikel LinkedIn. Jangan menyebut angka apa pun kepada pengguna.
Link di komentar pertama: sebagian menyebut masih efektif sebagai workaround, sebagian menyebut sudah di-patch dan terkena penalti serupa. Jangan jadikan strategi andalan; ini tidak pasti.
Durasi jendela kritis pasca-publikasi: ada yang menyebut 60 menit, ada yang menyebut 90 menit. Nyatakan sebagai sekitar 1 sampai 1,5 jam pertama, dan tandai sebagai heuristik praktisi yang belum dikonfirmasi LinkedIn.
Bobot antar-field pada pencarian perekrut: tidak pernah dipublikasikan LinkedIn, dan sumber pihak ketiga saling bertentangan. Jangan mengklaim field mana yang paling berbobot.

## [id|platform] Kelengkapan profil dan Open to Work

LinkedIn punya pengukur kekuatan profil dengan tingkat tertinggi "All-Star". Syarat umumnya: foto profil, minimal satu posisi beserta deskripsinya, pendidikan, minimal lima skill, ringkasan About, lokasi dan industri yang terisi, serta minimal 50 koneksi.

Klaim populer bahwa profil lengkap dilihat berkali-kali lipat lebih sering banyak diulang tanpa sumber resmi — perlakukan sebagai heuristik praktisi, bukan fakta. Yang pasti dan lebih penting: field yang kosong tidak menghasilkan keyword apa pun, sehingga profil tidak akan muncul pada pencarian Boolean apa pun, terlepas dari mekanisme peringkatnya.

Spotlight yang bisa dipengaruhi langsung oleh pengguna: Open to Work (aktifkan mode privat khusus perekrut, isi judul pekerjaan target, lokasi, jenis pekerjaan, dan tipe tempat kerja) dan Recently active (aktif dalam kurang lebih 30 hari terakhir). Company alumni adalah alasan kuat untuk tidak menghapus riwayat kerja lama dari profil. Engaged with talent brand bisa dipancing dengan mengikuti dan berkomentar pada halaman perusahaan target.

Jumlah maksimum judul pekerjaan dan lokasi pada preferensi Open to Work perlu dicek langsung di akun. Diverifikasi 4 September 2026.
