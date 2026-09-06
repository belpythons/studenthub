import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "@/components/motion/motion-primitives";

/**
 * Banner galat/sukses untuk seluruh form autentikasi.
 *
 * Markup ini dulu digandakan di LoginForm dan RegisterForm, dan tak satu pun
 * mengurus fokus. Pada form daftar yang panjang — tombol kirim di bawah, banner
 * di atas — akibatnya pengguna menekan "Daftar", tidak melihat apa pun berubah,
 * dan menyangka pendaftarannya gagal. Menggulir sendiri saat mount adalah alasan
 * komponen ini ada, bukan sekadar penghematan baris.
 */
export function FormAlert({
  tone,
  children,
  className,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    // `behavior: "smooth"` otomatis menjadi instan lewat aturan
    // prefers-reduced-motion di globals.css.
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    ref.current?.focus({ preventScroll: true });
  }, []);

  const Icon = tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <p
        ref={ref}
        tabIndex={-1}
        role="alert"
        aria-live="polite"
        className={cn(
          "flex items-start gap-2 rounded-md border px-3.5 py-2.5 text-[13px] font-medium outline-none",
          tone === "error"
            ? "border-destructive/35 bg-destructive/8 text-destructive"
            : "border-success/35 bg-success/8 text-success",
          className,
        )}
      >
        <Icon className="mt-px size-4 shrink-0" aria-hidden />
        <span className="min-w-0">{children}</span>
      </p>
    </motion.div>
  );
}

export { AnimatePresence };
