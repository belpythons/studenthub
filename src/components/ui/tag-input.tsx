import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Free-form tag entry. Accepts Enter, comma or Tab to commit, Backspace to
 * remove the last tag, and splits pasted comma-separated lists.
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  className,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const [draft, setDraft] = React.useState("");

  function commit(raw: string) {
    const fresh = raw
      .split(",")
      .map((t) => t.replace(/^#/, "").trim())
      .filter((t) => t && !value.includes(t));

    if (fresh.length) onChange([...value, ...Array.from(new Set(fresh))]);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        commit(draft);
      }
      return;
    }
    if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
  }

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-card px-2 py-1.5 shadow-xs",
        "focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/25",
        className,
      )}
    >
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full border border-foreground bg-primary py-0.5 pl-2.5 pr-1 text-[11.5px] font-semibold text-primary-foreground"
        >
          #{t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            aria-label={`Hapus tag ${t}`}
            className="rounded-full p-0.5 hover:bg-foreground/20"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}

      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={value.length ? "" : placeholder}
        className="min-w-32 flex-1 bg-transparent px-1 py-1 text-[13.5px] outline-none placeholder:text-muted-foreground/80"
      />
    </div>
  );
}
