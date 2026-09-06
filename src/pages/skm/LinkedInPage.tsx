import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { LinkedInAssistant } from "@/components/skm/linkedin-assistant";
import { displayName, useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { aiConfigured } from "@/lib/linkedin-client";
import type { SkmActivity } from "@/lib/types";

export default function LinkedInPage() {
  useTitle("LinkedIn Assistant");
  const { user, profile } = useSession();

  const { data, isPending } = useQuery({
    queryKey: ["skm-linkedin", user!.id],
    queryFn: async () => {
      const [{ data: rows }, configured] = await Promise.all([
        supabase
          .from("skm_activities")
          .select("*")
          .eq("user_id", user!.id)
          .order("tanggal_mulai", { ascending: false }),
        aiConfigured(),
      ]);
      return { activities: (rows ?? []) as SkmActivity[], configured };
    },
  });

  if (isPending || !data) return <ListPageSkeleton stats={0} />;

  return (
    <>
      <PageHeader
        title="LinkedIn & Resume Assistant"
        description="Ubah riwayat kegiatan menjadi teks profesional siap-paste ke LinkedIn atau CV."
        back={{ href: "/skm", label: "Daftar SKM" }}
      />
      <LinkedInAssistant
        activities={data.activities}
        nama={displayName(profile, user?.email)}
        instansi={profile?.instansi ?? null}
        aiConfigured={data.configured}
      />
    </>
  );
}
