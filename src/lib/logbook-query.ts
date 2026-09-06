import type { SupabaseClient } from "@supabase/supabase-js";

import type { LogbookEntry, Supervisor } from "./types";

export async function fetchSupervisors(
  supabase: SupabaseClient,
  userId: string,
): Promise<Supervisor[]> {
  const { data } = await supabase
    .from("supervisors")
    .select("*")
    .eq("user_id", userId)
    .order("nama", { ascending: true });
  return (data ?? []) as Supervisor[];
}

export async function fetchLogbook(
  supabase: SupabaseClient,
  userId: string,
): Promise<LogbookEntry[]> {
  const { data } = await supabase
    .from("logbook_entries")
    .select("*")
    .eq("user_id", userId)
    .order("nomor_urut", { ascending: true });
  return (data ?? []) as LogbookEntry[];
}

/** One past the highest running number currently in use. */
export function nextNomorUrut(entries: LogbookEntry[]): number {
  return entries.reduce((max, e) => Math.max(max, e.nomor_urut), 0) + 1;
}
