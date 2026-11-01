/** Impor dan pembacaan skor IDM per desa per tahun. Penulisan memegang kunci baris (desa, tahun) sebagai pernyataan pertama transaksi. */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, type Result } from "@/lib/form-input";
import { parseIdmVillageCodeFromSettings } from "@/lib/dashboard/idm";
import { DIMENSIONS } from "./catalog";
import { deltas, recommend, scalesDiffer, type Delta, type Recommendation, type ScoreFact } from "./calc";
import { parseImport } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {}
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(409, e.message);
  throw e;
};
const num = (d: Prisma.Decimal | null): number | null => (d === null ? null : Number(d.toString()));

export interface IdmYear {
  year: number;
  iks: number | null;
  ike: number | null;
  ikl: number | null;
  idm: number | null;
  status: string | null;
  sourceName: string | null;
  importedAt: string | null;
  indicatorCount: number;
}
export interface IdmOverview {
  village: { name: string; district: string; idmVillageCode: string };
  years: IdmYear[];
  selectedYear: number | null;
  indicators: { id: number; dimension: string; dimensionLabel: string; code: string | null; name: string; score: number; maxScore: number | null; note: string | null; suggestion: string | null }[];
  recommendation: Recommendation | null;
  deltas: Delta[];
  scalesDiffer: boolean;
}

export async function getOverview(db: PrismaClient, args: { villageId: number; year?: number }): Promise<Result<IdmOverview>> {
  const village = await db.village.findUnique({ where: { id: args.villageId }, select: { name: true, district: true, settings: true } });
  if (!village) return fail(404, "Desa tidak ditemukan.");
  const [scores, counts] = await Promise.all([
    db.idmScore.findMany({ where: { villageId: args.villageId }, orderBy: { year: "desc" }, take: 30 }),
    db.idmIndicator.groupBy({ by: ["year"], where: { villageId: args.villageId }, _count: { _all: true }, orderBy: { year: "desc" }, take: 30 }),
  ]);
  const countBy = new Map(counts.map((c) => [c.year, c._count._all]));
  const byYear = new Map<number, IdmYear>();
  for (const s of scores) byYear.set(s.year, { year: s.year, iks: num(s.iks), ike: num(s.ike), ikl: num(s.ikl), idm: num(s.idm), status: s.status, sourceName: s.sourceName, importedAt: s.importedAt.toISOString(), indicatorCount: countBy.get(s.year) ?? 0 });
  for (const [y, c] of countBy) if (!byYear.has(y)) byYear.set(y, { year: y, iks: null, ike: null, ikl: null, idm: null, status: null, sourceName: null, importedAt: null, indicatorCount: c });
  const years = [...byYear.values()].sort((a, b) => b.year - a.year);
  const selectedYear = args.year && byYear.has(args.year) ? args.year : (years[0]?.year ?? null);
  let indicators: IdmOverview["indicators"] = [];
  let rec: Recommendation | null = null;
  let dl: Delta[] = [];
  let differ = false;
  if (selectedYear !== null) {
    const rows = await db.idmIndicator.findMany({ where: { villageId: args.villageId, year: selectedYear }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 300 });
    indicators = rows.map((r) => ({ id: r.id, dimension: r.dimension, dimensionLabel: DIMENSIONS[r.dimension as keyof typeof DIMENSIONS] ?? r.dimension, code: r.code, name: r.name, score: Number(r.score.toString()), maxScore: num(r.maxScore), note: r.note, suggestion: r.suggestion }));
    const cur = byYear.get(selectedYear)!;
    const fact: ScoreFact = { year: cur.year, iks: cur.iks, ike: cur.ike, ikl: cur.ikl, idm: cur.idm, status: cur.status };
    rec = recommend(indicators.map((i) => ({ id: i.id, dimension: i.dimension as never, code: i.code, name: i.name, score: i.score, maxScore: i.maxScore, note: i.note, suggestion: i.suggestion })), cur.importedAt ? fact : null);
    const prev = years.find((y) => y.year < selectedYear && y.importedAt);
    if (prev && cur.importedAt) {
      const pf: ScoreFact = { year: prev.year, iks: prev.iks, ike: prev.ike, ikl: prev.ikl, idm: prev.idm, status: prev.status };
      dl = deltas(fact, pf);
      differ = scalesDiffer(fact, pf);
    }
  }
  return ok({ village: { name: village.name, district: village.district, idmVillageCode: parseIdmVillageCodeFromSettings(village.settings) }, years, selectedYear, indicators, recommendation: rec, deltas: dl, scalesDiffer: differ });
}

async function ensureRow(db: PrismaClient, villageId: number, year: number) {
  await db.idmScore.createMany({ data: [{ villageId, year }], skipDuplicates: true });
}
async function lock(tx: Db, villageId: number, year: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM idm_scores WHERE villageId = ${villageId} AND year = ${year} FOR UPDATE`;
  if (!rows.length) throw new Stop("Data IDM tahun ini belum siap. Coba lagi.");
}

/** Mengganti data satu desa-tahun. SUMMARY mengganti skor; INDICATORS mengganti seluruh indikator tahun itu (skor tak tersentuh). */
export async function importIdm(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown; thisYear?: number }): Promise<Result<{ year: number; layout: string; indicators: number; replaced: boolean }>> {
  const p = parseImport(args.input, args.thisYear);
  if (!p.ok) return invalid(p);
  const v = p.value;
  // Baris kosong dibuat dulu (di luar transaksi) agar penulis serentak bertemu pada satu baris yang dikunci.
  await ensureRow(db, args.villageId, v.year);
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, v.year);
      const cur = await tx.idmScore.findUnique({ where: { villageId_year: { villageId: args.villageId, year: v.year } } });
      const hadData = Boolean(cur && (cur.iks !== null || cur.ike !== null || cur.ikl !== null || cur.idm !== null || cur.status !== null || cur.sourceName));
      if (v.layout === "SUMMARY") {
        const s = v.summary!;
        await tx.idmScore.update({ where: { villageId_year: { villageId: args.villageId, year: v.year } }, data: { iks: s.iks, ike: s.ike, ikl: s.ikl, idm: s.idm, status: s.status, sourceName: v.fileName, importedById: args.userId, importedAt: new Date() } });
        return ok({ year: v.year, layout: v.layout, indicators: 0, replaced: hadData });
      }
      const old = await tx.idmIndicator.count({ where: { villageId: args.villageId, year: v.year } });
      await tx.idmIndicator.deleteMany({ where: { villageId: args.villageId, year: v.year } });
      await tx.idmIndicator.createMany({ data: v.indicators.map((i, n) => ({ villageId: args.villageId, year: v.year, dimension: i.dimension, code: i.code, name: i.name, score: i.score, maxScore: i.maxScore, note: i.note, suggestion: i.suggestion, sortOrder: n })) });
      if (!cur?.sourceName) await tx.idmScore.update({ where: { villageId_year: { villageId: args.villageId, year: v.year } }, data: { sourceName: v.fileName, importedById: args.userId } });
      return ok({ year: v.year, layout: v.layout, indicators: v.indicators.length, replaced: old > 0 });
    })
    .catch(asResult);
}

/** Menghapus semua data IDM satu tahun milik desa. */
export async function deleteYear(db: PrismaClient, args: { villageId: number; year: number }): Promise<Result<{ year: number; indicators: number }>> {
  if (!Number.isInteger(args.year) || args.year < 2010 || args.year > 2100) return fail(400, "Tahun tidak valid.");
  return db
    .$transaction(async (tx) => {
      const exists = await tx.idmScore.findUnique({ where: { villageId_year: { villageId: args.villageId, year: args.year } }, select: { id: true } });
      if (!exists) throw new Stop("Data IDM tahun ini tidak ditemukan.");
      await lock(tx, args.villageId, args.year);
      const n = await tx.idmIndicator.deleteMany({ where: { villageId: args.villageId, year: args.year } });
      await tx.idmScore.delete({ where: { villageId_year: { villageId: args.villageId, year: args.year } } });
      return ok({ year: args.year, indicators: n.count });
    })
    .catch(asResult);
}

