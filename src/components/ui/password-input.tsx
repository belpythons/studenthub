import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Input password dengan tombol tampil/sembunyikan.
 *
 * Dibuat sebagai pembungkus `Input`, bukan varian di dalamnya: `Input` adalah
 * `<input>` telanjang tanpa slot adornment, dan menambahkan slot itu akan
 * memaksa setiap pemakaian lain melewati pembungkus yang tidak mereka butuhkan.
 *
 * Seluruh props diteruskan ke `Input`, jadi `fieldAria()`, `autoComplete`, dan
 * `aria-invalid` dari pemanggil tetap bekerja apa adanya. `type` sengaja tidak
 * diterima — komponen inilah yang memilikinya.
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const label = visible ? "Sembunyikan password" : "Tampilkan password";

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // aria-pressed, bukan sekadar label berganti: pembaca layar mengumumkan
        // status tombolnya tanpa pengguna harus menebak dari namanya.
        aria-pressed={visible}
        aria-label={label}
        title={label}
        // Tombol di dalam kolom, jadi ukurannya tidak bisa 44px penuh tanpa
        // melebihi tingginya sendiri; area sentuh diperlebar lewat padding.
        className="absolute inset-y-px right-px flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
