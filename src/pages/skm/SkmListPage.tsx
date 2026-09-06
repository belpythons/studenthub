import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCopy, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { SkmProgress } from "@/components/skm/skm-progress";
import { SkmList } from "@/components/skm/skm-list";
import { PersonaPicker } from "@/components/skm/persona-picker";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { aggregateSkm } from "@/lib/skm-aggregate";
import { fetchActivePersona, fetchAllPresets } from "@/lib/skm-preset";
import type { SkmActivity } from "@/lib/types";

export default function SkmListPage() {
  useTitle("Daftar SKM");
  const { user } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["skm", user!.id],
    queryFn: async () => {
      const [{ data: rows }, persona, presets] = await Promise.all([
        supabase
          .from("skm_activities")
          .select("*")
          .eq("user_id", user!.id)
          .order("tanggal_mulai", { ascending: false }),
        fetchActivePersona(supabase, user!.id),
        fetchAllPresets(supabase),
      ]);
      return { activities: (rows ?? []) as SkmActivity[], ...persona, presets };
    },
  });

  if (isPending || !data) return <ListPageSkeleton stats={3} />;
  const { activities, preset, rules, presets } = data;
  const agg = aggregateSkm(activities, rules);

  return (
    <>
      <PageHeader
        title="Satuan Kegiatan Mahasiswa"
        description="Track record prestasi, organisasi, sertifikasi, kepanitiaan, dan pelatihan."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/skm/linkedin">
                <ClipboardCopy aria-hidden />
                LinkedIn
              </Link>
            </Button>
            <Button asChild variant="gradient">
              <Link to="/skm/new">
                <Plus aria-hidden />
                Tambah Kegiatan
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        {presets.length > 0 && <PersonaPicker presets={presets} active={preset} />}
        <SkmProgress
          totalPoin={agg.totalEfektif}
          countByKategori={agg.countByKategori}
          target={preset.target_poin}
          targetJamSosial={preset.target_jam_sosial}
          totalJamSosial={agg.totalJamSosial}
          perKategori={agg.perKategori}
        />
        <SkmList activities={activities} />
      </div>
    </>
  );
}
