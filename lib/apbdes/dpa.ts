/**
 * Dokumen Pelaksanaan Anggaran (DPA) per kegiatan menurut Permendagri 20/2018 Pasal 45-48:
 * Rencana Kegiatan dan Anggaran (RKA, termasuk rencana penarikan bulanan = dasar RAK Desa), Rencana Kerja Kegiatan (RKK),
 * Rencana Anggaran Biaya (RAB). Sekretaris Desa memverifikasi, Kepala Desa menyetujui. Uang dalam sen (BigInt).
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, invalid, isRecord, type Parsed, type Result } from "@/lib/form-input";
import { fromCents, mulDivRound, toCents, type Cents } from "@/lib/coop/loan-math";
import { accountKind, accountName, isKegiatanCode, isLeafAccountCode, kegiatanName, type PlanStatus } from "./catalog";
import { Rollback, activeDocument, ensureYear, lockYear, ok, rollbackToResult } from "./service";

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
  accounts: AccountPlanView[];
  /** Semua rekening sudah punya rencana penarikan yang jumlahnya sama dengan anggaran */
  rakComplete: boolean;
  /** Anggaran sudah berubah sejak persetujuan (rencana tak lagi sama dengan APB Desa): perlu DPPA */
  needsRevision: boolean;
  costItems: { id: number; accountCode: string; description: string; volume: string; unit: string; unitPrice: string; amount: string }[];
}

const dec = (v: Prisma.Decimal | null | undefined): string | null => (v === null || v === undefined ? null : v.toFixed(2));

export async function planOverview(db: Db, villageId: number, year: number): Promise<{ activeLabel: string | null; activities: ActivityPlanView[] }> {
  const doc = await activeDocument(db, villageId, year);
  if (!doc) return { activeLabel: null, activities: [] };
  const [plans, cash, items] = await Promise.all([
    db.apbdesActivityPlan.findMany({ where: { villageId, year } }),
    db.apbdesCashPlan.findMany({ where: { villageId, year } }),
    db.apbdesCostItem.findMany({ where: { villageId, year }, orderBy: { id: "asc" } }),
  ]);
  const budget = new Map<string, Cents>();
  for (const l of doc.lines) if (l.activityCode && accountKind(l.accountCode) === "BELANJA") budget.set(keyOf(l.activityCode, l.accountCode), (budget.get(keyOf(l.activityCode, l.accountCode)) ?? 0n) + l.amountCents);
  const codes = [...new Set([...budget.keys()].map((k) => k.split("|")[0]!))].sort();
  const activities = codes.map((code): ActivityPlanView => {
    const p = plans.find((x) => x.activityCode === code);
    const accKeys = [...budget.keys()].filter((k) => k.startsWith(`${code}|`)).sort();
    const accounts = accKeys.map((k): AccountPlanView => {
      const acc = k.split("|")[1]!;
      const months = Array.from({ length: 12 }, (_, i) => cash.find((c) => c.activityCode === code && c.accountCode === acc && c.month === i + 1)?.amountCents ?? 0n);
      const planned = months.reduce((a, b) => a + b, 0n);
      const rab = items.filter((x) => x.activityCode === code && x.accountCode === acc).reduce((a, b) => a + b.amountCents, 0n);
      return { accountCode: acc, accountName: accountName(acc) ?? acc, budget: fromCents(budget.get(k)!), months: months.map(fromCents), planned: fromCents(planned), rabTotal: fromCents(rab), complete: planned === budget.get(k) };
    });
    const total = accKeys.reduce((a, k) => a + budget.get(k)!, 0n);
    const rakComplete = accounts.every((a) => a.complete);
    const status = (p?.status as PlanStatus | undefined) ?? "DRAFT";
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
      accounts,
      rakComplete,
      needsRevision: status !== "DRAFT" && !rakComplete,
      costItems: items.filter((x) => x.activityCode === code).map((x) => ({ id: x.id, accountCode: x.accountCode, description: x.description, volume: x.volume.toFixed(2), unit: x.unit, unitPrice: fromCents(x.unitPriceCents), amount: fromCents(x.amountCents) })),
    };
  });
  return { activeLabel: doc.version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${doc.version}`, activities };
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

export async function savePlan(db: PrismaClient, args: { villageId: number; year: number; activityCode: string; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parsePlanInput(args.input);
  if (!p.ok) return invalid(p);
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
  const item = await db.apbdesCostItem.findFirst({ where: { id: args.itemId, villageId: args.villageId, year: args.year } });
  if (!item) return fail(404, "Baris RAB tidak ditemukan.");
  const plan = await db.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode: item.activityCode } } });
  if (plan && plan.status !== "DRAFT") return fail(409, "DPA kegiatan ini sudah diverifikasi atau disetujui. Buka kembali ke draf untuk mengubahnya.");
  await db.apbdesCostItem.delete({ where: { id: item.id } });
  return ok({ id: item.id });
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

/** Verifikasi Sekretaris Desa, persetujuan Kepala Desa, atau buka kembali ke draf. */
export async function advancePlan(db: PrismaClient, args: { villageId: number; year: number; activityCode: string; action: PlanAction; now?: Date }): Promise<Result<{ status: PlanStatus }>> {
  await ensureYear(db, args.villageId, args.year);
  const now = args.now ?? new Date();
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, args.year);
      const plan = await tx.apbdesActivityPlan.findUnique({ where: { villageId_year_activityCode: { villageId: args.villageId, year: args.year, activityCode: args.activityCode } } });
      if (!plan) return fail(404, "DPA kegiatan ini belum dibuat.");
      if (args.action === "verify") {
        if (plan.status !== "DRAFT") return fail(409, "DPA ini sudah diverifikasi.");
        if (!plan.executorName) return fail(409, "Isi nama pelaksana kegiatan (Kaur/Kasi) dulu.");
        const view = (await planOverview(tx, args.villageId, args.year)).activities.find((a) => a.activityCode === args.activityCode);
        if (!view) return fail(409, "Kegiatan ini tidak ada di APB Desa yang berlaku.");
        const incomplete = view.accounts.filter((a) => !a.complete).map((a) => a.accountCode);
        if (incomplete.length) throw new Rollback(`Rencana penarikan belum sama dengan anggaran pada rekening ${incomplete.join(", ")}.`);
        await tx.apbdesActivityPlan.update({ where: { id: plan.id }, data: { status: "DIVERIFIKASI", verifiedAt: now } });
        return ok({ status: "DIVERIFIKASI" as PlanStatus });
      }
      if (args.action === "approve") {
        if (plan.status !== "DIVERIFIKASI") return fail(409, "DPA harus diverifikasi Sekretaris Desa lebih dulu.");
        await tx.apbdesActivityPlan.update({ where: { id: plan.id }, data: { status: "DISETUJUI", approvedAt: now } });
        return ok({ status: "DISETUJUI" as PlanStatus });
      }
      if (plan.status === "DRAFT") return fail(409, "DPA ini masih draf.");
      const spp = await tx.apbdesPayRequest.count({ where: { villageId: args.villageId, year: args.year, activityCode: args.activityCode, status: { not: "DITOLAK" } } });
      if (spp > 0) return fail(409, "Kegiatan ini sudah punya SPP. DPA tidak dapat dibuka kembali; susun DPPA lewat Perubahan APB Desa.");
      await tx.apbdesActivityPlan.update({ where: { id: plan.id }, data: { status: "DRAFT", verifiedAt: null, approvedAt: null } });
      return ok({ status: "DRAFT" as PlanStatus });
    })
    .catch(rollbackToResult);
}

/** Total rencana penarikan kumulatif untuk satu kegiatan+rekening sampai bulan tertentu (dasar batas SPP, Pasal 53). */
export async function plannedThrough(db: Db, villageId: number, year: number, activityCode: string, accountCode: string, month: number): Promise<Cents> {
  const rows = await db.apbdesCashPlan.findMany({ where: { villageId, year, activityCode, accountCode, month: { lte: month } }, select: { amountCents: true } });
  return rows.reduce((a, r) => a + r.amountCents, 0n);
}
