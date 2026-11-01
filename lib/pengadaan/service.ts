/**
 * Pengadaan barang/jasa desa: paket per kegiatan APB Desa, TPK, penawaran, negosiasi, SPK, BAST.
 * Tautan ke SPP/panjar hanya MEMBACA (tidak mengubah alur SPP). Semua penulisan memegang kunci procurement_settings desa
 * sebagai pernyataan pertama transaksi (MySQL REPEATABLE READ), sehingga nomor paket, pagu anggaran, dan pagar status serial.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { accountKind, accountName, kegiatanName } from "@/lib/apbdes/catalog";
import { ELEMENTS, LIMITS, METHODS, MODES, ROLES, STATUS, type Status } from "./catalog";
import {
  availableFor,
  committedValue,
  effectivePrice,
  lowestPassed,
  nameKey,
  minOffers,
  negotiationRequired,
  packageFindings,
  sppFindings,
  suggestMethod,
  tpkProblems,
  transitionBlockers,
  type BudgetPackage,
  type Finding,
  type MethodLimits,
  type PackageFacts,
  type SppFact,
} from "./calc";
import { ALWAYS_KEYS, BAST_KEYS, CONTRACT_LATE_OK, NEGOTIATION_KEYS, STRUCTURAL, parseMember, parseOffer, parsePackageCreate, parsePackagePatch, parseSetting, type PackagePatch } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {
  constructor(
    msg: string,
    readonly all: string[] = [msg],
  ) {
    super(msg);
  }
}
const stop = (msg: string, all?: string[]): never => {
  throw new Stop(msg, all);
};
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(409, ...e.all);
  throw e;
};
const money = (c: bigint | null): string | null => (c === null ? null : fromCents(c));
const docLabel = (version: number): string => (version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${version}`);
const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;

async function ensureLock(db: PrismaClient, villageId: number) {
  await db.procurementSetting.createMany({ data: [{ villageId }], skipDuplicates: true });
}
/** Kunci desa. HARUS pernyataan pertama dalam transaksi. */
async function lock(tx: Db, villageId: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM procurement_settings WHERE villageId = ${villageId} FOR UPDATE`;
  if (!rows.length) stop("Data pengadaan desa belum siap. Muat ulang halaman lalu coba lagi.");
}

// ───────────── anggaran dan SPP (hanya baca) ─────────────

interface Budget {
  doc: { id: number; version: number; label: string } | null;
  /** pagu belanja per kegiatan; null bila tak ada APB Desa ditetapkan */
  pagu: Map<string, bigint> | null;
}
async function loadBudget(db: Db, villageId: number, year: number): Promise<Budget> {
  const doc = await db.apbdesDocument.findFirst({ where: { villageId, year, status: "DITETAPKAN" }, orderBy: { version: "desc" }, select: { id: true, version: true } });
  if (!doc) return { doc: null, pagu: null };
  const lines = await db.apbdesLine.findMany({ where: { documentId: doc.id, villageId, activityCode: { not: null } }, select: { activityCode: true, accountCode: true, amountCents: true } });
  const pagu = new Map<string, bigint>();
  for (const l of lines) if (l.activityCode && accountKind(l.accountCode) === "BELANJA") pagu.set(l.activityCode, (pagu.get(l.activityCode) ?? 0n) + l.amountCents);
  return { doc: { id: doc.id, version: doc.version, label: docLabel(doc.version) }, pagu };
}

interface SppRow extends SppFact {
  activityCode: string;
  paidAt: string | null;
  year: number;
}
async function loadSpp(db: Db, villageId: number, year: number, activityCodes?: string[]): Promise<SppRow[]> {
  const reqs = await db.apbdesPayRequest.findMany({
    where: { villageId, year, sourceKind: null, ...(activityCodes ? { activityCode: { in: activityCodes } } : {}) },
    orderBy: { number: "asc" },
    take: 2000,
    select: { id: true, number: true, activityCode: true, mode: true, status: true, hasReceipt: true, paidAt: true },
  });
  if (!reqs.length) return [];
  const sums = await db.apbdesPayRequestLine.groupBy({ by: ["requestId"], where: { requestId: { in: reqs.map((r) => r.id) } }, _sum: { amountCents: true } });
  const total = new Map(sums.map((s) => [s.requestId, s._sum.amountCents ?? 0n]));
  return reqs.map((r) => ({ id: r.id, number: r.number, activityCode: r.activityCode, mode: r.mode, status: r.status, hasReceipt: r.hasReceipt, paidAt: isoDay(r.paidAt), totalCents: total.get(r.id) ?? 0n, year }));
}

// ───────────── pemuatan paket ─────────────

type PkgFull = Prisma.ProcurementPackageGetPayload<{ include: { team: true; offers: true } }>;
const FULL = { team: { orderBy: [{ id: "asc" }] }, offers: { orderBy: [{ id: "asc" }] } } as const satisfies Prisma.ProcurementPackageInclude;

const limitsOf = (s: { directLimitCents: bigint | null; offerLimitCents: bigint | null } | null): MethodLimits => ({ directLimitCents: s?.directLimitCents ?? null, offerLimitCents: s?.offerLimitCents ?? null });

function factsOf(p: PkgFull, availableCents: bigint | null, hasBudgetDoc: boolean): PackageFacts {
  const conflicts = conflictIds(p);
  return {
    mode: p.mode as PackageFacts["mode"],
    method: p.method as PackageFacts["method"],
    status: p.status as Status,
    hpsCents: p.hpsCents,
    executorName: p.executorName,
    executorTitle: p.executorTitle,
    tpkDecreeNumber: p.tpkDecreeNumber,
    tpkDecreeDate: isoDay(p.tpkDecreeDate),
    planAnnouncedOn: isoDay(p.planAnnouncedOn),
    resultAnnouncedOn: isoDay(p.resultAnnouncedOn),
    handoverToHeadOn: isoDay(p.handoverToHeadOn),
    singleProviderReason: p.singleProviderReason,
    negotiationNumber: p.negotiationNumber,
    negotiationDate: isoDay(p.negotiationDate),
    contractNumber: p.contractNumber,
    contractDate: isoDay(p.contractDate),
    contractCents: p.contractCents,
    bastNumber: p.bastNumber,
    bastDate: isoDay(p.bastDate),
    bastHandedBy: p.bastHandedBy,
    bastReceivedBy: p.bastReceivedBy,
    team: p.team.map((m) => ({ role: m.role as PackageFacts["team"][number]["role"], element: m.element as PackageFacts["team"][number]["element"] })),
    teamNames: p.team.map((m) => m.name),
    winnerName: p.offers.find((o) => o.isWinner)?.providerName ?? null,
    offers: p.offers.map((o) => ({ id: o.id, priceCents: o.priceCents, negotiatedCents: o.negotiatedCents, passed: o.passed, isWinner: o.isWinner, conflict: conflicts.has(o.id) })),
    availableCents,
    hasBudgetDoc,
  };
}
/** Penawaran yang penyedianya sama dengan anggota TPK atau Kasi/Kaur pelaksana (pertentangan kepentingan). */
function conflictIds(p: Pick<PkgFull, "team" | "offers" | "executorName">): Set<number> {
  const names = new Set(p.team.map((m) => nameKey(m.name)));
  if (p.executorName) names.add(nameKey(p.executorName));
  return new Set(p.offers.filter((o) => names.has(nameKey(o.providerName))).map((o) => o.id));
}
const budgetPkg = (p: Pick<PkgFull, "id" | "activityCode" | "status" | "mode" | "contractCents" | "hpsCents">): BudgetPackage => ({ id: p.id, activityCode: p.activityCode, status: p.status as Status, mode: p.mode as BudgetPackage["mode"], contractCents: p.contractCents, hpsCents: p.hpsCents });

async function packageContext(db: Db, villageId: number, p: PkgFull) {
  const [budget, sameActivity, setting] = await Promise.all([
    loadBudget(db, villageId, p.year),
    db.procurementPackage.findMany({ where: { villageId, year: p.year, activityCode: p.activityCode }, select: { id: true, activityCode: true, status: true, mode: true, contractCents: true, hpsCents: true } }),
    db.procurementSetting.findUnique({ where: { villageId }, select: { directLimitCents: true, offerLimitCents: true, basisNote: true } }),
  ]);
  const available = availableFor(budget.pagu, sameActivity.map(budgetPkg), p);
  return { budget, available, setting, facts: factsOf(p, available, budget.doc !== null), sameActivity };
}

// ───────────── tampilan ─────────────

export interface PackageRow {
  id: number;
  year: number;
  number: number;
  title: string;
  activityCode: string;
  activityName: string;
  mode: string;
  modeLabel: string;
  method: string | null;
  methodLabel: string | null;
  hps: string;
  contract: string | null;
  status: string;
  statusLabel: string;
  providerName: string | null;
  warnCount: number;
  sppCount: number;
}
export interface UnpackagedRow {
  activityCode: string;
  activityName: string;
  sppCount: number;
  total: string;
  paid: string;
}
export interface PengadaanList {
  year: number;
  limits: { direct: string | null; offer: string | null; basisNote: string | null };
  packages: PackageRow[];
  /** Pembayaran (SPP biasa) pada kegiatan yang belum punya paket pengadaan aktif: hanya informasi. */
  unpackaged: UnpackagedRow[];
  totals: { count: number; value: string; byStatus: Record<string, number> };
  budgetDoc: string | null;
}

export async function listPackages(db: PrismaClient, args: { villageId: number; year: number }): Promise<Result<PengadaanList>> {
  const { villageId, year } = args;
  if (!validYear(year)) return fail(400, "Tahun tidak valid.");
  const [pkgs, setting, budget, spp] = await Promise.all([
    db.procurementPackage.findMany({ where: { villageId, year }, orderBy: [{ number: "asc" }], take: LIMITS.packagesPerYear, include: FULL }),
    db.procurementSetting.findUnique({ where: { villageId } }),
    loadBudget(db, villageId, year),
    loadSpp(db, villageId, year),
  ]);
  const lim = limitsOf(setting);
  const bpk = pkgs.map(budgetPkg);
  const sppBy = new Map<string, SppRow[]>();
  for (const s of spp) sppBy.set(s.activityCode, [...(sppBy.get(s.activityCode) ?? []), s]);
  const byStatus: Record<string, number> = {};
  let value = 0n;
  const packages: PackageRow[] = pkgs.map((p) => {
    const facts = factsOf(p, availableFor(budget.pagu, bpk, p), budget.doc !== null);
    const sp = sppBy.get(p.activityCode) ?? [];
    const sibling = pkgs.filter((x) => x.activityCode === p.activityCode && x.status !== "BATAL");
    const warns = [...packageFindings(facts, lim), ...sppFindings(sibling.map((x) => ({ status: x.status as Status, mode: x.mode as PackageFacts["mode"], title: x.title })), sp, sibling.reduce((t, x) => t + committedValue({ mode: x.mode as PackageFacts["mode"], contractCents: x.contractCents, hpsCents: x.hpsCents }), 0n))].filter((f) => f.level !== "INFO");
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    if (p.status !== "BATAL") value += committedValue(facts);
    const winner = p.offers.find((o) => o.isWinner);
    return {
      id: p.id,
      year: p.year,
      number: p.number,
      title: p.title,
      activityCode: p.activityCode,
      activityName: kegiatanName(p.activityCode) ?? p.activityCode,
      mode: p.mode,
      modeLabel: MODES[p.mode as keyof typeof MODES] ?? p.mode,
      method: p.method,
      methodLabel: p.method ? (METHODS[p.method as keyof typeof METHODS] ?? p.method) : null,
      hps: fromCents(p.hpsCents),
      contract: money(p.contractCents),
      status: p.status,
      statusLabel: STATUS[p.status as Status] ?? p.status,
      providerName: winner?.providerName ?? null,
      warnCount: warns.length,
      sppCount: sp.length,
    };
  });
  const active = new Set(pkgs.filter((p) => p.status !== "BATAL").map((p) => p.activityCode));
  const unpackaged: UnpackagedRow[] = [];
  for (const [code, rows] of sppBy) {
    const live = rows.filter((r) => r.status !== "DITOLAK");
    if (!live.length || active.has(code)) continue;
    unpackaged.push({
      activityCode: code,
      activityName: kegiatanName(code) ?? code,
      sppCount: live.length,
      total: fromCents(live.reduce((t, r) => t + r.totalCents, 0n)),
      paid: fromCents(live.filter((r) => r.status === "DIBAYAR").reduce((t, r) => t + r.totalCents, 0n)),
    });
  }
  unpackaged.sort((a, b) => a.activityCode.localeCompare(b.activityCode));
  return ok({
    year,
    limits: { direct: money(setting?.directLimitCents ?? null), offer: money(setting?.offerLimitCents ?? null), basisNote: setting?.basisNote ?? null },
    packages,
    unpackaged,
    totals: { count: packages.length, value: fromCents(value), byStatus },
    budgetDoc: budget.doc?.label ?? null,
  });
}

export interface Transition {
  to: string;
  label: string;
  blockers: string[];
}
export interface PackageDetail {
  id: number;
  year: number;
  number: number;
  activityCode: string;
  activityName: string;
  accountCode: string | null;
  accountName: string | null;
  title: string;
  scope: string | null;
  location: string | null;
  mode: string;
  modeLabel: string;
  method: string | null;
  methodLabel: string | null;
  hps: string;
  status: string;
  statusLabel: string;
  cancelReason: string | null;
  executorName: string | null;
  executorTitle: string | null;
  plannedStartOn: string | null;
  plannedEndOn: string | null;
  tpkDecreeNumber: string | null;
  tpkDecreeDate: string | null;
  planAnnouncedOn: string | null;
  resultAnnouncedOn: string | null;
  handoverToHeadOn: string | null;
  singleProviderReason: string | null;
  negotiation: { number: string | null; date: string | null; note: string | null; required: boolean };
  contract: { number: string | null; date: string | null; value: string | null; startOn: string | null; endOn: string | null };
  bast: { number: string | null; date: string | null; handedBy: string | null; receivedBy: string | null; note: string | null };
  progressPct: number;
  team: { id: number; name: string; role: string; roleLabel: string; element: string; elementLabel: string; position: string | null }[];
  offers: { id: number; providerName: string; providerAddress: string | null; offeredOn: string; price: string; passed: boolean; evaluationNote: string | null; negotiated: string | null; effective: string; isWinner: boolean; isLowest: boolean; conflict: boolean }[];
  minOffers: number;
  budget: { label: string | null; available: string | null } | null;
  limits: { direct: string | null; offer: string | null; basisNote: string | null };
  suggestedMethod: string | null;
  transitions: Transition[];
  findings: Finding[];
  spp: { id: number; number: number; status: string; mode: string; paidAt: string | null; total: string; hasReceipt: boolean; panjar: { holderName: string; given: string; dueAt: string } | null }[];
}

const NEXT_LABEL: Record<Status, string> = { PERSIAPAN: "Kembali ke persiapan", PEMILIHAN: "Mulai pemilihan penyedia", PELAKSANAAN: "Mulai pelaksanaan", SELESAI: "Tandai selesai (BAST)", BATAL: "Batalkan paket" };

export async function getPackage(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<PackageDetail>> {
  const p = await db.procurementPackage.findFirst({ where: { id: args.id, villageId: args.villageId }, include: FULL });
  if (!p) return fail(404, "Paket pengadaan tidak ditemukan.");
  const ctx = await packageContext(db, args.villageId, p);
  const lim = limitsOf(ctx.setting);
  const spp = await loadSpp(db, args.villageId, p.year, [p.activityCode]);
  const panjars = spp.length ? await db.apbdesPanjar.findMany({ where: { villageId: args.villageId, requestId: { in: spp.map((s) => s.id) } }, select: { requestId: true, holderName: true, givenCents: true, dueAt: true } }) : [];
  const panjarBy = new Map(panjars.map((x) => [x.requestId, x]));
  const siblings = ctx.sameActivity.filter((x) => x.status !== "BATAL");
  const findings = [
    ...packageFindings(ctx.facts, lim),
    ...sppFindings(siblings.map((x) => ({ status: x.status as Status, mode: x.mode as PackageFacts["mode"], title: "" })), spp, siblings.reduce((t, x) => t + committedValue({ mode: x.mode as PackageFacts["mode"], contractCents: x.contractCents, hpsCents: x.hpsCents }), 0n)),
  ];
  const lowest = new Set(lowestPassed(ctx.facts.offers).map((o) => o.id));
  const conflictSet = conflictIds(p);
  const status = p.status as Status;
  const targets: Status[] = status === "PERSIAPAN" ? (p.mode === "SWAKELOLA" ? ["PELAKSANAAN", "BATAL"] : ["PEMILIHAN", "BATAL"]) : status === "PEMILIHAN" ? ["PELAKSANAAN", "PERSIAPAN", "BATAL"] : status === "PELAKSANAAN" ? ["SELESAI", "BATAL"] : [];
  return ok<PackageDetail>({
    id: p.id,
    year: p.year,
    number: p.number,
    activityCode: p.activityCode,
    activityName: kegiatanName(p.activityCode) ?? p.activityCode,
    accountCode: p.accountCode,
    accountName: p.accountCode ? accountName(p.accountCode) : null,
    title: p.title,
    scope: p.scope,
    location: p.location,
    mode: p.mode,
    modeLabel: MODES[p.mode as keyof typeof MODES] ?? p.mode,
    method: p.method,
    methodLabel: p.method ? (METHODS[p.method as keyof typeof METHODS] ?? p.method) : null,
    hps: fromCents(p.hpsCents),
    status: p.status,
    statusLabel: STATUS[status] ?? p.status,
    cancelReason: p.cancelReason,
    executorName: p.executorName,
    executorTitle: p.executorTitle,
    plannedStartOn: isoDay(p.plannedStartOn),
    plannedEndOn: isoDay(p.plannedEndOn),
    tpkDecreeNumber: p.tpkDecreeNumber,
    tpkDecreeDate: isoDay(p.tpkDecreeDate),
    planAnnouncedOn: isoDay(p.planAnnouncedOn),
    resultAnnouncedOn: isoDay(p.resultAnnouncedOn),
    handoverToHeadOn: isoDay(p.handoverToHeadOn),
    singleProviderReason: p.singleProviderReason,
    negotiation: { number: p.negotiationNumber, date: isoDay(p.negotiationDate), note: p.negotiationNote, required: p.mode === "PENYEDIA" && p.method !== "PEMBELIAN_LANGSUNG" && negotiationRequired(ctx.facts.offers) },
    contract: { number: p.contractNumber, date: isoDay(p.contractDate), value: money(p.contractCents), startOn: isoDay(p.contractStartOn), endOn: isoDay(p.contractEndOn) },
    bast: { number: p.bastNumber, date: isoDay(p.bastDate), handedBy: p.bastHandedBy, receivedBy: p.bastReceivedBy, note: p.bastNote },
    progressPct: p.progressPct,
    team: p.team.map((m) => ({ id: m.id, name: m.name, role: m.role, roleLabel: ROLES[m.role as keyof typeof ROLES] ?? m.role, element: m.element, elementLabel: ELEMENTS[m.element as keyof typeof ELEMENTS] ?? m.element, position: m.position })),
    offers: p.offers.map((o) => ({ id: o.id, providerName: o.providerName, providerAddress: o.providerAddress, offeredOn: isoDay(o.offeredOn) ?? "", price: fromCents(o.priceCents), passed: o.passed, evaluationNote: o.evaluationNote, negotiated: money(o.negotiatedCents), effective: fromCents(effectivePrice(o)), isWinner: o.isWinner, isLowest: lowest.has(o.id), conflict: conflictSet.has(o.id) })),
    minOffers: minOffers(ctx.facts.method, p.singleProviderReason),
    budget: ctx.budget.doc ? { label: ctx.budget.doc.label, available: money(ctx.available) } : null,
    limits: { direct: money(ctx.setting?.directLimitCents ?? null), offer: money(ctx.setting?.offerLimitCents ?? null), basisNote: ctx.setting?.basisNote ?? null },
    suggestedMethod: suggestMethod(p.hpsCents, lim),
    transitions: targets.map((to) => ({ to, label: NEXT_LABEL[to], blockers: to === "BATAL" ? [] : transitionBlockers(to, ctx.facts) })),
    findings,
    spp: spp.map((s) => {
      const pj = panjarBy.get(s.id);
      return { id: s.id, number: s.number, status: s.status, mode: s.mode, paidAt: s.paidAt, total: fromCents(s.totalCents), hasReceipt: s.hasReceipt, panjar: pj ? { holderName: pj.holderName, given: fromCents(pj.givenCents), dueAt: isoDay(pj.dueAt) ?? "" } : null };
    }),
  });
}

// ───────────── penulisan ─────────────

const guardLocked = (status: string) => {
  if (status === "SELESAI" || status === "BATAL") stop("Paket yang sudah selesai atau dibatalkan tidak dapat diubah.");
};
async function mustPackage(tx: Db, villageId: number, id: number): Promise<PkgFull> {
  const p = await tx.procurementPackage.findFirst({ where: { id, villageId }, include: FULL });
  if (!p) return stop("Paket pengadaan tidak ditemukan.");
  return p;
}

export async function createPackage(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; year: number; number: number; title: string; activityCode: string; hps: string }>> {
  const parsed = parsePackageCreate(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      if ((await tx.procurementPackage.count({ where: { villageId: args.villageId, year: v.year } })) >= LIMITS.packagesPerYear) return stop(`Paket pengadaan maksimal ${LIMITS.packagesPerYear} per tahun.`);
      const last = await tx.procurementPackage.aggregate({ where: { villageId: args.villageId, year: v.year }, _max: { number: true } });
      const number = (last._max.number ?? 0) + 1;
      const row = await tx.procurementPackage.create({
        data: { villageId: args.villageId, year: v.year, number, activityCode: v.activityCode, accountCode: v.accountCode, title: v.title, scope: v.scope, location: v.location, mode: v.mode, method: v.method, hpsCents: v.hpsCents, executorName: v.executorName, executorTitle: v.executorTitle, plannedStartOn: v.plannedStartOn, plannedEndOn: v.plannedEndOn, createdById: args.userId },
      });
      return ok({ id: row.id, year: row.year, number, title: row.title, activityCode: row.activityCode, hps: fromCents(row.hpsCents) });
    })
    .catch(asResult);
}

const FIELD_LABEL: Record<string, string> = { mode: "Mode", method: "Metode", hpsCents: "HPS/RAB", activityCode: "Kegiatan", accountCode: "Rekening" };

export async function patchPackage(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ before: Record<string, unknown>; after: Record<string, unknown> }>> {
  const parsed = parsePackagePatch(args.input);
  if (!parsed.ok) return invalid(parsed);
  const patch = parsed.value;
  const keys = Object.keys(patch) as (keyof PackagePatch)[];
  if (!keys.length) return fail(400, "Tidak ada perubahan.");
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const p = await mustPackage(tx, args.villageId, args.id);
      const status = p.status as Status;
      const finalState = status === "SELESAI" || status === "BATAL";
      for (const k of keys) {
        if (finalState && !ALWAYS_KEYS.includes(k)) return stop("Paket yang sudah selesai atau dibatalkan hanya dapat memperbarui tanggal pengumuman dan penyerahan.");
        if (STRUCTURAL.includes(k) && status !== "PERSIAPAN") return stop(`${FIELD_LABEL[k] ?? k} hanya dapat diubah pada tahap persiapan.`);
        if (NEGOTIATION_KEYS.includes(k) && (p.mode !== "PENYEDIA" || (status !== "PEMILIHAN" && status !== "PELAKSANAAN"))) return stop("Negosiasi dan SPK hanya dicatat pada paket penyedia tahap pemilihan atau pelaksanaan.");
        if (NEGOTIATION_KEYS.includes(k) && status === "PELAKSANAAN" && !CONTRACT_LATE_OK.includes(k)) return stop("Negosiasi, nomor, tanggal, dan nilai SPK terkunci setelah pelaksanaan dimulai (pagar anggaran sudah dinilai pada saat itu). Batalkan paket dan buat paket baru bila nilainya harus berubah.");
        if (BAST_KEYS.includes(k) && status !== "PELAKSANAAN") return stop("BAST dan progres hanya dicatat pada tahap pelaksanaan.");
      }
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      const data: Record<string, unknown> = { ...patch };
      for (const k of keys) {
        before[k] = (p as unknown as Record<string, unknown>)[k] instanceof Date ? isoDay((p as unknown as Record<string, Date>)[k]) : typeof (p as unknown as Record<string, unknown>)[k] === "bigint" ? String((p as unknown as Record<string, bigint>)[k]) : (p as unknown as Record<string, unknown>)[k];
        const nv = patch[k];
        after[k] = nv instanceof Date ? isoDay(nv) : typeof nv === "bigint" ? String(nv) : nv;
      }
      if ("mode" in patch && patch.mode === "SWAKELOLA") data.method = null;
      // mengubah mode/metode: penawaran dan data SPK tidak relevan lagi, tetapi data tidak dihapus diam-diam
      if (("mode" in patch || "method" in patch) && p.offers.length && patch.mode === "SWAKELOLA") return stop("Hapus dulu penawaran yang sudah dicatat sebelum mengubah paket menjadi swakelola.");
      if ("hpsCents" in patch && patch.hpsCents! > 99_999_999_999_999n) return stop("Nilai terlalu besar.");
      await tx.procurementPackage.update({ where: { id: p.id }, data: data as Prisma.ProcurementPackageUpdateInput });
      return ok({ before, after });
    })
    .catch(asResult);
}

export async function deletePackage(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ title: string; number: number; year: number; status: string }>> {
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const p = await mustPackage(tx, args.villageId, args.id);
      if (p.status !== "PERSIAPAN" && p.status !== "BATAL") return stop("Hanya paket tahap persiapan atau yang dibatalkan yang dapat dihapus. Batalkan paketnya lebih dulu.");
      await tx.procurementPackage.delete({ where: { id: p.id } });
      return ok({ title: p.title, number: p.number, year: p.year, status: p.status });
    })
    .catch(asResult);
}

// ───────────── tim pelaksana ─────────────

/** Setelah perubahan tim, paket tahap lanjut yang mensyaratkan TPK harus tetap memenuhi syarat. */
async function assertTeamStillValid(tx: Db, villageId: number, id: number) {
  const p = await mustPackage(tx, villageId, id);
  const needs = p.mode === "SWAKELOLA" ? p.status === "PELAKSANAAN" : (p.status === "PEMILIHAN" || p.status === "PELAKSANAAN") && p.method !== "PEMBELIAN_LANGSUNG";
  if (!needs) return;
  const t = tpkProblems(p.team.map((m) => ({ role: m.role as "KETUA", element: m.element as "PERANGKAT" })));
  if (t.blockers.length) stop(`Perubahan ini membuat TPK tidak memenuhi syarat: ${t.blockers.join(" ")}`);
}

export async function addMember(db: PrismaClient, args: { villageId: number; packageId: number; input: unknown }): Promise<Result<{ id: number; name: string; role: string }>> {
  const parsed = parseMember(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const p = await mustPackage(tx, args.villageId, args.packageId);
      guardLocked(p.status);
      if (p.team.length >= LIMITS.teamPerPackage) return stop(`Anggota TPK maksimal ${LIMITS.teamPerPackage} orang.`);
      if ((v.role === "KETUA" || v.role === "SEKRETARIS") && p.team.some((m) => m.role === v.role)) return stop(`TPK sudah punya ${ROLES[v.role].toLowerCase()}. Ubah atau hapus yang lama lebih dulu.`);
      const row = await tx.procurementTeamMember.create({ data: { packageId: p.id, villageId: args.villageId, name: v.name, role: v.role, element: v.element, position: v.position } });
      return ok({ id: row.id, name: row.name, role: row.role });
    })
    .catch(asResult);
}

export async function patchMember(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ packageId: number; name: string }>> {
  const parsed = parseMember(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  const head = await db.procurementTeamMember.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { packageId: true } });
  if (!head) return fail(404, "Anggota TPK tidak ditemukan.");
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const m = await tx.procurementTeamMember.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!m) return stop("Anggota TPK tidak ditemukan.");
      const p = await mustPackage(tx, args.villageId, m.packageId);
      guardLocked(p.status);
      if ((v.role === "KETUA" || v.role === "SEKRETARIS") && p.team.some((x) => x.role === v.role && x.id !== m.id)) return stop(`TPK sudah punya ${ROLES[v.role].toLowerCase()}.`);
      await tx.procurementTeamMember.update({ where: { id: m.id }, data: { name: v.name, role: v.role, element: v.element, position: v.position } });
      await assertTeamStillValid(tx, args.villageId, p.id);
      return ok({ packageId: p.id, name: v.name });
    })
    .catch(asResult);
}

export async function removeMember(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ packageId: number; name: string; role: string }>> {
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const m = await tx.procurementTeamMember.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!m) return stop("Anggota TPK tidak ditemukan.");
      const p = await mustPackage(tx, args.villageId, m.packageId);
      guardLocked(p.status);
      await tx.procurementTeamMember.delete({ where: { id: m.id } });
      await assertTeamStillValid(tx, args.villageId, p.id);
      return ok({ packageId: p.id, name: m.name, role: m.role });
    })
    .catch(asResult);
}

// ───────────── penawaran ─────────────

export async function addOffer(db: PrismaClient, args: { villageId: number; packageId: number; input: unknown }): Promise<Result<{ id: number; providerName: string; price: string }>> {
  const parsed = parseOffer(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const p = await mustPackage(tx, args.villageId, args.packageId);
      if (p.mode !== "PENYEDIA") return stop("Swakelola tidak memakai penawaran penyedia.");
      if (p.status !== "PEMILIHAN") return stop("Penawaran hanya dicatat pada tahap pemilihan penyedia.");
      if (p.offers.length >= LIMITS.offersPerPackage) return stop(`Penawaran maksimal ${LIMITS.offersPerPackage} per paket.`);
      if (p.offers.some((o) => o.providerName.toLowerCase() === v.providerName.toLowerCase())) return stop("Penyedia ini sudah mengajukan penawaran pada paket ini.");
      const row = await tx.procurementOffer.create({ data: { packageId: p.id, villageId: args.villageId, providerName: v.providerName, providerAddress: v.providerAddress, offeredOn: v.offeredOn, priceCents: v.priceCents, passed: v.passed, evaluationNote: v.evaluationNote, negotiatedCents: v.negotiatedCents } });
      return ok({ id: row.id, providerName: row.providerName, price: fromCents(row.priceCents) });
    })
    .catch(asResult);
}

export async function patchOffer(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ packageId: number; providerName: string }>> {
  const parsed = parseOffer(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const o = await tx.procurementOffer.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!o) return stop("Penawaran tidak ditemukan.");
      const p = await mustPackage(tx, args.villageId, o.packageId);
      if (p.status !== "PEMILIHAN") return stop("Penawaran hanya dapat diubah pada tahap pemilihan penyedia.");
      if (p.offers.some((x) => x.id !== o.id && x.providerName.toLowerCase() === v.providerName.toLowerCase())) return stop("Penyedia ini sudah mengajukan penawaran pada paket ini.");
      // Pemenang harus tetap lulus dan terendah setelah perubahan: dilepas bila tidak lagi memenuhi syarat.
      await tx.procurementOffer.update({ where: { id: o.id }, data: { providerName: v.providerName, providerAddress: v.providerAddress, offeredOn: v.offeredOn, priceCents: v.priceCents, passed: v.passed, evaluationNote: v.evaluationNote, negotiatedCents: v.negotiatedCents } });
      const fresh = await mustPackage(tx, args.villageId, p.id);
      const winner = fresh.offers.find((x) => x.isWinner);
      const freshConflicts = conflictIds(fresh);
      if (winner && (!winner.passed || freshConflicts.has(winner.id) || !lowestPassed(fresh.offers.map((x) => ({ id: x.id, priceCents: x.priceCents, negotiatedCents: x.negotiatedCents, passed: x.passed, isWinner: x.isWinner, conflict: freshConflicts.has(x.id) }))).some((x) => x.id === winner.id))) {
        await tx.procurementOffer.update({ where: { id: winner.id }, data: { isWinner: false } });
      }
      return ok({ packageId: p.id, providerName: v.providerName });
    })
    .catch(asResult);
}

export async function removeOffer(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ packageId: number; providerName: string; price: string }>> {
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const o = await tx.procurementOffer.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!o) return stop("Penawaran tidak ditemukan.");
      const p = await mustPackage(tx, args.villageId, o.packageId);
      if (p.status !== "PEMILIHAN") return stop("Penawaran hanya dapat dihapus pada tahap pemilihan penyedia.");
      await tx.procurementOffer.delete({ where: { id: o.id } });
      return ok({ packageId: p.id, providerName: o.providerName, price: fromCents(o.priceCents) });
    })
    .catch(asResult);
}

/** Menetapkan penyedia terpilih: harus lulus evaluasi dan berharga terendah (setelah negosiasi) di antara yang lulus. */
export async function chooseWinner(db: PrismaClient, args: { villageId: number; offerId: number; /** izin approve pemanggil: WAJIB true (Kepala Desa/admin menetapkan penyedia) */ canApprove: boolean }): Promise<Result<{ packageId: number; providerName: string; price: string }>> {
  if (args.canApprove !== true) return fail(403, "Penyedia terpilih hanya dapat ditetapkan oleh Kepala Desa atau admin.");
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const o = await tx.procurementOffer.findFirst({ where: { id: args.offerId, villageId: args.villageId } });
      if (!o) return stop("Penawaran tidak ditemukan.");
      const p = await mustPackage(tx, args.villageId, o.packageId);
      if (p.status !== "PEMILIHAN") return stop("Penyedia terpilih ditetapkan pada tahap pemilihan penyedia.");
      if (!o.passed) return stop("Penawaran harus dinyatakan lulus evaluasi lebih dulu.");
      const conflicts = conflictIds(p);
      if (conflicts.has(o.id)) return stop(`Penawaran "${o.providerName}" tidak dapat dipilih: penyedianya sama dengan anggota TPK atau Kasi/Kaur pelaksana (pertentangan kepentingan, Peraturan LKPP 12/2019 Pasal 3 huruf e). Hapus penawaran ini atau perbaiki nama penyedia/anggota yang keliru, lalu pilih penyedia lain.`);
      const facts = p.offers.map((x) => ({ id: x.id, priceCents: x.priceCents, negotiatedCents: x.negotiatedCents, passed: x.passed, isWinner: x.isWinner, conflict: conflicts.has(x.id) }));
      const skipped = p.offers.filter((x) => conflicts.has(x.id)).map((x) => `"${x.providerName}"`);
      const note = skipped.length ? ` Penawaran bentrok kepentingan (${skipped.join(", ")}) tidak ikut perhitungan harga terendah.` : "";
      const lowest = lowestPassed(facts);
      if (!lowest.some((x) => x.id === o.id)) {
        const names = p.offers.filter((x) => lowest.some((l) => l.id === x.id)).map((x) => `"${x.providerName}"`).join(", ");
        return stop(`Penyedia terpilih harus yang berharga terendah di antara penawaran yang lulus${names ? `; saat ini ${names}` : ""} (Lampiran I Peraturan LKPP 12/2019). Catat hasil negosiasi bila ada.${note}`);
      }
      if (lowest.length > 1) return stop(`Ada lebih dari satu penawaran lulus dengan harga terendah yang sama. Lakukan negosiasi dan catat harga hasil negosiasinya lebih dulu.${note}`);
      await tx.procurementOffer.updateMany({ where: { packageId: p.id }, data: { isWinner: false } });
      await tx.procurementOffer.update({ where: { id: o.id }, data: { isWinner: true } });
      return ok({ packageId: p.id, providerName: o.providerName, price: fromCents(effectivePrice(o)) });
    })
    .catch(asResult);
}

// ───────────── status ─────────────

export async function transition(db: PrismaClient, args: { villageId: number; id: number; to: unknown; reason?: unknown; /** izin approve pemanggil; dibutuhkan untuk memulai pelaksanaan */ canApprove: boolean }): Promise<Result<{ from: string; to: string; title: string }>> {
  const to = args.to;
  if (typeof to !== "string" || !Object.hasOwn(STATUS, to)) return fail(400, "Status tujuan tidak valid.");
  const target = to as Status;
  if (target === "PELAKSANAAN" && args.canApprove !== true) return fail(403, "Memulai pelaksanaan (mengikat anggaran) hanya dapat dilakukan oleh Kepala Desa atau admin.");
  let reason: string | null = null;
  if (target === "BATAL") {
    reason = typeof args.reason === "string" ? args.reason.replace(/\s+/g, " ").trim() : "";
    if (reason.length < 3 || reason.length > 300) return invalid({ errors: ["Alasan pembatalan wajib diisi (3 sampai 300 karakter)."], fieldErrors: { reason: "Isi alasan pembatalan (3 sampai 300 karakter)." } });
  }
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      const p = await mustPackage(tx, args.villageId, args.id);
      const ctx = await packageContext(tx, args.villageId, p);
      const blockers = transitionBlockers(target, ctx.facts);
      if (blockers.length) return stop(blockers[0], blockers);
      await tx.procurementPackage.update({ where: { id: p.id }, data: { status: target, ...(target === "BATAL" ? { cancelReason: reason } : {}), ...(target === "SELESAI" ? { progressPct: 100 } : {})} });
      return ok({ from: p.status, to: target, title: p.title });
    })
    .catch(asResult);
}

// ───────────── pengaturan ambang ─────────────

export async function saveSetting(db: PrismaClient, args: { villageId: number; input: unknown }): Promise<Result<{ direct: string | null; offer: string | null }>> {
  const parsed = parseSetting(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  await ensureLock(db, args.villageId);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId);
      await tx.procurementSetting.update({ where: { villageId: args.villageId }, data: { directLimitCents: v.directLimitCents, offerLimitCents: v.offerLimitCents, basisNote: v.basisNote } });
      return ok({ direct: money(v.directLimitCents), offer: money(v.offerLimitCents) });
    })
    .catch(asResult);
}

// ───────────── cetak ─────────────

export interface PrintBundle {
  village: { name: string; district: string; regency: string };
  signers: { villageHead: string | null; secretary: string | null };
  pkg: PackageDetail;
}
export async function printBundle(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<PrintBundle>> {
  const r = await getPackage(db, args);
  if (!r.ok) return r;
  const [village, year] = await Promise.all([
    db.village.findUnique({ where: { id: args.villageId }, select: { name: true, district: true, regency: true } }),
    db.apbdesYear.findUnique({ where: { villageId_year: { villageId: args.villageId, year: r.data.year } }, select: { villageHeadName: true, secretaryName: true } }),
  ]);
  return ok({ village: village ?? { name: "", district: "", regency: "" }, signers: { villageHead: year?.villageHeadName ?? null, secretary: year?.secretaryName ?? null }, pkg: r.data });
}
