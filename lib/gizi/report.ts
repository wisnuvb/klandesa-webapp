import type { Prisma } from "@prisma/client";
import { assess, sexOf, type Assessment } from "./zscore";

type Db = Prisma.TransactionClient;

export interface GiziRow {
  visitId: number;
  residentId: number;
  name: string;
  rt: string | null;
  rw: string | null;
  sex: "M" | "F" | null;
  birthDate: string;
  measuredOn: string;
  weightKg: number | null;
  heightCm: number | null;
  /** Tanda stunting yang tercatat di sistem (isian kader). */
  flaggedStunting: boolean;
  assessment: Assessment | null;
  /** Alasan penilaian tak bisa dihitung (data warga/ukuran belum lengkap). */
  reason: string | null;
  /** Hitungan WHO dan tanda di sistem berbeda: perlu ditinjau tenaga kesehatan. */
  mismatch: boolean;
}

export interface GiziReport {
  rows: GiziRow[];
  summary: { children: number; assessed: number; stunted: number; wasted: number; underweight: number; mismatch: number; incomplete: number };
}

const MAX_VISITS = 5000;

/** Pengukuran TERAKHIR tiap anak (<= 60 bulan saat diukur) beserta status gizi hitungan WHO. Tanpa NIK. */
export async function giziReport(db: Db, villageId: number, opts: { sessionId?: number } = {}): Promise<GiziReport> {
  const visits = await db.posyanduVisit.findMany({
    where: { session: { villageId, ...(opts.sessionId ? { id: opts.sessionId } : {}) }, resident: { villageId } },
    orderBy: [{ session: { sessionDate: "desc" } }, { id: "desc" }],
    take: MAX_VISITS,
    select: {
      id: true,
      weightKg: true,
      heightCm: true,
      isStunting: true,
      session: { select: { sessionDate: true } },
      resident: { select: { id: true, name: true, rt: true, rw: true, birthDate: true, gender: true } },
    },
  });

  const seen = new Set<number>();
  const rows: GiziRow[] = [];
  const summary = { children: 0, assessed: 0, stunted: 0, wasted: 0, underweight: 0, mismatch: 0, incomplete: 0 };
  for (const v of visits) {
    if (!opts.sessionId) {
      if (seen.has(v.resident.id)) continue;
      seen.add(v.resident.id);
    }
    const sex = sexOf(v.resident.gender);
    const r = assess({ sex, birthDate: v.resident.birthDate, measuredOn: v.session.sessionDate, weightKg: v.weightKg, heightCm: v.heightCm });
    // Hanya anak 0-60 bulan yang relevan; yang lebih tua tidak masuk laporan gizi balita.
    if (!r.ok && r.reason.startsWith("Standar ini hanya")) continue;
    summary.children++;
    const a = r.ok ? r.value : null;
    const mismatch = a?.stunted != null && a.stunted !== v.isStunting;
    if (a) {
      summary.assessed++;
      if (a.stunted) summary.stunted++;
      if (a.whzCategory === "GIZI_BURUK" || a.whzCategory === "GIZI_KURANG") summary.wasted++;
      if (a.wazCategory === "BB_KURANG" || a.wazCategory === "BB_SANGAT_KURANG") summary.underweight++;
      if (mismatch) summary.mismatch++;
    } else summary.incomplete++;
    rows.push({
      visitId: v.id,
      residentId: v.resident.id,
      name: v.resident.name,
      rt: v.resident.rt,
      rw: v.resident.rw,
      sex,
      birthDate: v.resident.birthDate.toISOString().slice(0, 10),
      measuredOn: v.session.sessionDate.toISOString().slice(0, 10),
      weightKg: v.weightKg,
      heightCm: v.heightCm,
      flaggedStunting: v.isStunting,
      assessment: a,
      reason: r.ok ? null : r.reason,
      mismatch,
    });
  }
  return { rows, summary };
}
