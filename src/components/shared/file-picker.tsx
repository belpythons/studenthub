import * as React from "react";
import { FileText, Paperclip, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Collapsible } from "@/components/motion/motion-primitives";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Replaces the bare `<input type="file">`.
 *
 * The old control gave no feedback at all: no thumbnail, no file size, no way
 * to change your mind, and a 20 MB upload showed nothing but a disabled
 * button. This shows the chosen file, its size against the limit, a preview
 * for images, a remove action, and the upload progress while it is in flight.
 */
export function FilePicker({
  id,
  accept = "image/*",
  maxBytes,
  file,
  onFileChange,
  /** Public URL of a file already stored on the record. */
  existingUrl,
  onRemoveExisting,
  /** 0-100 while uploading, null when idle. */
  progress,
  disabled,
  hint,
}: {
  id: string;
  accept?: string;
  maxBytes: number;
  file: File | null;
  onFileChange: (file: File | null, error: string | null) => void;
  existingUrl?: string | null;
  onRemoveExisting?: () => void;
  progress?: number | null;
  disabled?: boolean;
  hint?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;

    if (picked && picked.size > maxBytes) {
      // Message names the actual size and the cap, so the fix is obvious.
      onFileChange(
        null,
        `Ukuran berkas ${formatBytes(picked.size)} melebihi batas ${formatBytes(maxBytes)}. Silakan pilih atau kompres berkas yang lebih kecil.`,
      );
      e.target.value = "";
      return;
    }

    onFileChange(picked, null);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    onFileChange(null, null);
  }

  const uploading = typeof progress === "number";

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
      />

      {!file && (
        <label
          htmlFor={id}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-input bg-muted/40 px-4 py-5 text-center transition-colors",
            "hover:border-primary/50 hover:bg-accent/50",
            disabled && "pointer-events-none opacity-55",
          )}
        >
          <UploadCloud className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-[12.5px] font-semibold text-foreground">
            Ketuk untuk memilih berkas
          </span>
          <span className="text-[11.5px] text-muted-foreground">
            {hint ?? `Maksimal ${formatBytes(maxBytes)}`}
          </span>
        </label>
      )}

      {file && (
        <div className="flex items-start gap-3 rounded-md border border-foreground bg-card p-2.5">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              className="size-14 shrink-0 rounded-md border border-foreground object-cover"
            />
          ) : (
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded border border-foreground bg-muted text-muted-foreground"
              aria-hidden
            >
              <FileText className="size-5" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-foreground">{file.name}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {formatBytes(file.size)} dari maksimal {formatBytes(maxBytes)}
            </p>

            <Collapsible open={uploading}>
              <div className="pt-2">
                <Progress value={progress ?? 0} className="h-1.5" />
                <p className="mt-1 text-[11px] text-muted-foreground tnum" aria-live="polite">
                  Mengunggah… {Math.round(progress ?? 0)}%
                </p>
              </div>
            </Collapsible>
          </div>

          {!uploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              aria-label={`Buang berkas ${file.name}`}
              className="shrink-0 text-muted-foreground"
            >
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
      )}

      {existingUrl && !file && (
        <div className="flex items-center gap-2 rounded-md border border-foreground bg-muted/40 px-2.5 py-2">
          <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-[12px] text-muted-foreground">
            Sudah ada berkas terunggah.{" "}
            <a
              href={existingUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Lihat
            </a>
            {" · memilih berkas baru akan menggantinya."}
          </p>
          {onRemoveExisting && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onRemoveExisting}
              className="shrink-0 text-destructive"
            >
              Hapus
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
