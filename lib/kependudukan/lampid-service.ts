/** Pembacaan data untuk laporan LAMPID (lapis DB). Logika hitung ada di lampid.ts. */
import { prisma } from "@/lib/prisma";
import {
  buildLampid,
  eventsFromMutations,
  eventsFromResidents,
  mergeEvents,
  type LampidActiveGroup,
  type LampidGroup,
  type LampidReport,
  type LampidResidentRow,
  monthRange,
} from "./lampid";

const RESIDENT_SELECT = {
  id: true,
  name: true,
  nik: true,
  gender: true,
  nationality: true,
  hamlet: true,
  rt: true,
  rw: true,
  birthDate: true,
  arrivalDate: true,
  originAddress: true,
  motherName: true,
  fatherName: true,
  isAlive: true,
  deathDate: true,
  moveDate: true,
} as const;

export async function loadLampidReport(villageId: number, month: string, group: LampidGroup): Promise<LampidReport> {
  const { from } = monthRange(month);
  const since = new Date(`${from}T00:00:00.000Z`);

  const [windowResidents, mutations, activeGroups, unplacedDeaths] = await Promise.all([
    // Warga yang punya kejadian pada/sesudah awal bulan (sisanya tidak memengaruhi bulan ini maupun hitung mundur).
    prisma.resident.findMany({
      where: { villageId, OR: [{ birthDate: { gte: since } }, { arrivalDate: { gte: since } }, { deathDate: { gte: since } }, { moveDate: { gte: since } }] },
      select: RESIDENT_SELECT,
    }),
    prisma.residentMutation.findMany({
      where: { villageId, status: "APPLIED", type: { in: ["BIRTH", "DEATH", "MOVE_OUT", "MOVE_IN"] }, effectiveDate: { gte: since } },
      select: { type: true, effectiveDate: true, residentId: true, residentName: true, residentNikLast4: true, rt: true, rw: true, details: true },
    }),
    // Penduduk aktif sekarang = hidup dan belum pindah (sama dengan definisi di Statistik/Data Warga).
    prisma.resident.groupBy({
      by: ["gender", "nationality", "hamlet", "rt", "rw"],
      where: { villageId, isAlive: true, moveDate: null },
      _count: { _all: true },
    }),
    prisma.resident.count({ where: { villageId, isAlive: false, deathDate: null } }),
  ]);

  // Mutasi yang menunjuk warga di luar jendela di atas (mis. kembali datang) tetap perlu atribut warganya.
  const byId = new Map<number, LampidResidentRow>(windowResidents.map((r) => [r.id, r]));
  const missing = [...new Set(mutations.map((m) => m.residentId).filter((id): id is number => id != null && !byId.has(id)))];
  if (missing.length) {
    const extra = await prisma.resident.findMany({ where: { villageId, id: { in: missing } }, select: RESIDENT_SELECT });
    for (const r of extra) byId.set(r.id, r);
  }

  const events = mergeEvents(eventsFromMutations(mutations, byId), eventsFromResidents(windowResidents, from));
  const active: LampidActiveGroup[] = activeGroups.map((g) => ({
    gender: g.gender,
    nationality: g.nationality,
    hamlet: g.hamlet,
    rt: g.rt,
    rw: g.rw,
    count: g._count._all,
  }));
  return buildLampid({ month, group, active, events, unplacedDeaths });
}
