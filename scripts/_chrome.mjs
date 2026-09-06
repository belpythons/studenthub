/**
 * Cross-OS Chrome/Chromium discovery for the QA harnesses (audit P2-6).
 * Override with CHROME_PATH; test creds override with QA_EMAIL / QA_PASSWORD.
 */
import { existsSync } from "node:fs";

const CANDIDATES = [
  // Windows
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  // Linux (CI)
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

export function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv) {
    if (!existsSync(fromEnv)) {
      throw new Error(`CHROME_PATH tidak ditemukan: ${fromEnv}`);
    }
    return fromEnv;
  }
  const found = CANDIDATES.find((p) => p && existsSync(p));
  if (!found) {
    throw new Error(
      "Chrome tidak ditemukan. Set env CHROME_PATH ke lokasi chrome/chromium.",
    );
  }
  return found;
}

/**
 * Kredensial QA wajib dari env — akun uji bawaan sudah dihapus.
 *
 * Sengaja fungsi, bukan konstanta modul: konstanta akan melempar saat impor,
 * sehingga skrip yang cuma butuh findChrome ikut mati.
 */
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} belum diset. Akun uji khusus sudah dihapus — jalankan harness ` +
      "dengan QA_EMAIL dan QA_PASSWORD akun demo Anda sendiri.",
    );
  }
  return v;
}

export const qaEmail = () => requireEnv("QA_EMAIL");
export const qaPassword = () => requireEnv("QA_PASSWORD");
