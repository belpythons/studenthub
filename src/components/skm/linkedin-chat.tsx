import * as React from "react";
import { MessageCircleQuestion, SendHorizonal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { chatLinkedIn } from "@/lib/linkedin-client";
import { describeError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@shared/linkedin-ai";

/**
 * Mode Panduan (blueprint Bab 8): tanya jawab mekanik LinkedIn — field apa yang
 * harus diisi, di mana menunya, berapa batas karakternya. Jawabannya di-ground
 * ke knowledge base, bukan ke ingatan model, karena sebagian fitur yang diingat
 * model sudah dihapus LinkedIn (Skill Assessments, Creator Mode).
 *
 * Riwayat percakapan sengaja hanya hidup di state komponen. Yang layak jadi
 * arsip adalah draft, dan itu sudah disimpan di linkedin_drafts.
 */

const SARAN = [
  "Sertifikat saya isinya di mana, dan apa saja yang harus diisi?",
  "Entri yang sedang saya buka ini sebaiknya masuk section apa?",
  "Berapa batas karakter Headline dan About?",
  "Apakah saya perlu mengaktifkan Creator Mode?",
];

interface Turn extends ChatMessage {
  sumber?: string[];
}

export function LinkedInChat({ activityId }: { activityId?: string }) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, loading]);

  async function send(text: string) {
    const pertanyaan = text.trim();
    if (!pertanyaan || loading) return;

    const next: Turn[] = [...turns, { role: "user", text: pertanyaan }];
    setTurns(next);
    setDraft("");
    setError(null);
    setLoading(true);
    try {
      const res = await chatLinkedIn({
        messages: next.map(({ role, text: t }) => ({ role, text: t })),
        activity_id: activityId,
      });
      setTurns([...next, { role: "model", text: res.reply, sumber: res.sumber_chunk }]);
    } catch (err) {
      setError(describeError(err));
      // Pertanyaannya dikembalikan ke kotak input supaya tidak perlu diketik ulang.
      setTurns(turns);
      setDraft(pertanyaan);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircleQuestion className="size-4 text-muted-foreground" aria-hidden />
          Tanya Cara Kerja LinkedIn
        </CardTitle>
        <CardDescription>
          Jawaban diambil dari panduan terkurasi, bukan dari ingatan model — supaya
          fitur yang sudah dihapus LinkedIn tidak ikut disarankan.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              Coba tanyakan
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SARAN.map((s) => (
                <Button key={s} type="button" variant="outline" size="xs" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="max-h-[28rem] space-y-3 overflow-y-auto scrollbar-thin pr-1"
            role="log"
            aria-live="polite"
          >
            {turns.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-[13px] leading-relaxed",
                  t.role === "user"
                    ? "ml-6 border-primary/40 bg-primary/[0.07]"
                    : "mr-6 border-border bg-muted/40",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{t.text}</p>
                {t.sumber && t.sumber.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {[...new Set(t.sumber)].map((s) => (
                      <Badge key={s} variant="outline" className="text-[10.5px]">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <p className="mr-6 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-[13px] text-muted-foreground">
                Mencari di panduan…
              </p>
            )}
            <div ref={endRef} />
          </div>
        )}

        {error && (
          <p className="rounded-md border border-foreground bg-muted/50 px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
            {error}
          </p>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Pertanyaan tentang LinkedIn"
            rows={2}
            placeholder="Misalnya: prestasi lomba saya sebaiknya ditaruh di section mana?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
          />
          <Button
            type="button"
            variant="gradient"
            loading={loading}
            disabled={!draft.trim()}
            onClick={() => void send(draft)}
          >
            {!loading && <SendHorizonal aria-hidden />}
            Kirim
          </Button>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          Enter untuk kirim, Shift+Enter untuk baris baru. Semua jawaban masih draft —
          periksa sendiri sebelum dipakai.
        </p>
      </CardContent>
    </Card>
  );
}
