import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

/*
  Manifest disalin apa adanya dari public/manifest.webmanifest yang lama; plugin
  yang menuliskannya sekarang, supaya berkas itu bisa dihapus dan tidak ada dua
  sumber kebenaran.
*/
const icon = (size: 192 | 512, maskable = false) => ({
  src: `/icons/${maskable ? "maskable" : "icon"}-${size}.png`,
  sizes: `${size}x${size}`,
  type: "image/png",
  purpose: maskable ? ("maskable" as const) : ("any" as const),
});

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      // Tanpa ini, dev server tidak melayani /manifest.webmanifest sama sekali:
      // permintaannya jatuh ke fallback SPA dan peramban mencoba mengurai HTML
      // sebagai JSON ("Manifest: Line 1, column 1, Syntax error").
      devOptions: { enabled: true, type: "module" },
      // Workbox menghitung ulang daftar precache tiap build. sw.js tulisan tangan
      // yang lama memuat nama berkas tetap, sementara Vite memberi hash pada aset,
      // jadi daftar itu pasti basi sejak build pertama.
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        navigateFallback: "/index.html",
        // Halaman cetak dirender ke iframe dan harus selalu segar.
        navigateFallbackDenylist: [/^\/print\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: { cacheName: "fonts", expiration: { maxEntries: 20 } },
          },
        ],
      },
      manifest: {
        id: "/dashboard",
        name: "Student Hub & Internship Logbook",
        short_name: "Student Hub",
        description:
          "Sistem terpadu SKM, Task Report Magang PT Badak NGL, dan Log Book Konsultasi USTB Bontang.",
        lang: "id-ID",
        dir: "ltr",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "portrait-primary",
        // Sama persis dengan --background terang di globals.css; kalau meleset,
        // layar splash PWA berkedip warna lain sebelum aplikasi tampil.
        background_color: "#eef1f6",
        theme_color: "#eef1f6",
        categories: ["education", "productivity"],
        icons: [icon(192), icon(512), icon(192, true), icon(512, true)],
        shortcuts: [
          { name: "Buat Laporan Kegiatan", short_name: "Buat Laporan", url: "/reports/new" },
          { name: "Tambah Entri Log Book", short_name: "Log Book", url: "/logbook/new" },
          { name: "Tambah Kegiatan SKM", short_name: "Tambah SKM", url: "/skm/new" },
        ],
      },
    }),
  ],
  server: { port: 3000 },
  preview: { port: 3000 },
  build: { outDir: "dist", sourcemap: false },
});
