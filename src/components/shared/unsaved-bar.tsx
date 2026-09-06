import * as React from "react";
import { RotateCcw, Save, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "@/components/motion/motion-primitives";

/**
 * Persistent "you have unsaved work" bar.
 *
 * The form's own Save button sits at the bottom of a long form, so on a phone
 * it is usually scrolled out of view. Without this bar the only signal that
 * work is pending is the browser's own beforeunload prompt — which arrives
 * too late, after the user has already decided to leave.
 *
 * `formId` lets the Save button submit a form it is not nested inside, so the
 * bar can live outside the <form> and still be the primary action.
 */
export function UnsavedBar({
  visible,
  /** id of the <form> this bar saves. Omit for an advisory-only bar. */
  formId,
  onDiscard,
  saving,
  message = "Ada perubahan yang belum disimpan.",
  saveLabel = "Simpan",
}: {
  visible: boolean;
  formId?: string;
  onDiscard?: () => void;
  saving?: boolean;
  message?: string;
  saveLabel?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="unsaved-bar"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
          /*
            Sits above the mobile tab bar (3.75rem + home indicator) and drops
            to the viewport floor once the desktop rail takes over at lg.
          */
          className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-40 px-3 pb-3 sm:px-6 lg:bottom-0 lg:pb-4"
        >
          <div
            role="status"
            aria-live="polite"
            className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-warning/35 bg-card/95 p-3 shadow-pop backdrop-blur-md"
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning"
              aria-hidden
            >
              <TriangleAlert className="size-4" />
            </span>

            <p className="min-w-0 flex-1 text-[12.5px] font-medium text-foreground">{message}</p>

            <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
              {onDiscard && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onDiscard}
                  disabled={saving}
                >
                  <RotateCcw aria-hidden />
                  Kembalikan
                </Button>
              )}

              <Button type="submit" form={formId} variant="gradient" size="sm" loading={saving}>
                {!saving && <Save aria-hidden />}
                {saving ? "Menyimpan…" : saveLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
