import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, type Result } from "@/lib/form-input";
import { fromCents, toCents } from "@/lib/coop/loan-math";
import { accountKind } from "@/lib/apbdes/catalog";
import { Rollback, activeDocument, ensureYear, lockYear, ok, rollbackToResult } from "@/lib/apbdes/service";
import { alignmentWarnings, compareRkpToApbdes, type AlignState, type Alignment } from "./alignment";
import { PAGU_SOURCES } from "./catalog";

type Db = Prisma.TransactionClient;

export interface AlignmentView {
  rkp: { id: number; year: number; revision: number };
  apbdes: { id: number; version: number; label: string; status: string } | null;
  /** Dokumen APB Desa tahun yang sama untuk dipilih (terbaru di atas) */
  apbdesOptions: { id: number; label: string; status: string }[];
  rows: { activityCode: string; name: string; rkp: string; apb: string; diff: string; state: AlignState; titles: string[] }[];
  sources: { fundSource: string | null; label: string; rkp: string; apb: string; diff: string }[];
  uncoded: { count: number; amount: string };
  totals: { rkp: string; apb: string; diff: string };
  counts: Record<AlignState, number>;
  warnings: string[];
  /** DPA hanya dapat disiapkan dari APB Desa yang sudah ditetapkan */
  dpaReady: boolean;
}

const docLabel = (version: number): string => (version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${version}`);
const decCents = (d: Prisma.Decimal | null): bigint => (d ? (toCents(d.toFixed(2)) ?? 0n) : 0n);

function view(rkp: AlignmentView["rkp"], apb: AlignmentView["apbdes"], options: AlignmentView["apbdesOptions"], a: Alignment, dpaReady: boolean): AlignmentView {
  return {
    rkp,
    apbdes: apb,
    apbdesOptions: options,
    rows: a.rows.map((r) => ({ activityCode: r.activityCode, name: r.name, rkp: fromCents(r.rkpCents), apb: fromCents(r.apbCents), diff: fromCents(r.diffCents), state: r.state, titles: r.titles })),
    sources: a.sources.map((s) => ({ fundSource: s.fundSource, label: s.fundSource ? (PAGU_SOURCES[s.fundSource as keyof typeof PAGU_SOURCES] ?? s.fundSource) : "Belum diisi", rkp: fromCents(s.rkpCents), apb: fromCents(s.apbCents), diff: fromCents(s.diffCents) })),
    uncoded: { count: a.uncoded.count, amount: fromCents(a.uncoded.cents) },
    totals: { rkp: fromCents(a.totals.rkpCents), apb: fromCents(a.totals.apbCents), diff: fromCents(a.totals.diffCents) },
    counts: a.counts,
    warnings: alignmentWarnings(a),
    dpaReady,
  };
}

/** Membandingkan satu dokumen RKP Desa dengan APB Desa tahun yang sama (default: dokumen APB Desa terbaru). */
export async function loadAlignment(db: Db, args: { villageId: number; documentId: number; apbdesId?: number | null }): Promise<Result<AlignmentView>> {
  const doc = await db.rkpdesDocument.findFirst({
    where: { id: args.documentId, villageId: args.villageId },
    select: { id: true, year: true, revision: true, activities: { select: { id: true, title: true, activityCode: true, fundSource: true, estimatedBudget: true, status: true } } },
  });
  if (!doc) return fail(404, "RKP Desa tidak ditemukan.");
  const rkp = { id: doc.id, year: doc.year, revision: doc.revision };
  const docs = await db.apbdesDocument.findMany({ where: { villageId: args.villageId, year: doc.year }, orderBy: { version: "desc" }, select: { id: true, version: true, status: true } });
  const options = docs.map((d) => ({ id: d.id, label: docLabel(d.version), status: d.status }));
  const chosen = args.apbdesId ? docs.find((d) => d.id === args.apbdesId) : docs[0];
  if (args.apbdesId && !chosen) return fail(404, "Dokumen APB Desa tidak ditemukan pada tahun ini.");
  const lite = doc.activities.map((a) => ({ id: a.id, title: a.title, activityCode: a.activityCode, fundSource: a.fundSource, budgetCents: decCents(a.estimatedBudget), cancelled: a.status === "cancelled" }));
  if (!chosen) return ok(view(rkp, null, options, compareRkpToApbdes(lite, []), false));
  const lines = await db.apbdesLine.findMany({ where: { documentId: chosen.id, villageId: args.villageId }, select: { activityCode: true, accountCode: true, amountCents: true, fundSource: true } });
  const a = compareRkpToApbdes(lite, lines);
  return ok(view(rkp, { id: chosen.id, version: chosen.version, label: docLabel(chosen.version), status: chosen.status }, options, a, chosen.status === "DITETAPKAN"));
}

const clip = (s: string | null, max: number): string | null => (s && s.trim() ? s.trim().slice(0, max) : null);

export interface PrefillResult {
  created: number;
  skipped: { activityCode: string; reason: string }[];
}

/**
 * Menyiapkan draf DPA (Rencana Kerja Kegiatan) dari data pelaksanaan kegiatan RKP Desa: lokasi, keluaran, volume, dan tim.
 * Hanya untuk kegiatan yang ada belanjanya di APB Desa yang berlaku dan belum punya DPA; tidak menimpa apa pun.
 * Pelaksana (Kaur/Kasi) dan bulan pelaksanaan tidak ada di RKP Desa, jadi tetap diisi operator.
 */
export async function prefillDpa(db: PrismaClient, args: { villageId: number; documentId: number }): Promise<Result<PrefillResult>> {
  const doc = await db.rkpdesDocument.findFirst({ where: { id: args.documentId, villageId: args.villageId }, select: { id: true, year: true } });
  if (!doc) return fail(404, "RKP Desa tidak ditemukan.");
  await ensureYear(db, args.villageId, doc.year);
  return db
    .$transaction(async (tx) => {
      await lockYear(tx, args.villageId, doc.year);
      const active = await activeDocument(tx, args.villageId, doc.year);
      if (!active) throw new Rollback("APB Desa tahun ini belum ditetapkan. DPA baru dapat disiapkan setelah APB Desa ditetapkan dengan Peraturan Desa.");
      const inApb = new Set(active.lines.filter((l) => l.activityCode && accountKind(l.accountCode) === "BELANJA").map((l) => l.activityCode!));
      const [acts, plans] = await Promise.all([
        tx.rkpdesActivity.findMany({ where: { documentId: doc.id, activityCode: { not: null }, status: { not: "cancelled" } }, orderBy: { id: "asc" } }),
        tx.apbdesActivityPlan.findMany({ where: { villageId: args.villageId, year: doc.year }, select: { activityCode: true } }),
      ]);
      const hasPlan = new Set(plans.map((p) => p.activityCode));
      const byCode = new Map<string, typeof acts>();
      for (const a of acts) byCode.set(a.activityCode!, [...(byCode.get(a.activityCode!) ?? []), a]);

      const skipped: PrefillResult["skipped"] = [];
      const data: Prisma.ApbdesActivityPlanCreateManyInput[] = [];
      for (const [code, list] of [...byCode].sort(([x], [y]) => x.localeCompare(y))) {
        if (!inApb.has(code)) skipped.push({ activityCode: code, reason: "Belum ada belanjanya di APB Desa yang berlaku" });
        else if (hasPlan.has(code)) skipped.push({ activityCode: code, reason: "Sudah punya DPA (tidak ditimpa)" });
        else if (list.length > 1) skipped.push({ activityCode: code, reason: `${list.length} kegiatan RKP Desa memakai kode ini; isi DPA secara manual` });
        else {
          const a = list[0]!;
          const team = [a.executorChair && `Ketua: ${a.executorChair}`, a.executorSecretary && `Sekretaris: ${a.executorSecretary}`, a.executorTreasurer && `Bendahara: ${a.executorTreasurer}`, a.executorMembers && `Anggota: ${a.executorMembers}`].filter(Boolean).join("; ");
          const hasOutput = Boolean(a.outputVolume && a.outputUnit && a.outputVolume.gt(0));
          const row = {
            villageId: args.villageId,
            year: doc.year,
            activityCode: code,
            location: clip(a.location, 200),
            outputName: clip(a.outputName, 200),
            outputVolume: hasOutput ? a.outputVolume : null,
            outputUnit: hasOutput ? clip(a.outputUnit, 30) : null,
            team: clip(team, 300),
          };
          if (!row.location && !row.outputName && !hasOutput && !row.team) skipped.push({ activityCode: code, reason: "Data pelaksanaan di RKP Desa masih kosong" });
          else data.push(row);
        }
      }
      // skipDuplicates: bila ada DPA yang dibuat bersamaan, baris itu dilewati, bukan menimpa.
      const made = data.length ? await tx.apbdesActivityPlan.createMany({ data, skipDuplicates: true }) : { count: 0 };
      return ok<PrefillResult>({ created: made.count, skipped });
    })
    .catch(rollbackToResult);
}
