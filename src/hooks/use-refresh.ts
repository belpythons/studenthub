import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Pengganti `router.refresh()` milik Next.
 *
 * Di App Router, refresh() menjalankan ulang server component sehingga seluruh
 * data di layar ikut segar. Padanan yang setara di sini adalah membatalkan
 * seluruh cache query. Sengaja tidak selektif: datanya per pengguna dan kecil,
 * sementara daftar queryKey per pemanggil adalah tempat bug menumpuk diam-diam.
 *
 * ponytail: invalidate menyeluruh; persempit per queryKey bila suatu saat ada
 * halaman yang benar-benar berat.
 */
export function useRefresh() {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    void queryClient.invalidateQueries();
  }, [queryClient]);
}
