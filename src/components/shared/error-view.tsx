import { AlertTriangle, ChevronLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Shown by every route's error boundary.
 *
 * The previous build had none, so a failed Supabase call produced Next's raw
 * error screen with no way back. This states what happened, offers a retry
 * that re-runs the server component, and always leaves an exit.
 */
export function ErrorView({
  title = "Gagal memuat halaman",
  description = "Terjadi kendala saat mengambil data. Ini biasanya masalah koneksi sementara.",
  digest,
  onRetry,
  backHref = "/dashboard",
  backLabel = "Ke Dashboard",
}: {
  title?: string;
  description?: string;
  digest?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <Card className="mx-auto max-w-lg p-6 text-center">
      <span
        className="mx-auto flex size-11 items-center justify-center rounded-xl border border-foreground bg-destructive text-destructive-foreground"
        aria-hidden
      >
        <AlertTriangle className="size-5" />
      </span>

      <h1 className="mt-4 text-base font-bold">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
        {description}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw aria-hidden />
            Coba lagi
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to={backHref}>
            <ChevronLeft aria-hidden />
            {backLabel}
          </Link>
        </Button>
      </div>

      {digest && (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">Kode kendala: {digest}</p>
      )}
    </Card>
  );
}
