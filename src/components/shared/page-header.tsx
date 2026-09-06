import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/motion-primitives";

export function PageHeader({
  title,
  description,
  /** Renders a labelled back link — tells the user exactly where they'll land. */
  back,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <FadeIn className={cn("mb-5 space-y-3", className)}>
      {back && (
        <Button asChild variant="ghost" size="xs" className="-ml-2 text-muted-foreground">
          <Link to={back.href}>
            <ChevronLeft aria-hidden />
            {back.label}
          </Link>
        </Button>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {/* On mobile the actions wrap to full width so they stay tappable. */}
        {actions && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
