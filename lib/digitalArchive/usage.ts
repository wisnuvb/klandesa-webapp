/** Pemakaian storage Arsip Digital per sumber (kategori; lampiran dirinci per modul). Murni, dipakai sidebar Arsip. */
import { ATTACHMENT_ARCHIVE_CATEGORY } from "../attachments/catalog";

export interface UsageEntry {
  category: string;
  subCategory: string | null;
  fileSize: number;
}

export interface UsageLine {
  label: string;
  bytes: number;
  count: number;
}

export const USAGE_MAX_LINES = 8;

/** Sumber suatu berkas: lampiran dirinci per modul ("Lampiran · Register Surat"), selain itu per kategori. */
export function usageSourceOf(e: Pick<UsageEntry, "category" | "subCategory">): string {
  const cat = e.category.trim() || "Tanpa kategori";
  return cat === ATTACHMENT_ARCHIVE_CATEGORY && e.subCategory?.trim() ? `${cat} · ${e.subCategory.trim()}` : cat;
}

/** Urut dari terbesar; sumber di luar `max` teratas digabung menjadi "Lainnya". Total byte selalu tetap. */
export function summarizeUsageBySource(entries: readonly UsageEntry[], max: number = USAGE_MAX_LINES): UsageLine[] {
  const by = new Map<string, UsageLine>();
  for (const e of entries) {
    const label = usageSourceOf(e);
    const line = by.get(label) ?? { label, bytes: 0, count: 0 };
    line.bytes += Number.isFinite(e.fileSize) && e.fileSize > 0 ? e.fileSize : 0;
    line.count += 1;
    by.set(label, line);
  }
  const sorted = [...by.values()].sort((a, b) => b.bytes - a.bytes || a.label.localeCompare(b.label, "id"));
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1);
  return [...head, { label: "Lainnya", bytes: rest.reduce((a, l) => a + l.bytes, 0), count: rest.reduce((a, l) => a + l.count, 0) }];
}
