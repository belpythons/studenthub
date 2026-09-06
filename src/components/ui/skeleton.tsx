import { cn } from "@/lib/utils";

/**
 * Placeholder pemuatan. Ditandai aria-hidden supaya pembaca layar tetap diam.
 *
 * Denyut opasitas lembut, bukan sapuan shimmer: satu gradien yang bergerak di
 * antara permukaan liat yang semuanya sudah bergradasi hanya menambah bising.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-clay-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
