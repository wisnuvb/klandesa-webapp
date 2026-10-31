import { Prisma } from "@prisma/client";
import { cleanText, fail, future, invalid, isoDay, isRecord, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";

import { DIRECTION_LABEL, isDirection, NATURE_LABEL, NATURES, type Direction, type Nature } from "./catalog";

export { DIRECTION_LABEL, isDirection, NATURE_LABEL, NATURES, type Direction, type Nature };

type Db = Prisma.TransactionClient;

export const REGISTER_LIMIT = 200000;
const AGENDA_RETRIES = 10;

export interface RegisterInput {
  direction: Direction;
  letterNumber: string | null;
  letterDate: Date;
  registeredAt: Date;
  party: string;
  subject: string;
  nature: Nature;
  disposition: string | null;
  notes: string | null;
}

export function parseRegisterInput(body: unknown, now: Date = new Date()): Parsed<RegisterInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };

  const direction = isDirection(body.direction) ? body.direction : null;
  if (!direction) fe.direction = "Pilih surat masuk atau surat keluar.";

  const letterNumber = cleanText(body.letterNumber, 100);
  if (letterNumber.bad || letterNumber.tooLong) fe.letterNumber = "Nomor surat maksimal 100 karakter.";

  const letterDate = parseIsoDate(body.letterDate);
  if (!letterDate) fe.letterDate = "Isi tanggal surat.";
  else if (future(letterDate, now)) fe.letterDate = "Tanggal surat tidak boleh di masa depan.";

  const registeredAt = parseIsoDate(body.registeredAt);
  const regLabel = direction === "OUT" ? "Tanggal dikirim" : "Tanggal diterima";
  if (!registeredAt) fe.registeredAt = `Isi ${regLabel.toLowerCase()}.`;
  else if (future(registeredAt, now)) fe.registeredAt = `${regLabel} tidak boleh di masa depan.`;
  else if (letterDate && registeredAt.getTime() < letterDate.getTime()) fe.registeredAt = `${regLabel} tidak boleh sebelum tanggal surat.`;

  const partyLabel = direction === "OUT" ? "tujuan" : "asal";
  const party = cleanText(body.party, 200);
  if (party.bad || !party.value) fe.party = `Isi ${partyLabel} surat.`;
  else if (party.tooLong) fe.party = `${partyLabel[0].toUpperCase()}${partyLabel.slice(1)} surat maksimal 200 karakter.`;
  const subject = cleanText(body.subject, 300);
  if (subject.bad || !subject.value) fe.subject = "Isi perihal surat.";
  else if (subject.tooLong) fe.subject = "Perihal maksimal 300 karakter.";

  const nature = body.nature === undefined || body.nature === null || body.nature === "" ? "BIASA" : body.nature;
  if (typeof nature !== "string" || !(NATURES as string[]).includes(nature)) fe.nature = "Pilih sifat surat.";
  const disposition = cleanText(body.disposition, 1000);
  if (disposition.bad || disposition.tooLong) fe.disposition = "Disposisi maksimal 1000 karakter.";
  const notes = cleanText(body.notes, 500);
  if (notes.bad || notes.tooLong) fe.notes = "Keterangan maksimal 500 karakter.";

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return {
    ok: true,
    value: {
      direction: direction as Direction,
      letterNumber: letterNumber.value,
      letterDate: letterDate as Date,
      registeredAt: registeredAt as Date,
      party: party.value as string,
      subject: subject.value as string,
      nature: nature as Nature,
      disposition: disposition.value,
      notes: notes.value,
    },
  };
}

type Row = Prisma.MailRegisterGetPayload<object>;
export function serializeRegister(r: Row) {
  return {
    id: r.id,
    direction: r.direction,
    year: r.year,
    agendaNo: r.agendaNo,
    agendaLabel: `${String(r.agendaNo).padStart(3, "0")}/${r.year}`,
    letterNumber: r.letterNumber,
    letterDate: isoDay(r.letterDate) as string,
    registeredAt: isoDay(r.registeredAt) as string,
    party: r.party,
    subject: r.subject,
    nature: r.nature,
    disposition: r.disposition,
    notes: r.notes,
  };
}
export type RegisterView = ReturnType<typeof serializeRegister>;

const isDup = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function listRegister(db: Db, villageId: number, f: { direction?: string; year?: number; search?: string; page: number; pageSize: number }) {
  const where: Prisma.MailRegisterWhereInput = { villageId };
  if (isDirection(f.direction)) where.direction = f.direction;
  if (f.year) where.year = f.year;
  if (f.search) where.OR = [{ party: { contains: f.search } }, { subject: { contains: f.search } }, { letterNumber: { contains: f.search } }];
  const [rows, total, counts] = await Promise.all([
    db.mailRegister.findMany({ where, orderBy: [{ year: "desc" }, { agendaNo: "desc" }, { id: "desc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.mailRegister.count({ where }),
    db.mailRegister.groupBy({ by: ["direction", "year"], where: { villageId }, _count: { _all: true } }),
  ]);
  return { items: rows.map(serializeRegister), total, page: f.page, pageSize: f.pageSize, counts: counts.map((c) => ({ direction: c.direction, year: c.year, count: c._count._all })) };
}

/**
 * Catat surat dan beri nomor agenda berikutnya untuk (desa, arah, tahun). Dua operator yang mencatat bersamaan
 * bisa memilih nomor yang sama; indeks unik menolak yang kedua, lalu nomor dicoba lagi.
 */
export async function createRegister(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<RegisterView>> {
  const p = parseRegisterInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  if ((await db.mailRegister.count({ where: { villageId: args.villageId } })) >= REGISTER_LIMIT) return fail(409, "Register surat sudah mencapai batas.");
  const year = p.value.registeredAt.getUTCFullYear();
  for (let attempt = 0; attempt < AGENDA_RETRIES; attempt++) {
    const last = await db.mailRegister.aggregate({ where: { villageId: args.villageId, direction: p.value.direction, year }, _max: { agendaNo: true } });
    try {
      const row = await db.mailRegister.create({ data: { villageId: args.villageId, createdById: args.userId, year, agendaNo: (last._max.agendaNo ?? 0) + 1, ...p.value } });
      return { ok: true, data: serializeRegister(row) };
    } catch (e) {
      if (!isDup(e)) throw e;
    }
  }
  return fail(409, "Nomor agenda sedang dipakai pencatat lain. Coba simpan lagi.");
}

/** Ubah isi surat. Arah dan tahun (dasar nomor agenda) tidak berubah. */
export async function updateRegister(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<RegisterView>> {
  const current = await db.mailRegister.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { direction: true, year: true } });
  if (!current) return fail(404, "Surat tidak ditemukan.");
  const body = isRecord(args.input) ? { ...args.input, direction: current.direction } : args.input;
  const p = parseRegisterInput(body, args.now);
  if (!p.ok) return invalid(p);
  if (p.value.registeredAt.getUTCFullYear() !== current.year) {
    const msg = `Tanggal harus tetap di tahun ${current.year} (nomor agenda mengikuti tahun). Hapus lalu catat ulang bila memang berbeda tahun.`;
    return { ok: false, status: 400, errors: [msg], fieldErrors: { registeredAt: msg } };
  }
  const { direction: _direction, ...data } = p.value;
  void _direction;
  await db.mailRegister.updateMany({ where: { id: args.id, villageId: args.villageId }, data });
  const row = await db.mailRegister.findFirst({ where: { id: args.id, villageId: args.villageId } });
  return row ? { ok: true, data: serializeRegister(row) } : fail(404, "Surat tidak ditemukan.");
}
