import type { Prisma } from "@prisma/client";
import { isCategory, isStrategic, LIMITS } from "./catalog";
import { parseDisposalInput, parseItemInput } from "./schema";

type Db = Prisma.TransactionClient;

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; errors: string[]; fieldErrors?: Record<string, string> };
const fail = (status: number, ...errors: string[]): { ok: false; status: number; errors: string[] } => ({ ok: false, status, errors });

type ItemRow = {
  id: number;
  mapAssetId: number | null;
  name: string;
  category: string;
  itemCode: string | null;
  identity: string | null;
  quantity: number;
  origin: string;
  acquiredYear: number;
  acquiredAt: Date | null;
  acquisitionValue: Prisma.Decimal | null;
  condition: string;
  location: string | null;
  notes: string | null;
  status: string;
  disposedAt: Date | null;
  disposalReason: string | null;
  disposalDecree: string | null;
  disposalNote: string | null;
  updatedAt: Date;
};

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function serializeItem(r: ItemRow) {
  return {
    id: r.id,
    mapAssetId: r.mapAssetId,
    name: r.name,
    category: r.category,
    strategic: isStrategic(r.category),
    itemCode: r.itemCode,
    identity: r.identity,
    quantity: r.quantity,
    origin: r.origin,
    acquiredYear: r.acquiredYear,
    acquiredAt: day(r.acquiredAt),
    acquisitionValue: r.acquisitionValue ? r.acquisitionValue.toFixed(2) : null,
    condition: r.condition,
    location: r.location,
    notes: r.notes,
    status: r.status,
    disposedAt: day(r.disposedAt),
    disposalReason: r.disposalReason,
    disposalDecree: r.disposalDecree,
    disposalNote: r.disposalNote,
    updatedAt: r.updatedAt.toISOString(),
  };
}
export type ItemView = ReturnType<typeof serializeItem>;

export interface ListFilter {
  status?: "ACTIVE" | "DISPOSED";
  category?: string;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listItems(db: Db, villageId: number, f: ListFilter) {
  const where: Prisma.InventoryItemWhereInput = { villageId };
  if (f.status) where.status = f.status;
  if (f.category && isCategory(f.category)) where.category = f.category;
  if (f.search) where.OR = [{ name: { contains: f.search } }, { itemCode: { contains: f.search } }, { identity: { contains: f.search } }, { location: { contains: f.search } }];
  const [rows, total] = await Promise.all([
    db.inventoryItem.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }, { id: "asc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.inventoryItem.count({ where }),
  ]);
  return { items: rows.map(serializeItem), total, page: f.page, pageSize: f.pageSize };
}

/** Ringkasan untuk kartu di layar: jumlah jenis barang, total nilai, dan per golongan (hanya barang yang masih tercatat). */
export async function summarize(db: Db, villageId: number) {
  const [active, disposed, byCategory, byCondition, valued] = await Promise.all([
    db.inventoryItem.count({ where: { villageId, status: "ACTIVE" } }),
    db.inventoryItem.count({ where: { villageId, status: "DISPOSED" } }),
    db.inventoryItem.groupBy({ by: ["category"], where: { villageId, status: "ACTIVE" }, _count: { _all: true } }),
    db.inventoryItem.groupBy({ by: ["condition"], where: { villageId, status: "ACTIVE" }, _count: { _all: true } }),
    db.inventoryItem.findMany({ where: { villageId, status: "ACTIVE", acquisitionValue: { not: null } }, select: { acquisitionValue: true, quantity: true } }),
  ]);
  // Nilai total dihitung dari nilai satuan x jumlah; dijumlah dalam sen supaya tak ada galat pecahan.
  let cents = BigInt(0);
  for (const v of valued) cents += BigInt(Math.round(Number(v.acquisitionValue) * 100)) * BigInt(v.quantity);
  return {
    active,
    disposed,
    totalValue: `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`,
    byCategory: Object.fromEntries(byCategory.map((r) => [r.category, r._count._all])),
    byCondition: Object.fromEntries(byCondition.map((r) => [r.condition, r._count._all])),
  };
}

async function mapAssetOk(db: Db, villageId: number, mapAssetId: number | null): Promise<boolean> {
  if (mapAssetId === null) return true;
  return (await db.villageAsset.count({ where: { id: mapAssetId, villageId } })) > 0;
}

export async function createItem(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<ItemView>> {
  const p = parseItemInput(args.input, args.now);
  if (!p.ok) return { ok: false, status: 400, errors: p.errors, fieldErrors: p.fieldErrors };
  if ((await db.inventoryItem.count({ where: { villageId: args.villageId } })) >= LIMITS.itemsPerVillage) {
    return fail(409, `Buku inventaris sudah mencapai batas ${LIMITS.itemsPerVillage.toLocaleString("id-ID")} baris.`);
  }
  if (!(await mapAssetOk(db, args.villageId, p.value.mapAssetId))) return { ok: false, status: 400, errors: ["Titik peta tidak ditemukan."], fieldErrors: { mapAssetId: "Titik peta tidak ditemukan." } };
  const row = await db.inventoryItem.create({
    data: { villageId: args.villageId, createdById: args.userId, ...p.value, acquisitionValue: p.value.acquisitionValue },
  });
  return { ok: true, data: serializeItem(row) };
}

export async function getItem(db: Db, villageId: number, id: number): Promise<ItemView | null> {
  const row = await db.inventoryItem.findFirst({ where: { id, villageId } });
  return row ? serializeItem(row) : null;
}

/** Ubah data barang yang masih tercatat. Barang yang sudah dihapus dari buku tidak dapat diubah (jejak keputusan tetap utuh). */
export async function updateItem(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<ItemView>> {
  const p = parseItemInput(args.input, args.now);
  if (!p.ok) return { ok: false, status: 400, errors: p.errors, fieldErrors: p.fieldErrors };
  if (!(await mapAssetOk(db, args.villageId, p.value.mapAssetId))) return { ok: false, status: 400, errors: ["Titik peta tidak ditemukan."], fieldErrors: { mapAssetId: "Titik peta tidak ditemukan." } };
  const done = await db.inventoryItem.updateMany({ where: { id: args.id, villageId: args.villageId, status: "ACTIVE" }, data: p.value });
  if (done.count === 0) {
    const exists = await db.inventoryItem.count({ where: { id: args.id, villageId: args.villageId } });
    return exists ? fail(409, "Barang ini sudah dihapus dari buku inventaris dan tidak dapat diubah.") : fail(404, "Barang tidak ditemukan.");
  }
  const row = await db.inventoryItem.findFirst({ where: { id: args.id, villageId: args.villageId } });
  return row ? { ok: true, data: serializeItem(row) } : fail(404, "Barang tidak ditemukan.");
}

/** Hapus dari buku inventaris (Pasal 21-23): barisnya tetap tersimpan sebagai riwayat dengan nomor SK. */
export async function disposeItem(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<ItemView>> {
  const current = await db.inventoryItem.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { category: true, status: true, acquiredYear: true } });
  if (!current) return fail(404, "Barang tidak ditemukan.");
  if (current.status !== "ACTIVE") return fail(409, "Barang ini sudah dihapus dari buku inventaris.");
  const p = parseDisposalInput(args.input, current.category, args.now);
  if (!p.ok) return { ok: false, status: 400, errors: p.errors, fieldErrors: p.fieldErrors };
  if (p.value.disposedAt.getUTCFullYear() < current.acquiredYear) {
    const msg = "Tanggal penghapusan tidak boleh sebelum tahun perolehan barang.";
    return { ok: false, status: 400, errors: [msg], fieldErrors: { disposedAt: msg } };
  }
  const note = p.value.regencyApproved && isStrategic(current.category) ? [p.value.note, "Disetujui Bupati/Wali Kota (aset strategis)."].filter(Boolean).join(" ") : p.value.note;
  const done = await db.inventoryItem.updateMany({
    where: { id: args.id, villageId: args.villageId, status: "ACTIVE" },
    data: { status: "DISPOSED", disposedAt: p.value.disposedAt, disposalReason: p.value.reason, disposalDecree: p.value.decree, disposalNote: note ? note.slice(0, 500) : null },
  });
  if (done.count === 0) return fail(409, "Barang ini sudah dihapus dari buku inventaris.");
  const row = await db.inventoryItem.findFirst({ where: { id: args.id, villageId: args.villageId } });
  return row ? { ok: true, data: serializeItem(row) } : fail(404, "Barang tidak ditemukan.");
}

/**
 * Isi Buku Inventaris Aset Desa untuk satu tahun (Lampiran C): barang yang sudah diperoleh sampai akhir tahun itu
 * dan belum dihapus pada tahun itu atau sebelumnya.
 */
export async function bookForYear(db: Db, villageId: number, year: number): Promise<ItemView[]> {
  const rows = await db.inventoryItem.findMany({
    where: {
      villageId,
      acquiredYear: { lte: year },
      OR: [{ status: "ACTIVE" }, { disposedAt: { gt: new Date(Date.UTC(year, 11, 31)) } }],
    },
    orderBy: [{ category: "asc" }, { acquiredYear: "asc" }, { name: "asc" }, { id: "asc" }],
    take: LIMITS.itemsPerVillage,
  });
  return rows.map(serializeItem);
}

/** Daftar barang yang dihapus pada satu tahun (lampiran SK penghapusan). */
export async function disposedInYear(db: Db, villageId: number, year: number): Promise<ItemView[]> {
  const rows = await db.inventoryItem.findMany({
    where: { villageId, status: "DISPOSED", disposedAt: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } },
    orderBy: [{ disposedAt: "asc" }, { id: "asc" }],
    take: LIMITS.itemsPerVillage,
  });
  return rows.map(serializeItem);
}
