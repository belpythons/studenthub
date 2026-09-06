import * as React from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";

import { NAV_GROUPS, isNavItemActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/session";
import { motion } from "@/components/motion/motion-primitives";

/**
 * Navigation list shared by the fixed desktop rail and the mobile drawer.
 * `onNavigate` lets the drawer close itself when a link is followed.
 */
export function SidebarNav({
  onNavigate,
  logoSrc = "/icon.png",
  subtitle = "USTB · PT Badak NGL",
}: {
  onNavigate?: () => void;
  logoSrc?: string;
  subtitle?: string;
}) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link
        to="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4"
      >
        <img
          src={logoSrc}
          alt=""
          width={38}
          height={26}
          className="h-auto w-[38px] shrink-0 rounded-md border border-foreground bg-white object-contain p-1"
        />
        <span className="flex min-w-0 flex-col leading-tight">
          <strong className="truncate text-sm font-bold text-white">Student Hub</strong>
          <small className="truncate text-[10.5px] text-sidebar-muted">{subtitle}</small>
        </span>
      </Link>

      <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto scrollbar-thin px-2.5 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3.5 last:mb-0">
            <p className="mb-1.5 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-sidebar-muted">
              {group.title}
            </p>

            {group.items.map((item) => {
              const active = isNavItemActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative mb-0.5 flex min-h-11 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors",
                    active
                      ? "text-white"
                      : "text-sidebar-foreground hover:bg-white/[0.09] hover:text-white",
                  )}
                >
                  {/* Shared layout id slides the highlight between items. */}
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      // Pil liat warna kampus yang meluncur antar item.
                      className="absolute inset-0 -z-10 rounded-md bg-[hsl(var(--sidebar-accent))]"
                      transition={{ type: "spring", stiffness: 480, damping: 38 }}
                    />
                  )}
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2.5">
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/[0.09] hover:text-white"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          Keluar
        </button>
      </div>
    </div>
  );
}
