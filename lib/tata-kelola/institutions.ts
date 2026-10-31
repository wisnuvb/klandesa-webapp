import type { Prisma } from "@prisma/client";
import { cleanText, fail, future, invalid, isoDay, isRecord, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";

import { INSTITUTION_TYPE_LABEL, INSTITUTION_TYPES, isInstitutionType, MEMBER_ROLES, ROLE_LABEL, ROLE_ORDER, type InstitutionType, type MemberRole } from "./catalog";

export { INSTITUTION_TYPE_LABEL, INSTITUTION_TYPES, isInstitutionType, MEMBER_ROLES, ROLE_LABEL, type InstitutionType, type MemberRole };

type Db = Prisma.TransactionClient;

export const LIMITS = { institutionsPerVillage: 50, membersPerInstitution: 200 } as const;

export interface InstitutionInput {
  type: InstitutionType;
  name: string;
  decreeNumber: string | null;
  decreeDate: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  description: string | null;
}

export function parseInstitutionInput(body: unknown, now: Date = new Date()): Parsed<InstitutionInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const type = isInstitutionType(body.type) ? body.type : null;
  if (!type) fe.type = "Pilih jenis lembaga.";
  const name = cleanText(body.name, 200);
  if (name.bad || !name.value) fe.name = "Isi nama lembaga.";
  else if (name.tooLong) fe.name = "Nama maksimal 200 karakter.";
  const decreeNumber = cleanText(body.decreeNumber, 100);
  if (decreeNumber.bad || decreeNumber.tooLong) fe.decreeNumber = "Nomor SK maksimal 100 karakter.";
  const description = cleanText(body.description, 500);
  if (description.bad || description.tooLong) fe.description = "Keterangan maksimal 500 karakter.";

  const date = (key: "decreeDate" | "periodStart" | "periodEnd", label: string, allowFuture: boolean): Date | null => {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === "") return null;
    const d = parseIsoDate(raw);
    if (!d) fe[key] = `${label} tidak valid.`;
    else if (!allowFuture && future(d, now)) fe[key] = `${label} tidak boleh di masa depan.`;
    return d;
  };
  const decreeDate = date("decreeDate", "Tanggal SK", false);
  const periodStart = date("periodStart", "Awal masa jabatan", true);
  const periodEnd = date("periodEnd", "Akhir masa jabatan", true);
  if (periodStart && periodEnd && periodEnd.getTime() <= periodStart.getTime()) fe.periodEnd = "Akhir masa jabatan harus setelah awalnya.";

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { type: type as InstitutionType, name: name.value as string, decreeNumber: decreeNumber.value, decreeDate, periodStart, periodEnd, description: description.value } };
}

export interface MemberInput {
  name: string | null;
  role: MemberRole;
  division: string | null;
  residentId: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

export function parseMemberInput(body: unknown): Parsed<MemberInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const name = cleanText(body.name, 150);
  if (name.bad || name.tooLong) fe.name = "Nama maksimal 150 karakter.";
  const role = typeof body.role === "string" && (MEMBER_ROLES as string[]).includes(body.role) ? (body.role as MemberRole) : null;
  if (!role) fe.role = "Pilih jabatan.";
  const division = cleanText(body.division, 100);
  if (division.bad || division.tooLong) fe.division = "Bidang maksimal 100 karakter.";
  let residentId: number | null = null;
  if (body.residentId !== undefined && body.residentId !== null && body.residentId !== "") {
    const n = Number(body.residentId);
    if (!Number.isInteger(n) || n < 1) fe.residentId = "Warga tidak valid.";
    else residentId = n;
  }
  if (!name.value && residentId === null) fe.name = "Isi nama anggota atau pilih dari data warga.";
  const date = (key: "startsAt" | "endsAt", label: string): Date | null => {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === "") return null;
    const d = parseIsoDate(raw);
    if (!d) fe[key] = `${label} tidak valid.`;
    return d;
  };
  const startsAt = date("startsAt", "Tanggal mulai");
  const endsAt = date("endsAt", "Tanggal berakhir");
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) fe.endsAt = "Tanggal berakhir harus setelah tanggal mulai.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { name: name.value, role: role as MemberRole, division: division.value, residentId, startsAt, endsAt } };
}

type MemberRow = Prisma.InstitutionMemberGetPayload<object>;
export const serializeMember = (m: MemberRow, today: Date) => ({
  id: m.id,
  name: m.name,
  role: m.role,
  division: m.division,
  residentId: m.residentId,
  startsAt: isoDay(m.startsAt),
  endsAt: isoDay(m.endsAt),
  /** Anggota yang masa baktinya sudah lewat tetap tampil sebagai riwayat. */
  active: !m.endsAt || m.endsAt.getTime() >= today.getTime(),
});
export type MemberView = ReturnType<typeof serializeMember>;

type InstRow = Prisma.VillageInstitutionGetPayload<{ include: { members: true } }>;
export function serializeInstitution(r: InstRow, now: Date) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const members = r.members.map((m) => serializeMember(m, today)).sort((a, b) => Number(b.active) - Number(a.active) || (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name, "id"));
  return {
    id: r.id,
    type: r.type,
    name: r.name,
    decreeNumber: r.decreeNumber,
    decreeDate: isoDay(r.decreeDate),
    periodStart: isoDay(r.periodStart),
    periodEnd: isoDay(r.periodEnd),
    description: r.description,
    /** Masa jabatan sudah berakhir: pengurus perlu dikukuhkan ulang. */
    periodEnded: r.periodEnd ? r.periodEnd.getTime() < today.getTime() : false,
    members,
  };
}
export type InstitutionView = ReturnType<typeof serializeInstitution>;

const include = { members: { orderBy: { id: "asc" as const } } };

export async function listInstitutions(db: Db, villageId: number, now: Date = new Date()): Promise<InstitutionView[]> {
  const rows = await db.villageInstitution.findMany({ where: { villageId }, include, orderBy: [{ type: "asc" }, { name: "asc" }, { id: "asc" }], take: LIMITS.institutionsPerVillage });
  return rows.map((r) => serializeInstitution(r, now));
}

async function loadOne(db: Db, villageId: number, id: number, now?: Date): Promise<Result<InstitutionView>> {
  const row = await db.villageInstitution.findFirst({ where: { id, villageId }, include });
  return row ? { ok: true, data: serializeInstitution(row, now ?? new Date()) } : fail(404, "Lembaga tidak ditemukan.");
}

export async function createInstitution(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<InstitutionView>> {
  const p = parseInstitutionInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  if ((await db.villageInstitution.count({ where: { villageId: args.villageId } })) >= LIMITS.institutionsPerVillage) return fail(409, `Maksimal ${LIMITS.institutionsPerVillage} lembaga per desa.`);
  const row = await db.villageInstitution.create({ data: { villageId: args.villageId, createdById: args.userId, ...p.value }, select: { id: true } });
  return loadOne(db, args.villageId, row.id, args.now);
}

export async function updateInstitution(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<InstitutionView>> {
  const p = parseInstitutionInput(args.input, args.now);
  if (!p.ok) return invalid(p);
  const done = await db.villageInstitution.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value });
  if (done.count === 0) return fail(404, "Lembaga tidak ditemukan.");
  return loadOne(db, args.villageId, args.id, args.now);
}

/** Menghapus lembaga ikut menghapus daftar anggotanya. */
export async function deleteInstitution(db: Db, villageId: number, id: number): Promise<Result<{ id: number }>> {
  const done = await db.villageInstitution.deleteMany({ where: { id, villageId } });
  return done.count ? { ok: true, data: { id } } : fail(404, "Lembaga tidak ditemukan.");
}

/** Warga yang dipilih harus dari desa yang sama; nama diisi dari data warga bila tidak diketik. */
async function resolveMemberName(db: Db, villageId: number, m: MemberInput): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (m.residentId === null) return { ok: true, name: m.name as string };
  const r = await db.resident.findFirst({ where: { id: m.residentId, villageId }, select: { name: true } });
  if (!r) return { ok: false, error: "Warga tidak ditemukan di desa ini." };
  return { ok: true, name: m.name ?? r.name };
}

export async function addMember(db: Db, args: { villageId: number; institutionId: number; input: unknown; now?: Date }): Promise<Result<InstitutionView>> {
  const p = parseMemberInput(args.input);
  if (!p.ok) return invalid(p);
  const inst = await db.villageInstitution.findFirst({ where: { id: args.institutionId, villageId: args.villageId }, select: { id: true } });
  if (!inst) return fail(404, "Lembaga tidak ditemukan.");
  if ((await db.institutionMember.count({ where: { institutionId: inst.id } })) >= LIMITS.membersPerInstitution) return fail(409, `Maksimal ${LIMITS.membersPerInstitution} anggota per lembaga.`);
  const n = await resolveMemberName(db, args.villageId, p.value);
  if (!n.ok) return { ok: false, status: 400, errors: [n.error], fieldErrors: { residentId: n.error } };
  await db.institutionMember.create({ data: { villageId: args.villageId, institutionId: inst.id, ...p.value, name: n.name } });
  return loadOne(db, args.villageId, inst.id, args.now);
}

export async function updateMember(db: Db, args: { villageId: number; institutionId: number; memberId: number; input: unknown; now?: Date }): Promise<Result<InstitutionView>> {
  const p = parseMemberInput(args.input);
  if (!p.ok) return invalid(p);
  const n = await resolveMemberName(db, args.villageId, p.value);
  if (!n.ok) return { ok: false, status: 400, errors: [n.error], fieldErrors: { residentId: n.error } };
  const done = await db.institutionMember.updateMany({ where: { id: args.memberId, institutionId: args.institutionId, villageId: args.villageId }, data: { ...p.value, name: n.name } });
  if (done.count === 0) return fail(404, "Anggota tidak ditemukan.");
  return loadOne(db, args.villageId, args.institutionId, args.now);
}

export async function removeMember(db: Db, args: { villageId: number; institutionId: number; memberId: number; now?: Date }): Promise<Result<InstitutionView>> {
  const done = await db.institutionMember.deleteMany({ where: { id: args.memberId, institutionId: args.institutionId, villageId: args.villageId } });
  if (done.count === 0) return fail(404, "Anggota tidak ditemukan.");
  return loadOne(db, args.villageId, args.institutionId, args.now);
}
