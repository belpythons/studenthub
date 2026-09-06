import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { EmailOtpType } from "@supabase/supabase-js";

import supabase from "@/lib/supabase/client";

/**
 * Pendaratan tautan verifikasi email.
 *
 * Ini yang sebelumnya tidak ada sama sekali. Tanpa route ini, Supabase
 * mengembalikan pengguna ke Site URL → "/" → "/dashboard" → middleware tidak
 * melihat cookie → "/login". Verifikasinya berhasil, tetapi pengguna melihat
 * layar masuk dan menyimpulkan sebaliknya.
 *
 * Dua bentuk diterima karena Supabase mengirim keduanya tergantung template dan
 * pengaturan proyek: `token_hash` + `type` (tautan verifikasi klasik) dan `code`
 * (alur PKCE).
 */
export default function ConfirmPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = React.useRef(false);

  React.useEffect(() => {
    // StrictMode memanggil efek dua kali di dev; token verifikasi sekali pakai,
    // jadi panggilan kedua selalu gagal dan akan menutupi hasil yang pertama.
    if (ran.current) return;
    ran.current = true;

    const tokenHash = params.get("token_hash");
    const type = (params.get("type") ?? "signup") as EmailOtpType;
    const code = params.get("code");
    const next = params.get("next");

    /*
      Bentuk ketiga: token pada fragment URL.

      Proyek yang masih memakai template email bawaan Supabase mengirim tautan
      lewat /auth/v1/verify, dan pada mode implicit endpoint itu mengembalikan
      sesi sebagai "#access_token=...". detectSessionInUrl sengaja dimatikan di
      client supaya route inilah yang memutuskan tujuan akhir — jadi fragment
      itu harus dibaca di sini, kalau tidak verifikasinya benar tapi
      penggunanya tetap mendarat tanpa sesi.
    */
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    (async () => {
      const { error } = tokenHash
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : accessToken && refreshToken
            ? await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
            : { error: new Error("Tautan tidak lengkap.") };

      if (error) {
        navigate("/login?err=verifikasi", { replace: true });
        return;
      }

      if (type === "email_change") {
        /*
          auth.users sudah memegang alamat baru, tetapi profiles.email adalah
          kolom terpisah dengan constraint UNIQUE. Tanpa penyelarasan ini,
          ekspor XLSX dan kop dokumen terus menampilkan alamat lama.
        */
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) {
          await supabase
            .from("profiles")
            .update({ email: data.user.email })
            .eq("id", data.user.id);
        }
        navigate(next ?? "/account?ok=email", { replace: true });
        return;
      }

      navigate(next ?? "/dashboard", { replace: true });
    })();
  }, [params, navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <div
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground"
      />
      <p className="text-[13px] text-muted-foreground">Memverifikasi tautan email Anda…</p>
    </main>
  );
}
