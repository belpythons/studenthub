import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/session";
import { fetchLetterhead } from "@/lib/letterhead";
import { isDefaultPersona, personaVars } from "@/lib/persona";
import supabase from "@/lib/supabase/client";

import "./print.css";

export default function PrintLayout() {
  // Tidak memakai RequireAuth: tiap halaman cetak sudah mengalihkan sendiri,
  // jadi jangan menggandakan redirect di sini.
  const { user } = useSession();
  const { data: letterhead } = useQuery({
    queryKey: ["letterhead", user?.id],
    queryFn: () => fetchLetterhead(supabase, user!.id),
    enabled: Boolean(user),
  });

  // Atribut style, bukan blok <style>: print.css mendeklarasikan ulang set
  // token pada .print-root itu sendiri (kelas spesifisitas sama), sehingga
  // blok :root akan bergantung pada urutan bundel. Atribut style menang mutlak.
  const persona = letterhead?.persona;
  const vars = persona && !isDefaultPersona(persona) ? personaVars(persona) : undefined;

  return (
    <div className="print-root" style={vars as React.CSSProperties | undefined}>
      <Outlet />
    </div>
  );
}
