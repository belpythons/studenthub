import { Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PrintToolbar } from "@/components/print/print-toolbar";
import { displayName, useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { ORG } from "@/lib/constants";
import { fetchLetterhead } from "@/lib/letterhead";
import {
  fetchCommentsFor,
  fetchFilteredReports,
  parseFilters,
  periodeLabel,
} from "@/lib/report-query";
import {
  computeStats,
  groupByBulan,
  recapByBulan,
  recapByKategori,
} from "@/lib/report-stats";
import {
  durasiJam,
  formatBulan,
  formatHariTanggal,
  formatRentangJam,
  formatTanggal,
  formatTimestamp,
  pluralJam,
} from "@/lib/format";
import type { ReportComment } from "@/lib/types";

/** Lembar cetak menahan render sampai data lengkap: sebuah skeleton yang ikut
    tertangkap oleh "Save as PDF" jauh lebih buruk daripada jeda sesaat. */
function PrintPending() {
  return <p className="p-8 text-center text-sm text-muted-foreground">Menyiapkan dokumen…</p>;
}

function IdentRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr>
      <td>{label}</td>
      <td>:</td>
      <td style={strong ? { fontWeight: 700, color: "var(--navy)" } : undefined}>{value}</td>
    </tr>
  );
}

export default function RekapMagangPage() {
  useTitle("Laporan Kegiatan Magang");
  const { user, profile } = useSession();
  const [params] = useSearchParams();
  const filters = parseFilters(Object.fromEntries(params));

  const { data, isPending } = useQuery({
    queryKey: ["print-rekap", user?.id, params.toString()],
    enabled: Boolean(user),
    queryFn: async () => {
      const [letterhead, reports] = await Promise.all([
        fetchLetterhead(supabase, user!.id),
        fetchFilteredReports(supabase, user!.id, filters),
      ]);
      const comments = filters.komentar
        ? await fetchCommentsFor(supabase, reports.map((r) => r.id))
        : new Map<string, ReportComment[]>();
      return { letterhead, reports, comments };
    },
  });

  if (isPending || !data) return <PrintPending />;
  const { letterhead, reports, comments } = data;

  const nama = displayName(profile, user?.email);
  const stats = computeStats(reports);
  const perKategori = recapByKategori(reports);
  const perBulan = recapByBulan(reports);
  const grouped = groupByBulan(reports);
  const kendalaList = reports.filter((r) => r.kendala?.trim());
  const urut = new Map(grouped.flatMap(([, list]) => list).map((r, i) => [r.id, i + 1]));
  const nomor = (id: string) => urut.get(id) ?? 0;
  const periode = periodeLabel(filters, reports);

  return (
    <>
      <PrintToolbar title={`Rekap Laporan Magang — ${nama}`} backHref="/reports/export"
        hint="Tekan Cetak, lalu pilih tujuan “Save as PDF”. Ukuran A4 portrait."
      />

      <div className="sheet sheet-badak">
        {/* ------------------------------- Kop ------------------------------- */}
        <div className="badak-kop">
          <img src={letterhead.logoSrc} alt="Logo" className={letterhead.customLogo ? "logo-adaptif" : undefined} />
          <div>
            <h1>{letterhead.kopBaris[0]}</h1>
            {letterhead.kopBaris.slice(1).map((baris) => (
              <p key={baris}>{baris}</p>
            ))}
          </div>
        </div>

        <div className="badak-title">
          <h2>{letterhead.judulDokumen}</h2>
          <p>
            {nama} · Periode {periode}
          </p>
        </div>

        {/* ---------------------------- I. Identitas ---------------------------- */}
        <div className="sect-bar">I. IDENTITAS &amp; PERIODE</div>
        <table className="ident">
          <tbody>
            <IdentRow label="Nama Peserta" value={nama} strong />
            <IdentRow label="Instansi / Sekolah" value={profile?.instansi || ORG.kampus} />
            <IdentRow label="Email" value={profile?.email || user?.email || "-"} />
            <IdentRow label="Tempat Kerja Praktek" value={profile?.tempat_kp || ORG.perusahaanMixed} />
            <IdentRow label="Periode Kegiatan" value={periode} />
            <IdentRow
              label="Filter Tanggal"
              value={filters.dari || filters.sampai ? periode : "Seluruh periode"}
            />
            <IdentRow label="Filter Kategori" value={filters.kategori || "Semua kategori"} />
          </tbody>
        </table>

        {/* ---------------------------- II. Ringkasan ---------------------------- */}
        <div className="sect-bar">II. RINGKASAN KEGIATAN</div>
        <div className="kpi-grid">
          <div className="kpi-box">
            <b>{stats.totalLaporan}</b>
            <span>Laporan Kegiatan</span>
          </div>
          <div className="kpi-box">
            <b>{stats.hariAktif}</b>
            <span>Hari Aktif</span>
          </div>
          <div className="kpi-box">
            <b>{stats.totalJam.toFixed(1)}</b>
            <span>Total Jam Kegiatan</span>
          </div>
          <div className="kpi-box">
            <b>{stats.jenisKategori}</b>
            <span>Jenis Kategori</span>
          </div>
        </div>
        <table className="ident">
          <tbody>
            <IdentRow
              label="Total durasi tercatat"
              value={stats.totalJam ? pluralJam(stats.totalJam) : "-"}
            />
            <IdentRow
              label="Rata-rata per hari aktif"
              value={stats.rataPerHari ? `${pluralJam(stats.rataPerHari)} / hari` : "-"}
            />
            <IdentRow label="Kategori terbanyak" value={stats.kategoriTerbanyak ?? "-"} />
            <IdentRow label="Kegiatan berkendala" value={`${stats.kegiatanBerkendala} kegiatan`} />
            <IdentRow label="Kegiatan berfoto" value={`${stats.kegiatanBerfoto} kegiatan`} />
          </tbody>
        </table>

        {/* -------------------------- III. Per kategori -------------------------- */}
        {perKategori.length > 0 && (
          <>
            <div className="sect-bar">III. REKAP PER KATEGORI</div>
            <table className="ptbl">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th className="num">Jumlah</th>
                  <th className="num">Durasi</th>
                  <th className="num">Porsi</th>
                </tr>
              </thead>
              <tbody>
                {perKategori.map((k) => (
                  <tr key={k.kategori}>
                    <td>{k.kategori}</td>
                    <td className="num">{k.jumlah}</td>
                    <td className="num">{k.jam ? pluralJam(k.jam) : "-"}</td>
                    <td className="num">{k.porsi.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ---------------------------- IV. Per bulan ---------------------------- */}
        {perBulan.length > 0 && (
          <>
            <div className="sect-bar">IV. REKAP PER BULAN</div>
            <table className="ptbl">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th className="num">Jumlah Kegiatan</th>
                  <th className="num">Total Durasi</th>
                </tr>
              </thead>
              <tbody>
                {perBulan.map((b) => (
                  <tr key={b.bulan}>
                    <td>{formatBulan(b.bulan)}</td>
                    <td className="num">{b.jumlah}</td>
                    <td className="num">{b.jam ? pluralJam(b.jam) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ------------------------- V. Daftar kegiatan ------------------------- */}
        <div className="sect-bar">V. DAFTAR KEGIATAN</div>
        {reports.length === 0 ? (
          <div className="empty-note">Belum ada laporan kegiatan pada rentang yang dipilih.</div>
        ) : (
          <table className="ptbl keg-tbl">
            <thead>
              <tr>
                <th className="c-no">No</th>
                <th className="c-tgl">Hari/Tanggal</th>
                <th>Aktivitas Pekerjaan</th>
                <th className="c-kat">Kategori &amp; Durasi</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([bulan, list]) => (
                <Fragment key={bulan}>
                  <tr className="bulan-row">
                    <td colSpan={4}>
                      {formatBulan(bulan)} · {list.length} kegiatan
                    </td>
                  </tr>
                  {list.map((r) => {
                    const komentar = comments.get(r.id) ?? [];
                    const jam = durasiJam(r.jam_mulai, r.jam_selesai);
                    return (
                      <tr key={r.id}>
                        <td className="c-no">{nomor(r.id)}</td>
                        <td>
                          <p>{formatHariTanggal(r.tanggal)}</p>
                          <p className="lbl">{formatRentangJam(r.jam_mulai, r.jam_selesai)}</p>
                        </td>
                        <td>
                          <p>
                            <b>{r.judul}</b>
                          </p>
                          {r.deskripsi?.trim() && (
                            <p>
                              <span className="lbl">Deskripsi: </span>
                              {r.deskripsi}
                            </p>
                          )}
                          {r.output?.trim() && (
                            <p>
                              <span className="lbl">Output: </span>
                              {r.output}
                            </p>
                          )}
                          {r.kendala?.trim() && (
                            <p>
                              <span className="lbl">Kendala: </span>
                              {r.kendala}
                            </p>
                          )}
                          {filters.foto && r.foto_url && (
                            <img className="keg-foto" src={r.foto_url} alt={r.judul} />
                          )}
                          {filters.komentar && komentar.length > 0 && (
                            <div className="keg-komentar">
                              {komentar.map((c) => (
                                <p key={c.id}>
                                  <b>{c.profiles?.nama_lengkap ?? "Pembimbing"}:</b> {c.isi}
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <p>{r.kategori}</p>
                          {jam > 0 && <p className="lbl">{pluralJam(jam)}</p>}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* --------------------------- VI. Catatan kendala --------------------------- */}
        {kendalaList.length > 0 && (
          <>
            <div className="sect-bar">VI. CATATAN KENDALA</div>
            <table className="ptbl">
              <thead>
                <tr>
                  <th style={{ width: "32mm" }}>Tanggal</th>
                  <th>Kegiatan</th>
                  <th>Kendala</th>
                </tr>
              </thead>
              <tbody>
                {kendalaList.map((r) => (
                  <tr key={r.id}>
                    <td>{formatTanggal(r.tanggal)}</td>
                    <td>{r.judul}</td>
                    <td style={{ whiteSpace: "pre-line" }}>{r.kendala}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ----------------------------- Pengesahan ----------------------------- */}
        <div className="sect-bar">{kendalaList.length > 0 ? "VII" : "VI"}. PENGESAHAN</div>
        <div className="ttd">
          <div>
            <p style={{ margin: 0 }}>Peserta Magang,</p>
            <div className="ttd-slot" />
            <div className="ttd-line">
              <b>{nama}</b>
              <span>{profile?.instansi || ORG.kampus}</span>
            </div>
          </div>
          <div>
            <p style={{ margin: 0 }}>Mengetahui, Pembimbing Lapangan</p>
            <div className="ttd-slot" />
            <div className="ttd-line">
              <b>{profile?.pembimbing_nama || " "}</b>
              <span>{profile?.pembimbing_jabatan || profile?.tempat_kp || ORG.perusahaanMixed}</span>
            </div>
          </div>
        </div>

        <div className="print-foot">
          <span>{letterhead.footerText}</span>
          <span>
            {formatTimestamp(new Date())} · oleh {nama}
          </span>
        </div>
      </div>
    </>
  );
}
