# Aturan Penempatan Prestasi (KB-RULES)

Sumber: `RisetBlueprintRAGPersonaLinkedIn.md` Bab 4.
Format heading chunk: `## [bahasa|seksi] Judul`.

Korpus ini dipakai untuk **menjelaskan** keputusan penempatan dengan bahasa
manusia. Keputusannya sendiri diambil oleh rule engine deterministik di
`supabase/functions/_shared/linkedin-router.ts`, bukan oleh model.

## [id|rules] Kriteria kelayakan tiap destinasi

Experience — layak bila ada peran formal dengan judul, organisasi, dan rentang waktu: pekerjaan tetap, magang dibayar maupun tidak, Kerja Praktek atau PKL, freelance atau kontrak dengan klien jelas, promosi, dan peran formal di usaha sendiri. Tidak layak untuk kursus atau bootcamp tanpa hubungan kerja formal — mencantumkannya di sini dianggap menyesatkan dan berisiko saat verifikasi referensi.

Licenses and Certifications — layak untuk kredensial dari penerbit pihak ketiga yang dapat diverifikasi, umumnya disertai ujian dan Credential ID atau URL. Risikonya adalah menumpuk sertifikat "completion" tanpa ujian; itu penyebab utama profil terlihat penuh tetapi dangkal.

Courses — untuk mata kuliah atau pelatihan yang diikuti tanpa kredensial pihak ketiga yang kuat. Jangan mencatat ulang hal yang sudah masuk Certifications.

Education — hanya pendidikan formal berjenjang. Skripsi atau tugas akhir cukup diringkas pada field Description. Kursus online singkat dan bootcamp non-akreditasi tidak masuk sini.

Projects — layak bila ada deliverable konkret: aplikasi, repositori, dataset, laporan, desain, atau sistem yang berjalan. Kegiatan tanpa artefak, misalnya sekadar menghadiri pelatihan, tidak masuk.

Honors and Awards — untuk pengakuan formal: juara lomba, penghargaan tingkat perusahaan, beasiswa prestasi, pengakuan industri. Penghargaan mikro atau internal tim kecil sebaiknya tidak dimasukkan; batasi 2 sampai 3 entri paling bergengsi.

Publications — untuk karya yang diterbitkan pihak penerbit: jurnal, prosiding, buku, atau media dengan proses editorial. Tulisan blog pribadi dan post LinkedIn biasa tidak termasuk.

Volunteer Experience — untuk peran berbasis kegiatan sosial pada organisasi nirlaba. Magang tidak dibayar di perusahaan komersial tetap masuk Experience, bukan sini.

Featured — untuk bukti visual atau tautan bernilai tinggi: badge sertifikat besar, repositori, portofolio, rekaman presentasi, artikel penting. Featured adalah etalase, bukan gudang; batasi 3 sampai 5 item.

Post — untuk momen yang layak diceritakan tetapi tidak cukup berbobot menjadi entri permanen, atau sebagai pendamping entri profil yang besar. Post bukan pengganti entri permanen untuk kredensial besar.

Tidak diposting — untuk prestasi yang terlalu kecil, tidak relevan dengan role target, atau sudah terwakili entri lain yang lebih tinggi tingkatannya.

## [id|rules] Dua belas aturan keputusan

Aturan dievaluasi berurutan dan hasilnya boleh berlipat: satu prestasi bisa mendarat di beberapa destinasi sekaligus.

RULE 1 Peran kerja formal — bila jenisnya pekerjaan, magang, freelance atau kontrak, atau promosi, dan ada judul, organisasi, serta rentang tanggal, maka masuk Experience. Bila tidak dibayar dan organisasinya nirlaba, Experience diganti menjadi Volunteer Experience. Magang tidak dibayar di perusahaan komersial tetap Experience.

RULE 2 Kerelawanan — peran relawan pada organisasi nirlaba masuk Volunteer Experience. Bila ada artefak dan durasinya minimal 30 hari, ditambah Projects.

RULE 3 Sertifikasi dan badge — kredensial dari penerbit pihak ketiga yang dapat diverifikasi masuk Licenses and Certifications. Bila penerbitnya bergengsi dan relevan dengan role target, ditambah Featured dan Post, serta usulan pembaruan Headline, About, dan Skills.

RULE 4 Kursus daring — bila tidak ada ujian terawasi dan penerbitnya kurang dikenal: lewati bila sudah ada sertifikasi yang lebih tinggi pada skill yang sama (cukup tambahkan skill-nya), selain itu masuk Licenses and Certifications dengan prioritas rendah. Bila tidak ada sertifikat formal sama sekali, masuk Courses. Bila menghasilkan capstone, ditambah Projects.

RULE 5 Lomba dan penghargaan — bila kompetitif dan menang, masuk Honors and Awards. Bila ada artefak, ditambah Projects. Bila prestisenya tinggi, ditambah Featured dan Post. Bila ikut lomba tetapi tidak menang: masuk Projects bila ada artefak, selain itu cukup Post.

RULE 6 Publikasi — paper akademik atau paper konferensi masuk Publications, Featured, dan Post sekaligus.

RULE 7 Menjadi pembicara — bila durasinya satu hari atau kurang, penerbitnya tidak bergengsi, dan tidak ada artefak, cukup Post. Bila ada artefak berupa rekaman atau slide, masuk Featured. Bila diundang institusi bergengsi atau menjadi keynote berulang, ditambah Honors and Awards.

RULE 8 Proyek pribadi dan open source — masuk Projects dan Featured. Bila ada sinyal adopsi nyata seperti jumlah pengguna atau bintang repositori, ditambah Post.

RULE 9 Kampus — capstone atau tugas akhir masuk Projects bila ada artefak, plus usulan meringkasnya di Description pada Education. Kerja Praktek, PKL, atau magang wajib akademik masuk Experience dengan employment type Internship — bukan Education, bukan Volunteer.

RULE 10 Partisipasi pasif — kegiatan satu hari tanpa penerbit yang dapat diverifikasi, tanpa kemenangan kompetitif, dan tanpa artefak, cukup menjadi Post.

RULE 11 Pencegahan penumpukan, dijalankan setelah semua aturan lain — bila jumlah entri Licenses and Certifications melebihi 7, atau ada entri level dasar yang skill-nya sudah dicakup entri lanjutan, pangkas entri bernilai rendah dan usulkan memindahkan buktinya ke satu tautan portofolio di Featured. Bila jumlah Honors and Awards melebihi 3, pangkas menjadi 3 yang paling relevan dengan role target.

RULE 12 Kerahasiaan dan notifikasi — bila prestasi tidak berstatus publik, hapus nama klien dan nama sistem internal lalu ganti dengan deskripsi generik; bila masih sensitif, lewati saja dan jelaskan alasannya. Bila destinasinya mencakup Experience atau Education, tampilkan instruksi mematikan toggle Notify network sebelum menyimpan.

Aturan kerahasiaan dievaluasi lebih dahulu daripada aturan visibilitas. Banyak sistem serupa gagal di titik ini karena memperlakukan semua prestasi sebagai bahan konten.

## [id|rules] Kasus konkret dan alasannya, bagian satu

Lulus AWS Certified Solutions Architect dengan ujian berbayar dan Credential ID — Licenses and Certifications, Featured, Post, plus usul perbarui Headline dan Skills. Alasan: penerbit bergengsi, dapat diverifikasi, relevan dengan role target.

Selesai kursus gratis "Intro to Python" tanpa ujian, padahal sudah punya sertifikasi Python lanjutan — lewati saja, cukup pastikan skill Python ada di profil. Alasan: nilai sinyalnya rendah dan tumpang tindih; ini mencegah penumpukan.

Sertifikat kompetensi dengan ujian dan Credential ID dari lembaga pelatihan lokal — Licenses and Certifications. Alasan: ada penerbit pihak ketiga dan asesmen formal, meski lembaganya tidak terkenal secara internasional.

Juara 1 hackathon nasional dengan produk yang benar-benar dijalankan — Honors and Awards, Projects, Featured, dan Post. Alasan: kompetitif dan menang, ada artefak, prestisenya tinggi.

Ikut hackathon tetapi tidak menang dan prototipenya tidak selesai — cukup Post. Alasan: tidak menang dan tidak ada artefak, jadi tidak ada yang bisa dijadikan entri permanen.

Paper diterima di konferensi — Publications, Featured, dan Post. Alasan: ada penerbit dan tautan permanen.

Menjadi pemateri webinar internal satu jam tanpa rekaman — cukup Post. Alasan: durasi pendek, tidak dapat diverifikasi, tanpa artefak.

Keynote di konferensi industri dengan rekaman video — Featured berisi video, Honors and Awards, dan Post. Alasan: prestise tinggi dan ada artefak.

Magang tiga bulan di perusahaan komersial meski tidak dibayar — Experience dengan employment type Internship. Alasan: perekrut memfilter kandidat lewat field Experience, dan tidak dibayar tidak mengubah sifat komersial organisasinya.

Kerja Praktek atau PKL untuk syarat kelulusan — Experience dengan employment type Internship. Alasan: sama seperti magang, meskipun statusnya wajib akademik.

## [id|rules] Kasus konkret dan alasannya, bagian dua

Tugas akhir yang menghasilkan aplikasi yang benar-benar dipakai — Projects, ditambah ringkasannya pada Description di Education. Alasan: ada deliverable konkret.

Promosi dari Staff ke Supervisor di perusahaan yang sama — Experience sebagai posisi baru; LinkedIn otomatis mengelompokkannya sebagai jenjang. Alasan: ini perubahan peran formal, bukan penghargaan.

Membuat tool open source yang punya pengguna nyata — Projects, Featured, dan Post. Alasan: ada artefak dan ada sinyal adopsi.

Panitia bakti sosial di yayasan nirlaba — Volunteer Experience. Alasan: berbasis kegiatan sosial pada organisasi nirlaba.

Panitia konferensi profesional berskala besar yang bersifat komersial — Experience. Alasan: skala dan sifat kerjanya setara pekerjaan profesional, bukan kerelawanan.

Employee of the Quarter tingkat perusahaan — Honors and Awards. Alasan: pengakuan formal dari institusi.

Pujian informal semacam "MVP minggu ini" dari tim kecil — cukup Post, dan itu pun opsional. Alasan: terlalu kecil untuk entri permanen.

Menyelesaikan proyek internal yang bersifat rahasia — Projects dengan deskripsi yang disamarkan, atau dilewati sama sekali. Alasan: aturan kerahasiaan mendahului aturan visibilitas.

Sertifikasi yang sudah kedaluwarsa dan tidak diperpanjang — hapus dari profil. Alasan: sertifikat kedaluwarsa yang dibiarkan menandakan profil tidak dirawat.

Bootcamp yang punya capstone project — Courses untuk modulnya dan Projects untuk capstone-nya. Alasan: pembelajaran dan deliverable dipisahkan; bootcamp bukan Experience.

## [id|rules] Formula penulisan per destinasi

Bullet Experience memakai formula XYZ: mencapai X yang terukur dengan Y melalui Z. Contoh: "Menurunkan waktu pemulihan gangguan jaringan 35 persen, dari rata-rata 45 menjadi 29 menit, dengan membangun dasbor pemantauan terpusat untuk 120 perangkat."

Deskripsi Projects memakai Situation-Action-Result secara naratif: konteks masalahnya, keputusan teknis yang diambil beserta alasannya, hasil yang terukur, dan pembelajarannya.

Honors and Awards ditulis dengan pola apa, dari siapa, dari berapa peserta, atas dasar apa. Contoh: "Juara 1 dari 84 tim, dinilai atas kelayakan teknis dan dampak operasional."

Certifications ditulis dengan nama resmi lengkap, penerbit resmi, serta ID dan URL verifikasi. Hindari singkatan tidak resmi karena merusak pencocokan Boolean search dan parsing ATS.

About memakai urutan hook, peran dan kekuatan inti, 2 sampai 3 pencapaian terukur, arah ke depan, lalu ajakan. Tiga kalimat pertama harus berdiri sendiri karena sisanya tersembunyi di balik tombol see more.

Aturan integritas angka: setiap metrik yang muncul di output harus dapat ditelusuri ke catatan prestasi sumbernya. Bila pengguna tidak dapat mempertanggungjawabkan angkanya saat wawancara, angka itu lebih berbahaya daripada tidak ada angka sama sekali. Lebih baik menulis "menangani ratusan permintaan per bulan" daripada mengarang "1.284 permintaan".

## [id|rules] Aturan penulisan ganda dan parsing ATS

Tulis bentuk panjang beserta singkatannya pada kemunculan pertama: "Retrieval-Augmented Generation (RAG)", "Site Reliability Engineering (SRE)", "Operational Technology (OT)". Satu tulisan jadi cocok baik untuk pencarian yang memakai singkatan maupun yang memakai bentuk panjang.

LinkedIn Recruiter dan ATS adalah dua mesin yang berbeda. Recruiter membaca field terstruktur yang sudah rapi lewat Boolean search aktif; ATS membaca hasil parsing dokumen PDF atau DOCX yang diunggah dan sangat sensitif terhadap format visual. Risiko utama di Recruiter adalah tidak muncul karena keyword tidak ada; risiko utama di ATS adalah tidak terbaca karena format dokumen merusak parsing.

Yang merusak parsing ATS bila sistem juga mengekspor CV: tabel dan tata letak multi-kolom (parser membaca per baris halaman sehingga isi antar kolom tercampur); text box dan layer grafis dari aplikasi desain (isinya bisa hilang seluruhnya); kontak yang diletakkan di header atau footer dokumen (banyak ATS mengabaikan area itu); font tidak standar, ikon, dan emoji (berubah menjadi karakter rusak); diagram batang tingkat penguasaan skill (tidak terbaca sebagai teks, tulis eksplisit misalnya "Python (mahir)"); judul section kreatif (gunakan judul standar Work Experience, Education, Skills, Certifications); dan format tanggal yang tidak konsisten (gunakan pola seragam seperti "Jan 2021 - Mar 2023").

## [id|rules] Cara perekrut mencari kandidat

Perekrut memakai Boolean search pada field yang terpisah: Title, Company, Keywords, School, dan lainnya. Operator yang didukung: AND, OR, NOT, tanda kutip untuk frasa eksak, dan tanda kurung untuk pengelompokan. Wildcard tidak didukung, jadi jangan mengandalkan potongan kata — tulis bentuk penuh. Stemming ada tetapi terbatas (manage menjadi manager dan management) dan tidak menutupi perbedaan penulisan teknis seperti Node.js versus NodeJS. Panjang query sekitar 300 karakter per field, sehingga perekrut hanya memuat beberapa varian; pilih varian yang paling umum. Field Title mencocokkan judul posisi saat ini dan sebelumnya secara ketat, jadi judul posisi harus memakai istilah pasar bukan istilah internal perusahaan. Filter Location bersifat filter keras.

Contoh query yang lazim dipakai perekrut: ("Data Engineer" OR "Analytics Engineer") AND (Python OR PySpark) AND (Airflow OR dbt). Atau: ("Network Engineer" OR "Infrastructure Engineer") AND (CCNA OR CCNP) AND (BGP OR OSPF).

Strategi redundansi terkendali: karena bobot antar-field tidak pernah dipublikasikan LinkedIn dan sumber pihak ketiga saling bertentangan, tempatkan setiap keyword inti di lima titik — Headline, Job Title, tiga Skill teratas, satu kalimat di About, dan satu bullet Experience. Redundansi ini bukan keyword stuffing selama setiap kemunculannya berada dalam kalimat yang wajar.

Cara memilih skill secara sistematis: ambil 5 sampai 8 lowongan nyata untuk role target, ekstraksi frasa skill dari bagian requirements dan hitung frekuensinya, ambil 10 sampai 15 skill dengan frekuensi tertinggi yang benar-benar dikuasai sebagai inti, isi sisanya dengan skill pendukung dan varian penulisan yang umum, lalu sematkan tiga skill yang paling dekat dengan role prioritas pertama.
