import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { accountKind, bidangName, kegiatanName } from "@/lib/apbdes/catalog";
import { analyzeDanaDesa, prohibitionsOf, type DdAnalysis, type DdLine, type Finding } from "./compliance";
import { addMonths, averageOutput, dueState, outputPct, stagePlan, type DueState, type OutputRow } from "./reports";
import { parseException, parsePublication, parseTag, parseYearSetting } from "./schema";
import { FOCUS, PROHIBITIONS, PUBLICATION_CHANNELS, isFocusKey, rulesFor, suggestFocus, type FocusKey } from "./rules";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export const LIMITS = { publicationsPerYear: 60, exceptionsPerYear: 300 } as const;

const docLabel = (version: number): string => (version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${version}`);
const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;
const dec = (v: Prisma.Decimal | null | undefined): number | null => (v === null || v === undefined ? null : Number(v.toFixed(2)));

export interface ChecklistItem {
  key: string;
  label: string;
  state: DueState;
  doneOn: string | null;
  due: string | null;
  /** true: dihitung otomatis dari data; false: dicatat operator lewat tanggal */
  auto: boolean;
  hint: string;
}

export interface Overview {
  year: number;
  rules: { basisYear: number; exact: boolean; sources: string[]; operationalCapPct: number; bltMaxMonthly: string; bltMaxMonths: number; pktdWageMinPct: number; kdmpSharePct: number };
  setting: { regular: string | null; kdmp: string | null; isMandiri: boolean; focusReportedOn: string | null; prevYearReportedOn: string | null; stage1ReportedOn: string | null; note: string | null };
  apbdes: { id: number; version: number; label: string; status: string; regulationDate: string | null } | null;
  apbdesOptions: { id: number; label: string; status: string }[];
  analysis: {
    spend: string;
    financing: string;
    total: string;
    nonKdmp: string;
    kdmpBudget: string;
    operational: string;
    operationalCap: string | null;
    operationalBps: number | null;
    byFocus: { focus: FocusKey; letter: string; label: string; budget: string; shareBps: number; activities: number }[];
    findings: Finding[];
    prohibitions: { ruleKey: string; no: number; text: string; basis: "KODE" | "KATA_KUNCI"; activityCode: string; accountCode: string; description: string; amount: string; exceptionReason: string | null }[];
  };
  activities: { activityCode: string; name: string; budget: string; focus: FocusKey | null; suggestion: FocusKey | null }[];
  exceptions: { id: number; ruleKey: string; activityCode: string; accountCode: string; reason: string }[];
  stages: { stage: 1 | 2; pct: number; amount: string }[] | null;
  checklist: ChecklistItem[];
  publications: { id: number; channel: string; channelLabel: string; publishedOn: string; location: string | null; note: string | null }[];
  outputs: { rows: { activityCode: string; bidang: string; name: string; outputName: string | null; volume: number | null; unit: string | null; realized: number | null; pct: number | null }[]; averagePct: number | null; filled: number; missing: number };
  terms: { focus: { key: FocusKey; letter: string; label: string }[]; prohibitions: { key: string; no: number; text: string }[]; channels: Record<string, string> };
}

async function pickDocument(db: Db, villageId: number, year: number, apbdesId?: number | null) {
  const docs = await db.apbdesDocument.findMany({ where: { villageId, year }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true, regulationDate: true } });
  const chosen = apbdesId ? docs.find((d) => d.id === apbdesId) : docs[0];
  return { docs, chosen: chosen ?? null, missing: Boolean(apbdesId) && !chosen };
}

export async function getOverview(db: Db, args: { villageId: number; year: number; apbdesId?: number | null; today: string }): Promise<Result<Overview>> {
  const { villageId, year } = args;
  if (!validYear(year)) return fail(400, "Tahun tidak valid.");
  const { docs, chosen, missing } = await pickDocument(db, villageId, year, args.apbdesId);
  if (missing) return fail(404, "Dokumen APB Desa tidak ditemukan pada tahun ini.");
  const { rules, exact } = rulesFor(year);

  const [setting, tags, exceptions, pubs, rkp, lines, plans] = await Promise.all([
    db.ddYearSetting.findUnique({ where: { villageId_year: { villageId, year } } }),
    db.ddFocusTag.findMany({ where: { villageId, year } }),
    db.ddRuleException.findMany({ where: { villageId, year }, orderBy: { id: "asc" } }),
    db.ddPublication.findMany({ where: { villageId, year }, orderBy: [{ publishedOn: "desc" }, { id: "desc" }] }),
    db.rkpdesDocument.findFirst({ where: { villageId, year, revision: 0 }, select: { legalDocument: { select: { enactedAt: true } } } }),
    chosen ? db.apbdesLine.findMany({ where: { documentId: chosen.id, villageId, fundSource: "DD" }, select: { activityCode: true, accountCode: true, description: true, amountCents: true, fundSource: true } }) : Promise.resolve([] as DdLine[]),
    db.apbdesActivityPlan.findMany({ where: { villageId, year }, select: { activityCode: true, location: true, outputName: true, outputVolume: true, outputUnit: true, realizedVolume: true } }),
  ]);

  const tagMap = new Map<string, FocusKey>();
  for (const t of tags) if (isFocusKey(t.focus)) tagMap.set(t.activityCode, t.focus);
  const excMap = new Map(exceptions.map((e) => [`${e.ruleKey}|${e.activityCode}|${e.accountCode}`, e.reason]));
  const a: DdAnalysis = analyzeDanaDesa({ rules, regularCents: setting?.regularCents ?? null, kdmpCents: setting?.kdmpCents ?? null, lines, tags: tagMap, exceptions: excMap, docVersion: chosen?.version ?? 0 });

  // Kegiatan bersumber DD (belanja) beserta penandaannya
  const perActivity = new Map<string, bigint>();
  for (const l of lines) if (accountKind(l.accountCode) === "BELANJA") perActivity.set(l.activityCode ?? "", (perActivity.get(l.activityCode ?? "") ?? 0n) + l.amountCents);
  const activities = [...perActivity].sort(([x], [y]) => x.localeCompare(y)).map(([code, cents]) => ({ activityCode: code, name: code ? (kegiatanName(code) ?? code) : "Tanpa kode kegiatan", budget: fromCents(cents), focus: tagMap.get(code) ?? null, suggestion: code ? suggestFocus(code) : null }));

  // Tenggat laporan penetapan fokus (Pasal 12) dari tanggal Perdes RKP Desa
  const perdesOn = isoDay(rkp?.legalDocument?.enactedAt ?? null);
  const focusDue = perdesOn ? addMonths(perdesOn, rules.focusReportMonths) : null;
  const adoptedOn = chosen?.status === "DITETAPKAN" ? isoDay(chosen.regulationDate) : null;
  const stage1Due = `${year}-${String(rules.stage1DocsDue.month).padStart(2, "0")}-${String(rules.stage1DocsDue.day).padStart(2, "0")}`;
  const focusReportedOn = isoDay(setting?.focusReportedOn ?? null);
  const prevOn = isoDay(setting?.prevYearReportedOn ?? null);
  const s1On = isoDay(setting?.stage1ReportedOn ?? null);
  const checklist: ChecklistItem[] = [
    { key: "perdes-apbdes", label: "Peraturan Desa tentang APB Desa ditetapkan", state: adoptedOn || chosen?.status === "DITETAPKAN" ? "done" : dueState(null, null, args.today), doneOn: adoptedOn, due: null, auto: true, hint: "Syarat penyaluran tahap I (PMK 7/2026 Pasal 24)." },
    { key: "laporan-lalu", label: `Laporan realisasi penyerapan dan capaian keluaran Dana Desa ${year - 1}`, state: dueState(stage1Due, prevOn, args.today), doneOn: prevOn, due: stage1Due, auto: false, hint: "Syarat penyaluran tahap I; dokumen diterima paling lambat tanggal tertera (Pasal 24)." },
    { key: "laporan-fokus", label: "Laporan penetapan fokus penggunaan Dana Desa ke Menteri", state: dueState(focusDue, focusReportedOn, args.today), doneOn: focusReportedOn, due: focusDue, auto: false, hint: perdesOn ? `Paling lambat ${rules.focusReportMonths} bulan sejak Perdes RKP Desa ditetapkan (${perdesOn}); lampirkan Perdes RKP Desa dan Perdes APB Desa (Permendesa 16/2025 Pasal 12).` : "Tenggatnya dihitung dari tanggal Perdes RKP Desa; hubungkan Perdes pada dokumen RKP Desa tahun ini." },
    { key: "laporan-tahap1", label: "Laporan realisasi penyerapan dan capaian keluaran tahap I", state: dueState(null, s1On, args.today), doneOn: s1On, due: null, auto: false, hint: "Syarat penyaluran tahap II; waktunya mengikuti ketentuan langkah akhir tahun (Pasal 24)." },
  ];

  // Publikasi wajib sejak APB Desa ditetapkan (Pasal 10); sanksi Pasal 11
  const pubItems = pubs.map((p) => ({ id: p.id, channel: p.channel, channelLabel: PUBLICATION_CHANNELS[p.channel as keyof typeof PUBLICATION_CHANNELS] ?? p.channel, publishedOn: isoDay(p.publishedOn)!, location: p.location, note: p.note }));
  const findings = [...a.findings];
  if (chosen?.status === "DITETAPKAN" && a.spendCents > 0n && !pubItems.length) findings.push({ code: "NOT_PUBLISHED", level: "WARN", message: "Belum ada bukti publikasi fokus penggunaan Dana Desa. Publikasi wajib sejak APB Desa ditetapkan; yang tidak mempublikasikan kehilangan wewenang mengalokasikan dana operasional (3%) pada tahun berikutnya.", ref: "Permendesa 16/2025 Pasal 10-11" });
  if (focusDue && !focusReportedOn && focusDue < args.today) findings.push({ code: "FOCUS_REPORT_LATE", level: "WARN", message: `Laporan penetapan fokus ke Menteri melewati tenggat ${focusDue}.`, ref: "Permendesa 16/2025 Pasal 12 ayat 5" });

  // Capaian keluaran dari DPA (PMK 7/2026 Pasal 25)
  const planBy = new Map(plans.map((p) => [p.activityCode, p]));
  const outRows: OutputRow[] = [...perActivity.keys()].filter(Boolean).sort().map((code) => {
    const p = planBy.get(code);
    const volume = dec(p?.outputVolume);
    const realized = dec(p?.realizedVolume);
    return { activityCode: code, outputName: p?.outputName ?? null, volume, unit: p?.outputUnit ?? null, realized, pct: outputPct(volume, realized) };
  });
  const avg = averageOutput(outRows);

  return ok<Overview>({
    year,
    rules: { basisYear: rules.year, exact, sources: rules.sources, operationalCapPct: rules.operationalCapBps / 100, bltMaxMonthly: fromCents(rules.bltMaxMonthlyCents), bltMaxMonths: rules.bltMaxMonthsAtOnce, pktdWageMinPct: rules.pktdWageMinPct, kdmpSharePct: rules.kdmpShareBps / 100 },
    setting: { regular: setting?.regularCents == null ? null : fromCents(setting.regularCents), kdmp: setting?.kdmpCents == null ? null : fromCents(setting.kdmpCents), isMandiri: setting?.isMandiri ?? false, focusReportedOn, prevYearReportedOn: prevOn, stage1ReportedOn: s1On, note: setting?.note ?? null },
    apbdes: chosen ? { id: chosen.id, version: chosen.version, label: docLabel(chosen.version), status: chosen.status, regulationDate: isoDay(chosen.regulationDate) } : null,
    apbdesOptions: docs.map((d) => ({ id: d.id, label: docLabel(d.version), status: d.status })),
    analysis: {
      spend: fromCents(a.spendCents),
      financing: fromCents(a.financingCents),
      total: fromCents(a.totalCents),
      nonKdmp: fromCents(a.nonKdmpCents),
      kdmpBudget: fromCents(a.kdmpBudgetCents),
      operational: fromCents(a.operationalCents),
      operationalCap: a.operationalCapCents === null ? null : fromCents(a.operationalCapCents),
      operationalBps: a.operationalBps,
      byFocus: a.byFocus.map((f) => ({ focus: f.focus, letter: f.letter, label: f.label, budget: fromCents(f.budgetCents), shareBps: f.shareBps, activities: f.activities })),
      findings,
      prohibitions: a.prohibitions.map((h) => ({ ruleKey: h.ruleKey, no: h.no, text: h.text, basis: h.basis, activityCode: h.activityCode, accountCode: h.accountCode, description: h.description, amount: fromCents(h.amountCents), exceptionReason: h.exceptionReason })),
    },
    activities,
    exceptions: exceptions.map((e) => ({ id: e.id, ruleKey: e.ruleKey, activityCode: e.activityCode, accountCode: e.accountCode, reason: e.reason })),
    stages: (() => {
      const s = stagePlan(rules, setting?.regularCents ?? null, setting?.isMandiri ?? false);
      return s ? s.map((x) => ({ stage: x.stage, pct: x.pct, amount: fromCents(x.cents) })) : null;
    })(),
    checklist,
    publications: pubItems,
    outputs: { rows: outRows.map((r) => ({ ...r, bidang: bidangName(r.activityCode.slice(0, 1)) ?? "", name: kegiatanName(r.activityCode) ?? r.activityCode })), averagePct: avg.averagePct, filled: avg.filled, missing: avg.missing },
    terms: { focus: (Object.keys(FOCUS) as FocusKey[]).map((key) => ({ key, letter: FOCUS[key].letter, label: FOCUS[key].label })), prohibitions: PROHIBITIONS.map((p) => ({ key: p.key, no: p.no, text: p.text })), channels: { ...PUBLICATION_CHANNELS } },
  });
}

// ---- Pengaturan tahun

export async function saveYearSetting(db: PrismaClient, args: { villageId: number; year: number; input: unknown }): Promise<Result<{ id: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const p = parseYearSetting(args.input);
  if (!p.ok) return invalid(p);
  const data = p.value;
  const row = await db.ddYearSetting.upsert({ where: { villageId_year: { villageId: args.villageId, year: args.year } }, create: { villageId: args.villageId, year: args.year, ...data }, update: data });
  return ok({ id: row.id });
}

// ---- Penandaan fokus

export async function setFocusTag(db: PrismaClient, args: { villageId: number; year: number; input: unknown }): Promise<Result<{ activityCode: string }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const p = parseTag(args.input);
  if (!p.ok) return invalid(p);
  const { activityCode, focus } = p.value;
  await db.ddFocusTag.upsert({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode } }, create: { villageId: args.villageId, year: args.year, activityCode, focus }, update: { focus } });
  return ok({ activityCode });
}

export async function clearFocusTag(db: PrismaClient, args: { villageId: number; year: number; activityCode: string }): Promise<Result<{ activityCode: string }>> {
  const r = await db.ddFocusTag.deleteMany({ where: { villageId: args.villageId, year: args.year, activityCode: args.activityCode } });
  return r.count ? ok({ activityCode: args.activityCode }) : fail(404, "Penandaan tidak ditemukan.");
}

// ---- Pengecualian larangan

export async function addException(db: PrismaClient, args: { villageId: number; year: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; ruleKey: string; activityCode: string; accountCode: string; reason: string }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const p = parseException(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  // Hanya untuk baris Dana Desa yang benar-benar ada pada APB Desa tahun ini DAN yang memang terindikasi melanggar aturan itu.
  const lines = await db.apbdesLine.findMany({ where: { villageId: args.villageId, fundSource: "DD", accountCode: v.accountCode, activityCode: v.activityCode || null, document: { villageId: args.villageId, year: args.year } }, select: { activityCode: true, accountCode: true, description: true, amountCents: true, fundSource: true } });
  if (!lines.length) return fail(404, "Baris anggaran Dana Desa dengan kegiatan dan rekening itu tidak ditemukan pada APB Desa tahun ini.");
  const { rules } = rulesFor(args.year);
  if (!lines.some((l) => prohibitionsOf(l, rules).some((h) => h.ruleKey === v.ruleKey))) return fail(409, "Baris anggaran itu tidak terindikasi larangan tersebut, jadi tidak perlu pengecualian.");
  if (await db.ddRuleException.findUnique({ where: { villageId_year_ruleKey_activityCode_accountCode: { villageId: args.villageId, year: args.year, ruleKey: v.ruleKey, activityCode: v.activityCode, accountCode: v.accountCode } }, select: { id: true } })) return fail(409, "Pengecualian untuk baris ini sudah tercatat. Cabut dulu bila alasannya perlu diganti, agar riwayatnya terjaga.");
  if ((await db.ddRuleException.count({ where: { villageId: args.villageId, year: args.year } })) >= LIMITS.exceptionsPerYear) return fail(409, `Pengecualian maksimal ${LIMITS.exceptionsPerYear} per tahun.`);
  try {
    const row = await db.ddRuleException.create({ data: { villageId: args.villageId, year: args.year, ruleKey: v.ruleKey, activityCode: v.activityCode, accountCode: v.accountCode, reason: v.reason, createdById: args.userId } });
    return ok({ id: row.id, ruleKey: v.ruleKey, activityCode: v.activityCode, accountCode: v.accountCode, reason: v.reason });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Pengecualian untuk baris ini sudah tercatat.");
    throw e;
  }
}

export async function removeException(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ id: number; ruleKey: string; activityCode: string; accountCode: string; reason: string }>> {
  const row = await db.ddRuleException.findFirst({ where: { id: args.id, villageId: args.villageId } });
  if (!row) return fail(404, "Pengecualian tidak ditemukan.");
  const r = await db.ddRuleException.deleteMany({ where: { id: row.id, villageId: args.villageId } });
  return r.count ? ok({ id: row.id, ruleKey: row.ruleKey, activityCode: row.activityCode, accountCode: row.accountCode, reason: row.reason }) : fail(404, "Pengecualian tidak ditemukan.");
}

// ---- Bukti publikasi

export async function addPublication(db: PrismaClient, args: { villageId: number; year: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const p = parsePublication(args.input);
  if (!p.ok) return invalid(p);
  if ((await db.ddPublication.count({ where: { villageId: args.villageId, year: args.year } })) >= LIMITS.publicationsPerYear) return fail(409, `Bukti publikasi maksimal ${LIMITS.publicationsPerYear} per tahun.`);
  const row = await db.ddPublication.create({ data: { villageId: args.villageId, year: args.year, channel: p.value.channel, publishedOn: p.value.publishedOn, location: p.value.location, note: p.value.note, createdById: args.userId } });
  return ok({ id: row.id });
}

export async function removePublication(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  const r = await db.ddPublication.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok({ id: args.id }) : fail(404, "Bukti publikasi tidak ditemukan.");
}

// ---- Daftar publikasi (nama kegiatan, lokasi, besaran; Pasal 10 ayat 2)

export interface PublicItem {
  activityCode: string;
  name: string;
  location: string | null;
  amount: string;
}

export async function publicList(db: Db, args: { villageId: number; year: number; apbdesId?: number | null }): Promise<Result<{ label: string | null; status: string | null; items: PublicItem[]; total: string }>> {
  const { chosen, missing } = await pickDocument(db, args.villageId, args.year, args.apbdesId);
  if (missing) return fail(404, "Dokumen APB Desa tidak ditemukan pada tahun ini.");
  if (!chosen) return ok({ label: null, status: null, items: [], total: "0.00" });
  const [lines, plans, rkp] = await Promise.all([
    db.apbdesLine.findMany({ where: { documentId: chosen.id, villageId: args.villageId, fundSource: "DD" }, select: { activityCode: true, accountCode: true, amountCents: true } }),
    db.apbdesActivityPlan.findMany({ where: { villageId: args.villageId, year: args.year }, select: { activityCode: true, location: true } }),
    db.rkpdesActivity.findMany({ where: { document: { villageId: args.villageId, year: args.year }, activityCode: { not: null }, location: { not: null } }, select: { activityCode: true, location: true }, orderBy: { id: "asc" } }),
  ]);
  const loc = new Map<string, string>();
  for (const x of rkp) if (x.activityCode && x.location && !loc.has(x.activityCode)) loc.set(x.activityCode, x.location);
  for (const p of plans) if (p.location) loc.set(p.activityCode, p.location);
  const sum = new Map<string, bigint>();
  for (const l of lines) if (accountKind(l.accountCode) === "BELANJA" && l.activityCode) sum.set(l.activityCode, (sum.get(l.activityCode) ?? 0n) + l.amountCents);
  const items = [...sum].sort(([a], [b]) => a.localeCompare(b)).map(([code, c]) => ({ activityCode: code, name: kegiatanName(code) ?? code, location: loc.get(code) ?? null, amount: fromCents(c) }));
  return ok({ label: docLabel(chosen.version), status: chosen.status, items, total: fromCents([...sum.values()].reduce((s, c) => s + c, 0n)) });
}
