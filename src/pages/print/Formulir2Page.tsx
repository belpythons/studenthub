import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PrintToolbar } from "@/components/print/print-toolbar";
import { displayName, useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLogbook } from "@/lib/logbook-query";
import { ORG } from "@/lib/constants";
import { fetchLetterhead } from "@/lib/letterhead";
import { formatHariTanggal, formatTanggal, todayISO } from "@/lib/format";

/** Lembar cetak menahan render sampai data lengkap: sebuah skeleton yang ikut
    tertangkap oleh "Save as PDF" jauh lebih buruk daripada jeda sesaat. */
function PrintPending() {
  return <p className="p-8 text-center text-sm text-muted-foreground">Menyiapkan dokumen…</p>;
}

export default function Formulir2Page() {
  useTitle("Formulir 2 — Kehadiran & Aktifitas KP");
  const { user, profile } = useSession();
  const [params] = useSearchParams();
  const pembimbing = params.get("pembimbing");

  const { data, isPending } = useQuery({
    queryKey: ["print-formulir2", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [letterhead, all] = await Promise.all([
        fetchLetterhead(supabase, user!.id),
        fetchLogbook(supabase, user!.id),
      ]);
      return { letterhead, all };
    },
  });

  if (isPending || !data) return <PrintPending />;
  const { letterhead, all } = data;
  const entries = pembimbing ? all.filter((e) => e.supervisor_id === pembimbing) : all;

  const nama = displayName(profile, user?.email);
  const lokasi = profile?.lokasi_ttd || letterhead.lokasiTtd;

  // The signature block names one field supervisor. Prefer the profile setting,
  // otherwise fall back to whoever signed off most of the entries.
  let ttdNama = profile?.pembimbing_nama ?? "";
  let ttdJabatan = profile?.pembimbing_jabatan ?? "";

  if (!ttdNama && entries.length) {
    const tally = new Map<string, number>();
    for (const e of entries) tally.set(e.pembimbing_nama, (tally.get(e.pembimbing_nama) ?? 0) + 1);
    const top = Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0][0];
    ttdNama = top;
    ttdJabatan = entries.find((e) => e.pembimbing_nama === top)?.pembimbing_jabatan ?? "";
  }

  return (
    <>
      <PrintToolbar title={`Formulir 2 — ${nama}`} backHref="/logbook"
        hint="Tekan Cetak, lalu pilih tujuan “Save as PDF”. Margin 2,5 cm, A4 portrait."
      />

      <div className="sheet sheet-stitek">
        {/* ------------------------------ Kop surat ------------------------------ */}
        <div className="stitek-kop">
          <div className="stitek-kop-logo">
            <img src={letterhead.logoSrc} alt="Logo kampus" className={letterhead.customLogo ? "logo-adaptif" : undefined} />
          </div>
          <div className="stitek-kop-inst">
            <strong>{letterhead.kampusUpper}</strong>
            <span>{letterhead.prodiUpper}</span>
          </div>
          <div className="stitek-kop-form">
            <strong>{letterhead.formulirTitle}</strong>
            <span>{letterhead.kodeSop}</span>
          </div>
        </div>

        {/* ------------------------------ Identitas ------------------------------ */}
        <table className="stitek-ident">
          <tbody>
            <tr>
              <td>Nama Mahasiswa</td>
              <td>:</td>
              <td>{nama}</td>
            </tr>
            <tr>
              <td>NIM</td>
              <td>:</td>
              <td>{profile?.nim || "-"}</td>
            </tr>
            <tr>
              <td>Tempat Kerja Praktek</td>
              <td>:</td>
              <td>{profile?.tempat_kp || ORG.perusahaanMixed}</td>
            </tr>
          </tbody>
        </table>

        {/* ------------------------------ Tabel log ------------------------------ */}
        <table className="stitek-tbl">
          <thead>
            <tr>
              <th className="c-no">No</th>
              <th className="c-tgl">Hari/Tanggal</th>
              <th>Aktivitas Pekerjaan</th>
              <th className="c-paraf">Nama dan Paraf Pembimbing Lapangan</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="c-no">1</td>
                <td />
                <td />
                <td />
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="c-no">{e.nomor_urut}</td>
                  <td>{formatHariTanggal(e.tanggal)}</td>
                  <td>
                    <p>{e.aktivitas_pekerjaan}</p>
                    {e.hasil_tindak_lanjut && (
                      <p>
                        <i>Tindak lanjut:</i> {e.hasil_tindak_lanjut}
                      </p>
                    )}
                  </td>
                  <td>
                    <p className="paraf-nama">{e.pembimbing_nama}</p>
                    {e.pembimbing_jabatan && <p className="paraf-jabatan">{e.pembimbing_jabatan}</p>}
                    <p className="paraf-status">{e.paraf_status ? "( sudah diparaf )" : "( ......... )"}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ------------------------- Pengesahan & tanda tangan ------------------------- */}
        <div className="stitek-ttd">
          <p>
            {lokasi}, {formatTanggal(todayISO())}
          </p>
          <p>Pembimbing Lapangan</p>
          <p>{ttdJabatan || "<<Diisi dengan Jabatan Pembimbing Lapangan>>"}</p>
          <div className="slot">&lt;&lt;Tanda tangan dan Cap&gt;&gt;</div>
          <p className="nama">({ttdNama || "Nama Pembimbing Lapangan"})</p>
        </div>
      </div>
    </>
  );
}
