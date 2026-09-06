import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-[border-color,box-shadow]",
        "placeholder:text-muted-foreground/80",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-55",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:bg-destructive/[0.04]",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
