/**
 * Achievement Router — 12 aturan penempatan prestasi ke section LinkedIn.
 * Sumber: RisetBlueprintRAGPersonaLinkedIn.md Bab 4.
 *
 * Deterministik dan tanpa I/O: keputusan penempatan sengaja TIDAK diserahkan ke
 * LLM. Rule engine bisa diaudit, konsisten, dan diuji regresi; LLM hanya menulis
 * naskahnya. Karena tidak butuh jaringan maupun rahasia, modul ini berjalan di
 * peramban — badge penempatan tetap muncul walau GEMINI_API_KEY belum dipasang.
 *
 * Letaknya di _shared karena dibaca dua bundler: Vite lewat alias @shared/* dan
 * Deno lewat impor relatif.
 */
import type { SkmActivityInput } from "./linkedin-ai.ts";

/** SkmActivityInput + kolom yang hanya dipakai router. */
export interface RouterInput extends SkmActivityInput {
  certificate_url?: string | null;
}

export const DESTINATIONS = [
  "experience",
  "licenses_certifications",
  "courses",
  "projects",
  "honors_awards",
  "publications",
  "volunteer_experience",
  "featured",
  "post",
  "skip",
] as const;
export type Destination = (typeof DESTINATIONS)[number];

export const DESTINATION_LABEL: Record<Destination, string> = {
  experience: "Experience",
  licenses_certifications: "Licenses & Certifications",
  courses: "Courses",
  projects: "Projects",
  honors_awards: "Honors & Awards",
  publications: "Publications",
  volunteer_experience: "Volunteer Experience",
  featured: "Featured",
  post: "Post",
  skip: "Tidak diposting",
};

export type ProfileUpdate = "headline" | "about" | "skills" | "education_description";

export type AchievementKind =
  | "job_role"
  | "internship"
  | "freelance_or_contract"
  | "promotion"
  | "volunteer_role"
  | "certification_exam"
  | "digital_badge"
  | "mooc_completion"
  | "university_course"
  | "competition_result"
  | "internal_award"
  | "academic_paper"
  | "conference_paper"
  | "speaking_engagement"
  | "open_source_project"
  | "personal_project"
  | "capstone_or_thesis"
  | "one_time_short_event"
  | "community_org_role";

export interface AchievementAttrs {
  kind: AchievementKind;
  has_defined_role_and_duration: boolean;
  org_is_nonprofit_or_cause_based: boolean;
  is_paid: boolean | null;
  duration_days: number;
  issuer_is_third_party_verifiable: boolean;
  issuer_prestige: "none" | "low" | "high";
  required_proctored_exam: boolean;
  has_tangible_artifact: boolean;
  is_competitive_and_won: boolean;
  traction_signal: boolean;
  is_relevant_to_target_role: boolean;
  is_academic_credit_required: boolean;
  confidentiality: "public" | "internal" | "restricted";
  skills: string[];
}

export interface RoutingResult {
  targets: Destination[];
  profile_updates: ProfileUpdate[];
  rules_fired: string[];
  reasons: string[];
  /** RULE 12: destinasi menyentuh Experience/Education → broadcast ke jaringan. */
  notify_warning: boolean;
}

// --------------------------------------------------------------- deteksi teks

const RE_INTERNSHIP =
  /\b(magang|internship|kerja\s+prakt[ei]k|praktik\s+kerja\s+lapangan|pkl)\b/i;
const RE_THESIS = /\b(skripsi|tugas\s+akhir|capstone|thesis|disertasi|tesis)\b/i;
/**
 * Sengaja menuntut kata yang menandai KARYA TULIS, bukan sekadar nama acara.
 * Tanpa ini "Panitia Konferensi Nasional" ikut terbaca sebagai publikasi.
 */
const RE_PUBLICATION =
  /\b(jurnal|journal|prosiding|proceedings?|publikasi\s+ilmiah|artikel\s+ilmiah|makalah|paper|scopus|sinta)\b/i;
const RE_CONFERENCE_VENUE =
  /\b(konferensi|conference|prosiding|proceedings?|simposium|seminar\s+nasional)\b/i;
const RE_SPEAKER = /\b(pemateri|pembicara|narasumber|speaker|keynote|trainer)\b/i;
const RE_OPEN_SOURCE = /\b(open\s*source|github\.com|gitlab\.com|npm\s+package)\b/i;
const RE_PERSONAL_PROJECT = /\b(proyek\s+pribadi|personal\s+project|side\s+project)\b/i;
const RE_WON = /\b(juara|winner|pemenang|medali|gold|silver|bronze|1st|2nd|3rd)\b|\bperingkat\s*[123]\b/i;
const RE_URL = /https?:\/\/\S+/i;
const RE_ARTIFACT =
  /\b(reposit\w*|github|gitlab|aplikasi|website|situs|prototip\w*|purwarupa|dataset|laporan|makalah|paper|dokumen|rekaman|video|demo|sistem|dasbor|dashboard|modul|kurikulum)\b/i;
/** "internal kampus" bukan penanda kerahasiaan — itu tingkat lomba. */
const RE_CONFIDENTIAL =
  /\b(rahasia|confidential|\bnda\b|non[-\s]?disclosure|restricted|internal(?!\s*(kampus|campus)))\b/i;
const RE_TRACTION = /\b(pengguna|users?|unduh|download|stars?|adopsi|dipakai\s+oleh)\b/i;

function haystack(a: RouterInput): string {
  return [a.judul, a.tingkat ?? "", a.deskripsi ?? "", (a.skill_tags ?? []).join(" ")].join(" ");
}

function durationDays(a: RouterInput): number {
  const mulai = Date.parse(a.tanggal_mulai);
  const selesai = a.tanggal_selesai ? Date.parse(a.tanggal_selesai) : mulai;
  if (Number.isNaN(mulai) || Number.isNaN(selesai)) return 1;
  return Math.max(1, Math.round((selesai - mulai) / 86_400_000) + 1);
}

/**
 * `tingkat` diperiksa lebih dahulu karena itu data terstruktur dari
 * skm_point_rules; judul hanya cadangan untuk tingkat yang tidak membawa skala
 * (misalnya "Pembicara / Narasumber").
 */
function prestigeOf(tingkat: string | null, judul = ""): AchievementAttrs["issuer_prestige"] {
  const scale = (t: string): AchievementAttrs["issuer_prestige"] | null => {
    if (/internasional|international/i.test(t)) return "high";
    if (/nasional|national/i.test(t)) return "high";
    if (/regional|provinsi|kota|kabupaten/i.test(t)) return "low";
    if (/internal|kampus|universitas|fakultas|lembaga\s+pelatihan/i.test(t)) return "low";
    return null;
  };
  return scale(tingkat ?? "") ?? scale(judul) ?? "none";
}

function kindOf(a: RouterInput, days: number): AchievementKind {
  const text = haystack(a);
  if (RE_INTERNSHIP.test(a.judul) || RE_INTERNSHIP.test(a.deskripsi ?? "")) return "internship";
  if (RE_THESIS.test(text)) return "capstone_or_thesis";
  // `tingkat` adalah data terstruktur ("Pembicara / Narasumber"), jadi ia
  // mengalahkan heuristik teks bebas di bawahnya.
  if (RE_SPEAKER.test(a.tingkat ?? "") || RE_SPEAKER.test(a.judul)) return "speaking_engagement";
  if (RE_PUBLICATION.test(text)) {
    return RE_CONFERENCE_VENUE.test(text) ? "conference_paper" : "academic_paper";
  }
  if (RE_OPEN_SOURCE.test(text)) return "open_source_project";
  if (RE_PERSONAL_PROJECT.test(text)) return "personal_project";

  const k = a.kategori;
  if (k.startsWith("Prestasi")) {
    return /internal|kampus|perusahaan/i.test(a.tingkat ?? "")
      ? "internal_award"
      : "competition_result";
  }
  if (k.startsWith("Sertifikasi")) {
    if (a.credential_id) return "certification_exam";
    return prestigeOf(a.tingkat, a.judul) === "high" ? "digital_badge" : "mooc_completion";
  }
  if (k.startsWith("Pengalaman Organisasi") || k.startsWith("Kepanitiaan")) {
    return a.jam_sosial ? "volunteer_role" : "community_org_role";
  }
  // Workshop / Seminar / Pelatihan
  if (days <= 1 && !a.credential_id) return "one_time_short_event";
  return "mooc_completion";
}

/**
 * Menurunkan atribut blueprint §4.2 dari kolom skm_activities yang benar-benar
 * ada. Yang tidak bisa disimpulkan diberi default konservatif.
 */
export function deriveAttributes(a: RouterInput): AchievementAttrs {
  const days = durationDays(a);
  const kind = kindOf(a, days);
  const text = haystack(a);
  const deskripsi = a.deskripsi ?? "";

  // ponytail: blueprint memberi default confidentiality = "internal" karena
  // menyasar karyawan industri. Pengguna aplikasi ini mahasiswa dan datanya
  // prestasi kampus, jadi defaultnya "public" dan hanya naik bila deskripsi
  // memuat penanda kerahasiaan. Kalau modul ini dipakai untuk catatan kerja
  // profesional, balik defaultnya.
  const confidentiality: AchievementAttrs["confidentiality"] = RE_CONFIDENTIAL.test(deskripsi)
    ? "internal"
    : "public";

  return {
    kind,
    has_defined_role_and_duration: Boolean(a.judul && a.penyelenggara && a.tanggal_mulai),
    org_is_nonprofit_or_cause_based: Boolean(a.jam_sosial),
    is_paid: null, // tidak dicatat skm_activities
    duration_days: days,
    issuer_is_third_party_verifiable: Boolean(a.credential_id),
    issuer_prestige: prestigeOf(a.tingkat, a.judul),
    // Credential ID praktis selalu menyertai asesmen formal; sertifikat
    // kehadiran tidak menerbitkannya.
    required_proctored_exam: Boolean(a.credential_id),
    // certificate_url SENGAJA tidak dihitung artefak: itu bukti kredensial,
    // bukan deliverable. Kalau dihitung, tiap sertifikat akan jatuh ke Projects.
    has_tangible_artifact: RE_URL.test(deskripsi) || RE_ARTIFACT.test(deskripsi),
    is_competitive_and_won: RE_WON.test(a.judul) || RE_WON.test(a.tingkat ?? ""),
    traction_signal: RE_TRACTION.test(deskripsi),
    is_relevant_to_target_role: true, // Role Matcher = Fase 3 blueprint, belum ada
    is_academic_credit_required: RE_INTERNSHIP.test(text) || RE_THESIS.test(text),
    confidentiality,
    skills: (a.skill_tags ?? []).map((s) => s.replace(/^#/, "").trim().toLowerCase()),
  };
}

// ------------------------------------------------------------ 12 aturan Bab 4.3

/**
 * Menjalankan 12 aturan secara berurutan. Hasil boleh berlipat: satu prestasi
 * bisa mendarat di beberapa destinasi sekaligus.
 *
 * RULE 4 (kursus yang tumpang tindih) dan RULE 11 (pencegahan penumpukan)
 * butuh melihat SELURUH daftar prestasi, jadi bagian itu ada di pruneProfile().
 */
export function routeAchievement(at: AchievementAttrs): RoutingResult {
  const targets = new Set<Destination>();
  const updates = new Set<ProfileUpdate>();
  const fired: string[] = [];
  const reasons: string[] = [];

  const fire = (rule: string, why: string) => {
    if (!fired.includes(rule)) fired.push(rule);
    reasons.push(why);
  };

  // RULE 12 (kerahasiaan) dievaluasi LEBIH DAHULU daripada aturan visibilitas.
  // Blueprint §9.2: sistem yang memperlakukan semua prestasi sebagai bahan
  // konten gagal justru di titik ini.
  if (at.confidentiality === "restricted") {
    fire("RULE-12", "Ditandai rahasia — tidak diposting sama sekali.");
    return {
      targets: ["skip"],
      profile_updates: [],
      rules_fired: fired,
      reasons,
      notify_warning: false,
    };
  }
  const masked = at.confidentiality === "internal";
  if (masked) {
    fire(
      "RULE-12",
      "Deskripsi memuat penanda internal — samarkan nama sistem/klien sebelum dipakai, dan jangan diposting sebelum ada izin.",
    );
  }

  // RULE 1 — peran kerja formal
  if (
    ["job_role", "internship", "freelance_or_contract", "promotion"].includes(at.kind) &&
    at.has_defined_role_and_duration
  ) {
    if (!at.is_paid && at.org_is_nonprofit_or_cause_based) {
      targets.add("volunteer_experience");
      fire("RULE-1", "Peran tidak dibayar pada organisasi nirlaba — masuk Volunteer, bukan Experience.");
    } else {
      targets.add("experience");
      fire(
        "RULE-1",
        "Ada peran, organisasi, dan rentang tanggal yang jelas — masuk Experience. Perekrut memfilter kandidat lewat field ini.",
      );
    }
  }

  // RULE 2 — kerelawanan
  if (at.kind === "volunteer_role" && at.org_is_nonprofit_or_cause_based) {
    targets.add("volunteer_experience");
    fire("RULE-2", "Kegiatan sosial pada organisasi nirlaba — masuk Volunteer Experience.");
    if (at.has_tangible_artifact && at.duration_days >= 30) {
      targets.add("projects");
      reasons.push("Berlangsung ≥ 30 hari dan menghasilkan artefak — tambahkan juga ke Projects.");
    }
  }

  // RULE 3 — sertifikasi dan badge
  if (
    ["certification_exam", "digital_badge"].includes(at.kind) &&
    at.issuer_is_third_party_verifiable
  ) {
    targets.add("licenses_certifications");
    fire(
      "RULE-3",
      "Kredensial pihak ketiga yang dapat diverifikasi (ada Credential ID) — masuk Licenses & Certifications.",
    );
    if (at.issuer_prestige === "high" && at.is_relevant_to_target_role) {
      targets.add("featured");
      if (!masked) targets.add("post");
      updates.add("headline");
      updates.add("about");
      updates.add("skills");
      reasons.push(
        "Penerbitnya bergengsi dan relevan dengan role target — layak masuk Featured, dijadikan post, dan diangkat ke Headline/Skills/About.",
      );
    }
  }

  // RULE 4 — kursus daring (bagian per-item; cek tumpang tindih ada di pruneProfile)
  if (at.kind === "mooc_completion") {
    if (!at.required_proctored_exam && at.issuer_prestige !== "high") {
      if (at.issuer_is_third_party_verifiable) {
        targets.add("licenses_certifications");
        fire("RULE-4", "Kursus tanpa ujian terawasi — boleh masuk Certifications, tapi prioritas rendah.");
      } else {
        targets.add("courses");
        fire(
          "RULE-4",
          "Tidak ada kredensial pihak ketiga — masuk Courses, bukan Licenses & Certifications.",
        );
      }
    } else {
      targets.add("licenses_certifications");
      fire("RULE-4", "Ada asesmen formal atau penerbit bergengsi — masuk Licenses & Certifications.");
    }
    if (at.has_tangible_artifact) {
      targets.add("projects");
      reasons.push("Menghasilkan capstone/artefak — tambahkan juga ke Projects.");
    }
  }
  if (at.kind === "university_course") {
    targets.add("courses");
    fire("RULE-4", "Mata kuliah tanpa kredensial pihak ketiga — masuk Courses.");
  }

  // RULE 5 — lomba dan penghargaan
  if (["competition_result", "internal_award"].includes(at.kind)) {
    if (at.is_competitive_and_won) {
      targets.add("honors_awards");
      fire(
        "RULE-5",
        "Kompetitif dan menang — masuk Honors & Awards. Tulis peringkat dan skalanya, misalnya “Juara 1 dari 84 tim”.",
      );
      if (at.has_tangible_artifact) {
        targets.add("projects");
        reasons.push("Ada produk/artefak yang dihasilkan — tambahkan juga ke Projects.");
      }
      if (at.issuer_prestige === "high") {
        targets.add("featured");
        if (!masked) targets.add("post");
        reasons.push("Skala nasional/internasional — layak masuk Featured dan dijadikan post.");
      }
    } else if (at.kind === "competition_result") {
      if (at.has_tangible_artifact) {
        targets.add("projects");
        fire("RULE-5", "Ikut lomba tanpa menang, tapi ada artefak — masuk Projects, bukan Honors & Awards.");
      } else {
        if (!masked) targets.add("post");
        fire("RULE-5", "Ikut lomba tanpa menang dan tanpa artefak — cukup jadi post, bukan entri permanen.");
      }
    }
  }

  // RULE 6 — publikasi
  if (["academic_paper", "conference_paper"].includes(at.kind)) {
    targets.add("publications");
    targets.add("featured");
    if (!masked) targets.add("post");
    fire("RULE-6", "Diterbitkan pihak penerbit dan punya tautan permanen — Publications + Featured + Post.");
  }

  // RULE 7 — menjadi pembicara
  if (at.kind === "speaking_engagement") {
    if (at.duration_days <= 1 && at.issuer_prestige !== "high" && !at.has_tangible_artifact) {
      if (!masked) targets.add("post");
      fire("RULE-7", "Sesi singkat tanpa rekaman dan tanpa penerbit bergengsi — cukup jadi post.");
    } else {
      if (at.has_tangible_artifact) {
        targets.add("featured");
        fire("RULE-7", "Ada rekaman atau slide — simpan sebagai bukti di Featured.");
      }
      if (at.issuer_prestige === "high") {
        targets.add("honors_awards");
        if (!masked) targets.add("post");
        fire("RULE-7", "Diundang institusi bergengsi — layak dicatat di Honors & Awards.");
      }
      if (targets.size === 0 && !masked) {
        targets.add("post");
        fire("RULE-7", "Belum ada artefak maupun prestise penerbit — mulai dari post dulu.");
      }
    }
  }

  // RULE 8 — proyek pribadi dan open source
  if (["open_source_project", "personal_project"].includes(at.kind)) {
    targets.add("projects");
    targets.add("featured");
    fire("RULE-8", "Ada deliverable konkret — masuk Projects, dan tautannya layak dipajang di Featured.");
    if (at.traction_signal && !masked) {
      targets.add("post");
      reasons.push("Ada sinyal adopsi nyata (pengguna/unduhan) — layak diceritakan sebagai post.");
    }
  }

  // RULE 9 — kampus
  if (at.kind === "capstone_or_thesis") {
    updates.add("education_description");
    fire("RULE-9", "Ringkas tugas akhir pada field Description di Education.");
    if (at.has_tangible_artifact) {
      targets.add("projects");
      reasons.push("Menghasilkan artefak yang bisa ditunjukkan — tambahkan sebagai Projects.");
    }
  }
  if (at.kind === "internship" && at.is_academic_credit_required) {
    targets.add("experience");
    fire(
      "RULE-9",
      "Kerja Praktek/PKL diperlakukan sama seperti magang: Experience dengan employment type Internship — bukan Education, bukan Volunteer.",
    );
  }

  // RULE 10 — partisipasi pasif
  if (
    at.kind === "one_time_short_event" &&
    at.duration_days <= 1 &&
    !at.issuer_is_third_party_verifiable &&
    !at.is_competitive_and_won &&
    !at.has_tangible_artifact
  ) {
    if (!masked) targets.add("post");
    fire(
      "RULE-10",
      "Kegiatan satu hari tanpa sertifikat terverifikasi dan tanpa artefak — cukup jadi post, jangan menambah entri profil.",
    );
  }

  // Kepanitiaan dan organisasi kampus: belum ditangani aturan mana pun di atas.
  // Blueprint §9.3 — organisasi/kepanitiaan mengisi Experience bila belum ada
  // pengalaman kerja formal; yang murni sosial masuk Volunteer (RULE 2).
  if (at.kind === "community_org_role" && at.has_defined_role_and_duration) {
    targets.add("experience");
    fire(
      "RULE-1",
      "Peran organisasi/kepanitiaan dengan jabatan dan rentang waktu yang jelas — isi Experience, karena perekrut memfilter lewat field itu.",
    );
    if (at.has_tangible_artifact && at.duration_days >= 30) {
      targets.add("projects");
      reasons.push("Menghasilkan artefak dan berjalan ≥ 30 hari — tambahkan juga ke Projects.");
    }
  }

  if (targets.size === 0) {
    targets.add(masked ? "skip" : "post");
    reasons.push(
      masked
        ? "Tidak ada destinasi yang aman selama detail internalnya belum disamarkan."
        : "Tidak ada aturan yang menyala — belum cukup kuat untuk entri permanen, mulai dari post.",
    );
  }

  const list = [...targets];
  return {
    targets: list,
    profile_updates: [...updates],
    rules_fired: fired,
    reasons,
    notify_warning: list.includes("experience") || updates.has("education_description"),
  };
}

/** Jalan pintas: dari baris skm_activities langsung ke keputusan. */
export function routeActivity(a: RouterInput): RoutingResult {
  return routeAchievement(deriveAttributes(a));
}

// ------------------------------------------------------- RULE 11 (lintas item)

export interface PruneSuggestion {
  id: string;
  judul: string;
  action: "demote" | "trim";
  reason: string;
}

/**
 * RULE 11 — pencegahan penumpukan. Butuh seluruh daftar, jadi terpisah dari
 * routeAchievement(). Blueprint: >7 sertifikasi dan >3 penghargaan menurunkan
 * kredibilitas, bukan menaikkannya.
 */
export function pruneProfile(
  items: { id: string; activity: RouterInput; result?: RoutingResult }[],
): PruneSuggestion[] {
  const out: PruneSuggestion[] = [];
  const rows = items.map((it) => ({
    ...it,
    attrs: deriveAttributes(it.activity),
    result: it.result ?? routeActivity(it.activity),
  }));

  // Bagian RULE 4 yang butuh konteks: kursus tanpa ujian yang skill-nya sudah
  // dicakup sertifikasi berujian.
  const coveredByExam = new Set<string>();
  for (const r of rows) {
    if (r.attrs.required_proctored_exam) r.attrs.skills.forEach((s) => coveredByExam.add(s));
  }
  for (const r of rows) {
    if (r.attrs.required_proctored_exam || r.attrs.skills.length === 0) continue;
    if (!r.result.targets.includes("licenses_certifications")) continue;
    if (r.attrs.skills.every((s) => coveredByExam.has(s))) {
      out.push({
        id: r.id,
        judul: r.activity.judul,
        action: "demote",
        reason:
          "Seluruh skill-nya sudah dibuktikan sertifikasi berujian yang lain — cukup pastikan skill-nya ada di profil, entrinya tidak perlu.",
      });
    }
  }

  const certs = rows.filter((r) => r.result.targets.includes("licenses_certifications"));
  if (certs.length > 7) {
    // Yang tanpa ujian dipangkas lebih dahulu, lalu yang penerbitnya paling lemah.
    const rank = { high: 2, low: 1, none: 0 } as const;
    const weakest = [...certs]
      .sort(
        (a, b) =>
          Number(a.attrs.required_proctored_exam) - Number(b.attrs.required_proctored_exam) ||
          rank[a.attrs.issuer_prestige] - rank[b.attrs.issuer_prestige],
      )
      .slice(0, certs.length - 7);
    for (const r of weakest) {
      if (out.some((o) => o.id === r.id)) continue;
      out.push({
        id: r.id,
        judul: r.activity.judul,
        action: "trim",
        reason: `Ada ${certs.length} sertifikasi; batas sehatnya 3–7. Pindahkan buktinya ke satu tautan portofolio di Featured.`,
      });
    }
  }

  const awards = rows.filter((r) => r.result.targets.includes("honors_awards"));
  if (awards.length > 3) {
    const rank = { high: 2, low: 1, none: 0 } as const;
    const weakest = [...awards]
      .sort((a, b) => rank[a.attrs.issuer_prestige] - rank[b.attrs.issuer_prestige])
      .slice(0, awards.length - 3);
    for (const r of weakest) {
      if (out.some((o) => o.id === r.id)) continue;
      out.push({
        id: r.id,
        judul: r.activity.judul,
        action: "trim",
        reason: `Ada ${awards.length} penghargaan; tampilkan 3 yang paling relevan dengan role target.`,
      });
    }
  }

  return out;
}
