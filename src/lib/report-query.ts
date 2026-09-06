import type { SupabaseClient } from "@supabase/supabase-js";
import type { InternshipReport, ReportComment } from "./types";

export interface ReportFilters {
  dari: string;
  sampai: string;
  kategori: string;
  foto: boolean;
  komentar: boolean;
}

/** Reads the export/print filter set from a URL query. */
export function parseFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): ReportFilters {
  const get = (k: string): string => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };

  return {
    dari: get("dari"),
    sampai: get("sampai"),
    kategori: get("kategori"),
    // Both default to on, matching the export form.
    foto: get("foto") !== "0",
    komentar: get("komentar") !== "0",
  };
}

/** The signed-in user's reports for a filter set, oldest first. */
export async function fetchFilteredReports(
  supabase: SupabaseClient,
  userId: string,
  f: ReportFilters,
): Promise<InternshipReport[]> {
  let q = supabase
    .from("internship_reports")
    .select("*")
    .eq("user_id", userId)
    .order("tanggal", { ascending: true })
    .order("jam_mulai", { ascending: true, nullsFirst: true });

  if (f.dari) q = q.gte("tanggal", f.dari);
  if (f.sampai) q = q.lte("tanggal", f.sampai);
  if (f.kategori) q = q.eq("kategori", f.kategori);

  const { data } = await q;
  return (data ?? []) as InternshipReport[];
}

/** Comments for the given reports, keyed by report id. */
export async function fetchCommentsFor(
  supabase: SupabaseClient,
  reportIds: string[],
): Promise<Map<string, ReportComment[]>> {
  const map = new Map<string, ReportComment[]>();
  if (reportIds.length === 0) return map;

  const { data } = await supabase
    .from("report_comments")
    .select("*, profiles(nama_lengkap)")
    .in("report_id", reportIds)
    .order("created_at", { ascending: true });

  for (const c of (data ?? []) as ReportComment[]) {
    const list = map.get(c.report_id) ?? [];
    list.push(c);
    map.set(c.report_id, list);
  }
  return map;
}

/** Human-readable label for the period row of the recap header. */
export function periodeLabel(f: ReportFilters, reports: InternshipReport[]): string {
  if (f.dari || f.sampai) return `${f.dari || "-"} s/d ${f.sampai || "-"}`;
  if (reports.length === 0) return "- s/d -";
  return `${reports[0].tanggal} s/d ${reports[reports.length - 1].tanggal}`;
}
