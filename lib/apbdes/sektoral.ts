/** Program sektoral, program daerah, dan program lain yang masuk ke desa (Permendagri 20/2018 Lampiran T.4). */
import type { Prisma } from "@prisma/client";
import { cleanText, fail, invalid, isRecord, type Parsed, type Result } from "@/lib/form-input";
import { fromCents, toCents, type Cents } from "@/lib/coop/loan-math";

type Db = Prisma.TransactionClient;
export const SEKTORAL_LIMIT = 500;

export interface ProgramInput {
  programName: string;
  activityKind: string;
  location: string | null;
  volumeH: Cents;
  unit: string;
  amountCents: Cents;
  fundSource: string;
}

export function parseProgramInput(body: unknown): Parsed<ProgramInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Isian tidak terbaca"], fieldErrors: {} };
  const req = (k: string, max: number, label: string): string => {
    const t = cleanText(body[k], max);
    if (t.bad || t.tooLong || !t.value) fe[k] = `${label} wajib diisi (maks. ${max} karakter)`;
    return t.value ?? "";
  };
  const programName = req("programName", 200, "Nama program");
  const activityKind = req("activityKind", 200, "Jenis kegiatan");
  const unit = req("unit", 30, "Satuan");
  const fundSource = req("fundSource", 150, "Sumber dana");
  const loc = cleanText(body.location, 200);
  if (loc.bad || loc.tooLong) fe.location = "Lokasi maksimal 200 karakter";
  const num = (raw: unknown): Cents | null => (typeof raw === "string" || typeof raw === "number" ? toCents(typeof raw === "string" ? raw.trim().replace(",", ".") : raw) : null);
  const volumeH = num(body.volume);
  if (volumeH === null || volumeH <= 0n) fe.volume = "Volume harus angka lebih dari nol (maks. 2 desimal)";
  const amountCents = num(body.amount);
  if (amountCents === null || amountCents <= 0n) fe.amount = "Jumlah harus angka lebih dari nol";
  if (Object.keys(fe).length || volumeH === null || amountCents === null) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { programName, activityKind, location: loc.value, volumeH, unit, amountCents, fundSource } };
}

export async function listPrograms(db: Db, villageId: number, year: number) {
  const rows = await db.apbdesExternalProgram.findMany({ where: { villageId, year }, orderBy: { id: "asc" }, take: SEKTORAL_LIMIT });
  return rows.map((p) => ({ id: p.id, programName: p.programName, activityKind: p.activityKind, location: p.location, volume: p.volume.toFixed(2), unit: p.unit, amount: fromCents(p.amountCents), fundSource: p.fundSource }));
}

export async function addProgram(db: Db, args: { villageId: number; year: number; input: unknown }): Promise<Result<{ id: number }>> {
  if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) return fail(400, "Tahun tidak valid.");
  const p = parseProgramInput(args.input);
  if (!p.ok) return invalid(p);
  if ((await db.apbdesExternalProgram.count({ where: { villageId: args.villageId, year: args.year } })) >= SEKTORAL_LIMIT) return fail(409, `Maksimal ${SEKTORAL_LIMIT} program per tahun.`);
  const v = p.value;
  const row = await db.apbdesExternalProgram.create({ data: { villageId: args.villageId, year: args.year, programName: v.programName, activityKind: v.activityKind, location: v.location, volume: fromCents(v.volumeH), unit: v.unit, amountCents: v.amountCents, fundSource: v.fundSource } });
  return { ok: true, data: { id: row.id } };
}

export async function deleteProgram(db: Db, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  const res = await db.apbdesExternalProgram.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return res.count === 0 ? fail(404, "Program tidak ditemukan.") : { ok: true, data: { id: args.id } };
}
