import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Camera, Clock, Info, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { CommentThread } from "@/components/reports/comment-thread";
import NotFound from "@/pages/NotFound";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { durasiJam, formatRentangJam, formatTanggal, pluralJam } from "@/lib/format";
import type { ReportComment, ReportWithAuthor } from "@/lib/types";
import { FadeIn } from "@/components/motion/motion-primitives";

function Section({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-[12.5px] font-semibold text-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-muted-foreground">
        {value}
      </p>
    </div>
  );
}

export default function ReportDetailPage() {
  useTitle("Detail Laporan");
  const { id } = useParams();
  const { user } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("internship_reports")
        .select("*, profiles(nama_lengkap, instansi)")
        .eq("id", id!)
        .maybeSingle();
      if (!row) return { report: null, comments: [] as ReportComment[] };

      const { data: commentData } = await supabase
        .from("report_comments")
        .select("*, profiles(nama_lengkap)")
        .eq("report_id", id!)
        .order("created_at", { ascending: true });

      return {
        report: row as ReportWithAuthor,
        comments: (commentData ?? []) as ReportComment[],
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
  if (!data.report) return <NotFound />;

  const report = data.report;
  const commentData = data.comments;
  const isOwner = report.user_id === user!.id;
  const durasi = durasiJam(report.jam_mulai, report.jam_selesai);

  return (
    <>
      <PageHeader
        title="Detail Laporan Kegiatan"
        description={`oleh ${report.profiles?.nama_lengkap ?? "—"}${report.profiles?.instansi ? ` · ${report.profiles.instansi}` : ""}`}
        back={{ href: isOwner ? "/reports" : "/reports/feed", label: isOwner ? "Laporan Saya" : "Daftar Kegiatan" }}
        actions={
          isOwner ? (
            <Button asChild variant="gradient">
              <Link to={`/reports/${report.id}/edit`}>
                <Pencil aria-hidden />
                Ubah Laporan
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <FadeIn>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <CardTitle className="text-base leading-snug">{report.judul}</CardTitle>
                <Badge variant="primary">{report.kategori}</Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <dl className="grid gap-3 rounded-md bg-muted/50 p-3 sm:grid-cols-3">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tanggal
                  </dt>
                  <dd className="mt-0.5 text-[13.5px] font-medium">
                    {formatTanggal(report.tanggal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Waktu
                  </dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13.5px] font-medium">
                    {formatRentangJam(report.jam_mulai, report.jam_selesai)}
                    {durasi > 0 && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-normal text-muted-foreground">
                        <Clock className="size-3" aria-hidden />
                        {pluralJam(durasi)}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dibuat
                  </dt>
                  <dd className="mt-0.5 text-[13.5px] font-medium">
                    {new Date(report.created_at).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
              </dl>

              <Section label="Deskripsi Kegiatan" value={report.deskripsi} />
              <Section label="Output / Hasil" value={report.output} />
              <Section label="Kendala" value={report.kendala} />

              {report.foto_url && (
                <div>
                  <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
                    <Camera className="size-3.5 text-muted-foreground" aria-hidden />
                    Foto Kegiatan
                  </p>
                  <img
                    src={report.foto_url}
                    alt={`Foto kegiatan: ${report.judul}`}
                    className="mt-2 max-h-96 w-auto max-w-full rounded-md border border-foreground"
                  />
                </div>
              )}

              {!isOwner && (
                <p className="flex items-start gap-2 rounded-md border border-foreground bg-accent/50 px-3 py-2.5 text-[12.5px] leading-relaxed">
                  <Info className="mt-px size-4 shrink-0 text-primary" aria-hidden />
                  Ini laporan milik peserta lain — hanya bisa dilihat, tidak bisa diubah. Anda tetap
                  dapat meninggalkan komentar.
                </p>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.06}>
          <CommentThread
            reportId={report.id}
            userId={user!.id}
            comments={commentData}
          />
        </FadeIn>
      </div>
    </>
  );
}
