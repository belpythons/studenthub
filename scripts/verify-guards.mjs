/**
 * Membuktikan bahwa penegakan yang pindah ke database benar-benar menolak.
 *   node scripts/verify-guards.mjs
 *
 * Seluruhnya berjalan di dalam satu transaksi yang di-ROLLBACK di akhir, jadi
 * tidak ada baris uji yang tertinggal di proyek. Setiap kasus dibungkus SAVEPOINT
 * karena satu statement gagal akan meracuni sisa transaksi.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const uid = "00000000-0000-0000-0000-0000000000aa";
const bucket = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/org-logos`;
let failures = 0;

const upsertLogo = (url) =>
  `INSERT INTO letterhead_settings (user_id, logo_url) VALUES ('${uid}','${url}')
   ON CONFLICT (user_id) DO UPDATE SET logo_url = EXCLUDED.logo_url`;

async function expect(label, sql, shouldReject) {
  await client.query("SAVEPOINT s");
  await client.query(asUser);
  let rejected = false;
  let reason = "";
  try {
    await client.query(sql);
  } catch (err) {
    rejected = true;
    reason = err.message.split("\n")[0];
    await client.query("ROLLBACK TO SAVEPOINT s");
  }
  const pass = rejected === shouldReject;
  if (!pass) failures++;
  console.log(
    `${pass ? "  ok  " : " FAIL "} ${label.padEnd(34)}` +
      (rejected ? `ditolak: ${reason}` : "diterima"),
  );
}

await client.query("BEGIN");

/*
  Meniru permintaan PostgREST, bukan admin.

  Trigger sengaja melewatkan koneksi tanpa klaim JWT supaya admin tetap punya
  jalan memperbaiki data lewat SQL editor. Tanpa menyetel klaim ini, pemeriksaan
  di bawah akan lolos begitu saja dan tidak membuktikan apa pun.
*/
const asUser = `SET LOCAL request.jwt.claims = '{"role":"authenticated","sub":"${uid}"}'`;

await client.query(
  `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
   VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
           'guard-test@example.com', 'x', NOW(), NOW())`,
  [uid],
);
// Trigger handle_new_user sudah membuat baris profil; isi kolom yang diuji.
await client.query(
  `UPDATE profiles SET nama_lengkap = 'Uji Guard', nim = '12345', instansi = 'Universitas Uji'
   WHERE id = $1`,
  [uid],
);

console.log("\nprofiles — identitas terkunci");
await expect("ubah nama_lengkap", `UPDATE profiles SET nama_lengkap='Nama Baru' WHERE id='${uid}'`, false);
await expect("ubah prodi", `UPDATE profiles SET prodi='Sistem Informasi' WHERE id='${uid}'`, false);
await expect("ubah nim", `UPDATE profiles SET nim='999' WHERE id='${uid}'`, true);
await expect("ubah instansi", `UPDATE profiles SET instansi='Kampus Lain' WHERE id='${uid}'`, true);

console.log("\nletterhead_settings — logo_url");
await expect(
  "logo_url domain asing",
  upsertLogo("https://jahat.example/x.png"),
  true,
);
await expect(
  "logo_url prefix pending/",
  upsertLogo(`${bucket}/pending/a.png`),
  false,
);
await expect(
  "logo_url folder milik sendiri",
  upsertLogo(`${bucket}/${uid}/a.png`),
  false,
);
await expect(
  "logo_url folder pengguna lain",
  upsertLogo(`${bucket}/00000000-0000-0000-0000-0000000000bb/a.png`),
  true,
);

console.log("\nrate_limits — bump_rate_limit(max 2)");
const hits = [];
for (let i = 0; i < 3; i++) {
  const { rows } = await client.query(`SELECT public.bump_rate_limit('guard-test', 10, 2) AS over`);
  hits.push(rows[0].over);
}
const rateOk = JSON.stringify(hits) === JSON.stringify([false, false, true]);
if (!rateOk) failures++;
console.log(`${rateOk ? "  ok  " : " FAIL "} tiga panggilan berturut-turut     ${hits.join(", ")}`);

await client.query("ROLLBACK");
await client.end();

console.log(failures ? `\n${failures} pemeriksaan gagal.` : "\nSemua guard database bekerja.");
process.exit(failures ? 1 : 0);
