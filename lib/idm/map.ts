/** Pembacaan dan pemetaan berkas IDM (murni, aman klien): CSV sendiri (agar "0,75" tidak dibaca sebagai 75), deteksi baris judul, pemetaan kolom. */
import { INDICATOR_FIELDS, SUMMARY_FIELDS, type Dimension, type FieldDef, type Layout } from "./catalog";

export type Cell = string | number | boolean | null;
export type Grid = Cell[][];

/** CSV/TSV dengan pemisah koma, titik koma, atau tab; tanda kutip ganda; BOM dibuang. Sel tetap berupa teks. */
export function parseDelimited(text: string, maxRows = 200_000): Grid {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  let delim = ",";
  let best = -1;
  for (const d of [",", ";", "\t"]) {
    let n = 0;
    let q = false;
    for (const ch of firstLine) {
      if (ch === '"') q = !q;
      else if (ch === d && !q) n++;
    }
    if (n > best) {
      best = n;
      delim = d;
    }
  }
  const rows: Grid = [];
  let row: Cell[] = [];
  let cur = "";
  let q = false;
  const endCell = () => {
    row.push(cur === "" ? null : cur);
    cur = "";
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) endCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      endCell();
      if (row.some((c) => c !== null)) rows.push(row);
      row = [];
      if (rows.length >= maxRows) return rows;
    } else cur += ch;
  }
  endCell();
  if (row.some((c) => c !== null)) rows.push(row);
  return rows;
}

/** Skor dari angka atau teks. Koma tunggal = desimal; titik tunggal = desimal; pemisah ribuan berulang dikenali. null bila bukan angka. */
export function parseScore(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 10_000) / 10_000 : null;
  if (typeof v !== "string") return null;
  let s = v.trim().replace(/\s+/g, "");
  if (!s || !/^[+-]?[\d.,]+$/.test(s)) return null;
  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;
  if (dots && commas) {
    const dec = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const th = dec === "," ? "." : ",";
    if ((s.match(new RegExp(`\\${th}`, "g")) ?? []).length === 0) return null;
    s = s.split(th).join("").replace(dec, ".");
  } else if (commas > 1) s = s.split(",").join("");
  else if (dots > 1) s = s.split(".").join("");
  else if (commas === 1) s = s.replace(",", ".");
  if (!/^[+-]?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 10_000) / 10_000 : null;
}

export const norm = (v: unknown): string =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Nama desa tanpa awalan "Desa/Kelurahan/Kel./Des." untuk pencocokan. */
export const villageKey = (v: unknown): string => norm(v).replace(/^(desa|kelurahan|kel|des|nagari|gampong)\s+/, "");

const digitsOnly = (v: unknown): string => String(v ?? "").replace(/\D+/g, "");

function score(h: string, f: FieldDef): number {
  const n = norm(h);
  if (!n) return 0;
  if (f.aliases.includes(n)) return 3;
  if (f.pattern?.test(n)) return 2;
  return 0;
}

/** Baris judul = baris (dalam 25 baris pertama) dengan paling banyak kolom yang dikenali; baris bernomor (-1, -2, ...) dilewati. */
export function detectHeaderRow(grid: Grid): number {
  let best = 0;
  let bestScore = -1;
  for (let r = 0; r < Math.min(25, grid.length); r++) {
    const cells = grid[r] ?? [];
    let s = 0;
    for (const c of cells) for (const f of [...SUMMARY_FIELDS, ...INDICATOR_FIELDS]) if (score(String(c ?? ""), f) > 0) s++;
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }
  return best;
}

/** Baris pendamping di bawah judul yang hanya berisi nomor kolom negatif/urut (mis. -1, -2, ...) dilewati. */
export function firstDataRow(grid: Grid, headerRow: number): number {
  let r = headerRow + 1;
  while (r < grid.length) {
    const cells = (grid[r] ?? []).filter((c) => c !== null && c !== "");
    if (cells.length && cells.every((c) => typeof c === "number" ? c < 0 : /^-?\d+$/.test(String(c).trim()) && Number(c) < 0)) r++;
    else break;
  }
  return r;
}

export type Mapping = Record<string, number | null>;

export function detectLayout(headers: string[]): Layout {
  const has = (fs: FieldDef[], id: string) => headers.some((h) => score(h, fs.find((f) => f.id === id)!) > 0);
  return has(INDICATOR_FIELDS, "indikator") && has(INDICATOR_FIELDS, "skor") && !has(SUMMARY_FIELDS, "iks") ? "INDICATORS" : "SUMMARY";
}

export function guessMapping(headers: string[], layout: Layout): Mapping {
  const fields = layout === "SUMMARY" ? SUMMARY_FIELDS : INDICATOR_FIELDS;
  const out: Mapping = {};
  const used = new Set<number>();
  for (const f of fields) {
    let bestIdx: number | null = null;
    let best = 0;
    headers.forEach((h, i) => {
      if (used.has(i)) return;
      const s = score(h, f);
      if (s > best) {
        best = s;
        bestIdx = i;
      }
    });
    out[f.id] = bestIdx;
    if (bestIdx !== null) used.add(bestIdx);
  }
  return out;
}

/** Tahun yang tampak pada judul kolom (mis. "IKS 2024"): bila semua kolom terpetakan memuat tahun yang sama, itulah tahunnya. */
export function yearFromHeaders(headers: string[], mapping: Mapping): number | null {
  const years = new Set<number>();
  for (const id of ["iks", "ike", "ikl", "idm", "status"]) {
    const i = mapping[id];
    if (i === null || i === undefined) continue;
    const m = /(20\d{2})/.exec(headers[i] ?? "");
    if (m) years.add(Number(m[1]));
  }
  return years.size === 1 ? [...years][0] : null;
}

export interface SummaryRow {
  rowNo: number;
  kodeDesa: string;
  namaDesa: string;
  kecamatan: string;
  tahun: number | null;
  iks: number | null;
  ike: number | null;
  ikl: number | null;
  idm: number | null;
  status: string | null;
  /** nilai yang tidak terbaca sebagai angka (kolom skor terisi tetapi bukan angka) */
  badScores: string[];
}

const text = (c: Cell | undefined): string => (c === null || c === undefined ? "" : String(c).trim());

export function readSummaryRows(grid: Grid, headerRow: number, mapping: Mapping): SummaryRow[] {
  const out: SummaryRow[] = [];
  const get = (row: Cell[], id: string): Cell | undefined => (mapping[id] === null || mapping[id] === undefined ? undefined : row[mapping[id]!]);
  for (let r = firstDataRow(grid, headerRow); r < grid.length; r++) {
    const row = grid[r] ?? [];
    const kode = text(get(row, "kodeDesa"));
    const nama = text(get(row, "namaDesa"));
    if (!kode && !nama) continue;
    const bad: string[] = [];
    const num = (id: string, label: string): number | null => {
      const c = get(row, id);
      if (c === null || c === undefined || c === "") return null;
      const n = parseScore(c);
      if (n === null) bad.push(label);
      return n;
    };
    const iks = num("iks", "IKS");
    const ike = num("ike", "IKE");
    const ikl = num("ikl", "IKL");
    const idm = num("idm", "Nilai IDM");
    const st = text(get(row, "status"));
    const y = parseScore(get(row, "tahun"));
    out.push({ rowNo: r + 1, kodeDesa: kode, namaDesa: nama, kecamatan: text(get(row, "kecamatan")), tahun: y !== null && Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : null, iks, ike, ikl, idm, status: st || null, badScores: bad });
  }
  return out;
}

export interface MatchTarget {
  name: string;
  district: string;
  idmCode: string;
}
/** Baris yang paling cocok dengan desa: kode IDM yang diisi di pengaturan desa, lalu nama (dan kecamatan bila ada beberapa). */
export function matchRows(rows: SummaryRow[], t: MatchTarget): { by: "kode" | "nama" | null; rows: SummaryRow[] } {
  const code = digitsOnly(t.idmCode);
  if (code) {
    const m = rows.filter((r) => digitsOnly(r.kodeDesa) === code);
    if (m.length) return { by: "kode", rows: m };
  }
  const key = villageKey(t.name);
  if (key) {
    const m = rows.filter((r) => villageKey(r.namaDesa) === key);
    if (m.length > 1) {
      const dk = norm(t.district).replace(/^kecamatan\s+/, "");
      const d = m.filter((r) => norm(r.kecamatan).replace(/^kecamatan\s+/, "") === dk);
      if (d.length) return { by: "nama", rows: d };
    }
    if (m.length) return { by: "nama", rows: m };
  }
  return { by: null, rows: [] };
}

export function dimensionOf(v: unknown): Dimension {
  const n = norm(v);
  if (!n) return "LAIN";
  if (n === "iks" || n.includes("sosial")) return "IKS";
  if (n === "ike" || n.includes("ekonomi")) return "IKE";
  if (n === "ikl" || n.includes("ekologi") || n.includes("lingkungan")) return "IKL";
  return "LAIN";
}

export interface IndicatorRow {
  rowNo: number;
  dimension: Dimension;
  code: string | null;
  name: string;
  score: number;
  maxScore: number | null;
  note: string | null;
  suggestion: string | null;
  /** masalah yang membuat baris ditolak server (null = layak) */
  issue: string | null;
}
export function readIndicatorRows(grid: Grid, headerRow: number, mapping: Mapping): { rows: IndicatorRow[]; skipped: number } {
  const rows: IndicatorRow[] = [];
  let skipped = 0;
  const get = (row: Cell[], id: string): Cell | undefined => (mapping[id] === null || mapping[id] === undefined ? undefined : row[mapping[id]!]);
  let dim: Dimension = "LAIN";
  for (let r = firstDataRow(grid, headerRow); r < grid.length; r++) {
    const row = grid[r] ?? [];
    const name = text(get(row, "indikator"));
    const rawDim = text(get(row, "dimensi"));
    if (rawDim) dim = dimensionOf(rawDim);
    const sc = parseScore(get(row, "skor"));
    if (!name) continue;
    if (sc === null) {
      skipped++; // baris judul kelompok/subjudul/jumlah tanpa skor
      continue;
    }
    const mx = parseScore(get(row, "skorMaks"));
    const maxScore = mx !== null && mx > 0 ? mx : null;
    const issue = sc < 0 ? "skor negatif" : sc > 99_999 ? "skor terlalu besar (maksimal 99.999)" : maxScore !== null && sc > maxScore ? `skor ${sc} melebihi skor maksimal ${maxScore}` : null;
    rows.push({ rowNo: r + 1, dimension: rawDim ? dimensionOf(rawDim) : dim, code: text(get(row, "kode")) || null, name, score: sc, maxScore, note: text(get(row, "keterangan")) || null, suggestion: text(get(row, "kegiatan")) || null, issue });
  }
  return { rows, skipped };
}
