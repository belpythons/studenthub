import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Clock, Download, FolderKanban, Plus, Printer, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { StatCard } from "@/components/shared/stat-card";
import { LogbookTable } from "@/components/logbook/logbook-table";
import { Stagger } from "@/components/motion/motion-primitives";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLogbook, fetchSupervisors } from "@/lib/logbook-query";
import { fetchLetterhead } from "@/lib/letterhead";
import { fetchActiveProjects } from "@/lib/project-query";
import { useExport } from "@/hooks/use-export";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";

const LOGBOOK_PARAMS = new URLSearchParams({ dataset: "logbook" });

export default function LogbookPage() {
  useTitle("Log Book");
  const { user } = useSession();
  const { run: runExport, busy: exporting } = useExport();

  const { data, isPending } = useQuery({
    queryKey: ["logbook", user!.id],
    queryFn: async () => {
      const [entries, supervisors, letterhead, projects] = await Promise.all([
        fetchLogbook(supabase, user!.id),
        fetchSupervisors(supabase, user!.id),
        fetchLetterhead(supabase, user!.id),
        fetchActiveProjects(supabase, user!.id),
      ]);
      return { entries, supervisors, letterhead, projects };
    },
  });

  if (isPending || !data) return <ListPageSkeleton />;
  const { entries, supervisors, letterhead, projects } = data;

  const diparaf = entries.filter((e) => e.paraf_status).length;

  return (
    <>
      <PageHeader
        title="Log Book Kegiatan & Konsultasi"
        description={`Formulir 2 · ${letterhead.kodeSop}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/logbook/projects">
                <FolderKanban aria-hidden />
                Proyek
              </Link>
            </Button>
            <PrintPreviewDialog
              href="/print/formulir2"
              title="Formulir 2 — Kehadiran & Aktifitas KP"
              description={`Pratinjau A4 · ${letterhead.kodeSop}`}
              exportParams={LOGBOOK_PARAMS}
            >
              <Button variant="outline">
                <Printer aria-hidden />
                Cetak Formulir 2
              </Button>
            </PrintPreviewDialog>
            <Button
              variant="outline"
              loading={exporting === "xlsx"}
              onClick={() => runExport("xlsx", LOGBOOK_PARAMS)}
            >
              {exporting !== "xlsx" && <Download aria-hidden />}
              XLSX
            </Button>
            <Button
              variant="outline"
              loading={exporting === "csv"}
              onClick={() => runExport("csv", LOGBOOK_PARAMS)}
            >
              {exporting !== "csv" && <Download aria-hidden />}
              CSV
            </Button>
            <Button asChild variant="gradient">
              <Link to="/logbook/new">
                <Plus aria-hidden />
                Tambah Entri
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard value={entries.length} label="Total Entri" icon={<BookOpen />} />
          <StatCard value={diparaf} label="Sudah Di-paraf" icon={<CheckCircle2 />} tone="success" />
          <StatCard
            value={entries.length - diparaf}
            label="Menunggu Paraf"
            icon={<Clock />}
            tone="warning"
          />
          <StatCard
            value={supervisors.length}
            label="Pembimbing Terdaftar"
            icon={<Users />}
            tone="navy"
          />
        </Stagger>

        <LogbookTable entries={entries} supervisors={supervisors} projects={projects} />
      </div>
    </>
  );
}
