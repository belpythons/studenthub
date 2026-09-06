import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/*
  Satu instance untuk seluruh aplikasi.

  Dulu tiap pemanggil membuat client baru lewat createBrowserClient() karena
  state-nya tersimpan di cookie. Tanpa SSR, sesi hidup di dalam objek client —
  membuat dua instance berarti dua langganan onAuthStateChange dan dua pembaruan
  token yang saling berebut. Modul singleton menutup celah itu sekaligus.
*/
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Tautan verifikasi email mendarat di /auth/confirm dengan token pada query
    // string, bukan fragment — route itu yang menukarnya, bukan client ini.
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

/** Client Supabase tunggal milik aplikasi. */
export function createClient() {
  return supabase;
}

export type { SupabaseClient };
export default supabase;
