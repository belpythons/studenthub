import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { StatCard } from "@/components/shared/stat-card";
import { ReportTable } from "@/components/reports/report-table";
import { Stagger } from "@/components/motion/motion-primitives";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import type { ReportWithAuthor } from "@/lib/types";

export default function FeedPage() {
  useTitle("Daftar Kegiatan");
  const { user } = useSession();

  const { data: reports, isPending } = useQuery({
    queryKey: ["reports", "feed"],
    queryFn: async () => {
      const { data } = await supabase
        .from("internship_reports")
        .select("*, profiles(nama_lengkap, instansi)")
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as ReportWithAuthor[];
    },
  });

  if (isPending || !reports) return <ListPageSkeleton stats={3} />;

  const peserta = new Set(reports.map((r) => r.user_id));
  const today = todayISO();
  const hariIni = reports.filter((r) => r.tanggal === today).length;

  return (
    <>
      <PageHeader
        title="Daftar Kegiatan Magang"
        description="Kegiatan seluruh peserta magang. Anda dapat melihat semua laporan, namun hanya bisa mengubah laporan milik sendiri."
      />

      <div className="space-y-4">
        <Stagger className="grid grid-cols-3 gap-3">
          <StatCard value={reports.length} label="Total Laporan" icon={<FileText />} />
          <StatCard value={peserta.size} label="Peserta Magang" icon={<Users />} tone="navy" />
          <StatCard value={hariIni} label="Laporan Hari Ini" icon={<CalendarDays />} tone="success" />
        </Stagger>

        <ReportTable reports={reports} currentUserId={user!.id} showPeserta />
      </div>
    </>
  );
}
