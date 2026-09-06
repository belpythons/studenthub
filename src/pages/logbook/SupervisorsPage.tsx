import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { SupervisorManager } from "@/components/logbook/supervisor-manager";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLogbook, fetchSupervisors } from "@/lib/logbook-query";

export default function SupervisorsPage() {
  useTitle("Pembimbing");
  const { user } = useSession();

  const { data: rows, isPending } = useQuery({
    queryKey: ["supervisors", user!.id],
    queryFn: async () => {
      const [supervisors, entries] = await Promise.all([
        fetchSupervisors(supabase, user!.id),
        fetchLogbook(supabase, user!.id),
      ]);
      return supervisors.map((s) => ({
        ...s,
        jumlahKonsultasi: entries.filter((e) => e.supervisor_id === s.id).length,
      }));
    },
  });

  if (isPending || !rows) return <ListPageSkeleton stats={0} />;

  return (
    <>
      <PageHeader
        title="Pembimbing / Atasan"
        description="Daftar orang berpangkat yang Anda ajak konsultasi selama kerja praktek."
        back={{ href: "/logbook", label: "Log Book" }}
      />
      <SupervisorManager rows={rows} />
    </>
  );
}
