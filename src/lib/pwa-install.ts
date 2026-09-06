/**
 * Penangkap `beforeinstallprompt`.
 *
 * Listener-nya dipasang saat modul di-import, bukan saat komponen mount.
 * Chrome menembakkan event ini sekali, sangat awal, dan tanpa `preventDefault()`
 * ia hilang begitu saja — komponen yang baru mount setelah sesi Supabase pulih
 * kerap kehilangannya, dan tawaran pasang jadi tidak pernah muncul sama sekali.
 *
 * Di-import dari src/main.tsx, jadi ia hidup sebelum React merender apa pun.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();

function emit() {
  for (const cb of listeners) cb(deferred);
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });

  // Dipasang lewat menu peramban, bukan lewat tombol kita: buang event-nya
  // supaya tawaran tidak muncul lagi di tab yang sama.
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** Mengembalikan fungsi berhenti berlangganan. */
export function onInstallPrompt(cb: (e: BeforeInstallPromptEvent | null) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Dipanggil setelah dialog dipakai; event hanya sah sekali. */
export function consumeInstallPrompt() {
  deferred = null;
  emit();
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
