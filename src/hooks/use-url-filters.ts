import * as React from "react";
import { useSearchParams } from "react-router-dom";

/** Filter values are always plain strings, never the literal type of the default. */
type FilterValues<T> = { [K in keyof T]: string };

/**
 * Keeps filter state in the URL instead of component state.
 *
 * Why: previously every filter lived in `useState`, so a refresh, a browser
 * Back, or sharing a link silently dropped the user's selection. With the
 * values in the query string the view becomes reproducible, bookmarkable and
 * shareable — and Back/Forward step through filter history as users expect.
 *
 * `replace: true` dipakai supaya mengetik di kotak pencarian tidak menumpuk
 * satu entri riwayat per ketukan. `preventScrollReset` adalah padanan langsung
 * `scroll: false` milik Next — tanpanya React Router melompatkan halaman ke
 * atas setiap kali query string berubah.
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();

  /*
    Call sites pass an object literal, which is a fresh reference on every
    render. Memoising on it directly would recompute `values` and rebuild
    `write` each render, so the first value wins and stays stable.
  */
  const defaultsRef = React.useRef(defaults);
  const stableDefaults = defaultsRef.current;

  const values = React.useMemo(() => {
    const out = { ...stableDefaults } as FilterValues<T>;
    for (const key of Object.keys(stableDefaults) as (keyof T)[]) {
      const fromUrl = searchParams.get(String(key));
      if (fromUrl !== null) out[key] = fromUrl;
    }
    return out;
  }, [searchParams, stableDefaults]);

  const write = React.useCallback(
    (patch: Partial<FilterValues<T>>) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        // Keep the URL short: only non-default values are written.
        if (!value || value === stableDefaults[key as keyof T]) next.delete(key);
        else next.set(key, String(value));
      }

      // Any filter change invalidates the current page.
      if (!("page" in patch)) next.delete("page");

      setSearchParams(next, { replace: true, preventScrollReset: true });
    },
    [stableDefaults, setSearchParams, searchParams],
  );

  const reset = React.useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true, preventScrollReset: true });
  }, [setSearchParams]);

  /**
   * How many filters the user has actually changed. `page` is excluded — being
   * on page 3 is not a filter, and counting it would make "Reset filter" light
   * up on a view the user has not filtered at all.
   */
  const activeCount = React.useMemo(
    () =>
      (Object.keys(stableDefaults) as (keyof T)[]).filter(
        (k) => k !== "page" && values[k] && values[k] !== stableDefaults[k],
      ).length,
    [stableDefaults, values],
  );

  /** Current 1-based page, clamped to a sane integer. */
  const page = React.useMemo(() => {
    const raw = Number.parseInt(values["page" as keyof T] ?? "1", 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  }, [values]);

  const setPage = React.useCallback(
    (next: number) => write({ page: String(next) } as Partial<FilterValues<T>>),
    [write],
  );

  return { values, write, reset, activeCount, page, setPage };
}

/**
 * Debounces a value so a search input can drive the URL without writing on
 * every keystroke.
 */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
