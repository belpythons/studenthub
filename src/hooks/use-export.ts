import * as React from "react";

import { exportCsv, exportXlsx } from "@/lib/export-client";
import { describeError, notifyError } from "@/lib/notify";

/**
 * Menjalankan ekspor XLSX/CSV di peramban.
 *
 * Dulu ini dua tautan <a href="/api/export/..."> yang mengunduh langsung dari
 * server. Sekarang berkasnya dirakit di sini, jadi tombolnya butuh keadaan sibuk
 * dan penanganan galat — sebuah buku kerja dengan ratusan baris tidak selesai
 * seketika, dan kegagalan diam-diam terlihat persis seperti tombol rusak.
 */
export function useExport() {
  const [busy, setBusy] = React.useState<"xlsx" | "csv" | null>(null);

  const run = React.useCallback(async (format: "xlsx" | "csv", params: URLSearchParams) => {
    setBusy(format);
    try {
      await (format === "xlsx" ? exportXlsx(params) : exportCsv(params));
    } catch (err) {
      notifyError(`Gagal menyiapkan berkas ${format.toUpperCase()}`, {
        description: describeError(err),
      });
    } finally {
      setBusy(null);
    }
  }, []);

  return { run, busy };
}
