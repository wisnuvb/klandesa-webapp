/**
 * Tanah kas desa dan pemanfaatan aset: atribut tanah, perjanjian (sewa / kerja sama / BGS-BSG), jadwal tagihan, penerimaan ke Buku Kas Umum.
 *
 * Penerimaan ke APB Desa HANYA lewat createEntryInTx / deleteEntryInTx milik modul APB Desa (tidak menulis apbdes_entries sendiri).
 * Kunci (urutan SERAGAM: barang lalu tahun; pernyataan PERTAMA transaksi, MySQL REPEATABLE READ):
 *  - semua jalur yang menyangkut objek (aktifkan, akhiri, batalkan, hapus barang, terima/batalkan penerimaan): SELECT ... FOR UPDATE
 *    pada baris inventory_items lebih dulu;
 *  - terima/batalkan penerimaan lalu mengunci tahun anggaran (lockYear) dan mengklaim baris tagihan dengan UPDATE bersyarat status.
 * Tak ada jalur yang memegang tahun lalu meminta barang, jadi tidak ada urutan terbalik.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { Rollback, createEntryInTx, deleteEntryInTx, ensureYear, lockYear, rollbackToResult } from "@/lib/apbdes/service";
import type { EntryInput } from "@/lib/apbdes/schema";
import { CATEGORIES, isStrategic } from "./catalog";
import {
  AGREEMENT_KINDS,
  LAND_CATEGORIES,
  LEASABLE_CATEGORIES,
  LIMITS,
  NEEDS_APPRAISAL,
  defaultAccountFor,
  isLandCategory,
  isLeasable,
  type AgreementKind,
} from "./land-catalog";
import { activationBlockers, buildChargePlan, landFindings, overlapProblem, type Finding, type Span } from "./land-calc";
import { parseAgreementInput, parseAmendInput, parseDocInput, parseParcelInput, parseReceiveInput } from "./land-schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const num = (v: Prisma.Decimal | null): number | null => (v === null ? null : Number(v));
const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;
const todayOf = (now: Date): string => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10); // WIB

/** Kunci baris barang inventaris (induk dari semua perjanjian atas barang itu). HARUS pernyataan pertama transaksi. */
async function lockItem(tx: Db, villageId: number, itemId: number): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM inventory_items WHERE id = ${itemId} AND villageId = ${villageId} FOR UPDATE`;
  return rows.length > 0;
}

// ---- Atribut tanah

const parcelView = (p: { itemId: number; areaSqm: Prisma.Decimal; address: string | null; boundaryNorth: string | null; boundaryEast: string | null; boundarySouth: string | null; boundaryWest: string | null; rightKind: string; rightNumber: string | null; rightHolder: string | null; rightIssuedOn: Date | null; persilNo: string | null; letterCNo: string | null; usage: string; usageNote: string | null; notes: string | null }) => ({
  itemId: p.itemId,
  areaSqm: p.areaSqm.toFixed(2),
  address: p.address,
  boundaryNorth: p.boundaryNorth,
  boundaryEast: p.boundaryEast,
  boundarySouth: p.boundarySouth,
  boundaryWest: p.boundaryWest,
  rightKind: p.rightKind,
  rightNumber: p.rightNumber,
  rightHolder: p.rightHolder,
  rightIssuedOn: isoDay(p.rightIssuedOn),
  persilNo: p.persilNo,
  letterCNo: p.letterCNo,
  usage: p.usage,
  usageNote: p.usageNote,
  notes: p.notes,
});
export type ParcelView = ReturnType<typeof parcelView>;

export interface LandListFilter {
  search?: string;
  page: number;
  pageSize: number;
}

/** Barang golongan tanah yang masih tercatat, beserta atribut tanah (bila sudah dilengkapi) dan jumlah perjanjian berlaku. */
export async function listLand(db: Db, villageId: number, f: LandListFilter) {
  const where: Prisma.InventoryItemWhereInput = { villageId, status: "ACTIVE", category: { in: [...LAND_CATEGORIES] } };
  if (f.search) where.OR = [{ name: { contains: f.search } }, { location: { contains: f.search } }, { itemCode: { contains: f.search } }];
  const [rows, total] = await Promise.all([
    db.inventoryItem.findMany({ where, include: { landParcel: true }, orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.inventoryItem.count({ where }),
  ]);
  const ids = rows.map((r) => r.id);
  const active = ids.length ? await db.landAgreement.groupBy({ by: ["itemId"], where: { villageId, itemId: { in: ids }, status: "AKTIF" }, _count: { _all: true } }) : [];
  const activeBy = new Map(active.map((a) => [a.itemId, a._count._all]));
  return {
    items: rows.map((r) => ({
      itemId: r.id,
      name: r.name,
      category: r.category,
      categoryLabel: CATEGORIES[r.category as keyof typeof CATEGORIES]?.label ?? r.category,
      strategic: isStrategic(r.category),
      itemCode: r.itemCode,
      location: r.location,
      parcel: r.landParcel ? parcelView(r.landParcel) : null,
      activeAgreements: activeBy.get(r.id) ?? 0,
    })),
    total,
    page: f.page,
    pageSize: f.pageSize,
  };
}
export type LandRow = Awaited<ReturnType<typeof listLand>>["items"][number];

export async function saveParcel(db: PrismaClient, args: { villageId: number; userId: number | null; itemId: number; input: unknown; now?: Date }): Promise<Result<ParcelView>> {
  const p = parseParcelInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  const item = await db.inventoryItem.findFirst({ where: { id: args.itemId, villageId: args.villageId }, select: { category: true, status: true } });
  if (!item) return fail(404, "Barang tidak ditemukan.");
  if (!isLandCategory(item.category)) return fail(400, "Atribut tanah hanya untuk barang golongan tanah (tanah kas desa, tanah, tanah ulayat).");
  if (item.status !== "ACTIVE") return fail(409, "Barang ini sudah dihapus dari buku inventaris dan tidak dapat diubah.");
  const data = { ...p.value, areaSqm: p.value.areaSqm };
  try {
    const row = await db.landParcel.upsert({ where: { itemId: args.itemId }, create: { villageId: args.villageId, itemId: args.itemId, createdById: args.userId, ...data }, update: data });
    return ok(parcelView(row));
  } catch (e) {
    // Dua permintaan pertama bersamaan: yang kedua menabrak kunci unik itemId; ulangi sebagai ubah.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const row = await db.landParcel.update({ where: { itemId: args.itemId }, data });
      return ok(parcelView(row));
    }
    throw e;
  }
}

// ---- Perjanjian

type AgreementRow = Prisma.LandAgreementGetPayload<{ include: { item: { select: { name: true; category: true; status: true } } } }>;

function agreementView(a: AgreementRow) {
  const kind = a.kind as AgreementKind;
  return {
    id: a.id,
    itemId: a.itemId,
    itemName: a.item.name,
    category: a.item.category,
    categoryLabel: CATEGORIES[a.item.category as keyof typeof CATEGORIES]?.label ?? a.item.category,
    strategic: isStrategic(a.item.category),
    kind,
    kindLabel: AGREEMENT_KINDS[kind]?.label ?? a.kind,
    status: a.status,
    agreementNo: a.agreementNo,
    signedOn: isoDay(a.signedOn),
    lesseeName: a.lesseeName,
    lesseeKind: a.lesseeKind,
    lesseeAddress: a.lesseeAddress,
    lesseeContact: a.lesseeContact,
    purpose: a.purpose,
    objectNote: a.objectNote,
    leasedAreaSqm: a.leasedAreaSqm ? a.leasedAreaSqm.toFixed(2) : null,
    startOn: iso(a.startOn),
    endOn: iso(a.endOn),
    periodUnit: a.periodUnit,
    amount: fromCents(a.amountCents),
    accountCode: a.accountCode,
    tenantDuties: a.tenantDuties,
    forceMajeureIncluded: a.forceMajeureIncluded,
    otherTerms: a.otherTerms,
    perdesNo: a.perdesNo,
    perdesDate: isoDay(a.perdesDate),
    regencyPermitNo: a.regencyPermitNo,
    regencyPermitDate: isoDay(a.regencyPermitDate),
    appraisalRef: a.appraisalRef,
    endedOn: isoDay(a.endedOn),
    endedReason: a.endedReason,
    needsRegencyPermit: AGREEMENT_KINDS[kind]?.needsRegencyPermit ?? false,
  };
}
export type AgreementView = ReturnType<typeof agreementView>;

const itemSel = { select: { name: true, category: true, status: true } } as const;

export interface AgreementFilter {
  status?: string;
  itemId?: number;
  page: number;
  pageSize: number;
}

export async function listAgreements(db: Db, villageId: number, f: AgreementFilter) {
  const where: Prisma.LandAgreementWhereInput = { villageId };
  if (f.status && ["DRAF", "AKTIF", "SELESAI", "BATAL"].includes(f.status)) where.status = f.status;
  if (f.itemId) where.itemId = f.itemId;
  const [rows, total] = await Promise.all([
    db.landAgreement.findMany({ where, include: { item: itemSel }, orderBy: [{ status: "asc" }, { endOn: "asc" }, { id: "desc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.landAgreement.count({ where }),
  ]);
  const ids = rows.map((r) => r.id);
  const groups = ids.length ? await db.landCharge.groupBy({ by: ["agreementId", "status"], where: { villageId, agreementId: { in: ids } }, _count: { _all: true }, _sum: { amountCents: true } }) : [];
  const sum = new Map<number, { open: number; received: number; receivedCents: bigint; openCents: bigint }>();
  for (const g of groups) {
    const s = sum.get(g.agreementId) ?? { open: 0, received: 0, receivedCents: 0n, openCents: 0n };
    if (g.status === "BELUM") {
      s.open += g._count._all;
      s.openCents += g._sum.amountCents ?? 0n;
    }
    if (g.status === "DITERIMA") {
      s.received += g._count._all;
      s.receivedCents += g._sum.amountCents ?? 0n;
    }
    sum.set(g.agreementId, s);
  }
  return {
    items: rows.map((r) => {
      const s = sum.get(r.id) ?? { open: 0, received: 0, receivedCents: 0n, openCents: 0n };
      return { ...agreementView(r), openCharges: s.open, receivedCharges: s.received, receivedTotal: fromCents(s.receivedCents), openTotal: fromCents(s.openCents) };
    }),
    total,
    page: f.page,
    pageSize: f.pageSize,
  };
}

async function parcelAreaOf(db: Db, villageId: number, itemId: number): Promise<number | null> {
  const p = await db.landParcel.findFirst({ where: { itemId, villageId }, select: { areaSqm: true } });
  return p ? Number(p.areaSqm) : null;
}

async function loadSpans(db: Db, villageId: number, itemId: number, excludeId: number): Promise<Span[]> {
  const rows = await db.landAgreement.findMany({ where: { villageId, itemId, status: "AKTIF", id: { not: excludeId } }, select: { id: true, startOn: true, endOn: true, leasedAreaSqm: true }, take: 500 });
  return rows.map((r) => ({ id: r.id, startOn: r.startOn, endOn: r.endOn, areaSqm: num(r.leasedAreaSqm) }));
}

export async function createAgreement(db: PrismaClient, args: { villageId: number; userId: number | null; itemId: unknown; input: unknown }): Promise<Result<AgreementView>> {
  const itemId = typeof args.itemId === "number" && Number.isInteger(args.itemId) && args.itemId > 0 ? args.itemId : typeof args.itemId === "string" && /^\d{1,10}$/.test(args.itemId) ? Number(args.itemId) : null;
  const p = parseAgreementInput(args.input);
  if (!p.ok) return invalid(p);
  if (itemId === null) return invalid({ errors: ["Pilih objek yang dimanfaatkan."], fieldErrors: { itemId: "Pilih objek yang dimanfaatkan." } });
  const item = await db.inventoryItem.findFirst({ where: { id: itemId, villageId: args.villageId }, select: { category: true, status: true } });
  if (!item) return invalid({ errors: ["Objek tidak ditemukan."], fieldErrors: { itemId: "Objek tidak ditemukan." } });
  if (item.status !== "ACTIVE") return invalid({ errors: ["Objek sudah dihapus dari buku inventaris."], fieldErrors: { itemId: "Objek sudah dihapus dari buku inventaris." } });
  if (!isLeasable(item.category)) return invalid({ errors: ["Golongan barang ini tidak dapat dimanfaatkan lewat modul ini."], fieldErrors: { itemId: "Golongan barang ini tidak dapat dimanfaatkan lewat modul ini." } });
  const area = await parcelAreaOf(db, args.villageId, itemId);
  if (p.value.leasedAreaSqm !== null && area !== null && Number(p.value.leasedAreaSqm) > area + 0.005) {
    return invalid({ errors: ["Luas yang dimanfaatkan melebihi luas objek."], fieldErrors: { leasedAreaSqm: `Melebihi luas objek (${area.toLocaleString("id-ID")} m2).` } });
  }
  if ((await db.landAgreement.count({ where: { villageId: args.villageId } })) >= LIMITS.agreementsPerVillage) return fail(409, `Maksimal ${LIMITS.agreementsPerVillage.toLocaleString("id-ID")} perjanjian per desa.`);
  const { amountCents, accountCode, ...rest } = p.value;
  const row = await db.landAgreement.create({
    data: { villageId: args.villageId, itemId, createdById: args.userId, ...rest, amountCents, accountCode: accountCode ?? defaultAccountFor(item.category) },
    include: { item: itemSel },
  });
  return ok(agreementView(row));
}

export async function getAgreement(db: Db, villageId: number, id: number) {
  const a = await db.landAgreement.findFirst({ where: { id, villageId }, include: { item: itemSel } });
  if (!a) return null;
  const [charges, docs] = await Promise.all([
    db.landCharge.findMany({ where: { agreementId: id, villageId }, orderBy: { seq: "asc" }, take: LIMITS.chargesPerAgreement }),
    db.landAgreementDoc.findMany({ where: { agreementId: id, villageId }, orderBy: { id: "asc" }, take: LIMITS.docsPerAgreement }),
  ]);
  const entryIds = charges.map((c) => c.entryId).filter((v): v is number => v !== null);
  const entries = entryIds.length ? await db.apbdesEntry.findMany({ where: { villageId, id: { in: entryIds } }, select: { id: true, amountCents: true } }) : [];
  const entryBy = new Map(entries.map((e) => [e.id, e.amountCents]));
  const archives = docs.length ? await db.digitalArchive.findMany({ where: { villageId, id: { in: docs.map((d) => d.archiveId) } }, select: { id: true, title: true, fileName: true } }) : [];
  const archBy = new Map(archives.map((r) => [r.id.toString(), r]));
  const view = agreementView(a);
  const parcel = await db.landParcel.findFirst({ where: { itemId: a.itemId, villageId }, select: { areaSqm: true } });
  const blockers = a.status === "DRAF" ? activationBlockers({ kind: a.kind as AgreementKind, agreementNo: a.agreementNo, signedOn: a.signedOn, perdesNo: a.perdesNo, perdesDate: a.perdesDate, regencyPermitNo: a.regencyPermitNo, regencyPermitDate: a.regencyPermitDate, forceMajeureIncluded: a.forceMajeureIncluded, tenantDuties: a.tenantDuties, appraisalRef: a.appraisalRef }) : [];
  return {
    agreement: view,
    parcelAreaSqm: parcel ? parcel.areaSqm.toFixed(2) : null,
    blockers,
    charges: charges.map((c) => ({
      id: c.id,
      seq: c.seq,
      dueOn: iso(c.dueOn),
      amount: fromCents(c.amountCents),
      status: c.status,
      receivedOn: isoDay(c.receivedOn),
      channel: c.channel,
      voucherNo: c.voucherNo,
      entryId: c.entryId,
      entryMissing: c.status === "DITERIMA" && (c.entryId === null || !entryBy.has(c.entryId)),
      entryAmountMismatch: c.status === "DITERIMA" && c.entryId !== null && entryBy.has(c.entryId) && entryBy.get(c.entryId) !== c.amountCents,
    })),
    docs: docs.map((d) => ({ id: d.id, kind: d.kind, archiveId: d.archiveId.toString(), label: d.label, title: archBy.get(d.archiveId.toString())?.title ?? null, fileName: archBy.get(d.archiveId.toString())?.fileName ?? null, missing: !archBy.has(d.archiveId.toString()) })),
  };
}
export type AgreementDetail = NonNullable<Awaited<ReturnType<typeof getAgreement>>>;

/** Ubah draf (isi lengkap). Perjanjian yang sudah berlaku hanya dapat diubah terbatas (amendAgreement). */
export async function updateDraft(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<AgreementView>> {
  const p = parseAgreementInput(args.input);
  if (!p.ok) return invalid(p);
  const cur = await db.landAgreement.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { itemId: true, item: { select: { category: true } } } });
  if (!cur) return fail(404, "Perjanjian tidak ditemukan.");
  const area = await parcelAreaOf(db, args.villageId, cur.itemId);
  if (p.value.leasedAreaSqm !== null && area !== null && Number(p.value.leasedAreaSqm) > area + 0.005) {
    return invalid({ errors: ["Luas yang dimanfaatkan melebihi luas objek."], fieldErrors: { leasedAreaSqm: `Melebihi luas objek (${area.toLocaleString("id-ID")} m2).` } });
  }
  const { accountCode, ...rest } = p.value;
  const done = await db.landAgreement.updateMany({ where: { id: args.id, villageId: args.villageId, status: "DRAF" }, data: { ...rest, accountCode: accountCode ?? defaultAccountFor(cur.item.category) } });
  if (done.count === 0) return fail(409, "Hanya perjanjian berstatus draf yang dapat diubah isinya.");
  const row = await db.landAgreement.findFirstOrThrow({ where: { id: args.id, villageId: args.villageId }, include: { item: itemSel } });
  return ok(agreementView(row));
}

export async function amendAgreement(db: Db, args: { villageId: number; id: number; input: unknown }): Promise<Result<AgreementView>> {
  const p = parseAmendInput(args.input);
  if (!p.ok) return invalid(p);
  const done = await db.landAgreement.updateMany({ where: { id: args.id, villageId: args.villageId, status: "AKTIF" }, data: p.value });
  if (done.count === 0) {
    const exists = await db.landAgreement.count({ where: { id: args.id, villageId: args.villageId } });
    return exists ? fail(409, "Hanya perjanjian yang sedang berlaku yang dapat dilengkapi dengan cara ini.") : fail(404, "Perjanjian tidak ditemukan.");
  }
  const row = await db.landAgreement.findFirstOrThrow({ where: { id: args.id, villageId: args.villageId }, include: { item: itemSel } });
  return ok(agreementView(row));
}

export async function deleteDraft(db: Db, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  const done = await db.landAgreement.deleteMany({ where: { id: args.id, villageId: args.villageId, status: "DRAF" } });
  if (done.count === 0) {
    const exists = await db.landAgreement.count({ where: { id: args.id, villageId: args.villageId } });
    return exists ? fail(409, "Hanya draf yang dapat dihapus. Perjanjian yang pernah berlaku disimpan sebagai riwayat.") : fail(404, "Perjanjian tidak ditemukan.");
  }
  return ok({ id: args.id });
}

class Stop extends Error {}
const stop = (msg: string): never => {
  throw new Stop(msg);
};
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(409, e.message);
  return rollbackToResult(e);
};

/** Memberlakukan draf: memeriksa syarat wajib, tumpang tindih, lalu membuat jadwal tagihan. Kunci baris barang lebih dulu. */
export async function activateAgreement(db: PrismaClient, args: { villageId: number; userId: number | null; id: number }): Promise<Result<{ id: number; charges: number }>> {
  const head = await db.landAgreement.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { itemId: true } });
  if (!head) return fail(404, "Perjanjian tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      if (!(await lockItem(tx, args.villageId, head.itemId))) return stop("Barang tidak ditemukan.");
      const a = await tx.landAgreement.findFirst({ where: { id: args.id, villageId: args.villageId }, include: { item: itemSel } });
      if (!a) return stop("Perjanjian tidak ditemukan.");
      if (a.status !== "DRAF") return stop("Perjanjian ini bukan draf, sehingga tidak dapat diberlakukan lagi.");
      if (a.item.status !== "ACTIVE") return stop("Objek sudah dihapus dari buku inventaris.");
      const blockers = activationBlockers({ kind: a.kind as AgreementKind, agreementNo: a.agreementNo, signedOn: a.signedOn, perdesNo: a.perdesNo, perdesDate: a.perdesDate, regencyPermitNo: a.regencyPermitNo, regencyPermitDate: a.regencyPermitDate, forceMajeureIncluded: a.forceMajeureIncluded, tenantDuties: a.tenantDuties, appraisalRef: a.appraisalRef });
      if (blockers.length) return stop(`Perjanjian belum lengkap. ${blockers.join(" ")}`);
      const area = await parcelAreaOf(tx, args.villageId, a.itemId);
      const problem = overlapProblem({ id: a.id, startOn: a.startOn, endOn: a.endOn, areaSqm: num(a.leasedAreaSqm) }, await loadSpans(tx, args.villageId, a.itemId, a.id), area);
      if (problem) return stop(problem);
      const plan = buildChargePlan(a.startOn, a.endOn, a.periodUnit as "BULAN" | "TAHUN" | "SEKALI", a.amountCents);
      if (!plan || plan.length > LIMITS.chargesPerAgreement) return stop("Jadwal tagihan tidak dapat dibuat dari jangka waktu dan periode ini.");
      const claimed = await tx.landAgreement.updateMany({ where: { id: a.id, villageId: args.villageId, status: "DRAF" }, data: { status: "AKTIF", activatedAt: new Date(), activatedById: args.userId } });
      if (claimed.count === 0) return stop("Perjanjian ini sudah diberlakukan.");
      await tx.landCharge.createMany({ data: plan.map((c) => ({ villageId: args.villageId, agreementId: a.id, seq: c.seq, dueOn: c.dueOn, amountCents: c.amountCents })) });
      return ok({ id: a.id, charges: plan.length });
    })
    .catch(asResult);
}

/**
 * Mengakhiri (SELESAI) atau membatalkan (BATAL) perjanjian yang berlaku. Tagihan yang belum jatuh tempo dibatalkan; tagihan yang sudah
 * jatuh tempo tetapi belum diterima tetap ditagih. BATAL hanya bila belum ada penerimaan sama sekali.
 */
export async function closeAgreement(db: PrismaClient, args: { villageId: number; id: number; mode: "SELESAI" | "BATAL"; reason: unknown; endedOn?: unknown; now?: Date }): Promise<Result<{ id: number; status: string; voided: number }>> {
  const reason = typeof args.reason === "string" ? args.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) return invalid({ errors: ["Isi alasan (3-300 karakter)."], fieldErrors: { reason: "Isi alasan (3-300 karakter)." } });
  const head = await db.landAgreement.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { itemId: true } });
  if (!head) return fail(404, "Perjanjian tidak ditemukan.");
  const today = todayOf(args.now ?? new Date());
  const endedRaw = typeof args.endedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.endedOn) ? args.endedOn : today;
  const endedOn = new Date(`${endedRaw}T00:00:00Z`);
  if (Number.isNaN(endedOn.getTime()) || endedOn.getUTCFullYear() < 2000 || endedRaw > todayOf(new Date((args.now ?? new Date()).getTime() + 86_400_000))) return invalid({ errors: ["Tanggal tidak valid."], fieldErrors: { endedOn: "Tanggal tidak valid atau di masa depan." } });
  return db
    .$transaction(async (tx) => {
      if (!(await lockItem(tx, args.villageId, head.itemId))) return stop("Barang tidak ditemukan.");
      const a = await tx.landAgreement.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { status: true } });
      if (!a) return stop("Perjanjian tidak ditemukan.");
      if (a.status !== "AKTIF") return stop("Hanya perjanjian yang sedang berlaku yang dapat diakhiri atau dibatalkan.");
      if (args.mode === "BATAL" && (await tx.landCharge.count({ where: { agreementId: args.id, villageId: args.villageId, status: "DITERIMA" } })) > 0) {
        return stop("Perjanjian ini sudah menerima pembayaran. Akhiri perjanjian (bukan dibatalkan); batalkan dulu penerimaan bila ingin membatalkan seluruhnya.");
      }
      const claimed = await tx.landAgreement.updateMany({ where: { id: args.id, villageId: args.villageId, status: "AKTIF" }, data: { status: args.mode, endedOn, endedReason: reason } });
      if (claimed.count === 0) return stop("Perjanjian ini sudah diakhiri.");
      const voided = await tx.landCharge.updateMany({ where: { agreementId: args.id, villageId: args.villageId, status: "BELUM", ...(args.mode === "BATAL" ? {} : { dueOn: { gt: endedOn } }) }, data: { status: "BATAL" } });
      return ok({ id: args.id, status: args.mode, voided: voided.count });
    })
    .catch(asResult);
}

// ---- Lampiran dokumen

export async function addDoc(db: Db, args: { villageId: number; userId: number | null; agreementId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseDocInput(args.input);
  if (!p.ok) return invalid(p);
  const a = await db.landAgreement.findFirst({ where: { id: args.agreementId, villageId: args.villageId }, select: { id: true } });
  if (!a) return fail(404, "Perjanjian tidak ditemukan.");
  const arch = await db.digitalArchive.findFirst({ where: { id: p.value.archiveId, villageId: args.villageId }, select: { id: true, title: true } });
  if (!arch) return invalid({ errors: ["Dokumen tidak ditemukan di Arsip Digital desa ini."], fieldErrors: { archiveId: "Dokumen tidak ditemukan di Arsip Digital desa ini." } });
  if ((await db.landAgreementDoc.count({ where: { agreementId: a.id } })) >= LIMITS.docsPerAgreement) return fail(409, `Maksimal ${LIMITS.docsPerAgreement} lampiran per perjanjian.`);
  try {
    const row = await db.landAgreementDoc.create({ data: { villageId: args.villageId, agreementId: a.id, kind: p.value.kind, archiveId: arch.id, label: (p.value.label ?? arch.title).slice(0, 150), createdById: args.userId } });
    return ok({ id: row.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Dokumen ini sudah dilampirkan pada perjanjian.");
    throw e;
  }
}

export async function removeDoc(db: Db, args: { villageId: number; agreementId: number; docId: number }): Promise<Result<{ id: number }>> {
  const done = await db.landAgreementDoc.deleteMany({ where: { id: args.docId, agreementId: args.agreementId, villageId: args.villageId } });
  return done.count ? ok({ id: args.docId }) : fail(404, "Lampiran tidak ditemukan.");
}

// ---- Penerimaan ke Buku Kas Umum

/**
 * Mencatat tagihan diterima + penerimaan PADes di Buku Kas Umum dalam SATU transaksi. Kunci tahun lebih dulu (pernyataan pertama),
 * lalu klaim tagihan dengan UPDATE bersyarat status BELUM: dua klik/permintaan bersamaan hanya satu yang lolos.
 */
export async function receiveCharge(db: PrismaClient, args: { villageId: number; userId: number | null; chargeId: number; input: unknown; now?: Date }): Promise<Result<{ chargeId: number; entryId: number; year: number }>> {
  const p = parseReceiveInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  const year = p.value.receivedOn.getUTCFullYear();
  if (!validYear(year)) return fail(400, "Tanggal di luar rentang tahun anggaran yang didukung.");
  const pre = await db.landCharge.findFirst({ where: { id: args.chargeId, villageId: args.villageId }, select: { agreement: { select: { itemId: true } } } });
  if (!pre) return fail(404, "Tagihan tidak ditemukan.");
  await ensureYear(db, args.villageId, year);
  return db
    .$transaction(async (tx) => {
      // Urutan kunci seragam: baris barang dulu (sama dengan akhiri/batalkan perjanjian), baru kunci tahun APB Desa.
      if (!(await lockItem(tx, args.villageId, pre.agreement.itemId))) return stop("Barang tidak ditemukan.");
      await lockYear(tx, args.villageId, year);
      const claimed = await tx.landCharge.updateMany({
        // Perjanjian berlaku, atau sudah SELESAI (tunggakan yang jatuh tempo masih ditagih). BATAL dan DRAF tidak pernah.
        where: { id: args.chargeId, villageId: args.villageId, status: "BELUM", agreement: { status: { in: ["AKTIF", "SELESAI"] } } },
        data: { status: "DITERIMA", receivedOn: p.value.receivedOn, channel: p.value.channel, receivedById: args.userId },
      });
      if (claimed.count === 0) return stop("Tagihan ini sudah diterima, dibatalkan, atau perjanjiannya dibatalkan.");
      const c = await tx.landCharge.findFirstOrThrow({ where: { id: args.chargeId, villageId: args.villageId }, include: { agreement: { include: { item: itemSel } } } });
      const a = c.agreement;
      // Perjanjian SELESAI hanya menerima tagihan yang jatuh tempo pada atau sebelum tanggal berakhir (yang sesudahnya sudah dibatalkan).
      if (a.status === "SELESAI" && (a.endedOn === null || c.dueOn.getTime() > a.endedOn.getTime())) throw new Rollback("Tagihan ini jatuh tempo sesudah perjanjian diakhiri dan tidak dapat diterima.");
      const total = await tx.landCharge.count({ where: { agreementId: c.agreementId, status: { not: "BATAL" } } });
      const voucherNo = p.value.voucherNo ?? `SEWA-${a.id}-${c.seq}`;
      const value: EntryInput = {
        entryDate: p.value.receivedOn,
        voucherNo,
        type: "PENERIMAAN",
        channel: p.value.channel,
        activityCode: null,
        accountCode: a.accountCode,
        description: `${AGREEMENT_KINDS[a.kind as AgreementKind]?.chargeLabel ?? "Sewa"} ${a.item.name} oleh ${a.lesseeName}, tagihan ke-${c.seq} dari ${total}`.slice(0, 300),
        amountCents: c.amountCents,
        taxCents: 0n,
        taxKind: null,
        bankFee: false,
      };
      const r = await createEntryInTx(tx, { villageId: args.villageId, userId: args.userId, year, value });
      if (!r.ok) throw new Rollback(r.errors[0] ?? "Buku Kas Umum menolak catatan ini.");
      await tx.landCharge.update({ where: { id: c.id }, data: { entryId: r.data.id, voucherNo } });
      return ok({ chargeId: c.id, entryId: r.data.id, year });
    })
    .catch(asResult);
}

/** Membatalkan penerimaan (koreksi salah catat): menghapus catatan Buku Kas Umum yang bertaut lewat fungsi buku kas, lalu mengembalikan tagihan ke "belum". */
export async function revertReceipt(db: PrismaClient, args: { villageId: number; chargeId: number }): Promise<Result<{ chargeId: number }>> {
  const pre = await db.landCharge.findFirst({ where: { id: args.chargeId, villageId: args.villageId }, select: { status: true, entryId: true, receivedOn: true, agreement: { select: { itemId: true } } } });
  if (!pre) return fail(404, "Tagihan tidak ditemukan.");
  if (pre.status !== "DITERIMA") return fail(409, "Tagihan ini belum tercatat diterima.");
  const entry = pre.entryId !== null ? await db.apbdesEntry.findFirst({ where: { id: pre.entryId, villageId: args.villageId }, select: { year: true } }) : null;
  const year = entry?.year ?? pre.receivedOn?.getUTCFullYear() ?? new Date().getUTCFullYear();
  if (!validYear(year)) return fail(400, "Tahun anggaran tidak didukung.");
  await ensureYear(db, args.villageId, year);
  return db
    .$transaction(async (tx) => {
      if (!(await lockItem(tx, args.villageId, pre.agreement.itemId))) return stop("Barang tidak ditemukan.");
      await lockYear(tx, args.villageId, year);
      const claimed = await tx.landCharge.updateMany({
        where: { id: args.chargeId, villageId: args.villageId, status: "DITERIMA" },
        data: { status: "BELUM", receivedOn: null, channel: null, voucherNo: null, entryId: null, receivedById: null },
      });
      if (claimed.count === 0) return stop("Penerimaan ini sudah dibatalkan.");
      if (pre.entryId !== null && entry) {
        const del = await deleteEntryInTx(tx, { villageId: args.villageId, entryId: pre.entryId });
        if (!del.ok) throw new Rollback(del.errors[0] ?? "Catatan Buku Kas Umum tidak dapat dihapus.");
      }
      return ok({ chargeId: args.chargeId });
    })
    .catch(asResult);
}

// ---- Ringkasan dan peringatan

export async function overview(db: Db, villageId: number, now: Date = new Date()) {
  const today = todayOf(now);
  const horizon = new Date(`${today}T00:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const yearStart = new Date(Date.UTC(Number(today.slice(0, 4)), 0, 1));
  const [agreements, openCharges, receivedCharges, parcels, bare, receivedAgg, activeCount, draftCount] = await Promise.all([
    // Perjanjian SELESAI ikut dibaca selama masih punya tunggakan atau penerimaan tahun ini (tunggakan tetap ditagih).
    db.landAgreement.findMany({
      where: { villageId, OR: [{ status: "AKTIF" }, { status: "SELESAI", charges: { some: { OR: [{ status: "BELUM" }, { status: "DITERIMA", receivedOn: { gte: yearStart } }] } } }] },
      include: { item: itemSel },
      orderBy: { endOn: "asc" },
      take: 500,
    }),
    db.landCharge.findMany({ where: { villageId, status: "BELUM", dueOn: { lte: horizon }, agreement: { status: { in: ["AKTIF", "SELESAI"] } } }, orderBy: { dueOn: "asc" }, take: 500 }),
    db.landCharge.findMany({ where: { villageId, status: "DITERIMA", receivedOn: { gte: yearStart }, agreement: { status: { in: ["AKTIF", "SELESAI"] } } }, orderBy: { receivedOn: "desc" }, take: 1000 }),
    db.landParcel.findMany({ where: { villageId, item: { status: "ACTIVE" } }, include: { item: { select: { name: true } } }, take: 2000 }),
    db.inventoryItem.findMany({ where: { villageId, status: "ACTIVE", category: { in: [...LAND_CATEGORIES] }, landParcel: { is: null } }, select: { id: true, name: true }, orderBy: { id: "asc" }, take: 50 }),
    db.landCharge.aggregate({ where: { villageId, status: "DITERIMA", receivedOn: { gte: yearStart } }, _sum: { amountCents: true }, _count: { _all: true } }),
    db.landAgreement.count({ where: { villageId, status: "AKTIF" } }),
    db.landAgreement.count({ where: { villageId, status: "DRAF" } }),
  ]);
  const entryIds = receivedCharges.map((c) => c.entryId).filter((v): v is number => v !== null);
  const entries = entryIds.length ? await db.apbdesEntry.findMany({ where: { villageId, id: { in: entryIds } }, select: { id: true, amountCents: true } }) : [];
  const entryBy = new Map(entries.map((e) => [e.id, e.amountCents]));
  const findings: Finding[] = landFindings({
    today,
    agreements: agreements.map((a) => ({ id: a.id, kind: a.kind as AgreementKind, status: a.status, endOn: iso(a.endOn), itemId: a.itemId, itemName: a.item.name, category: a.item.category, strategic: isStrategic(a.item.category), lesseeName: a.lesseeName, regencyPermitNo: a.regencyPermitNo, appraisalRef: a.appraisalRef, perdesNo: a.perdesNo })),
    charges: [
      ...openCharges.map((c) => ({ id: c.id, agreementId: c.agreementId, seq: c.seq, dueOn: iso(c.dueOn), status: c.status, amountCents: c.amountCents, entryMissing: false, entryAmountMismatch: false })),
      ...receivedCharges.map((c) => ({ id: c.id, agreementId: c.agreementId, seq: c.seq, dueOn: iso(c.dueOn), status: c.status, amountCents: c.amountCents, entryMissing: c.entryId === null || !entryBy.has(c.entryId), entryAmountMismatch: c.entryId !== null && entryBy.has(c.entryId) && entryBy.get(c.entryId) !== c.amountCents })),
    ],
    parcels: parcels.map((p) => ({ itemId: p.itemId, itemName: p.item.name, rightKind: p.rightKind, areaSqm: Number(p.areaSqm) })),
    landItemsWithoutParcel: bare.map((b) => ({ itemId: b.id, name: b.name })),
  });
  return {
    today,
    counts: { activeAgreements: activeCount, draftAgreements: draftCount, overdue: findings.filter((f) => f.code === "TERLAMBAT").length, dueSoon: findings.filter((f) => f.code === "SEGERA_JATUH_TEMPO").length },
    receivedThisYear: { total: fromCents(receivedAgg._sum.amountCents ?? 0n), count: receivedAgg._count._all },
    findings,
  };
}
export type LandOverview = Awaited<ReturnType<typeof overview>>;

/** Daftar barang yang dapat dipilih sebagai objek perjanjian (masih tercatat, golongan yang dapat dimanfaatkan). */
export async function leasableItems(db: Db, villageId: number, search?: string) {
  const rows = await db.inventoryItem.findMany({
    where: { villageId, status: "ACTIVE", category: { in: [...LEASABLE_CATEGORIES] }, ...(search ? { name: { contains: search } } : {}) },
    select: { id: true, name: true, category: true, location: true, landParcel: { select: { areaSqm: true } } },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 300,
  });
  return rows.map((r) => ({ id: r.id, name: r.name, category: r.category, categoryLabel: CATEGORIES[r.category as keyof typeof CATEGORIES]?.label ?? r.category, location: r.location, areaSqm: r.landParcel ? r.landParcel.areaSqm.toFixed(2) : null, defaultAccount: defaultAccountFor(r.category), needsAppraisal: (NEEDS_APPRAISAL as readonly string[]).includes(r.category) }));
}
