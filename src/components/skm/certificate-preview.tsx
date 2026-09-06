import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SkmActivity } from "@/lib/types";

/**
 * Certificate viewer. Radix Dialog replaces the previous hand-rolled overlay,
 * which had no Escape key, no focus trap and no scroll lock.
 */
export function CertificatePreview({
  activity,
  onClose,
}: {
  activity: SkmActivity | null;
  onClose: () => void;
}) {
  const url = activity?.certificate_url ?? null;
  const isPdf = Boolean(url && url.toLowerCase().split("?")[0].endsWith(".pdf"));

  return (
    <Dialog open={Boolean(url)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl gap-3">
        <DialogHeader>
          <DialogTitle className="truncate">{activity?.judul}</DialogTitle>
          <DialogDescription>
            {activity?.penyelenggara}
            {activity?.credential_id ? ` · ID ${activity.credential_id}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[65vh] items-center justify-center overflow-auto rounded-md border border-foreground bg-muted/50 p-2">
          {url && isPdf ? (
            <iframe src={url} title={`Sertifikat ${activity?.judul}`} className="h-[62vh] w-full rounded bg-white" />
          ) : url ? (
            <img src={url} alt={`Sertifikat ${activity?.judul}`} className="max-h-[62vh] w-auto rounded" />
          ) : null}
        </div>

        {url && (
          <Button asChild variant="outline" size="sm" className="justify-self-start">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden />
              Buka di tab baru
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
