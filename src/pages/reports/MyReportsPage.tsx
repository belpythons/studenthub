import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, FileText, Layers, Plus, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { StatCard } from "@/components/shared/stat-card";
import { ReportTable } from "@/components/reports/report-table";
import { Stagger } from "@/components/motion/motion-primitives";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { computeStats } from "@/lib/report-stats";
import type { ReportWithAuthor } from "@/lib/types";

export default function MyReportsPage() {
  useTitle("Laporan Saya");
  const { user } = useSession();

  const { data: reports, isPending } = useQuery({
    queryKey: ["reports", "mine", user!.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("internship_reports")
        .select("*, profiles(nama_lengkap, instansi)")
        .eq("user_id", user!.id)
        .order("tanggal", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as ReportWithAuthor[];
    },
  });

  if (isPending || !reports) return <ListPageSkeleton />;
  const stats = computeStats(reports);

  return (
    <>
      <PageHeader
        title="Laporan Saya"
        description="Seluruh laporan kegiatan magang yang Anda buat."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/reports/export">
                <Printer aria-hidden />
                Ekspor
              </Link>
            </Button>
            <Button asChild variant="gradient">
              <Link to="/reports/new">
                <Plus aria-hidden />
                Buat Laporan
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard value={stats.totalLaporan} label="Laporan Kegiatan" icon={<FileText />} />
          <StatCard value={stats.hariAktif} label="Hari Aktif" icon={<CalendarCheck />} tone="navy" />
          <StatCard
            value={stats.totalJam}
            decimals={1}
            label="Total Jam Kegiatan"
            detail={stats.rataPerHari ? `${stats.rataPerHari.toFixed(1)} jam / hari aktif` : undefined}
            icon={<Clock />}
          />
          <StatCard
            value={stats.jenisKategori}
            label="Jenis Kategori"
            detail={stats.kategoriTerbanyak ?? undefined}
            icon={<Layers />}
            tone="navy"
          />
        </Stagger>

        <ReportTable reports={reports} currentUserId={user!.id} />
      </div>
    </>
  );
}
