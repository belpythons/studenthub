import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const envPath = join(root, ".env.local");
let token = process.env.SUPABASE_ACCESS_TOKEN;
let projectRef = "tvcnibvhskvdssrsmzyw";

try {
  const envContent = readFileSync(envPath, "utf8");
  const env = Object.fromEntries(
    envContent
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  if (env.SUPABASE_ACCESS_TOKEN) token = env.SUPABASE_ACCESS_TOKEN;
  if (env.VITE_SUPABASE_URL) {
    const match = env.VITE_SUPABASE_URL.match(/^https?:\/\/([^.]+)\.supabase\.co/);
    if (match) projectRef = match[1];
  }
} catch {
  // fall back to process.env
}

if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN tidak ditemukan di .env.local atau environment.");
  process.exit(1);
}

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

console.log(`Deploying Edge Functions to project ${projectRef}...`);

const deployLogo = spawnSync(
  npxCmd,
  ["supabase", "functions", "deploy", "logo-upload", "--project-ref", projectRef, "--no-verify-jwt"],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  },
);

if (deployLogo.status !== 0) {
  console.error("Gagal men-deploy logo-upload.");
  process.exit(deployLogo.status ?? 1);
}

const deployAi = spawnSync(
  npxCmd,
  ["supabase", "functions", "deploy", "linkedin-ai", "--project-ref", projectRef],
  {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  },
);

if (deployAi.status !== 0) {
  console.error("Gagal men-deploy linkedin-ai.");
  process.exit(deployAi.status ?? 1);
}

console.log("Semua Edge Function berhasil di-deploy!");
