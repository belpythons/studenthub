import * as React from "react";
import { Download, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon3d } from "@/components/shared/icon-3d";
import {
  consumeInstallPrompt,
  getInstallPrompt,
  isIos,
  isStandalone,
  onInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa-install";

const DISMISS_KEY = "qol.install-prompt.dismissed";

/**
 * Jeda sebelum dialog muncul.
 *
 * Modal yang menghadang di cat pertama adalah pola gelap: pengguna belum sempat
 * melihat apa yang ditawarkan. Enam detik cukup untuk membaca satu layar, dan
 * penolakannya diingat selamanya, jadi ia tidak pernah jadi gangguan berulang.
 */
const DELAY_MS = 6000;

function alreadyDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Mode privat bisa melempar saat diakses; anggap belum pernah ditolak.
    return false;
  }
}

/**
 * Menawarkan pemasangan sekali, dan hanya bila pemasangan memang bisa terjadi.
 *
 * Chrome/Edge menembakkan `beforeinstallprompt`, jadi dialog pemasangan asli
 * yang dipakai. Safari iOS tidak punya API itu sama sekali, jadi di sana dialog
 * menjelaskan jalur Bagikan → "Tambahkan ke Layar Utama" alih-alih berpura-pura
 * punya tombol.
 *
 * Dipasang di AppLayout (aplikasi) dan AuthCard (login/register) — keduanya
 * tidak pernah tampil bersamaan, dan rute /print sengaja tidak kebagian.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (isStandalone() || alreadyDismissed()) return;

    setDeferred(getInstallPrompt());
    const unsubscribe = onInstallPrompt(setDeferred);
    const timer = setTimeout(() => setOpen(true), DELAY_MS);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  function remember() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Tidak ada yang bisa dilakukan — tawaran muncul lagi sesi berikutnya.
    }
  }

  function close() {
    remember();
    setOpen(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    consumeInstallPrompt();
    close();
  }

  // Tidak ada yang bisa ditawarkan: bukan Chrome yang siap memasang, dan bukan
  // iOS yang bisa diberi petunjuk manual.
  const canOffer = Boolean(deferred) || isIos();

  return (
    <Dialog open={open && canOffer} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-w-sm text-center sm:max-w-sm">
        <DialogHeader className="items-center gap-2">
          <Icon3d name="mobile" size={88} />
          <DialogTitle>Pasang Student Hub</DialogTitle>
          <DialogDescription>
            {deferred
              ? "Buka langsung dari layar utama, tanpa membuka browser dulu. Laporan, SKM, dan log book tetap sama persis."
              : "Ketuk ikon Bagikan di bilah Safari, lalu pilih “Tambahkan ke Layar Utama”."}
          </DialogDescription>
        </DialogHeader>

        {!deferred && (
          <p className="flex items-center justify-center gap-1.5 rounded-md bg-muted px-3 py-2 text-[12.5px] font-medium text-foreground">
            <Share className="size-3.5 shrink-0" aria-hidden />
            Bagikan → Tambahkan ke Layar Utama
          </p>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {deferred && (
            <Button variant="gradient" onClick={install} className="w-full">
              <Download aria-hidden />
              Pasang Aplikasi
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={close} className="w-full">
            Nanti saja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
