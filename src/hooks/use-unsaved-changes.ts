import * as React from "react";

/**
 * Warns before the user loses typed-but-unsaved form input.
 *
 * Covers the two ways work disappeared in the previous build:
 *   - closing / reloading the tab  -> native beforeunload prompt
 *   - clicking any in-app link     -> intercepted, confirmed, then continued
 *
 * The click interception is deliberately capture-phase on document so it works
 * for every `<a>` including Next's `<Link>`, without threading a guard through
 * each navigation call site.
 */
export function useUnsavedChanges(isDirty: boolean, message: string) {
  React.useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Browsers show their own wording; a non-empty value is what triggers it.
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, message]);

  React.useEffect(() => {
    if (!isDirty) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }

      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;

      // Same page — nothing to lose.
      if (href === window.location.pathname + window.location.search) return;

      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, message]);
}

/**
 * Tracks whether a form's current values differ from the values it loaded with.
 * Comparison is on a JSON snapshot, which is enough for these flat forms and
 * avoids a dependency on deep-equal.
 */
export function useDirtyState<T>(current: T, initial: T) {
  const initialSnapshot = React.useRef(JSON.stringify(initial));

  return React.useMemo(
    () => JSON.stringify(current) !== initialSnapshot.current,
    [current],
  );
}
