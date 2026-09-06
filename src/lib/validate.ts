/**
 * Tiny server-side validators shared by Server Actions.
 * Each throws ValidationError with an Indonesian, user-facing message —
 * actions catch it and return { error } to the client.
 */

export class ValidationError extends Error {}

export function vRequiredStr(value: unknown, label: string, max = 255): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new ValidationError(`${label} wajib diisi.`);
  if (s.length > max) throw new ValidationError(`${label} maksimal ${max} karakter.`);
  return s;
}

export function vOptionalStr(value: unknown, label: string, max = 255): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new ValidationError(`${label} tidak valid.`);
  const s = value.trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${label} maksimal ${max} karakter.`);
  return s;
}

/** Heks warna persona: null bila kosong, "#rrggbb" bila terisi. */
export function vHexColor(value: unknown, label: string): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    throw new ValidationError(`${label} harus berupa kode heks seperti #0057a8.`);
  }
  return value.trim().toLowerCase();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function vDate(value: unknown, label: string): string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) {
    throw new ValidationError(`${label} harus berupa tanggal yang valid.`);
  }
  return value;
}

export function vOptionalDate(value: unknown, label: string): string | null {
  if (value == null || value === "") return null;
  return vDate(value, label);
}

export function vInt(
  value: unknown,
  label: string,
  { min, max }: { min?: number; max?: number } = {},
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${label} harus berupa bilangan bulat.`);
  if (min != null && n < min) throw new ValidationError(`${label} minimal ${min}.`);
  if (max != null && n > max) throw new ValidationError(`${label} maksimal ${max}.`);
  return n;
}

export function vEnum(value: unknown, label: string, allowed: readonly string[]): string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationError(`${label} tidak dikenal.`);
  }
  return value;
}

export function vTags(value: unknown, label = "Skill tags"): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value) || value.some((t) => typeof t !== "string")) {
    throw new ValidationError(`${label} tidak valid.`);
  }
  const tags = value.map((t: string) => t.trim()).filter(Boolean);
  return tags.length ? tags.slice(0, 30) : null;
}
