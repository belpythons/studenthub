import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { LogbookForm } from "@/components/logbook/logbook-form";
import NotFound from "@/pages/NotFound";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLogbook, fetchSupervisors, nextNomorUrut } from "@/lib/logbook-query";
import { fetchActiveProjects } from "@/lib/project-query";
import type { LogbookEntry } from "@/lib/types";

/** Satu komponen untuk /logbook/new dan /logbook/:id/edit. */
export default function LogbookFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const isEdit = Boolean(id);
  useTitle(isEdit ? "Ubah Entri Log Book" : "Tambah Entri Log Book");
  const { user } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["logbook-form", user!.id, id ?? "new"],
    queryFn: async () => {
      const [entries, supervisors, projects, entry] = await Promise.all([
        fetchLogbook(supabase, user!.id),
        fetchSupervisors(supabase, user!.id),
        fetchActiveProjects(supabase, user!.id),
        id
          ? supabase
              .from("logbook_entries")
              .select("*")
              .eq("id", id)
              .eq("user_id", user!.id)
              .maybeSingle()
              .then(({ data: row }) => (row ?? null) as LogbookEntry | null)
          : Promise.resolve(null),
      ]);
      return { entries, supervisors, projects, entry };
    },
  });

  if (isPending || !data) {
    return (
      <>
        <PageHeaderSkeleton />
        <FormSkeleton />
      </>
    );
  }
  if (isEdit && !data.entry) return <NotFound />;

  const { entries, supervisors, projects, entry } = data;
  const defaultProjectId = projects.find((p) => p.id === params.get("project"))?.id ?? null;

  return (
    <>
      <PageHeader
        title={isEdit ? "Ubah Entri Log Book" : "Tambah Konsultasi / Log Book"}
        description={
          isEdit
            ? `Entri No. ${entry!.nomor_urut} · ${entry!.pembimbing_nama}`
            : "Catat aktivitas kerja praktek dan sesi konsultasi dengan pembimbing lapangan."
        }
        back={{ href: "/logbook", label: "Log Book" }}
      />
      <LogbookForm
        supervisors={supervisors}
        nextNomor={entry ? entry.nomor_urut : nextNomorUrut(entries)}
        usedNomor={entries.map((e) => e.nomor_urut)}
        initial={entry ?? undefined}
        projects={projects}
        defaultProjectId={isEdit ? undefined : defaultProjectId}
      />
    </>
  );
}
