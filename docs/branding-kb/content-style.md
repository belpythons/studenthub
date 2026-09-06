# Gaya Konten dan Distribusi Feed (KB-STYLE)

Sumber: `RisetBlueprintRAGPersonaLinkedIn.md` Bab 3 dan Bab 6.2-6.3.
Format heading chunk: `## [bahasa|seksi] Judul`.

Korpus ini dipakai saat menulis naskah: post, Headline, dan About.

## [id|style] Cara kerja feed LinkedIn saat ini

LinkedIn sudah mengganti kumpulan pipeline retrieval lamanya — kronologis, tren geografis, collaborative filtering, dan berbasis industri — dengan arsitektur dua tahap berbasis model bahasa.

Tahap pertama adalah unified retrieval dengan dual encoder: profil anggota dan konten post sama-sama diubah menjadi teks terstruktur lalu di-encode ke satu ruang embedding bersama, sehingga pencocokan terjadi secara semantik. Tahap ini juga menangani cold-start, karena anggota atau konten baru tetap bisa dicocokkan lewat minat yang disimpulkan dari data profil.

Tahap kedua adalah sequential ranking dengan rekomender generatif: ribuan interaksi historis anggota diproses sebagai urutan temporal oleh transformer, lalu digabung dengan fitur konteks dan dipisahkan menjadi tugas pasif (klik, skip, dwell) dan tugas aktif (like, comment, share).

Konsekuensi praktisnya: kecocokan topik mengalahkan hubungan koneksi. Post tidak otomatis sampai ke semua follower. Konsistensi topik dari waktu ke waktu membentuk otoritas topik yang menaikkan peluang distribusi post berikutnya di area yang sama. Karena itu konten prestasi sebaiknya tetap berada dalam 2 sampai 3 klaster topik yang konsisten dengan role target, bukan berpindah-pindah tema.

## [id|style] Hierarki sinyal peringkat

Saves atau simpan post adalah sinyal paling kuat, disebut beberapa kali lipat nilai like. Karena itu tulis konten yang layak disimpan: checklist, ringkasan langkah, atau daftar sumber belajar.

Dwell time sangat kuat dan menjadi dasar depth score. Responsnya: panjang 1.300 sampai 2.500 karakter, paragraf pendek, dan ada bagian yang menuntut dibaca berupa angka, langkah, atau cerita.

Komentar, terutama balasan berantai, tergolong kuat. Responsnya: akhiri dengan pertanyaan otentik yang bisa dijawab dengan pengalaman, bukan pertanyaan ya atau tidak.

Repost dan share lewat pesan pribadi juga kuat. Responsnya: sediakan satu insight yang layak diteruskan ke rekan kerja.

Like dan reaksi adalah sinyal paling lemah, dan tidak dijadikan target optimasi.

Sinyal negatif berupa skip cepat, hide, dan report menurunkan distribusi. Hindari hook clickbait yang tidak dipenuhi isi post.

Panjang post optimal 1.300 sampai 2.500 karakter dari maksimum 3.000, sekitar 27 persen lebih tinggi engagement-nya dibanding post di bawah 400 karakter menurut riset pihak ketiga berskala besar. Preview terpotong di sekitar 140 karakter pada mobile dan 210 karakter pada desktop, sehingga hook wajib utuh sebelum batas itu.

## [id|style] Format konten dan kapan dipakai

Document atau carousel berformat PDF secara konsisten berada di posisi performa tertinggi. Pakai untuk prestasi yang prosesnya bisa dipecah: ringkasan proyek, "5 pelajaran dari sertifikasi X", atau studi kasus. Optimal 8 sampai 10 halaman.

Video native kuat tetapi persaingannya makin ketat. Pakai untuk demo produk, potongan sesi berbicara di depan publik, atau walkthrough hasil proyek.

Multi-image kuat. Pakai untuk dokumentasi lapangan, perbandingan sebelum dan sesudah, atau foto tim.

Teks dengan satu gambar adalah format paling umum, dan naik sekitar 50 persen bila menampilkan wajah manusia. Ini default untuk pengumuman sertifikasi, promosi, dan kelulusan.

Teks saja sedang menurun performanya. Pakai hanya untuk refleksi singkat yang berbobot tinggi.

Poll turun drastis dan hampir tidak efektif. Tidak direkomendasikan untuk pengumuman prestasi.

Artikel bagus untuk pencarian Google tetapi bukan untuk reach di feed. Pakai untuk studi kasus panjang yang ingin dijadikan aset permanen di Featured.

Newsletter melewati filter feed karena dikirim sebagai notifikasi dan email ke pelanggan. Pakai bila ingin membangun audiens tetap dalam satu tema.

## [id|style] Anatomi post prestasi enam blok

Struktur ini wajib dipakai generator, dan setiap blok punya batasan yang bisa divalidasi otomatis.

Blok 1 Hook, maksimum 140 karakter dan harus satu kalimat utuh. Isinya menyatakan masalah, angka yang mengejutkan, atau ketegangan nyata. Dilarang membuka dengan "I am excited to announce", "Alhamdulillah akhirnya", atau emoji beruntun.

Blok 2 Konteks, 2 sampai 4 baris. Isinya situasi awal, kendala, atau kegagalan yang mendahului. Jangan langsung melompat ke hasil.

Blok 3 Inti pencapaian, 3 sampai 6 baris. Wajib memuat minimal satu angka atau fakta spesifik yang dapat dipertanggungjawabkan. Dilarang mengarang metrik; bila memang tidak ada angka, gunakan ukuran skala atau ukuran kualitatif yang jujur.

Blok 4 Kredit, 1 sampai 2 baris. Sebut nama mentor, tim, atau institusi. Tag maksimal 5 orang yang benar-benar terlibat, dan jangan menandai orang yang tidak relevan.

Blok 5 Pelajaran, 3 sampai 5 baris. Ubah pengalaman menjadi sesuatu yang bisa dipakai pembaca — inilah yang membuat post layak disimpan. Hindari nasihat generik tanpa konteks.

Blok 6 CTA dan hashtag, 1 baris ditambah 2 sampai 3 hashtag. Pertanyaan terbuka yang relevan dengan isi. Dilarang engagement bait semacam "komen YES kalau setuju".

## [id|style] Aturan waktu dan frekuensi posting

Beri jeda 1 sampai 2 minggu antara momen pencapaian dan waktu posting supaya isi post reflektif, bukan reaktif. Jeda ini juga memberi waktu untuk memvalidasi angka yang akan disebut.

Jaga jarak minimal 24 jam antar post dari akun yang sama.

Frekuensi sehat untuk akun profesional adalah 3 sampai 5 post per minggu. Untuk akun yang hanya memposting prestasi, kepadatan itu tidak relevan — yang penting jaraknya.

Hindari mengedit post setelah publikasi, terutama pada rentang 30 sampai 90 menit pertama. Koreksi ketik kecil relatif aman; menambahkan tautan setelah publikasi dilaporkan berdampak paling besar. Karena itu validasi harus terjadi sebelum publikasi, bukan sesudahnya.

Waktu posting: tidak ada konsensus jam pasti antar riset. Perlakukan sebagai parameter yang diuji sendiri per akun, bukan sebagai fakta.

## [id|style] Praktik berisiko yang harus dicegah

Engagement pod atau saling like terjadwal terdeteksi sebagai pola artifisial dan menyebabkan penurunan impresi drastis. Jangan pernah menyarankan atau memfasilitasi pod.

Konten AI generik tanpa data pribadi ditekan distribusinya di luar koneksi langsung. LinkedIn secara aktif menekan konten semacam ini. Setiap output wajib memuat minimal satu fakta spesifik milik pengguna: angka, nama sistem, nama organisasi, atau tanggal. Sistem yang menulis dari prestasi nyata dengan angka konkret berada di sisi aman, asalkan outputnya bukan template kosong yang berulang.

Engagement bait diturunkan jangkauannya. Frasa terlarang antara lain "komen YES kalau setuju", "tag temanmu yang butuh ini", dan ajakan komentar berhadiah.

Link mentah di badan post dampaknya tidak pasti karena sumber saling bertentangan. Default: tanpa link. Bila perlu, gunakan dokumen native atau artikel LinkedIn.

Hashtag berlebihan dan tag massal terbaca sebagai spam. Batas keras: 3 hashtag dan 5 mention.

Klaim prestasi yang tidak bisa diverifikasi berisiko terhadap reputasi saat wawancara. Setiap angka pada output harus punya rujukan pada catatan prestasi sumbernya; bila tidak ada, angka itu tidak boleh muncul.

## [id|style] Formula Headline

Pola dasar yang berlaku lintas role, dengan batas 220 karakter dan 80 karakter pertama sebagai bagian paling kritis: [Seniority] [Job Title yang dicari perekrut] | [2-3 hard skill atau tools] | [nilai atau dampak].

Contoh untuk beberapa role. AI/ML Engineer: "Machine Learning Engineer | RAG, LLM Ops, Python, Vector Search | Membawa model dari notebook ke produksi". Cloud/DevOps: "DevOps Engineer | Kubernetes, Terraform, GitLab CI | Menurunkan waktu rilis dari jam menjadi menit". Network/Infrastructure: "Network Engineer | BGP, OSPF, SD-WAN, Fiber Optic | Menjaga jaringan pabrik 24/7 tetap tersedia". OT/IT Cybersecurity: "OT/ICS Cybersecurity Engineer | IEC 62443, Purdue Model, SCADA/DCS | Mengamankan aset kritis tanpa menghentikan produksi". Data Engineer: "Data Engineer | Spark, Airflow, dbt, Snowflake | Membangun pipeline yang bisa dipercaya tim bisnis". Multi-role berbentuk T: "IT Infrastructure & Automation Professional | Network, OT Security, Python Automation | Menghubungkan dunia IT dan OT di industri proses".

Hindari kata kosong seperti passionate, ninja, enthusiast, guru, dan rockstar — tidak ada perekrut yang mencarinya lewat Boolean search. Maksimal 2 sampai 3 judul role eksplisit; lebih dari itu justru mengencerkan sinyal pada field Title. Jangan mengganti positioning secara drastis dan berulang, karena konsistensi membangun otoritas topik pada algoritma sekaligus kredibilitas pada manusia.

Headline mahasiswa yang efektif menyebut bidang studi, minat role target, dan satu sampai dua tools yang benar-benar dikuasai.

## [id|style] Struktur About tujuh blok

Total harus tetap di bawah 2.600 karakter, dan tiga kalimat pertama harus berdiri sendiri karena sisanya tersembunyi di balik tombol see more.

Blok 1 Hook, sekitar 200 karakter: pernyataan posisi yang bisa dibaca berdiri sendiri.
Blok 2 Peran dan kekuatan inti, sekitar 250 karakter: jabatan saat ini, domain, dan kompetensi teknis utama.
Blok 3 Pencapaian terkuantifikasi, sekitar 700 karakter: 2 sampai 4 butir dengan formula XYZ, diambil dari prestasi yang paling relevan dengan role target.
Blok 4 Cara kerja atau pendekatan, sekitar 400 karakter: bagaimana masalah biasanya diselesaikan; ini yang membedakan dari kandidat lain.
Blok 5 Kompetensi role sekunder, sekitar 300 karakter: hanya bila ada role sekunder, dan disambungkan lewat benang merah yang sama.
Blok 6 Sisi manusia, sekitar 250 karakter: kontribusi komunitas, open source, atau mentoring — ini yang memberi tekstur.
Blok 7 Arah dan ajakan, sekitar 200 karakter: ke mana ingin melangkah dan cara menghubungi.

## [id|style] Menyasar beberapa role tanpa terlihat tidak fokus

Temukan benang merah lebih dahulu: cari tema yang menyatukan seluruh role target lalu jadikan itu narasi utama. Contoh untuk profil IT industri, "menghubungkan sistem IT dan OT di lingkungan pabrik" menyatukan infrastruktur, keamanan OT, dan otomasi.

Gunakan headline berbentuk T: bagian horizontal berupa payung yang menangkap pencarian umum, bagian vertikal berupa 2 sampai 3 tools spesifik yang menangkap pencarian Boolean.

Batasi role eksplisit maksimal tiga.

Atur urutan skill berdasarkan prioritas: tiga slot pertama untuk role prioritas satu, sedangkan role sekunder mengisi urutan berikutnya, bukan slot yang disematkan.

Tulis bullet Experience yang bercabang dua: pada satu posisi yang relevan untuk dua role, buat bullet terpisah yang masing-masing menonjolkan sisi berbeda, sehingga keyword kedua role sama-sama terindeks.

Arahkan About ke depan, bukan ke belakang. Persona adalah alat untuk mencapai posisi berikutnya, bukan sekadar ringkasan riwayat.

## [id|style] Nada penulisan yang tidak terdengar pamer

Ceritakan proses dan pelajarannya, bukan hanya hasilnya. Beri kredit kepada pihak lain yang benar-benar terlibat. Post yang menyebutkan kegagalan atau kendala sebelum keberhasilan hampir selalu lebih dipercaya daripada pengumuman datar.

Gunakan sudut pandang orang pertama tanpa mengulang kata "saya" di setiap kalimat. Konsisten satu bahasa per entri. Angka selalu ditulis sebagai digit, misalnya "60 peserta" bukan "enam puluh peserta".

Hindari jargon internal kampus atau perusahaan yang tidak dipahami orang luar, dan jelaskan singkatan pada penyebutan pertama. Setiap entri harus bisa dipahami orang yang belum pernah mendengar organisasi atau lombanya.

Jangan pernah menyarankan otomatisasi publikasi ke LinkedIn, pembelian engagement, atau engagement pod. Publikasi otomatis untuk profil pribadi berada di wilayah abu-abu ketentuan layanan LinkedIn dan berisiko terhadap akun. Berhenti pada paket siap salin-tempel beserta instruksi kliknya.
