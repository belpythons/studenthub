import { dominantColors, edgeTransparency, type Swatch } from "@/lib/logo-analyze";
import { MAX_LOGO_SIZE } from "@/lib/constants";

/*
  Analisis logo di peramban — dulu bagian sharp dari POST /api/onboarding/logo.

  Kanvas memberi RGBA mentah, format yang memang sudah diterima logo-analyze.ts;
  modul itu tidak berubah sebaris pun. sharp terhapus dari project bersama route
  yang memanggilnya.

  Semua pemeriksaan di sini adalah gerbang mutu, bukan keamanan: pengguna yang
  memintasnya hanya merugikan kop dokumennya sendiri. Yang benar-benar ditegakkan
  server (ukuran, magic byte PNG, rate limit) ada di Edge Function logo-upload.
*/

/** Ukuran analisis. Kecil dan tetap supaya biayanya tidak ikut ukuran logo. */
const SAMPLE = 64;
/** Di bawah ini logo dianggap punya latar, bukan transparan. */
const MIN_EDGE_CLEAR = 0.95;

export class LogoRejected extends Error {}

/**
 * Membaca berkas gambar apa pun jadi RGBA mentah pada kanvas SAMPLE×SAMPLE.
 *
 * Diekspor karena form kop surat memerlukan langkah ini tanpa gerbang
 * PNG-transparan di bawah: logo dokumen boleh JPG dan boleh berlatar, yang
 * dilarang hanya pada logo persona saat pendaftaran.
 */
export async function sampleRgba(
  file: File,
): Promise<{ rgba: Uint8ClampedArray; w: number; h: number }> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE;
    canvas.height = SAMPLE;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new LogoRejected("Peramban ini tidak bisa membaca gambar.");

    /*
      imageSmoothingEnabled = false adalah padanan `kernel: "nearest"` di rute
      lama. Penghalusan mencampur piksel transparan dengan tetangganya yang
      pekat, sehingga tepi logo berlatar ikut tampak setengah transparan — dan
      pemeriksaan yang justru dibuat untuk menangkapnya jadi lolos.
    */
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SAMPLE, SAMPLE);
    ctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);

    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
    return { rgba: data, w: SAMPLE, h: SAMPLE };
  } finally {
    bitmap.close();
  }
}

/**
 * Memeriksa logo dan mengembalikan warna dominannya.
 *
 * Melempar LogoRejected dengan pesan siap-tampil bila logonya tidak layak.
 */
export async function analyzeLogo(file: File): Promise<Swatch[]> {
  if (file.size > MAX_LOGO_SIZE) {
    throw new LogoRejected("Logo lebih dari 2 MB. Perkecil dulu berkasnya.");
  }
  if (file.type !== "image/png") {
    throw new LogoRejected("Hanya berkas PNG yang diterima.");
  }

  let sample;
  try {
    sample = await sampleRgba(file);
  } catch (err) {
    if (err instanceof LogoRejected) throw err;
    throw new LogoRejected("Berkas PNG ini tidak bisa dibaca.");
  }

  const clear = edgeTransparency(sample.rgba, sample.w, sample.h);
  if (clear < MIN_EDGE_CLEAR) {
    throw new LogoRejected(
      `Logo ini masih punya background (${Math.round((1 - clear) * 100)}% tepinya tidak transparan). ` +
        "Pakai PNG dengan latar transparan.",
    );
  }

  const swatches = dominantColors(sample.rgba, sample.w, sample.h);
  if (swatches.length === 0) {
    throw new LogoRejected("Tidak ada warna yang bisa dibaca dari logo ini.");
  }

  return swatches;
}
