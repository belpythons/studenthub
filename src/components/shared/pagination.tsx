import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 20;

/**
 * Client-side pager over an already-loaded list.
 *
 * The count line is deliberately explicit ("21–40 dari 188") because the old
 * tables gave no indication that more rows existed beyond the fold.
 */
export function Pagination({
  page,
  pageSize = PAGE_SIZE,
  total,
  onPageChange,
  label = "baris",
}: {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // A single page needs no pager. The count is already stated by FilterBar, so
  // repeating it here just printed "6 laporan" twice on the same screen.
  if (total <= pageSize) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-foreground px-4 py-3">
      <p className="text-[12.5px] text-muted-foreground" aria-live="polite">
        Menampilkan <span className="font-semibold text-foreground">{from}–{to}</span> dari{" "}
        <span className="font-semibold text-foreground">{total}</span> {label}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft aria-hidden />
        </Button>

        <span className="px-1.5 text-[12.5px] font-medium tnum">
          {page} / {pageCount}
        </span>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** Slices a list for the current page, clamping an out-of-range page number. */
export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  return { rows: items.slice(start, start + pageSize), safePage, pageCount };
}
