import * as React from "react";
import { AlertCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "@/components/motion/motion-primitives";

/**
 * One consistent shape for every form field: label, required/optional marker,
 * the control, a hint, and an inline error.
 *
 * The error is wired to the control with `aria-describedby` + `aria-invalid`
 * via the render callback, so assistive tech announces the problem instead of
 * the user discovering it only after pressing Simpan.
 */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  /** Short parenthetical shown next to the label, e.g. "opsional, maks 20MB". */
  optional?: string;
  hint?: React.ReactNode;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (wajib)</span>}
        {optional && <span className="ml-1 font-medium text-muted-foreground">({optional})</span>}
      </Label>

      {children}

      {hint && !error && (
        <p id={hintId} className="text-[12px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errorId}
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-start gap-1.5 text-[12px] font-medium text-destructive"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Accessibility props a control should spread when it sits inside a Field. */
export function fieldAria(htmlFor: string, error?: string | null, hasHint?: boolean) {
  return {
    id: htmlFor,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${htmlFor}-error` : hasHint ? `${htmlFor}-hint` : undefined,
  } as const;
}
