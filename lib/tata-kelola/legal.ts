import { Prisma } from "@prisma/client";
import { cleanText, fail, future, invalid, isoDay, isRecord, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";

import { isLegalType, LEGAL_TYPE_LABEL, LEGAL_TYPES, type LegalType } from "./catalog";

export { isLegalType, LEGAL_TYPE_LABEL, LEGAL_TYPES, type LegalType };

type Db = Prisma.TransactionClient;

export const LEGAL_LIMIT = 20000;

export interface LegalInput {
  type: LegalType;
  number: string;
  year: number;
  title: string;
  summary: string | null;
  enactedAt: Date;
  promulgatedAt: Date | null;
  submittedAt: Date | null;
}

export function parseLegalInput(body: unknown, now: Date = new Date()): Parsed<LegalInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };

  const type = isLegalType(body.type) ? body.type : null;
  if (!type) fe.type = "Pilih jenis produk hukum.";
  const number = cleanText(body.number, 60);
  if (number.bad || !number.value) fe.number = "Isi nomor produk hukum.";
  else if (number.tooLong) fe.number = "Nomor maksimal 60 karakter.";
  const title = cleanText(body.title, 300);
  if (title.bad || !title.value) fe.title = "Isi judul atau tentang apa.";
  else if (title.tooLong) fe.title = "Judul maksimal 300 karakter.";
  const summary = cleanText(body.summary, 1000);
  if (summary.bad || summary.tooLong) fe.summary = "Ringkasan maksimal 1000 karakter.";

  const enactedAt = parseIsoDate(body.enactedAt);
  if (!enactedAt) fe.enactedAt = "Isi tanggal ditetapkan.";
  else if (future(enactedAt, now)) fe.enactedAt = "Tanggal ditetapkan tidak boleh di masa depan.";

  const optionalDate = (key: "promulgatedAt" | "submittedAt", label: string): Date | null => {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === "") return null;
    const d = parseIsoDate(raw);
    if (!d) fe[key] = "Tanggal tidak valid.";
    else if (future(d, now)) fe[key] = `${label} tidak boleh di masa depan.`;
    else if (enactedAt && d.getTime() < enactedAt.getTime()) fe[key] = `${label} tidak boleh sebelum tanggal ditetapkan.`;
    return d;
  };
  const promulgatedAt = optionalDate("promulgatedAt", "Tanggal diundangkan");
  const submittedAt = optionalDate("submittedAt", "Tanggal disampaikan");

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: {
      type: type as LegalType,
      number: number.value as string,
      year: (enactedAt as Date).getUTCFullYear(),
      title: title.value as string,
      summary: summary.value,
      enactedAt: enactedAt as Date,
      promulgatedAt,
      submittedAt,
    },
  };
}

type Row = Prisma.LegalDocumentGetPayload<object>;
export function serializeLegal(r: Row) {
  return {
    id: r.id,
    type: r.type,
    number: r.number,
    year: r.year,
    title: r.title,
    summary: r.summary,
    enactedAt: isoDay(r.enactedAt) as string,
    promulgatedAt: isoDay(r.promulgatedAt),
    submittedAt: isoDay(r.submittedAt),
    status: r.status,
    revokedAt: isoDay(r.revokedAt),
    revokedByRef: r.revokedByRef,
  };
}
export type LegalView = ReturnType<typeof serializeLegal>;

const isDup = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
const DUP = "Nomor ini sudah terdaftar untuk jenis dan tahun yang sama.";

export async function listLegal(db: Db, villageId: number, f: { type?: string; status?: string; year?: number; search?: string; page: number; pageSize: number }) {
  const where: Prisma.LegalDocumentWhereInput = { villageId };
  if (isLegalType(f.type)) where.type = f.type;
  if (f.status === "BERLAKU" || f.status === "DICABUT") where.status = f.status;
  if (f.year) where.year = f.year;
  if (f.search) where.OR = [{ title: { contains: f.search } }, { number: { contains: f.search } }, { summary: { contains: f.search } }];
  const [rows, total, byType] = await Promise.all([
    db.legalDocument.findMany({ where, orderBy: [{ enactedAt: "desc" }, { id: "desc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.legalDocument.count({ where }),
    db.legalDocument.groupBy({ by: ["type"], where: { villageId, status: "BERLAKU" }, _count: { _all: true } }),
  ]);
  return { items: rows.map(serializeLegal), total, page: f.page, pageSize: f.pageSize, inForce: Object.fromEntries(byType.map((r) => [r.type, r._count._all])) };
}

export async function createLegal(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<LegalView>> {
  const p = parseLegalInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  if ((await db.legalDocument.count({ where: { villageId: args.villageId } })) >= LEGAL_LIMIT) return fail(409, "Register produk hukum sudah mencapai batas.");
  try {
    return { ok: true, data: serializeLegal(await db.legalDocument.create({ data: { villageId: args.villageId, createdById: args.userId, ...p.value } })) };
  } catch (e) {
    if (isDup(e)) return { ok: false, status: 409, errors: [DUP], fieldErrors: { number: DUP } };
    throw e;
  }
}

export async function updateLegal(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<LegalView>> {
  const p = parseLegalInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  try {
    const done = await db.legalDocument.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value });
    if (done.count === 0) return fail(404, "Produk hukum tidak ditemukan.");
  } catch (e) {
    if (isDup(e)) return { ok: false, status: 409, errors: [DUP], fieldErrors: { number: DUP } };
    throw e;
  }
  const row = await db.legalDocument.findFirst({ where: { id: args.id, villageId: args.villageId } });
  return row ? { ok: true, data: serializeLegal(row) } : fail(404, "Produk hukum tidak ditemukan.");
}

/** Tandai dicabut ({ revokedAt, revokedByRef? }). Hanya produk yang masih berlaku; tak bisa diaktifkan kembali (terbitkan produk baru). */
export async function revokeLegal(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<LegalView>> {
  const now = args.now ?? new Date();
  const body = isRecord(args.input) ? args.input : {};
  const fe: Record<string, string> = {};
  const current = await db.legalDocument.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { status: true, enactedAt: true } });
  if (!current) return fail(404, "Produk hukum tidak ditemukan.");
  if (current.status !== "BERLAKU") return fail(409, "Produk hukum ini sudah dicabut.");
  const revokedAt = parseIsoDate(body.revokedAt);
  if (!revokedAt) fe.revokedAt = "Isi tanggal pencabutan.";
  else if (future(revokedAt, now)) fe.revokedAt = "Tanggal pencabutan tidak boleh di masa depan.";
  else if (revokedAt.getTime() < current.enactedAt.getTime()) fe.revokedAt = "Tanggal pencabutan tidak boleh sebelum tanggal ditetapkan.";
  const ref = cleanText(body.revokedByRef, 200);
  if (ref.bad || ref.tooLong) fe.revokedByRef = "Dasar pencabutan maksimal 200 karakter.";
  if (Object.keys(fe).length) return { ok: false, status: 400, errors: Object.values(fe), fieldErrors: fe };
  const done = await db.legalDocument.updateMany({ where: { id: args.id, villageId: args.villageId, status: "BERLAKU" }, data: { status: "DICABUT", revokedAt, revokedByRef: ref.value } });
  if (done.count === 0) return fail(409, "Produk hukum ini sudah dicabut.");
  const row = await db.legalDocument.findFirst({ where: { id: args.id, villageId: args.villageId } });
  return row ? { ok: true, data: serializeLegal(row) } : fail(404, "Produk hukum tidak ditemukan.");
}

export async function deleteLegal(db: Db, villageId: number, id: number): Promise<Result<{ id: number }>> {
  const done = await db.legalDocument.deleteMany({ where: { id, villageId } });
  return done.count ? { ok: true, data: { id } } : fail(404, "Produk hukum tidak ditemukan.");
}
