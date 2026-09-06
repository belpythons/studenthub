import type { SupabaseClient } from "@supabase/supabase-js";
import { SKM_TARGET_POIN } from "./constants";

/** Row types for institution_presets / skm_point_rules (supabase/schema.sql). */
export interface SkmPreset {
  id: string;
  nama: string;
  deskripsi: string | null;
  target_poin: number;
  target_jam_sosial: number | null;
  sumber_url: string | null;
  verifikasi: "resmi" | "sekunder";
}

export interface SkmPointRule {
  id: string;
  preset_id: string;
  kategori: string;
  tingkat: string;
  poin: number;
  cap_kategori: number | null;
  equivalence_key: string | null;
  urutan: number;
}

/** Fallback bila seed belum berjalan — perilaku lama tetap hidup. */
const FALLBACK_PRESET: SkmPreset = {
  id: "custom",
  nama: "Kustom (bawaan aplikasi)",
  deskripsi: null,
  target_poin: SKM_TARGET_POIN,
  target_jam_sosial: null,
  sumber_url: null,
  verifikasi: "resmi",
};

export async function fetchAllPresets(supabase: SupabaseClient): Promise<SkmPreset[]> {
  const { data } = await supabase
    .from("institution_presets")
    .select("*")
    .order("id");
  return (data ?? []) as SkmPreset[];
}

/** Persona aktif pengguna + seluruh rule-nya (urut kategori lalu urutan). */
export async function fetchActivePersona(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ preset: SkmPreset; rules: SkmPointRule[] }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("skm_preset_id")
    .eq("id", userId)
    .maybeSingle();

  const presetId = (profile?.skm_preset_id as string | null) ?? "custom";

  const [{ data: preset }, { data: rules }] = await Promise.all([
    supabase.from("institution_presets").select("*").eq("id", presetId).maybeSingle(),
    supabase
      .from("skm_point_rules")
      .select("*")
      .eq("preset_id", presetId)
      .order("kategori")
      .order("urutan"),
  ]);

  return {
    preset: (preset as SkmPreset | null) ?? FALLBACK_PRESET,
    rules: (rules ?? []) as SkmPointRule[],
  };
}
