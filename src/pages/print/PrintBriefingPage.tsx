import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { PrintToolbar } from "@/components/print/print-toolbar";
import NotFound from "@/pages/NotFound";
import { displayName, useSession } from "@/lib/session";
import { useTitle } from "@/lib/use-title";
import supabase from "@/lib/supabase/client";
import { fetchLetterhead } from "@/lib/letterhead";
import { buildBriefing, fetchProjectDetail } from "@/lib/project-query";
import { formatTanggal, formatTimestamp } from "@/lib/format";

/** Lembar cetak menahan render sampai data lengkap: sebuah skeleton yang ikut
    tertangkap oleh "Save as PDF" jauh lebih buruk daripada jeda sesaat. */
function PrintPending() {
  return <p className="p-8 text-center text-sm text-muted-foreground">Menyiapkan dokumen…</p>;
}

/**
 * Briefing Pack SBAR (dok 04 §3.2) — dokumen cetak BARU; Formulir 2
 * TI-SOP-17/FM-01 tidak disentuh. Memakai kelas print.css existing.
 */
export default function PrintBriefingPage() {
  useTitle("Briefing Pack Konsultasi");
  const { user, profile } = useSession();
  const [params] = useSearchParams();
  const projectId = params.get("project");

  const { data, isPending } = useQuery({
    queryKey: ["print-briefing", user?.id, projectId],
    enabled: Boolean(user && projectId),
    queryFn: async () => {
      const [detail, letterhead] = await Promise.all([
        fetchProjectDetail(supabase, user!.id, projectId!),
        fetchLetterhead(supabase, user!.id),
      ]);
      return { detail, letterhead };
    },
  });

  if (!projectId) return <NotFound />;
  if (isPending || !data) return <PrintPending />;
  if (!data.detail) return <NotFound />;

  const { detail, letterhead } = data;
  const { keputusanPerArea, konflikTerbuka, saranMenunggu } = buildBriefing(detail);
  const { project, advisors, entries } = detail;
  const nama = displayName(profile, user?.email);

  return (
    <>
      <PrintToolbar
        title={`Briefing Pack — ${project.judul}`}
        backHref={`/logbook/projects/${project.id}/briefing`}
        hint="Tekan Cetak, lalu pilih tujuan “Save as PDF”. Ukuran A4 portrait."
      />

      <div className="sheet sheet-badak">
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
          <h2>BRIEFING PACK KONSULTASI</h2>
          <p>
            {project.judul} · disusun oleh {nama}
          </p>
        </div>

        {/* ------------------------------ S ------------------------------ */}
        <div className="sect-bar">S — SITUATION (KONDISI PROYEK)</div>
        <table className="ident">
          <tbody>
            <tr>
              <td>Judul Proyek</td>
              <td>:</td>
              <td style={{ fontWeight: 700 }}>{project.judul}</td>
            </tr>
            <tr>
              <td>Jenis / Status</td>
              <td>:</td>
              <td>
                {project.jenis} · {project.status}
              </td>
            </tr>
            <tr>
              <td>Fase Saat Ini</td>
              <td>:</td>
              <td>{project.fase || "-"}</td>
            </tr>
            <tr>
              <td>Target / Deadline</td>
              <td>:</td>
              <td>{project.target_tanggal ? formatTanggal(project.target_tanggal) : "-"}</td>
            </tr>
            <tr>
              <td>Konsultan Terlibat</td>
              <td>:</td>
              <td>
                {advisors.length
                  ? advisors
                      .map((s) => `${s.nama}${s.peran ? ` (${s.peran})` : ""}`)
                      .join(" · ")
                  : "-"}
              </td>
            </tr>
          </tbody>
        </table>
        {project.deskripsi && <p style={{ fontSize: "10.5pt", margin: "6px 0 0" }}>{project.deskripsi}</p>}

        {/* ------------------------------ B ------------------------------ */}
        <div className="sect-bar">B — BACKGROUND (KRONOLOGI &amp; KEPUTUSAN)</div>
        {entries.length > 0 && (
          <table className="ptbl">
            <thead>
              <tr>
                <th style={{ width: "34mm" }}>Tanggal</th>
                <th style={{ width: "40mm" }}>Dengan</th>
                <th>Topik</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{formatTanggal(e.tanggal)}</td>
                  <td>{e.pembimbing_nama}</td>
                  <td>{e.aktivitas_pekerjaan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {keputusanPerArea.length === 0 ? (
          <div className="empty-note">Belum ada keputusan yang diadopsi.</div>
        ) : (
          <table className="ptbl">
            <thead>
              <tr>
                <th style={{ width: "34mm" }}>Area</th>
                <th>Keputusan yang Diadopsi</th>
                <th style={{ width: "52mm" }}>Sumber &amp; Alasan</th>
              </tr>
            </thead>
            <tbody>
              {keputusanPerArea.map(({ area, keputusan }) => (
                <tr key={area}>
                  <td style={{ fontWeight: 700 }}>{area}</td>
                  <td>{keputusan.isi}</td>
                  <td>
                    {keputusan.penyaran_nama}
                    {keputusan.alasan_status ? ` — ${keputusan.alasan_status}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ------------------------------ A ------------------------------ */}
        <div className="sect-bar">A — ASSESSMENT (KONFLIK &amp; SARAN TERBUKA)</div>
        {konflikTerbuka.length === 0 && saranMenunggu.length === 0 ? (
          <div className="empty-note">
            Tidak ada konflik terbuka maupun saran yang menunggu keputusan.
          </div>
        ) : (
          <>
            {konflikTerbuka.length > 0 && (
              <table className="ptbl">
                <thead>
                  <tr>
                    <th style={{ width: "30mm" }}>Area</th>
                    <th>Saran A</th>
                    <th>Saran B (bentrok)</th>
                  </tr>
                </thead>
                <tbody>
                  {konflikTerbuka.map((k) => (
                    <tr key={`${k.a.id}-${k.b.id}`}>
                      <td style={{ fontWeight: 700 }}>{k.a.area}</td>
                      <td>
                        <b>{k.a.penyaran_nama}:</b> {k.a.isi}
                      </td>
                      <td>
                        <b>{k.b.penyaran_nama}:</b> {k.b.isi}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {saranMenunggu.length > 0 && (
              <table className="ptbl">
                <thead>
                  <tr>
                    <th style={{ width: "30mm" }}>Area</th>
                    <th style={{ width: "40mm" }}>Penyaran</th>
                    <th>Saran (belum diputuskan)</th>
                  </tr>
                </thead>
                <tbody>
                  {saranMenunggu.map((a) => (
                    <tr key={a.id}>
                      <td>{a.area}</td>
                      <td>{a.penyaran_nama}</td>
                      <td>{a.isi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ------------------------------ R ------------------------------ */}
        <div className="sect-bar">R — RECOMMENDATION (BAHAN SESI BERIKUTNYA)</div>
        {project.pertanyaan_baru ? (
          <p style={{ fontSize: "10.5pt", whiteSpace: "pre-line", margin: "6px 0 0" }}>
            {project.pertanyaan_baru}
          </p>
        ) : (
          <div className="empty-note">Belum diisi oleh mahasiswa.</div>
        )}

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
