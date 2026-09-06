export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * True only when .env.local holds real project values.
 * The checked-in defaults are placeholders, so every Supabase call is skipped
 * until they are replaced — the UI then renders a setup notice instead of
 * crashing on a failed network request.
 */
export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("your-project-ref") &&
  SUPABASE_ANON_KEY.length > 0 &&
  SUPABASE_ANON_KEY !== "your-anon-key";
