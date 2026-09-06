import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { ExportPanel } from "@/pages/reports/export-panel";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLetterhead } from "@/lib/letterhead";

export default function ExportPage() {
  useTitle("Ekspor / Rekap");
  const { user } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["reports-export", user!.id],
    queryFn: async () => {
      // Hanya batas periodenya yang dibutuhkan di sini, bukan barisnya —
      // payload-nya tetap kecil.
      const [letterhead, { data: first }, { data: last }, { count }] = await Promise.all([
        fetchLetterhead(supabase, user!.id),
        supabase
          .from("internship_reports")
          .select("tanggal")
          .eq("user_id", user!.id)
          .order("tanggal", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("internship_reports")
          .select("tanggal")
          .eq("user_id", user!.id)
          .order("tanggal", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("internship_reports")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id),
      ]);

      return {
        orgNama: letterhead.orgNama,
        earliest: first?.tanggal ?? null,
        latest: last?.tanggal ?? null,
        total: count ?? 0,
      };
    },
  });

  if (isPending || !data) {
    return (
      <>
        <PageHeaderSkeleton />
        <FormSkeleton fields={4} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ekspor & Rekap Laporan Magang"
        description={`Cetak dokumen resmi ${data.orgNama} atau unduh data mentah untuk diolah di spreadsheet.`}
        back={{ href: "/reports", label: "Laporan Saya" }}
      />
      <ExportPanel earliest={data.earliest} latest={data.latest} totalReports={data.total} />
    </>
  );
}
