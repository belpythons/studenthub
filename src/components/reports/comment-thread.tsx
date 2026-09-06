import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { MessageSquare, Send, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, useConfirm } from "@/components/shared/confirm-dialog";
import { createClient } from "@/lib/supabase/client";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import type { ReportComment } from "@/lib/types";
import { AnimatePresence, motion } from "@/components/motion/motion-primitives";

const MAX_LENGTH = 1000;

export function CommentThread({
  reportId,
  userId,
  comments,
}: {
  reportId: string;
  userId: string;
  comments: ReportComment[];
}) {
  const refresh = useRefresh();
  const confirm = useConfirm();
  const [isi, setIsi] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<ReportComment | null>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    const body = isi.trim();
    if (!body) return;

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("report_comments")
      .insert({ report_id: reportId, user_id: userId, isi: body });

    setBusy(false);

    if (error) {
      notifyError("Komentar gagal dikirim", { description: describeError(error) });
      return;
    }

    setIsi("");
    notifySuccess("Komentar terkirim");
    refresh();
  }

  async function hapus() {
    if (!pendingDelete) return;
    confirm.setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("report_comments").delete().eq("id", pendingDelete.id);

    if (error) {
      notifyError("Gagal menghapus komentar", { description: describeError(error) });
      confirm.close();
      return;
    }

    notifySuccess("Komentar dihapus");
    confirm.close();
    setPendingDelete(null);
    refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
            Komentar &amp; Feedback
            {comments.length > 0 && (
              <span className="text-muted-foreground tnum">({comments.length})</span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">
              Belum ada komentar. Pembimbing atau rekan peserta dapat memberi masukan di sini.
            </p>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {comments.map((c) => {
                  const nama = c.profiles?.nama_lengkap ?? "Pengguna";
                  return (
                    <motion.li
                      key={c.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2.5 rounded-md border border-foreground bg-muted/40 p-3"
                    >
                      <Avatar className="size-7 shrink-0">
                        <AvatarFallback className="text-[11px]">
                          {nama.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <strong className="text-[12.5px] font-semibold text-foreground">
                            {nama}
                          </strong>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">
                          {c.isi}
                        </p>
                      </div>

                      {c.user_id === userId && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setPendingDelete(c);
                            confirm.ask();
                          }}
                          aria-label="Hapus komentar Anda"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}

          <form onSubmit={kirim} className="space-y-2">
            <label htmlFor="komentar-baru" className="sr-only">
              Tulis komentar
            </label>
            <Textarea
              id="komentar-baru"
              rows={3}
              maxLength={MAX_LENGTH}
              placeholder="Tulis komentar atau masukan…"
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11.5px] text-muted-foreground tnum">
                {isi.length}/{MAX_LENGTH}
              </span>
              <Button type="submit" size="sm" loading={busy} disabled={!isi.trim()}>
                {!busy && <Send aria-hidden />}
                {busy ? "Mengirim…" : "Kirim Komentar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(next) => {
          confirm.onOpenChange(next);
          if (!next) setPendingDelete(null);
        }}
        loading={confirm.loading}
        title="Hapus komentar ini?"
        description="Komentar akan dihapus permanen dan tidak lagi muncul pada dokumen rekap."
        confirmLabel="Ya, hapus"
        onConfirm={hapus}
      />
    </>
  );
}
