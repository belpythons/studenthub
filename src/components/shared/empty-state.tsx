import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Icon3d, type Icon3dName } from "@/components/shared/icon-3d";
import { cn } from "@/lib/utils";

/**
 * Empty states distinguish the two cases that used to read the same:
 *   "nothing exists yet"  -> offer the action that creates the first record
 *   "nothing matches"     -> offer a way to widen the filter
 */
export function EmptyState({
  icon: Icon,
  icon3d = "folder",
  title,
  description,
  action,
  className,
}: {
  /** Lucide, bila sebuah layar butuh lambang yang tidak ada di set 3D. */
  icon?: LucideIcon;
  /** Ikon 3D bawaan kondisi kosong. Diabaikan bila `icon` diisi. */
  icon3d?: Icon3dName;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      {Icon ? (
        <span
          className="flex size-11 items-center justify-center rounded-xl border border-foreground bg-muted text-muted-foreground"
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
      ) : (
        <Icon3d name={icon3d} size={72} />
      )}

      <div className="space-y-1">
        <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
