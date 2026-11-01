/** Validasi impor IDM di server (ketat; berkas dibaca di peramban, server menerima baris terpilih saja). */
import { isRecord, type Parsed } from "@/lib/form-input";
import { bad, blank, digits, has, notRecord, optText, posInt } from "@/lib/pengadaan/input";
import { parseScore } from "./map";
import { isDimension, isLayout, LIMITS, type Dimension, type Layout } from "./catalog";

export interface SummaryInput {
  iks: number | null;
  ike: number | null;
  ikl: number | null;
  idm: number | null;
  status: string | null;
}
export interface IndicatorInput {
  dimension: Dimension;
  code: string | null;
  name: string;
  score: number;
  maxScore: number | null;
  note: string | null;
  suggestion: string | null;
}
export interface ImportInput {
  year: number;
  layout: Layout;
  fileName: string | null;
  summary: SummaryInput | null;
  indicators: IndicatorInput[];
}

function score(v: unknown, key: string, label: string, fe: Record<string, string>, allowZero = true): number | null {
  if (blank(v)) return null;
  if (typeof v !== "number" && typeof v !== "string") {
    fe[key] = `${label} tidak valid.`;
    return null;
  }
  const n = parseScore(v);
  if (n === null || n < 0 || n > LIMITS.maxScore || (!allowZero && n === 0)) {
    fe[key] = `${label} harus angka antara 0 dan ${LIMITS.maxScore}.`;
    return null;
  }
  return n;
}

export function parseImport(body: unknown, thisYear = new Date().getFullYear()): Parsed<ImportInput> {
  if (!isRecord(body)) return notRecord();
  const fe: Record<string, string> = {};
  const year = digits(body.year) ?? NaN;
  if (!Number.isInteger(year) || year < 2010 || year > thisYear + 1) fe.year = `Isi tahun antara 2010 dan ${thisYear + 1}.`;
  if (!isLayout(body.layout)) fe.layout = "Pilih jenis berkas.";
  const fileName = optText(body, "fileName", 200, "Nama berkas", fe);
  let summary: SummaryInput | null = null;
  const indicators: IndicatorInput[] = [];
  if (body.layout === "SUMMARY") {
    const s = isRecord(body.summary) ? body.summary : null;
    if (!s) fe.summary = "Data skor desa tidak ada.";
    else {
      const out: SummaryInput = { iks: score(s.iks, "iks", "IKS", fe), ike: score(s.ike, "ike", "IKE", fe), ikl: score(s.ikl, "ikl", "IKL", fe), idm: score(s.idm, "idm", "Nilai IDM", fe), status: null };
      const st = optText(s, "status", 40, "Status", fe);
      out.status = st;
      if (out.iks === null && out.ike === null && out.ikl === null && out.idm === null && !st && !Object.keys(fe).length) fe.summary = "Isi paling sedikit satu skor atau status.";
      summary = out;
    }
  } else if (body.layout === "INDICATORS") {
    const list = Array.isArray(body.indicators) ? body.indicators : null;
    if (!list || !list.length) fe.indicators = "Tidak ada indikator untuk disimpan.";
    else if (list.length > LIMITS.indicatorsPerYear) fe.indicators = `Indikator maksimal ${LIMITS.indicatorsPerYear} per tahun.`;
    else {
      list.forEach((it, i) => {
        const e: Record<string, string> = {};
        // Nomor baris berkas asli (dikirim klien); bila tak ada, urutan dalam daftar.
        const row = isRecord(it) ? (posInt(it.row) ?? i + 1) : i + 1;
        const at = `indicators.${i}`;
        if (!isRecord(it)) {
          fe[at] = `Baris ${row} di berkas: data tidak valid`;
          return;
        }
        const name = typeof it.name === "string" ? it.name.replace(/\s+/g, " ").trim() : "";
        if (!name || name.length > 300) e.name = "nama indikator wajib (maksimal 300 karakter)";
        const sc = score(it.score, "score", "Skor", e);
        if (sc === null && !e.score) e.score = "skor wajib diisi";
        const mx = score(it.maxScore, "maxScore", "Skor maksimal", e, false);
        if (sc !== null && mx !== null && sc > mx) e.score = `skor (${sc}) melebihi skor maksimal (${mx})`;
        const dim = blank(it.dimension) ? "LAIN" : it.dimension;
        if (!isDimension(dim)) e.dimension = "dimensi tidak dikenal";
        const code = optText(it, "code", 30, "Kode", e);
        const note = optText(it, "note", 500, "Keterangan", e);
        const suggestion = optText(it, "suggestion", 1000, "Rekomendasi", e);
        if (Object.keys(e).length) fe[at] = `Baris ${row} di berkas${name ? ` (${name.slice(0, 40)})` : ""}: ${Object.values(e).map((x) => x.replace(/\.+$/, "").replace(/^./, (c) => c.toLowerCase())).join("; ")}`;
        else indicators.push({ dimension: dim as Dimension, code, name, score: sc!, maxScore: mx, note, suggestion });
      });
    }
  }
  if (has(body, "layout") && Object.keys(fe).length) return bad(fe);
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { year, layout: body.layout as Layout, fileName, summary, indicators } };
}
