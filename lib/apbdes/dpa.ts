/**
 * Dokumen Pelaksanaan Anggaran (DPA) per kegiatan menurut Permendagri 20/2018 Pasal 45-48:
 * Rencana Kegiatan dan Anggaran (RKA, termasuk rencana penarikan bulanan = dasar RAK Desa), Rencana Kerja Kegiatan (RKK),
 * Rencana Anggaran Biaya (RAB). Sekretaris Desa memverifikasi, Kepala Desa menyetujui. Uang dalam sen (BigInt).
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, invalid, isRecord, type Parsed, type Result } from "@/lib/form-input";
import { fromCents, mulDivRound, toCents, type Cents } from "@/lib/coop/loan-math";
import { accountKind, accountName, isKegiatanCode, isLeafAccountCode, kegiatanName, type PlanStatus } from "./catalog";
import { Rollback, activeDocument, ensureYear, loadEntries, lockYear, ok, rollbackToResult } from "./service";

type Db = Prisma.TransactionClient;

export const DPA_LIMITS = { costItemsPerActivity: 300 } as const;

/** Desimal (maks. 2 angka pecahan) sebagai "ratusan" BigInt: 12,5 → 1250. Memakai pembaca uang yang sama (tanpa float). */
function hundredths(raw: unknown, allowZero = false): Cents | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const v = toCents(typeof raw === "string" ? raw.trim().replace(",", ".") : raw);
  return v === null || (!allowZero && v <= 0n) ? null : v;
}

export interface PlanInput {
  executorName: string | null;
  location: string | null;
  outputName: string | null;
  outputVolumeH: Cents | null;
  outputUnit: string | null;
  target: string | null;
  team: string | null;
  startMonth: number | null;
  endMonth: number | null;
}

export function parsePlanInput(body: unknown): Parsed<PlanInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };
  const text = (k: string, max: number, label: string): string | null => {
    const t = cleanText(body[k], max);
    if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter`;
    return t.value;
  };
  const executorName = text("executorName", 150, "Nama pelaksana");
  const location = text("location", 200, "Lokasi");
  const outputName = text("outputName", 200, "Nama output");
  const outputUnit = text("outputUnit", 30, "Satuan");
  const target = text("target", 300, "Sasaran");
  const team = text("team", 300, "Tim pelaksana");
  let outputVolumeH: Cents | null = null;
  if (body.outputVolume !== undefined && body.outputVolume !== null && body.outputVolume !== "") {
    outputVolumeH = hundredths(body.outputVolume);
    if (outputVolumeH === null) fe.outputVolume = "Volume harus angka lebih dari nol (maks. 2 desimal)";
  }
  if ((outputVolumeH === null) !== (outputUnit === null) && !fe.outputVolume) fe.outputUnit = "Isi volume dan satuan bersama-sama";
  const month = (k: string, label: string): number | null => {
    const v = body[k];
    if (v === undefined || v === null || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 12) fe[k] = `${label} harus bulan 1 sampai 12`;
    return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
  };
  const startMonth = month("startMonth", "Bulan mulai");
  const endMonth = month("endMonth", "Bulan selesai");
  if (startMonth !== null && endMonth !== null && endMonth < startMonth) fe.endMonth = "Bulan selesai tidak boleh sebelum bulan mulai";
  return Object.keys(fe).length ? { ok: false, errors: Object.values(fe), fieldErrors: fe } : { ok: true, value: { executorName, location, outputName, outputVolumeH, outputUnit, target, team, startMonth, endMonth } };
}

/** Rencana penarikan: { activityCode, accountCode, months: [12 jumlah] }. Boleh kosong/nol; tidak boleh negatif. */
export function parseCashPlanInput(body: unknown): Parsed<{ activityCode: string; accountCode: string; months: Cents[] }> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  const accountCode = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!isKegiatanCode(activityCode)) fe.activityCode = "Kegiatan tidak dikenal";
  if (!isLeafAccountCode(accountCode) || accountKind(accountCode) !== "BELANJA") fe.accountCode = "Rekening belanja tidak dikenal";
  const months: Cents[] = [];
  if (!Array.isArray(body.months) || body.months.length !== 12) fe.months = "Isi rencana untuk 12 bulan";
  else
    body.months.forEach((m, i) => {
      const v = m === "" || m === null || m === undefined ? 0n : hundredths(m, true);
      if (v === null) fe[`month${i + 1}`] = `Bulan ${i + 1}: jumlah tidak valid`;
      else months.push(v);
    });
  return Object.keys(fe).length ? { ok: false, errors: Object.values(fe), fieldErrors: fe } : { ok: true, value: { activityCode, accountCode, months } };
}

export function parseCostItemInput(body: unknown): Parsed<{ activityCode: string; accountCode: string; description: string; volumeH: Cents; unit: string; unitPriceCents: Cents; amountCents: Cents }> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };
  const activityCode = typeof body.activityCode === "string" ? body.activityCode.trim() : "";
  const accountCode = typeof body.accountCode === "string" ? body.accountCode.trim() : "";
  if (!isKegiatanCode(activityCode)) fe.activityCode = "Kegiatan tidak dikenal";
  if (!isLeafAccountCode(accountCode) || accountKind(accountCode) !== "BELANJA") fe.accountCode = "Rekening belanja tidak dikenal";
  const desc = cleanText(body.description, 300);
  if (desc.bad || desc.tooLong || !desc.value) fe.description = "Uraian wajib diisi (maks. 300 karakter)";
  const unit = cleanText(body.unit, 30);
  if (unit.bad || unit.tooLong || !unit.value) fe.unit = "Satuan wajib diisi (maks. 30 karakter)";
  const volumeH = hundredths(body.volume);
  if (volumeH === null) fe.volume = "Volume harus angka lebih dari nol (maks. 2 desimal)";
  const unitPriceCents = hundredths(body.unitPrice);
  if (unitPriceCents === null) fe.unitPrice = "Harga satuan harus angka lebih dari nol";
  if (Object.keys(fe).length || volumeH === null || unitPriceCents === null) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { activityCode, accountCode, description: desc.value!, volumeH, unit: unit.value!, unitPriceCents, amountCents: mulDivRound(unitPriceCents, volumeH, 100n) } };
}

const keyOf = (a: string, c: string) => `${a}|${c}`;

export interface AccountPlanView {
  accountCode: string;
  accountName: string;
  budget: string;
  months: string[];
  planned: string;
  rabTotal: string;
  complete: boolean;
  /** Hanya pada tampilan rinci: realisasi bersih (belanja - pengembalian panjar) dan SPP yang masih berjalan */
  realized?: string;
  open?: string;
  /** Anggaran rekening ini pada DPA/DPPA terakhir yang disetujui (null bila belum pernah disetujui atau rekening baru) */
  previousBudget?: string | null;
}
export interface PlanVersionView {
  revision: number;
  label: string;
  baseLabel: string;
  budget: string;
  approvedAt: string;
  accounts: { accountCode: string; accountName: string; budget: string }[];
}
export interface ActivityPlanView {
  activityCode: string;
  name: string;
  budget: string;
  status: PlanStatus;
  hasPlan: boolean;
  executorName: string | null;
  location: string | null;
  outputName: string | null;
  outputVolume: string | null;
  outputUnit: string | null;
  target: string | null;
  team: string | null;
  startMonth: number | null;
  endMonth: number | null;
  realizedVolume: string | null;
  verifiedAt: string | null;
  approvedAt: string | null;
  /** 0 = DPA awal, 1 dst = DPPA ke-n */
  revision: number;
  label: string;
  /** DPPA sedang disusun (draf setelah dibuka kembali karena Perubahan APB Desa) */
  revising: boolean;
  hasSpp: boolean;
  history: PlanVersionView[];
  accounts: AccountPlanView[];
  /** Semua rekening sudah punya rencana penarikan yang jumlahnya sama dengan anggaran */
  rakComplete: boolean;
  /** Anggaran sudah berubah sejak persetujuan (rencana tak lagi sama dengan APB Desa): perlu DPPA (dibuka lewat aksi "reopen") */
  needsRevision: boolean;
  costItems: { id: number; accountCode: string; description: string; volume: string; unit: string; unitPrice: string; amount: string }[];
}

const dec = (v: Prisma.Decimal | null | undefined): string | null => (v === null || v === undefined ? null : v.toFixed(2));

const OPEN_SPP = ["DIAJUKAN", "DIVERIFIKASI", "DISETUJUI"];
const baseLabel = (version: number): string => (version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${version}`);
export const planLabel = (revision: number): string => (revision === 0 ? "DPA" : `DPPA ke-${revision}`);

interface RakSnapshotRow {
  accountCode: string;
  budget: string;
  months: string[];
}

/** Realisasi bersih (belanja - pengembalian panjar) dan SPP berjalan per kegiatan+rekening. */
async function spentByKey(db: Db, villageId: number, year: number): Promise<{ realized: Map<string, Cents>; open: Map<string, Cents> }> {
  const [entries, lines] = await Promise.all([
    loadEntries(db, villageId, year),
    db.apbdesPayRequestLine.findMany({ where: { request: { villageId, year, status: { in: OPEN_SPP } } }, select: { accountCode: true, amountCents: true, request: { select: { activityCode: true } } } }),
  ]);
  const realized = new Map<string, Cents>();
  for (const e of entries) {
    if (!e.activityCode || !e.accountCode || (e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI")) continue;
    const k = keyOf(e.activityCode, e.accountCode);
    realized.set(k, (realized.get(k) ?? 0n) + (e.type === "PENGELUARAN" ? e.amountCents : -e.amountCents));
  }
  const open = new Map<string, Cents>();
  for (const l of lines) {
    const k = keyOf(l.request.activityCode, l.accountCode);
    open.set(k, (open.get(k) ?? 0n) + l.amountCents);
  }
  return { realized, open };
}

/** Tampilan DPA/DPPA semua kegiatan. `detail` menambah riwayat versi serta realisasi dan SPP berjalan per rekening (lebih banyak kueri). */
export async function planOverview(db: Db, villageId: number, year: number, opts: { detail?: boolean } = {}): Promise<{ activeLabel: string | null; activities: ActivityPlanView[] }> {
  const doc = await activeDocument(db, villageId, year);
  if (!doc) return { activeLabel: null, activities: [] };
  const [plans, cash, items, versions, spent, sppCounts] = await Promise.all([
    db.apbdesActivityPlan.findMany({ where: { villageId, year } }),
    db.apbdesCashPlan.findMany({ where: { villageId, year } }),
    db.apbdesCostItem.findMany({ where: { villageId, year }, orderBy: { id: "asc" } }),
    opts.detail ? db.apbdesActivityPlanVersion.findMany({ where: { villageId, year }, orderBy: { revision: "asc" } }) : Promise.resolve([]),
    opts.detail ? spentByKey(db, villageId, year) : Promise.resolve(null),
    db.apbdesPayRequest.groupBy({ by: ["activityCode"], where: { villageId, year, status: { not: "DITOLAK" } }, _count: { _all: true } }),
  ]);
  const budget = new Map<string, Cents>();
  for (const l of doc.lines) if (l.activityCode && accountKind(l.accountCode) === "BELANJA") budget.set(keyOf(l.activityCode, l.accountCode), (budget.get(keyOf(l.activityCode, l.accountCode)) ?? 0n) + l.amountCents);
  const codes = [...new Set([...budget.keys()].map((k) => k.split("|")[0]!))].sort();
  const activities = codes.map((code): ActivityPlanView => {
    const p = plans.find((x) => x.activityCode === code);
    const accKeys = [...budget.keys()].filter((k) => k.startsWith(`${code}|`)).sort();
    const history = versions.filter((v) => v.activityCode === code);
    const last = history[history.length - 1];
    const lastRak = new Map(((last?.rak ?? []) as unknown as RakSnapshotRow[]).map((r) => [r.accountCode, r.budget]));
    const accounts = accKeys.map((k): AccountPlanView => {
      const acc = k.split("|")[1]!;
      const months = Array.from({ length: 12 }, (_, i) => cash.find((c) => c.activityCode === code && c.accountCode === acc && c.month === i + 1)?.amountCents ?? 0n);
      const planned = months.reduce((a, b) => a + b, 0n);
      const rab = items.filter((x) => x.activityCode === code && x.accountCode === acc).reduce((a, b) => a + b.amountCents, 0n);
      const view: AccountPlanView = { accountCode: acc, accountName: accountName(acc) ?? acc, budget: fromCents(budget.get(k)!), months: months.map(fromCents), planned: fromCents(planned), rabTotal: fromCents(rab), complete: planned === budget.get(k) };
      if (spent) {
        view.realized = fromCents(spent.realized.get(k) ?? 0n);
        view.open = fromCents(spent.open.get(k) ?? 0n);
        // DPA yang disetujui sebelum riwayat ada: rencana penarikan lama (sama dengan anggaran saat itu) masih tersimpan
        view.previousBudget = lastRak.get(acc) ?? (!last && p && p.status !== "DRAFT" ? fromCents(planned) : null);
      }
      return view;
    });
    const total = accKeys.reduce((a, k) => a + budget.get(k)!, 0n);
    const rakComplete = accounts.every((a) => a.complete);
    const status = (p?.status as PlanStatus | undefined) ?? "DRAFT";
    const revision = p?.revision ?? 0;
    return {
      activityCode: code,
      name: kegiatanName(code) ?? code,
      budget: fromCents(total),
      status,
      hasPlan: Boolean(p),
      executorName: p?.executorName ?? null,
      location: p?.location ?? null,
      outputName: p?.outputName ?? null,
      outputVolume: dec(p?.outputVolume),
      outputUnit: p?.outputUnit ?? null,
      target: p?.target ?? null,
      team: p?.team ?? null,
      startMonth: p?.startMonth ?? null,
      endMonth: p?.endMonth ?? null,
      realizedVolume: dec(p?.realizedVolume),
      verifiedAt: p?.verifiedAt?.toISOString() ?? null,
      approvedAt: p?.approvedAt?.toISOString() ?? null,
      revision,
      label: planLabel(revision),
      revising: status === "DRAFT" && revision > 0,
      hasSpp: (sppCounts.find((c) => c.activityCode === code)?._count._all ?? 0) > 0,
      history: history.map((v) => ({
        revision: v.revision,
        label: planLabel(v.revision),
        baseLabel: baseLabel(v.baseVersion),
        budget: fromCents(v.budgetCents),
        approvedAt: v.approvedAt.toISOString(),
        accounts: ((v.rak ?? []) as unknown as RakSnapshotRow[]).map((r) => ({ accountCode: r.accountCode, accountName: accountName(r.accountCode) ?? r.accountCode, budget: r.budget })),
      })),
      accounts,
      rakComplete,
      needsRevision: status !== "DRAFT" && !rakComplete,
      costItems: items.filter((x) => x.activityCode === code).map((x) => ({ id: x.id, accountCode: x.accountCode, description: x.description, volume: x.volume.toFixed(2), unit: x.unit, unitPrice: fromCents(x.unitPriceCents), amount: fromCents(x.amountCents) })),
    };
  });
  return { activeLabel: baseLabel(doc.version), activities };
}

/** Anggaran satu kegiatan+rekening pada APB Desa yang berlaku (0 bila tidak ada). */
async function budgetOf(db: Db, villageId: number, year: number, activityCode: string, accountCode: string): Promise<Cents> {
  const doc = await activeDocument(db, villageId, year);
  return (doc?.lines ?? []).filter((l) => l.activityCode === activityCode && l.accountCode === accountCode).reduce((a, l) => a + l.amountCents, 0n);
}

async function draftPlan(tx: Db, villageId: number, year: number, activityCode: string): Promise<Result<{ id: number }>> {
  const existing = await tx.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId, year, activityCode } } });
  if (existing && existing.status !== "DRAFT") return fail(409, "DPA kegiatan ini sudah diverifikasi atau disetujui. Buka kembali ke draf untuk mengubahnya.");
  const row = existing ?? (await tx.apbdesActivityPlan.create({ data: { villageId, year, activityCode } }));
  return ok({ id: row.id });
}

const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;

export async function savePlan(db: PrismaClient, args: { villageId: number; year: number; activityCode: string; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parsePlanInput(args.input);
  if (!p.ok) return invalid(p);
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  if (!isKegiatanCode(args.activityCode)) return fail(400, "Kegiatan tidak dikenal.");
  await ensureYear(db, args.villageId, args.year);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, args.year);
      const doc = await activeDocument(tx, args.villageId, args.year);
      if (!doc?.lines.some((l) => l.activityCode === args.activityCode)) return fail(409, "Kegiatan ini tidak ada di APB Desa yang berlaku.");
      const g = await draftPlan(tx, args.villageId, args.year, args.activityCode);
      if (!g.ok) return g;
      const data = { executorName: v.executorName, location: v.location, outputName: v.outputName, outputVolume: v.outputVolumeH === null ? null : new Prisma.Decimal(fromCents(v.outputVolumeH)), outputUnit: v.outputUnit, target: v.target, team: v.team, startMonth: v.startMonth, endMonth: v.endMonth };
      await tx.apbdesActivityPlan.update({ where: { id: g.data.id }, data });
      return ok({ id: g.data.id });
    })
    .catch(rollbackToResult);
}

export async function saveCashPlan(db: PrismaClient, args: { villageId: number; year: number; input: unknown }): Promise<Result<{ planned: string }>> {
  const p = parseCashPlanInput(args.input);
  if (!p.ok) return invalid(p);
  const { activityCode, accountCode, months } = p.value;
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  await ensureYear(db, args.villageId, args.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, args.year);
      const cap = await budgetOf(tx, args.villageId, args.year, activityCode, accountCode);
      if (cap === 0n) return fail(409, "Kegiatan dan rekening ini tidak ada di APB Desa yang berlaku.");
      const total = months.reduce((a, b) => a + b, 0n);
      if (total > cap) return { ok: false as const, status: 409, errors: [`Rencana penarikan (Rp${fromCents(total)}) melebihi anggaran (Rp${fromCents(cap)}).`], fieldErrors: { months: "Melebihi anggaran" } };
      const g = await draftPlan(tx, args.villageId, args.year, activityCode);
      if (!g.ok) return g;
      await tx.apbdesCashPlan.deleteMany({ where: { villageId: args.villageId, year: args.year, activityCode, accountCode } });
      const rows = months.map((amountCents, i) => ({ villageId: args.villageId, year: args.year, activityCode, accountCode, month: i + 1, amountCents })).filter((r) => r.amountCents > 0n);
      if (rows.length) await tx.apbdesCashPlan.createMany({ data: rows });
      return ok({ planned: fromCents(total) });
    })
    .catch(rollbackToResult);
}

export async function addCostItem(db: PrismaClient, args: { villageId: number; year: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseCostItemInput(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  await ensureYear(db, args.villageId, args.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, args.year);
      const cap = await budgetOf(tx, args.villageId, args.year, v.activityCode, v.accountCode);
      if (cap === 0n) return fail(409, "Kegiatan dan rekening ini tidak ada di APB Desa yang berlaku.");
      const existing = await tx.apbdesCostItem.findMany({ where: { villageId: args.villageId, year: args.year, activityCode: v.activityCode } });
      if (existing.length >= DPA_LIMITS.costItemsPerActivity) return fail(409, `Satu kegiatan maksimal ${DPA_LIMITS.costItemsPerActivity} baris RAB.`);
      const sum = existing.filter((x) => x.accountCode === v.accountCode).reduce((a, b) => a + b.amountCents, 0n) + v.amountCents;
      if (sum > cap) return { ok: false as const, status: 409, errors: [`Jumlah RAB (Rp${fromCents(sum)}) melebihi anggaran rekening (Rp${fromCents(cap)}).`], fieldErrors: { unitPrice: "Melebihi anggaran" } };
      const g = await draftPlan(tx, args.villageId, args.year, v.activityCode);
      if (!g.ok) return g;
      const row = await tx.apbdesCostItem.create({ data: { villageId: args.villageId, year: args.year, activityCode: v.activityCode, accountCode: v.accountCode, description: v.description, volume: new Prisma.Decimal(fromCents(v.volumeH)), unit: v.unit, unitPriceCents: v.unitPriceCents, amountCents: v.amountCents } });
      return ok({ id: row.id });
    })
    .catch(rollbackToResult);
}

export async function deleteCostItem(db: PrismaClient, args: { villageId: number; year: number; itemId: number }): Promise<Result<{ id: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  await ensureYear(db, args.villageId, args.year);
  return db
    .$transaction(async (tx) => {
      // Dikunci seperti penulis DPA lain: status DPA tak boleh berubah (verifikasi/persetujuan) di antara pemeriksaan dan penghapusan.
      await lockYear(tx, args.villageId, args.year);
      const item = await tx.apbdesCostItem.findFirst({ where: { id: args.itemId, villageId: args.villageId, year: args.year } });
      if (!item) return fail(404, "Baris RAB tidak ditemukan.");
      const plan = await tx.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode: item.activityCode } } });
      if (plan && plan.status !== "DRAFT") return fail(409, "DPA kegiatan ini sudah diverifikasi atau disetujui. Buka kembali ke draf untuk mengubahnya.");
      await tx.apbdesCostItem.delete({ where: { id: item.id } });
      return ok({ id: item.id });
    })
    .catch(rollbackToResult);
}

/** Capaian volume output untuk Laporan Realisasi Kegiatan; boleh diisi kapan saja. */
export async function saveRealizedVolume(db: PrismaClient, args: { villageId: number; year: number; activityCode: string; volume: unknown }): Promise<Result<{ id: number }>> {
  const h = args.volume === null || args.volume === "" ? null : hundredths(args.volume, true);
  if (args.volume !== null && args.volume !== "" && h === null) return invalid({ errors: ["Capaian harus angka (maks. 2 desimal)."], fieldErrors: { volume: "Capaian tidak valid." } });
  const plan = await db.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode: args.activityCode } } });
  if (!plan) return fail(404, "DPA kegiatan ini belum dibuat.");
  await db.apbdesActivityPlan.update({ where: { id: plan.id }, data: { realizedVolume: h === null ? null : new Prisma.Decimal(fromCents(h)) } });
  return ok({ id: plan.id });
}

export type PlanAction = "verify" | "approve" | "reopen";

/** Bulan acuan batas rencana penarikan (sama dengan pemeriksaan SPP): bulan berjalan; 12 untuk tahun lampau; 1 untuk tahun depan. */
function referenceMonth(year: number, now: Date): number {
  return year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : year < now.getUTCFullYear() ? 12 : 1;
}

/**
 * DPPA tidak boleh memangkas rencana penarikan sampai bulan berjalan di bawah yang sudah terpakai (realisasi + SPP berjalan),
 * karena SPP yang sudah berjalan tidak bisa lagi diverifikasi terhadap rencana yang lebih kecil dari yang sudah ditarik.
 * Rekening yang anggarannya sudah di bawah pemakaian dilewati: itu sudah diperingatkan saat Perubahan APB Desa ditetapkan.
 */
async function shortfallsAgainstSpent(tx: Db, villageId: number, year: number, activityCode: string, view: ActivityPlanView, now: Date): Promise<string[]> {
  const spent = await spentByKey(tx, villageId, year);
  const month = referenceMonth(year, now);
  const out: string[] = [];
  for (const a of view.accounts) {
    const k = keyOf(activityCode, a.accountCode);
    const used = (spent.realized.get(k) ?? 0n) + (spent.open.get(k) ?? 0n);
    if (used <= 0n || used > (toCents(a.budget) ?? 0n)) continue;
    const through = a.months.slice(0, month).reduce((sum, m) => sum + (toCents(m) ?? 0n), 0n);
    if (through < used) out.push(`${a.accountCode} (rencana sampai bulan ${month} Rp${fromCents(through)}, sudah terpakai Rp${fromCents(used)})`);
  }
  return out;
}

const rakSnapshot = (view: ActivityPlanView): RakSnapshotRow[] => view.accounts.map((a) => ({ accountCode: a.accountCode, budget: a.budget, months: a.months }));

/**
 * Verifikasi Sekretaris Desa, persetujuan Kepala Desa, atau buka kembali ke draf.
 * Membuka kembali DPA yang sudah punya SPP hanya boleh sebagai DPPA: setelah Perubahan APB Desa ditetapkan dan anggaran kegiatan
 * ini berubah (rencana penarikan tak lagi sama dengan anggaran). Nomor revisi naik; SPP yang sudah ada tetap utuh.
 * Setiap persetujuan disimpan sebagai riwayat beku (`apbdes_activity_plan_versions`).
 */
export async function advancePlan(db: PrismaClient, args: { villageId: number; year: number; activityCode: string; action: PlanAction; userId?: number | null; now?: Date }): Promise<Result<{ status: PlanStatus; revision: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  await ensureYear(db, args.villageId, args.year);
  const now = args.now ?? new Date();
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, args.year);
      const plan = await tx.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode: args.activityCode } } });
      if (!plan) return fail(404, "DPA kegiatan ini belum dibuat.");
      const viewOf = async () => (await planOverview(tx, args.villageId, args.year)).activities.find((a) => a.activityCode === args.activityCode);
      const label = planLabel(plan.revision);
      if (args.action === "verify") {
        if (plan.status !== "DRAFT") return fail(409, `${label} ini sudah diverifikasi.`);
        if (!plan.executorName) return fail(409, "Isi nama pelaksana kegiatan (Kaur/Kasi) dulu.");
        const view = await viewOf();
        if (!view) return fail(409, "Kegiatan ini tidak ada di APB Desa yang berlaku.");
        const incomplete = view.accounts.filter((a) => !a.complete).map((a) => a.accountCode);
        if (incomplete.length) throw new Rollback(`Rencana penarikan belum sama dengan anggaran pada rekening ${incomplete.join(", ")}.`);
        if (plan.revision > 0) {
          const short = await shortfallsAgainstSpent(tx, args.villageId, args.year, args.activityCode, view, now);
          if (short.length) throw new Rollback(`Rencana penarikan DPPA lebih kecil dari yang sudah terpakai: ${short.join("; ")}. Sesuaikan rencana bulan-bulan yang sudah berjalan.`);
        }
        await tx.apbdesActivityPlan.update({ where: { id: plan.id }, data: { status: "DIVERIFIKASI", verifiedAt: now } });
        return ok({ status: "DIVERIFIKASI" as PlanStatus, revision: plan.revision });
      }
      if (args.action === "approve") {
        if (plan.status !== "DIVERIFIKASI") return fail(409, `${label} harus diverifikasi Sekretaris Desa lebih dulu.`);
        const doc = await activeDocument(tx, args.villageId, args.year);
        const view = await viewOf();
        if (!doc || !view) return fail(409, "Kegiatan ini tidak ada di APB Desa yang berlaku.");
        // Anggaran bisa berubah (Perubahan APB Desa ditetapkan) di antara verifikasi dan persetujuan.
        if (!view.rakComplete) return fail(409, "Anggaran kegiatan berubah sejak diverifikasi. Buka kembali ke draf, sesuaikan rencana penarikan, lalu verifikasi ulang.");
        if (plan.revision > 0) {
          // Pemakaian bisa bertambah (SPP dibayar, catatan kas) di antara verifikasi dan persetujuan.
          const short = await shortfallsAgainstSpent(tx, args.villageId, args.year, args.activityCode, view, now);
          if (short.length) throw new Rollback(`Rencana penarikan DPPA lebih kecil dari yang sudah terpakai: ${short.join("; ")}. Buka kembali ke draf dan sesuaikan rencana bulan-bulan yang sudah berjalan.`);
        }
        const work = { location: plan.location, outputName: plan.outputName, outputVolume: dec(plan.outputVolume), outputUnit: plan.outputUnit, target: plan.target, team: plan.team, startMonth: plan.startMonth, endMonth: plan.endMonth };
        const rab = view.costItems.map((x) => ({ accountCode: x.accountCode, description: x.description, volume: x.volume, unit: x.unit, unitPrice: x.unitPrice, amount: x.amount }));
        const snapshot = { executorName: plan.executorName, rak: rakSnapshot(view) as unknown as Prisma.InputJsonValue, work: work as Prisma.InputJsonValue, rab: rab as Prisma.InputJsonValue, budgetCents: toCents(view.budget) ?? 0n, baseVersion: doc.version, verifiedAt: plan.verifiedAt, approvedAt: now, approvedById: args.userId ?? null };
        await tx.apbdesActivityPlanVersion.upsert({
          where: { villageId_year_activityCode_revision: { villageId: args.villageId, year: args.year, activityCode: args.activityCode, revision: plan.revision } },
          create: { villageId: args.villageId, year: args.year, activityCode: args.activityCode, revision: plan.revision, ...snapshot },
          update: snapshot,
        });
        await tx.apbdesActivityPlan.update({ where: { id: plan.id }, data: { status: "DISETUJUI", approvedAt: now, baseVersion: doc.version } });
        return ok({ status: "DISETUJUI" as PlanStatus, revision: plan.revision });
      }
      if (plan.status === "DRAFT") return fail(409, `${label} ini masih draf.`);
      const view = await viewOf();
      const dppa = Boolean(view?.needsRevision);
      if (!dppa) {
        const spp = await tx.apbdesPayRequest.count({ where: { villageId: args.villageId, year: args.year, activityCode: args.activityCode, status: { not: "DITOLAK" } } });
        if (spp > 0) return fail(409, "Kegiatan ini sudah punya SPP, dan anggarannya belum berubah. DPA hanya dapat dibuka kembali sebagai DPPA setelah Perubahan APB Desa yang mengubah anggaran kegiatan ini ditetapkan.");
      }
      // Revisi naik hanya bila revisi ini pernah disetujui; DPPA yang baru diverifikasi lalu terbentur perubahan lagi tidak menyisakan nomor kosong.
      const revision = dppa && plan.approvedAt !== null ? plan.revision + 1 : plan.revision;
      await tx.apbdesActivityPlan.update({ where: { id: plan.id }, data: { status: "DRAFT", verifiedAt: null, approvedAt: null, revision } });
      return ok({ status: "DRAFT" as PlanStatus, revision });
    })
    .catch(rollbackToResult);
}

/** Total rencana penarikan kumulatif untuk satu kegiatan+rekening sampai bulan tertentu (dasar batas SPP, Pasal 53). */
export async function plannedThrough(db: Db, villageId: number, year: number, activityCode: string, accountCode: string, month: number): Promise<Cents> {
  const rows = await db.apbdesCashPlan.findMany({ where: { villageId, year, activityCode, accountCode, month: { lte: month } }, select: { amountCents: true } });
  return rows.reduce((a, r) => a + r.amountCents, 0n);
}

/**
 * Peringatan setelah Perubahan APB Desa ditetapkan: kegiatan yang anggarannya berubah dan DPA-nya sudah disetujui kini perlu DPPA,
 * dan rekening yang dianggarkan di bawah realisasi (Perdes tetap berlaku, tetapi pencatatan baru akan ditolak).
 */
export async function amendmentWarnings(db: Db, villageId: number, documentId: number): Promise<string[]> {
  const d = await db.apbdesDocument.findFirst({ where: { id: documentId, villageId }, include: { lines: true } });
  if (!d || d.version === 0 || d.status !== "DITETAPKAN") return [];
  const prev = await db.apbdesDocument.findFirst({ where: { villageId, year: d.year, status: "DITETAPKAN", version: { lt: d.version } }, orderBy: { version: "desc" }, include: { lines: true } });
  const sum = (lines: { activityCode: string | null; accountCode: string; amountCents: bigint }[]) => {
    const m = new Map<string, Cents>();
    for (const l of lines) if (l.activityCode && accountKind(l.accountCode) === "BELANJA") m.set(keyOf(l.activityCode, l.accountCode), (m.get(keyOf(l.activityCode, l.accountCode)) ?? 0n) + l.amountCents);
    return m;
  };
  const now = sum(d.lines);
  const before = sum(prev?.lines ?? []);
  const warnings: string[] = [];
  const changed = new Set<string>();
  for (const k of new Set([...now.keys(), ...before.keys()])) if ((now.get(k) ?? 0n) !== (before.get(k) ?? 0n)) changed.add(k.split("|")[0]!);
  const approved = await db.apbdesActivityPlan.findMany({ where: { villageId, year: d.year, activityCode: { in: [...changed] }, status: { not: "DRAFT" } }, select: { activityCode: true } });
  if (approved.length) {
    const names = approved.map((a) => `${a.activityCode} ${kegiatanName(a.activityCode) ?? ""}`.trim());
    warnings.push(`Anggaran ${approved.length} kegiatan yang DPA-nya sudah diverifikasi/disetujui berubah: ${names.slice(0, 5).join("; ")}${names.length > 5 ? `; dan ${names.length - 5} lainnya` : ""}. Susun DPPA-nya di tab Pelaksanaan (buka kembali DPA, sesuaikan rencana penarikan, verifikasi, setujui) sebelum mengajukan SPP baru pada perubahan tersebut.`);
  }
  const spent = await spentByKey(db, villageId, d.year);
  const under: string[] = [];
  for (const k of new Set([...spent.realized.keys(), ...spent.open.keys()])) {
    const used = (spent.realized.get(k) ?? 0n) + (spent.open.get(k) ?? 0n);
    const cap = now.get(k) ?? 0n;
    if (used > cap) under.push(`${k.replace("|", " / ")} (anggaran Rp${fromCents(cap)}, terpakai Rp${fromCents(used)})`);
  }
  if (under.length) warnings.push(`Anggaran di bawah realisasi (termasuk SPP berjalan) pada ${under.slice(0, 5).join("; ")}${under.length > 5 ? `; dan ${under.length - 5} lainnya` : ""}. Peraturan Desa tetap berlaku, tetapi pencatatan dan SPP baru pada rekening itu akan ditolak. Periksa kembali isi Peraturan Desa perubahan.`);
  return warnings;
}
