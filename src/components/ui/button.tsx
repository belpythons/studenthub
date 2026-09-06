import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  Tombol claymorphism.

  Umpan balik tekan memakai `active:` CSS murni, bukan framer-motion: ia berjalan
  di compositor, tidak pernah tertinggal di perangkat lemah, dan tetap bekerja
  sebelum JavaScript sempat hidrasi. Menekan tombol menghilangkan bayangan
  angkatnya sekaligus menggesernya turun 1px — permukaan liat yang rata kembali
  ke bidang halaman.
*/
const PRESS = "active:translate-y-[1px] active:shadow-none";

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border border-foreground text-sm font-semibold",
    "transition-[background-color,box-shadow,transform] duration-100",
    "disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    PRESS,
  ),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        /*
          Varian `gradient` sempat jadi alias mati dari `default` pada sistem
          neubrutalism yang tidak mengenal gradien. Claymorphism justru hidup
          dari gradasi halus, jadi ia kembali punya arti — dan 33 pemanggil
          lama langsung ikut tanpa satu pun disunting.
        */
        gradient:
          "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-card hover:to-primary/70",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        success: "bg-success text-success-foreground shadow-xs hover:bg-success/90",
        outline: "bg-card text-foreground shadow-xs hover:bg-accent",
        "outline-destructive": "bg-card text-destructive shadow-xs hover:bg-destructive/10",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-accent",
        // Ghost dan link sengaja tanpa tepi/bayangan: keduanya dipakai di dalam
        // bilah atau permukaan yang sudah punya elevasinya sendiri.
        ghost:
          "border-transparent text-foreground shadow-none hover:bg-accent active:translate-y-0",
        link: "border-transparent text-primary underline-offset-4 shadow-none hover:underline active:translate-y-0",
      },
      size: {
        /*
          min-h-11 (44px), bukan h-10 — 44px adalah ambang target sentuh
          WCAG 2.5.5, yang di sini juga berarti tombol tidak menyusut di bawah
          ukuran nyaman jempol pada ponsel.
        */
        default: "min-h-11 px-5 py-2",
        sm: "min-h-10 px-4 text-[13px]",
        xs: "min-h-8 px-3 text-xs [&_svg]:size-3.5",
        lg: "min-h-12 px-7",
        icon: "size-11",
        "icon-sm": "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks input. Keeps the label so width stays stable. */
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
