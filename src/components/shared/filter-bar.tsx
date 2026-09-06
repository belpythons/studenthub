import * as React from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Filter surface used by every list page.
 *
 * Two deliberate choices:
 *   - it always reports how many filters are active and how many rows survive,
 *     so a short list never looks like missing data;
 *   - on mobile the controls collapse behind one button, because a stack of
 *     four full-width selects pushed the actual table off the screen.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Cari…",
  searchLabel = "Cari",
  activeCount,
  onReset,
  resultCount,
  totalCount,
  resultLabel = "baris",
  children,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  activeCount: number;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
  resultLabel?: string;
  /** The select controls; laid out in a responsive grid. */
  children?: React.ReactNode;
}) {
  const [openOnMobile, setOpenOnMobile] = React.useState(false);
  const filtered = resultCount !== totalCount;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3">
        {onSearchChange && (
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="filter-cari">{searchLabel}</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="filter-cari"
                type="search"
                className="pl-9"
                placeholder={searchPlaceholder}
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {children && (
          <Button
            variant="outline"
            className="sm:hidden"
            onClick={() => setOpenOnMobile((v) => !v)}
            aria-expanded={openOnMobile}
            aria-controls="filter-lanjutan"
          >
            <SlidersHorizontal aria-hidden />
            Filter
            {activeCount > 0 && (
              <Badge variant="primary" className="ml-0.5 px-1.5 py-0">
                {activeCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      {/*
        Rendered exactly once. An earlier version output `children` twice — a
        mobile copy and a desktop copy — which duplicated every control's `id`
        and broke the <label for> and aria-describedby associations.
        Visibility is CSS-only instead: hidden under sm unless expanded.
      */}
      {children && (
        <div
          id="filter-lanjutan"
          className={cn(
            "gap-3 pt-3 sm:grid sm:grid-cols-2 lg:grid-cols-3",
            openOnMobile ? "grid" : "hidden",
          )}
        >
          {children}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-foreground pt-3">
        <p className="text-[12px] text-muted-foreground" aria-live="polite">
          {filtered ? (
            <>
              <span className="font-semibold text-foreground tnum">{resultCount}</span> dari{" "}
              <span className="tnum">{totalCount}</span> {resultLabel} cocok dengan filter
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground tnum">{totalCount}</span> {resultLabel}
            </>
          )}
        </p>

        <Button
          variant="ghost"
          size="xs"
          onClick={onReset}
          disabled={activeCount === 0}
          className={cn("text-muted-foreground", activeCount === 0 && "invisible")}
        >
          <X aria-hidden />
          Reset filter
        </Button>
      </div>
    </Card>
  );
}
