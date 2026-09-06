import * as React from "react";
import { useRefresh } from "@/hooks/use-refresh";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, fieldAria } from "@/components/shared/field";
import { describeError, notifyError, notifySuccess } from "@/lib/notify";
import { saveProject } from "@/lib/logbook-actions";
import type { Project } from "@/lib/types";

const JENIS = ["Jurnal", "Tugas Akhir", "Lomba", "KP", "Lainnya"];
const STATUS = [
  { value: "aktif", label: "Aktif" },
  { value: "selesai", label: "Selesai" },
  { value: "arsip", label: "Arsip" },
];

export function ProjectForm({
  initial,
  onSaved,
}: {
  initial?: Project;
  onSaved?: (id: string) => void;
}) {
  const refresh = useRefresh();
  const [form, setForm] = React.useState({
    judul: initial?.judul ?? "",
    jenis: initial?.jenis ?? "Jurnal",
    deskripsi: initial?.deskripsi ?? "",
    fase: initial?.fase ?? "",
    targetTanggal: initial?.target_tanggal ?? "",
    status: initial?.status ?? "aktif",
    pertanyaanBaru: initial?.pertanyaan_baru ?? "",
  });
  const [busy, setBusy] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.judul.trim()) {
      notifyError("Judul proyek wajib diisi.");
      return;
    }
    setBusy(true);
    const result = await saveProject({
      id: initial?.id,
      judul: form.judul.trim(),
      jenis: form.jenis,
      deskripsi: form.deskripsi.trim() || null,
      fase: form.fase.trim() || null,
      target_tanggal: form.targetTanggal || null,
      status: form.status,
      pertanyaan_baru: form.pertanyaanBaru.trim() || null,
    });
    setBusy(false);

    if ("error" in result) {
      notifyError("Gagal menyimpan proyek", { description: describeError(result.error) });
      return;
    }
    notifySuccess(initial ? "Proyek diperbarui" : "Proyek dibuat", {
      description: form.judul.trim(),
    });
    if (!initial) {
      setForm({ judul: "", jenis: "Jurnal", deskripsi: "", fase: "", targetTanggal: "", status: "aktif", pertanyaanBaru: "" });
    }
    refresh();
    onSaved?.(result.id);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Judul Proyek" htmlFor="pj-judul" required>
          <Input
            {...fieldAria("pj-judul")}
            maxLength={255}
            placeholder="mis. Penyusunan Jurnal Sistem Informasi"
            value={form.judul}
            onChange={(e) => set("judul", e.target.value)}
          />
        </Field>

        <Field label="Jenis" htmlFor="pj-jenis">
          <Select value={form.jenis} onValueChange={(v) => set("jenis", v)}>
            <SelectTrigger id="pj-jenis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JENIS.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Fase saat ini" htmlFor="pj-fase" optional="opsional">
          <Input
            {...fieldAria("pj-fase")}
            maxLength={60}
            placeholder="mis. Penulisan Bab 3"
            value={form.fase}
            onChange={(e) => set("fase", e.target.value)}
          />
        </Field>

        <Field label="Target / Deadline" htmlFor="pj-target" optional="opsional">
          <Input
            {...fieldAria("pj-target")}
            type="date"
            value={form.targetTanggal}
            onChange={(e) => set("targetTanggal", e.target.value)}
          />
        </Field>

        <Field label="Status" htmlFor="pj-status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger id="pj-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Deskripsi" htmlFor="pj-desk" optional="opsional">
        <Textarea
          {...fieldAria("pj-desk", null, true)}
          rows={2}
          value={form.deskripsi}
          onChange={(e) => set("deskripsi", e.target.value)}
        />
      </Field>

      <Field
        label="Pertanyaan untuk konsultan berikutnya"
        htmlFor="pj-tanya"
        optional="bagian R Briefing Pack"
        hint="Apa yang ingin Anda tanyakan pada sesi konsultasi berikutnya?"
      >
        <Textarea
          {...fieldAria("pj-tanya", null, true)}
          rows={2}
          value={form.pertanyaanBaru}
          onChange={(e) => set("pertanyaanBaru", e.target.value)}
        />
      </Field>

      <Button type="submit" variant="gradient" size="sm" loading={busy}>
        {!busy && <Save aria-hidden />}
        {initial ? "Simpan Perubahan" : "Buat Proyek"}
      </Button>
    </form>
  );
}
