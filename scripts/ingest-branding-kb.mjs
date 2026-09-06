/**
 * Ingests docs/branding-kb/*.md into branding_chunks (docs/perbaikan/02 §3.1).
 * Chunk = satu heading `## [bahasa|seksi] Judul`. Idempoten: baris per-file
 * dihapus lalu ditulis ulang. Butuh SUPABASE_DB_URL + GEMINI_API_KEY.
 * Usage: node scripts/ingest-branding-kb.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { GoogleGenAI } from "@google/genai";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = readFileSync(join(root, ".env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const dbUrl = env.SUPABASE_DB_URL ?? process.env.SUPABASE_DB_URL;
const apiKey = env.GEMINI_API_KEY ?? process.env.GEMINI_API_KEY;
if (!dbUrl) throw new Error("SUPABASE_DB_URL tidak ditemukan di .env.local");
if (!apiKey) throw new Error("GEMINI_API_KEY tidak ditemukan di .env.local");

const kbDir = join(root, "docs", "branding-kb");
const HEADING = /^## \[(id|en)\|([a-z]+)\] (.+)$/;

/** @type {{sumber:string,bahasa:string,seksi:string,konten:string}[]} */
const chunks = [];
for (const file of readdirSync(kbDir).filter((f) => f.endsWith(".md"))) {
  const lines = readFileSync(join(kbDir, file), "utf8").split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const m = line.match(HEADING);
    if (m) {
      if (current) chunks.push(current);
      current = {
        sumber: `${file} § ${m[3]}`,
        bahasa: m[1],
        seksi: m[2],
        konten: "",
      };
    } else if (current) {
      current.konten += line + "\n";
    }
  }
  if (current) chunks.push(current);
}
for (const c of chunks) c.konten = c.konten.trim();
console.log(`parsed ${chunks.length} chunks from docs/branding-kb`);

const ai = new GoogleGenAI({ apiKey });
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

// Idempoten: file yang di-ingest ulang menggantikan seluruh barisnya.
await client.query(`DELETE FROM branding_chunks WHERE sumber LIKE ANY($1)`, [
  readdirSync(kbDir).filter((f) => f.endsWith(".md")).map((f) => `${f} §%`),
]);

const BATCH = 20;
let written = 0;
for (let i = 0; i < chunks.length; i += BATCH) {
  const batch = chunks.slice(i, i + BATCH);
  const res = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: batch.map((c) => c.konten),
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: 768 },
  });
  const embeddings = res.embeddings ?? [];
  if (embeddings.length !== batch.length) {
    throw new Error(`embedding count mismatch: ${embeddings.length} != ${batch.length}`);
  }
  for (let j = 0; j < batch.length; j++) {
    const c = batch[j];
    await client.query(
      `INSERT INTO branding_chunks (sumber, bahasa, seksi, konten, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [c.sumber, c.bahasa, c.seksi, c.konten, `[${embeddings[j].values.join(",")}]`],
    );
    written++;
  }
  console.log(`embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
}

const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM branding_chunks`);
console.log(`done: ${written} chunks written, ${rows[0].n} total in branding_chunks`);
await client.end();
