import * as React from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Shared easing. One spring for anything that moves in space, one tween for
   anything that only fades — keeps the whole app feeling like one system.
   --------------------------------------------------------------------------- */

export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 };
export const EASE: Transition = { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] };

/**
 * Wraps the app so every framer-motion child honours the OS reduce-motion
 * setting. `reducedMotion="user"` makes framer drop transforms and keep
 * opacity only, which is the accessible default.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={EASE}>
      {children}
    </MotionConfig>
  );
}

/** Fades and lifts content in on mount. Used for page bodies and cards. */
export function FadeIn({
  children,
  delay = 0,
  y = 8,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: EASE },
};

/** Reveals children one after another — KPI rows, card grids, list items. */
export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "tbody";
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag variants={staggerParent} initial="hidden" animate="show" className={className}>
      {children}
    </MotionTag>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "tr";
}) {
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag variants={staggerChild} className={className}>
      {children}
    </MotionTag>
  );
}

/**
 * Collapses/expands height smoothly. Used by the inline "supervisor baru"
 * panel and the unsaved-changes bar so content never pops into place.
 */
export function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapsible"
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ ...EASE, duration: 0.24 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** useLayoutEffect on the client, useEffect on the server (no SSR warning). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Animates a number up to `value`.
 *
 * Initial state is the real `value`, not 0, so the server-rendered HTML and the
 * first client render always agree — seeding from `useReducedMotion()` caused a
 * hydration mismatch, because that hook resolves to null on the server and to
 * the OS setting on the client. The count-down-to-zero and the animation both
 * happen in a layout effect, before the browser paints, so nothing flashes.
 */
export function CountUp({
  value,
  decimals = 0,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = React.useState(value);

  useIsomorphicLayoutEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }

    const duration = 620;
    let frame = 0;
    let start: number | null = null;

    setShown(0);

    const tick = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return (
    <span className={cn("tnum", className)}>
      {shown.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

export { AnimatePresence, motion, useReducedMotion };
