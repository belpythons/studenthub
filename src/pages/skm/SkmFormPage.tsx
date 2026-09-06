import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { SkmForm } from "@/components/skm/skm-form";
import NotFound from "@/pages/NotFound";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchActivePersona } from "@/lib/skm-preset";
import type { SkmActivity } from "@/lib/types";

/**
 * Satu komponen untuk /skm/new dan /skm/:id/edit.
 *
 * Kedua halaman App Router dulu identik kecuali satu query dan tiga string;
 * memisahkannya hanya menggandakan pemuatan persona dan skeleton yang sama.
 */
export default function SkmFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useTitle(isEdit ? "Ubah Kegiatan SKM" : "Tambah Kegiatan SKM");
  const { user } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["skm-form", user!.id, id ?? "new"],
    queryFn: async () => {
      const persona = await fetchActivePersona(supabase, user!.id);
      if (!id) return { ...persona, activity: null };

      const { data: row } = await supabase
        .from("skm_activities")
        .select("*")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();

      return { ...persona, activity: (row ?? null) as SkmActivity | null };
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
  if (isEdit && !data.activity) return <NotFound />;

  const { preset, rules, activity } = data;

  return (
    <>
      <PageHeader
        title={isEdit ? "Ubah Kegiatan SKM" : "Tambah Kegiatan SKM"}
        description={
          isEdit
            ? activity!.judul
            : `Catat prestasi, organisasi, sertifikasi, kepanitiaan, atau pelatihan. Persona: ${preset.nama}.`
        }
        back={{ href: "/skm", label: "Daftar SKM" }}
      />
      <SkmForm
        userId={user!.id}
        initial={activity ?? undefined}
        rules={rules}
        withJamSosial={preset.target_jam_sosial != null}
      />
    </>
  );
}
