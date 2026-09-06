import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Gavel, Plus, ShieldAlert, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { ProjectForm } from "@/components/logbook/project-form";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchProjectsOverview } from "@/lib/project-query";
import { formatTanggal } from "@/lib/format";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion-primitives";

const STATUS_BADGE: Record<string, "success" | "outline" | "primary"> = {
  aktif: "primary",
  selesai: "success",
  arsip: "outline",
};

export default function ProjectsPage() {
  useTitle("Proyek Konsultasi");
  const { user } = useSession();

  const { data: projects, isPending } = useQuery({
    queryKey: ["projects", user!.id],
    queryFn: () => fetchProjectsOverview(supabase, user!.id),
  });

  if (isPending || !projects) return <ListPageSkeleton stats={0} />;

  return (
    <>
      <PageHeader
        title="Proyek Konsultasi"
        description="Kelompokkan sesi bimbingan per proyek, catat saran tiap konsultan, dan putuskan konflik secara eksplisit."
        back={{ href: "/logbook", label: "Log Book" }}
      />

      <div className="space-y-4">
        <FadeIn>
          <details>
            <summary className={buttonVariants({ variant: "gradient", className: "cursor-pointer list-none [&::-webkit-details-marker]:hidden" })}>
              <Plus aria-hidden />
              Proyek Baru
            </summary>
            <Card className="mt-3">
              <CardContent className="pt-4">
                <ProjectForm />
              </CardContent>
            </Card>
          </details>
        </FadeIn>

        {projects.length === 0 ? (
          <Card>
            <EmptyState
              icon={FolderKanban}
              title="Belum ada proyek"
              description="Buat proyek pertama Anda — jurnal, tugas akhir, lomba, atau apa pun yang butuh banyak konsultan."
            />
          </Card>
        ) : (
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <StaggerItem key={p.id}>
                <Link to={`/logbook/projects/${p.id}`} className="block h-full">
                  <Card className="h-full p-4 transition-colors hover:border-primary/60">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={STATUS_BADGE[p.status] ?? "outline"}>{p.status}</Badge>
                      <Badge variant="outline">{p.jenis}</Badge>
                      {p.konflikTerbuka > 0 && (
                        <Badge variant="warning">
                          <ShieldAlert aria-hidden />
                          {p.konflikTerbuka} konflik terbuka
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-2 text-[15px] font-bold leading-snug text-foreground">
                      {p.judul}
                    </h3>
                    {p.fase && (
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                        Fase: {p.fase}
                        {p.target_tanggal ? ` · target ${formatTanggal(p.target_tanggal)}` : ""}
                      </p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden />
                        {p.jumlahKonsultan} konsultan
                      </span>
                      <span>{p.jumlahSesi} sesi</span>
                      {p.keputusanTerakhir && (
                        <span className="inline-flex items-center gap-1">
                          <Gavel className="size-3.5" aria-hidden />
                          Keputusan terakhir: {p.keputusanTerakhir.area}
                        </span>
                      )}
                    </p>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
