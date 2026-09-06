import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level placeholders. Every list/detail page ships one so navigation
 * shows structure immediately instead of a frozen previous screen.
 */

export function PageHeaderSkeleton() {
  return (
    <div className="mb-5 space-y-2">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="mt-2 h-3.5 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function FilterBarSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card>
      <div className="border-b border-foreground px-4 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y-2 divide-foreground">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-4 py-4">
            <Skeleton className="h-4 w-20 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full max-w-sm" />
            </div>
            <Skeleton className="hidden h-5 w-24 shrink-0 sm:block" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function FormSkeleton({ fields = 7 }: { fields?: number }) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className={i % 3 === 2 ? "h-20 w-full" : "h-10 w-full"} />
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-20" />
      </div>
    </Card>
  );
}

/** Full list-page shell: header, stats, filters, table. */
export function ListPageSkeleton({ stats = 4, fields = 3 }: { stats?: number; fields?: number }) {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-4">
        {stats > 0 && <StatGridSkeleton count={stats} />}
        <FilterBarSkeleton fields={fields} />
        <TableSkeleton />
      </div>
    </>
  );
}
