/** Pembantu bersama servis Keamanan: kunci baris, pengambilan data warga (tanpa NIK), dan penanganan galat. */
import { Prisma, type PrismaClient } from "@prisma/client";
import { Stop, asResult, stop } from "@/lib/incident/service";

export { Stop, asResult, stop };
export type Db = Prisma.TransactionClient;
export type Client = PrismaClient;
export const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
export const P2002 = (e: unknown): boolean => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
export const likeSafe = (raw: string): string => raw.replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
export const day = (d: Date | null | undefined): string | null => (d ? d.toISOString().slice(0, 10) : null);
export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Kunci desa untuk menjaga batas jumlah baris. HARUS pernyataan pertama dalam transaksi interaktif. */
export async function lockVillage(tx: Db, villageId: number): Promise<void> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM villages WHERE id = ${villageId} FOR UPDATE`;
  if (!rows.length) stop("Desa tidak ditemukan.", 404);
}

/** Kunci baris regu ronda (jadwal, tukar giliran, kehadiran). HARUS pernyataan pertama dalam transaksi interaktif. */
export async function lockGroup(tx: Db, villageId: number, groupId: number): Promise<{ id: number; perShift: number; active: boolean }> {
  const rows = await tx.$queryRaw<{ id: number; perShift: number; active: number | boolean }[]>`SELECT id, perShift, active FROM security_ronda_groups WHERE id = ${groupId} AND villageId = ${villageId} FOR UPDATE`;
  if (!rows.length) return stop("Regu ronda tidak ditemukan.", 404);
  return { id: rows[0]!.id, perShift: Number(rows[0]!.perShift), active: Boolean(rows[0]!.active) };
}

export interface PersonInfo {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
  birthDate: string;
  phone: string | null;
}

/** Data warga seperlunya (tanpa NIK/KK), hanya milik desa yang sama. Telepon hanya dikembalikan bila `phone` true. */
export async function residentsById(db: Db | Client, villageId: number, ids: number[], opts: { phone?: boolean } = {}): Promise<Map<number, PersonInfo>> {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map();
  const rows = await db.resident.findMany({ where: { villageId, id: { in: uniq } }, select: { id: true, name: true, rt: true, rw: true, birthDate: true, phone: true } });
  return new Map(rows.map((r) => [r.id, { id: r.id, name: r.name, rt: r.rt, rw: r.rw, birthDate: r.birthDate.toISOString().slice(0, 10), phone: opts.phone ? r.phone : null }]));
}

export interface ResidentHit {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
}
/** Cari warga menurut nama (minimal 3 huruf). Tanpa NIK/KK/telepon. */
export async function searchResidents(db: Client, args: { villageId: number; q: string }): Promise<ResidentHit[]> {
  const q = likeSafe(args.q);
  if (q.length < 3) return [];
  return db.resident.findMany({ where: { villageId: args.villageId, name: { contains: q } }, orderBy: { name: "asc" }, take: 10, select: { id: true, name: true, rt: true, rw: true } });
}
