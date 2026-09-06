/**
 * Origin publik aplikasi, untuk emailRedirectTo.
 *
 * window.location.origin sudah benar di localhost maupun produksi; VITE_SITE_URL
 * hanya diperlukan bila aplikasi dilayani dari domain berbeda dengan yang
 * terdaftar di Supabase (mis. pratinjau Vercel yang harus tetap mengirim tautan
 * ke domain produksi).
 */
export function siteUrl(): string {
  return (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");
}

/** URL tujuan tautan verifikasi Supabase. */
export function confirmUrl(next?: string): string {
  const base = `${siteUrl()}/auth/confirm`;
  return next ? `${base}?next=${encodeURIComponent(next)}` : base;
}
