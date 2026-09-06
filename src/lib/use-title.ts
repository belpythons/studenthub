import * as React from "react";

const SUFFIX = "Student Hub";

/**
 * Pengganti `export const metadata` milik App Router.
 *
 * Tanpa SSR judul tidak perlu ada di HTML awal — aplikasi ini bergerbang login,
 * jadi tak ada perayap yang membacanya. Satu efek jauh lebih ringan daripada
 * menambah react-helmet untuk satu properti.
 */
export function useTitle(title?: string) {
  React.useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : "Student Hub & Internship Logbook";
  }, [title]);
}
