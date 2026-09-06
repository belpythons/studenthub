/**
 * Validator naskah LinkedIn — RisetBlueprintRAGPersonaLinkedIn.md Bab 7.6.
 *
 * Deterministik dan tanpa I/O, sama seperti linkedin-router: dijalankan di
 * peramban atas draft AI MAUPUN atas teks yang sudah diedit tangan. Validasi
 * harus terjadi sebelum publikasi, karena mengedit post setelah terbit terkena
 * penalti jangkauan dan entri profil yang dihapus meninggalkan jejak notifikasi
 * yang sudah terkirim.
 *
 * Enam dari delapan pemeriksaan blueprint dikerjakan di sini. Yang sengaja
 * dilewati: pemeriksaan kerahasiaan (butuh daftar istilah internal perusahaan —
 * tidak relevan untuk prestasi mahasiswa; penandanya sudah ditangani RULE 12 di
 * linkedin-router) dan pemeriksaan duplikasi (butuh riwayat post 90 hari yang
 * belum ada). LLM-juri Lampiran B.4 juga dilewati: enam pemeriksaan di bawah
 * menangkap semua yang bisa diperiksa tanpa menebak, dengan biaya nol.
 */
import type { RouterInput } from "./linkedin-router.ts";

export type ValidationTarget =
  | "experience"
  | "certification"
  | "award"
  | "volunteering"
  | "headline"
  | "about"
  | "post";

export type Severity = "error" | "warning";

export interface Violation {
  rule: string;
  severity: Severity;
  message: string;
}

/** Batas karakter Bab 2.2. `soft` = batas "aman tampil" sebelum terpotong. */
export const CHAR_LIMITS: Record<ValidationTarget, { max: number; soft?: number; label: string }> =
  {
    experience: { max: 2000, label: "Description Experience" },
    certification: { max: 2000, label: "Keterangan sertifikasi" },
    award: { max: 2000, label: "Description Honors & Awards" },
    volunteering: { max: 2000, label: "Description Volunteer" },
    headline: { max: 220, soft: 80, label: "Headline" },
    about: { max: 2600, soft: 300, label: "About" },
    post: { max: 3000, soft: 2500, label: "Post" },
  };

export const HOOK_LIMIT = 140;
export const MAX_HASHTAG = 3;
export const MAX_MENTION = 5;
/** Blueprint §7.6: minimal 2 entitas spesifik agar tidak terbaca konten generik. */
export const MIN_SPECIFIC_ENTITIES = 2;

/** Daftar hitam Bab 3.3 dan 3.4. */
const BANNED: { re: RegExp; message: string }[] = [
  {
    re: /\b(i am|i'm|so|really)?\s*(excited|thrilled|humbled|delighted)\s+to\s+(announce|share)\b/i,
    message: 'Pembuka klise ("excited/thrilled/humbled to announce") — mulai dari masalah atau angka.',
  },
  {
    re: /\balhamdulillah\s+akhirnya\b|\bakhirnya\s+setelah\s+sekian\s+lama\b/i,
    message: 'Pembuka klise ("Alhamdulillah akhirnya") — ganti dengan kalimat yang menyatakan ketegangan nyata.',
  },
  {
    re: /\b(komen|comment|tulis)\s+["“]?(yes|ya|setuju)\b|\btag\s+(teman|rekan|seseorang)\b|\blike\s+dan\s+share\b/i,
    message: "Engagement bait — LinkedIn menurunkan jangkauannya. Ganti dengan pertanyaan terbuka.",
  },
  {
    re: /\b(passionate|enthusiast|ninja|rockstar|guru|wizard)\b/i,
    message: "Kata kosong yang tidak pernah dicari perekrut lewat Boolean search.",
  },
  {
    re: /\b(terbaik\s+di\s+(dunia|indonesia)|nomor\s+satu|paling\s+hebat|world[-\s]class)\b/i,
    message: "Klaim superlatif tanpa bukti — hapus atau ganti dengan angka yang bisa dipertanggungjawabkan.",
  },
  {
    re: /(?:\p{Extended_Pictographic}️?\s*){3,}/u,
    message: "Emoji beruntun (3 atau lebih) terbaca sebagai spam.",
  },
];

const RE_NUMBER = /\d[\d.,]*/g;

/** "1.284" dan "1,284" dinormalkan ke "1284"; "35%" ke "35". */
function normalizeNumbers(text: string): string[] {
  return (text.match(RE_NUMBER) ?? [])
    .map((n) => n.replace(/[.,](?=\d{3}\b)/g, "").replace(/[.,]$/, ""))
    .map((n) => n.replace(/^0+(?=\d)/, ""))
    .filter(Boolean);
}

function sourceNumbers(a: RouterInput): Set<string> {
  const raw = [
    a.judul,
    a.deskripsi ?? "",
    a.tingkat ?? "",
    a.penyelenggara,
    a.credential_id ?? "",
    a.tanggal_mulai,
    a.tanggal_selesai ?? "",
    String(a.poin_skm),
    a.jam_sosial === null || a.jam_sosial === undefined ? "" : String(a.jam_sosial),
    (a.skill_tags ?? []).join(" "),
  ].join(" ");
  const set = new Set(normalizeNumbers(raw));
  // Tanggal ditulis ulang dalam banyak bentuk; terima juga komponennya apa adanya.
  for (const tgl of [a.tanggal_mulai, a.tanggal_selesai ?? ""]) {
    for (const part of tgl.split("-")) {
      if (!part) continue;
      set.add(part);
      set.add(part.replace(/^0+(?=\d)/, ""));
    }
  }
  return set;
}

/** Kalimat pertama, dipakai sebagai hook. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const line = trimmed.split(/\r?\n/)[0] ?? "";
  const m = line.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : line).trim();
}

export function validateDraft(
  text: string,
  opts: { seksi: ValidationTarget; activity?: RouterInput },
): Violation[] {
  const out: Violation[] = [];
  const body = text.trim();
  if (!body) return [{ rule: "kosong", severity: "error", message: "Draft masih kosong." }];

  // 1. Batas karakter
  const limit = CHAR_LIMITS[opts.seksi];
  if (body.length > limit.max) {
    out.push({
      rule: "batas-karakter",
      severity: "error",
      message: `${limit.label} ${body.length}/${limit.max} karakter — LinkedIn akan menolak sisanya. Pangkas ${body.length - limit.max} karakter.`,
    });
  } else if (limit.soft && body.length > limit.soft) {
    out.push({
      rule: "batas-tampil",
      severity: "warning",
      message: `${body.length}/${limit.max} karakter. Hanya ~${limit.soft} karakter pertama yang tampil sebelum terpotong — pastikan bagian terpenting ada di sana.`,
    });
  }

  // 2. Panjang hook (post saja)
  if (opts.seksi === "post") {
    const hook = firstSentence(body);
    if (hook.length > HOOK_LIMIT) {
      out.push({
        rule: "hook",
        severity: "error",
        message: `Hook ${hook.length}/${HOOK_LIMIT} karakter. Preview mobile terpotong di ~140 karakter, jadi kalimat pertama harus selesai sebelum itu.`,
      });
    }
  }

  // 3. Integritas angka
  if (opts.activity) {
    const known = sourceNumbers(opts.activity);
    const unknown = [...new Set(normalizeNumbers(body))].filter((n) => !known.has(n));
    if (unknown.length > 0) {
      out.push({
        rule: "integritas-angka",
        severity: "warning",
        message: `Angka yang tidak ada di data kegiatan: ${unknown.join(", ")}. Pastikan bisa dipertanggungjawabkan saat wawancara, atau hapus. Angka yang tidak bisa dijelaskan lebih berbahaya daripada tidak ada angka sama sekali.`,
      });
    }
  }

  // 4. Frasa terlarang
  for (const b of BANNED) {
    const m = body.match(b.re);
    if (m) {
      out.push({
        rule: "frasa-terlarang",
        severity: "error",
        message: `${b.message} Ditemukan: "${m[0].trim()}".`,
      });
    }
  }

  // 5. Kekhasan — anti konten generik
  const entities = new Set<string>(normalizeNumbers(body));
  if (opts.activity) {
    const org = opts.activity.penyelenggara.trim();
    if (org && body.toLowerCase().includes(org.toLowerCase())) entities.add(`org:${org}`);
  }
  if (/\b(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)\w*\b/i.test(body)) {
    entities.add("tanggal");
  }
  if (entities.size < MIN_SPECIFIC_ENTITIES) {
    out.push({
      rule: "kekhasan",
      severity: "warning",
      message: `Hanya ${entities.size} entitas spesifik (angka, nama organisasi, tanggal). LinkedIn menekan konten yang terbaca generik — minimal ${MIN_SPECIFIC_ENTITIES}.`,
    });
  }

  // 6. Kesesuaian keyword role
  const tags = (opts.activity?.skill_tags ?? []).map((t) => t.replace(/^#/, "").trim()).filter(Boolean);
  if (tags.length > 0 && !tags.some((t) => body.toLowerCase().includes(t.toLowerCase()))) {
    out.push({
      rule: "keyword",
      severity: "warning",
      message: `Tidak ada satu pun skill tag yang muncul (${tags.join(", ")}). Sisipkan yang paling relevan secara wajar — jangan ditempel paksa.`,
    });
  }

  // Batas hashtag dan mention (blueprint §8.1 butir 14)
  const hashtags = body.match(/(?:^|\s)#[\p{L}\p{N}_]+/gu) ?? [];
  if (hashtags.length > MAX_HASHTAG) {
    out.push({
      rule: "hashtag",
      severity: "error",
      message: `${hashtags.length} hashtag, batasnya ${MAX_HASHTAG}. Hashtag bukan lagi mekanisme distribusi sejak fitur follow hashtag dihapus.`,
    });
  }
  const mentions = body.match(/(?:^|\s)@[\p{L}\p{N}._-]+/gu) ?? [];
  if (mentions.length > MAX_MENTION) {
    out.push({
      rule: "mention",
      severity: "error",
      message: `${mentions.length} mention, batasnya ${MAX_MENTION}. Tag hanya orang yang benar-benar terlibat.`,
    });
  }

  return out;
}

/** Ringkasan untuk badge di UI. */
export function summarize(violations: Violation[]): { errors: number; warnings: number } {
  return {
    errors: violations.filter((v) => v.severity === "error").length,
    warnings: violations.filter((v) => v.severity === "warning").length,
  };
}
