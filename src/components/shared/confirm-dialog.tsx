import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Replaces `window.confirm` / `window.alert`.
 *
 * Beyond styling, this gives the user what a native confirm cannot:
 *   - a title, a plain-language consequence, and the name of the record
 *   - an explicit list of what else gets removed
 *   - Escape / focus trap / focus restore, from Radix
 *   - a loading state, so a slow delete does not look like a dead button
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  /** Bulleted consequences, e.g. "Foto kegiatan ikut terhapus". */
  consequences,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  destructive = true,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground",
                destructive ? "bg-destructive/12 text-destructive" : "bg-warning/16 text-warning",
              )}
              aria-hidden
            >
              {destructive ? <Trash2 className="size-4" /> : <AlertTriangle className="size-4" />}
            </span>
            <div className="space-y-2">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {consequences && consequences.length > 0 && (
          <ul className="ml-12 space-y-1 rounded-md bg-muted/60 p-3 text-[12.5px] text-muted-foreground">
            {consequences.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              buttonVariants({ variant: destructive ? "destructive" : "default" }),
              loading && "pointer-events-none opacity-60",
            )}
            onClick={(e) => {
              // Keep the dialog open while the request is in flight so the
              // user sees the pending state rather than an empty screen.
              e.preventDefault();
              onConfirm();
            }}
          >
            {loading ? "Memproses…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Small state helper so call sites stay short. */
export function useConfirm() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  return {
    open,
    loading,
    setLoading,
    ask: () => setOpen(true),
    close: () => {
      setOpen(false);
      setLoading(false);
    },
    onOpenChange: (next: boolean) => {
      if (!loading) setOpen(next);
    },
  };
}
