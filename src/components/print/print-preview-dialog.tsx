import * as React from "react";
import { Download, ExternalLink, FileSpreadsheet, FileText, Maximize2, Minimize2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useExport } from "@/hooks/use-export";
import { SPRING, motion } from "@/components/motion/motion-primitives";
import { cn } from "@/lib/utils";

/**
 * Pratinjau dokumen cetak di dalam modal, menggantikan tautan target="_blank".
 *
 * Memakai <iframe>, bukan render inline. Dua alasan, keduanya keras:
 *
 *  1. print.css mendeklarasikan aturan @page dan @media print untuk seluruh
 *     dokumen. Menempelkannya ke halaman aplikasi berarti setiap perintah cetak
 *     dari mana pun ikut memakainya.
 *  2. iframe.contentWindow.print() mencetak HANYA lembaran itu. Dari halaman
 *     induk, window.print() akan mencetak seluruh aplikasi — sidebar, header,
 *     dan modalnya sendiri.
 */
export function PrintPreviewDialog({
  href,
  title,
  description,
  exportParams,
  children,
}: {
  /** Path halaman cetak, mis. "/print/formulir2?pembimbing=abc". */
  href: string;
  title: string;
  description: string;
  /** Bila diisi, footer menampilkan tombol unduh XLSX dan CSV. */
  exportParams?: URLSearchParams;
  /** Tombol pemicu. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [full, setFull] = React.useState(false);
  const frame = React.useRef<HTMLIFrameElement>(null);
  const { run: runExport, busy: exporting } = useExport();

  // Di layar sempit sebuah lembar A4 dalam kotak kecil tidak ada gunanya —
  // langsung penuh layar, dan tombol perbesarnya disembunyikan.
  const isNarrow =
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches;
  const expanded = full || isNarrow;

  const src = href + (href.includes("?") ? "&" : "?") + "embed=1";

  function printSheet() {
    const win = frame.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setFull(false);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        hideClose
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          expanded
            ? "left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none"
            : // resize:both adalah properti CSS bawaan peramban — tidak perlu
              // pustaka resizable maupun penangan drag sendiri.
              "h-[80vh] max-h-[90vh] w-[min(94vw,900px)] max-w-none resize overflow-auto",
        )}
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-foreground px-4 py-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-sm font-bold">{title}</DialogTitle>
            <DialogDescription className="mt-0.5 text-[11.5px]">{description}</DialogDescription>
          </div>

          <div className="flex items-center gap-1.5">
            {!isNarrow && (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setFull((f) => !f)}
                aria-label={full ? "Perkecil pratinjau" : "Perbesar ke layar penuh"}
              >
                {full ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              asChild
              aria-label="Buka di tab baru"
            >
              <a href={src} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden />
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>

        {/*
          `layout` menganimasikan peralihan ke layar penuh: tanpa itu, iframe
          melompat ukuran dalam satu frame dan pratinjaunya berkedip putih.
          MotionConfig di akar sudah menghormati prefers-reduced-motion.
        */}
        <motion.iframe
          layout
          transition={SPRING}
          ref={frame}
          src={src}
          title={title}
          className="min-h-0 w-full flex-1 border-0 bg-muted"
        />

        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-foreground px-4 py-3">
          <Button type="button" onClick={printSheet}>
            <Printer aria-hidden />
            Unduh PDF
          </Button>

          {exportParams && (
            <>
              <Button
                type="button"
                variant="success"
                loading={exporting === "xlsx"}
                onClick={() => runExport("xlsx", exportParams)}
              >
                {exporting !== "xlsx" && <FileSpreadsheet aria-hidden />}
                XLSX
              </Button>
              <Button
                type="button"
                variant="outline"
                loading={exporting === "csv"}
                onClick={() => runExport("csv", exportParams)}
              >
                {exporting !== "csv" && <FileText aria-hidden />}
                CSV
              </Button>
            </>
          )}

          <span className="ml-auto hidden items-center gap-1.5 text-[11.5px] text-muted-foreground sm:flex">
            <Download className="size-3.5" aria-hidden />
            Pada dialog cetak, pilih tujuan “Save as PDF”.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
