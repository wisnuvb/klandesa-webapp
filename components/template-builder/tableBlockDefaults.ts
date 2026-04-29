import type { TableRow } from "./types";

/** Baris starter untuk blok tabel baru atau ketika data dari library tidak bisa dipetakan. */
export const DEFAULT_TEMPLATE_TABLE_ROWS: readonly TableRow[] = [
  { label: "Nama lengkap", value: "{NAMA_LENGKAP}" },
  { label: "NIK", value: "{NIK}" },
  { label: "Tempat, tanggal lahir", value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}" },
  { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
];

export function createDefaultTableRows(): TableRow[] {
  return DEFAULT_TEMPLATE_TABLE_ROWS.map((r) => ({ ...r }));
}

function rowHasData(r: TableRow): boolean {
  return Boolean(r.label.trim() || r.value.trim());
}

/** Memetakan konten library / legacy ke format editor `TableRow[]`. */
export function coerceTableRowsFromLibrary(content: unknown): TableRow[] {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const items = (content as { items?: unknown }).items;
    if (Array.isArray(items) && items.length > 0) {
      const mapped = items
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => ({
          label:
            typeof item.label === "string"
              ? item.label
              : "",
          value:
            typeof item.value === "string"
              ? item.value
              : "",
        }));
      if (mapped.some(rowHasData)) return mapped;
    }
  }

  if (Array.isArray(content)) {
    const mapped: TableRow[] = [];
    for (const item of content) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.label === "string" || typeof row.value === "string") {
        mapped.push({
          label: typeof row.label === "string" ? row.label : "",
          value: typeof row.value === "string" ? row.value : "",
        });
        continue;
      }
      if (typeof row.text === "string") {
        const t = row.text.trim();
        const sep = t.indexOf(":");
        if (sep > 0) {
          mapped.push({
            label: t.slice(0, sep).trim(),
            value: t.slice(sep + 1).trim(),
          });
        } else {
          mapped.push({ label: "", value: t });
        }
      }
    }
    if (mapped.some(rowHasData)) return mapped;
  }

  return createDefaultTableRows();
}
