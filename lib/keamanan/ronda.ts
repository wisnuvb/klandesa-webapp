/**
 * Servis ronda/siskamling: regu per RT/RW, peserta, jadwal rotasi, kehadiran, tukar giliran, dan buku catatan ronda.
 *
 * Kunci: semua perubahan jadwal/kehadiran/tukar pada satu regu memegang kunci baris regu (SELECT … FOR UPDATE sebagai pernyataan
 * pertama transaksi), sehingga dua persetujuan tukar serentak, kehadiran vs tukar, atau dua pembuatan jadwal tidak saling menimpa.
 * Kehadiran dicatat di web oleh petugas desa (rute mengecek izin). Infrastruktur presensi perangkat desa (QR/GPS) tidak dipakai:
 * terikat ke `Official` dan `WorkShift`, bukan warga peserta ronda.
 */
import { fail, invalid, type Result } from "@/lib/form-input";
import { LIMITS, ATTENDANCE, RONDA_LOG_KINDS, SHIFT_SOURCES, SWAP_STATUSES, type Attendance } from "./catalog";
import { addDays, dateRange, daysBetween, generateRotation, groupFindings, planSwap, timeJakarta, type Finding, type ShiftFact } from "./calc";
import { P2002, asResult, day, iso, lockGroup, lockVillage, ok, residentsById, stop, type Client, type Db } from "./base";
import { parseGenerate, parseGroup, parseGroupPerson, parseMark, parseRondaLog, parseShift, parseSwapCreate, parseSwapDecision, rangeOf } from "./schema";

const date = (s: string) => new Date(`${s}T00:00:00.000Z`);
const WINDOW = 90;

// ---------------------------------------------------------------------------------------------------------------------
// Regu dan peserta
// ---------------------------------------------------------------------------------------------------------------------
export interface GroupView {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  postName: string | null;
  startTime: string;
  endTime: string;
  perShift: number;
  active: boolean;
  note: string | null;
  people: { id: number; residentId: number; name: string; active: boolean; joinedOn: string | null }[];
  activePeople: number;
  findings: Finding[];
}

export async function listGroups(db: Client, args: { villageId: number; today: string }): Promise<GroupView[]> {
  const groups = await db.securityRondaGroup.findMany({ where: { villageId: args.villageId }, orderBy: [{ active: "desc" }, { name: "asc" }], take: LIMITS.groups, include: { people: { orderBy: { id: "asc" }, take: LIMITS.peoplePerGroup } } });
  const names = await residentsById(db, args.villageId, groups.flatMap((g) => g.people.map((p) => p.residentId)));
  const from = date(args.today);
  const to = date(addDays(args.today, 6));
  const back = date(addDays(args.today, -30));
  const [ahead, absent] = await Promise.all([
    db.securityRondaShift.groupBy({ by: ["groupId", "shiftDate"], where: { villageId: args.villageId, shiftDate: { gte: from, lte: to } }, _count: { _all: true } }),
    db.securityRondaShift.groupBy({ by: ["groupId"], where: { villageId: args.villageId, shiftDate: { gte: back, lt: from }, attendance: "ABSENT" }, _count: { _all: true } }),
  ]);
  const aheadDates = Array.from({ length: 7 }, (_, i) => addDays(args.today, i));
  return groups.map((g) => {
    const rows = ahead.filter((a) => a.groupId === g.id);
    const filled = new Map(rows.map((r) => [day(r.shiftDate)!, r._count._all]));
    const activePeople = g.people.filter((p) => p.active).length;
    return {
      id: g.id,
      name: g.name,
      rt: g.rt,
      rw: g.rw,
      hamlet: g.hamlet,
      postName: g.postName,
      startTime: g.startTime,
      endTime: g.endTime,
      perShift: g.perShift,
      active: g.active,
      note: g.note,
      people: g.people.map((p) => ({ id: p.id, residentId: p.residentId, name: names.get(p.residentId)?.name ?? "(data warga tidak ditemukan)", active: p.active, joinedOn: day(p.joinedOn) })),
      activePeople,
      findings: groupFindings({
        name: g.name,
        active: g.active,
        perShift: g.perShift,
        activePeople,
        underStaffedNights: rows.length === 0 ? 0 : aheadDates.filter((d) => (filled.get(d) ?? 0) < g.perShift).length,
        scheduledAhead: rows.length,
        absentLast30: absent.find((a) => a.groupId === g.id)?._count._all ?? 0,
      }),
    };
  });
}

export async function createGroup(db: Client, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; name: string }>> {
  const p = parseGroup(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.securityRondaGroup.count({ where: { villageId: args.villageId } })) >= LIMITS.groups) return stop(`Jumlah regu maksimal ${LIMITS.groups}.`);
      try {
        const row = await tx.securityRondaGroup.create({ data: { ...v, villageId: args.villageId, createdById: args.userId } as never, select: { id: true } });
        return ok({ id: row.id, name: v.name! });
      } catch (e) {
        if (P2002(e)) return stop("Sudah ada regu dengan nama itu.");
        throw e;
      }
    })
    .catch(asResult);
}

export async function patchGroup(db: Client, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ keys: string[] }>> {
  const p = parseGroup(args.input, "patch");
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.id);
      try {
        await tx.securityRondaGroup.update({ where: { id: args.id }, data: p.value as never });
      } catch (e) {
        if (P2002(e)) return stop("Sudah ada regu dengan nama itu.");
        throw e;
      }
      return ok({ keys: Object.keys(p.value) });
    })
    .catch(asResult);
}

/** Menghapus regu hanya bila belum punya jadwal/catatan (riwayat kehadiran tidak boleh hilang): selebihnya nonaktifkan. */
export async function removeGroup(db: Client, args: { villageId: number; id: number }): Promise<Result<{ name: string }>> {
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.id);
      const g = await tx.securityRondaGroup.findFirstOrThrow({ where: { id: args.id }, select: { name: true } });
      const [shifts, logs] = await Promise.all([tx.securityRondaShift.count({ where: { groupId: args.id } }), tx.securityRondaLog.count({ where: { groupId: args.id } })]);
      if (shifts + logs > 0) return stop("Regu ini sudah punya jadwal atau catatan ronda, jadi tidak dapat dihapus. Nonaktifkan saja agar riwayat tetap tersimpan.");
      await tx.securityRondaGroup.delete({ where: { id: args.id } });
      return ok({ name: g.name });
    })
    .catch(asResult);
}

export async function addPerson(db: Client, args: { villageId: number; groupId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; residentId: number }>> {
  const p = parseGroupPerson(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.groupId);
      const person = await tx.resident.findFirst({ where: { id: v.residentId!, villageId: args.villageId }, select: { id: true } });
      if (!person) return stop("Warga tidak ditemukan di desa ini.", 404);
      if ((await tx.securityRondaPerson.count({ where: { groupId: args.groupId } })) >= LIMITS.peoplePerGroup) return stop(`Peserta per regu maksimal ${LIMITS.peoplePerGroup}.`);
      try {
        const row = await tx.securityRondaPerson.create({ data: { villageId: args.villageId, groupId: args.groupId, residentId: v.residentId!, active: v.active ?? true, joinedOn: v.joinedOn ?? null, createdById: args.userId }, select: { id: true } });
        return ok({ id: row.id, residentId: v.residentId! });
      } catch (e) {
        if (P2002(e)) return stop("Warga ini sudah menjadi peserta regu ini.");
        throw e;
      }
    })
    .catch(asResult);
}

export async function patchPerson(db: Client, args: { villageId: number; groupId: number; id: number; input: unknown; today: string }): Promise<Result<{ residentId: number; futureShifts: number }>> {
  const p = parseGroupPerson(args.input, "patch");
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.groupId);
      const cur = await tx.securityRondaPerson.findFirst({ where: { id: args.id, groupId: args.groupId, villageId: args.villageId } });
      if (!cur) return stop("Peserta tidak ditemukan.", 404);
      await tx.securityRondaPerson.update({ where: { id: cur.id }, data: p.value as never });
      const futureShifts = p.value.active === false ? await tx.securityRondaShift.count({ where: { groupId: args.groupId, residentId: cur.residentId, shiftDate: { gte: date(args.today) } } }) : 0;
      return ok({ residentId: cur.residentId, futureShifts });
    })
    .catch(asResult);
}

export async function removePerson(db: Client, args: { villageId: number; groupId: number; id: number }): Promise<Result<{ residentId: number }>> {
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.groupId);
      const cur = await tx.securityRondaPerson.findFirst({ where: { id: args.id, groupId: args.groupId, villageId: args.villageId } });
      if (!cur) return stop("Peserta tidak ditemukan.", 404);
      if ((await tx.securityRondaShift.count({ where: { groupId: args.groupId, residentId: cur.residentId } })) > 0) return stop("Peserta ini punya riwayat atau jadwal giliran, jadi tidak dapat dihapus. Nonaktifkan saja.");
      await tx.securityRondaPerson.delete({ where: { id: cur.id } });
      return ok({ residentId: cur.residentId });
    })
    .catch(asResult);
}

// ---------------------------------------------------------------------------------------------------------------------
// Jadwal
// ---------------------------------------------------------------------------------------------------------------------
export interface ShiftView {
  id: number;
  date: string;
  residentId: number;
  name: string;
  attendance: Attendance;
  attendanceLabel: string;
  attendanceNote: string | null;
  source: string;
  sourceLabel: string;
  replacedName: string | null;
  pendingSwap: boolean;
}
export interface ScheduleNight {
  date: string;
  shifts: ShiftView[];
  short: number;
}

export async function getSchedule(db: Client, args: { villageId: number; groupId: number; from: string; to: string }): Promise<Result<{ group: { id: number; name: string; perShift: number }; nights: ScheduleNight[] }>> {
  // Periksa panjang rentang SEBELUM membangun larik tanggal (rentang ekstrem "0000-01-01".."9999-12-31" = jutaan elemen).
  const span = daysBetween(args.from, args.to) + 1;
  if (!(span >= 1 && span <= LIMITS.scheduleDays)) return fail(400, `Rentang jadwal harus 1 sampai ${LIMITS.scheduleDays} malam.`);
  const dates = dateRange(args.from, args.to);
  const group = await db.securityRondaGroup.findFirst({ where: { id: args.groupId, villageId: args.villageId }, select: { id: true, name: true, perShift: true } });
  if (!group) return fail(404, "Regu ronda tidak ditemukan.");
  const shifts = await db.securityRondaShift.findMany({ where: { villageId: args.villageId, groupId: args.groupId, shiftDate: { gte: date(args.from), lte: date(args.to) } }, orderBy: [{ shiftDate: "asc" }, { id: "asc" }], take: 5000 });
  const pending = await db.securityRondaSwap.findMany({ where: { villageId: args.villageId, groupId: args.groupId, status: "PENDING", shiftId: { in: shifts.map((s) => s.id) } }, select: { shiftId: true } });
  const pendingIds = new Set(pending.map((p) => p.shiftId));
  const names = await residentsById(db, args.villageId, shifts.flatMap((s) => [s.residentId, ...(s.replacedResidentId ? [s.replacedResidentId] : [])]));
  const by = new Map<string, ShiftView[]>();
  for (const s of shifts) {
    const k = day(s.shiftDate)!;
    const list = by.get(k) ?? [];
    list.push({
      id: s.id,
      date: k,
      residentId: s.residentId,
      name: names.get(s.residentId)?.name ?? "(data warga tidak ditemukan)",
      attendance: s.attendance as Attendance,
      attendanceLabel: ATTENDANCE[s.attendance as Attendance] ?? s.attendance,
      attendanceNote: s.attendanceNote,
      source: s.source,
      sourceLabel: SHIFT_SOURCES[s.source as keyof typeof SHIFT_SOURCES] ?? s.source,
      replacedName: s.replacedResidentId ? (names.get(s.replacedResidentId)?.name ?? "(tidak ditemukan)") : null,
      pendingSwap: pendingIds.has(s.id),
    });
    by.set(k, list);
  }
  return ok({ group, nights: dates.map((d) => ({ date: d, shifts: by.get(d) ?? [], short: Math.max(0, group.perShift - (by.get(d)?.length ?? 0)) })) });
}

export interface GenerateResult {
  applied: boolean;
  created: number;
  from: string;
  to: string;
  perShift: number;
  nights: { date: string; people: { residentId: number; name: string }[]; short: number }[];
  perPerson: { residentId: number; name: string; newShifts: number; total: number }[];
  spread: number;
  consecutive: number;
  skippedDates: string[];
  warnings: string[];
}

/**
 * Membuat jadwal rotasi adil untuk satu regu (lihat calc.generateRotation). `apply=false` hanya pratinjau (tanpa menulis).
 * Malam yang sudah punya giliran dilewati (tidak ditimpa). Riwayat 90 hari sebelum periode dan giliran yang sudah ada ikut dihitung
 * agar yang sudah sering jaga mendapat giliran lebih sedikit.
 */
export async function generateSchedule(db: Client, args: { villageId: number; userId: number | null; groupId: number; input: unknown; apply: boolean; today: string }): Promise<Result<GenerateResult>> {
  const p = parseGenerate(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  if (v.from < args.today) return fail(400, "Jadwal hanya dapat dibuat mulai hari ini atau sesudahnya.");

  const compute = async (tx: Db | Client): Promise<Result<GenerateResult> | { plan: { rotation: ReturnType<typeof generateRotation>; skipped: string[]; names: Awaited<ReturnType<typeof residentsById>>; perShift: number } }> => {
    const group = await tx.securityRondaGroup.findFirst({ where: { id: args.groupId, villageId: args.villageId }, select: { perShift: true, active: true } });
    if (!group) return fail(404, "Regu ronda tidak ditemukan.");
    if (!group.active) return fail(409, "Regu ini nonaktif. Aktifkan lebih dulu untuk membuat jadwal.");
    const people = await tx.securityRondaPerson.findMany({ where: { groupId: args.groupId, villageId: args.villageId, active: true }, select: { residentId: true } });
    const exclude = new Set(v.excludeResidentIds);
    const pool = people.map((x) => x.residentId).filter((id) => !exclude.has(id));
    if (!pool.length) return fail(409, "Belum ada peserta aktif untuk dijadwalkan.");
    const histFrom = date(addDays(v.from, -WINDOW));
    const hist = await tx.securityRondaShift.findMany({ where: { groupId: args.groupId, villageId: args.villageId, shiftDate: { gte: histFrom, lte: date(v.to) } }, select: { shiftDate: true, residentId: true } });
    const prior = new Map<number, { n: number; last: string | null }>();
    for (const h of hist) {
      const d = day(h.shiftDate)!;
      const cur = prior.get(h.residentId) ?? { n: 0, last: null };
      cur.n++;
      if (d < v.from && (cur.last === null || d > cur.last)) cur.last = d;
      prior.set(h.residentId, cur);
    }
    const existing = new Set(hist.map((h) => day(h.shiftDate)!));
    const all = rangeOf(v);
    const skipped = all.filter((d) => existing.has(d));
    const open = all.filter((d) => !existing.has(d));
    const unavailable = new Map<number, string[]>();
    for (const u of v.unavailable) unavailable.set(u.residentId, [...(unavailable.get(u.residentId) ?? []), u.date]);
    const rotation = generateRotation({ people: pool.map((id) => ({ id, priorCount: prior.get(id)?.n ?? 0, priorLast: prior.get(id)?.last ?? null, unavailable: unavailable.get(id) ?? [] })), dates: open, perShift: group.perShift });
    const names = await residentsById(tx, args.villageId, pool);
    return { plan: { rotation, skipped, names, perShift: group.perShift } };
  };

  const finish = (plan: { rotation: ReturnType<typeof generateRotation>; skipped: string[]; names: Awaited<ReturnType<typeof residentsById>>; perShift: number }, applied: boolean, created: number): GenerateResult => {
    const nm = (id: number) => plan.names.get(id)?.name ?? `Warga ${id}`;
    return {
      applied,
      created,
      from: v.from,
      to: v.to,
      perShift: plan.perShift,
      nights: plan.rotation.nights.map((n) => ({ date: n.date, people: n.residentIds.map((id) => ({ residentId: id, name: nm(id) })), short: n.short })),
      perPerson: Object.keys(plan.rotation.totals)
        .map(Number)
        .map((id) => ({ residentId: id, name: nm(id), newShifts: plan.rotation.counts[id] ?? 0, total: plan.rotation.totals[id] ?? 0 }))
        .sort((a, b) => b.newShifts - a.newShifts || a.name.localeCompare(b.name, "id")),
      spread: plan.rotation.spread,
      consecutive: plan.rotation.consecutive,
      skippedDates: plan.skipped,
      warnings: [...(plan.skipped.length ? [`${plan.skipped.length} malam dilewati karena sudah punya jadwal.`] : []), ...plan.rotation.warnings],
    };
  };

  if (!args.apply) {
    const c = await compute(db);
    return "plan" in c ? ok(finish(c.plan, false, 0)) : c;
  }
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.groupId);
      const c = await compute(tx);
      if (!("plan" in c)) return c.ok ? c : stop(c.errors[0] ?? "Gagal", c.status);
      const rows = c.plan.rotation.nights.flatMap((n) => n.residentIds.map((id) => ({ villageId: args.villageId, groupId: args.groupId, shiftDate: date(n.date), residentId: id, source: "GENERATED", createdById: args.userId })));
      if ((await tx.securityRondaShift.count({ where: { groupId: args.groupId } })) + rows.length > LIMITS.shiftsPerGroup) return stop(`Jumlah giliran per regu maksimal ${LIMITS.shiftsPerGroup}.`);
      const r = rows.length ? await tx.securityRondaShift.createMany({ data: rows, skipDuplicates: true }) : { count: 0 };
      return ok(finish(c.plan, true, r.count));
    })
    .catch(asResult);
}

export async function addShift(db: Client, args: { villageId: number; groupId: number; userId: number | null; input: unknown; today: string }): Promise<Result<{ id: number; date: string; residentId: number }>> {
  const p = parseShift(args.input);
  if (!p.ok) return invalid(p);
  const d = day(p.value.shiftDate)!;
  if (d < args.today) return fail(400, "Giliran hanya dapat ditambahkan untuk malam hari ini atau yang akan datang.");
  return db
    .$transaction(async (tx) => {
      const g = await lockGroup(tx, args.villageId, args.groupId);
      const person = await tx.securityRondaPerson.findFirst({ where: { groupId: args.groupId, residentId: p.value.residentId, active: true } });
      if (!person) return stop("Petugas bukan peserta aktif regu ini.", 400);
      if ((await tx.securityRondaShift.count({ where: { groupId: args.groupId, shiftDate: p.value.shiftDate } })) >= g.perShift) return stop(`Malam itu sudah terisi ${g.perShift} petugas (sesuai pengaturan regu).`);
      if ((await tx.securityRondaShift.count({ where: { groupId: args.groupId } })) >= LIMITS.shiftsPerGroup) return stop(`Jumlah giliran per regu maksimal ${LIMITS.shiftsPerGroup}.`);
      try {
        const row = await tx.securityRondaShift.create({ data: { villageId: args.villageId, groupId: args.groupId, shiftDate: p.value.shiftDate, residentId: p.value.residentId, source: "MANUAL", createdById: args.userId }, select: { id: true } });
        return ok({ id: row.id, date: d, residentId: p.value.residentId });
      } catch (e) {
        if (P2002(e)) return stop("Petugas ini sudah bertugas pada malam itu.");
        throw e;
      }
    })
    .catch(asResult);
}

export async function removeShift(db: Client, args: { villageId: number; id: number; today: string }): Promise<Result<{ groupId: number; date: string; residentId: number }>> {
  const pre = await db.securityRondaShift.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { groupId: true } });
  if (!pre) return fail(404, "Giliran tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, pre.groupId);
      const s = await tx.securityRondaShift.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!s) return stop("Giliran tidak ditemukan.", 404);
      if (day(s.shiftDate)! < args.today) return stop("Giliran yang sudah lewat tidak dapat dihapus (riwayat).");
      if (s.attendance !== "PENDING") return stop("Kehadiran giliran ini sudah dicatat, jadi tidak dapat dihapus.");
      await tx.securityRondaShift.delete({ where: { id: s.id } });
      return ok({ groupId: s.groupId, date: day(s.shiftDate)!, residentId: s.residentId });
    })
    .catch(asResult);
}

/**
 * Mencatat kehadiran. Hanya untuk malam hari ini atau sebelumnya, dan untuk malam ini baru setelah jam mulai jaga regu (waktu Asia/Jakarta):
 * keputusan kebijakan agar kehadiran tidak diisi sebelum giliran dimulai. PENDING = mengosongkan catatan (selalu boleh). Mengembalikan nilai lama untuk audit.
 */
export async function markAttendance(db: Client, args: { villageId: number; id: number; userId: number | null; input: unknown; today: string; now?: Date }): Promise<Result<{ groupId: number; date: string; attendance: Attendance; previous: Attendance }>> {
  const p = parseMark(args.input);
  if (!p.ok) return invalid(p);
  const pre = await db.securityRondaShift.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { groupId: true } });
  if (!pre) return fail(404, "Giliran tidak ditemukan.");
  const now = args.now ?? new Date();
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, pre.groupId);
      const s = await tx.securityRondaShift.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!s) return stop("Giliran tidak ditemukan.", 404);
      const d = day(s.shiftDate)!;
      const pending = p.value.attendance === "PENDING";
      if (d > args.today) return stop("Kehadiran belum dapat dicatat untuk malam yang belum tiba.");
      if (!pending && d === args.today) {
        const g = await tx.securityRondaGroup.findFirstOrThrow({ where: { id: s.groupId }, select: { startTime: true } });
        if (timeJakarta(now) < g.startTime) return stop(`Giliran malam ini baru dimulai pukul ${g.startTime}. Kehadiran dapat dicatat setelah itu.`);
      }
      await tx.securityRondaShift.update({ where: { id: s.id }, data: { attendance: p.value.attendance, attendanceNote: pending ? null : p.value.attendanceNote, markedAt: pending ? null : now, markedById: pending ? null : args.userId } });
      return ok({ groupId: s.groupId, date: d, attendance: p.value.attendance, previous: s.attendance as Attendance });
    })
    .catch(asResult);
}

// ---------------------------------------------------------------------------------------------------------------------
// Tukar / ganti giliran
// ---------------------------------------------------------------------------------------------------------------------
export interface SwapView {
  id: number;
  groupId: number;
  groupName: string;
  status: string;
  statusLabel: string;
  shiftId: number;
  date: string;
  requester: { residentId: number; name: string };
  counterpart: { residentId: number; name: string };
  counterpartShift: { id: number; date: string } | null;
  counterpartAgreed: boolean;
  reason: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

export async function listSwaps(db: Client, args: { villageId: number; groupId?: number | null; status?: string | null }): Promise<SwapView[]> {
  const rows = await db.securityRondaSwap.findMany({
    where: { villageId: args.villageId, ...(args.groupId ? { groupId: args.groupId } : {}), ...(args.status && args.status in SWAP_STATUSES ? { status: args.status } : {}) },
    orderBy: [{ status: "desc" }, { id: "desc" }],
    take: 100,
    include: { shift: true, group: { select: { name: true } } },
  });
  const cpShiftIds = rows.map((r) => r.counterpartShiftId).filter((x): x is number => x !== null);
  const cpShifts = cpShiftIds.length ? await db.securityRondaShift.findMany({ where: { id: { in: cpShiftIds }, villageId: args.villageId }, select: { id: true, shiftDate: true } }) : [];
  const names = await residentsById(db, args.villageId, rows.flatMap((r) => [r.shift.residentId, r.counterpartResidentId]));
  const nm = (id: number) => names.get(id)?.name ?? "(data warga tidak ditemukan)";
  return rows.map((r) => ({
    id: r.id,
    groupId: r.groupId,
    groupName: r.group.name,
    status: r.status,
    statusLabel: SWAP_STATUSES[r.status as keyof typeof SWAP_STATUSES] ?? r.status,
    shiftId: r.shiftId,
    date: day(r.shift.shiftDate)!,
    requester: { residentId: r.shift.residentId, name: nm(r.shift.residentId) },
    counterpart: { residentId: r.counterpartResidentId, name: nm(r.counterpartResidentId) },
    counterpartShift: r.counterpartShiftId !== null ? { id: r.counterpartShiftId, date: day(cpShifts.find((c) => c.id === r.counterpartShiftId)?.shiftDate) ?? "-" } : null,
    counterpartAgreed: r.counterpartAgreed,
    reason: r.reason,
    decidedAt: iso(r.decidedAt),
    decisionNote: r.decisionNote,
    createdAt: r.createdAt.toISOString(),
  }));
}

const fact = (s: { id: number; groupId: number; shiftDate: Date; residentId: number; attendance: string }): ShiftFact => ({ id: s.id, groupId: s.groupId, date: day(s.shiftDate)!, residentId: s.residentId, attendance: s.attendance });

async function assignedOn(tx: Db, groupId: number, dates: string[]): Promise<Record<string, number[]>> {
  const rows = await tx.securityRondaShift.findMany({ where: { groupId, shiftDate: { in: dates.map(date) } }, select: { shiftDate: true, residentId: true } });
  const out: Record<string, number[]> = {};
  for (const r of rows) (out[day(r.shiftDate)!] ??= []).push(r.residentId);
  return out;
}

export async function createSwap(db: Client, args: { villageId: number; userId: number | null; input: unknown; today: string }): Promise<Result<{ id: number; groupId: number; shiftId: number }>> {
  const p = parseSwapCreate(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const pre = await db.securityRondaShift.findFirst({ where: { id: v.shiftId, villageId: args.villageId }, select: { groupId: true } });
  if (!pre) return fail(404, "Giliran pemohon tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, pre.groupId);
      const r = await tx.securityRondaShift.findFirst({ where: { id: v.shiftId, villageId: args.villageId } });
      if (!r) return stop("Giliran pemohon tidak ditemukan.", 404);
      if ((await tx.securityRondaSwap.count({ where: { shiftId: r.id, status: "PENDING" } })) > 0) return stop("Giliran ini sudah punya permintaan tukar yang menunggu keputusan.");
      if ((await tx.securityRondaSwap.count({ where: { groupId: r.groupId, status: "PENDING" } })) >= 200) return stop("Terlalu banyak permintaan tukar yang menunggu keputusan pada regu ini.");
      const cpPerson = await tx.securityRondaPerson.findFirst({ where: { groupId: r.groupId, residentId: v.counterpartResidentId, active: true } });
      let cp: ShiftFact | null = null;
      if (v.counterpartShiftId !== null) {
        const c = await tx.securityRondaShift.findFirst({ where: { id: v.counterpartShiftId, villageId: args.villageId, groupId: r.groupId } });
        if (!c) return stop("Giliran pihak kedua tidak ditemukan di regu ini.", 404);
        cp = fact(c);
      }
      // Uji sejak awal dengan "pihak kedua setuju" dianggap benar; keputusan nanti memeriksa ulang dengan keadaan saat itu.
      const dates = [day(r.shiftDate)!, ...(cp ? [cp.date] : [])];
      const plan = planSwap({ today: args.today, groupId: r.groupId, requesterShift: fact(r), counterpartResidentId: v.counterpartResidentId, counterpartShift: cp, counterpartAgreed: true, counterpartActive: Boolean(cpPerson), assigned: await assignedOn(tx, r.groupId, dates) });
      if (!plan.ok) return stop(plan.error);
      const row = await tx.securityRondaSwap.create({ data: { villageId: args.villageId, groupId: r.groupId, shiftId: r.id, requesterResidentId: r.residentId, counterpartResidentId: v.counterpartResidentId, counterpartShiftId: v.counterpartShiftId, counterpartAgreed: v.counterpartAgreed, reason: v.reason, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id, groupId: r.groupId, shiftId: r.id });
    })
    .catch(asResult);
}

/** Memutuskan permintaan tukar: APPROVE menjalankan perpindahan dalam kunci regu; REJECT/CANCEL butuh alasan. */
export async function decideSwap(db: Client, args: { villageId: number; id: number; userId: number | null; input: unknown; today: string; now?: Date }): Promise<Result<{ groupId: number; decision: string; moved: number }>> {
  const p = parseSwapDecision(args.input);
  if (!p.ok) return invalid(p);
  const pre = await db.securityRondaSwap.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { groupId: true } });
  if (!pre) return fail(404, "Permintaan tukar tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, pre.groupId);
      const sw = await tx.securityRondaSwap.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!sw) return stop("Permintaan tukar tidak ditemukan.", 404);
      if (sw.status !== "PENDING") return stop(`Permintaan ini sudah berstatus "${SWAP_STATUSES[sw.status as keyof typeof SWAP_STATUSES] ?? sw.status}".`);
      const now = args.now ?? new Date();
      const close = (status: string) => tx.securityRondaSwap.update({ where: { id: sw.id }, data: { status, decidedAt: now, decidedById: args.userId, decisionNote: p.value.note } });
      if (p.value.decision !== "APPROVE") {
        await close(p.value.decision === "REJECT" ? "REJECTED" : "CANCELLED");
        return ok({ groupId: sw.groupId, decision: p.value.decision, moved: 0 });
      }
      const r = await tx.securityRondaShift.findFirst({ where: { id: sw.shiftId, villageId: args.villageId } });
      if (!r) return stop("Giliran pemohon sudah tidak ada. Tolak permintaan ini.");
      // Permintaan basi: giliran sudah berpindah tangan sejak diajukan (mis. lewat tukar lain). Diperiksa di dalam kunci regu.
      if (r.residentId !== sw.requesterResidentId) return stop("Giliran pemohon sudah dipegang orang lain sejak permintaan ini diajukan (kemungkinan sudah ditukar). Tolak permintaan ini dan ajukan yang baru.");
      const cpRow = sw.counterpartShiftId !== null ? await tx.securityRondaShift.findFirst({ where: { id: sw.counterpartShiftId, villageId: args.villageId } }) : null;
      if (sw.counterpartShiftId !== null && !cpRow) return stop("Giliran pihak kedua sudah tidak ada. Tolak permintaan ini.");
      if (cpRow && cpRow.residentId !== sw.counterpartResidentId) return stop("Giliran pihak kedua sudah dipegang orang lain sejak permintaan ini diajukan. Tolak permintaan ini dan ajukan yang baru.");
      const cpPerson = await tx.securityRondaPerson.findFirst({ where: { groupId: sw.groupId, residentId: sw.counterpartResidentId, active: true } });
      const dates = [day(r.shiftDate)!, ...(cpRow ? [day(cpRow.shiftDate)!] : [])];
      const plan = planSwap({ today: args.today, groupId: sw.groupId, requesterShift: fact(r), counterpartResidentId: sw.counterpartResidentId, counterpartShift: cpRow ? fact(cpRow) : null, counterpartAgreed: sw.counterpartAgreed, counterpartActive: Boolean(cpPerson), assigned: await assignedOn(tx, sw.groupId, dates) });
      if (!plan.ok) return stop(plan.error);
      for (const m of plan.moves) await tx.securityRondaShift.update({ where: { id: m.shiftId }, data: { residentId: m.toResidentId, replacedResidentId: m.fromResidentId, source: "SWAP", attendance: "PENDING", attendanceNote: null, markedAt: null, markedById: null } });
      await close("APPROVED");
      return ok({ groupId: sw.groupId, decision: "APPROVE", moved: plan.moves.length });
    })
    .catch(asResult);
}

// ---------------------------------------------------------------------------------------------------------------------
// Buku catatan ronda
// ---------------------------------------------------------------------------------------------------------------------
export interface RondaLogView {
  id: number;
  groupId: number;
  groupName: string;
  shiftDate: string;
  loggedAt: string;
  kind: string;
  kindLabel: string;
  description: string;
  reporter: string | null;
  eventId: number | null;
}

export async function listRondaLogs(db: Client, args: { villageId: number; groupId?: number | null; page: number }): Promise<{ rows: RondaLogView[]; total: number; page: number; pageSize: number }> {
  const where = { villageId: args.villageId, ...(args.groupId ? { groupId: args.groupId } : {}) };
  const pageSize = 20;
  const [total, rows] = await Promise.all([db.securityRondaLog.count({ where }), db.securityRondaLog.findMany({ where, orderBy: [{ loggedAt: "desc" }, { id: "desc" }], skip: (args.page - 1) * pageSize, take: pageSize, include: { group: { select: { name: true } } } })]);
  return {
    rows: rows.map((r) => ({ id: r.id, groupId: r.groupId, groupName: r.group.name, shiftDate: day(r.shiftDate)!, loggedAt: r.loggedAt.toISOString(), kind: r.kind, kindLabel: RONDA_LOG_KINDS[r.kind as keyof typeof RONDA_LOG_KINDS] ?? r.kind, description: r.description, reporter: r.reporter, eventId: r.eventId })),
    total,
    page: args.page,
    pageSize,
  };
}

export async function createRondaLog(db: Client, args: { villageId: number; groupId: number; userId: number | null; input: unknown; today: string }): Promise<Result<{ id: number; kind: string }>> {
  const p = parseRondaLog(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const d = day(v.shiftDate)!;
  if (d > addDays(args.today, 1)) return fail(400, "Malam ronda tidak boleh di masa depan.");
  if (d < addDays(args.today, -400)) return fail(400, "Malam ronda terlalu lama.");
  return db
    .$transaction(async (tx) => {
      await lockGroup(tx, args.villageId, args.groupId);
      if ((await tx.securityRondaLog.count({ where: { groupId: args.groupId } })) >= LIMITS.logsPerGroup) return stop(`Catatan per regu maksimal ${LIMITS.logsPerGroup}.`);
      const row = await tx.securityRondaLog.create({ data: { villageId: args.villageId, groupId: args.groupId, shiftDate: v.shiftDate, loggedAt: v.loggedAt, kind: v.kind, description: v.description, reporter: v.reporter, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id, kind: v.kind });
    })
    .catch(asResult);
}

export async function removeRondaLog(db: Client, args: { villageId: number; id: number }): Promise<Result<{ kind: string }>> {
  const cur = await db.securityRondaLog.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { kind: true, eventId: true } });
  if (!cur) return fail(404, "Catatan tidak ditemukan.");
  if (cur.eventId !== null) return fail(409, "Catatan ini sudah dieskalasi menjadi kejadian, jadi tidak dapat dihapus.");
  const r = await db.securityRondaLog.deleteMany({ where: { id: args.id, villageId: args.villageId, eventId: null } });
  return r.count ? ok({ kind: cur.kind }) : fail(409, "Catatan ini sudah dieskalasi menjadi kejadian, jadi tidak dapat dihapus.");
}
