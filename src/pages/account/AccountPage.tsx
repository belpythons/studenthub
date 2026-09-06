import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons";
import { ProfileForm } from "@/components/layout/profile-form";
import { LetterheadForm } from "@/components/layout/letterhead-form";
import { AccountSecurity } from "@/components/layout/account-security";
import { useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLetterheadRow } from "@/lib/letterhead";
import { ORG } from "@/lib/constants";

export default function AccountPage() {
  useTitle("Profil & Pengesahan");
  const { user, profile } = useSession();

  const { data: letterheadRow, isPending } = useQuery({
    queryKey: ["letterhead-row", user!.id],
    queryFn: () => fetchLetterheadRow(supabase, user!.id),
  });

  if (isPending) {
    return (
      <>
        <PageHeaderSkeleton />
        <FormSkeleton />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Profil & Pengesahan"
        description="Data di sini mengisi kop surat dan blok tanda tangan pada kedua dokumen cetak."
      />
      <ProfileForm userId={user!.id} email={user!.email ?? ""} initial={profile} />
      <LetterheadForm
        userId={user!.id}
        instansi={profile?.instansi || ORG.kampus}
        initial={letterheadRow ?? null}
      />
      <AccountSecurity email={user!.email ?? ""} />
    </>
  );
}
