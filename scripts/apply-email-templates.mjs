/**
 * Memasang template email Supabase lewat Management API.
 *   node scripts/apply-email-templates.mjs
 *
 * Membaca SUPABASE_ACCESS_TOKEN (personal access token) dan VITE_SUPABASE_URL
 * dari .env.local. Project ref diturunkan dari URL itu, jadi tidak ada env var
 * tambahan yang perlu dijaga tetap sinkron.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const token = env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = env.VITE_SUPABASE_URL;
const siteUrl = (env.VITE_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN missing from .env.local");
  console.error("Buat di Supabase -> Account -> Access Tokens.");
  process.exit(1);
}

const ref = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(supabaseUrl ?? "")?.[1];
if (!ref) {
  console.error(`Tidak bisa membaca project ref dari VITE_SUPABASE_URL: ${supabaseUrl}`);
  process.exit(1);
}

const read = (name) => readFileSync(join(root, "supabase/emails", name), "utf8");
const base = read("base.html");

/**
 * Tautan verifikasi memakai .TokenHash, bukan .ConfirmationURL.
 *
 * .ConfirmationURL melewati /auth/v1/verify dan mengembalikan sesi lewat alur
 * PKCE, yang menyimpan code verifier di localStorage peramban tempat pendaftaran
 * dilakukan. Pengguna yang membuka emailnya di ponsel setelah mendaftar di
 * laptop tidak punya verifier itu, dan tautannya gagal tanpa penjelasan.
 * verifyOtp({ token_hash }) tidak butuh verifier, jadi berhasil di perangkat mana
 * pun — dan itulah yang ditangani src/pages/auth/ConfirmPage.tsx.
 */
const link = (type) =>
  `${siteUrl}/auth/confirm?token_hash={{ .TokenHash }}&type=${type}`;

function render({ title, body, action, button, footnote }) {
  return base
    .replace("{{TITLE}}", title)
    .replace("{{CONTENT}}", read(body).trim())
    .replaceAll("{{ACTION_URL}}", action)
    .replaceAll("{{LOGO_URL}}", `${siteUrl}/icon.png`)
    .replace("{{BUTTON}}", button)
    .replace("{{FOOTNOTE}}", footnote);
}

// Subjek di bawah baru berlaku bila proyek punya SMTP sendiri; tanpa itu
// Supabase menolak seluruh PATCH template dan subjek bawaannya yang terpakai.
// Karena itu MAIL_SUBJECT_CONFIRM di src/lib/constants.ts memuat subjek BAWAAN,
// bukan yang di sini — samakan keduanya hanya setelah skrip ini sukses penuh.
const templates = {
  mailer_subjects_confirmation: "Konfirmasi email kamu — Student Hub",
  mailer_templates_confirmation_content: render({
    title: "Konfirmasi email — Student Hub",
    body: "confirm-signup.html",
    action: link("signup"),
    button: "Masuk ke Student Hub",
    footnote:
      "Tautan ini berlaku 24 jam. Abaikan email ini bila kamu tidak merasa mendaftar — tanpa klik, akunnya tidak akan aktif.",
  }),

  mailer_subjects_email_change: "Konfirmasi alamat email baru — Student Hub",
  mailer_templates_email_change_content: render({
    title: "Ganti email — Student Hub",
    body: "email-change.html",
    action: link("email_change"),
    button: "Konfirmasi Email Baru",
    footnote:
      "Bukan kamu yang meminta? Abaikan email ini; alamat lamamu tetap berlaku dan tidak ada yang berubah.",
  }),

  mailer_subjects_recovery: "Atur ulang password — Student Hub",
  mailer_templates_recovery_content: render({
    title: "Atur ulang password — Student Hub",
    body: "recovery.html",
    action: link("recovery"),
    button: "Atur Ulang Password",
    footnote:
      "Bukan kamu yang meminta? Abaikan email ini; password lamamu tetap berlaku.",
  }),
};

/*
  Dua PATCH terpisah, bukan satu.

  site_url dan uri_allow_list berlaku di semua paket, sedangkan template email
  ditolak Supabase pada paket gratis yang masih memakai pengirim email bawaan.
  Menggabungkannya membuat perbaikan redirect ikut gagal hanya karena template
  tidak boleh diubah — padahal justru redirect itulah yang memperbaiki tautan
  verifikasi yang mendarat di halaman login.
*/
const API = `https://api.supabase.com/v1/projects/${ref}/config/auth`;

async function patch(body) {
  const res = await fetch(API, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, text: res.ok ? "" : await res.text() };
}

console.log(`Project      : ${ref}`);
console.log(`Site URL     : ${siteUrl}`);

const urls = await patch({
  site_url: siteUrl,
  // Daftar izin yang tidak diurus adalah penyebab paling sering "link
  // kedaluwarsa" palsu: Supabase menolak redirect ke origin tak terdaftar dan
  // pesannya tidak menyebut sebabnya.
  uri_allow_list: [`${siteUrl}/auth/confirm`, `${siteUrl}/**`].join(","),
});

if (!urls.ok) {
  console.error("");
  console.error(`Gagal menyetel Site URL (${urls.status}): ${urls.text}`);
  process.exit(1);
}
console.log("  OK  site_url + uri_allow_list");

const tpl = await patch(templates);

if (tpl.ok) {
  for (const key of Object.keys(templates).filter((k) => k.includes("_content"))) {
    console.log(`  OK  ${key}`);
  }
  console.log("");
  console.log("Selesai. Cabut SUPABASE_ACCESS_TOKEN bila sudah tidak dipakai.");
  process.exit(0);
}

if (/free tier|custom SMTP/i.test(tpl.text)) {
  console.error("");
  console.error("  DILEWATI  template email — Supabase menolaknya.");
  console.error("  " + JSON.parse(tpl.text).message);
  for (const line of [
    "",
    "  Paket gratis hanya mengizinkan template kustom bila proyek memakai SMTP",
    "  sendiri. Pengirim bawaan Supabase juga dibatasi ~2 email/jam, jadi SMTP",
    "  sendiri memang tetap dibutuhkan sebelum rilis.",
    "",
    "  Langkahnya:",
    "    1. Daftar penyedia SMTP gratis (Resend, Brevo, atau Mailgun).",
    "    2. Supabase -> Authentication -> Emails -> SMTP Settings, isi host,",
    "       port, user, password, dan alamat pengirim.",
    "    3. Jalankan ulang: npm run email:apply",
    "",
    "  Site URL dan daftar izin redirect SUDAH tersimpan, jadi tautan",
    "  verifikasi bawaan sekarang mendarat di /auth/confirm dengan benar.",
  ]) {
    console.error(line);
  }
  process.exit(2);
}

console.error("");
console.error(`Gagal memasang template (${tpl.status}): ${tpl.text}`);
process.exit(1);
