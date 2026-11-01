/**
 * Pemeriksaan kepatuhan penggunaan Dana Desa terhadap APB Desa. Murni (tanpa Prisma), aman untuk klien.
 * Sumber aturan: lib/dana-desa/rules.ts (berversi per tahun). Uang dalam sen (BigInt).
 * Pemeriksaan larangan bersifat INDIKASI: berdasar kode rekening (pasti) atau kata kunci uraian (perkiraan);
 * operator dapat menyatakan pengecualian dengan alasan, dan itu tercatat.
 */
import { accountKind, kegiatanName } from "@/lib/apbdes/catalog";
import { FOCUS, FOCUS_KEYS, PROHIBITIONS, suggestFocus, type FocusKey, type ProhibitionKey, type YearRules } from "./rules";

export interface DdLine {
  activityCode: string | null;
  accountCode: string;
  description: string;
  amountCents: bigint;
  fundSource: string | null;
}

export const exceptionKey = (ruleKey: string, activityCode: string, accountCode: string): string => `${ruleKey}|${activityCode}|${accountCode}`;

export interface ProhibitionHit {
  ruleKey: ProhibitionKey;
  no: number;
  text: string;
  /** KODE: dari kode rekening (pasti). KATA_KUNCI: dari uraian (perkiraan, perlu dicek manusia). */
  basis: "KODE" | "KATA_KUNCI";
  activityCode: string;
  accountCode: string;
  description: string;
  amountCents: bigint;
  exceptionReason: string | null;
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ");
const OFFICIALS = /kepala desa|kades|perangkat|aparatur|bpd|badan permusyawaratan/;
const OFFICE = /(kantor|balai) desa/;

/** Larangan yang terindikasi pada satu baris anggaran bersumber Dana Desa. */
export function prohibitionsOf(line: DdLine, rules: YearRules): { ruleKey: ProhibitionKey; basis: "KODE" | "KATA_KUNCI" }[] {
  const out: { ruleKey: ProhibitionKey; basis: "KODE" | "KATA_KUNCI" }[] = [];
  const add = (ruleKey: ProhibitionKey, basis: "KODE" | "KATA_KUNCI") => {
    if (!out.some((o) => o.ruleKey === ruleKey)) out.push({ ruleKey, basis });
  };
  const d = norm(line.description);
  const c = line.accountCode;
  if (c.startsWith("5.1.1.") || c.startsWith("5.1.2.") || c.startsWith("5.1.4.")) add("L1", "KODE");
  else if (c.startsWith("5.2.2.") && OFFICIALS.test(d)) add("L1", "KATA_KUNCI");
  if (c === "5.2.3.02") add("L2", "KODE");
  else if (/perjalanan dinas/.test(d) && /luar (kabupaten|kota|daerah)/.test(d)) add("L2", "KATA_KUNCI");
  if (c.startsWith("5.1.3.")) add("L3", "KODE");
  else if (/bpjs|jaminan (sosial|kesehatan|ketenagakerjaan)/.test(d) && OFFICIALS.test(d)) add("L3", "KATA_KUNCI");
  if (OFFICE.test(d)) {
    if (/(pembangunan|membangun|bangun)/.test(d)) add("L4", "KATA_KUNCI");
    else if (/(rehab|renovasi|perbaikan|pemeliharaan)/.test(d) && line.amountCents > rules.officeRehabMaxCents) add("L4", "KATA_KUNCI");
  }
  if (/bimtek|bimbingan teknis/.test(d) && OFFICIALS.test(d)) add("L5", "KATA_KUNCI");
  if (/studi banding/.test(d) || (/bimtek|bimbingan teknis/.test(d) && /luar (kabupaten|kota|daerah)/.test(d))) add("L6", "KATA_KUNCI");
  if (/\b(utang|hutang|tunggakan)\b/.test(d) || /kewajiban.*tahun (lalu|sebelumnya)/.test(d)) add("L7", "KATA_KUNCI");
  if (/bantuan hukum/.test(d)) add("L8", "KATA_KUNCI");
  return out;
}

export function scanProhibitions(lines: DdLine[], rules: YearRules, exceptions: Map<string, string>): ProhibitionHit[] {
  const hits: ProhibitionHit[] = [];
  for (const l of lines) {
    for (const h of prohibitionsOf(l, rules)) {
      const p = PROHIBITIONS.find((x) => x.key === h.ruleKey)!;
      const act = l.activityCode ?? "";
      hits.push({ ruleKey: h.ruleKey, no: p.no, text: p.text, basis: h.basis, activityCode: act, accountCode: l.accountCode, description: l.description, amountCents: l.amountCents, exceptionReason: exceptions.get(exceptionKey(h.ruleKey, act, l.accountCode)) ?? null });
    }
  }
  return hits.sort((a, b) => a.no - b.no || a.activityCode.localeCompare(b.activityCode) || a.accountCode.localeCompare(b.accountCode));
}

export type Level = "ERROR" | "WARN" | "INFO";
export interface Finding {
  code: string;
  level: Level;
  message: string;
  /** Dasar hukum ringkas */
  ref?: string;
}

export interface FocusRow {
  focus: FocusKey;
  letter: string;
  label: string;
  budgetCents: bigint;
  shareBps: number;
  activities: number;
}
export interface UntaggedRow {
  activityCode: string;
  name: string;
  budgetCents: bigint;
  suggestion: FocusKey | null;
}
export interface DdAnalysis {
  /** Belanja bersumber DD pada dokumen yang dipilih */
  spendCents: bigint;
  /** Pengeluaran pembiayaan bersumber DD (6.2) */
  financingCents: bigint;
  totalCents: bigint;
  regularCents: bigint | null;
  kdmpCents: bigint | null;
  /** DD di luar KDMP dan KDMP yang dianggarkan */
  nonKdmpCents: bigint;
  kdmpBudgetCents: bigint;
  /** Batas operasional (3% pagu reguler); null bila pagu reguler belum diisi */
  operationalCapCents: bigint | null;
  operationalCents: bigint;
  /** Persentase operasional terhadap pagu reguler dalam basis poin; null bila pagu belum diisi */
  operationalBps: number | null;
  byFocus: FocusRow[];
  untagged: UntaggedRow[];
  prohibitions: ProhibitionHit[];
  findings: Finding[];
}

export interface DdInput {
  rules: YearRules;
  regularCents: bigint | null;
  kdmpCents: bigint | null;
  /** Hanya baris bersumber Dana Desa (fundSource "DD") */
  lines: DdLine[];
  /** kode kegiatan → fokus */
  tags: Map<string, FocusKey>;
  exceptions: Map<string, string>;
  /** Nomor versi dokumen APB Desa yang diperiksa (0 = APB Desa awal) */
  docVersion: number;
}

const rp = (c: bigint): string => `Rp${new Intl.NumberFormat("id-ID").format(c / 100n)}`;
const bps = (part: bigint, whole: bigint): number => (whole > 0n ? Number((part * 10000n) / whole) : 0);

export function analyzeDanaDesa(input: DdInput): DdAnalysis {
  const { rules, regularCents, kdmpCents, tags } = input;
  let spend = 0n;
  let financing = 0n;
  const belanja: DdLine[] = [];
  for (const l of input.lines) {
    const kind = accountKind(l.accountCode);
    if (kind === "BELANJA") {
      spend += l.amountCents;
      belanja.push(l);
    } else if (kind === "PEMBIAYAAN" && l.accountCode.startsWith("6.2.")) financing += l.amountCents;
  }
  const total = spend + financing;

  const perActivity = new Map<string, bigint>();
  for (const l of belanja) {
    const k = l.activityCode ?? "";
    perActivity.set(k, (perActivity.get(k) ?? 0n) + l.amountCents);
  }
  const focusSum = new Map<FocusKey, { cents: bigint; n: number }>();
  const untagged: UntaggedRow[] = [];
  for (const [code, cents] of [...perActivity].sort(([a], [b]) => a.localeCompare(b))) {
    const f = tags.get(code);
    if (!f) {
      untagged.push({ activityCode: code, name: code ? (kegiatanName(code) ?? code) : "Tanpa kode kegiatan", budgetCents: cents, suggestion: code ? suggestFocus(code) : null });
      continue;
    }
    const cur = focusSum.get(f) ?? { cents: 0n, n: 0 };
    focusSum.set(f, { cents: cur.cents + cents, n: cur.n + 1 });
  }
  const byFocus: FocusRow[] = FOCUS_KEYS.map((focus) => {
    const s = focusSum.get(focus);
    return { focus, letter: FOCUS[focus].letter, label: FOCUS[focus].label, budgetCents: s?.cents ?? 0n, shareBps: bps(s?.cents ?? 0n, spend), activities: s?.n ?? 0 };
  });

  const kdmpBudget = focusSum.get("KDMP")?.cents ?? 0n;
  const operational = focusSum.get("OPERASIONAL")?.cents ?? 0n;
  const nonKdmp = total - kdmpBudget;
  const cap = regularCents === null ? null : (regularCents * BigInt(rules.operationalCapBps)) / 10000n;
  const prohibitions = scanProhibitions(belanja, rules, input.exceptions);

  const findings: Finding[] = [];
  if (regularCents === null && kdmpCents === null) findings.push({ code: "NO_CEILING", level: "INFO", message: "Pagu Dana Desa tahun ini belum diisi, jadi batas anggaran dan batas operasional belum dapat diperiksa. Isi dari keputusan pagu yang berlaku." });
  if (regularCents !== null && nonKdmp > regularCents) findings.push({ code: "OVER_REGULAR", level: "ERROR", message: `Dana Desa di luar KDMP yang dianggarkan (${rp(nonKdmp)}) melebihi pagu reguler (${rp(regularCents)}) sebesar ${rp(nonKdmp - regularCents)}.`, ref: "PMK 7/2026 Pasal 15" });
  if (kdmpCents !== null && kdmpBudget > kdmpCents) findings.push({ code: "OVER_KDMP", level: "ERROR", message: `Anggaran KDMP (${rp(kdmpBudget)}) melebihi pagu KDMP (${rp(kdmpCents)}).`, ref: "PMK 7/2026 Pasal 15 ayat 3" });
  if (regularCents !== null && nonKdmp < regularCents && total > 0n) findings.push({ code: "UNALLOCATED", level: "INFO", message: `Pagu reguler masih tersisa ${rp(regularCents - nonKdmp)} yang belum dianggarkan.` });
  if (cap !== null && operational > cap) findings.push({ code: "OPS_OVER", level: "ERROR", message: `Operasional Pemerintah Desa (${rp(operational)}) melebihi batas ${input.rules.operationalCapBps / 100}% pagu reguler (${rp(cap)}).`, ref: "Permendesa 16/2025 Pasal 2 ayat 3; PMK 7/2026 Pasal 20 ayat 5" });
  if (cap === null && operational > 0n) findings.push({ code: "OPS_NO_CEILING", level: "INFO", message: `Operasional Pemerintah Desa ${rp(operational)} belum dapat dibandingkan dengan batas ${input.rules.operationalCapBps / 100}% karena pagu reguler belum diisi.` });
  if (untagged.length) findings.push({ code: "UNTAGGED", level: "WARN", message: `${untagged.length} kegiatan bersumber Dana Desa (${rp(untagged.reduce((s, u) => s + u.budgetCents, 0n))}) belum ditandai fokus penggunaannya.`, ref: "Permendesa 16/2025 Pasal 2" });
  if (kdmpCents !== null && kdmpCents > 0n && kdmpBudget === 0n) findings.push({ code: "KDMP_NOT_BUDGETED", level: "WARN", message: `Pagu KDMP ${rp(kdmpCents)} belum dianggarkan. Dukungan KDMP dialokasikan dalam perubahan APB Desa setelah penyaluran.`, ref: "Permendesa 16/2025 Pasal 2 ayat 2" });
  if (kdmpBudget > 0n && input.docVersion === 0) findings.push({ code: "KDMP_IN_BASE", level: "INFO", message: "Anggaran KDMP berada di APB Desa awal. Menurut aturan, dukungan KDMP dialokasikan dalam perubahan APB Desa setelah penyaluran; pastikan sesuai arahan kabupaten.", ref: "Permendesa 16/2025 Pasal 2 ayat 2" });
  const open = prohibitions.filter((h) => !h.exceptionReason);
  const byCode = open.filter((h) => h.basis === "KODE");
  if (byCode.length) findings.push({ code: "PROHIBITED_CODE", level: "ERROR", message: `${byCode.length} baris anggaran memakai rekening yang tidak boleh dibiayai Dana Desa. Pindahkan ke sumber dana lain (mis. ADD) atau nyatakan pengecualian beralasan.`, ref: "Permendesa 16/2025 Lampiran II.J" });
  const byWord = open.filter((h) => h.basis === "KATA_KUNCI");
  if (byWord.length) findings.push({ code: "PROHIBITED_WORD", level: "WARN", message: `${byWord.length} baris anggaran uraiannya terindikasi larangan penggunaan Dana Desa. Periksa uraiannya; bila memang diperbolehkan, catat pengecualian beserta alasannya.`, ref: "Permendesa 16/2025 Lampiran II.J" });

  return {
    spendCents: spend,
    financingCents: financing,
    totalCents: total,
    regularCents,
    kdmpCents,
    nonKdmpCents: nonKdmp,
    kdmpBudgetCents: kdmpBudget,
    operationalCapCents: cap,
    operationalCents: operational,
    operationalBps: regularCents && regularCents > 0n ? bps(operational, regularCents) : null,
    byFocus,
    untagged,
    prohibitions,
    findings,
  };
}
