/** Rencana impor dari workbook: parse tiap sheet, tebak pemetaan, tentukan sheet mana yang dipilih secara default. */
import type { SheetPlan, ColumnMapping } from "./batch";
import { headerSignature, suggestMapping, type ColumnGuess } from "./mapper";
import { parseSheet, type SheetGrid, type SheetRole } from "./sheet-structure";

export interface PlannedSheet extends SheetPlan {
  guesses: ColumnGuess[];
  signature: string;
  /** Alasan sheet tidak dipilih otomatis (ditampilkan di UI). */
  note?: string;
}

export function planWorkbook(grids: SheetGrid[], saved: Record<string, ColumnMapping> = {}): PlannedSheet[] {
  const plans: PlannedSheet[] = grids.map((grid) => {
    const sheet = parseSheet(grid);
    const signature = headerSignature(sheet.headers);
    const guesses = suggestMapping(sheet.columns, { saved: saved[signature] ?? null });
    return {
      sheet,
      mapping: guesses.map((g) => g.field),
      guesses,
      signature,
      role: sheet.role,
      selected: false,
    };
  });

  const isRoster = (p: PlannedSheet) =>
    p.sheet.dataRows.length > 0 && p.mapping.includes("id_number") && p.mapping.includes("name");
  const hasMaster = plans.some((p) => p.role === "master" && isRoster(p));

  for (const p of plans) {
    if (!isRoster(p)) {
      p.note = p.sheet.dataRows.length === 0 ? "Sheet kosong" : "Tidak ada kolom NIK dan Nama yang terdeteksi";
      continue;
    }
    const sel: Record<SheetRole, boolean> = {
      master: true,
      split: !hasMaster,
      deceased: true,
      moved: false,
      auxiliary: false,
    };
    p.selected = sel[p.role];
    if (!p.selected) {
      p.note =
        p.role === "split"
          ? "Kemungkinan salinan data induk per RW; dilewati karena sudah ada sheet induk"
          : p.role === "moved"
            ? "Warga pindah tidak dihitung sebagai penduduk aktif; centang bila ingin tetap diimpor"
            : "Daftar bantu, bukan data induk penduduk";
    }
  }
  return plans;
}

/** Sebarkan pemetaan ke sheet lain yang headernya sama persis. */
export function applyMappingToSameSignature(plans: PlannedSheet[], sourceIndex: number): PlannedSheet[] {
  const src = plans[sourceIndex];
  return plans.map((p, i) =>
    i !== sourceIndex && p.signature === src.signature ? { ...p, mapping: [...src.mapping] } : p,
  );
}
