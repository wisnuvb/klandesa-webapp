/**
 * Servis kesiapsiagaan bencana (Prisma): ancaman, sumber daya, relawan, dokumen rencana, kesiapan Destana, penilaian, dan peringatan dini.
 * Kejadian (bencana terjadi) ada di lib/incident/service.ts. `villageId` selalu dari sesi pemanggil.
 *
 * Batas jumlah baris per desa dijaga di dalam kunci baris desa (`SELECT … FOR UPDATE` pada `villages`, pernyataan pertama transaksi),
 * sehingga dua permintaan serentak tidak dapat sama-sama menembus batas.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { own } from "@/lib/incident/catalog";
import { pushToCitizenAccounts } from "@/lib/mobile/push";
import {
  ACTIVITIES,
  ALERT_LEVELS,
  ASSESSMENT_KINDS,
  CONDITIONS,
  DISASTER_POINT_RISK,
  DISASTER_POINT_TYPE,
  HAZARD_TYPES,
  LEVELS,
  LIMITS,
  PLAN_KINDS,
  PLAN_STATUSES,
  READINESS_STATUSES,
  RESOURCE_KINDS,
  RISK_LEVELS,
  VOLUNTEER_STATUSES,
  type ReadinessStatus,
} from "./catalog";
import { alertLabel, areaLabel, areaVariants, bencanaFindings, capacityOf, normArea, readinessItems, readinessScore, type AreaTarget, type BencanaFinding, type ReadinessFacts, type ReadinessItemView, type ReadinessScore } from "./calc";
import { parseAlert, parseAssessment, parseCustomItem, parseHazard, parsePlan, parseReadinessSet, parseResource, parseVolunteer } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {
  constructor(
    msg: string,
    readonly status = 409,
  ) {
    super(msg);
  }
}
const stop = (msg: string, status = 409): never => {
  throw new Stop(msg, status);
};
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(e.status, e.message);
  throw e;
};
const P2002 = (e: unknown): boolean => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Teks pencarian: spasi dirapikan dan karakter pola LIKE (% _ \\) dilucuti agar tidak berlaku sebagai wildcard. */
const likeSafe = (raw: string): string => raw.replace(/[%_\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

/** Kunci desa untuk menjaga batas jumlah baris. HARUS pernyataan pertama dalam transaksi interaktif. */
async function lockVillage(tx: Db, villageId: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM villages WHERE id = ${villageId} FOR UPDATE`;
  if (!rows.length) stop("Desa tidak ditemukan.", 404);
}

// ---------------------------------------------------------------------------------------------------------------------
// Ancaman
// ---------------------------------------------------------------------------------------------------------------------
export interface HazardView {
  id: number;
  hazardType: string;
  hazardLabel: string;
  name: string;
  riskLevel: string;
  riskLabel: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  lat: number | null;
  lng: number | null;
  exposedHouseholds: number | null;
  description: string | null;
  lastReviewedOn: string | null;
  fromDisasterPoint: boolean;
}
const RISK_ORDER: Record<string, number> = { EXTREME: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export async function listHazards(db: PrismaClient, args: { villageId: number }): Promise<HazardView[]> {
  const rows = await db.drmHazard.findMany({ where: { villageId: args.villageId }, orderBy: { id: "asc" }, take: LIMITS.hazards });
  return rows
    .map((h) => ({
      id: h.id,
      hazardType: h.hazardType,
      hazardLabel: HAZARD_TYPES[h.hazardType as keyof typeof HAZARD_TYPES] ?? h.hazardType,
      name: h.name,
      riskLevel: h.riskLevel,
      riskLabel: RISK_LEVELS[h.riskLevel as keyof typeof RISK_LEVELS] ?? h.riskLevel,
      rt: h.rt,
      rw: h.rw,
      hamlet: h.hamlet,
      lat: h.lat,
      lng: h.lng,
      exposedHouseholds: h.exposedHouseholds,
      description: h.description,
      lastReviewedOn: isoDay(h.lastReviewedOn),
      fromDisasterPoint: h.disasterPointId !== null,
    }))
    .sort((a, b) => (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9) || a.name.localeCompare(b.name, "id"));
}

export async function createHazard(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; hazardType: string; name: string; riskLevel: string }>> {
  const p = parseHazard(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.drmHazard.count({ where: { villageId: args.villageId } })) >= LIMITS.hazards) return stop(`Daftar ancaman maksimal ${LIMITS.hazards}.`);
      const row = await tx.drmHazard.create({ data: { ...v, villageId: args.villageId, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id, hazardType: v.hazardType, name: v.name, riskLevel: v.riskLevel });
    })
    .catch(asResult);
}

export async function patchHazard(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ name: string; keys: string[] }>> {
  const p = parseHazard(args.input, "patch");
  if (!p.ok) return invalid(p);
  const cur = await db.drmHazard.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true } });
  if (!cur) return fail(404, "Ancaman tidak ditemukan.");
  const r = await db.drmHazard.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value });
  return r.count ? ok({ name: p.value.name ?? cur.name, keys: Object.keys(p.value) }) : fail(404, "Ancaman tidak ditemukan.");
}

export async function removeHazard(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ name: string; hazardType: string }>> {
  const cur = await db.drmHazard.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true, hazardType: true } });
  if (!cur) return fail(404, "Ancaman tidak ditemukan.");
  const r = await db.drmHazard.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Ancaman tidak ditemukan.");
}

/** Impor titik rawan lama (disaster_points) menjadi ancaman; yang sudah pernah diimpor dilewati (kunci unik desa + titik). */
export async function importDisasterPoints(db: PrismaClient, args: { villageId: number; userId: number | null }): Promise<Result<{ imported: number; skipped: number }>> {
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const [points, existing, count] = await Promise.all([
        tx.disasterPoint.findMany({ where: { villageId: args.villageId }, orderBy: { id: "asc" }, take: LIMITS.hazards }),
        tx.drmHazard.findMany({ where: { villageId: args.villageId, disasterPointId: { not: null } }, select: { disasterPointId: true } }),
        tx.drmHazard.count({ where: { villageId: args.villageId } }),
      ]);
      const done = new Set(existing.map((e) => e.disasterPointId));
      const fresh = points.filter((p) => !done.has(p.id));
      const room = Math.max(0, LIMITS.hazards - count);
      const take = fresh.slice(0, room);
      if (take.length) {
        await tx.drmHazard.createMany({
          data: take.map((p) => ({
            villageId: args.villageId,
            hazardType: (own(DISASTER_POINT_TYPE, p.disasterType) ? DISASTER_POINT_TYPE[p.disasterType]! : "LAINNYA"),
            name: p.name.slice(0, 200),
            riskLevel: (own(DISASTER_POINT_RISK, p.riskLevel) ? DISASTER_POINT_RISK[p.riskLevel]! : "MEDIUM"),
            rt: p.rt,
            rw: p.rw,
            lat: p.lat,
            lng: p.lng,
            description: [p.notes, p.evacuationPlan ? `Rencana evakuasi: ${p.evacuationPlan}` : null].filter(Boolean).join("\n").slice(0, 1000) || null,
            lastReviewedOn: p.lastCheckedAt ? new Date(Date.UTC(p.lastCheckedAt.getUTCFullYear(), p.lastCheckedAt.getUTCMonth(), p.lastCheckedAt.getUTCDate())) : null,
            disasterPointId: p.id,
            createdById: args.userId,
          })),
          skipDuplicates: true,
        });
      }
      return ok({ imported: take.length, skipped: points.length - take.length });
    })
    .catch(asResult);
}

// ---------------------------------------------------------------------------------------------------------------------
// Sumber daya
// ---------------------------------------------------------------------------------------------------------------------
export interface ResourceView {
  id: number;
  kind: string;
  kindLabel: string;
  name: string;
  locationText: string | null;
  rt: string | null;
  rw: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number | null;
  quantity: number | null;
  unit: string | null;
  condition: string;
  conditionLabel: string;
  lastCheckedOn: string | null;
  custodian: string | null;
  note: string | null;
}

export async function listResources(db: PrismaClient, args: { villageId: number }): Promise<ResourceView[]> {
  const rows = await db.drmResource.findMany({ where: { villageId: args.villageId }, orderBy: [{ kind: "asc" }, { name: "asc" }], take: LIMITS.resources });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    kindLabel: RESOURCE_KINDS[r.kind as keyof typeof RESOURCE_KINDS] ?? r.kind,
    name: r.name,
    locationText: r.locationText,
    rt: r.rt,
    rw: r.rw,
    lat: r.lat,
    lng: r.lng,
    capacity: r.capacity,
    quantity: r.quantity,
    unit: r.unit,
    condition: r.condition,
    conditionLabel: CONDITIONS[r.condition as keyof typeof CONDITIONS] ?? r.condition,
    lastCheckedOn: isoDay(r.lastCheckedOn),
    custodian: r.custodian,
    note: r.note,
  }));
}

export async function createResource(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; kind: string; name: string }>> {
  const p = parseResource(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.drmResource.count({ where: { villageId: args.villageId } })) >= LIMITS.resources) return stop(`Daftar sumber daya maksimal ${LIMITS.resources}.`);
      const row = await tx.drmResource.create({ data: { ...v, villageId: args.villageId, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id, kind: v.kind, name: v.name });
    })
    .catch(asResult);
}

export async function patchResource(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ name: string; keys: string[] }>> {
  const p = parseResource(args.input, "patch");
  if (!p.ok) return invalid(p);
  const cur = await db.drmResource.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true } });
  if (!cur) return fail(404, "Sumber daya tidak ditemukan.");
  const r = await db.drmResource.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value });
  return r.count ? ok({ name: p.value.name ?? cur.name, keys: Object.keys(p.value) }) : fail(404, "Sumber daya tidak ditemukan.");
}

export async function removeResource(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ name: string; kind: string }>> {
  const cur = await db.drmResource.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { name: true, kind: true } });
  if (!cur) return fail(404, "Sumber daya tidak ditemukan.");
  const r = await db.drmResource.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Sumber daya tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------------------------------
// Relawan
// ---------------------------------------------------------------------------------------------------------------------
export interface VolunteerView {
  id: number;
  residentId: number;
  /** null bila warga sudah tidak ada di data kependudukan */
  name: string | null;
  rt: string | null;
  rw: string | null;
  /** Hanya untuk pemanggil dengan izin baca rinci */
  phone: string | null;
  team: string | null;
  role: string | null;
  skill: string | null;
  status: string;
  statusLabel: string;
  joinedOn: string | null;
  skRef: string | null;
  note: string | null;
}

export async function listVolunteers(db: PrismaClient, args: { villageId: number; detail: boolean }): Promise<VolunteerView[]> {
  const rows = await db.drmVolunteer.findMany({ where: { villageId: args.villageId }, orderBy: [{ status: "asc" }, { id: "asc" }], take: LIMITS.volunteers });
  const people = rows.length ? await db.resident.findMany({ where: { villageId: args.villageId, id: { in: rows.map((r) => r.residentId) } }, select: { id: true, name: true, rt: true, rw: true, phone: true } }) : [];
  const byId = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => {
    const p = byId.get(r.residentId);
    return {
      id: r.id,
      residentId: r.residentId,
      name: p?.name ?? null,
      rt: p?.rt ?? null,
      rw: p?.rw ?? null,
      phone: args.detail ? (p?.phone ?? null) : null,
      team: r.team,
      role: r.role,
      skill: r.skill,
      status: r.status,
      statusLabel: VOLUNTEER_STATUSES[r.status as keyof typeof VOLUNTEER_STATUSES] ?? r.status,
      joinedOn: isoDay(r.joinedOn),
      skRef: r.skRef,
      note: r.note,
    };
  });
}

export async function createVolunteer(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; residentId: number }>> {
  const p = parseVolunteer(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const person = await tx.resident.findFirst({ where: { id: v.residentId, villageId: args.villageId }, select: { id: true } });
      if (!person) return stop("Warga tidak ditemukan di desa ini.", 404);
      if ((await tx.drmVolunteer.count({ where: { villageId: args.villageId } })) >= LIMITS.volunteers) return stop(`Daftar relawan maksimal ${LIMITS.volunteers}.`);
      try {
        const row = await tx.drmVolunteer.create({ data: { ...v, villageId: args.villageId, createdById: args.userId }, select: { id: true } });
        return ok({ id: row.id, residentId: v.residentId });
      } catch (e) {
        if (P2002(e)) return stop("Warga ini sudah terdaftar sebagai relawan.");
        throw e;
      }
    })
    .catch(asResult);
}

export async function patchVolunteer(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ residentId: number; keys: string[] }>> {
  const p = parseVolunteer(args.input, "patch");
  if (!p.ok) return invalid(p);
  const cur = await db.drmVolunteer.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { residentId: true } });
  if (!cur) return fail(404, "Relawan tidak ditemukan.");
  const r = await db.drmVolunteer.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value });
  return r.count ? ok({ residentId: cur.residentId, keys: Object.keys(p.value) }) : fail(404, "Relawan tidak ditemukan.");
}

export async function removeVolunteer(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ residentId: number }>> {
  const cur = await db.drmVolunteer.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { residentId: true } });
  if (!cur) return fail(404, "Relawan tidak ditemukan.");
  const r = await db.drmVolunteer.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Relawan tidak ditemukan.");
}

export interface ResidentHit {
  id: number;
  name: string;
  rt: string | null;
  rw: string | null;
}
/** Pilih warga untuk relawan. Tanpa NIK/KK; hanya nama dan RT/RW. */
export async function searchResidents(db: PrismaClient, args: { villageId: number; q: string }): Promise<ResidentHit[]> {
  const q = likeSafe(args.q);
  if (q.length < 3) return [];
  return db.resident.findMany({ where: { villageId: args.villageId, name: { contains: q } }, orderBy: { name: "asc" }, take: 10, select: { id: true, name: true, rt: true, rw: true } });
}

// ---------------------------------------------------------------------------------------------------------------------
// Dokumen rencana
// ---------------------------------------------------------------------------------------------------------------------
export interface PlanView {
  id: number;
  kind: string;
  kindLabel: string;
  title: string;
  year: number | null;
  status: string;
  statusLabel: string;
  note: string | null;
  legalDocument: { id: number; label: string } | null;
  archive: { id: string; label: string } | null;
}

export async function listPlans(db: PrismaClient, args: { villageId: number }): Promise<PlanView[]> {
  const rows = await db.drmPlan.findMany({ where: { villageId: args.villageId }, orderBy: [{ kind: "asc" }, { id: "desc" }], take: LIMITS.plans });
  const legalIds = [...new Set(rows.map((r) => r.legalDocumentId).filter((v): v is number => v !== null))];
  const archIds = [...new Set(rows.map((r) => r.archiveId).filter((v): v is bigint => v !== null))];
  const [legal, arch] = await Promise.all([
    legalIds.length ? db.legalDocument.findMany({ where: { villageId: args.villageId, id: { in: legalIds } }, select: { id: true, type: true, number: true, year: true, title: true } }) : [],
    archIds.length ? db.digitalArchive.findMany({ where: { villageId: args.villageId, id: { in: archIds } }, select: { id: true, title: true, fileName: true } }) : [],
  ]);
  const legalBy = new Map(legal.map((l) => [l.id, l]));
  const archBy = new Map(arch.map((a) => [a.id, a]));
  return rows.map((r) => {
    const l = r.legalDocumentId === null ? null : legalBy.get(r.legalDocumentId);
    const a = r.archiveId === null ? null : archBy.get(r.archiveId);
    return {
      id: r.id,
      kind: r.kind,
      kindLabel: PLAN_KINDS[r.kind as keyof typeof PLAN_KINDS] ?? r.kind,
      title: r.title,
      year: r.year,
      status: r.status,
      statusLabel: PLAN_STATUSES[r.status as keyof typeof PLAN_STATUSES] ?? r.status,
      note: r.note,
      legalDocument: l ? { id: l.id, label: `${l.type} ${l.number}/${l.year}: ${l.title}` } : null,
      archive: a ? { id: String(a.id), label: a.title || a.fileName } : null,
    };
  });
}

/** Rujukan lampiran harus milik desa yang sama (tanpa FK, jadi dicek di sini). */
async function checkPlanLinks(tx: Db, villageId: number, v: { legalDocumentId?: number | null; archiveId?: bigint | null }) {
  if (v.legalDocumentId && !(await tx.legalDocument.findFirst({ where: { id: v.legalDocumentId, villageId }, select: { id: true } }))) stop("Produk hukum yang dipilih tidak ditemukan di desa ini.", 404);
  if (v.archiveId && !(await tx.digitalArchive.findFirst({ where: { id: v.archiveId, villageId }, select: { id: true } }))) stop("Berkas arsip yang dipilih tidak ditemukan di desa ini.", 404);
}

export async function createPlan(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; kind: string; title: string }>> {
  const p = parsePlan(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      await checkPlanLinks(tx, args.villageId, v);
      if ((await tx.drmPlan.count({ where: { villageId: args.villageId } })) >= LIMITS.plans) return stop(`Daftar dokumen rencana maksimal ${LIMITS.plans}.`);
      const row = await tx.drmPlan.create({ data: { ...v, villageId: args.villageId, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id, kind: v.kind, title: v.title });
    })
    .catch(asResult);
}

export async function patchPlan(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ title: string; keys: string[] }>> {
  const p = parsePlan(args.input, "patch");
  if (!p.ok) return invalid(p);
  return db
    .$transaction(async (tx) => {
      const cur = await tx.drmPlan.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { title: true } });
      if (!cur) return stop("Dokumen tidak ditemukan.", 404);
      await checkPlanLinks(tx, args.villageId, p.value);
      await tx.drmPlan.updateMany({ where: { id: args.id, villageId: args.villageId }, data: p.value });
      return ok({ title: p.value.title ?? cur.title, keys: Object.keys(p.value) });
    })
    .catch(asResult);
}

export async function removePlan(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ title: string; kind: string }>> {
  const cur = await db.drmPlan.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { title: true, kind: true } });
  if (!cur) return fail(404, "Dokumen tidak ditemukan.");
  const r = await db.drmPlan.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok(cur) : fail(404, "Dokumen tidak ditemukan.");
}

/** Pilihan lampiran: produk hukum dan arsip digital desa (judul saja). */
export async function planLinkOptions(db: PrismaClient, args: { villageId: number }) {
  const [legal, arch] = await Promise.all([
    db.legalDocument.findMany({ where: { villageId: args.villageId, status: "BERLAKU" }, orderBy: [{ year: "desc" }, { id: "desc" }], take: 100, select: { id: true, type: true, number: true, year: true, title: true } }),
    db.digitalArchive.findMany({ where: { villageId: args.villageId }, orderBy: { id: "desc" }, take: 100, select: { id: true, title: true, fileName: true } }),
  ]);
  return {
    legal: legal.map((l) => ({ id: l.id, label: `${l.type} ${l.number}/${l.year}: ${l.title}`.slice(0, 160) })),
    archives: arch.map((a) => ({ id: String(a.id), label: (a.title || a.fileName).slice(0, 160) })),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Kesiapan Destana + penilaian
// ---------------------------------------------------------------------------------------------------------------------
export interface AssessmentView {
  id: number;
  kind: string;
  kindLabel: string;
  doneOn: string;
  level: string | null;
  levelLabel: string | null;
  referenceNo: string | null;
  note: string | null;
}
export interface CustomItemView {
  id: number;
  label: string;
  status: ReadinessStatus;
  statusLabel: string;
  note: string | null;
  verified: false;
}
export interface Readiness {
  items: (ReadinessItemView & { statusLabel: string; note: string | null })[];
  score: ReadinessScore;
  custom: CustomItemView[];
  assessments: AssessmentView[];
  currentLevel: { level: string; label: string; doneOn: string } | null;
  findings: BencanaFinding[];
}

export async function getReadiness(db: PrismaClient, args: { villageId: number; today: string }): Promise<Readiness> {
  const v = args.villageId;
  const [rows, hazards, volunteers, resources, plans, assessments] = await Promise.all([
    db.drmReadinessItem.findMany({ where: { villageId: v }, orderBy: { id: "asc" }, take: LIMITS.customItems + ACTIVITIES.length + 5 }),
    db.drmHazard.findMany({ where: { villageId: v }, select: { riskLevel: true, lat: true }, take: LIMITS.hazards }),
    db.drmVolunteer.count({ where: { villageId: v, status: "ACTIVE" } }),
    db.drmResource.findMany({ where: { villageId: v }, select: { kind: true, condition: true, capacity: true }, take: LIMITS.resources }),
    db.drmPlan.groupBy({ by: ["kind", "status"], where: { villageId: v }, _count: { _all: true } }),
    db.drmAssessment.findMany({ where: { villageId: v }, orderBy: [{ doneOn: "desc" }, { id: "desc" }], take: 20 }),
  ]);
  const plansByKind: Record<string, number> = {};
  const adoptedByKind: Record<string, number> = {};
  for (const g of plans) {
    plansByKind[g.kind] = (plansByKind[g.kind] ?? 0) + g._count._all;
    if (g.status === "DITETAPKAN") adoptedByKind[g.kind] = (adoptedByKind[g.kind] ?? 0) + g._count._all;
  }
  const statuses: Record<string, ReadinessStatus> = {};
  const notes = new Map<string, string | null>();
  for (const r of rows) if (r.source === "CATALOG" && r.code) {
    statuses[r.code] = r.status as ReadinessStatus;
    notes.set(r.code, r.note);
  }
  const facts: ReadinessFacts = { statuses, hazards: hazards.length, activeVolunteers: volunteers, resources: resources.length, plansByKind, adoptedByKind, assessments: assessments.filter((a) => a.kind === "PENILAIAN").length };
  const items = readinessItems(facts).map((i) => ({ ...i, statusLabel: READINESS_STATUSES[i.status], note: notes.get(i.code) ?? null }));
  const views: AssessmentView[] = assessments.map((a) => ({
    id: a.id,
    kind: a.kind,
    kindLabel: ASSESSMENT_KINDS[a.kind as keyof typeof ASSESSMENT_KINDS] ?? a.kind,
    doneOn: isoDay(a.doneOn)!,
    level: a.level,
    levelLabel: a.level ? (LEVELS[a.level as keyof typeof LEVELS] ?? a.level) : null,
    referenceNo: a.referenceNo,
    note: a.note,
  }));
  const lastLevel = views.find((a) => a.kind === "PENILAIAN" && a.level);
  const findings = bencanaFindings({
    today: args.today,
    assessments: views.map((a) => ({ kind: a.kind as "PENILAIAN" | "EVALUASI", doneOn: a.doneOn, level: a.level as never })),
    hazards,
    resources,
    activeVolunteers: volunteers,
    hasShelterOrGather: resources.some((r) => r.kind === "SHELTER" || r.kind === "TITIK_KUMPUL"),
    adoptedPlans: Object.values(adoptedByKind).reduce((a, b) => a + b, 0),
  });
  return {
    items,
    score: readinessScore(items),
    custom: rows
      .filter((r) => r.source === "CUSTOM")
      .map((r) => ({ id: r.id, label: r.label ?? "", status: r.status as ReadinessStatus, statusLabel: READINESS_STATUSES[r.status as ReadinessStatus] ?? r.status, note: r.note, verified: false as const })),
    assessments: views,
    currentLevel: lastLevel && lastLevel.level ? { level: lastLevel.level, label: lastLevel.levelLabel ?? lastLevel.level, doneOn: lastLevel.doneOn } : null,
    findings,
  };
}

export async function setReadiness(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ code: string; status: string }>> {
  const p = parseReadinessSet(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  // Bukan upsert: dua permintaan serentak (klik ganda) sama-sama tidak menemukan baris lalu sama-sama membuat → tabrakan kunci unik.
  const data = { status: v.status, note: v.note, updatedById: args.userId };
  const where = { villageId: args.villageId, source: "CATALOG", code: v.code };
  if ((await db.drmReadinessItem.updateMany({ where, data })).count === 0) {
    try {
      await db.drmReadinessItem.create({ data: { ...where, ...data } });
    } catch (e) {
      if (!P2002(e)) throw e;
      await db.drmReadinessItem.updateMany({ where, data });
    }
  }
  return ok({ code: v.code, status: v.status });
}

export async function createCustomItem(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; label: string }>> {
  const p = parseCustomItem(args.input, "create");
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.drmReadinessItem.count({ where: { villageId: args.villageId, source: "CUSTOM" } })) >= LIMITS.customItems) return stop(`Butir tambahan maksimal ${LIMITS.customItems}.`);
      const row = await tx.drmReadinessItem.create({ data: { villageId: args.villageId, source: "CUSTOM", code: null, label: v.label, status: v.status, note: v.note, updatedById: args.userId }, select: { id: true } });
      return ok({ id: row.id, label: v.label });
    })
    .catch(asResult);
}

export async function patchCustomItem(db: PrismaClient, args: { villageId: number; userId: number | null; id: number; input: unknown }): Promise<Result<{ label: string; keys: string[] }>> {
  const p = parseCustomItem(args.input, "patch");
  if (!p.ok) return invalid(p);
  const cur = await db.drmReadinessItem.findFirst({ where: { id: args.id, villageId: args.villageId, source: "CUSTOM" }, select: { label: true } });
  if (!cur) return fail(404, "Butir tidak ditemukan.");
  const r = await db.drmReadinessItem.updateMany({ where: { id: args.id, villageId: args.villageId, source: "CUSTOM" }, data: { ...p.value, updatedById: args.userId } });
  return r.count ? ok({ label: p.value.label ?? cur.label ?? "", keys: Object.keys(p.value) }) : fail(404, "Butir tidak ditemukan.");
}

export async function removeCustomItem(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ label: string }>> {
  const cur = await db.drmReadinessItem.findFirst({ where: { id: args.id, villageId: args.villageId, source: "CUSTOM" }, select: { label: true } });
  if (!cur) return fail(404, "Butir tidak ditemukan.");
  const r = await db.drmReadinessItem.deleteMany({ where: { id: args.id, villageId: args.villageId, source: "CUSTOM" } });
  return r.count ? ok({ label: cur.label ?? "" }) : fail(404, "Butir tidak ditemukan.");
}

export async function createAssessment(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; kind: string; level: string | null }>> {
  const p = parseAssessment(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  return db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      if ((await tx.drmAssessment.count({ where: { villageId: args.villageId } })) >= LIMITS.assessments) return stop(`Catatan penilaian/evaluasi maksimal ${LIMITS.assessments}.`);
      const row = await tx.drmAssessment.create({ data: { ...v, villageId: args.villageId, createdById: args.userId }, select: { id: true } });
      return ok({ id: row.id, kind: v.kind, level: v.level });
    })
    .catch(asResult);
}

export async function removeAssessment(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ kind: string; doneOn: string }>> {
  const cur = await db.drmAssessment.findFirst({ where: { id: args.id, villageId: args.villageId }, select: { kind: true, doneOn: true } });
  if (!cur) return fail(404, "Catatan tidak ditemukan.");
  const r = await db.drmAssessment.deleteMany({ where: { id: args.id, villageId: args.villageId } });
  return r.count ? ok({ kind: cur.kind, doneOn: isoDay(cur.doneOn)! }) : fail(404, "Catatan tidak ditemukan.");
}

// ---------------------------------------------------------------------------------------------------------------------
// Peringatan dini
// ---------------------------------------------------------------------------------------------------------------------
export interface AreaOption {
  rw: string;
  rt: string | null;
  residents: number;
}

/** Pilihan wilayah sasaran dari data warga (RT/RW digabung bila hanya beda nol di depan). */
export async function areaOptions(db: PrismaClient, args: { villageId: number }): Promise<AreaOption[]> {
  const g = await db.resident.groupBy({ by: ["rw", "rt"], where: { villageId: args.villageId, rw: { not: null } }, _count: { _all: true }, orderBy: [{ rw: "asc" }, { rt: "asc" }], take: 600 });
  const merged = new Map<string, AreaOption>();
  for (const r of g) {
    if (!r.rw) continue;
    const key = `${normArea(r.rw)}|${r.rt ? normArea(r.rt) : "*"}`;
    const cur = merged.get(key);
    if (cur) cur.residents += r._count._all;
    else merged.set(key, { rw: r.rw, rt: r.rt, residents: r._count._all });
  }
  return [...merged.values()].sort((a, b) => Number(normArea(a.rw)) - Number(normArea(b.rw)) || Number(normArea(a.rt ?? "0")) - Number(normArea(b.rt ?? "0")) || a.rw.localeCompare(b.rw));
}

export interface Recipients {
  accountIds: number[];
  accounts: number;
  devices: number;
  truncated: boolean;
}

/** Akun warga aktif pada sasaran. Dibatasi 20.000 akun per siaran. */
export async function resolveRecipients(db: Pick<PrismaClient, "citizenAccount" | "deviceToken">, args: { villageId: number; targetKind: "ALL" | "AREA"; targets: AreaTarget[] }): Promise<Recipients> {
  const residentWhere: Prisma.ResidentWhereInput = {
    villageId: args.villageId,
    ...(args.targetKind === "AREA" ? { OR: args.targets.map((t) => ({ rw: { in: areaVariants(t.rw) }, ...(t.rt === null ? {} : { rt: { in: areaVariants(t.rt) } }) })) } : {}),
  };
  const rows = await db.citizenAccount.findMany({ where: { villageId: args.villageId, status: "ACTIVE", deletedAt: null, resident: residentWhere }, select: { id: true }, orderBy: { id: "asc" }, take: LIMITS.accountsPerAlert + 1 });
  const truncated = rows.length > LIMITS.accountsPerAlert;
  const accountIds = rows.slice(0, LIMITS.accountsPerAlert).map((r) => r.id);
  let devices = 0;
  for (let i = 0; i < accountIds.length; i += 1000) {
    devices += await db.deviceToken.count({ where: { accountType: "citizen", villageId: args.villageId, accountId: { in: accountIds.slice(i, i + 1000) }, disabledAt: null } });
  }
  return { accountIds, accounts: accountIds.length, devices, truncated };
}

export interface AlertView {
  id: number;
  level: string;
  levelLabel: string;
  hazardType: string | null;
  hazardLabel: string | null;
  title: string;
  message: string;
  targetKind: string;
  targetLabel: string;
  eventId: number | null;
  recipientAccounts: number;
  deviceCount: number;
  status: string;
  createdAt: string;
}

export async function listAlerts(db: PrismaClient, args: { villageId: number; page?: number; pageSize?: number }): Promise<{ rows: AlertView[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.max(1, Math.min(50, args.pageSize ?? 15));
  const page = Math.max(1, Math.min(100000, args.page ?? 1));
  const [total, rows] = await Promise.all([db.drmAlert.count({ where: { villageId: args.villageId } }), db.drmAlert.findMany({ where: { villageId: args.villageId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize })]);
  return {
    total,
    page,
    pageSize,
    rows: rows.map((a) => {
      const targets = Array.isArray(a.targets) ? (a.targets as unknown as AreaTarget[]) : [];
      return {
        id: a.id,
        level: a.level,
        levelLabel: ALERT_LEVELS[a.level as keyof typeof ALERT_LEVELS] ?? a.level,
        hazardType: a.hazardType,
        hazardLabel: a.hazardType ? (HAZARD_TYPES[a.hazardType as keyof typeof HAZARD_TYPES] ?? a.hazardType) : null,
        title: a.title,
        message: a.message,
        targetKind: a.targetKind,
        targetLabel: a.targetKind === "ALL" ? "Seluruh desa" : targets.map(areaLabel).join(", ") || "Wilayah tertentu",
        eventId: a.eventId,
        recipientAccounts: a.recipientAccounts,
        deviceCount: a.deviceCount,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  };
}

/** Tanda tangan sasaran yang dinormalisasi (urutan dan "01" vs "1" tidak membedakan). */
const targetSig = (kind: "ALL" | "AREA", targets: AreaTarget[]): string =>
  kind === "ALL" ? "ALL" : targets.map((t) => `${normArea(t.rw)}|${t.rt === null ? "*" : normArea(t.rt)}`).sort().join(",");

export type PushFn = (villageId: number, accountIds: number[], msg: { title: string; body?: string | null; deepLink?: string | null }) => Promise<number>;

export interface SendResult {
  preview: boolean;
  id: number | null;
  accounts: number;
  devices: number;
  truncated: boolean;
  /** Selesai bila pengiriman push di latar belakang tuntas (tes menunggunya; rute tidak). */
  done: Promise<void>;
}

/**
 * Siaran peringatan dini ke warga: kotak masuk aplikasi (user_notifications, tipe "system") + push Expo yang sudah ada, per RT/RW.
 * Tidak membuat infrastruktur pengiriman baru. `preview` hanya menghitung penerima. Batas {@link LIMITS.alertsPerDay} siaran per 24 jam per desa
 * (dijaga di dalam kunci desa). Push berjalan di latar belakang; hasilnya (jumlah perangkat, status) ditulis ke log.
 */
export async function sendAlert(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown; now?: Date; push?: PushFn }): Promise<Result<SendResult>> {
  const p = parseAlert(args.input);
  if (!p.ok) return invalid(p);
  const v = p.value;
  const now = args.now ?? new Date();
  if (v.eventId) {
    const ev = await db.incidentEvent.findFirst({ where: { id: v.eventId, villageId: args.villageId, domain: "BENCANA" }, select: { id: true } });
    if (!ev) return fail(404, "Kejadian yang dipilih tidak ditemukan.");
  }
  const rec = await resolveRecipients(db, { villageId: args.villageId, targetKind: v.targetKind, targets: v.targets });
  if (v.preview) return ok({ preview: true, id: null, accounts: rec.accounts, devices: rec.devices, truncated: rec.truncated, done: Promise.resolve() });
  if (rec.accounts === 0) return fail(409, "Tidak ada akun warga aktif pada sasaran ini, jadi tidak ada yang dapat menerima notifikasi. Umumkan lewat cara lain (pengeras suara, kentongan, grup RT).");
  // Pratinjau wajib: pengiriman hanya sah bila jumlah penerima yang dilihat operator masih sama (sasaran tidak berubah diam-diam).
  if (v.expectAccounts !== rec.accounts) return fail(409, `Jumlah penerima berubah: pratinjau ${v.expectAccounts ?? 0} akun, sekarang ${rec.accounts} akun. Hitung penerima ulang lalu periksa kembali sebelum mengirim.`);
  const sig = targetSig(v.targetKind, v.targets);

  const created = await db
    .$transaction(async (tx) => {
      await lockVillage(tx, args.villageId);
      const since = new Date(now.getTime() - 24 * 3_600_000);
      const recent = await tx.drmAlert.count({ where: { villageId: args.villageId, createdAt: { gte: since }, status: { not: "FAILED" } } });
      if (recent >= LIMITS.alertsPerDay) return stop(`Batas ${LIMITS.alertsPerDay} siaran per 24 jam tercapai. Gunakan cara lain (pengeras suara, grup RT) atau coba lagi nanti.`, 429);
      // Siaran identik (judul + pesan + sasaran) dalam 2 menit terakhir ditolak: mencegah klik ganda dan permintaan serentak.
      const twin = await tx.drmAlert.findMany({ where: { villageId: args.villageId, createdAt: { gte: new Date(now.getTime() - 2 * 60_000) }, status: { not: "FAILED" }, title: v.title, message: v.message, targetKind: v.targetKind }, select: { targets: true, targetKind: true }, take: 20 });
      if (twin.some((t) => targetSig(t.targetKind as "ALL" | "AREA", Array.isArray(t.targets) ? (t.targets as unknown as AreaTarget[]) : []) === sig)) return stop("Siaran yang sama persis baru saja dikirim (dalam 2 menit terakhir). Periksa riwayat; ubah isi atau tunggu bila memang perlu mengirim lagi.");
      const row = await tx.drmAlert.create({
        data: { villageId: args.villageId, level: v.level, hazardType: v.hazardType, title: v.title, message: v.message, targetKind: v.targetKind, targets: v.targetKind === "AREA" ? (v.targets as unknown as Prisma.InputJsonValue) : Prisma.JsonNull, eventId: v.eventId, recipientAccounts: rec.accounts, status: "SENDING", createdById: args.userId, createdAt: now },
        select: { id: true },
      });
      return ok(row.id);
    })
    .catch(asResult);
  if (!created.ok) return created;
  const alertId = created.data;

  // Label tingkat ditambahkan oleh server di depan judul notifikasi (pengirim tidak dapat memalsukannya).
  const title = `${alertLabel(v.level)} ${v.title}`.slice(0, 160);
  const body = v.message.slice(0, 500);
  try {
    for (let i = 0; i < rec.accountIds.length; i += 1000) {
      await db.userNotification.createMany({ data: rec.accountIds.slice(i, i + 1000).map((accountId) => ({ accountType: "citizen", accountId, villageId: args.villageId, type: "system", title, body })) });
    }
  } catch (e) {
    await db.drmAlert.update({ where: { id: alertId }, data: { status: "FAILED" } }).catch(() => undefined);
    throw e;
  }
  const pushFn = args.push ?? pushToCitizenAccounts;
  const done = (async () => {
    try {
      const devices = await pushFn(args.villageId, rec.accountIds, { title, body });
      await db.drmAlert.update({ where: { id: alertId }, data: { status: "SENT", deviceCount: devices } });
    } catch (e) {
      console.error("sendAlert push failed:", e);
      await db.drmAlert.update({ where: { id: alertId }, data: { status: "FAILED" } }).catch(() => undefined);
    }
  })();
  return ok({ preview: false, id: alertId, accounts: rec.accounts, devices: rec.devices, truncated: rec.truncated, done });
}

// ---------------------------------------------------------------------------------------------------------------------
// Ringkasan modul + kartu Dana Desa
// ---------------------------------------------------------------------------------------------------------------------
export interface Overview {
  counts: { hazards: number; highRiskHazards: number; resources: number; volunteers: number; activeVolunteers: number; plans: number; adoptedPlans: number };
  capacity: { shelter: number; gather: number };
  readiness: Readiness;
}

export async function getOverview(db: PrismaClient, args: { villageId: number; today: string }): Promise<Overview> {
  const v = args.villageId;
  const [readiness, haz, res, vol, plans] = await Promise.all([
    getReadiness(db, args),
    db.drmHazard.groupBy({ by: ["riskLevel"], where: { villageId: v }, _count: { _all: true } }),
    db.drmResource.findMany({ where: { villageId: v }, select: { kind: true, capacity: true }, take: LIMITS.resources }),
    db.drmVolunteer.groupBy({ by: ["status"], where: { villageId: v }, _count: { _all: true } }),
    db.drmPlan.groupBy({ by: ["status"], where: { villageId: v }, _count: { _all: true } }),
  ]);
  const n = (g: { _count: { _all: number } }[]) => g.reduce((a, b) => a + b._count._all, 0);
  return {
    counts: {
      hazards: n(haz),
      highRiskHazards: n(haz.filter((h) => h.riskLevel === "HIGH" || h.riskLevel === "EXTREME")),
      resources: res.length,
      volunteers: n(vol),
      activeVolunteers: n(vol.filter((g) => g.status === "ACTIVE")),
      plans: n(plans),
      adoptedPlans: n(plans.filter((g) => g.status === "DITETAPKAN")),
    },
    capacity: capacityOf(res),
    readiness,
  };
}
