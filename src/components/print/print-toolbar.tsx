import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Screen-only header for the two printable documents. Hidden by print.css at
 * print time so it never appears in the saved PDF.
 */
export function PrintToolbar({
  title,
  backHref,
  hint,
  extra,
}: {
  title: string;
  backHref: string;
  /** One line telling the user what to do next; PDF export is not obvious. */
  hint?: string;
  extra?: React.ReactNode;
}) {
  const [params] = useSearchParams();

  /*
    Di dalam modal pratinjau, toolbar ini akan menjadi toolbar kedua tepat di
    bawah toolbar modal — dengan tombol Cetak yang mengerjakan hal yang sama.
    `?embed=1` yang membedakannya; print.css tetap menyembunyikannya saat cetak.
  */
  if (params.get("embed") === "1") return null;

  // Remote letterhead logos live on another origin; wait for them (max 3s)
  // so the saved PDF never has a hole where the logo should be.
  async function onPrint() {
    const pending = Array.from(document.images).filter((img) => !img.complete);
    if (pending.length) {
      await Promise.race([
        Promise.all(pending.map((img) => img.decode().catch(() => {}))),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    }
    window.print();
  }

  return (
    <div className="print-toolbar">
      <div className="min-w-0">
        <strong className="block truncate">{title}</strong>
        {hint && <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{hint}</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {extra}
        <Button type="button" variant="gradient" size="sm" onClick={onPrint}>
          <Printer aria-hidden />
          Cetak / Simpan PDF
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={backHref}>
            <ChevronLeft aria-hidden />
            Kembali
          </Link>
        </Button>
      </div>
    </div>
  );
}
