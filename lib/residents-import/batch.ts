/**
 * Perakitan batch: sheet + pemetaan → baris ternormalisasi, penggabungan lintas sheet (induk/meninggal/pindah/pecahan RW),
 * pemeriksaan silang antar baris (NIK ganda, Kepala Keluarga per KK), dan penautan NIK ayah/ibu.
 */
import type { FieldId, Values } from "./fields";
import type { Cell } from "./mapper";
import { canonicalHeader } from "./mapper";
import { normalizeRow, rowHasError, type Issue } from "./normalize";
import type { ParsedSheet, SheetRole } from "./sheet-structure";
import { normalizeText } from "./text";

export type ColumnMapping = Array<FieldId | null>;

export interface SheetPlan {
  sheet: ParsedSheet;
  mapping: ColumnMapping;
  role: SheetRole;
  selected: boolean;
}

export interface ImportRow {
  /** Kunci unik stabil (tidak berubah saat baris lain dihapus). */
  key: number;
  sheet: string;
  /** Nomor baris di Excel (1-based). */
  srcRow: number;
  role: SheetRole;
  values: Values;
  issues: Issue[];
}

const isEmpty = (c: Cell | undefined) => c === null || c === undefined || String(c).trim() === "";

const MARK_RE = /^(x|v|✓|✔|1|y|ya)$/i;

/** Header kolom bertanda tunggal "L"/"P" → nilai gender; header gabungan "L/P" tidak punya penanda. */
function genderMarkerOf(header: string): string | null {
  const toks = canonicalHeader(header)
    .replace(/\bjenis kelamin\b/g, "")
    .split(" ")
    .filter(Boolean);
  if (toks.length !== 1) return null;
  if (["l", "lk", "laki", "pria"].includes(toks[0])) return "Laki-laki";
  if (["p", "pr", "perempuan", "wanita"].includes(toks[0])) return "Perempuan";
  return null;
}

export function extractRaw(
  cells: Cell[],
  mapping: ColumnMapping,
  headers: string[],
): Partial<Record<FieldId, unknown>> {
  const raw: Partial<Record<FieldId, unknown>> = {};
  mapping.forEach((field, ci) => {
    if (!field) return;
    let v = cells[ci];
    if (isEmpty(v)) return;
    if (field === "gender") {
      const marker = genderMarkerOf(headers[ci] ?? "");
      if (marker && MARK_RE.test(String(v).trim())) v = marker;
    }
    if (isEmpty(raw[field] as Cell | undefined)) raw[field] = v;
  });
  return raw;
}

export interface BuildOptions {
  now?: Date;
  startKey?: number;
  /** Dipanggil tiap ±2000 baris agar UI tidak membeku; await di pemanggil. */
  onProgress?: (done: number, total: number) => Promise<void> | void;
}

const todayIso = (now: Date) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

export async function buildSheetRows(plan: SheetPlan, opts: BuildOptions = {}): Promise<ImportRow[]> {
  const now = opts.now ?? new Date();
  let key = opts.startKey ?? 0;
  const rows: ImportRow[] = [];
  const { sheet, mapping, role } = plan;
  const total = sheet.dataRows.length;

  for (let i = 0; i < total; i++) {
    const { srcRow, cells } = sheet.dataRows[i];
    const raw = extractRaw(cells, mapping, sheet.headers);
    if (role === "deceased" && isEmpty(raw.is_alive as Cell)) raw.is_alive = "N";
    const { values, issues } = normalizeRow(raw, { now });
    if (role === "moved" && !values.move_date) {
      values.move_date = todayIso(now);
      issues.push({ field: "move_date", level: "fixed", message: "Tanggal pindah tidak ada di sheet; diisi tanggal impor" });
    }
    rows.push({ key: key++, sheet: sheet.name, srcRow, role, values, issues });
    if (opts.onProgress && i % 2000 === 1999) await opts.onProgress(i + 1, total);
  }
  return rows;
}

const ROLE_PRIORITY: Record<SheetRole, number> = { master: 0, split: 1, deceased: 2, moved: 3, auxiliary: 4 };

export interface MergeSummary {
  merged: number;
}

/** Gabungkan baris dengan NIK sama yang berasal dari sheet berbeda. Baris dalam satu sheet tidak disentuh. */
export function mergeAcrossSheets(rows: ImportRow[], now = new Date()): { rows: ImportRow[]; summary: MergeSummary } {
  const byNik = new Map<string, ImportRow[]>();
  for (const r of rows) {
    const nik = r.values.id_number ?? "";
    if (nik.length !== 16) continue;
    const list = byNik.get(nik);
    if (list) list.push(r);
    else byNik.set(nik, [r]);
  }

  const drop = new Set<number>();
  let merged = 0;
  for (const list of byNik.values()) {
    if (list.length < 2) continue;
    const sheets = new Set(list.map((r) => r.sheet));
    if (sheets.size < 2) continue;
    const sorted = [...list].sort((a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role] || a.key - b.key);
    const base = sorted[0];
    let changed = false;
    for (const other of sorted.slice(1)) {
      if (other.sheet === base.sheet) continue;
      for (const [k, v] of Object.entries(other.values) as Array<[FieldId, string]>) {
        if (!v) continue;
        if (k === "is_alive" || k === "death_date" || k === "move_date") {
          if (other.role === "deceased" && (k === "is_alive" || k === "death_date")) {
            if (base.values[k] !== v) {
              base.values[k] = v;
              changed = true;
            }
          } else if (other.role === "moved" && k === "move_date" && !base.values.move_date) {
            base.values.move_date = v;
            changed = true;
          } else if (!base.values[k]) {
            base.values[k] = v;
            changed = true;
          }
          continue;
        }
        if (!base.values[k]) {
          base.values[k] = v;
          changed = true;
        }
      }
      drop.add(other.key);
      merged++;
    }
    if (changed) {
      const re = normalizeRow(base.values, { now });
      base.values = re.values;
      base.issues = re.issues;
    }
  }
  return { rows: rows.filter((r) => !drop.has(r.key)), summary: { merged } };
}

/** Isi NIK ayah/ibu dari anggota KK yang namanya sama. Mengubah baris di tempat; mengembalikan jumlah tautan. */
export function linkParents(rows: ImportRow[]): number {
  const byKk = new Map<string, ImportRow[]>();
  for (const r of rows) {
    const kk = r.values.family_card_number ?? "";
    if (kk.length !== 16) continue;
    const l = byKk.get(kk);
    if (l) l.push(r);
    else byKk.set(kk, [r]);
  }
  let linked = 0;
  for (const members of byKk.values()) {
    if (members.length < 2) continue;
    for (const r of members) {
      for (const [nameKey, nikKey, wantGender] of [
        ["father_name", "father_nik", "Laki-laki"],
        ["mother_name", "mother_nik", "Perempuan"],
      ] as const) {
        const pname = normalizeText(r.values[nameKey]);
        if (!pname || r.values[nikKey]) continue;
        const parent = members.find(
          (m) =>
            m !== r &&
            (m.values.id_number ?? "").length === 16 &&
            normalizeText(m.values.name) === pname &&
            (!m.values.gender || m.values.gender === wantGender),
        );
        if (parent) {
          r.values[nikKey] = parent.values.id_number!;
          r.issues.push({
            field: nikKey,
            level: "fixed",
            message: `${nikKey === "father_nik" ? "NIK ayah" : "NIK ibu"} diisi dari anggota KK yang sama (${parent.values.name})`,
          });
          linked++;
        }
      }
    }
  }
  return linked;
}

export type BatchIssues = Map<number, Issue[]>;

/** Pemeriksaan lintas baris. Dihitung ulang setelah edit; tidak mengubah baris. */
export function analyzeBatch(rows: ImportRow[]): BatchIssues {
  const out: BatchIssues = new Map();
  const push = (key: number, issue: Issue) => {
    const l = out.get(key);
    if (l) l.push(issue);
    else out.set(key, [issue]);
  };

  // NIK ganda
  const firstByNik = new Map<string, ImportRow>();
  for (const r of rows) {
    const nik = r.values.id_number ?? "";
    if (nik.length !== 16) continue;
    const first = firstByNik.get(nik);
    if (!first) firstByNik.set(nik, r);
    else {
      push(r.key, {
        field: "id_number",
        level: "error",
        message: `NIK sama dengan baris ${first.srcRow} (${first.sheet}); baris ini tidak akan diimpor`,
      });
    }
  }

  // Nama + tanggal lahir sama tetapi NIK berbeda
  const byNameDob = new Map<string, ImportRow>();
  for (const r of rows) {
    const n = normalizeText(r.values.name);
    const d = r.values.date_of_birth ?? "";
    if (!n || !d) continue;
    const k = `${n}|${d}`;
    const first = byNameDob.get(k);
    if (!first) byNameDob.set(k, r);
    else if (first.values.id_number !== r.values.id_number) {
      push(r.key, {
        field: "name",
        level: "warning",
        message: `Nama dan tanggal lahir sama dengan baris ${first.srcRow} tetapi NIK berbeda — kemungkinan orang yang sama`,
      });
    }
  }

  // Kepala Keluarga per KK (hanya bila kolom hubungan terisi memadai)
  const withRole = rows.filter((r) => r.values.status_family_id).length;
  if (rows.length > 0 && withRole / rows.length >= 0.5) {
    const byKk = new Map<string, ImportRow[]>();
    for (const r of rows) {
      const kk = r.values.family_card_number ?? "";
      if (kk.length !== 16) continue;
      const l = byKk.get(kk);
      if (l) l.push(r);
      else byKk.set(kk, [r]);
    }
    for (const [kk, members] of byKk) {
      const heads = members.filter((m) => m.values.status_family_id === "Kepala Keluarga");
      if (heads.length === 0) {
        push(members[0].key, {
          field: "status_family_id",
          level: "warning",
          message: `KK ${kk} belum punya Kepala Keluarga di data ini`,
        });
      } else if (heads.length > 1) {
        for (const h of heads.slice(1)) {
          push(h.key, {
            field: "status_family_id",
            level: "warning",
            message: `KK ${kk} punya lebih dari satu Kepala Keluarga`,
          });
        }
      }
    }
  }
  return out;
}

export type RowStatus = "error" | "warning" | "ok";

export function statusOf(issues: Issue[], extra?: Issue[]): RowStatus {
  const all = extra ? issues.concat(extra) : issues;
  if (rowHasError(all)) return "error";
  if (all.some((i) => i.level === "warning")) return "warning";
  return "ok";
}

export interface BatchSummary {
  total: number;
  ok: number;
  warning: number;
  error: number;
  fixed: number;
}

export function summarize(rows: ImportRow[], batch: BatchIssues, extraByKey?: Map<number, Issue[]>): BatchSummary {
  const s: BatchSummary = { total: rows.length, ok: 0, warning: 0, error: 0, fixed: 0 };
  for (const r of rows) {
    const extra = (batch.get(r.key) ?? []).concat(extraByKey?.get(r.key) ?? []);
    const st = statusOf(r.issues, extra);
    s[st]++;
    if (r.issues.some((i) => i.level === "fixed")) s.fixed++;
  }
  return s;
}

/** Kumpulkan nilai enumerasi yang tidak dikenali (peringatan) beserta jumlah baris, untuk perbaikan sekali-untuk-semua. */
export function unknownValues(
  rows: ImportRow[],
  fields: FieldId[],
): Array<{ field: FieldId; value: string; count: number }> {
  const map = new Map<string, { field: FieldId; value: string; count: number }>();
  for (const r of rows) {
    for (const f of fields) {
      if (!r.issues.some((i) => i.field === f && i.level === "warning" && i.message.includes("daftar baku"))) continue;
      const v = r.values[f] ?? "";
      if (!v) continue;
      const k = `${f}\u0000${v}`;
      const e = map.get(k);
      if (e) e.count++;
      else map.set(k, { field: f, value: v, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
