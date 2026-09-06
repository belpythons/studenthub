import { describe, expect, it } from "vitest";
import type { RouterInput } from "./linkedin-router";
import { CHAR_LIMITS, summarize, validateDraft } from "./linkedin-validate";

function act(o: Partial<RouterInput> = {}): RouterInput {
  return {
    judul: "Juara 2 Hackathon Nasional 2026",
    kategori: "Prestasi / Kejuaraan",
    penyelenggara: "Kominfo",
    tanggal_mulai: "2026-05-01",
    tanggal_selesai: "2026-05-03",
    poin_skm: 20,
    deskripsi: "Bersaing dengan 84 tim, menurunkan waktu proses 35 persen.",
    skill_tags: ["Python", "FastAPI"],
    credential_id: null,
    tingkat: "Nasional — Juara 1/2/3",
    jam_sosial: null,
    certificate_url: null,
    ...o,
  };
}

const rules = (v: ReturnType<typeof validateDraft>) => v.map((x) => x.rule);

describe("batas karakter", () => {
  it("menolak naskah yang melewati batas maksimum", () => {
    const v = validateDraft("x".repeat(CHAR_LIMITS.headline.max + 1), { seksi: "headline" });
    const hit = v.find((x) => x.rule === "batas-karakter");
    expect(hit?.severity).toBe("error");
    expect(hit?.message).toContain("221/220");
  });

  it("memperingatkan saat melewati batas aman tampil, bukan menolak", () => {
    const v = validateDraft("x".repeat(120), { seksi: "headline" });
    const hit = v.find((x) => x.rule === "batas-tampil");
    expect(hit?.severity).toBe("warning");
    expect(rules(v)).not.toContain("batas-karakter");
  });

  it("menolak draft kosong", () => {
    expect(validateDraft("   ", { seksi: "post" })[0].rule).toBe("kosong");
  });
});

describe("hook", () => {
  it("menolak hook lebih dari 140 karakter pada post", () => {
    const text = `${"a".repeat(150)}. Sisanya.`;
    expect(rules(validateDraft(text, { seksi: "post" }))).toContain("hook");
  });

  it("menerima hook yang selesai sebelum 140 karakter", () => {
    const text = "Percobaan pertama saya gagal 90 poin dari batas lulus.\n\nSisanya cerita.";
    expect(rules(validateDraft(text, { seksi: "post" }))).not.toContain("hook");
  });

  it("tidak memeriksa hook di luar seksi post", () => {
    const text = `${"a".repeat(200)}. Sisanya.`;
    expect(rules(validateDraft(text, { seksi: "experience" }))).not.toContain("hook");
  });
});

describe("integritas angka", () => {
  it("menandai angka yang tidak ada pada data sumber", () => {
    const v = validateDraft("Memimpin tim beranggotakan 1284 orang.", {
      seksi: "experience",
      activity: act(),
    });
    expect(v.find((x) => x.rule === "integritas-angka")?.message).toContain("1284");
  });

  it("menerima angka yang memang ada di deskripsi sumber", () => {
    const v = validateDraft("Bersaing dengan 84 tim dan menekan waktu proses 35 persen.", {
      seksi: "experience",
      activity: act(),
    });
    expect(rules(v)).not.toContain("integritas-angka");
  });

  it("menerima komponen tanggal sumber (bulan dan tahun)", () => {
    const v = validateDraft("Mei 2026: menang bersama 84 tim lain.", {
      seksi: "experience",
      activity: act(),
    });
    expect(rules(v)).not.toContain("integritas-angka");
  });

  it("melewati pemeriksaan angka bila tidak ada data sumber", () => {
    const v = validateDraft("Menangani 9999 tiket.", { seksi: "experience" });
    expect(rules(v)).not.toContain("integritas-angka");
  });
});

describe("frasa terlarang", () => {
  const cases: [string, string][] = [
    ["I am excited to announce that I passed the exam. 84 tim, Kominfo.", "pembuka klise Inggris"],
    ["Alhamdulillah akhirnya lulus juga setelah 84 percobaan di Kominfo.", "pembuka klise Indonesia"],
    ["Komen YES kalau setuju. 84 tim ikut, Kominfo jadi tuan rumah.", "engagement bait"],
    ["Saya seorang passionate developer di Kominfo sejak 84 hari lalu.", "kata kosong"],
    ["Aplikasi terbaik di dunia buatan 84 orang tim Kominfo.", "klaim superlatif"],
    ["Selesai juga 🎉🎉🎉 bersama 84 tim di Kominfo.", "emoji beruntun"],
  ];
  for (const [text, label] of cases) {
    it(`menolak ${label}`, () => {
      const v = validateDraft(text, { seksi: "post", activity: act() });
      expect(v.find((x) => x.rule === "frasa-terlarang")?.severity).toBe("error");
    });
  }

  it("tidak salah menuduh naskah yang bersih", () => {
    const bersih =
      "Percobaan pertama gagal. Bersama 84 tim di Kominfo, kami menekan waktu proses 35 persen.";
    expect(rules(validateDraft(bersih, { seksi: "post", activity: act() }))).not.toContain(
      "frasa-terlarang",
    );
  });
});

describe("kekhasan dan keyword", () => {
  it("memperingatkan naskah generik tanpa entitas spesifik", () => {
    const v = validateDraft("Pengalaman ini sangat berharga dan membuat saya berkembang.", {
      seksi: "post",
      activity: act({ skill_tags: null }),
    });
    expect(rules(v)).toContain("kekhasan");
  });

  it("naskah dengan angka dan nama organisasi lolos pemeriksaan kekhasan", () => {
    const v = validateDraft("Bersama Kominfo, bersaing dengan 84 tim. Python jadi tulang punggung.", {
      seksi: "post",
      activity: act(),
    });
    expect(rules(v)).not.toContain("kekhasan");
  });

  it("memperingatkan bila tidak ada satu pun skill tag yang muncul", () => {
    const v = validateDraft("Bersama Kominfo, bersaing dengan 84 tim.", {
      seksi: "post",
      activity: act(),
    });
    expect(v.find((x) => x.rule === "keyword")?.message).toContain("Python");
  });
});

describe("batas hashtag dan mention", () => {
  it("menolak lebih dari 3 hashtag", () => {
    const v = validateDraft("Selesai. 84 tim Kominfo Python. #a #b #c #d", {
      seksi: "post",
      activity: act(),
    });
    expect(v.find((x) => x.rule === "hashtag")?.severity).toBe("error");
  });

  it("menerima tepat 3 hashtag", () => {
    const v = validateDraft("Selesai. 84 tim Kominfo Python. #a #b #c", {
      seksi: "post",
      activity: act(),
    });
    expect(rules(v)).not.toContain("hashtag");
  });

  it("menolak lebih dari 5 mention", () => {
    const v = validateDraft("Terima kasih @a @b @c @d @e @f. 84 tim Kominfo Python.", {
      seksi: "post",
      activity: act(),
    });
    expect(v.find((x) => x.rule === "mention")?.severity).toBe("error");
  });
});

describe("summarize", () => {
  it("memisahkan jumlah error dan warning", () => {
    const v = validateDraft("I am excited to announce this.", { seksi: "post" });
    const s = summarize(v);
    expect(s.errors).toBeGreaterThan(0);
    expect(s.errors + s.warnings).toBe(v.length);
  });
});
