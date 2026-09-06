import { Card } from "@/components/ui/card";
import { Icon3d } from "@/components/shared/icon-3d";
import { ReloadButton } from "@/pages/reload-button";
import { useTitle } from "@/lib/use-title";

/**
 * Served by the service worker when a navigation fails. Static on purpose —
 * it must render with no network and no session.
 */
export default function OfflinePage() {
  useTitle("Offline");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <img
          src="/icon.png"
          alt="Universitas Sains dan Teknologi Bontang"
          width={52}
          height={35}
          className="mx-auto h-auto w-[52px] rounded-lg"
        />

        <Icon3d name="wifi" size={80} className="mx-auto mt-4" />

        <h1 className="mt-4 text-base font-bold">Anda sedang offline</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Halaman ini butuh koneksi internet. Data laporan dan log book hanya
          diambil langsung dari server, jadi tidak disimpan di perangkat.
        </p>

        <div className="mt-5">
          <ReloadButton />
        </div>

        <p className="mt-4 text-[11.5px] text-muted-foreground">
          Catatan yang sudah tersimpan aman di server dan akan muncul kembali
          begitu koneksi tersambung.
        </p>
      </Card>
    </main>
  );
}
