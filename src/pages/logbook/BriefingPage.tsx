import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import NotFound from "@/pages/NotFound";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { buildBriefing, fetchProjectDetail } from "@/lib/project-query";
import { formatTanggal } from "@/lib/format";
import { FadeIn } from "@/components/motion/motion-primitives";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";

export default function BriefingPage() {
  useTitle("Briefing Pack");
  const { id } = useParams();
  const { user } = useSession();

  const { data: detail, isPending } = useQuery({
    queryKey: ["project-briefing", id],
    queryFn: () => fetchProjectDetail(supabase, user!.id, id!),
  });

  if (isPending) return <ListPageSkeleton stats={0} />;
  if (!detail) return <NotFound />;

  const { keputusanPerArea, konflikTerbuka, saranMenunggu } = buildBriefing(detail);
  const { project, advisors, entries } = detail;

  return (
    <>
      <PageHeader
        title={`Briefing Pack — ${project.judul}`}
        description="Format SBAR: bekal lengkap sebelum sesi pertama dengan konsultan baru."
        back={{ href: `/logbook/projects/${project.id}`, label: "Detail Proyek" }}
        actions={
          <PrintPreviewDialog
            href={`/print/briefing?project=${project.id}`}
            title="Briefing Pack Konsultasi"
            description="Format SBAR — bekal sebelum sesi dengan konsultan baru."
          >
            <Button variant="gradient">
              <Printer aria-hidden />
              Cetak / PDF
            </Button>
          </PrintPreviewDialog>
        }
      />

      <FadeIn>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>S — Situation</CardTitle>
              <CardDescription>Kondisi proyek saat ini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 text-[13.5px]">
              <p>
                <b>{project.judul}</b> ({project.jenis}) — status {project.status}
                {project.fase ? `, fase ${project.fase}` : ""}
                {project.target_tanggal
                  ? `, target ${formatTanggal(project.target_tanggal)}`
                  : ""}
                .
              </p>
              {project.deskripsi && <p className="text-muted-foreground">{project.deskripsi}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {advisors.map((s) => (
                  <Badge key={s.id} variant="outline">
                    {s.nama}
                    {s.peran ? ` · ${s.peran}` : ""}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>B — Background</CardTitle>
              <CardDescription>
                Kronologi konsultasi dan keputusan yang sudah diadopsi per area.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-[13.5px]">
              {entries.length > 0 && (
                <ul className="space-y-1 text-muted-foreground">
                  {entries.map((e) => (
                    <li key={e.id}>
                      {formatTanggal(e.tanggal)} — {e.pembimbing_nama}: {e.aktivitas_pekerjaan}
                    </li>
                  ))}
                </ul>
              )}
              {keputusanPerArea.length === 0 ? (
                <p className="text-muted-foreground">Belum ada keputusan yang diadopsi.</p>
              ) : (
                keputusanPerArea.map(({ area, keputusan }) => (
                  <div key={area} className="rounded-md border border-foreground p-3">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
                      {area}
                    </p>
                    <p className="mt-1">{keputusan.isi}</p>
                    <p className="mt-1 text-[12.5px] text-muted-foreground">
                      Diadopsi dari {keputusan.penyaran_nama}
                      {keputusan.alasan_status ? ` — ${keputusan.alasan_status}` : ""}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>A — Assessment</CardTitle>
              <CardDescription>Konflik terbuka dan saran yang belum diputuskan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-[13.5px]">
              {konflikTerbuka.length === 0 && saranMenunggu.length === 0 && (
                <p className="text-muted-foreground">
                  Tidak ada konflik terbuka maupun saran menunggu keputusan.
                </p>
              )}
              {konflikTerbuka.map((k) => (
                <div key={`${k.a.id}-${k.b.id}`} className="rounded-md border border-warning/60 p-3">
                  <p className="text-[12px] font-bold uppercase tracking-wide text-warning">
                    Konflik — {k.a.area}
                  </p>
                  <p className="mt-1">
                    <b>{k.a.penyaran_nama}:</b> {k.a.isi}
                  </p>
                  <p className="mt-1">
                    <b>{k.b.penyaran_nama}:</b> {k.b.isi}
                  </p>
                </div>
              ))}
              {saranMenunggu.map((a) => (
                <p key={a.id} className="text-muted-foreground">
                  [{a.area}] {a.penyaran_nama}: {a.isi}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>R — Recommendation</CardTitle>
              <CardDescription>
                Yang ingin ditanyakan/diminta dari konsultan berikutnya (isi di form Ubah
                Proyek).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[13.5px]">
              {project.pertanyaan_baru ? (
                <p className="whitespace-pre-line">{project.pertanyaan_baru}</p>
              ) : (
                <p className="text-muted-foreground">Belum diisi.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </FadeIn>
    </>
  );
}
