import * as React from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CountUp, StaggerItem } from "@/components/motion/motion-primitives";

type Tone = "primary" | "navy" | "success" | "warning" | "destructive";

const TONE: Record<Tone, string> = {
  primary: "text-primary",
  navy: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const TONE_BG: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  navy: "bg-secondary text-secondary-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/14 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

interface BaseProps {
  label: string;
  /** Extra line under the label — the "why is this number what it is" line. */
  detail?: string;
  /**
   * Rendered icon element, e.g. `icon={<FileText />}`.
   *
   * A rendered element rather than a component reference: this is a Client
   * Component, and React cannot serialise a function prop across the server
   * boundary ("Functions cannot be passed directly to Client Components").
   */
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

function IconSlot({ icon, tone }: { icon: React.ReactNode; tone: Tone }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-xl border border-foreground [&_svg]:size-4",
        TONE_BG[tone],
      )}
      aria-hidden
    >
      {icon}
    </span>
  );
}

export function StatCard({
  value,
  label,
  detail,
  icon,
  tone = "primary",
  decimals = 0,
  className,
}: BaseProps & { value: number; decimals?: number }) {
  return (
    <StaggerItem>
      <Card className={cn("h-full p-4", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-2xl font-extrabold leading-none tracking-tight", TONE[tone])}>
              <CountUp value={value} decimals={decimals} />
            </p>
            <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
            {detail && <p className="mt-0.5 text-[11.5px] text-muted-foreground/85">{detail}</p>}
          </div>

          {icon && <IconSlot icon={icon} tone={tone} />}
        </div>
      </Card>
    </StaggerItem>
  );
}

/** Non-numeric variant for text values like "Pekerjaan Utama". */
export function StatCardText({
  value,
  label,
  icon,
  tone = "navy",
  className,
}: BaseProps & { value: string }) {
  return (
    <StaggerItem>
      <Card className={cn("h-full p-4", className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("truncate text-base font-bold leading-tight", TONE[tone])} title={value}>
              {value}
            </p>
            <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
          </div>

          {icon && <IconSlot icon={icon} tone={tone} />}
        </div>
      </Card>
    </StaggerItem>
  );
}
