import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { ParafBadge } from "@/components/logbook/logbook-table";
import NotFound from "@/pages/NotFound";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { formatHariTanggal, formatTanggal } from "@/lib/format";
import { FadeIn } from "@/components/motion/motion-primitives";
import type { Advice, LogbookEntry, Project } from "@/lib/types";

function Section({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default function LogbookDetailPage() {
  useTitle("Detail Entri Log Book");
  const { id } = useParams();
  const { user } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["logbook-entry", id],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("logbook_entries")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (!row) return { entry: null, project: null, advice: [] as Advice[] };
      const e = row as LogbookEntry;

      const [{ data: projectRow }, { data: adviceRows }] = await Promise.all([
        e.project_id
          ? supabase.from("projects").select("*").eq("id", e.project_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("advice").select("*").eq("entry_id", e.id).order("created_at"),
      ]);

      return {
        entry: e,
        project: (projectRow ?? null) as Project | null,
        advice: (adviceRows ?? []) as Advice[],
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
  if (!data.entry) return <NotFound />;

  const { entry, project, advice } = data;

  return (
    <>
      <PageHeader
        title={`Entri No. ${entry.nomor_urut}`}
        description={formatHariTanggal(entry.tanggal)}
        back={{ href: "/logbook", label: "Log Book" }}
        actions={
          <Button asChild variant="gradient">
            <Link to={`/logbook/${entry.id}/edit`}>
              <Pencil aria-hidden />
              Ubah Entri
            </Link>
          </Button>
        }
      />

      <FadeIn>
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <ParafBadge ok={entry.paraf_status} />
              {project && (
                <Button asChild variant="outline" size="xs">
                  <Link to={`/logbook/projects/${project.id}`}>
                    <FolderKanban aria-hidden />
                    {project.judul}
                  </Link>
                </Button>
              )}
            </div>

            <dl className="space-y-4">
              <Section label="Aktivitas Pekerjaan / Topik Konsultasi" value={entry.aktivitas_pekerjaan} />
              <Section label="Hasil & Tindak Lanjut" value={entry.hasil_tindak_lanjut} />
              <div>
                <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Pembimbing Lapangan
                </dt>
                <dd className="mt-1 text-[13.5px] text-foreground">
                  {entry.pembimbing_nama}
                  {entry.pembimbing_jabatan && (
                    <span className="text-muted-foreground"> · {entry.pembimbing_jabatan}</span>
                  )}
                </dd>
              </div>
              <Section
                label="Terakhir diubah"
                value={entry.updated_at ? formatTanggal(entry.updated_at.slice(0, 10)) : null}
              />
            </dl>

            {advice.length > 0 && (
              <div className="border-t border-foreground pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
                  Saran yang lahir dari sesi ini ({advice.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {advice.map((a) => (
                    <li key={a.id} className="rounded-md border border-foreground p-2.5 text-[13px]">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <b>{a.area}</b>
                        <Badge variant="outline">{a.status}</Badge>
                      </span>
                      <span className="mt-0.5 block text-muted-foreground">{a.isi}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </>
  );
}
