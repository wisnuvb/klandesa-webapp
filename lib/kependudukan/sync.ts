/**
 * Sinkronisasi struktur kependudukan v2 (rumah tangga, wilayah) dari kolom lama `residents`.
 * Kolom lama tetap sumber kebenaran; di sini hanya "bayangan" yang dihitung ulang dari rencana murni
 * (`planHouseholdBackfill`, `planWilayahBackfill`). Idempotent: hanya baris yang berbeda yang ditulis.
 *
 * Dua pintu masuk, satu mesin:
 *  - `reconcileVillage`   seluruh desa (backfill awal, setelah impor, terjadwal)
 *  - `syncResidents`      beberapa warga + KK yang tersentuh (titik tulis: POST/PUT/PATCH/DELETE)
 *
 * Titik tulis memakai `runKependudukanSync`: bendera mati = tidak ada yang dijalankan; gagal = penulisan warga
 * tetap sukses, kegagalan dicatat dan desa ditandai butuh rekonsiliasi.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { planHouseholdBackfill, normalizeKk, type ResidentLite } from "./household";
import { planWilayahBackfill, type WilayahUnitPlan } from "./wilayah";
import { detectLegacyEditMutations } from "./mutation";

export type Db = Prisma.TransactionClient;

export const SETTINGS_FLAG = "kependudukanV2";
export const SETTINGS_NEEDS_RECONCILE = "kependudukanV2NeedsReconcile";

/** Bendera per desa: `Village.settings.kependudukanV2 === true`. Default mati. */
export function isKependudukanV2(settings: unknown): boolean {
  return Boolean(settings && typeof settings === "object" && (settings as Record<string, unknown>)[SETTINGS_FLAG] === true);
}

export interface ResidentRow extends ResidentLite {
  householdId: number | null;
  wilayahUnitId: number | null;
  dusunUnitId: number | null;
}

const ROW_SELECT = {
  id: true,
  kk: true,
  familyRole: true,
  isAlive: true,
  moveDate: true,
  rt: true,
  rw: true,
  hamlet: true,
  address: true,
  birthDate: true,
  householdId: true,
  wilayahUnitId: true,
  dusunUnitId: true,
} as const;

export interface SyncResult {
  unitsCreated: number;
  householdsCreated: number;
  householdsUpdated: number;
  householdsDeactivated: number;
  residentsLinked: number;
}

const emptyResult = (): SyncResult => ({ unitsCreated: 0, householdsCreated: 0, householdsUpdated: 0, householdsDeactivated: 0, residentsLinked: 0 });

const chunk = <T>(xs: readonly T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

/** Pastikan unit wilayah rencana ada di DB (dusun & RW dulu, lalu RT yang butuh id induk). Mengembalikan key rencana → id. */
async function ensureUnits(db: Db, villageId: number, units: readonly WilayahUnitPlan[], result: SyncResult): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  if (units.length === 0) return ids;

  const load = async () => {
    for (const part of chunk(units.map((u) => u.key), 500)) {
      const rows = await db.wilayahUnit.findMany({ where: { villageId, canonicalKey: { in: part } }, select: { id: true, canonicalKey: true } });
      for (const r of rows) ids.set(r.canonicalKey, r.id);
    }
  };

  await load();
  const missing = (type: "top" | "rt") =>
    units.filter((u) => !ids.has(u.key) && (type === "rt" ? u.type === "rt" : u.type !== "rt"));

  const top = missing("top");
  if (top.length) {
    const created = await db.wilayahUnit.createMany({
      data: top.map((u) => ({ villageId, type: u.type, name: u.label.slice(0, 100), canonicalKey: u.key })),
      skipDuplicates: true,
    });
    result.unitsCreated += created.count;
    await load();
  }
  const rts = missing("rt");
  if (rts.length) {
    const created = await db.wilayahUnit.createMany({
      data: rts.map((u) => ({
        villageId,
        type: u.type,
        name: u.label.slice(0, 100),
        canonicalKey: u.key,
        parentId: u.parentKey ? (ids.get(u.parentKey) ?? null) : null,
      })),
      skipDuplicates: true,
    });
    result.unitsCreated += created.count;
    await load();
  }
  return ids;
}

const isLeft = (r: ResidentLite) => !r.isAlive || r.moveDate != null;

/**
 * Terapkan rencana untuk `residents` (seluruh desa atau satu kumpulan KK).
 * `scopeKks` (normalisasi) = KK yang boleh dinonaktifkan bila kini tanpa anggota; null = seluruh desa.
 */
async function applyPlans(db: Db, villageId: number, residents: readonly ResidentRow[], scopeKks: ReadonlySet<string> | null): Promise<SyncResult> {
  const result = emptyResult();
  const byId = new Map(residents.map((r) => [r.id, r]));
  const hp = planHouseholdBackfill(residents);
  const wp = planWilayahBackfill(residents);
  const unitId = await ensureUnits(db, villageId, wp.units, result);

  const areaOf = (residentId: number) => {
    const p = wp.placement.get(residentId);
    return { area: p?.areaKey ? (unitId.get(p.areaKey) ?? null) : null, dusun: p?.dusunKey ? (unitId.get(p.dusunKey) ?? null) : null };
  };

  // --- rumah tangga ---
  const planKks = hp.households.map((h) => h.kk);
  const existing = new Map<string, { id: number; headResidentId: number | null; address: string; rt: string | null; rw: string | null; hamlet: string | null; wilayahUnitId: number | null; dusunUnitId: number | null; status: string }>();
  const loadHouseholds = async (where: Prisma.HouseholdWhereInput) => {
    const rows = await db.household.findMany({
      where: { villageId, ...where },
      select: { id: true, kkNumber: true, headResidentId: true, address: true, rt: true, rw: true, hamlet: true, wilayahUnitId: true, dusunUnitId: true, status: true },
    });
    for (const r of rows) existing.set(r.kkNumber, r);
  };
  if (scopeKks === null) await loadHouseholds({});
  else for (const part of chunk([...new Set([...planKks, ...scopeKks])], 500)) await loadHouseholds({ kkNumber: { in: part } });

  const wanted = hp.households.map((h) => {
    const anchor = (h.headId != null ? byId.get(h.headId) : undefined) ?? byId.get(Math.min(...h.memberIds));
    const where = anchor ? areaOf(anchor.id) : { area: null, dusun: null };
    return {
      kk: h.kk,
      memberIds: h.memberIds,
      data: {
        headResidentId: h.headId,
        address: (h.address || "-").slice(0, 500),
        rt: h.rt?.slice(0, 10) ?? null,
        rw: h.rw?.slice(0, 10) ?? null,
        hamlet: h.hamlet?.slice(0, 100) ?? null,
        wilayahUnitId: where.area,
        dusunUnitId: where.dusun,
        status: h.memberIds.some((id) => !isLeft(byId.get(id)!)) ? "ACTIVE" : "INACTIVE",
      },
    };
  });

  const toCreate = wanted.filter((w) => !existing.has(w.kk));
  for (const part of chunk(toCreate, 500)) {
    const created = await db.household.createMany({ data: part.map((w) => ({ villageId, kkNumber: w.kk, ...w.data })), skipDuplicates: true });
    result.householdsCreated += created.count;
  }
  if (toCreate.length) await loadHouseholds({ kkNumber: { in: toCreate.map((w) => w.kk) } });

  for (const w of wanted) {
    const cur = existing.get(w.kk);
    if (!cur) continue;
    const same = (Object.keys(w.data) as Array<keyof typeof w.data>).every((k) => cur[k] === w.data[k]);
    if (!same) {
      await db.household.update({ where: { id: cur.id }, data: w.data });
      if (!toCreate.includes(w)) result.householdsUpdated += 1;
    }
  }

  // KK yang tak lagi punya anggota: nonaktifkan, kosongkan kepala
  const planned = new Set(planKks);
  const orphanIds = [...existing.entries()]
    .filter(([kk, h]) => !planned.has(kk) && (h.status !== "INACTIVE" || h.headResidentId != null))
    .map(([, h]) => h.id);
  for (const part of chunk(orphanIds, 500)) {
    await db.household.updateMany({ where: { villageId, id: { in: part } }, data: { status: "INACTIVE", headResidentId: null } });
  }
  result.householdsDeactivated = orphanIds.length;

  // --- tautan warga → rumah tangga & wilayah (hanya yang berbeda) ---
  const householdIdOf = new Map<number, number>();
  for (const w of wanted) {
    const h = existing.get(w.kk);
    if (h) for (const id of w.memberIds) householdIdOf.set(id, h.id);
  }

  const groups = new Map<string, { ids: number[]; householdId: number | null; wilayahUnitId: number | null; dusunUnitId: number | null }>();
  for (const r of residents) {
    const want = { householdId: householdIdOf.get(r.id) ?? null, ...(() => { const a = areaOf(r.id); return { wilayahUnitId: a.area, dusunUnitId: a.dusun }; })() };
    if (r.householdId === want.householdId && r.wilayahUnitId === want.wilayahUnitId && r.dusunUnitId === want.dusunUnitId) continue;
    const key = `${want.householdId}|${want.wilayahUnitId}|${want.dusunUnitId}`;
    const g = groups.get(key) ?? { ids: [], ...want };
    g.ids.push(r.id);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    for (const part of chunk(g.ids, 1000)) {
      const res = await db.resident.updateMany({
        where: { villageId, id: { in: part } },
        data: { householdId: g.householdId, wilayahUnitId: g.wilayahUnitId, dusunUnitId: g.dusunUnitId },
      });
      result.residentsLinked += res.count;
    }
  }
  return result;
}

/** Rekonsiliasi seluruh desa dari kolom lama. Aman diulang. */
export async function reconcileVillage(db: Db, villageId: number): Promise<SyncResult> {
  const residents = await db.resident.findMany({ where: { villageId }, select: ROW_SELECT });
  return applyPlans(db, villageId, residents, null);
}

/**
 * Sinkronkan beberapa warga dan semua anggota KK yang tersentuh.
 * `extraKks` = KK lama sebelum diubah/dihapus (agar rumah tangga lamanya ikut dihitung ulang).
 */
export async function syncResidents(db: Db, villageId: number, residentIds: readonly number[], extraKks: ReadonlyArray<string | null | undefined> = []): Promise<SyncResult> {
  const own = residentIds.length ? await db.resident.findMany({ where: { villageId, id: { in: [...residentIds] } }, select: ROW_SELECT }) : [];
  const raw = new Set<string>();
  const scope = new Set<string>();
  for (const k of [...own.map((r) => r.kk), ...extraKks]) {
    if (!k) continue;
    raw.add(k);
    raw.add(k.trim());
    const n = normalizeKk(k);
    if (n) {
      raw.add(n);
      scope.add(n);
    }
  }
  const members = raw.size ? await db.resident.findMany({ where: { villageId, kk: { in: [...raw] } }, select: ROW_SELECT }) : [];
  const merged = new Map<number, ResidentRow>();
  for (const r of [...own, ...members]) merged.set(r.id, r);
  // Warga di luar kumpulan ini tak diketahui rencananya: hanya hitung ulang yang dimuat.
  return applyPlans(db, villageId, [...merged.values()], scope);
}

const settingsOf = (v: { settings: unknown } | null): Record<string, unknown> =>
  v?.settings && typeof v.settings === "object" && !Array.isArray(v.settings) ? (v.settings as Record<string, unknown>) : {};

async function writeSettings(villageId: number, mutate: (cur: Record<string, unknown>) => Record<string, unknown> | null): Promise<void> {
  const v = await prisma.village.findUnique({ where: { id: villageId }, select: { settings: true } });
  const next = mutate(settingsOf(v));
  if (next) await prisma.village.update({ where: { id: villageId }, data: { settings: next as Prisma.InputJsonValue } });
}

/** Tandai desa butuh rekonsiliasi (dipakai bila sinkronisasi titik tulis gagal). */
export async function markNeedsReconcile(villageId: number): Promise<void> {
  await writeSettings(villageId, (cur) => ({ ...cur, [SETTINGS_NEEDS_RECONCILE]: new Date().toISOString() }));
}

// Satu rekonsiliasi per desa dalam satu waktu (di dalam proses ini). Aman bila ada dua proses: operasinya idempoten.
const running = new Set<number>();

/**
 * Rekonsiliasi seluruh desa lalu hapus tanda "butuh rekonsiliasi" — hanya bila tandanya tidak berubah selama proses
 * (kegagalan baru di tengah jalan harus tetap tercatat).
 */
export async function reconcileAndClear(villageId: number): Promise<SyncResult> {
  const before = await prisma.village.findUnique({ where: { id: villageId }, select: { settings: true } });
  const marker = settingsOf(before)[SETTINGS_NEEDS_RECONCILE];
  const result = await reconcileVillage(prisma, villageId);
  if (marker !== undefined) {
    await writeSettings(villageId, (cur) => {
      if (cur[SETTINGS_NEEDS_RECONCILE] !== marker) return null;
      const { [SETTINGS_NEEDS_RECONCILE]: _drop, ...rest } = cur;
      void _drop;
      return rest;
    });
  }
  return result;
}

/** Pemulihan mandiri: bila desa bertanda butuh rekonsiliasi, jalankan di latar belakang (tidak menunda respons). */
export function healIfNeeded(village: { id: number; settings: unknown }): void {
  if (!isKependudukanV2(village.settings) || settingsOf(village)[SETTINGS_NEEDS_RECONCILE] === undefined || running.has(village.id)) return;
  running.add(village.id);
  void reconcileAndClear(village.id)
    .catch((e) => console.error(`[kependudukan-sync] pemulihan mandiri gagal (desa ${village.id}):`, e instanceof Error ? e.message : e))
    .finally(() => running.delete(village.id));
}

export interface ActivationSummary {
  households: number;
  units: number;
  withoutHead: number;
  result: SyncResult;
}

/**
 * Aktifkan fitur untuk satu desa dari layar (tanpa skrip): bentuk struktur dari data warga, nyalakan bendera, lalu
 * rekonsiliasi sekali lagi untuk mengejar perubahan yang terjadi di sela-selanya. Aman diulang.
 */
export async function activateVillage(villageId: number): Promise<ActivationSummary> {
  if (running.has(villageId)) throw new Error("Aktivasi untuk desa ini sedang berjalan.");
  running.add(villageId);
  try {
    const result = await reconcileVillage(prisma, villageId);
    await writeSettings(villageId, (cur) => ({ ...cur, [SETTINGS_FLAG]: true }));
    await reconcileAndClear(villageId);
    const [households, units, withoutHead] = await Promise.all([
      prisma.household.count({ where: { villageId, status: "ACTIVE" } }),
      prisma.wilayahUnit.count({ where: { villageId } }),
      prisma.household.count({ where: { villageId, status: "ACTIVE", headResidentId: null } }),
    ]);
    return { households, units, withoutHead, result };
  } finally {
    running.delete(villageId);
  }
}

/**
 * Jalankan sinkronisasi di titik tulis. Bendera mati → tidak melakukan apa pun. Gagal → tidak melempar:
 * penulisan warga yang sudah sukses tidak boleh dibatalkan karena struktur bayangan.
 */
export async function runKependudukanSync(
  village: { id: number; settings: unknown },
  label: string,
  task: (db: Db) => Promise<unknown>,
): Promise<void> {
  if (!isKependudukanV2(village.settings)) return;
  try {
    await task(prisma);
    healIfNeeded(village);
  } catch (e) {
    console.error(`[kependudukan-sync] ${label} gagal (desa ${village.id}):`, e instanceof Error ? e.message : e);
    try {
      await markNeedsReconcile(village.id);
    } catch {
      /* tidak ada yang bisa dilakukan lagi */
    }
  }
}

type LegacySnapshot = { isAlive: boolean; deathDate: Date | null; moveDate: Date | null; kk: string | null; familyRole: string };
type ResidentIdentity = { id: number; name: string; nik: string; rt: string | null; rw: string | null };

/** Catat mutasi dari suntingan langsung atau impor status (status APPLIED) tanpa NIK lengkap. */
export async function recordLegacyMutations(
  db: Db,
  villageId: number,
  userId: number | null,
  resident: ResidentIdentity,
  before: LegacySnapshot,
  after: LegacySnapshot,
  now: Date = new Date(),
  source: "legacy_edit" | "import" = "legacy_edit",
): Promise<number> {
  const found = detectLegacyEditMutations(before, after, now);
  if (found.length === 0) return 0;
  await db.residentMutation.createMany({
    data: found.map((m) => ({
      villageId,
      type: m.type,
      status: "APPLIED",
      source,
      effectiveDate: new Date(`${m.effectiveDate}T00:00:00.000Z`),
      residentId: resident.id,
      residentName: resident.name.slice(0, 255),
      residentNikLast4: resident.nik.slice(-4),
      rt: resident.rt,
      rw: resident.rw,
      householdKk: normalizeKk(m.type === "KK_CHANGE" ? before.kk : after.kk ?? before.kk),
      details: m.details as Prisma.InputJsonValue,
      requestedById: userId,
      decidedById: userId,
      decidedAt: now,
      appliedAt: now,
    })),
  });
  return found.length;
}

/** Cuplikan penuh warga sebelum dihapus permanen. Dipanggil dalam transaksi yang sama dengan `delete`. */
export async function archiveResident(db: Db, villageId: number, resident: { id: number } & Record<string, unknown>, deletedById: number | null, reason?: string): Promise<void> {
  await db.residentArchive.create({
    data: {
      villageId,
      residentId: resident.id,
      snapshot: JSON.parse(JSON.stringify(resident)) as Prisma.InputJsonValue,
      reason: reason?.slice(0, 500) ?? null,
      deletedById,
    },
  });
}

type Comparable = Record<string, unknown>;
const KEP_FIELDS = ["kk", "rt", "rw", "hamlet", "familyRole", "isAlive", "moveDate", "address"] as const;
const sameValue = (a: unknown, b: unknown) => (a instanceof Date || b instanceof Date ? (a as Date | null)?.getTime?.() === (b as Date | null)?.getTime?.() : (a ?? null) === (b ?? null));

/** Apakah suntingan menyentuh kolom yang memengaruhi rumah tangga/wilayah/mutasi. */
export function kependudukanFieldsChanged(before: Comparable, after: Comparable): boolean {
  return KEP_FIELDS.some((k) => !sameValue(before[k], after[k]));
}

/** Sinkronisasi setelah PUT/PATCH warga: mutasi `legacy_edit` + hitung ulang rumah tangga/wilayah. */
export async function syncAfterResidentUpdate(
  village: { id: number; settings: unknown },
  userId: number | null,
  before: LegacySnapshot & ResidentIdentity & Comparable,
  after: LegacySnapshot & ResidentIdentity & Comparable,
): Promise<void> {
  if (!kependudukanFieldsChanged(before, after)) return;
  await runKependudukanSync(village, "update", async (db) => {
    await recordLegacyMutations(db, village.id, userId, after, before, after);
    await syncResidents(db, village.id, [after.id], [before.kk]);
  });
}
