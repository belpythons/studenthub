import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { ReportForm } from "@/components/reports/report-form";
import NotFound from "@/pages/NotFound";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLetterhead } from "@/lib/letterhead";
import type { InternshipReport } from "@/lib/types";

/** Satu komponen untuk /reports/new dan /reports/:id/edit. */
export default function ReportFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useTitle(isEdit ? "Ubah Laporan" : "Buat Laporan");
  const { user, profile } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["report-form", user!.id, id ?? "new"],
    queryFn: async () => {
      if (!id) {
        const letterhead = await fetchLetterhead(supabase, user!.id);
        return { report: null, orgNama: letterhead.orgNama };
      }
      const { data: row } = await supabase
        .from("internship_reports")
        .select("*")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return { report: (row ?? null) as InternshipReport | null, orgNama: "" };
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
  if (isEdit && !data.report) return <NotFound />;

  return (
    <>
      <PageHeader
        title={isEdit ? "Ubah Laporan Kegiatan" : "Form Laporan Kegiatan"}
        description={
          isEdit
            ? data.report!.judul
            : `Catat kegiatan magang harian Anda di ${profile?.tempat_kp ?? data.orgNama}.`
        }
        back={
          isEdit
            ? { href: `/reports/${id}`, label: "Detail laporan" }
            : { href: "/reports", label: "Laporan Saya" }
        }
      />
      <ReportForm userId={user!.id} initial={data.report ?? undefined} />
    </>
  );
}
