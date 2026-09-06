import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // min-h-11 (44px): ambang target sentuh WCAG 2.5.5.
        "flex min-h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs",
        "transition-[border-color,box-shadow]",
        "placeholder:text-muted-foreground/80",
        // Cincin lembut, bukan bayangan yang menebal: di antara permukaan liat
        // yang semuanya berbayang, perubahan blur nyaris tak terbaca.
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/[0.04]",
        "file:mr-3 file:h-8 file:cursor-pointer file:rounded-full file:border file:border-foreground file:bg-secondary file:px-3 file:text-xs file:font-semibold file:text-secondary-foreground",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
