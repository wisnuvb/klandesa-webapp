/**
 * Pesanan sederhana produk UKM. Konkurensi tanpa kunci baris induk: perubahan status memakai UPDATE bersyarat atas status lama
 * (dua aktor bersamaan, hanya satu yang menang) dan "satu pesanan terbuka per pembeli per produk" dijaga kunci unik activeKey
 * (null bila pesanan ditutup; MySQL mengizinkan banyak NULL). Batas per pembeli dihitung di dalam transaksi di bawah kunci baris warga pembeli.
 * `sellerResidentId` adalah SNAPSHOT pemilik saat dipesan: bila produk berpindah pemilik, pesanan lama tetap milik penjual semula.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, type Result } from "@/lib/form-input";
import { UKM_CATEGORIES } from "@/lib/mobile/ukm-logic";
import { displayName } from "@/lib/mobile/social-logic";
import { STATUS, LIMITS, isOpen, isStatus, type ActorKind, type OrderStatus } from "./catalog";
import { activeKeyOf, orderMessage, stockProblem, totalRupiah, transition, whatsappUrl, allowedActions } from "./calc";
import { parseActionInput, parseOrderInput } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
const rupiahStr = (c: bigint | null): string | null => (c === null ? null : String(c / 100n));

type OrderRow = Prisma.UkmOrderRequestGetPayload<{ include: { product: { select: { status: true; contactPhone: true; contactVisible: true } } } }>;

const withProduct = { product: { select: { status: true, contactPhone: true, contactVisible: true } } } as const;

interface Names {
  full: string;
  short: string;
  area: string | null;
}
async function namesOf(db: Db, villageId: number, ids: number[]): Promise<Map<number, Names>> {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map();
  const rows = await db.resident.findMany({ where: { villageId, id: { in: uniq } }, select: { id: true, name: true, hamlet: true } });
  return new Map(rows.map((r) => [r.id, { full: r.name, short: displayName(r.name), area: r.hamlet?.trim() || null }]));
}

export interface OrderView {
  id: number;
  productId: number | null;
  productName: string;
  unit: string | null;
  unitPrice: string | null;
  estimatedTotal: string | null;
  quantity: number;
  status: OrderStatus;
  statusLabel: string;
  buyerNote: string | null;
  sellerNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Pihak lawan: untuk pembeli = penjual; untuk penjual = pembeli; untuk admin keduanya. */
  buyer: { name: string; area: string | null };
  seller: { name: string; managedByVillage: boolean };
  actions: string[];
  /** Hanya dikirim ke PEMBELI, dan hanya bila pemilik mengizinkan kontak dan produk masih tayang. */
  whatsappUrl: string | null;
}

function view(o: OrderRow, as: ActorKind, buyer: Names | undefined, seller: Names | undefined, villageName: string): OrderView {
  const status = isStatus(o.status) ? o.status : "DIBATALKAN";
  const buyerName = buyer ? (as === "ADMIN" ? buyer.full : buyer.short) : "Warga";
  return {
    id: o.id,
    productId: o.productId,
    productName: o.productName,
    unit: o.unit,
    unitPrice: rupiahStr(o.unitPriceCents),
    estimatedTotal: totalRupiah(o.unitPriceCents, o.quantity),
    quantity: o.quantity,
    status,
    statusLabel: STATUS[status],
    buyerNote: o.buyerNote,
    sellerNote: o.sellerNote,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    buyer: { name: buyerName, area: buyer?.area ?? null },
    seller: { name: seller ? (as === "ADMIN" ? seller.full : seller.short) : "Pengelola desa", managedByVillage: o.sellerResidentId === null },
    actions: allowedActions(as, status),
    whatsappUrl:
      as === "PEMBELI" && isOpen(status)
        ? whatsappUrl({
            contactPhone: o.product?.contactPhone ?? null,
            contactVisible: o.product?.contactVisible ?? false,
            productStatus: o.product?.status ?? "inactive",
            text: orderMessage({ orderId: o.id, buyerName: buyerName, productName: o.productName, quantity: o.quantity, unit: o.unit, village: villageName, note: o.buyerNote }),
          })
        : null,
  };
}

async function viewMany(db: Db, villageId: number, rows: OrderRow[], as: ActorKind, villageName: string): Promise<OrderView[]> {
  const names = await namesOf(db, villageId, rows.flatMap((r) => [r.buyerResidentId, ...(r.sellerResidentId ? [r.sellerResidentId] : [])]));
  return rows.map((r) => view(r, as, names.get(r.buyerResidentId), r.sellerResidentId ? names.get(r.sellerResidentId) : undefined, villageName));
}

const todayStart = (now: Date) => new Date(now.getTime() - 24 * 3_600_000);

/** Pembeli memesan produk yang tayang. Mengembalikan pesanan beserta tautan WhatsApp (bila kontak diizinkan). */
export async function createOrder(db: PrismaClient, args: { villageId: number; villageName: string; buyerResidentId: number; productId: number; input: unknown; now?: Date }): Promise<Result<OrderView>> {
  const p = parseOrderInput(args.input);
  if (!p.ok) return invalid(p);
  const product = await db.potential.findFirst({
    where: { id: args.productId, villageId: args.villageId, category: { in: [...UKM_CATEGORIES] }, status: "active" },
    select: { id: true, name: true, productionValue: true, productionUnit: true, stockQuantity: true, residentId: true },
  });
  if (!product) return fail(404, "Produk tidak ditemukan atau sedang tidak tayang.");
  if (product.residentId === args.buyerResidentId) return fail(400, "Ini produk Anda sendiri.");
  const stock = stockProblem(product.stockQuantity, p.value.quantity);
  if (stock) return invalid({ errors: [stock], fieldErrors: { quantity: stock } });
  const now = args.now ?? new Date();
  const price = product.productionValue === null ? null : BigInt(Math.round(Number(product.productionValue) * 100));
  try {
    // Penghitungan batas dan pembuatan pesanan satu transaksi di bawah kunci baris warga pembeli (pernyataan PERTAMA), supaya
    // permintaan paralel ke produk berbeda tidak sama-sama lolos batas.
    const out = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM residents WHERE id = ${args.buyerResidentId} AND villageId = ${args.villageId} FOR UPDATE`;
      const since = { gte: todayStart(now) };
      const [open, recent, sameProduct] = await Promise.all([
        tx.ukmOrderRequest.count({ where: { villageId: args.villageId, buyerResidentId: args.buyerResidentId, status: { in: ["DIMINTA", "DIKONFIRMASI"] } } }),
        tx.ukmOrderRequest.count({ where: { villageId: args.villageId, buyerResidentId: args.buyerResidentId, createdAt: since } }),
        tx.ukmOrderRequest.count({ where: { villageId: args.villageId, buyerResidentId: args.buyerResidentId, productId: product.id, createdAt: since } }),
      ]);
      if (open >= LIMITS.maxOpenPerBuyer) return { error: fail(429, `Anda sudah punya ${LIMITS.maxOpenPerBuyer} pesanan yang belum selesai. Selesaikan atau batalkan dulu.`) };
      if (recent >= LIMITS.maxPerBuyerPerDay) return { error: fail(429, "Terlalu banyak pesanan dalam sehari. Coba lagi besok.") };
      if (sameProduct >= LIMITS.maxPerProductPerDay) return { error: fail(429, `Anda sudah memesan produk ini ${LIMITS.maxPerProductPerDay} kali dalam sehari. Coba lagi besok atau hubungi penjual.`) };
      const o = await tx.ukmOrderRequest.create({
        data: {
          villageId: args.villageId,
          productId: product.id,
          productName: product.name.slice(0, 255),
          unitPriceCents: price !== null && price > 0n ? price : null,
          unit: product.productionUnit,
          quantity: p.value.quantity,
          buyerResidentId: args.buyerResidentId,
          sellerResidentId: product.residentId,
          buyerNote: p.value.note,
          status: "DIMINTA",
          activeKey: activeKeyOf("DIMINTA", product.id, args.buyerResidentId),
        },
        include: withProduct,
      });
      await tx.ukmOrderEvent.create({ data: { villageId: args.villageId, orderId: o.id, fromStatus: null, toStatus: "DIMINTA", actorKind: "PEMBELI", note: p.value.note } });
      return { row: o };
    });
    if (out.error) return out.error;
    return ok((await viewMany(db, args.villageId, [out.row!], "PEMBELI", args.villageName))[0]!);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Anda sudah punya pesanan yang belum selesai untuk produk ini. Lihat di Pesanan saya.");
    throw e;
  }
}

export type Actor = { kind: "PEMBELI" | "PENJUAL"; residentId: number } | { kind: "ADMIN" };

/** Mengubah status. Pembeli/penjual hanya untuk pesanannya sendiri (selain itu "tidak ditemukan", tanpa membocorkan keberadaan). */
export async function actOnOrder(db: PrismaClient, args: { villageId: number; villageName: string; orderId: number; actor: Actor; input: unknown }): Promise<Result<{ order: OrderView; from: string; to: string; notifyResidentId: number | null }>> {
  const p = parseActionInput(args.input);
  if (!p.ok) return invalid(p);
  const o = await db.ukmOrderRequest.findFirst({ where: { id: args.orderId, villageId: args.villageId }, include: withProduct });
  if (!o) return fail(404, "Pesanan tidak ditemukan.");
  const a = args.actor;
  if (a.kind === "PEMBELI" && o.buyerResidentId !== a.residentId) return fail(404, "Pesanan tidak ditemukan.");
  if (a.kind === "PENJUAL" && (o.sellerResidentId === null || o.sellerResidentId !== a.residentId)) return fail(404, "Pesanan tidak ditemukan.");
  const t = transition(a.kind, o.status, p.value.action);
  if ("error" in t) return fail(409, t.error);
  if (t.noteRequired && (!p.value.note || p.value.note.length < 3)) return invalid({ errors: ["Tulis alasan singkat agar pembeli tahu."], fieldErrors: { note: "Tulis alasan singkat (minimal 3 huruf)." } });
  const terminal = !isOpen(t.to);
  const claimed = await db.$transaction(async (tx) => {
    const done = await tx.ukmOrderRequest.updateMany({
      where: { id: o.id, villageId: args.villageId, status: o.status },
      data: { status: t.to, ...(terminal ? { activeKey: null } : {}), ...(a.kind !== "PEMBELI" && p.value.note ? { sellerNote: p.value.note } : {}) },
    });
    if (done.count === 0) return false;
    await tx.ukmOrderEvent.create({ data: { villageId: args.villageId, orderId: o.id, fromStatus: o.status, toStatus: t.to, actorKind: a.kind, note: p.value.note } });
    return true;
  });
  if (!claimed) return fail(409, "Status pesanan baru saja berubah. Muat ulang lalu coba lagi.");
  const fresh = await db.ukmOrderRequest.findFirstOrThrow({ where: { id: o.id, villageId: args.villageId }, include: withProduct });
  const as: ActorKind = a.kind;
  const [v] = await viewMany(db, args.villageId, [fresh], as, args.villageName);
  return ok({ order: v!, from: o.status, to: t.to, notifyResidentId: a.kind === "PEMBELI" ? o.sellerResidentId : o.buyerResidentId });
}

export interface ListArgs {
  villageId: number;
  villageName: string;
  status?: string;
  cursor?: number | null;
  take?: number;
}

/** Pesanan yang saya buat (pembeli), terbaru dulu, kursor = id terakhir. */
export async function listAsBuyer(db: Db, args: ListArgs & { residentId: number }) {
  const take = Math.min(args.take ?? LIMITS.mobilePageSize, 50);
  const rows = await db.ukmOrderRequest.findMany({
    where: { villageId: args.villageId, buyerResidentId: args.residentId, ...(isStatus(args.status) ? { status: args.status } : {}), ...(args.cursor ? { id: { lt: args.cursor } } : {}) },
    include: withProduct,
    orderBy: { id: "desc" },
    take: take + 1,
  });
  const more = rows.length > take;
  const page = rows.slice(0, take);
  return { items: await viewMany(db, args.villageId, page, "PEMBELI", args.villageName), nextCursor: more ? page[page.length - 1]!.id : null };
}

/** Pesanan masuk untuk produk saya (penjual). */
export async function listAsSeller(db: Db, args: ListArgs & { residentId: number }) {
  const take = Math.min(args.take ?? LIMITS.mobilePageSize, 50);
  const rows = await db.ukmOrderRequest.findMany({
    where: { villageId: args.villageId, sellerResidentId: args.residentId, ...(isStatus(args.status) ? { status: args.status } : {}), ...(args.cursor ? { id: { lt: args.cursor } } : {}) },
    include: withProduct,
    orderBy: { id: "desc" },
    take: take + 1,
  });
  const more = rows.length > take;
  const page = rows.slice(0, take);
  return { items: await viewMany(db, args.villageId, page, "PENJUAL", args.villageName), nextCursor: more ? page[page.length - 1]!.id : null };
}

export async function countOpenForSeller(db: Db, villageId: number, residentId: number): Promise<number> {
  return db.ukmOrderRequest.count({ where: { villageId, sellerResidentId: residentId, status: "DIMINTA" } });
}

/** Satu pesanan milik pembeli atau penjual (selain itu null). */
export async function getForParty(db: Db, args: { villageId: number; villageName: string; orderId: number; residentId: number }): Promise<{ order: OrderView; role: "PEMBELI" | "PENJUAL"; events: OrderEventView[] } | null> {
  const o = await db.ukmOrderRequest.findFirst({ where: { id: args.orderId, villageId: args.villageId, OR: [{ buyerResidentId: args.residentId }, { sellerResidentId: args.residentId }] }, include: withProduct });
  if (!o) return null;
  const role = o.buyerResidentId === args.residentId ? "PEMBELI" : "PENJUAL";
  const [v] = await viewMany(db, args.villageId, [o], role, args.villageName);
  return { order: v!, role, events: await eventsOf(db, args.villageId, o.id) };
}

export interface OrderEventView {
  fromStatus: string | null;
  toStatus: string;
  toLabel: string;
  actorKind: string;
  note: string | null;
  at: string;
}
async function eventsOf(db: Db, villageId: number, orderId: number): Promise<OrderEventView[]> {
  const ev = await db.ukmOrderEvent.findMany({ where: { orderId, villageId }, orderBy: { id: "asc" }, take: 50 });
  return ev.map((e) => ({ fromStatus: e.fromStatus, toStatus: e.toStatus, toLabel: isStatus(e.toStatus) ? STATUS[e.toStatus] : e.toStatus, actorKind: e.actorKind, note: e.note, at: e.createdAt.toISOString() }));
}

/** Daftar admin web: semua pesanan desa, dengan penyaring status, pencarian nama produk, dan hitungan per status. */
export async function listForAdmin(db: Db, args: { villageId: number; villageName: string; status?: string; search?: string; managedOnly?: boolean; page: number; pageSize: number }) {
  const where: Prisma.UkmOrderRequestWhereInput = { villageId: args.villageId };
  if (isStatus(args.status)) where.status = args.status;
  if (args.search) where.productName = { contains: args.search };
  if (args.managedOnly) where.sellerResidentId = null;
  const [rows, total, groups] = await Promise.all([
    db.ukmOrderRequest.findMany({ where, include: withProduct, orderBy: { id: "desc" }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
    db.ukmOrderRequest.count({ where }),
    db.ukmOrderRequest.groupBy({ by: ["status"], where: { villageId: args.villageId }, _count: { _all: true } }),
  ]);
  const counts: Record<string, number> = Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  return { items: await viewMany(db, args.villageId, rows, "ADMIN", args.villageName), total, page: args.page, pageSize: args.pageSize, counts };
}

export async function getForAdmin(db: Db, args: { villageId: number; villageName: string; orderId: number }) {
  const o = await db.ukmOrderRequest.findFirst({ where: { id: args.orderId, villageId: args.villageId }, include: withProduct });
  if (!o) return null;
  const [v] = await viewMany(db, args.villageId, [o], "ADMIN", args.villageName);
  return { order: v!, events: await eventsOf(db, args.villageId, o.id) };
}
