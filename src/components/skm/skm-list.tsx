import * as React from "react";
import { Link } from "react-router-dom";
import { Award, FileBadge, Pencil, Plus, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MotionTableRow,
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Pagination, paginate } from "@/components/shared/pagination";
import { CertificatePreview } from "@/components/skm/certificate-preview";
import { useDebounced, useUrlFilters } from "@/hooks/use-url-filters";
import { SKM_KATEGORI } from "@/lib/constants";
import { formatTanggal, parseISODate } from "@/lib/format";
import type { SkmActivity } from "@/lib/types";
import { Stagger, StaggerItem, staggerChild } from "@/components/motion/motion-primitives";

const ALL = "semua";

const DEFAULTS = { q: "", kategori: ALL, tahun: ALL, page: "1" } as const;

/** Academic year of a date: 1 Aug 2025 – 31 Jul 2026 -> "2025/2026". */
function tahunAkademik(iso: string): string {
  const d = parseISODate(iso);
  const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}/${y + 1}`;
}

export function SkmList({ activities }: { activities: SkmActivity[] }) {
  const { values, write, reset, activeCount } = useUrlFilters(DEFAULTS);
  const [preview, setPreview] = React.useState<SkmActivity | null>(null);

  // Local input state keeps typing snappy; the URL catches up on a debounce.
  const [searchDraft, setSearchDraft] = React.useState(values.q);
  const debouncedSearch = useDebounced(searchDraft, 300);

  React.useEffect(() => {
    if (debouncedSearch !== values.q) write({ q: debouncedSearch });
  }, [debouncedSearch, values.q, write]);

  React.useEffect(() => setSearchDraft(values.q), [values.q]);

  const tahunOptions = React.useMemo(
    () =>
      Array.from(new Set(activities.map((a) => tahunAkademik(a.tanggal_mulai))))
        .sort()
        .reverse(),
    [activities],
  );

  const filtered = React.useMemo(() => {
    const needle = values.q.trim().toLowerCase();
    return activities.filter((a) => {
      if (values.kategori !== ALL && a.kategori !== values.kategori) return false;
      if (values.tahun !== ALL && tahunAkademik(a.tanggal_mulai) !== values.tahun) return false;
      if (!needle) return true;
      return [a.judul, a.penyelenggara, ...(a.skill_tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activities, values.q, values.kategori, values.tahun]);

  const { rows, safePage, pageCount } = paginate(filtered, Number(values.page) || 1);

  if (activities.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Award}
          title="Belum ada kegiatan SKM"
          description="Catat prestasi, organisasi, sertifikasi, kepanitiaan, atau pelatihan Anda untuk mulai mengumpulkan poin."
          action={
            <Button asChild variant="gradient">
              <Link to="/skm/new">
                <Plus aria-hidden />
                Tambah Kegiatan SKM
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        searchLabel="Cari kegiatan"
        searchPlaceholder="judul / penyelenggara / skill tag…"
        activeCount={activeCount}
        onReset={reset}
        resultCount={filtered.length}
        totalCount={activities.length}
        resultLabel="kegiatan"
      >
        <div className="space-y-1.5">
          <Label htmlFor="f-kategori">Kategori</Label>
          <Select value={values.kategori} onValueChange={(v) => write({ kategori: v })}>
            <SelectTrigger id="f-kategori">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua kategori</SelectItem>
              {SKM_KATEGORI.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.emoji} {k.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-tahun">Tahun akademik</Label>
          <Select value={values.tahun} onValueChange={(v) => write({ tahun: v })}>
            <SelectTrigger id="f-tahun">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua tahun</SelectItem>
              {tahunOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada kegiatan yang cocok"
            description="Coba longgarkan kata kunci atau ubah filter kategori dan tahun akademik."
            action={
              <Button variant="outline" onClick={reset}>
                Reset filter
              </Button>
            }
          />
        ) : (
          <>
            {/* --- Mobile: one card per row. A 6-column table is unusable here. --- */}
            <Stagger className="divide-y-2 divide-foreground lg:hidden" as="ul">
              {rows.map((a) => (
                <StaggerItem key={a.id} as="li" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold leading-snug text-foreground">
                        {a.judul}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{a.penyelenggara}</p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="text-lg font-extrabold leading-none text-primary tnum">
                        {a.poin_skm ?? 0}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">poin</span>
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{a.kategori}</Badge>
                    {a.tingkat && !a.rule_id && (
                      <Badge variant="warning" title="Poin manual — tinjau ulang untuk persona aktif">
                        poin manual
                      </Badge>
                    )}
                    <span className="text-[11.5px] text-muted-foreground">
                      {formatTanggal(a.tanggal_mulai)}
                    </span>
                  </div>

                  {!!a.skill_tags?.length && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.skill_tags.map((t) => (
                        <Badge key={t} variant="primary">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    {a.certificate_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setPreview(a)}
                      >
                        <FileBadge aria-hidden />
                        Bukti
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/skm/${a.id}/edit`}>
                        <Pencil aria-hidden />
                        Ubah
                      </Link>
                    </Button>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            {/* --- Desktop table --- */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kegiatan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Poin</TableHead>
                    <TableHead>Bukti</TableHead>
                    <TableHead>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <Stagger as="tbody">
                  {rows.map((a) => (
                    <MotionTableRow key={a.id} variants={staggerChild}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatTanggal(a.tanggal_mulai)}
                        {a.tanggal_selesai && (
                          <span className="mt-0.5 block text-[11.5px]">
                            s/d {formatTanggal(a.tanggal_selesai)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="max-w-md">
                        <p className="font-semibold text-foreground">{a.judul}</p>
                        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                          {a.penyelenggara}
                        </p>
                        {!!a.skill_tags?.length && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {a.skill_tags.map((t) => (
                              <Badge key={t} variant="primary">
                                #{t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline">{a.kategori}</Badge>
                          {a.tingkat && !a.rule_id && (
                            <Badge
                              variant="warning"
                              title="Poin manual — tinjau ulang untuk persona aktif"
                            >
                              manual
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-bold text-primary tnum">
                        {a.poin_skm ?? 0}
                      </TableCell>

                      <TableCell>
                        {a.certificate_url ? (
                          <Button variant="outline" size="xs" onClick={() => setPreview(a)}>
                            <FileBadge aria-hidden />
                            Lihat
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/skm/${a.id}/edit`}>
                            <Pencil aria-hidden />
                            Ubah
                          </Link>
                        </Button>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </Stagger>
              </Table>
            </div>

            <Pagination
              page={safePage}
              total={filtered.length}
              onPageChange={(p) => write({ page: String(p) })}
              label="kegiatan"
            />
            <span className="sr-only" aria-live="polite">
              Halaman {safePage} dari {pageCount}
            </span>
          </>
        )}
      </Card>

      <CertificatePreview activity={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
