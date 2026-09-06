import type { SupabaseClient } from "@supabase/supabase-js";
import type { Advice, AdviceRelation, LogbookEntry, Project, Supervisor } from "./types";

export interface ProjectOverview extends Project {
  jumlahKonsultan: number;
  jumlahSesi: number;
  konflikTerbuka: number;
  keputusanTerakhir: Advice | null;
}

export interface ProjectDetail {
  project: Project;
  advisors: Supervisor[];
  entries: LogbookEntry[];
  advice: Advice[];
  relations: AdviceRelation[];
}

/** Konflik terbuka = relasi 'bentrok' yang belum punya resolved_by. */
export function openConflicts(relations: AdviceRelation[]): AdviceRelation[] {
  return relations.filter((r) => r.jenis === "bentrok" && !r.resolved_by);
}

/** Proyek non-arsip untuk select "Proyek Terkait" di form logbook. */
export async function fetchActiveProjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<Project[]> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "arsip")
    .order("created_at", { ascending: false });
  return (data ?? []) as Project[];
}

export async function fetchProjectsOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProjectOverview[]> {
  const [{ data: projects }, { data: advice }, { data: advisors }, { data: entries }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase.from("advice").select("*").eq("user_id", userId),
      supabase.from("project_advisors").select("project_id, supervisor_id"),
      supabase
        .from("logbook_entries")
        .select("id, project_id")
        .eq("user_id", userId)
        .not("project_id", "is", null),
    ]);

  const adviceRows = (advice ?? []) as Advice[];
  const adviceIds = adviceRows.map((a) => a.id);
  const { data: relations } = adviceIds.length
    ? await supabase.from("advice_relations").select("*").in("a_id", adviceIds)
    : { data: [] };

  const adviceById = new Map(adviceRows.map((a) => [a.id, a]));

  return ((projects ?? []) as Project[]).map((p) => {
    const projAdvice = adviceRows.filter((a) => a.project_id === p.id);
    const konflik = openConflicts((relations ?? []) as AdviceRelation[]).filter(
      (r) => adviceById.get(r.a_id)?.project_id === p.id,
    );
    const keputusan = projAdvice
      .filter((a) => a.status === "diadopsi" && a.decided_at)
      .sort((a, b) => (b.decided_at! < a.decided_at! ? -1 : 1))[0];
    return {
      ...p,
      jumlahKonsultan: (advisors ?? []).filter((x) => x.project_id === p.id).length,
      jumlahSesi: (entries ?? []).filter((e) => e.project_id === p.id).length,
      konflikTerbuka: konflik.length,
      keputusanTerakhir: keputusan ?? null,
    };
  });
}

export async function fetchProjectDetail(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ProjectDetail | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!project) return null;

  const [{ data: advisorRows }, { data: entries }, { data: advice }] = await Promise.all([
    supabase
      .from("project_advisors")
      .select("supervisor_id, supervisors(*)")
      .eq("project_id", projectId),
    supabase
      .from("logbook_entries")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("tanggal", { ascending: true }),
    supabase
      .from("advice")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  const adviceRows = (advice ?? []) as Advice[];
  const adviceIds = adviceRows.map((a) => a.id);
  const { data: relations } = adviceIds.length
    ? await supabase.from("advice_relations").select("*").in("a_id", adviceIds)
    : { data: [] };

  const advisors = ((advisorRows ?? []) as unknown as { supervisors: Supervisor | null }[])
    .map((r) => r.supervisors)
    .filter(Boolean) as Supervisor[];
  advisors.sort((a, b) => a.prioritas - b.prioritas || a.nama.localeCompare(b.nama));

  return {
    project: project as Project,
    advisors,
    entries: (entries ?? []) as LogbookEntry[],
    advice: adviceRows,
    relations: (relations ?? []) as AdviceRelation[],
  };
}

/** Bahan Briefing Pack SBAR (dok 04 §3.2) — diturunkan dari detail proyek. */
export interface Briefing {
  detail: ProjectDetail;
  /** B — keputusan diadopsi per area (terbaru per area). */
  keputusanPerArea: { area: string; keputusan: Advice }[];
  /** A — konflik terbuka: pasangan saran + areanya. */
  konflikTerbuka: { a: Advice; b: Advice; catatan: string | null }[];
  /** A — saran diusulkan yang belum diputuskan. */
  saranMenunggu: Advice[];
}

export function buildBriefing(detail: ProjectDetail): Briefing {
  const byId = new Map(detail.advice.map((a) => [a.id, a]));

  const keputusanPerArea = new Map<string, Advice>();
  for (const a of detail.advice) {
    if (a.status !== "diadopsi") continue;
    const existing = keputusanPerArea.get(a.area);
    if (!existing || (a.decided_at ?? "") > (existing.decided_at ?? "")) {
      keputusanPerArea.set(a.area, a);
    }
  }

  const konflikTerbuka = openConflicts(detail.relations)
    .map((r) => ({
      a: byId.get(r.a_id)!,
      b: byId.get(r.b_id)!,
      catatan: r.catatan,
    }))
    .filter((k) => k.a && k.b);

  // Saran yang sedang bentrok sudah tampil di blok konflik — jangan dobel.
  const dalamKonflik = new Set(konflikTerbuka.flatMap((k) => [k.a.id, k.b.id]));

  return {
    detail,
    keputusanPerArea: Array.from(keputusanPerArea.entries())
      .map(([area, keputusan]) => ({ area, keputusan }))
      .sort((x, y) => x.area.localeCompare(y.area)),
    konflikTerbuka,
    saranMenunggu: detail.advice.filter(
      (a) => a.status === "diusulkan" && !dalamKonflik.has(a.id),
    ),
  };
}
