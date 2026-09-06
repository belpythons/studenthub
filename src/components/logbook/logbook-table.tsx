import * as React from "react";
import { Link } from "react-router-dom";
import { useRefresh } from "@/hooks/use-refresh";
import {
  BookOpen,
  Check,
  Clock,
  ListOrdered,
  Pencil,
  Plus,
  SearchX,
  TriangleAlert,
} from "lucide-react";

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
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { useDebounced, useUrlFilters } from "@/hooks/use-url-filters";
import { renumberLogbook } from "@/lib/logbook-actions";
import { formatHariTanggal } from "@/lib/format";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import type { LogbookEntry, Project, Supervisor } from "@/lib/types";
import { Stagger, StaggerItem, staggerChild } from "@/components/motion/motion-primitives";

const ALL = "semua";
const PARAF_ALL = "semua";
const DEFAULTS = { q: "", pembimbing: ALL, paraf: PARAF_ALL, project: ALL, page: "1" } as const;

export function ParafBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge variant="success">
      <Check aria-hidden />
      Verified
    </Badge>
  ) : (
    <Badge variant="warning">
      <Clock aria-hidden />
      Pending
    </Badge>
  );
}

export function LogbookTable({
  entries,
  supervisors,
  projects = [],
}: {
  entries: LogbookEntry[];
  supervisors: Supervisor[];
  projects?: Project[];
}) {
  const projectById = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );
  const refresh = useRefresh();
  const { values, write, reset, activeCount, page, setPage } = useUrlFilters(DEFAULTS);
  const renumber = useConfirm();

  const [searchDraft, setSearchDraft] = React.useState(values.q);
  const debouncedSearch = useDebounced(searchDraft, 300);

  React.useEffect(() => {
    if (debouncedSearch !== values.q) write({ q: debouncedSearch });
  }, [debouncedSearch, values.q, write]);

  React.useEffect(() => setSearchDraft(values.q), [values.q]);

  /* Duplicate running numbers break the printed Formulir 2, so surface them. */
  const duplicateNomor = React.useMemo(() => {
    const seen = new Map<number, number>();
    for (const e of entries) seen.set(e.nomor_urut, (seen.get(e.nomor_urut) ?? 0) + 1);
    return Array.from(seen.entries())
      .filter(([, n]) => n > 1)
      .map(([nomor]) => nomor)
      .sort((a, b) => a - b);
  }, [entries]);

  const filtered = React.useMemo(() => {
    const needle = values.q.trim().toLowerCase();
    return entries.filter((e) => {
      if (values.pembimbing !== ALL && e.supervisor_id !== values.pembimbing) return false;
      if (values.paraf === "sudah" && !e.paraf_status) return false;
      if (values.paraf === "belum" && e.paraf_status) return false;
      if (values.project !== ALL && e.project_id !== values.project) return false;
      if (!needle) return true;
      return [e.aktivitas_pekerjaan, e.hasil_tindak_lanjut, e.pembimbing_nama]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, values.q, values.pembimbing, values.paraf, values.project]);

  const { rows, safePage, pageCount } = paginate(filtered, page);

  /**
   * Rewrites nomor_urut to 1..n following the date order — one atomic RPC
   * (P0-5); an interruption can no longer strand rows on temporary numbers.
   */
  async function applyRenumber() {
    renumber.setLoading(true);

    const result = await renumberLogbook();

    if ("error" in result) {
      notifyError("Gagal merapikan penomoran", { description: describeError(result.error) });
      renumber.close();
      return;
    }

    notifySuccess("Penomoran dirapikan", {
      description: `${entries.length} entri diberi nomor 1–${entries.length} urut tanggal.`,
    });
    renumber.close();
    refresh();
  }

  if (entries.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title="Belum ada entri log book"
          description="Catat aktivitas kerja praktek dan sesi konsultasi Anda untuk mengisi Formulir 2."
          action={
            <Button asChild variant="gradient">
              <Link to="/logbook/new">
                <Plus aria-hidden />
                Tambah Entri
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {duplicateNomor.length > 0 && (
        <Card className="border-warning/40 bg-warning/[0.06] p-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-warning/16 text-warning"
              aria-hidden
            >
              <TriangleAlert className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-foreground">
                Nomor urut ganda: {duplicateNomor.join(", ")}
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Formulir 2 akan mencetak dua baris dengan nomor yang sama.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={renumber.ask}>
              <ListOrdered aria-hidden />
              Rapikan penomoran
            </Button>
          </div>
        </Card>
      )}

      <FilterBar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        searchLabel="Cari entri"
        searchPlaceholder="topik / tindak lanjut / nama pembimbing…"
        activeCount={activeCount}
        onReset={reset}
        resultCount={filtered.length}
        totalCount={entries.length}
        resultLabel="entri"
      >
        <div className="space-y-1.5">
          <Label htmlFor="f-pembimbing">Pembimbing</Label>
          <Select value={values.pembimbing} onValueChange={(v) => write({ pembimbing: v })}>
            <SelectTrigger id="f-pembimbing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua pembimbing</SelectItem>
              {supervisors.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nama}
                  {s.jabatan ? ` — ${s.jabatan}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {projects.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="f-project">Proyek</Label>
            <Select value={values.project} onValueChange={(v) => write({ project: v })}>
              <SelectTrigger id="f-project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua proyek</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.judul}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="f-paraf">Status paraf</Label>
          <Select value={values.paraf} onValueChange={(v) => write({ paraf: v })}>
            <SelectTrigger id="f-paraf">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PARAF_ALL}>Semua status</SelectItem>
              <SelectItem value="sudah">Sudah di-paraf</SelectItem>
              <SelectItem value="belum">Menunggu paraf</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterBar>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada entri yang cocok"
            description="Coba kata kunci lain, atau longgarkan filter pembimbing dan status paraf."
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
              {rows.map((e) => (
                <StaggerItem key={e.id} as="li" className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-muted-foreground">
                        No. <span className="tnum">{e.nomor_urut}</span> ·{" "}
                        {formatHariTanggal(e.tanggal)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-foreground">
                        {e.aktivitas_pekerjaan}
                      </p>
                      {e.project_id && projectById.get(e.project_id) && (
                        <Badge variant="outline" className="mt-1.5">
                          {projectById.get(e.project_id)!.judul}
                        </Badge>
                      )}
                    </div>
                    <ParafBadge ok={e.paraf_status} />
                  </div>

                  {e.hasil_tindak_lanjut && (
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                      <span className="font-semibold">Tindak lanjut:</span> {e.hasil_tindak_lanjut}
                    </p>
                  )}

                  <div className="mt-2.5 rounded-md bg-muted/50 px-2.5 py-2">
                    <p className="text-[12px] font-semibold text-foreground">{e.pembimbing_nama}</p>
                    {e.pembimbing_jabatan && (
                      <p className="text-[11.5px] text-muted-foreground">{e.pembimbing_jabatan}</p>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/logbook/${e.id}`}>Detail</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/logbook/${e.id}/edit`}>
                        <Pencil aria-hidden />
                        Ubah Entri
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
                    <TableHead className="w-14 text-center">No</TableHead>
                    <TableHead>Hari / Tanggal</TableHead>
                    <TableHead>Aktivitas / Konsultasi</TableHead>
                    <TableHead>Pembimbing Lapangan</TableHead>
                    <TableHead>Paraf</TableHead>
                    <TableHead>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <Stagger as="tbody">
                  {rows.map((e) => (
                    <MotionTableRow key={e.id} variants={staggerChild}>
                      <TableCell className="text-center text-muted-foreground tnum">
                        {e.nomor_urut}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatHariTanggal(e.tanggal)}
                      </TableCell>

                      <TableCell className="max-w-[28rem]">
                        <p className="whitespace-pre-line leading-relaxed">
                          {e.aktivitas_pekerjaan}
                        </p>
                        {e.project_id && projectById.get(e.project_id) && (
                          <Badge variant="outline" className="mt-1.5">
                            {projectById.get(e.project_id)!.judul}
                          </Badge>
                        )}
                        {e.hasil_tindak_lanjut && (
                          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                            <span className="font-semibold">Tindak lanjut:</span>{" "}
                            {e.hasil_tindak_lanjut}
                          </p>
                        )}
                      </TableCell>

                      <TableCell>
                        <p className="font-semibold text-foreground">{e.pembimbing_nama}</p>
                        {e.pembimbing_jabatan && (
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {e.pembimbing_jabatan}
                          </p>
                        )}
                      </TableCell>

                      <TableCell>
                        <ParafBadge ok={e.paraf_status} />
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button asChild variant="outline" size="xs">
                            <Link to={`/logbook/${e.id}`}>Detail</Link>
                          </Button>
                          <Button asChild variant="outline" size="xs">
                            <Link to={`/logbook/${e.id}/edit`}>
                              <Pencil aria-hidden />
                              Ubah
                            </Link>
                          </Button>
                        </div>
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
              label="entri"
            />
            <span className="sr-only" aria-live="polite">
              Halaman {safePage} dari {pageCount}
            </span>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={renumber.open}
        onOpenChange={renumber.onOpenChange}
        loading={renumber.loading}
        destructive={false}
        title="Rapikan penomoran entri?"
        description={
          <>
            Seluruh <span className="font-semibold text-foreground">{entries.length}</span> entri
            akan diberi nomor <span className="font-semibold text-foreground">1</span> sampai{" "}
            <span className="font-semibold text-foreground">{entries.length}</span> mengikuti urutan
            tanggal.
          </>
        }
        consequences={[
          "Nomor urut yang Anda atur manual akan tertimpa",
          "Isi aktivitas, pembimbing, dan status paraf tidak berubah",
          "Formulir 2 yang sudah dicetak sebelumnya tidak lagi cocok nomornya",
        ]}
        confirmLabel="Rapikan sekarang"
        onConfirm={applyRenumber}
      />
    </div>
  );
}
