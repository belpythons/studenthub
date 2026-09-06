/**
 * Ikon 3D dekoratif (3dicons, CC0 — lihat public/icons3d/LICENSE.md).
 *
 * Sengaja hanya dipakai pada permukaan besar: kondisi kosong, kartu statistik,
 * FAQ, dan halaman berpesan tunggal. Lucide tetap memegang seluruh ikon inline
 * 16-20px — PNG 3D pada ukuran itu jadi bubur, tidak ikut mewarisi `currentColor`,
 * dan tidak kena aturan `[&_svg]:size-4` milik Button.
 *
 * Selalu `alt=""` + `aria-hidden`: ikon ini tidak pernah menjadi satu-satunya
 * pembawa makna, teks di sebelahnya yang bertugas.
 */
/** Nama berkas di public/icons3d/, tanpa ekstensi. */
export type Icon3dName =
  | "bulb"
  | "calender"
  | "chat-bubble"
  | "file-text"
  | "folder"
  | "key"
  | "medal"
  | "mobile"
  | "notebook"
  | "shield"
  | "target"
  | "trophy"
  | "wifi"
  | "zoom";

export function Icon3d({
  name,
  size = 64,
  className,
}: {
  name: Icon3dName;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={`/icons3d/${name}.png`}
      alt=""
      aria-hidden
      // Berkasnya 128px: pada ukuran tampil ≤64px ia tetap tajam di layar 2x.
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
