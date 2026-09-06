import { toast } from "sonner";

/**
 * Single place where the app talks back to the user about a mutation.
 *
 * Every message answers three things the old build left implicit:
 *   what happened, to which record, and what the user can do next.
 */

interface NotifyOptions {
  description?: string;
  /** Adds a labelled button to the toast — used for "Lihat" / "Batalkan". */
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export function notifySuccess(message: string, options: NotifyOptions = {}) {
  return toast.success(message, options);
}

export function notifyError(message: string, options: NotifyOptions = {}) {
  return toast.error(message, { duration: 7000, ...options });
}

export function notifyWarning(message: string, options: NotifyOptions = {}) {
  return toast.warning(message, { duration: 6000, ...options });
}

/**
 * Turns a Supabase/PostgREST error into something a student can act on.
 * Raw messages like `duplicate key value violates unique constraint` are
 * useless in the UI, so the common codes get a plain-language rewrite.
 */
export function describeError(error: unknown): string {
  if (!error) return "Terjadi kesalahan yang tidak diketahui.";

  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;

  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Data serupa sudah ada. Periksa kembali isian Anda.";
  }
  if (code === "23503" || /foreign key/i.test(message)) {
    return "Data ini masih dipakai oleh catatan lain, jadi belum bisa dihapus.";
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return "Anda tidak punya izin untuk mengubah data ini.";
  }
  if (/JWT|token is expired|invalid claim/i.test(message)) {
    return "Sesi Anda berakhir. Silakan masuk kembali.";
  }
  if (/Failed to fetch|NetworkError|network/i.test(message)) {
    return "Gagal terhubung ke server. Periksa koneksi internet Anda.";
  }
  if (/Payload too large|entity too large/i.test(message)) {
    return "Berkas terlalu besar untuk diunggah.";
  }

  return message;
}
