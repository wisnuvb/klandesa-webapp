/**
 * Lampiran generik ke Arsip Digital. Semua pemeriksaan kepemilikan desa ada di sini; rute hanya memeriksa izin dan mencatat audit.
 * Berkas tidak disalin: ukuran dan kuota storage tetap dicatat Arsip Digital saat berkas diunggah.
 */
import { Prisma } from "@prisma/client";
import { cleanText, fail, invalid, isRecord, type Result } from "@/lib/form-input";
import {
  ATTACHMENT_LIMITS,
  isAttachmentEntityType,
  type AttachmentEntityType,
} from "./catalog";

type Db = Prisma.TransactionClient | Prisma.DefaultPrismaClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });

export interface AttachmentRef {
  type: AttachmentEntityType;
  id: bigint;
}

/** "12" → 12n; menolak yang bukan bilangan bulat positif wajar. */
export function parseEntityId(raw: unknown): bigint | null {
  const s = typeof raw === "number" ? String(raw) : raw;
  if (typeof s !== "string" || !/^\d{1,15}$/.test(s)) return null;
  const n = BigInt(s);
  return n > 0n ? n : null;
}

export function parseRef(typeRaw: unknown, idRaw: unknown): Result<AttachmentRef> {
  if (!isAttachmentEntityType(typeRaw)) return fail(400, "Jenis rekaman tidak dikenal.");
  const id = parseEntityId(idRaw);
  if (id === null) return fail(400, "Rekaman tidak valid.");
  return ok({ type: typeRaw, id });
}

/** Apakah rekaman ada di desa ini? Satu pencarian per jenis entitas. */
export async function entityExists(db: Db, villageId: number, ref: AttachmentRef): Promise<boolean> {
  const where = { id: Number(ref.id), villageId };
  const select = { id: true } as const;
  switch (ref.type) {
    case "MAIL_REGISTER":
      return !!(await db.mailRegister.findFirst({ where, select }));
    case "LEGAL_DOCUMENT":
      return !!(await db.legalDocument.findFirst({ where, select }));
    case "OFFICIAL":
      return !!(await db.official.findFirst({ where, select }));
    case "INSTITUTION":
      return !!(await db.villageInstitution.findFirst({ where, select }));
    case "MEETING":
      return !!(await db.villageMeeting.findFirst({ where, select }));
    case "MUTATION":
      return !!(await db.residentMutation.findFirst({ where: { id: ref.id, villageId }, select }));
  }
}

export interface AttachInput {
  type: AttachmentEntityType;
  id: bigint;
  archiveId: bigint;
  label: string | null;
}

export function parseAttachInput(body: unknown): Result<AttachInput> {
  if (!isRecord(body)) return fail(400, "Data tidak valid.");
  const ref = parseRef(body.type, body.id);
  if (!ref.ok) return ref;
  const archiveId = parseEntityId(body.archiveId);
  if (archiveId === null) return invalid({ errors: ["Pilih berkas yang akan dilampirkan."], fieldErrors: { archiveId: "Pilih berkas yang akan dilampirkan." } });
  const label = cleanText(body.label, ATTACHMENT_LIMITS.label);
  if (label.bad || label.tooLong) return invalid({ errors: [`Keterangan maksimal ${ATTACHMENT_LIMITS.label} karakter.`], fieldErrors: { label: `Keterangan maksimal ${ATTACHMENT_LIMITS.label} karakter.` } });
  return ok({ type: ref.data.type, id: ref.data.id, archiveId, label: label.value });
}

export interface AttachmentView {
  id: number;
  archiveId: number;
  label: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  attachedAt: string;
  /** Berkas sudah dihapus dari Arsip Digital (tautan yatim). */
  missing: boolean;
}

export async function listAttachments(db: Db, villageId: number, ref: AttachmentRef): Promise<AttachmentView[]> {
  const rows = await db.recordAttachment.findMany({
    where: { villageId, entityType: ref.type, entityId: ref.id },
    orderBy: { createdAt: "asc" },
  });
  if (!rows.length) return [];
  const archives = await db.digitalArchive.findMany({
    where: { villageId, id: { in: rows.map((r) => r.archiveId) } },
    select: { id: true, fileName: true, fileType: true, fileSize: true },
  });
  const byId = new Map(archives.map((a) => [a.id, a]));
  return rows.map((r) => {
    const a = byId.get(r.archiveId);
    return {
      id: r.id,
      archiveId: Number(r.archiveId),
      label: r.label,
      fileName: a?.fileName ?? null,
      fileType: a?.fileType ?? null,
      fileSize: a ? Number(a.fileSize) : null,
      attachedAt: r.createdAt.toISOString(),
      missing: !a,
    };
  });
}

export async function attach(db: Db, args: { villageId: number; userId: number | null; input: AttachInput }): Promise<Result<{ id: number; archiveId: number }>> {
  const { villageId, input } = args;
  if (!(await entityExists(db, villageId, { type: input.type, id: input.id }))) return fail(404, "Rekaman tidak ditemukan.");
  const arch = await db.digitalArchive.findFirst({ where: { id: input.archiveId, villageId }, select: { id: true, title: true, fileName: true } });
  if (!arch) return invalid({ errors: ["Berkas tidak ditemukan di Arsip Digital desa ini."], fieldErrors: { archiveId: "Berkas tidak ditemukan di Arsip Digital desa ini." } });
  const count = await db.recordAttachment.count({ where: { villageId, entityType: input.type, entityId: input.id } });
  if (count >= ATTACHMENT_LIMITS.perRecord) return fail(409, `Maksimal ${ATTACHMENT_LIMITS.perRecord} lampiran per rekaman.`);
  try {
    const row = await db.recordAttachment.create({
      data: {
        villageId,
        entityType: input.type,
        entityId: input.id,
        archiveId: arch.id,
        label: (input.label ?? (arch.title || arch.fileName)).slice(0, ATTACHMENT_LIMITS.label),
        createdById: args.userId,
      },
    });
    return ok({ id: row.id, archiveId: Number(arch.id) });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Berkas ini sudah dilampirkan pada rekaman tersebut.");
    throw e;
  }
}

/** Satu lampiran milik desa ini (untuk melepas atau membuka berkas). */
export async function findAttachment(db: Db, villageId: number, attachmentId: number) {
  return db.recordAttachment.findFirst({ where: { id: attachmentId, villageId } });
}

/** Lepas tautan. Berkas di Arsip Digital TIDAK dihapus. */
export async function detach(db: Db, args: { villageId: number; attachmentId: number }): Promise<Result<{ id: number }>> {
  const done = await db.recordAttachment.deleteMany({ where: { id: args.attachmentId, villageId: args.villageId } });
  return done.count ? ok({ id: args.attachmentId }) : fail(404, "Lampiran tidak ditemukan.");
}

/** Jumlah rekaman yang masih melampirkan berkas arsip ini; dipakai untuk memblokir penghapusan arsip. */
export async function attachmentUsageCount(db: Db, villageId: number, archiveId: bigint): Promise<number> {
  return db.recordAttachment.count({ where: { villageId, archiveId } });
}
