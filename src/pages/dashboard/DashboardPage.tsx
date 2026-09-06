import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  ClipboardCopy,
  Clock,
  FileText,
  Plus,
  Printer,
  Target,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  MotionTableRow,
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ListPageSkeleton } from "@/components/shared/skeletons";
import { displayName, useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { computeStats } from "@/lib/report-stats";
import { aggregateSkm, persenTarget } from "@/lib/skm-aggregate";
import { fetchActivePersona } from "@/lib/skm-preset";
import { formatRentangJam, formatTanggal, pluralJam } from "@/lib/format";
import type { InternshipReport, LogbookEntry, SkmActivity } from "@/lib/types";
import { CountUp, FadeIn, Stagger, StaggerItem, staggerChild } from "@/components/motion/motion-primitives";

async function fetchDashboard(userId: string) {
  const [skmRes, reportRes, logbookRes, persona] = await Promise.all([
    supabase.from("skm_activities").select("poin_skm, kategori, jam_sosial").eq("user_id", userId),
    supabase
      .from("internship_reports")
      .select("id, tanggal, jam_mulai, jam_selesai, kategori, judul, kendala, foto_url")
      .eq("user_id", userId)
      .order("tanggal", { ascending: false }),
    supabase.from("logbook_entries").select("paraf_status").eq("user_id", userId),
    fetchActivePersona(supabase, userId),
  ]);

  return {
    skm: (skmRes.data ?? []) as Pick<SkmActivity, "poin_skm" | "kategori" | "jam_sosial">[],
    reports: (reportRes.data ?? []) as InternshipReport[],
    logbook: (logbookRes.data ?? []) as Pick<LogbookEntry, "paraf_status">[],
    preset: persona.preset,
    rules: persona.rules,
  };
}

export default function DashboardPage() {
  useTitle("Dashboard");
  const { user, profile } = useSession();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard", user!.id],
    queryFn: () => fetchDashboard(user!.id),
  });

  if (isPending || !data) return <ListPageSkeleton stats={3} />;
  const { skm, reports, logbook, preset, rules } = data;

  const skmAgg = aggregateSkm(skm, rules);
  const totalPoin = skmAgg.totalEfektif;
  const skmPct = persenTarget(totalPoin, preset.target_poin);
  const stats = computeStats(reports);
  const diparaf = logbook.filter((e) => e.paraf_status).length;
  const menungguParaf = logbook.length - diparaf;
  const terbaru = reports.slice(0, 5);

  const modules = [
    {
      key: "skm",
      icon: Award,
      title: "Satuan Kegiatan Mahasiswa",
      primary: totalPoin,
      primaryLabel: `dari ${preset.target_poin} poin (${preset.nama})`,
      secondary: `${skm.length} kegiatan tercatat`,
      progress: skmPct,
      href: "/skm",
      extra: { href: "/skm/linkedin", label: "LinkedIn", icon: ClipboardCopy },
    },
    {
      key: "reports",
      icon: FileText,
      title: "Task Report Magang",
      primary: stats.totalLaporan,
      primaryLabel: "laporan kegiatan",
      secondary: stats.totalJam
        ? `${pluralJam(stats.totalJam)} · ${stats.hariAktif} hari aktif`
        : "Belum ada jam tercatat",
      progress: null,
      href: "/reports",
      extra: { href: "/reports/export", label: "Rekap", icon: Printer },
    },
    {
      key: "logbook",
      icon: BookOpen,
      title: "Log Book Konsultasi",
      primary: logbook.length,
      primaryLabel: "entri log book",
      secondary:
        logbook.length === 0
          ? "Belum ada entri"
          : `${diparaf} di-paraf · ${menungguParaf} menunggu`,
      progress: logbook.length ? Math.round((diparaf / logbook.length) * 100) : null,
      href: "/logbook",
      extra: { href: "/print/formulir2", label: "Formulir 2", icon: Printer },
    },
  ] as const;

  return (
    <>
      <PageHeader
        title={`Halo, ${displayName(profile, user?.email)}`}
        description={
          [profile?.instansi, profile?.tempat_kp && `Kerja Praktek di ${profile.tempat_kp}`]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          <Button asChild variant="gradient">
            <Link to="/reports/new">
              <Plus aria-hidden />
              Buat Laporan
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Nudge toward the one setting that silently breaks both letterheads. */}
        {!profile?.nim || profile.nim === "-" ? (
          <FadeIn>
            <Card className="border-warning/40 bg-warning/[0.06] p-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-foreground bg-warning text-warning-foreground"
                  aria-hidden
                >
                  <TriangleAlert className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-foreground">
                    Lengkapi profil Anda
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                    NIM dan pembimbing lapangan dipakai pada kop Formulir 2 dan lembar pengesahan.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/account">Buka Profil</Link>
                </Button>
              </div>
            </Card>
          </FadeIn>
        ) : null}

        <Stagger className="grid gap-3 lg:grid-cols-3">
          {modules.map((m) => (
            <StaggerItem key={m.key}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-foreground bg-primary text-primary-foreground"
                    aria-hidden
                  >
                    <m.icon className="size-4" />
                  </span>
                  <p className="min-w-0 pt-1.5 text-[13px] font-bold leading-tight text-foreground">
                    {m.title}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-3xl font-extrabold leading-none tracking-tight text-foreground">
                    <CountUp value={m.primary} />
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{m.primaryLabel}</p>
                </div>

                {m.progress !== null && (
                  <Progress
                    value={m.progress}
                    className="mt-3 h-1.5"
                    aria-label={`${m.title}: ${m.progress}%`}
                  />
                )}

                <p className="mt-2.5 flex-1 text-[12px] text-muted-foreground">{m.secondary}</p>

                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={m.href}>
                      Buka
                      <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      to={m.extra.href}
                      target={m.extra.href.startsWith("/print") ? "_blank" : undefined}
                    >
                      <m.extra.icon aria-hidden />
                      {m.extra.label}
                    </Link>
                  </Button>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <FadeIn delay={0.1}>
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between gap-3 border-b border-foreground">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  Laporan Terbaru
                </CardTitle>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Lima kegiatan magang terakhir yang Anda catat.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/reports">Semua</Link>
              </Button>
            </CardHeader>

            {terbaru.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Belum ada laporan kegiatan"
                description="Mulai dengan mencatat satu kegiatan magang hari ini."
                action={
                  <Button asChild variant="gradient">
                    <Link to="/reports/new">
                      <Plus aria-hidden />
                      Buat Laporan
                    </Link>
                  </Button>
                }
              />
            ) : (
              <>
                {/* --- Mobile list --- */}
                <ul className="divide-y-2 divide-foreground lg:hidden">
                  {terbaru.map((r) => (
                    <li key={r.id} className="p-4">
                      <Link
                        to={`/reports/${r.id}`}
                        className="text-[13.5px] font-semibold leading-snug text-foreground hover:text-primary"
                      >
                        {r.judul}
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{r.kategori}</Badge>
                        <span className="text-[11.5px] text-muted-foreground">
                          {formatTanggal(r.tanggal)} ·{" "}
                          {formatRentangJam(r.jam_mulai, r.jam_selesai)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* --- Desktop table --- */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-44">Tanggal</TableHead>
                        <TableHead>Kegiatan</TableHead>
                        <TableHead className="w-52">Kategori</TableHead>
                        <TableHead className="w-40">Jam</TableHead>
                      </TableRow>
                    </TableHeader>
                    <Stagger as="tbody">
                      {terbaru.map((r) => (
                        <MotionTableRow key={r.id} variants={staggerChild}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatTanggal(r.tanggal)}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/reports/${r.id}`}
                              className="font-semibold text-foreground hover:text-primary"
                            >
                              {r.judul}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.kategori}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatRentangJam(r.jam_mulai, r.jam_selesai)}
                          </TableCell>
                        </MotionTableRow>
                      ))}
                    </Stagger>
                  </Table>
                </div>
              </>
            )}
          </Card>
        </FadeIn>
      </div>
    </>
  );
}
