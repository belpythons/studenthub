import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
  email: "test-ai@example.com",
  password: "test-password-123",
  email_confirm: true,
});
if (userErr) throw userErr;
const userId = userRes.user.id;
console.log("user_id:", userId);

await admin.from("profiles").upsert({ id: userId, nama_lengkap: "Budi Tester", prodi: "Teknik Informatika", instansi: "Universitas Test" });

const { data: activity, error: actErr } = await admin
  .from("skm_activities")
  .insert({
    user_id: userId,
    judul: "Magang Data Engineer",
    kategori: "internship",
    penyelenggara: "PT Badak NGL",
    tanggal_mulai: "2026-06-01",
    tanggal_selesai: "2026-08-31",
    poin_skm: 40,
    deskripsi: "Membangun pipeline ETL untuk data produksi LNG menggunakan Python dan SQL, mengurangi waktu proses laporan harian dari 2 jam menjadi 15 menit.",
    skill_tags: ["Python", "SQL", "ETL"],
  })
  .select("id")
  .single();
if (actErr) throw actErr;
console.log("activity_id:", activity.id);
