import * as React from "react";
import {
  CalendarRange,
  FileSpreadsheet,
  FileText,
  Info,
  Printer,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { REPORT_KATEGORI } from "@/lib/constants";
import { formatTanggal, todayISO } from "@/lib/format";
import { notifyWarning } from "@/lib/notify";
import { useExport } from "@/hooks/use-export";
import { PrintPreviewDialog } from "@/components/print/print-preview-dialog";
import { Collapsible } from "@/components/motion/motion-primitives";

const ALL = "semua";

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const ISI_REKAP = [
  ["Identitas & periode", "nama, instansi, rentang tanggal kegiatan."],
  ["Ringkasan", "total laporan, hari aktif, total jam, rata-rata per hari, kategori terbanyak."],
  ["Rekap per kategori", "jumlah kegiatan, durasi, dan porsinya."],
  ["Rekap per bulan", "sebaran kegiatan sepanjang periode magang."],
  ["Daftar kegiatan lengkap", "dikelompokkan per bulan, berisi tanggal, jam, deskripsi, output, kendala, foto, dan komentar."],
  ["Catatan kendala", "kumpulan kendala yang pernah dicatat."],
  ["Lembar pengesahan", "kolom tanda tangan peserta dan pembimbing."],
] as const;

export function ExportPanel({
  /** Range of the user's existing data, used to sanity-check the chosen dates. */
  earliest,
  latest,
  totalReports,
}: {
  earliest: string | null;
  latest: string | null;
  totalReports: number;
}) {
  const { run: runExport, busy: exporting } = useExport();
  const [dari, setDari] = React.useState("");
  const [sampai, setSampai] = React.useState("");
  const [kategori, setKategori] = React.useState(ALL);
  const [foto, setFoto] = React.useState(true);
  const [komentar, setKomentar] = React.useState(true);

  const rangeInverted = Boolean(dari && sampai && sampai < dari);

  /*
    The previous panel happily produced an empty PDF when the range missed all
    the data, with no explanation. These checks name the problem up front.
  */
  const rangeMissesData =
    !rangeInverted &&
    Boolean(earliest && latest) &&
    ((Boolean(sampai) && sampai < earliest!) || (Boolean(dari) && dari > latest!));

  const blocked = rangeInverted || totalReports === 0;

  function query() {
    return new URLSearchParams({
      dari,
      sampai,
      kategori: kategori === ALL ? "" : kategori,
      foto: foto ? "1" : "0",
      komentar: komentar ? "1" : "0",
    }).toString();
  }

  function guard(e: React.MouseEvent) {
    if (!blocked) return;
    e.preventDefault();
    notifyWarning(
      rangeInverted ? "Rentang tanggal terbalik" : "Belum ada laporan untuk diekspor",
      {
        description: rangeInverted
          ? "Tanggal “sampai” lebih awal daripada “dari”. Perbaiki dulu rentangnya."
          : "Buat minimal satu laporan kegiatan terlebih dahulu.",
      },
    );
  }

  function preset(from: string, to: string) {
    setDari(from);
    setSampai(to);
  }

  const activeFilters = [
    dari || sampai ? "rentang tanggal" : null,
    kategori !== ALL ? "kategori" : null,
    !foto ? "tanpa foto" : null,
    !komentar ? "tanpa komentar" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Pilih Isi Dokumen</CardTitle>
          <CardDescription>
            Rangkum laporan kegiatan magang Anda menjadi satu dokumen: ringkasan statistik, rekap per
            kategori dan per bulan, lalu daftar lengkap setiap kegiatan.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Dari Tanggal" htmlFor="dari" optional="opsional">
              <Input
                id="dari"
                type="date"
                max={todayISO()}
                value={dari}
                onChange={(e) => setDari(e.target.value)}
              />
            </Field>

            <Field
              label="Sampai Tanggal"
              htmlFor="sampai"
              optional="opsional"
              error={rangeInverted ? "Harus sama atau setelah tanggal “dari”." : null}
            >
              <Input
                id="sampai"
                type="date"
                min={dari || undefined}
                max={todayISO()}
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                aria-invalid={rangeInverted || undefined}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">
              Kosongkan keduanya untuk seluruh periode.
            </span>
            <Button variant="outline" size="xs" onClick={() => preset(firstOfMonth(), todayISO())}>
              Bulan ini
            </Button>
            <Button variant="outline" size="xs" onClick={() => preset(monthsAgo(3), todayISO())}>
              3 bulan terakhir
            </Button>
            <Button variant="ghost" size="xs" onClick={() => preset("", "")}>
              Reset
            </Button>
          </div>

          <Collapsible open={rangeMissesData}>
            <p className="flex items-start gap-2 rounded-md border border-foreground bg-warning/[0.07] px-3 py-2.5 text-[12px] leading-relaxed">
              <TriangleAlert className="mt-px size-4 shrink-0 text-warning" aria-hidden />
              <span>
                Rentang ini berada di luar data Anda ({formatTanggal(earliest)} –{" "}
                {formatTanggal(latest)}). Dokumen akan terbit kosong.
              </span>
            </p>
          </Collapsible>

          <Field label="Kategori" htmlFor="kat-export">
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger id="kat-export">
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
          </Field>

          <fieldset className="space-y-2.5">
            <legend className="text-[12.5px] font-semibold text-foreground">Isi Dokumen</legend>

            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                checked={foto}
                onCheckedChange={(v) => setFoto(v === true)}
                className="mt-0.5"
              />
              <span className="text-[13px]">
                Sertakan foto kegiatan
                <span className="ml-1 text-muted-foreground">(hanya versi cetak/PDF)</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                checked={komentar}
                onCheckedChange={(v) => setKomentar(v === true)}
                className="mt-0.5"
              />
              <span className="text-[13px]">Sertakan komentar &amp; feedback pembimbing</span>
            </label>
          </fieldset>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-foreground pt-3">
              <span className="text-[11.5px] text-muted-foreground">Aktif:</span>
              {activeFilters.map((f) => (
                <Badge key={f} variant="primary">
                  {f}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-foreground pt-4 sm:flex-row sm:flex-wrap">
            <PrintPreviewDialog
              href={`/print/rekap-magang?${query()}`}
              title="Rekap Laporan Magang"
              description="Pratinjau A4. Tarik sudut kanan-bawah untuk mengubah ukuran."
              exportParams={new URLSearchParams(query())}
            >
              <Button variant="gradient" onClick={guard} disabled={blocked}>
                <Printer aria-hidden />
                Buka Rekap · Cetak / PDF
              </Button>
            </PrintPreviewDialog>

            <Button
              variant="success"
              disabled={blocked}
              loading={exporting === "xlsx"}
              onClick={() => runExport("xlsx", new URLSearchParams(query()))}
            >
              {exporting !== "xlsx" && <FileSpreadsheet aria-hidden />}
              Unduh Excel
            </Button>

            <Button
              variant="outline"
              disabled={blocked}
              loading={exporting === "csv"}
              onClick={() => runExport("csv", new URLSearchParams(query()))}
            >
              {exporting !== "csv" && <FileText aria-hidden />}
              Unduh CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="size-4 text-muted-foreground" aria-hidden />
              Data Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Total laporan</dt>
                <dd className="font-semibold tnum">{totalReports}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Kegiatan pertama</dt>
                <dd className="font-semibold">{formatTanggal(earliest)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Kegiatan terakhir</dt>
                <dd className="font-semibold">{formatTanggal(latest)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Isi Rekap</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-muted-foreground">
              {ISI_REKAP.map(([title, detail]) => (
                <li key={title}>
                  <span className="font-semibold text-foreground">{title}</span> — {detail}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[11.5px] text-muted-foreground">
              Bagian rekap per kategori, per bulan, dan catatan kendala otomatis disembunyikan bila
              tidak ada datanya.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-4 text-muted-foreground" aria-hidden />
              Cara menyimpan sebagai PDF
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Klik <strong className="text-foreground">Buka Rekap</strong>, lalu pada halaman yang
              terbuka tekan <strong className="text-foreground">Cetak / Simpan PDF</strong>. Di
              dialog cetak peramban, pilih tujuan “Save as PDF”. Ukuran kertas sudah dikunci A4
              portrait.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
