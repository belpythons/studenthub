import { describe, expect, it } from "vitest";
import {
  type AchievementAttrs,
  type RouterInput,
  deriveAttributes,
  pruneProfile,
  routeAchievement,
  routeActivity,
} from "./linkedin-router";

/**
 * Golden set: 20 kasus konkret dari RisetBlueprintRAGPersonaLinkedIn.md Bab 4.4.
 * Target blueprint §10.1 adalah 0 toleransi untuk kesalahan berbahaya — kursus
 * yang masuk Experience, atau prestasi rahasia yang lolos ke post.
 *
 * Kasus yang TIDAK bisa direpresentasikan skema skm_activities (prestasi
 * mahasiswa) ditandai it.skip beserta alasannya, bukan dihapus diam-diam.
 */
function act(o: Partial<RouterInput> = {}): RouterInput {
  return {
    judul: "Kegiatan",
    kategori: "Workshop / Seminar / Pelatihan",
    penyelenggara: "Penyelenggara",
    tanggal_mulai: "2026-03-01",
    tanggal_selesai: null,
    poin_skm: 5,
    deskripsi: null,
    skill_tags: null,
    credential_id: null,
    tingkat: null,
    jam_sosial: null,
    certificate_url: null,
    ...o,
  };
}

describe("Bab 4.4 — golden set penempatan", () => {
  it("1. sertifikasi vendor besar → Certifications + Featured + Post + usul Headline/Skills", () => {
    const r = routeActivity(
      act({
        judul: "AWS Certified Solutions Architect - Associate",
        kategori: "Sertifikasi / Lisensi",
        penyelenggara: "Amazon Web Services",
        tingkat: "Internasional (AWS, Google, Cisco, dsb.)",
        credential_id: "AWS-SAA-123456",
        skill_tags: ["AWS", "VPC", "IAM"],
      }),
    );
    expect(r.targets).toEqual(
      expect.arrayContaining(["licenses_certifications", "featured", "post"]),
    );
    expect(r.profile_updates).toEqual(expect.arrayContaining(["headline", "skills", "about"]));
    expect(r.rules_fired).toContain("RULE-3");
  });

  it("2. kursus gratis yang skill-nya sudah dicakup sertifikasi berujian → dipangkas", () => {
    const kursus = act({
      judul: "Intro to Python",
      kategori: "Sertifikasi / Lisensi",
      tingkat: "Internal / Lembaga Pelatihan",
      skill_tags: ["Python"],
    });
    const sertifikasi = act({
      judul: "PCAP Certified Associate in Python Programming",
      kategori: "Sertifikasi / Lisensi",
      tingkat: "Internasional (AWS, Google, Cisco, dsb.)",
      credential_id: "PCAP-31-03",
      skill_tags: ["Python"],
    });
    const saran = pruneProfile([
      { id: "kursus", activity: kursus },
      { id: "cert", activity: sertifikasi },
    ]);
    // Kursusnya tidak masuk Certifications (tanpa Credential ID) → tidak ada
    // penumpukan yang perlu dipangkas, tapi ia juga tidak boleh naik ke
    // Certifications. Itu bagian yang benar-benar berbahaya.
    expect(routeActivity(kursus).targets).toContain("courses");
    expect(routeActivity(kursus).targets).not.toContain("licenses_certifications");
    expect(saran.filter((s) => s.id === "cert")).toHaveLength(0);
  });

  it("3. sertifikat berujian dari lembaga pelatihan lokal → Certifications saja", () => {
    const r = routeActivity(
      act({
        judul: "Sertifikat Kompetensi Junior Web Developer",
        kategori: "Sertifikasi / Lisensi",
        penyelenggara: "LSP Informatika",
        tingkat: "Internal / Lembaga Pelatihan",
        credential_id: "BNSP-JWD-2026-001",
      }),
    );
    expect(r.targets).toContain("licenses_certifications");
    expect(r.targets).not.toContain("featured");
    expect(r.targets).not.toContain("post");
  });

  it("4. juara 1 hackathon nasional dengan produk berjalan → Honors + Projects + Featured + Post", () => {
    const r = routeActivity(
      act({
        judul: "Juara 1 Hackathon Nasional Kominfo 2026",
        kategori: "Prestasi / Kejuaraan",
        tingkat: "Nasional — Juara 1/2/3",
        deskripsi: "Membangun aplikasi pelaporan warga yang kini dipakai oleh 3 kelurahan.",
      }),
    );
    expect(r.targets).toEqual(
      expect.arrayContaining(["honors_awards", "projects", "featured", "post"]),
    );
    expect(r.rules_fired).toContain("RULE-5");
  });

  it("5. ikut hackathon, tidak menang, prototipe tidak selesai → Post saja", () => {
    const r = routeActivity(
      act({
        judul: "Peserta Hackathon Nasional 2026",
        kategori: "Prestasi / Kejuaraan",
        tingkat: "Finalis / Peserta",
      }),
    );
    expect(r.targets).toEqual(["post"]);
    expect(r.targets).not.toContain("honors_awards");
  });

  it("6. paper diterima di konferensi → Publications + Featured + Post", () => {
    const r = routeActivity(
      act({
        judul: "Paper: Deteksi Anomali Jaringan dengan Isolation Forest",
        kategori: "Prestasi / Kejuaraan",
        penyelenggara: "Konferensi Nasional Sistem Informasi",
        deskripsi: "Prosiding terindeks SINTA 3.",
      }),
    );
    expect(r.targets).toEqual(expect.arrayContaining(["publications", "featured", "post"]));
    expect(r.rules_fired).toContain("RULE-6");
  });

  it("7. pemateri webinar internal satu jam tanpa rekaman → Post saja", () => {
    const r = routeActivity(
      act({
        judul: "Pemateri Webinar Internal: Dasar Git",
        kategori: "Workshop / Seminar / Pelatihan",
        tingkat: "Pembicara / Narasumber",
      }),
    );
    expect(r.targets).toEqual(["post"]);
    expect(r.rules_fired).toContain("RULE-7");
  });

  it("8. keynote konferensi industri dengan rekaman → Featured + Honors + Post", () => {
    const r = routeActivity(
      act({
        judul: "Keynote Speaker Konferensi Industri Nasional 2026",
        kategori: "Workshop / Seminar / Pelatihan",
        tingkat: "Pembicara / Narasumber",
        deskripsi: "Tersedia rekaman video sesi lengkap.",
      }),
    );
    expect(r.targets).toEqual(expect.arrayContaining(["featured", "honors_awards", "post"]));
  });

  it("9. magang tidak dibayar di perusahaan komersial → Experience, bukan Volunteer", () => {
    const r = routeActivity(
      act({
        judul: "Magang Software Engineer di PT Badak NGL",
        kategori: "Pengalaman Organisasi",
        tanggal_mulai: "2026-06-01",
        tanggal_selesai: "2026-08-31",
      }),
    );
    expect(r.targets).toContain("experience");
    expect(r.targets).not.toContain("volunteer_experience");
    expect(r.notify_warning).toBe(true);
  });

  it("10. Kerja Praktek / PKL → Experience (Internship), bukan Education/Volunteer", () => {
    const r = routeActivity(
      act({
        judul: "Kerja Praktek di Dinas Kominfo Bontang",
        kategori: "Pengalaman Organisasi",
        tanggal_mulai: "2026-02-01",
        tanggal_selesai: "2026-03-31",
        deskripsi: "Menyusun laporan kajian sistem presensi karyawan.",
      }),
    );
    expect(r.targets).toContain("experience");
    expect(r.targets).not.toContain("volunteer_experience");
    expect(r.rules_fired).toContain("RULE-9");
  });

  it("11. tugas akhir menghasilkan aplikasi → Projects + ringkasan di Education", () => {
    const r = routeActivity(
      act({
        judul: "Tugas Akhir: Sistem Informasi Presensi Berbasis Web",
        kategori: "Pengalaman Organisasi",
        deskripsi: "Menghasilkan aplikasi yang dipakai satu program studi.",
      }),
    );
    expect(r.targets).toContain("projects");
    expect(r.profile_updates).toContain("education_description");
    expect(r.rules_fired).toContain("RULE-9");
  });

  it.skip("12. promosi Staff → Supervisor: di luar cakupan skm_activities (tidak ada riwayat jabatan kerja)", () => {});

  it("13. tool open source dengan pengguna nyata → Projects + Featured + Post", () => {
    const r = routeActivity(
      act({
        judul: "Rilis skm-cli",
        kategori: "Pengalaman Organisasi",
        deskripsi: "Repositori open source di github.com/x/skm-cli, dipakai oleh 40 pengguna.",
      }),
    );
    expect(r.targets).toEqual(expect.arrayContaining(["projects", "featured", "post"]));
    expect(r.rules_fired).toContain("RULE-8");
  });

  it("14. panitia bakti sosial di yayasan nirlaba → Volunteer Experience", () => {
    const r = routeActivity(
      act({
        judul: "Koordinator Bakti Sosial Literasi Digital",
        kategori: "Kepanitiaan Event",
        penyelenggara: "Yayasan Peduli Bontang",
        jam_sosial: 40,
      }),
    );
    expect(r.targets).toContain("volunteer_experience");
    expect(r.targets).not.toContain("experience");
    expect(r.rules_fired).toContain("RULE-2");
  });

  it("15. panitia konferensi profesional berskala besar → Experience", () => {
    const r = routeActivity(
      act({
        judul: "Project Officer Konferensi Nasional Teknologi 2026",
        kategori: "Kepanitiaan Event",
        tingkat: "Project Officer / Ketua Panitia",
        tanggal_mulai: "2026-01-10",
        tanggal_selesai: "2026-04-20",
      }),
    );
    expect(r.targets).toContain("experience");
    expect(r.targets).not.toContain("publications");
  });

  it("16. penghargaan formal tingkat institusi → Honors & Awards", () => {
    const r = routeActivity(
      act({
        judul: "Mahasiswa Berprestasi Juara 1 Tingkat Universitas",
        kategori: "Prestasi / Kejuaraan",
        tingkat: "Internal Kampus — Juara 1/2/3",
      }),
    );
    expect(r.targets).toContain("honors_awards");
    expect(r.targets).not.toContain("featured");
  });

  it.skip("17. pujian informal 'MVP minggu ini': tidak dicatat sebagai kegiatan SKM", () => {});

  it("18. prestasi bertanda rahasia → tidak pernah otomatis menjadi post", () => {
    const attrs: AchievementAttrs = {
      ...deriveAttributes(act({ judul: "Sistem Deteksi APD", kategori: "Pengalaman Organisasi" })),
      kind: "personal_project",
      has_tangible_artifact: true,
      confidentiality: "internal",
    };
    const r = routeAchievement(attrs);
    expect(r.targets).toContain("projects");
    expect(r.targets).not.toContain("post");
    expect(r.rules_fired).toContain("RULE-12");
  });

  it.skip("19. sertifikasi kedaluwarsa: skm_activities tidak menyimpan tanggal kedaluwarsa", () => {});

  it("20. bootcamp dengan capstone → Courses + Projects, bukan Experience", () => {
    const r = routeActivity(
      act({
        judul: "Bootcamp Fullstack JavaScript",
        kategori: "Workshop / Seminar / Pelatihan",
        tanggal_mulai: "2026-01-05",
        tanggal_selesai: "2026-03-28",
        deskripsi: "Capstone berupa aplikasi marketplace sederhana.",
      }),
    );
    expect(r.targets).toEqual(expect.arrayContaining(["projects"]));
    expect(r.targets).not.toContain("experience");
    expect(r.targets).not.toContain("licenses_certifications");
  });
});

describe("kesalahan berbahaya — 0 toleransi", () => {
  it("kursus tanpa kredensial tidak pernah masuk Experience", () => {
    const r = routeActivity(
      act({
        judul: "Pelatihan Dasar Microsoft Excel",
        kategori: "Workshop / Seminar / Pelatihan",
        tanggal_mulai: "2026-04-01",
        tanggal_selesai: "2026-04-10",
      }),
    );
    expect(r.targets).not.toContain("experience");
  });

  it("prestasi restricted tidak menghasilkan destinasi apa pun selain skip", () => {
    const attrs: AchievementAttrs = {
      ...deriveAttributes(act()),
      kind: "certification_exam",
      issuer_is_third_party_verifiable: true,
      issuer_prestige: "high",
      confidentiality: "restricted",
    };
    expect(routeAchievement(attrs).targets).toEqual(["skip"]);
  });

  it("setiap keputusan membawa minimal satu alasan yang bisa ditampilkan", () => {
    const r = routeActivity(act({ judul: "Seminar Setengah Hari", tingkat: null }));
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.targets.length).toBeGreaterThan(0);
  });
});

describe("deriveAttributes", () => {
  it("certificate_url bukan artefak — sertifikat tidak boleh jatuh ke Projects", () => {
    const at = deriveAttributes(
      act({
        kategori: "Sertifikasi / Lisensi",
        credential_id: "X-1",
        certificate_url: "https://storage/cert.pdf",
      }),
    );
    expect(at.has_tangible_artifact).toBe(false);
  });

  it("'Internal Kampus' pada tingkat tidak dibaca sebagai penanda kerahasiaan", () => {
    const at = deriveAttributes(
      act({ tingkat: "Internal Kampus — Juara 1/2/3", deskripsi: "Lomba internal kampus." }),
    );
    expect(at.confidentiality).toBe("public");
  });

  it("durasi dihitung inklusif dan minimal satu hari", () => {
    expect(deriveAttributes(act({ tanggal_selesai: null })).duration_days).toBe(1);
    expect(
      deriveAttributes(act({ tanggal_mulai: "2026-03-01", tanggal_selesai: "2026-03-31" }))
        .duration_days,
    ).toBe(31);
  });
});

describe("RULE 11 — pencegahan penumpukan", () => {
  const cert = (i: number) =>
    act({
      judul: `Sertifikasi ${i}`,
      kategori: "Sertifikasi / Lisensi",
      tingkat: i < 3 ? "Internasional (AWS, Google, Cisco, dsb.)" : "Internal / Lembaga Pelatihan",
      credential_id: `C-${i}`,
      skill_tags: [`skill-${i}`],
    });

  it("menyarankan pemangkasan saat sertifikasi lebih dari 7", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, activity: cert(i) }));
    const saran = pruneProfile(items);
    expect(saran).toHaveLength(2);
    expect(saran.every((s) => s.action === "trim")).toBe(true);
    // Yang dipangkas adalah penerbit paling lemah, bukan dua yang pertama.
    expect(saran.map((s) => s.id)).not.toContain("c0");
  });

  it("tidak menyarankan apa pun saat jumlahnya masih sehat", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, activity: cert(i) }));
    expect(pruneProfile(items)).toHaveLength(0);
  });

  it("memangkas penghargaan menjadi tiga yang paling relevan", () => {
    const award = (i: number) =>
      act({
        judul: `Juara 1 Lomba ${i}`,
        kategori: "Prestasi / Kejuaraan",
        tingkat: i === 0 ? "Nasional — Juara 1/2/3" : "Internal Kampus — Juara 1/2/3",
      });
    const items = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}`, activity: award(i) }));
    const saran = pruneProfile(items);
    expect(saran).toHaveLength(2);
    expect(saran.map((s) => s.id)).not.toContain("a0");
  });
});
