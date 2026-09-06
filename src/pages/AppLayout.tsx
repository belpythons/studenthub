import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/app-shell";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { displayName, useSession } from "@/lib/session";
import { ORG } from "@/lib/constants";
import { fetchLetterhead } from "@/lib/letterhead";
import { personaCss } from "@/lib/persona";
import supabase from "@/lib/supabase/client";

export function useLetterhead() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["letterhead", user?.id],
    queryFn: () => fetchLetterhead(supabase, user!.id),
    enabled: Boolean(user),
  });
}

export default function AppLayout() {
  const { user, profile } = useSession();
  const { data: letterhead } = useLetterhead();

  // Elemen <style>, bukan atribut style pada pembungkus: Radix mem-portal
  // dialog/sheet/dropdown ke document.body, di luar subtree layout ini.
  // Persona bawaan menghasilkan "" — tidak ada tag sama sekali.
  const persona = letterhead ? personaCss(letterhead.persona) : "";

  // Ternary, bukan dua render terpisah: InstallPrompt juga membuka dialog
  // (setelah 6 detik) dan dua Radix Dialog bertumpuk pada pembukaan pertama
  // adalah persis pengalaman yang panduan ini seharusnya cegah. Tawarannya
  // tetap muncul di kunjungan berikutnya.
  const perluPanduan = Boolean(profile) && !profile?.onboarding_at;

  return (
    <AppShell
      nama={displayName(profile, user?.email)}
      instansi={profile?.instansi || ORG.kampus}
      logoSrc={letterhead?.logoSrc}
      subtitle={letterhead?.appSubtitle}
    >
      {persona && <style id="persona-kampus" dangerouslySetInnerHTML={{ __html: persona }} />}
      <div id="konten-utama">
        <Outlet />
      </div>
      {perluPanduan ? <WelcomeTour /> : <InstallPrompt />}
    </AppShell>
  );
}
