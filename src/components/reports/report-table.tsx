import * as React from "react";
import { Link } from "react-router-dom";
import { Camera, FileText, Pencil, Plus, SearchX, TriangleAlert } from "lucide-react";

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
import { useDebounced, useUrlFilters } from "@/hooks/use-url-filters";
import { REPORT_KATEGORI } from "@/lib/constants";
import { formatRentangJam, formatTanggal } from "@/lib/format";
import type { ReportWithAuthor } from "@/lib/types";
import { Stagger, StaggerItem, staggerChild } from "@/components/motion/motion-primitives";

const ALL = "semua";
const DEFAULTS = { q: "", kategori: ALL, peserta: ALL, page: "1" } as const;

function RowMeta({ report }: { report: ReportWithAuthor }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {report.foto_url && (
        <Badge variant="primary">
          <Camera aria-hidden />
          Foto
        </Badge>
      )}
      {report.kendala?.trim() && (
        <Badge variant="warning">
          <TriangleAlert aria-hidden />
          Kendala
        </Badge>
      )}
    </div>
  );
}

export function ReportTable({
  reports,
  currentUserId,
  showPeserta = false,
}: {
  reports: ReportWithAuthor[];
  currentUserId: string;
  /** The shared feed adds a "Peserta" column and a participant filter. */
  showPeserta?: boolean;
}) {
  const { values, write, reset, activeCount, page, setPage } = useUrlFilters(DEFAULTS);

  const [searchDraft, setSearchDraft] = React.useState(values.q);
  const debouncedSearch = useDebounced(searchDraft, 300);

  React.useEffect(() => {
    if (debouncedSearch !== values.q) write({ q: debouncedSearch });
  }, [debouncedSearch, values.q, write]);

  React.useEffect(() => setSearchDraft(values.q), [values.q]);

  const pesertaOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const r of reports) {
      const n = r.profiles?.nama_lengkap;
      if (n) names.add(n);
    }
    return Array.from(names).sort();
  }, [reports]);

  const filtered = React.useMemo(() => {
    const needle = values.q.trim().toLowerCase();
    return reports.filter((r) => {
      if (values.kategori !== ALL && r.kategori !== values.kategori) return false;
      if (values.peserta !== ALL && r.profiles?.nama_lengkap !== values.peserta) return false;
      if (!needle) return true;
      return [r.judul, r.deskripsi, r.output].join(" ").toLowerCase().includes(needle);
    });
  }, [reports, values.q, values.kategori, values.peserta]);

  const { rows, safePage, pageCount } = paginate(filtered, page);

  if (reports.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title={showPeserta ? "Belum ada laporan dari peserta mana pun" : "Belum ada laporan kegiatan"}
          description="Catat kegiatan magang harian Anda agar rekap dan dokumen cetak bisa dibuat."
          action={
            <Button asChild variant="gradient">
              <Link to="/reports/new">
                <Plus aria-hidden />
                Buat Laporan
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
        searchPlaceholder="judul / deskripsi / output…"
        activeCount={activeCount}
        onReset={reset}
        resultCount={filtered.length}
        totalCount={reports.length}
        resultLabel="laporan"
      >
        {showPeserta && (
          <div className="space-y-1.5">
            <Label htmlFor="f-peserta">Peserta</Label>
            <Select value={values.peserta} onValueChange={(v) => write({ peserta: v })}>
              <SelectTrigger id="f-peserta">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua peserta</SelectItem>
                {pesertaOptions.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="f-kategori-lap">Kategori</Label>
          <Select value={values.kategori} onValueChange={(v) => write({ kategori: v })}>
            <SelectTrigger id="f-kategori-lap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua kategori</SelectItem>
              {REPORT_KATEGORI.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
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
            title="Tidak ada laporan yang cocok"
            description="Coba kata kunci lain, atau longgarkan filter kategori dan peserta."
            action={
              <Button variant="outline" onClick={reset}>
                Reset filter
              </Button>
            }
          />
        ) : (
          <>
            {/* --- Mobile cards --- */}
            <Stagger className="divide-y-2 divide-foreground lg:hidden" as="ul">
              {rows.map((r) => (
                <StaggerItem key={r.id} as="li" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/reports/${r.id}`}
                      className="min-w-0 text-[13.5px] font-semibold leading-snug text-foreground hover:text-primary"
                    >
                      {r.judul}
                    </Link>
                    <Badge variant="outline" className="shrink-0">
                      {r.kategori}
                    </Badge>
                  </div>

                  {showPeserta && (
                    <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                      {r.profiles?.nama_lengkap ?? "—"}
                      {r.profiles?.instansi ? ` · ${r.profiles.instansi}` : ""}
                    </p>
                  )}

                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                    {formatTanggal(r.tanggal)} · {formatRentangJam(r.jam_mulai, r.jam_selesai)}
                  </p>

                  {r.deskripsi && (
                    <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                      {r.deskripsi}
                    </p>
                  )}

                  <RowMeta report={r} />

                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/reports/${r.id}`}>Lihat</Link>
                    </Button>
                    {r.user_id === currentUserId && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/reports/${r.id}/edit`}>
                          <Pencil aria-hidden />
                          Ubah
                        </Link>
                      </Button>
                    )}
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
                    {showPeserta && <TableHead>Peserta</TableHead>}
                    <TableHead>Kegiatan</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <Stagger as="tbody">
                  {rows.map((r) => (
                    <MotionTableRow key={r.id} variants={staggerChild}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatTanggal(r.tanggal)}
                      </TableCell>

                      {showPeserta && (
                        <TableCell>
                          <p className="font-semibold text-foreground">
                            {r.profiles?.nama_lengkap ?? "—"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {r.profiles?.instansi}
                          </p>
                        </TableCell>
                      )}

                      <TableCell className="max-w-[26rem]">
                        <Link
                          to={`/reports/${r.id}`}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {r.judul}
                        </Link>
                        {r.deskripsi && (
                          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                            {r.deskripsi}
                          </p>
                        )}
                        <RowMeta report={r} />
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">{r.kategori}</Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatRentangJam(r.jam_mulai, r.jam_selesai)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-right">
                        <Button asChild variant="outline" size="xs">
                          <Link to={`/reports/${r.id}`}>Lihat</Link>
                        </Button>
                        {r.user_id === currentUserId && (
                          <Button asChild variant="outline" size="xs" className="ml-1.5">
                            <Link to={`/reports/${r.id}/edit`}>
                              <Pencil aria-hidden />
                              Ubah
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </Stagger>
              </Table>
            </div>

            <Pagination
              page={safePage}
              total={filtered.length}
              onPageChange={setPage}
              label="laporan"
            />
            <span className="sr-only" aria-live="polite">
              Halaman {safePage} dari {pageCount}
            </span>
          </>
        )}
      </Card>
    </div>
  );
}
