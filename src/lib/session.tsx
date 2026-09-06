import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session, User } from "@supabase/supabase-js";

import supabase from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Profile } from "@/lib/types";
import { useReducedMotion } from "@/components/motion/motion-primitives";

interface SessionState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True sampai getSession() pertama selesai — bukan sekadar "sedang memuat". */
  loading: boolean;
  /** Muat ulang baris profil setelah disimpan dari halaman akun. */
  reloadProfile: () => Promise<void>;
}

const SessionContext = React.createContext<SessionState | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data ?? null) as Profile | null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Tanpa kredensial Supabase tidak ada sesi untuk dipulihkan; berhenti memuat
    // supaya UI menampilkan catatan setup, bukan spinner abadi.
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let alive = true;

    /*
      getSession() membaca localStorage tanpa jalan-jalan ke jaringan, jadi
      pemuatan ulang halaman selesai dalam satu tick — inilah yang mencegah
      kedip halaman login yang dulu dijaga middleware.
    */
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (data.session?.user) setProfile(await loadProfile(data.session.user.id));
      if (alive) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      if (!alive) return;
      setSession(next);
      if (!next?.user) {
        setProfile(null);
        return;
      }
      // TOKEN_REFRESHED terjadi tiap jam dan tidak mengubah profil apa pun —
      // mengambil ulang di situ hanya menghasilkan request sia-sia.
      if (event !== "TOKEN_REFRESHED") setProfile(await loadProfile(next.user.id));
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const reloadProfile = React.useCallback(async () => {
    const id = session?.user?.id;
    if (id) setProfile(await loadProfile(id));
  }, [session?.user?.id]);

  const value = React.useMemo<SessionState>(
    () => ({ session, user: session?.user ?? null, profile, loading, reloadProfile }),
    [session, profile, loading, reloadProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam <SessionProvider>.");
  return ctx;
}

/**
 * Pengganti middleware.ts.
 *
 * Menahan render sampai `loading` selesai. Tanpa penahanan itu, tiap muat ulang
 * akan sempat merender <Navigate to="/login"> sebelum sesi dari localStorage
 * terbaca — kedip yang persis dikeluhkan pada SPA yang salah menaruh guard ini.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return <>{children}</>;
}

/** Kebalikannya: /login dan /register menolak pengguna yang sudah masuk. */
export function AuthOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function FullPageSpinner() {
  const reduce = useReducedMotion();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <span className="sr-only">Memuat…</span>
      {reduce ? (
        <div
          aria-hidden
          className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground"
        />
      ) : (
        /*
          Kotaknya memangkas 7% kiri-kanan dan 8% bawah dari bingkai video —
          sudut kanan bawah berisi watermark generator ("Veo") yang tidak boleh
          ikut tampil. Rasio 729/442 = 848×480 dikurangi potongan itu, jadi
          videonya tetap terisi penuh tanpa bilah kosong.
        */
        <div className="relative aspect-[729/442] w-[280px] max-w-[70vw] overflow-hidden rounded-xl border border-foreground bg-white">
          <video
            aria-hidden
            autoPlay
            muted
            loop
            playsInline
            poster="/icon.png"
            src="/loading.mp4"
            className="absolute left-[-8.14%] top-0 w-[116.28%] max-w-none"
          />
        </div>
      )}
    </div>
  );
}

/** Display name fallback chain. */
export function displayName(profile: Profile | null, email?: string | null) {
  return profile?.nama_lengkap || email?.split("@")[0] || "Pengguna";
}

/**
 * Keluar dari sesi. Dipakai bilah samping dan menu profil di header — satu
 * fungsi, supaya kedua jalur keluar tidak bisa menyimpang (mis. yang satu
 * membersihkan cache dan yang lain tidak).
 */
export function signOut() {
  void supabase.auth.signOut();
}
