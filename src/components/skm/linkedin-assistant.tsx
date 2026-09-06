import * as React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  Check,
  ClipboardCopy,
  FileCode2,
  Info,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { generateDraft } from "@/lib/linkedin-client";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import {
  LINKEDIN_SECTIONS,
  defaultSectionFor,
  formatForLinkedIn,
  portfolioMarkdown,
  type LinkedInSection,
} from "@/lib/linkedin-format";
import { formatBulanSingkat } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SkmActivity } from "@/lib/types";
import { FadeIn } from "@/components/motion/motion-primitives";
import { LinkedInChat } from "@/components/skm/linkedin-chat";
import { DESTINATION_LABEL, routeActivity } from "@shared/linkedin-router";
import { summarize, validateDraft } from "@shared/linkedin-validate";

/** Copies text, falling back for non-secure contexts (e.g. plain-HTTP LAN). */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (!ok) throw new Error("Peramban menolak akses papan klip.");
  }
}

function CopyButton({
  text,
  label,
  variant = "gradient",
}: {
  text: string;
  label: string;
  variant?: "gradient" | "outline";
}) {
  const [done, setDone] = React.useState(false);

  async function copy() {
    try {
      await copyText(text);
      setDone(true);
      notifySuccess("Teks tersalin", { description: "Tempel langsung ke LinkedIn." });
      setTimeout(() => setDone(false), 1800);
    } catch (err) {
      notifyError("Gagal menyalin", {
        description:
          err instanceof Error
            ? `${err.message} Pilih teksnya lalu tekan Ctrl+C.`
            : "Pilih teksnya lalu tekan Ctrl+C.",
      });
    }
  }

  return (
    <Button type="button" variant={done ? "success" : variant} onClick={copy}>
      {done ? <Check aria-hidden /> : <ClipboardCopy aria-hidden />}
      {done ? "Tersalin!" : label}
    </Button>
  );
}

/**
 * Keputusan penempatan datang dari rule engine deterministik, bukan dari model:
 * bisa diaudit, konsisten, dan tetap jalan tanpa GEMINI_API_KEY. Alasannya
 * ditampilkan SEBELUM naskah — kebijakan dialog blueprint §8.3 butir 3.
 */
function PlacementPanel({ activity }: { activity: SkmActivity }) {
  const [open, setOpen] = React.useState(false);
  const routed = React.useMemo(() => routeActivity(activity), [activity]);

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
          Sebaiknya masuk
        </span>
        {routed.targets.map((t) => (
          <Badge key={t} variant={t === "skip" ? "outline" : "default"}>
            {DESTINATION_LABEL[t]}
          </Badge>
        ))}
        {routed.profile_updates.map((u) => (
          <Badge key={u} variant="outline">
            perbarui {u === "education_description" ? "Education" : u}
          </Badge>
        ))}
        <Button
          type="button"
          variant="outline"
          size="xs"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Info aria-hidden />
          {open ? "Tutup alasan" : "Kenapa?"}
        </Button>
      </div>

      {open && (
        <div className="space-y-1.5 border-t border-border pt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          <ul className="list-disc space-y-1 pl-4">
            {routed.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="text-[11.5px]">
            Aturan yang menyala: {routed.rules_fired.join(", ") || "tidak ada"}
          </p>
          {routed.notify_warning && (
            <p className="flex items-start gap-1.5 text-[12px] text-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Menambah entri Experience memicu notifikasi ke seluruh jaringan. Matikan
              dulu Settings &gt; Visibility &gt; Share job changes sebelum menyimpan;
              mematikannya setelah tersimpan tidak menarik kembali notifikasi yang
              sudah terkirim.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Enam pemeriksaan Bab 7.6 — deterministik, jalan juga atas teks hasil edit. */
function ValidationPanel({
  text,
  seksi,
  activity,
}: {
  text: string;
  seksi: LinkedInSection;
  activity: SkmActivity;
}) {
  const violations = React.useMemo(
    () => validateDraft(text, { seksi, activity }),
    [text, seksi, activity],
  );

  if (violations.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        <Check className="mr-1 inline size-3.5" aria-hidden />
        Lolos semua pemeriksaan: batas karakter, frasa terlarang, integritas angka,
        kekhasan, keyword, dan batas hashtag/mention.
      </p>
    );
  }

  const { errors, warnings } = summarize(violations);
  return (
    <div className="space-y-1.5 rounded-md border border-foreground bg-muted/50 p-3">
      <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
        Periksa dulu — {errors} harus diperbaiki, {warnings} perlu dicek
      </p>
      <ul className="space-y-1 text-[12.5px] leading-relaxed">
        {violations.map((v, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <AlertTriangle
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                v.severity === "error" ? "text-destructive" : "text-muted-foreground",
              )}
              aria-hidden
            />
            <span
              className={v.severity === "error" ? "text-foreground" : "text-muted-foreground"}
            >
              {v.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type AiState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; draft: string; id: string | null; cached: boolean }
  | { phase: "error"; message: string };

interface DraftRow {
  id: string;
  draft: string;
  model: string;
  created_at: string;
}

export function LinkedInAssistant({
  activities,
  nama,
  instansi = null,
  aiConfigured = false,
}: {
  activities: SkmActivity[];
  nama: string;
  instansi?: string | null;
  aiConfigured?: boolean;
}) {
  const [selectedId, setSelectedId] = React.useState(activities[0]?.id ?? "");
  const selected = activities.find((a) => a.id === selectedId) ?? null;

  const [section, setSection] = React.useState<LinkedInSection>(
    activities[0]
      ? defaultSectionFor(activities[0].kategori, activities[0].jam_sosial)
      : "experience",
  );

  const [bahasa, setBahasa] = React.useState<"id" | "en">("id");
  const [ai, setAi] = React.useState<AiState>({ phase: "idle" });
  const [history, setHistory] = React.useState<DraftRow[]>([]);

  // Ganti entri/seksi → hasil AI lama tidak relevan lagi; muat riwayatnya.
  React.useEffect(() => {
    setAi({ phase: "idle" });
    if (!aiConfigured || !selectedId) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    createClient()
      .from("linkedin_drafts")
      .select("id, draft, model, created_at")
      .eq("activity_id", selectedId)
      .eq("seksi", section)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!cancelled) setHistory((data ?? []) as DraftRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [aiConfigured, selectedId, section]);

  async function generate(force: boolean) {
    if (!selected) return;
    setAi({ phase: "loading" });
    try {
      const data = await generateDraft({
        activity_id: selected.id,
        seksi: section,
        bahasa,
        force,
      });
      setAi({ phase: "success", draft: data.draft, id: data.id, cached: data.cached });
      if (!data.cached && data.id) {
        setHistory((h) => [
          { id: data.id!, draft: data.draft, model: "", created_at: new Date().toISOString() },
          ...h,
        ]);
      }
    } catch (err) {
      setAi({ phase: "error", message: describeError(err) });
    }
  }

  async function saveEdit() {
    if (ai.phase !== "success" || !ai.id) return;
    const { error } = await createClient()
      .from("linkedin_drafts")
      .update({ draft: ai.draft })
      .eq("id", ai.id);
    if (error) {
      notifyError("Gagal menyimpan revisi", { description: describeError(error) });
      return;
    }
    setHistory((h) => h.map((d) => (d.id === ai.id ? { ...d, draft: ai.draft } : d)));
    notifySuccess("Revisi draft tersimpan");
  }

  const output = React.useMemo(
    () => (selected ? formatForLinkedIn(selected, section, instansi ?? undefined) : ""),
    [selected, section, instansi],
  );

  const markdown = React.useMemo(() => portfolioMarkdown(activities, nama), [activities, nama]);

  function pick(a: SkmActivity) {
    setSelectedId(a.id);
    setSection(defaultSectionFor(a.kategori, a.jam_sosial));
  }

  if (activities.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Award}
          title="Belum ada kegiatan SKM untuk diubah menjadi teks"
          description="Tambahkan minimal satu kegiatan — prestasi, organisasi, atau sertifikasi — lalu kembali ke sini."
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
    <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* ---- Entry picker. A horizontal rail on mobile, a list on desktop. ---- */}
      <Card className="overflow-hidden">
        <div className="border-b border-foreground px-4 py-3">
          <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
            Pilih entri SKM
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-thin p-3 lg:max-h-[32rem] lg:flex-col lg:gap-0 lg:overflow-y-auto lg:p-0">
          {activities.map((a) => {
            const active = a.id === selectedId;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => pick(a)}
                aria-pressed={active}
                className={cn(
                  "flex min-w-56 shrink-0 flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors",
                  "lg:w-full lg:min-w-0 lg:rounded-none lg:border-0 lg:border-b lg:border-l-[3px] lg:border-b-border",
                  active
                    ? "border-primary bg-primary/[0.07] lg:border-l-primary"
                    : "border-border hover:bg-accent/50 lg:border-l-transparent",
                )}
              >
                <span className="text-[13px] font-semibold leading-snug text-foreground">
                  {a.judul}
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  {a.penyelenggara} · {formatBulanSingkat(a.tanggal_mulai)}
                </span>
                <Badge variant="outline" className="mt-0.5">
                  {a.kategori}
                </Badge>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="space-y-4">
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>Teks Siap-Paste</CardTitle>
              <CardDescription>
                Bagian sudah dipilih otomatis sesuai kategori entri, dan tetap bisa Anda ganti.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="section">Target section LinkedIn</Label>
                <Select value={section} onValueChange={(v) => setSection(v as LinkedInSection)}>
                  <SelectTrigger id="section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINKEDIN_SECTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[12px] text-muted-foreground">
                  {LINKEDIN_SECTIONS.find((s) => s.value === section)?.hint}
                </p>
              </div>

              {selected && <PlacementPanel activity={selected} />}

              <pre className="max-h-[26rem] overflow-auto scrollbar-thin whitespace-pre-wrap break-words rounded-md bg-[#0d1c33] p-4 font-mono text-[12.5px] leading-relaxed text-[#e4ecf7]">
                {output}
              </pre>

              <CopyButton text={output} label="Copy to Clipboard" />
            </CardContent>
          </Card>
        </FadeIn>

        {aiConfigured && (
          <FadeIn delay={0.03}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-4 text-muted-foreground" aria-hidden />
                  Tulis Ulang dengan AI
                </CardTitle>
                <CardDescription>
                  Draft di-ground pada panduan branding LinkedIn terkurasi (RAG). Hasil
                  tetap bisa diedit sebelum dipakai.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ai-bahasa">Bahasa draft</Label>
                    <Select value={bahasa} onValueChange={(v) => setBahasa(v as "id" | "en")}>
                      <SelectTrigger id="ai-bahasa" className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="gradient"
                    loading={ai.phase === "loading"}
                    onClick={() => generate(false)}
                  >
                    {ai.phase !== "loading" && <Sparkles aria-hidden />}
                    {ai.phase === "loading" ? "Menulis…" : "✨ Tulis ulang dengan AI"}
                  </Button>

                  {ai.phase === "success" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => generate(true)}
                    >
                      <RefreshCw aria-hidden />
                      Generate ulang
                    </Button>
                  )}
                </div>

                {ai.phase === "error" && (
                  <p className="rounded-md border border-foreground bg-muted/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {ai.message} — teks template di atas tetap bisa dipakai sebagai
                    fallback.
                  </p>
                )}

                {ai.phase === "success" && (
                  <>
                    {ai.cached && (
                      <Badge variant="outline">dari cache — input belum berubah</Badge>
                    )}
                    <Textarea
                      aria-label="Draft AI (dapat diedit)"
                      rows={10}
                      className="font-mono text-[12.5px] leading-relaxed"
                      value={ai.draft}
                      onChange={(e) =>
                        setAi({ ...ai, draft: e.target.value })
                      }
                    />
                    {selected && (
                      <ValidationPanel text={ai.draft} seksi={section} activity={selected} />
                    )}
                    <div className="flex flex-wrap gap-2">
                      <CopyButton text={ai.draft} label="Copy Draft AI" />
                      {ai.id && (
                        <Button type="button" variant="outline" onClick={saveEdit}>
                          Simpan revisi
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {history.length > 0 && (
                  <div className="space-y-1.5 border-t border-foreground pt-3">
                    <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                      Riwayat draft ({history.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {history.map((d, i) => (
                        <Button
                          key={d.id}
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            setAi({ phase: "success", draft: d.draft, id: d.id, cached: false })
                          }
                        >
                          {i === 0 ? "Terbaru" : new Date(d.created_at).toLocaleString("id-ID")}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {aiConfigured && (
          <FadeIn delay={0.05}>
            <LinkedInChat activityId={selected?.id} />
          </FadeIn>
        )}

        <FadeIn delay={0.06}>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode2 className="size-4 text-muted-foreground" aria-hidden />
                    Markdown Export
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Seluruh portofolio dalam format Markdown, siap untuk README GitHub personal.
                  </CardDescription>
                </div>
                <CopyButton text={markdown} label="Copy Markdown" variant="outline" />
              </div>
            </CardHeader>

            <CardContent>
              <pre className="max-h-64 overflow-auto scrollbar-thin whitespace-pre-wrap break-words rounded-md bg-[#0d1c33] p-4 font-mono text-[12.5px] leading-relaxed text-[#e4ecf7]">
                {markdown}
              </pre>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
