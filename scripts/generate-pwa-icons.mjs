/**
 * Generates every PWA icon size from public/icon.png.
 *   node scripts/generate-pwa-icons.mjs
 *
 * Sumbernya sengaja lambang saja, bukan public/logo.png yang berisi lockup
 * lengkap: wordmark dua baris tidak terbaca pada 16px dan tetap terbuang oleh
 * mask lingkaran Android. Dengan lambang sebagai sumber, tidak ada crop piksel
 * hard-coded yang perlu ditala ulang tiap kali logonya diganti.
 *
 * Maskable icons need ~20% safe padding on each side, otherwise Android
 * crops into the mark when it applies its own shape mask.
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

// sharp adalah devDependency: dipakai HANYA di sini, tidak pernah masuk
// bundel peramban. Aplikasi sendiri menganalisis logo lewat kanvas
// (src/lib/logo-canvas.ts).

const SRC = "public/icon.png";
const OUT = "public/icons";
mkdirSync(OUT, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function square(size, { padRatio, background, name }) {
  const inner = Math.round(size * (1 - padRatio * 2));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - inner) / 2);

  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toFile(`${OUT}/${name}`);

  console.log(name, `${size}x${size}`);
}

// Standard icons — white ground so the logo reads on any launcher.
await square(192, { padRatio: 0.08, background: WHITE, name: "icon-192.png" });
await square(512, { padRatio: 0.08, background: WHITE, name: "icon-512.png" });

// Maskable — putih, bukan navy: lambangnya biru tua dan nyaris hilang di atas
// navy. Padding lega untuk safe zone mask lingkaran.
await square(192, { padRatio: 0.2, background: WHITE, name: "maskable-192.png" });
await square(512, { padRatio: 0.2, background: WHITE, name: "maskable-512.png" });

// iOS home screen (no transparency allowed).
await square(180, { padRatio: 0.1, background: WHITE, name: "apple-touch-icon.png" });

// Favicons.
await square(32, { padRatio: 0.04, background: WHITE, name: "favicon-32.png" });
await square(16, { padRatio: 0.02, background: WHITE, name: "favicon-16.png" });
