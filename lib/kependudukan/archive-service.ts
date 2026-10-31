/** Arsip warga terhapus (`resident_archives`): daftar, pulihkan, dan pembersihan setelah masa simpan. */
import { Prisma } from "@prisma/client";
import { fail, type ServiceResult } from "./mutation-service";
import { syncResidents, type Db } from "./sync";

/** Masa simpan arsip warga terhapus (hari). Snapshot memuat NIK, jadi tidak disimpan selamanya. */
export const ARCHIVE_RETENTION_DAYS = 365;

const SCALARS = new Set(Object.keys(Prisma.ResidentScalarFieldEnum));
const NOT_RESTORED = new Set(["id", "villageId", "householdId", "wilayahUnitId", "dusunUnitId", "createdAt", "updatedAt"]);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

type Snapshot = Record<string, unknown>;
const snap = (v: unknown): Snapshot => (v && typeof v === "object" && !Array.isArray(v) ? (v as Snapshot) : {});

export interface ArchiveItem {
  id: string;
  residentId: number;
  name: string;
  nikLast4: string;
  familyRole: string;
  deletedAt: string;
  reason: string | null;
  expiresAt: string;
}

export async function listArchives(db: Db, villageId: number, page: number, limit: number): Promise<{ total: number; items: ArchiveItem[] }> {
  const where = { villageId };
  const [rows, total] = await Promise.all([
    db.residentArchive.findMany({ where, orderBy: { deletedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    db.residentArchive.count({ where }),
  ]);
  return {
    total,
    items: rows.map((r) => {
      const s = snap(r.snapshot);
      return {
        id: String(r.id),
        residentId: r.residentId,
        name: String(s.name ?? "(tanpa nama)"),
        nikLast4: String(s.nik ?? "").slice(-4),
        familyRole: String(s.familyRole ?? ""),
        deletedAt: r.deletedAt.toISOString(),
        reason: r.reason,
        expiresAt: new Date(r.deletedAt.getTime() + ARCHIVE_RETENTION_DAYS * 86_400_000).toISOString(),
      };
    }),
  };
}

/**
 * Pulihkan satu warga dari arsip ke Data Warga (id lama dipakai bila masih kosong). Yang kembali hanya baris warga:
 * kunjungan posyandu, keanggotaan koperasi, dan akun mobile yang ikut terhapus bersama warga tidak dipulihkan.
 */
export async function restoreResident(db: Db, a: { villageId: number; archiveId: bigint }): Promise<ServiceResult<{ residentId: number; name: string }>> {
  const row = await db.residentArchive.findFirst({ where: { id: a.archiveId, villageId: a.villageId } });
  if (!row) return fail(404, "Arsip tidak ditemukan.");
  const s = snap(row.snapshot);
  const nik = typeof s.nik === "string" ? s.nik : "";
  if (!nik) return fail(422, "Arsip ini tidak lengkap dan tidak bisa dipulihkan.");

  const clash = await db.resident.findFirst({ where: { villageId: a.villageId, nik }, select: { name: true } });
  if (clash) return fail(409, `NIK ini sudah terdaftar atas nama ${clash.name}. Hapus atau ubah data yang ada dulu.`);

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (!SCALARS.has(k) || NOT_RESTORED.has(k)) continue;
    data[k] = typeof v === "string" && ISO.test(v) ? new Date(v) : v;
  }
  const originalId = typeof s.id === "number" ? s.id : null;
  const idFree = originalId != null && (await db.resident.findUnique({ where: { id: originalId }, select: { id: true } })) == null;

  const created = await db.resident.create({
    data: { ...(data as Prisma.ResidentUncheckedCreateInput), villageId: a.villageId, ...(idFree ? { id: originalId! } : {}) },
    select: { id: true, name: true, kk: true },
  });
  await db.residentArchive.delete({ where: { id: row.id } });
  await syncResidents(db, a.villageId, [created.id], [created.kk]);
  return { ok: true, data: { residentId: created.id, name: created.name } };
}

/** Hapus arsip yang melewati masa simpan (semua desa). Mengembalikan jumlah yang dibuang. */
export async function purgeExpiredArchives(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - ARCHIVE_RETENTION_DAYS * 86_400_000);
  return (await db.residentArchive.deleteMany({ where: { deletedAt: { lt: cutoff } } })).count;
}
