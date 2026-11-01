import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents, toCents } from "@/lib/coop/loan-math";
import { kegiatanName } from "@/lib/apbdes/catalog";
import {
  CHANGE_REASONS,
  INCOMING_LEVELS,
  LIMITS,
  PAGU_SOURCES,
  TEAM_ROLES,
  termInfo,
  type PaguSource,
} from "./catalog";
import {
  parseActivityInput,
  parseDocumentCreate,
  parseDocumentPatch,
  parseIncomingInput,
  parsePaguInput,
  parseTeamInput,
} from "./schema";
import { activityWarnings, buildSteps, paguWarnings, teamWarnings, type Step } from "./steps";

export type { Result };
export { termInfo };
type Db = Prisma.TransactionClient;

const TEAM_HARD_MAX = 20;

const docInclude = {
  plan: true,
  musdesMeeting: true,
  musrenbangMeeting: true,
  legalDocument: true,
  team: { orderBy: { id: "asc" as const } },
  pagu: { orderBy: { source: "asc" as const } },
  incoming: { orderBy: { id: "asc" as const } },
  activities: { orderBy: { id: "asc" as const } },
} satisfies Prisma.RkpdesDocumentInclude;
type DocRow = Prisma.RkpdesDocumentGetPayload<{ include: typeof docInclude }>;

const rupiahStr = (d: Prisma.Decimal | null): string | null => (d ? d.toFixed(2) : null);
const cents = (d: Prisma.Decimal | null): bigint => (d ? (toCents(d.toFixed(2)) ?? 0n) : 0n);

function stepsOf(d: DocRow, now: Date): Step[] {
  const heldOrFinal = (m: { status: string } | null) => (m && (m.status === "HELD" || m.status === "FINAL") ? m : null);
  return buildSteps(
    {
      year: d.year,
      revision: d.revision,
      musdesHeldOn: isoDay(heldOrFinal(d.musdesMeeting) ? d.musdesMeeting!.heldOn : null),
      teamFormedAt: isoDay(d.teamFormedAt),
      paguReceivedAt: isoDay(d.paguReceivedAt),
      draftReadyAt: isoDay(d.draftReadyAt),
      draftApprovedAt: isoDay(d.draftApprovedAt),
      musrenbangHeldOn: isoDay(heldOrFinal(d.musrenbangMeeting) ? d.musrenbangMeeting!.heldOn : null),
      perdesEnactedOn: isoDay(d.legalDocument ? d.legalDocument.enactedAt : null),
      usulanSubmittedAt: isoDay(d.usulanSubmittedAt),
    },
    now,
  );
}

const meetingBrief = (m: DocRow["musdesMeeting"]) => (m ? { id: m.id, title: m.title, status: m.status, scheduledOn: isoDay(m.scheduledOn), heldOn: isoDay(m.heldOn) } : null);

function serializeActivity(a: DocRow["activities"][number]) {
  const view = {
    id: a.id,
    title: a.title,
    description: a.description,
    location: a.location,
    estimatedBudget: rupiahStr(a.estimatedBudget),
    activityCode: a.activityCode,
    activityName: a.activityCode ? kegiatanName(a.activityCode) : null,
    fundSource: a.fundSource,
    method: a.method,
    outputName: a.outputName,
    outputVolume: a.outputVolume ? a.outputVolume.toFixed(2) : null,
    outputUnit: a.outputUnit,
    executorChair: a.executorChair,
    executorSecretary: a.executorSecretary,
    executorTreasurer: a.executorTreasurer,
    executorMembers: a.executorMembers,
    executorHasWoman: a.executorHasWoman,
    rabVerifiedAt: isoDay(a.rabVerifiedAt),
    proposeToRegency: a.proposeToRegency,
    status: a.status,
  };
  return { ...view, warnings: activityWarnings(view) };
}
export type ActivityView = ReturnType<typeof serializeActivity>;

export function serializeDocument(d: DocRow, now: Date) {
  const steps = stepsOf(d, now);
  const activities = d.activities.map(serializeActivity);
  const spendBySource = new Map<string, bigint>();
  let total = 0n;
  for (const a of d.activities) {
    const c = cents(a.estimatedBudget);
    total += c;
    if (a.fundSource) spendBySource.set(a.fundSource, (spendBySource.get(a.fundSource) ?? 0n) + c);
  }
  const paguMap = new Map<PaguSource, bigint>(d.pagu.map((p) => [p.source as PaguSource, p.amountCents]));
  const paguTotal = d.pagu.reduce((s, p) => s + p.amountCents, 0n);
  const plan = d.plan ? { id: d.plan.id, title: d.plan.title, periodStart: d.plan.periodStart, periodEnd: d.plan.periodEnd, ...termInfo(d.plan.periodStart, d.plan.periodEnd) } : null;
  return {
    id: d.id,
    year: d.year,
    revision: d.revision,
    changeReason: d.changeReason,
    changeReasonLabel: d.changeReason ? CHANGE_REASONS[d.changeReason as keyof typeof CHANGE_REASONS] ?? d.changeReason : null,
    plan,
    musdesMeeting: meetingBrief(d.musdesMeeting),
    musrenbangMeeting: meetingBrief(d.musrenbangMeeting),
    teamFormedAt: isoDay(d.teamFormedAt),
    teamDecreeRef: d.teamDecreeRef,
    paguReceivedAt: isoDay(d.paguReceivedAt),
    evaluationText: d.evaluationText,
    draftReadyAt: isoDay(d.draftReadyAt),
    draftMinutesRef: d.draftMinutesRef,
    draftApprovedAt: isoDay(d.draftApprovedAt),
    legalDocument: d.legalDocument
      ? { id: d.legalDocument.id, number: d.legalDocument.number, year: d.legalDocument.year, title: d.legalDocument.title, enactedAt: isoDay(d.legalDocument.enactedAt) }
      : null,
    usulanSubmittedAt: isoDay(d.usulanSubmittedAt),
    usulanRef: d.usulanRef,
    /** Setelah Perdes RKP Desa ditetapkan, isi dikunci; perubahan lewat RKP Desa perubahan (Pasal 49-50). */
    locked: d.legalDocumentId !== null,
    steps,
    progress: { done: steps.filter((s) => s.state === "done").length, total: steps.length },
    team: d.team.map((t) => ({ id: t.id, residentId: t.residentId, name: t.name, role: t.role, roleLabel: TEAM_ROLES[t.role as keyof typeof TEAM_ROLES] ?? t.role, position: t.position, gender: t.gender })),
    teamWarnings: teamWarnings(d.team),
    pagu: d.pagu.map((p) => ({ id: p.id, source: p.source, label: PAGU_SOURCES[p.source as PaguSource] ?? p.source, amount: fromCents(p.amountCents), note: p.note })),
    paguTotal: fromCents(paguTotal),
    incoming: d.incoming.map((p) => ({ id: p.id, level: p.level, levelLabel: INCOMING_LEVELS[p.level as keyof typeof INCOMING_LEVELS] ?? p.level, agency: p.agency, name: p.name, location: p.location, amount: p.amountCents === null ? null : fromCents(p.amountCents), note: p.note })),
    activities,
    activitySummary: {
      count: activities.length,
      totalBudget: fromCents(total),
      bySource: Object.fromEntries([...spendBySource].map(([k, v]) => [k, fromCents(v)])),
      complete: activities.filter((a) => a.warnings.length === 0).length,
      proposed: activities.filter((a) => a.proposeToRegency).length,
    },
    paguWarnings: paguWarnings(paguMap, spendBySource, (s) => PAGU_SOURCES[s as PaguSource] ?? s),
  };
}
export type DocumentView = ReturnType<typeof serializeDocument>;

async function lockDoc(tx: Db, villageId: number, id: number): Promise<DocRow | null> {
  await tx.$queryRaw`SELECT id FROM rkpdes_documents WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
  return tx.rkpdesDocument.findFirst({ where: { id, villageId }, include: docInclude });
}

const NOT_FOUND = () => fail(404, "RKP Desa tidak ditemukan.");
const LOCKED_MSG = "RKP Desa ini sudah ditetapkan dengan Peraturan Desa dan terkunci. Perubahan dilakukan lewat RKP Desa perubahan (Permendagri 114/2014 Pasal 49-50).";
const LOCKED = () => fail(409, LOCKED_MSG);

export async function listDocuments(db: Db, villageId: number, now: Date) {
  const [docs, plans, meetingsCount] = await Promise.all([
    db.rkpdesDocument.findMany({ where: { villageId }, orderBy: [{ year: "desc" }, { revision: "desc" }], include: docInclude }),
    db.rpjmdesPlan.findMany({ where: { villageId }, orderBy: [{ periodStart: "desc" }, { id: "desc" }] }),
    db.villageMeeting.count({ where: { villageId } }),
  ]);
  return {
    documents: docs.map((d) => {
      const steps = stepsOf(d, now);
      const next = steps.find((s) => s.state !== "done") ?? null;
      return {
        id: d.id,
        year: d.year,
        revision: d.revision,
        locked: d.legalDocumentId !== null,
        activityCount: d.activities.length,
        progress: { done: steps.filter((s) => s.state === "done").length, total: steps.length },
        overdue: steps.filter((s) => s.state === "overdue").length,
        next: next ? { key: next.key, label: next.label, due: next.due, state: next.state } : null,
      };
    }),
    plans: plans.map((p) => ({ id: p.id, title: p.title, periodStart: p.periodStart, periodEnd: p.periodEnd, status: p.status, ...termInfo(p.periodStart, p.periodEnd) })),
    meetingsCount,
  };
}

export async function getDocument(db: Db, villageId: number, id: number, now: Date) {
  const d = await db.rkpdesDocument.findFirst({ where: { id, villageId }, include: docInclude });
  if (!d) return null;
  const [meetings, perdes] = await Promise.all([
    db.villageMeeting.findMany({
      where: { villageId, kind: { in: ["MUSDES_PERENCANAAN", "MUSRENBANGDES", "MUSDES_PERUBAHAN"] }, status: { in: ["HELD", "FINAL"] }, OR: [{ planYear: d.year }, { planYear: null }] },
      orderBy: { scheduledOn: "desc" },
      take: 50,
      select: { id: true, kind: true, title: true, status: true, heldOn: true },
    }),
    db.legalDocument.findMany({ where: { villageId, type: "PERDES", status: "BERLAKU" }, orderBy: { enactedAt: "desc" }, take: 50, select: { id: true, number: true, year: true, title: true, enactedAt: true } }),
  ]);
  return {
    document: serializeDocument(d, now),
    options: {
      meetings: meetings.map((m) => ({ id: m.id, kind: m.kind, title: m.title, status: m.status, heldOn: isoDay(m.heldOn) })),
      perdes: perdes.map((p) => ({ id: p.id, number: p.number, year: p.year, title: p.title, enactedAt: isoDay(p.enactedAt) })),
    },
  };
}

export async function createDocument(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseDocumentCreate(args.input);
  if (!p.ok) return invalid(p);
  const count = await db.rkpdesDocument.count({ where: { villageId: args.villageId } });
  if (count >= LIMITS.documentsPerVillage) return fail(409, `Maksimal ${LIMITS.documentsPerVillage} dokumen RKP Desa per desa.`);
  const { year, perubahan, changeReason } = p.value;
  const plan = await db.rpjmdesPlan.findFirst({ where: { villageId: args.villageId, periodStart: { lte: year }, periodEnd: { gte: year } }, orderBy: [{ periodStart: "desc" }, { id: "desc" }] });
  let revision = 0;
  if (perubahan) {
    const base = await db.rkpdesDocument.findFirst({ where: { villageId: args.villageId, year, revision: 0 } });
    if (!base) return fail(409, `RKP Desa ${year} yang awal belum ada. Buat dan tetapkan dahulu sebelum membuat perubahan.`);
    if (base.legalDocumentId === null) return fail(409, `RKP Desa ${year} yang awal belum ditetapkan dengan Peraturan Desa; belum perlu diubah lewat perubahan.`);
    const last = await db.rkpdesDocument.aggregate({ where: { villageId: args.villageId, year }, _max: { revision: true } });
    revision = (last._max.revision ?? 0) + 1;
    if (revision > LIMITS.revisions) return fail(409, `Maksimal ${LIMITS.revisions} perubahan RKP Desa untuk satu tahun.`);
  }
  try {
    const row = await db.rkpdesDocument.create({ data: { villageId: args.villageId, year, revision, changeReason, planId: plan?.id ?? null, createdById: args.userId } });
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, perubahan ? "Perubahan RKP Desa ini baru saja dibuat oleh pengguna lain." : `RKP Desa ${year} sudah ada.`);
    throw e;
  }
}

export async function patchDocument(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseDocumentPatch(args.input);
  if (!p.ok) return invalid(p);
  const patch = p.value;
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.id);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) {
      const allowed = new Set(["usulanSubmittedAt", "usulanRef"]);
      if (Object.keys(patch).some((k) => !allowed.has(k))) return LOCKED();
    }
    if (patch.musdesMeetingId !== undefined && patch.musdesMeetingId !== null) {
      const m = await tx.villageMeeting.findFirst({ where: { id: patch.musdesMeetingId, villageId: args.villageId } });
      if (!m || m.kind !== "MUSDES_PERENCANAAN") return fail(400, "Pilih Musyawarah Desa perencanaan pembangunan milik desa ini.");
    }
    if (patch.musrenbangMeetingId !== undefined && patch.musrenbangMeetingId !== null) {
      const want = d.revision > 0 ? "MUSDES_PERUBAHAN" : "MUSRENBANGDES";
      const m = await tx.villageMeeting.findFirst({ where: { id: patch.musrenbangMeetingId, villageId: args.villageId } });
      if (!m || m.kind !== want) return fail(400, d.revision > 0 ? "Pilih Musrenbangdes khusus perubahan milik desa ini." : "Pilih Musrenbangdes milik desa ini.");
    }
    if (patch.legalDocumentId !== undefined && patch.legalDocumentId !== null) {
      const l = await tx.legalDocument.findFirst({ where: { id: patch.legalDocumentId, villageId: args.villageId } });
      if (!l || l.type !== "PERDES" || l.status !== "BERLAKU") return fail(400, "Pilih Peraturan Desa yang berlaku milik desa ini.");
      const used = await tx.rkpdesDocument.findFirst({ where: { legalDocumentId: l.id, NOT: { id: d.id } }, select: { id: true } });
      if (used) return fail(409, "Peraturan Desa ini sudah dipakai oleh dokumen RKP Desa lain.");
    }
    await tx.rkpdesDocument.update({ where: { id: d.id }, data: patch });
    return { ok: true as const, data: { id: d.id } };
  });
}

/** Persetujuan rancangan oleh Kepala Desa (Pasal 45). `date` null = cabut persetujuan (selama belum ada Musrenbangdes terlaksana). */
export async function approveDraft(db: PrismaClient, args: { villageId: number; id: number; userId: number | null; date: Date | null }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.id);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    if (args.date === null) {
      if (d.musrenbangMeeting && (d.musrenbangMeeting.status === "HELD" || d.musrenbangMeeting.status === "FINAL")) return fail(409, "Persetujuan tidak dapat dicabut karena Musrenbangdes sudah terlaksana.");
      await tx.rkpdesDocument.update({ where: { id: d.id }, data: { draftApprovedAt: null, draftApprovedById: null } });
      return { ok: true as const, data: { id: d.id } };
    }
    if (!d.draftReadyAt) return fail(409, "Rancangan RKP Desa belum ditandai selesai oleh tim penyusun (berita acara tim, Pasal 44).");
    await tx.rkpdesDocument.update({ where: { id: d.id }, data: { draftApprovedAt: args.date, draftApprovedById: args.userId } });
    return { ok: true as const, data: { id: d.id } };
  });
}

export async function deleteDocument(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.id);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    if (d.activities.length > 0) return fail(409, "Hapus atau pindahkan kegiatan dalam dokumen ini lebih dahulu.");
    await tx.rkpdesDocument.delete({ where: { id: d.id } });
    return { ok: true as const, data: { id: d.id } };
  });
}

// --- Tim penyusun ---------------------------------------------------------

export async function addTeamMember(db: PrismaClient, args: { villageId: number; documentId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseTeamInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    if (d.team.length >= TEAM_HARD_MAX) return fail(409, `Maksimal ${TEAM_HARD_MAX} anggota tim tercatat (aturan: 7-11 orang).`);
    let name = p.value.name;
    let gender = p.value.gender;
    if (p.value.residentId !== null) {
      const r = await tx.resident.findFirst({ where: { id: p.value.residentId, villageId: args.villageId }, select: { name: true, gender: true } });
      if (!r) return fail(400, "Warga tidak ditemukan di desa ini.");
      name = name ?? r.name;
      gender = gender ?? (r.gender === "Perempuan" ? "P" : r.gender === "Laki-laki" ? "L" : null);
      if (d.team.some((t) => t.residentId === p.value.residentId)) return fail(409, "Warga ini sudah ada dalam tim.");
    }
    const row = await tx.rkpdesTeamMember.create({ data: { documentId: d.id, residentId: p.value.residentId, name: name!, role: p.value.role, position: p.value.position, gender } });
    return { ok: true as const, data: { id: row.id } };
  });
}

export async function removeTeamMember(db: PrismaClient, args: { villageId: number; documentId: number; memberId: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    const r = await tx.rkpdesTeamMember.deleteMany({ where: { id: args.memberId, documentId: d.id } });
    if (r.count === 0) return fail(404, "Anggota tim tidak ditemukan.");
    return { ok: true as const, data: { id: args.memberId } };
  });
}

// --- Pagu indikatif dan program yang masuk Desa ----------------------------

export async function upsertPagu(db: PrismaClient, args: { villageId: number; documentId: number; input: unknown }): Promise<Result<{ source: string }>> {
  const p = parsePaguInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    await tx.rkpdesPaguIndicative.upsert({
      where: { documentId_source: { documentId: d.id, source: p.value.source } },
      create: { documentId: d.id, source: p.value.source, amountCents: p.value.amountCents, note: p.value.note },
      update: { amountCents: p.value.amountCents, note: p.value.note },
    });
    return { ok: true as const, data: { source: p.value.source } };
  });
}

export async function removePagu(db: PrismaClient, args: { villageId: number; documentId: number; source: string }): Promise<Result<{ source: string }>> {
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    const r = await tx.rkpdesPaguIndicative.deleteMany({ where: { documentId: d.id, source: args.source } });
    if (r.count === 0) return fail(404, "Pagu tidak ditemukan.");
    return { ok: true as const, data: { source: args.source } };
  });
}

export async function addIncoming(db: PrismaClient, args: { villageId: number; documentId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseIncomingInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    if (d.incoming.length >= LIMITS.incomingPerDocument) return fail(409, `Maksimal ${LIMITS.incomingPerDocument} program masuk Desa per dokumen.`);
    const row = await tx.rkpdesIncomingProgram.create({ data: { documentId: d.id, ...p.value } });
    return { ok: true as const, data: { id: row.id } };
  });
}

export async function removeIncoming(db: PrismaClient, args: { villageId: number; documentId: number; programId: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    const r = await tx.rkpdesIncomingProgram.deleteMany({ where: { id: args.programId, documentId: d.id } });
    if (r.count === 0) return fail(404, "Program tidak ditemukan.");
    return { ok: true as const, data: { id: args.programId } };
  });
}

// --- Kegiatan --------------------------------------------------------------

export async function saveActivity(db: PrismaClient, args: { villageId: number; documentId: number; activityId?: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parseActivityInput(args.input);
  if (!p.ok) return invalid(p);
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    const data = {
      title: p.value.title,
      description: p.value.description,
      location: p.value.location,
      estimatedBudget: p.value.estimatedBudget,
      activityCode: p.value.activityCode,
      fundSource: p.value.fundSource,
      method: p.value.method,
      outputName: p.value.outputName,
      outputVolume: p.value.outputVolume,
      outputUnit: p.value.outputUnit,
      executorChair: p.value.executorChair,
      executorSecretary: p.value.executorSecretary,
      executorTreasurer: p.value.executorTreasurer,
      executorMembers: p.value.executorMembers,
      executorHasWoman: p.value.executorHasWoman,
      rabVerifiedAt: p.value.rabVerifiedAt,
      proposeToRegency: p.value.proposeToRegency,
    };
    if (args.activityId !== undefined) {
      const r = await tx.rkpdesActivity.updateMany({ where: { id: args.activityId, documentId: d.id }, data });
      if (r.count === 0) return fail(404, "Kegiatan tidak ditemukan.");
      return { ok: true as const, data: { id: args.activityId } };
    }
    if (d.planId === null) return fail(409, `Belum ada dokumen RPJM Desa yang mencakup tahun ${d.year}. Buat RPJM Desa di menu RPJM Desa lebih dahulu, lalu buat ulang dokumen RKP Desa ini.`);
    if (d.activities.length >= LIMITS.activitiesPerDocument) return fail(409, `Maksimal ${LIMITS.activitiesPerDocument} kegiatan per dokumen.`);
    const row = await tx.rkpdesActivity.create({ data: { ...data, planId: d.planId, documentId: d.id, year: d.year, source: "internal", status: "planned", sdgGoalIds: [] } });
    return { ok: true as const, data: { id: row.id } };
  });
}

export async function removeActivity(db: PrismaClient, args: { villageId: number; documentId: number; activityId: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const d = await lockDoc(tx, args.villageId, args.documentId);
    if (!d) return NOT_FOUND();
    if (d.legalDocumentId !== null) return LOCKED();
    const r = await tx.rkpdesActivity.deleteMany({ where: { id: args.activityId, documentId: d.id } });
    if (r.count === 0) return fail(404, "Kegiatan tidak ditemukan.");
    return { ok: true as const, data: { id: args.activityId } };
  });
}

