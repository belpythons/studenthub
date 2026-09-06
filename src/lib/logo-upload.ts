import supabase from "@/lib/supabase/client";

/*
  Unggahan logo saat pendaftaran, lewat Edge Function `logo-upload`.

  Tidak memakai supabase.storage langsung: pada titik ini akun penggunanya belum
  ada, sehingga tidak ada sesi yang bisa dipakai kebijakan RLS "qol owner upload"
  (yang mensyaratkan folder pertama sama dengan auth.uid()). Edge Function
  memegang service role dan menegakkan sendiri ukuran, magic byte, dan rate limit.
*/

export async function uploadOnboardingLogo(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);

  const { data, error } = await supabase.functions.invoke<{ logo_url: string }>("logo-upload", {
    body,
  });

  if (error) {
    // FunctionsHttpError menyembunyikan body respons; pesan asli ada di dalamnya.
    const detail = await (error as { context?: Response }).context
      ?.json()
      .then((j: { error?: string }) => j.error)
      .catch(() => undefined);
    throw new Error(detail ?? "Gagal mengunggah logo. Periksa koneksi internet Anda.");
  }
  if (!data?.logo_url) throw new Error("Server tidak mengembalikan URL logo.");

  return data.logo_url;
}
