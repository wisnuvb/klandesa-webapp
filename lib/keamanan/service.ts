/**
 * Servis inti Keamanan: Satlinmas, perlengkapan, kerawanan, kontak, dan ringkasan. Ronda ada di ronda.ts; kejadian dan mediasi di kejadian.ts.
 * Aturan umum: `villageId` selalu dari sesi; servis tidak memeriksa izin (rute yang memeriksa); kunci baris sebagai pernyataan PERTAMA
 * transaksi interaktif (MySQL REPEATABLE READ); nama warga dibaca dari `residents` tanpa NIK.
 */
import { fail, invalid, type Result } from "@/lib/form-input";
import { domainSummary } from "@/lib/incident/service";
import {
  CONDITIONS,
  CONTACT_KINDS,
  END_REASONS,
  EQUIPMENT_CATEGORIES,
  LIMITS,
  MEMBER_ROLES,
  RISK_KINDS,
  RISK_LEVELS,
  SQUAD_KINDS,
  type ContactKind,
  type MemberRole,
  type SquadKind,
} from "./catalog";
import { addDays, ageOn, groupFindings, memberFindings, type Finding } from "./calc";
import { P2002, asResult, day, lockVillage, ok, residentsById, stop, type Client, type Db } from "./base";
import { parseContact, parseEquipment, parseMember, parseMemberEnd, parseRisk } from "./schema";

// ---------------------------------------------------------------------------------------------------------------------
// Anggota Satlinmas
// ---------------------------------------------------------------------------------------------------------------------
export interface MemberView {
  id: number;
  residentId: number;
  name: string;
  rt: string | null;
  rw: string | null;
  role: MemberRole;
  roleLabel: string;
  squadKind: SquadKind | null;
  squadKindLabel: string | null;
  squadName: string | null;
  status: "ACTIVE" | "ENDED";
  decreeNumber: string | null;
  decreeDate: string | null;
  inauguratedOn: string | null;
  cardNumber: string | null;
  joinedOn: string | null;
  extensionDecree: string | null;
  endedOn: string | null;
  endReason: string | null;
  endReasonLabel: string | null;
  endDecree: string | null;
  note: string | null;
  age: number | null;
  /** Hanya untuk izin baca rinci */
  phone: string | null;
  findings: Finding[];
}

export interface SquadView {
  key: string;
  kind: SquadKind | null;
  kindLabel: string | null;
  name: string | null;
  active: number;
  findings: Finding[];
}

export interface MemberList {
  rows: MemberView[];
  squads: SquadView[];
  counts: { active: number; ended: number };
}

export async function listMembers(db: Client, args: { villageId: number; detail: boolean; today: string }): Promise<MemberList> {
  const rows = await db.securityMember.findMany({ where: { villageId: args.villageId }, orderBy: [{ status: "asc" }, { role: "asc" }, { id: "asc" }], take: LIMITS.members });
  const people = await residentsById(db, args.villageId, rows.map((r) => r.residentId), { phone: args.detail });
  const roleOrder: Record<string, number> = { KEPALA_SATLINMAS: 0, KEPALA_PELAKSANA: 1, KOMANDAN_REGU: 2, ANGGOTA: 3 };
  const views = rows.map((r): MemberView => {
    const p = people.get(r.residentId);
    const status = r.status === "ENDED" ? "ENDED" : "ACTIVE";
    return {
      id: r.id,
      residentId: r.residentId,
      name: p?.name ?? "(data warga tidak ditemukan)",
      rt: p?.rt ?? null,
      rw: p?.rw ?? null,
      role: r.role as MemberRole,
      roleLabel: MEMBER_ROLES[r.role as MemberRole] ?? r.role,
      squadKind: (r.squadKind as SquadKind | null) ?? null,
      squadKindLabel: r.squadKind ? (SQUAD_KINDS[r.squadKind as SquadKind] ?? r.squadKind) : null,
      squadName: r.squadName,
      status,
      decreeNumber: r.decreeNumber,
      decreeDate: day(r.decreeDate),
      inauguratedOn: day(r.inauguratedOn),
      cardNumber: r.cardNumber,
      joinedOn: day(r.joinedOn),
      extensionDecree: r.extensionDecree,
      endedOn: day(r.endedOn),
      endReason: r.endReason,
      endReasonLabel: r.endReason ? (END_REASONS[r.endReason as keyof typeof END_REASONS] ?? r.endReason) : null,
      endDecree: r.endDecree,
      note: r.note,
      age: p ? ageOn(p.birthDate, args.today) : null,
      phone: args.detail ? (p?.phone ?? null) : null,
      findings: memberFindings({ status, birthDate: p?.birthDate ?? null, decreeNumber: r.decreeNumber, inauguratedOn: day(r.inauguratedOn), extensionDecree: r.extensionDecree, residentMissing: !p }, args.today),
    };
  });
  views.sort((a, b) => (a.status === b.status ? roleOrder[a.role]! - roleOrder[b.role]! || a.name.localeCompare(b.name, "id") : a.status === "ACTIVE" ? -1 : 1));

  // Regu: anggota paling sedikit 5 orang per regu (Permendagri 26/2020 Pasal 13 ayat 5 [V]); komandan regu dihitung bersama anggota regunya.
  const squadMap = new Map<string, SquadView>();
  for (const m of views) {
    if (m.status !== "ACTIVE" || (!m.squadKind && !m.squadName)) continue;
    const key = `${m.squadKind ?? ""}|${(m.squadName ?? "").toLowerCase()}`;
    const cur = squadMap.get(key) ?? { key, kind: m.squadKind, kindLabel: m.squadKindLabel, name: m.squadName, active: 0, findings: [] };
    cur.active++;
    squadMap.set(key, cur);
  }
  const squads = [...squadMap.values()].map((s) => ({
    ...s,
    findings: s.active < 5 ? [{ level: "INFO" as const, code: "SQUAD_SMALL", message: `Regu ${s.name ?? s.kindLabel ?? ""} beranggotakan ${s.active} orang aktif; peraturan menyebut anggota setiap regu paling sedikit 5 orang (Permendagri 26/2020 Pasal 13 ayat 5).` }] : [],
  }));
  return { rows: views, squads, counts: { active: views.filter((v) => v.status === "ACTIVE").length, ended: views.filter((v) => v.status === "ENDED").length } };
}

const SINGLE_ROLES: MemberRole[] = ["KEPALA_SATLINMAS", "KEPALA_PELAKSANA"];

export async function createMember(db: Client, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; residentId: number; role: string }>> {
  const p = parseMember(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const person = await tx.resident.findFirst({ where: { id: v.residentId!, villageId: args.villageId }, select: { id: true } });
      if (!person) return stop("Warga tidak ditemukan di desa ini.", 404);
      if ((await tx.securityMember.count({ where: { villageId: args.villageId } })) >= LIMITS.members) return stop(`Daftar anggota maksimal ${LIMITS.members}.`);
      if (SINGLE_ROLES.includes(v.role as MemberRole) && (await tx.securityMember.count({ where: { villageId: args.villageId, role: v.role, status: "ACTIVE" } })) > 0) return stop(`Jabatan "${MEMBER_ROLES[v.role as MemberRole]}" sudah terisi anggota aktif. Akhiri dulu pejabat sebelumnya.`);
      try {
        const row = await tx.securityMember.create({ data: { ...v, residentId: v.residentId!, villageId: args.villageId, createdById: args.userId } as never, select: { id: true } });
        return ok({ id: row.id, residentId: v.residentId!, role: v.role ?? "ANGGOTA" });
      } catch (e) {
        if (P2002(e)) return stop("Warga ini sudah terdaftar sebagai anggota Satlinmas.");
        throw e;
      }
    })
    .catch(asResult);
}

export async function patchMember(db: Client, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ residentId: number; keys: string[] }>> {
  const p = parseMember(args.input, "patch");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const cur = await tx.securityMember.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return stop("Anggota tidak ditemukan.", 404);
      if (v.role && v.role !== cur.role && SINGLE_ROLES.includes(v.role as MemberRole) && cur.status === "ACTIVE" && (await tx.securityMember.count({ where: { villageId: args.villageId, role: v.role, status: "ACTIVE", id: { not: cur.id } } })) > 0) {
        return stop(`Jabatan "${MEMBER_ROLES[v.role as MemberRole]}" sudah terisi anggota aktif.`);
      }
      if (v.role && cur.status === "ENDED" && v.role !== cur.role) return stop("Anggota yang sudah berakhir tidak dapat berganti jabatan. Aktifkan kembali lebih dulu.");
      await tx.securityMember.update({ where: { id: cur.id }, data: v as never });
      return ok({ residentId: cur.residentId, keys: Object.keys(v) });
    })
    .catch(asResult);
}

/** Mengakhiri keanggotaan (SK pemberhentian Kepala Desa, Pasal 25 ayat 6 [V]). Baris tetap tersimpan sebagai arsip. */
export async function endMember(db: Client, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ residentId: number; endReason: string }>> {
  const p = parseMemberEnd(args.input);
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const cur = await tx.securityMember.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return stop("Anggota tidak ditemukan.", 404);
      if (cur.status === "ENDED") return stop("Keanggotaan ini sudah berakhir.");
      if (cur.joinedOn && p.value.endedOn.getTime() < cur.joinedOn.getTime()) return stop("Tanggal berakhir tidak boleh sebelum tanggal bergabung.", 400);
      await tx.securityMember.update({ where: { id: cur.id }, data: { status: "ENDED", endedOn: p.value.endedOn, endReason: p.value.endReason, endDecree: p.value.endDecree } });
      return ok({ residentId: cur.residentId, endReason: p.value.endReason });
    })
    .catch(asResult);
}

export async function reactivateMember(db: Client, args: { villageId: number; id: number }): Promise<Result<{ residentId: number }>> {
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const cur = await tx.securityMember.findFirst({ where: { id: args.id, villageId: args.villageId } });
      if (!cur) return stop("Anggota tidak ditemukan.", 404);
      if (cur.status !== "ENDED") return stop("Anggota ini masih aktif.");
      if (SINGLE_ROLES.includes(cur.role as MemberRole) && (await tx.securityMember.count({ where: { villageId: args.villageId, role: cur.role, status: "ACTIVE" } })) > 0) return stop(`Jabatan "${MEMBER_ROLES[cur.role as MemberRole]}" sudah terisi anggota aktif.`);
      await tx.securityMember.update({ where: { id: cur.id }, data: { status: "ACTIVE", endedOn: null, endReason: null, endDecree: null } });
      return ok({ residentId: cur.residentId });
    })
    .catch(asResult);
}

export async function removeMember(db: Client, args: { villageId: number; id: number }): Promise<Result<{ residentId: number }>> {
  const cur = await db.securityMember.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { residentId: true } });
  if (!cur) return fail(404, "Anggota tidak ditemukan.");
  const r = await db.securityMember.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Anggota tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------------------------------
// Perlengkapan
// ---------------------------------------------------------------------------------------------------------------------
export interface EquipmentView {
  id: number;
  category: string;
  categoryLabel: string;
  name: string;
  quantity: number;
  condition: string;
  conditionLabel: string;
  location: string | null;
  custodian: string | null;
  inventory: { id: number; label: string } | null;
  lastCheckedOn: string | null;
  note: string | null;
}

export async function listEquipment(db: Client, args: { villageId: number }): Promise<{ rows: EquipmentView[]; inventoryOptions: { id: number; label: string }[] }> {
  const rows = await db.securityEquipment.findMany({ where: { villageId: args.villageId }, orderBy: [{ category: "asc" }, { name: "asc" }], take: LIMITS.equipment });
  const invIds = rows.map((r) => r.inventoryItemId).filter((x): x is number => x !== null);
  const inv = invIds.length ? await db.inventoryItem.findMany({ where: { villageId: args.villageId, id: { in: invIds } }, select: { id: true, name: true, itemCode: true } }) : [];
  const invMap = new Map(inv.map((i) => [i.id, { id: i.id, label: `${i.name}${i.itemCode ? ` (${i.itemCode})` : ""}` }]));
  const options = await db.inventoryItem.findMany({ where: { villageId: args.villageId, status: "ACTIVE" }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, itemCode: true } });
  return {
    rows: rows.map((r) => ({
      id: r.id,
      category: r.category,
      categoryLabel: EQUIPMENT_CATEGORIES[r.category as keyof typeof EQUIPMENT_CATEGORIES] ?? r.category,
      name: r.name,
      quantity: r.quantity,
      condition: r.condition,
      conditionLabel: CONDITIONS[r.condition as keyof typeof CONDITIONS] ?? r.condition,
      location: r.location,
      custodian: r.custodian,
      inventory: r.inventoryItemId !== null ? (invMap.get(r.inventoryItemId) ?? null) : null,
      lastCheckedOn: day(r.lastCheckedOn),
      note: r.note,
    })),
    inventoryOptions: options.map((i) => ({ id: i.id, label: `${i.name}${i.itemCode ? ` (${i.itemCode})` : ""}` })),
  };
}

async function checkInventory(db: Client | Db, villageId: number, id: number | null | undefined) {
  if (id === null || id === undefined) return;
  const item = await db.inventoryItem.findFirst({ where: { id, villageId }, select: { id: true } });
  if (!item) stop("Barang inventaris tidak ditemukan di desa ini.", 404);
}

export async function createEquipment(db: Client, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; category: string; name: string }>> {
  const p = parseEquipment(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      await checkInventory(tx, args.villageId, v.inventoryItemId);
      if ((await tx.securityEquipment.count({ where: { villageId: args.villageId } })) >= LIMITS.equipment) return stop(`Daftar perlengkapan maksimal ${LIMITS.equipment}.`);
      const row = await tx.securityEquipment.create({ data: { ...v, villageId: args.villageId, createdById: args.userId } as never, select: { id: true } });
      return ok({ id: row.id, category: v.category!, name: v.name! });
    })
    .catch(asResult);
}

export async function patchEquipment(db: Client, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ keys: string[] }>> {
  const p = parseEquipment(args.input, "patch");
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      await checkInventory(tx, args.villageId, p.value.inventoryItemId);
      const r = await tx.securityEquipment.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value as never });
      return r.count ? ok({ keys: Object.keys(p.value) }) : stop("Perlengkapan tidak ditemukan.", 404);
    })
    .catch(asResult);
}

export async function removeEquipment(db: Client, args: { villageId: number; id: number }): Promise<Result<{ name: string }>> {
  const cur = await db.securityEquipment.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true } });
  if (!cur) return fail(404, "Perlengkapan tidak ditemukan.");
  const r = await db.securityEquipment.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Perlengkapan tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------------------------------
// Kerawanan
// ---------------------------------------------------------------------------------------------------------------------
export interface RiskView {
  id: number;
  name: string;
  kind: string;
  kindLabel: string;
  level: string;
  levelLabel: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  lat: number | null;
  lng: number | null;
  note: string | null;
  lastReviewedOn: string | null;
  active: boolean;
}
export interface RiskHint {
  rw: string | null;
  rt: string | null;
  events: number;
}

export async function listRisks(db: Client, args: { villageId: number; now?: Date }): Promise<{ rows: RiskView[]; hints: RiskHint[] }> {
  const rows = await db.securityRiskArea.findMany({ where: { villageId: args.villageId }, orderBy: [{ active: "desc" }, { level: "desc" }, { name: "asc" }], take: LIMITS.riskAreas });
  const since = new Date((args.now ?? new Date()).getTime() - 365 * 86_400_000);
  // Petunjuk dari kejadian 12 bulan terakhir per RW/RT: hanya hitungan (tanpa isi kejadian), sebagai bahan menilai kerawanan.
  const groups = await db.incidentEvent.groupBy({ by: ["rw", "rt"], where: { villageId: args.villageId, domain: "KEAMANAN", status: { not: "CANCELLED" }, occurredAt: { gte: since }, rw: { not: null } }, _count: { _all: true }, orderBy: { _count: { id: "desc" } }, take: 8 });
  const lvl: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  rows.sort((a, b) => Number(b.active) - Number(a.active) || (lvl[a.level] ?? 3) - (lvl[b.level] ?? 3) || a.name.localeCompare(b.name, "id"));
  return {
    rows: rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      kindLabel: RISK_KINDS[r.kind as keyof typeof RISK_KINDS] ?? r.kind,
      level: r.level,
      levelLabel: RISK_LEVELS[r.level as keyof typeof RISK_LEVELS] ?? r.level,
      rt: r.rt,
      rw: r.rw,
      hamlet: r.hamlet,
      lat: r.lat,
      lng: r.lng,
      note: r.note,
      lastReviewedOn: day(r.lastReviewedOn),
      active: r.active,
    })),
    hints: groups.map((g) => ({ rw: g.rw, rt: g.rt, events: g._count._all })),
  };
}

export async function createRisk(db: Client, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; kind: string; level: string }>> {
  const p = parseRisk(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.securityRiskArea.count({ where: { villageId: args.villageId } })) >= LIMITS.riskAreas) return stop(`Daftar wilayah rawan maksimal ${LIMITS.riskAreas}.`);
      const row = await tx.securityRiskArea.create({ data: { ...v, villageId: args.villageId, createdById: args.userId } as never, select: { id: true } });
      return ok({ id: row.id, kind: v.kind!, level: v.level ?? "MEDIUM" });
    })
    .catch(asResult);
}

export async function patchRisk(db: Client, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ keys: string[] }>> {
  const p = parseRisk(args.input, "patch");
  if (!p.ok) return invalid(p);
  const r = await db.securityRiskArea.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value as never });
  return r.count ? ok({ keys: Object.keys(p.value) }) : fail(404, "Wilayah rawan tidak ditemukan.");
}

export async function removeRisk(db: Client, args: { villageId: number; id: number }): Promise<Result<{ name: string }>> {
  const cur = await db.securityRiskArea.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true } });
  if (!cur) return fail(404, "Wilayah rawan tidak ditemukan.");
  const r = await db.securityRiskArea.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Wilayah rawan tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------------------------------
// Kontak layanan (direktori yang disunting desa)
// ---------------------------------------------------------------------------------------------------------------------
export interface ContactView {
  id: number;
  kind: ContactKind;
  kindLabel: string;
  name: string;
  phone: string;
  address: string | null;
  hours: string | null;
  note: string | null;
  checkedOn: string | null;
}

export async function listContacts(db: Client, args: { villageId: number }): Promise<ContactView[]> {
  const rows = await db.securityContact.findMany({ where: { villageId: args.villageId }, orderBy: [{ kind: "asc" }, { name: "asc" }], take: LIMITS.contacts });
  return rows.map((r) => ({ id: r.id, kind: r.kind as ContactKind, kindLabel: CONTACT_KINDS[r.kind as ContactKind] ?? r.kind, name: r.name, phone: r.phone, address: r.address, hours: r.hours, note: r.note, checkedOn: day(r.checkedOn) }));
}

export async function createContact(db: Client, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; kind: string }>> {
  const p = parseContact(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.securityContact.count({ where: { villageId: args.villageId } })) >= LIMITS.contacts) return stop(`Direktori kontak maksimal ${LIMITS.contacts}.`);
      const row = await tx.securityContact.create({ data: { ...v, villageId: args.villageId, createdById: args.userId } as never, select: { id: true } });
      return ok({ id: row.id, kind: v.kind! });
    })
    .catch(asResult);
}

export async function patchContact(db: Client, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ keys: string[] }>> {
  const p = parseContact(args.input, "patch");
  if (!p.ok) return invalid(p);
  const r = await db.securityContact.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value as never });
  return r.count ? ok({ keys: Object.keys(p.value) }) : fail(404, "Kontak tidak ditemukan.");
}

export async function removeContact(db: Client, args: { villageId: number; id: number }): Promise<Result<{ kind: string }>> {
  const cur = await db.securityContact.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { kind: true } });
  if (!cur) return fail(404, "Kontak tidak ditemukan.");
  const r = await db.securityContact.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Kontak tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------------------------------
// Ringkasan
// ---------------------------------------------------------------------------------------------------------------------
export interface Overview {
  incidents: Awaited<ReturnType<typeof domainSummary>>;
  counts: { activeMembers: number; equipmentNeedsCare: number; activeGroups: number; highRiskAreas: number; scheduledMediations: number; openFollowups: number; overdueFollowups: number };
  tonight: { date: string; groups: number; assigned: number; present: number; pending: number };
  findings: Finding[];
}

export async function getOverview(db: Client, args: { villageId: number; today: string; now?: Date }): Promise<Overview> {
  const { villageId, today } = args;
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const ahead = new Date(`${addDays(today, 6)}T00:00:00.000Z`);
  const back30 = new Date(`${addDays(today, -30)}T00:00:00.000Z`);
  const [incidents, activeMembers, needsCare, groups, highRisk, scheduled, openFu, overdueFu, nightRows, aheadRows, absent] = await Promise.all([
    domainSummary(db, { domain: "KEAMANAN", villageId, now: args.now }),
    db.securityMember.count({ where: { villageId, status: "ACTIVE" } }),
    db.securityEquipment.count({ where: { villageId, condition: { in: ["PERLU_PERBAIKAN", "RUSAK"] } } }),
    db.securityRondaGroup.findMany({ where: { villageId, active: true }, select: { id: true, name: true, perShift: true, _count: { select: { people: { where: { active: true } } } } }, take: LIMITS.groups }),
    db.securityRiskArea.count({ where: { villageId, level: "HIGH", active: true } }),
    db.securityMediation.count({ where: { villageId, status: "SCHEDULED" } }),
    db.securityFollowup.count({ where: { villageId, status: "OPEN" } }),
    db.securityFollowup.count({ where: { villageId, status: "OPEN", dueOn: { lt: todayDate } } }),
    db.securityRondaShift.groupBy({ by: ["attendance"], where: { villageId, shiftDate: todayDate }, _count: { _all: true } }),
    db.securityRondaShift.groupBy({ by: ["groupId", "shiftDate"], where: { villageId, shiftDate: { gte: todayDate, lte: ahead } }, _count: { _all: true } }),
    db.securityRondaShift.groupBy({ by: ["groupId"], where: { villageId, shiftDate: { gte: back30, lt: todayDate }, attendance: "ABSENT" }, _count: { _all: true } }),
  ]);
  const findings: Finding[] = [];
  const nightsByGroup = new Map<number, { nights: number; under: number }>();
  const aheadDates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  for (const g of groups) {
    const rows = aheadRows.filter((r) => r.groupId === g.id);
    const filled = new Map(rows.map((r) => [r.shiftDate.toISOString().slice(0, 10), r._count._all]));
    nightsByGroup.set(g.id, { nights: rows.length, under: aheadDates.filter((d) => (filled.get(d) ?? 0) < g.perShift).length });
  }
  for (const g of groups) {
    const n = nightsByGroup.get(g.id)!;
    findings.push(
      ...groupFindings({
        name: g.name,
        active: true,
        perShift: g.perShift,
        activePeople: g._count.people,
        underStaffedNights: n.nights === 0 ? 0 : n.under,
        scheduledAhead: n.nights,
        absentLast30: absent.find((a) => a.groupId === g.id)?._count._all ?? 0,
      }),
    );
  }
  if (overdueFu > 0) findings.push({ level: "WARN", code: "FOLLOWUP_OVERDUE", message: `${overdueFu} tindak lanjut melewati batas waktu.` });
  const by = (a: string) => nightRows.find((r) => r.attendance === a)?._count._all ?? 0;
  const assigned = nightRows.reduce((n, r) => n + r._count._all, 0);
  return {
    incidents,
    counts: { activeMembers, equipmentNeedsCare: needsCare, activeGroups: groups.length, highRiskAreas: highRisk, scheduledMediations: scheduled, openFollowups: openFu, overdueFollowups: overdueFu },
    tonight: { date: today, groups: groups.length, assigned, present: by("PRESENT") + by("LATE"), pending: by("PENDING") },
    findings: findings.slice(0, 12),
  };
}
