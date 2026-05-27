export const ASSET_TYPE_LABELS: Record<string, string> = {
  road: "Jalan",
  bridge: "Jembatan",
  drainage: "Drainase",
  water: "Air bersih",
  electricity: "Listrik",
  school: "Sekolah",
  health: "Kesehatan",
  other: "Lainnya",
};

export const ASSET_CONDITION_LABELS: Record<string, string> = {
  good: "Baik",
  fair: "Cukup",
  poor: "Buruk",
  critical: "Kritis",
};

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  construction: "Pembangunan",
  repair: "Perbaikan",
  maintenance: "Pemeliharaan",
  planning: "Perencanaan",
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  planned: "Direncanakan",
  ongoing: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const DISASTER_TYPE_LABELS: Record<string, string> = {
  flood: "Banjir",
  landslide: "Longsor",
  earthquake: "Gempa",
  fire: "Kebakaran",
  drought: "Kekeringan",
  other: "Lainnya",
};

export const RISK_LEVEL_LABELS: Record<string, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  extreme: "Ekstrem",
};

export function labelOf(
  map: Record<string, string>,
  key: string,
): string {
  return map[key] ?? key;
}
