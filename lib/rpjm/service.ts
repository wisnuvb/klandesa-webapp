import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { kegiatanName } from "@/lib/apbdes/catalog";
import { termInfo } from "@/lib/rkpdes/catalog";
import { CHANGE_REASONS, FIELDS, LIMITS, MEETING_KINDS, METHODS, PAGU_SOURCES, TEAM_ROLES, type FieldCode } from "./catalog";
import { budgetMatrix } from "./calc";
import { parsePlanCreate, parsePlanPatch, parseProgramInput, parseReopen, parseTeamInput } from "./schema";
import { buildSteps, draftReadyBlockers, perdesBlockers, planFlags, programWarnings, teamWarnings } from "./steps";

export type { Result };
type Db = Prisma.TransactionClient;

const planInclude = {
  musdesMeeting: true,
  draftMeeting: true,
  legalDocument: true,
  rpjmTeam: { orderBy: { id: "asc" as const } },
  rpjmPrograms: { orderBy: [{ year: "asc" as const }, { fieldCode: "asc" as const }, { id: "asc" as const }], include: { _count: { select: { rkpActivities: true } } } },
  rpjmEvents: { orderBy: { id: "desc" as const }, take: 20 },
} satisfies Prisma.RpjmdesPlanInclude;
type PlanRow = Prisma.RpjmdesPlanGetPayload<{ include: typeof planInclude }>;

const heldOrFinal = (m: { status: string } | null | undefined) => Boolean(m && (m.status === "HELD" || m.status === "FINAL"));
const meetingBrief = (m: PlanRow["musdesMeeting"]) => (m ? { id: m.id, kind: m.kind, title: m.title, status: m.status, scheduledOn: isoDay(m.scheduledOn), heldOn: isoDay(m.heldOn) } : null);

/** Dokumen yang belum disentuh alur tahapan sama sekali (RPJM Desa lama): tidak dinilai kelengkapannya. */
function isUntouched(p: PlanRow | (Omit<PlanRow, never>)): boolean {
  return (
    p.headInauguratedOn === null &&
    p.policyDirection === null &&
    p.teamFormedAt === null &&
    p.reviewDoneAt === null &&
    p.musdesMeetingId === null &&
    p.draftMeetingId === null &&
    p.draftReadyAt === null &&
    p.legalDocumentId === null &&
    !p.enactedBeforeApp &&
    p.sdgsPlanRecordedAt === null &&
    p.rpjmTeam.length === 0 &&
    p.rpjmPrograms.length === 0
  );
}

function stepsOf(p: PlanRow, now: Date) {
  return buildSteps(
    {
      headInauguratedOn: isoDay(p.headInauguratedOn),
      teamFormedAt: isoDay(p.teamFormedAt),
      reviewDoneAt: isoDay(p.reviewDoneAt),
      musdesHeldOn: heldOrFinal(p.musdesMeeting) ? isoDay(p.musdesMeeting!.heldOn) : null,
      draftReadyAt: isoDay(p.draftReadyAt),
      draftApprovedAt: isoDay(p.draftApprovedAt),
      draftMeetingHeldOn: heldOrFinal(p.draftMeeting) ? isoDay(p.draftMeeting!.heldOn) : null,
      perdesEnactedOn: p.legalDocument ? isoDay(p.legalDocument.enactedAt) : null,
      enactedBeforeApp: p.enactedBeforeApp,
      amendment: p.reopenCount > 0,
    },
    now,
  );
}

function serializeProgram(r: PlanRow["rpjmPrograms"][number]) {
  const view = {
    id: r.id,
    fieldCode: r.fieldCode,
    fieldLabel: FIELDS[r.fieldCode as FieldCode] ?? r.fieldCode,
    year: r.year,
    title: r.title,
    description: r.description,
    activityCode: r.activityCode,
    activityName: r.activityCode ? kegiatanName(r.activityCode) : null,
    location: r.location,
    outputVolume: r.outputVolume ? r.outputVolume.toFixed(2) : null,
    outputUnit: r.outputUnit,
    benefit: r.benefit,
    budget: r.budgetCents === null ? null : fromCents(r.budgetCents),
    fundSource: r.fundSource,
    method: r.method,
    rkpCount: r._count.rkpActivities,
  };
  return { ...view, warnings: programWarnings(view) };
}
export type ProgramView = ReturnType<typeof serializeProgram>;

export function serializePlan(p: PlanRow, now: Date) {
  const steps = stepsOf(p, now);
  const programs = p.rpjmPrograms.map(serializeProgram);
  const matrix = budgetMatrix(
    p.rpjmPrograms.map((r) => ({ year: r.year, fieldCode: r.fieldCode, budgetCents: r.budgetCents })),
    p.periodStart,
    p.periodEnd,
  );
  const untouched = isUntouched(p);
  const flags = planFlags(
    {
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      vision: p.vision,
      mission: p.mission,
      policyDirection: p.policyDirection,
      headInauguratedOn: isoDay(p.headInauguratedOn),
      perdesEnactedOn: p.legalDocument ? isoDay(p.legalDocument.enactedAt) : null,
      locked: p.legalDocumentId !== null,
      programs: p.rpjmPrograms.map((r) => ({ year: r.year, fieldCode: r.fieldCode })),
      sdgsPlanRecordedAt: isoDay(p.sdgsPlanRecordedAt),
      perdesOverdueDue: steps.find((s) => s.key === "perdes" && s.state === "overdue")?.due ?? null,
      untouched,
    },
    now,
  );
  const locked = p.legalDocumentId !== null;
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    ...termInfo(p.periodStart, p.periodEnd),
    vision: p.vision,
    mission: p.mission,
    policyDirection: p.policyDirection,
    headInauguratedOn: isoDay(p.headInauguratedOn),
    teamFormedAt: isoDay(p.teamFormedAt),
    teamDecreeRef: p.teamDecreeRef,
    reviewDoneAt: isoDay(p.reviewDoneAt),
    reviewMinutesRef: p.reviewMinutesRef,
    reviewSummary: p.reviewSummary,
    musdesMeeting: meetingBrief(p.musdesMeeting),
    draftMeeting: meetingBrief(p.draftMeeting),
    draftReadyAt: isoDay(p.draftReadyAt),
    draftMinutesRef: p.draftMinutesRef,
    draftApprovedAt: isoDay(p.draftApprovedAt),
    legalDocument: p.legalDocument ? { id: p.legalDocument.id, number: p.legalDocument.number, year: p.legalDocument.year, title: p.legalDocument.title, enactedAt: isoDay(p.legalDocument.enactedAt) } : null,
    enactedBeforeApp: p.enactedBeforeApp,
    sdgsPlanRecordedAt: isoDay(p.sdgsPlanRecordedAt),
    sdgsPlanNote: p.sdgsPlanNote,
    reopenCount: p.reopenCount,
    /** Setelah Perdes dihubungkan isi dikunci; perubahan lewat pembukaan kunci beralasan (Pasal 28; PP 16/2026 Pasal 148). */
    locked,
    untouched,
    steps,
    progress: { done: steps.filter((s) => s.state === "done").length, total: steps.length },
    gates: {
      draftReady: draftReadyBlockers({ vision: p.vision, mission: p.mission, policyDirection: p.policyDirection, programCount: p.rpjmPrograms.length }),
      perdes: perdesBlockers({ draftReadyAt: isoDay(p.draftReadyAt), draftApprovedAt: isoDay(p.draftApprovedAt), draftMeetingHeld: heldOrFinal(p.draftMeeting), enactedBeforeApp: p.enactedBeforeApp }),
    },
    team: p.rpjmTeam.map((t) => ({ id: t.id, residentId: t.residentId, name: t.name, role: t.role, roleLabel: TEAM_ROLES[t.role as keyof typeof TEAM_ROLES] ?? t.role, position: t.position, gender: t.gender })),
    teamWarnings: teamWarnings(p.rpjmTeam),
    programs,
    summary: {
      count: programs.length,
      complete: programs.filter((x) => x.warnings.length === 0).length,
      totalBudget: fromCents(matrix.total),
      linkedToRkp: programs.filter((x) => x.rkpCount > 0).length,
    },
    matrix: {
      years: matrix.years,
      fields: matrix.fields.map((f) => ({ code: f.code, label: f.label, count: f.count, perYear: f.perYear.map(fromCents), total: fromCents(f.total) })),
      yearTotals: matrix.yearTotals.map(fromCents),
      total: fromCents(matrix.total),
      outside: { count: matrix.outside.count, total: fromCents(matrix.outside.total) },
    },
    flags,
    needsAdjustment: flags.some((f) => f.level === "perlu"),
    events: p.rpjmEvents.map((e) => ({ id: e.id, kind: e.kind, reason: e.reason, reasonLabel: e.reason ? CHANGE_REASONS[e.reason as keyof typeof CHANGE_REASONS] ?? e.reason : null, note: e.note, createdAt: e.createdAt.toISOString() })),
  };
}
export type PlanView = ReturnType<typeof serializePlan>;

const NOT_FOUND = () => fail(404, "RPJM Desa tidak ditemukan.");
const LOCKED_MSG = "RPJM Desa ini sudah ditetapkan dengan Peraturan Desa dan terkunci. Perubahan dilakukan lewat pembukaan kunci beralasan, dibahas dalam musyawarah, lalu ditetapkan dengan Peraturan Desa (Permendagri 114/2014 Pasal 28; PP 16/2026 Pasal 148).";
const LOCKED = () => fail(409, LOCKED_MSG);

async function lockPlan(tx: Db, villageId: number, id: number): Promise<PlanRow | null> {
  await tx.$queryRaw`SELECT id FROM rpjmdes_plans WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
  return tx.rpjmdesPlan.findFirst({ where: { id, villageId }, include: planInclude });
}

export async function listPlans(db: Db, villageId: number, now: Date) {
  const rows = await db.rpjmdesPlan.findMany({ where: { villageId }, orderBy: [{ periodStart: "desc" }, { id: "desc" }], include: planInclude });
  return {
    plans: rows.map((p) => {
      const v = serializePlan(p, now);
      const next = v.steps.find((s) => s.state !== "done") ?? null;
      return {
        id: v.id,
        title: v.title,
        status: v.status,
        periodStart: v.periodStart,
        periodEnd: v.periodEnd,
        termYears: v.termYears,
        locked: v.locked,
        untouched: v.untouched,
        enactedBeforeApp: v.enactedBeforeApp,
        programCount: v.summary.count,
        totalBudget: v.summary.totalBudget,
        progress: v.progress,
        overdue: v.steps.filter((s) => s.state === "overdue").length,
        next: next ? { key: next.key, label: next.label, due: next.due, state: next.state } : null,
        needsAdjustment: v.needsAdjustment,
        flagCount: v.flags.filter((f) => f.level === "perlu").length,
        topFlag: v.flags.find((f) => f.level === "perlu")?.message ?? null,
      };
    }),
  };
}

export async function getPlan(db: Db, villageId: number, id: number, now: Date) {
  const p = await db.rpjmdesPlan.findFirst({ where: { id, villageId }, include: planInclude });
  if (!p) return null;
  const kinds = [...new Set([...MEETING_KINDS.musdes, ...MEETING_KINDS.draft, ...MEETING_KINDS.draftAmendment])];
  const [meetings, perdes] = await Promise.all([
    db.villageMeeting.findMany({ where: { villageId, kind: { in: kinds }, status: { in: ["HELD", "FINAL"] } }, orderBy: { scheduledOn: "desc" }, take: 60, select: { id: true, kind: true, title: true, status: true, heldOn: true } }),
    db.legalDocument.findMany({ where: { villageId, type: "PERDES", status: "BERLAKU" }, orderBy: { enactedAt: "desc" }, take: 50, select: { id: true, number: true, year: true, title: true, enactedAt: true } }),
  ]);
  return {
    plan: serializePlan(p, now),
    options: {
      meetings: meetings.map((m) => ({ id: m.id, kind: m.kind, title: m.title, status: m.status, heldOn: isoDay(m.heldOn) })),
      perdes: perdes.map((x) => ({ id: x.id, number: x.number, year: x.year, title: x.title, enactedAt: isoDay(x.enactedAt) })),
    },
  };
}

export async function createPlan(db: PrismaClient, args: { villageId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p = parsePlanCreate(args.input);
  if (!p.ok) return invalid(p);
  const count = await db.rpjmdesPlan.count({ where: { villageId: args.villageId } });
  if (count >= LIMITS.plansPerVillage) return fail(409, `Maksimal ${LIMITS.plansPerVillage} dokumen RPJM Desa per desa.`);
  const row = await db.rpjmdesPlan.create({
    data: { villageId: args.villageId, title: p.value.title, periodStart: p.value.periodStart, periodEnd: p.value.periodEnd, headInauguratedOn: p.value.headInauguratedOn, status: "draft" },
  });
  return { ok: true, data: { id: row.id } };
}

/** Kunci yang masih boleh diubah setelah Perdes ditetapkan: catatan administratif saja. */
const LOCKED_ALLOWED = new Set(["sdgsPlanRecordedAt", "sdgsPlanNote"]);

/** Mencatat pencabutan persetujuan Kepala Desa yang terjadi otomatis karena isi berubah. */
async function logRevoke(tx: Db, villageId: number, planId: number, userId: number | null, what: string) {
  await tx.rpjmEvent.create({ data: { villageId, planId, kind: "REVOKE", reason: null, note: `Persetujuan Kepala Desa dicabut otomatis: ${what}. Rancangan perlu disetujui ulang.`.slice(0, 300), createdById: userId } });
}

/**
 * Isi rancangan berubah setelah disetujui Kepala Desa: persetujuan dicabut (dan penanda selesai bila isi tak lagi memenuhi gerbang).
 * Mengubah isi setelah musyawarah tetap sah (Pasal 27 ayat 1: perbaikan berdasarkan kesepakatan), tetapi harus disetujui ulang.
 */
async function revokeApprovalOnChange(tx: Db, p: PlanRow, userId: number | null, what: string, programCountAfter: number) {
  if (!p.draftApprovedAt) return;
  const blockers = draftReadyBlockers({ vision: p.vision, mission: p.mission, policyDirection: p.policyDirection, programCount: programCountAfter });
  await tx.rpjmdesPlan.update({ where: { id: p.id }, data: { draftApprovedAt: null, draftApprovedById: null, ...(blockers.length ? { draftReadyAt: null } : {}) } });
  await logRevoke(tx, p.villageId, p.id, userId, what);
}

export async function patchPlan(
  db: PrismaClient,
  args: { villageId: number; id: number; userId: number | null; /** izin approve (Kepala Desa/admin) */ canApprove: boolean; input: unknown },
): Promise<Result<{ id: number }>> {
  const parsed = parsePlanPatch(args.input);
  if (!parsed.ok) return invalid(parsed);
  const { enactedReason, ...patch } = parsed.value;
  const meetingIds = [...new Set([patch.musdesMeetingId, patch.draftMeetingId].filter((x): x is number => typeof x === "number"))].sort((a, b) => a - b);
  const legalId = typeof patch.legalDocumentId === "number" ? patch.legalDocumentId : null;
  return db.$transaction(async (tx) => {
    // Urutan kunci seragam: musyawarah (menurut id), lalu Perdes, lalu baris dokumen. Pernyataan pertama transaksi.
    // Tanpa ini dua RPJM yang menautkan musyawarah/Perdes yang sama bersamaan sama-sama lolos pemeriksaan "sudah dipakai".
    if (meetingIds.length) await tx.$queryRaw`SELECT id FROM village_meetings WHERE id IN (${Prisma.join(meetingIds)}) AND villageId = ${args.villageId} ORDER BY id FOR UPDATE`;
    if (legalId !== null) await tx.$queryRaw`SELECT id FROM legal_documents WHERE id = ${legalId} AND villageId = ${args.villageId} FOR UPDATE`;
    const p = await lockPlan(tx, args.villageId, args.id);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId !== null && Object.keys(patch).some((k) => !LOCKED_ALLOWED.has(k))) return LOCKED();

    // Penanda "Perdes sudah ada sebelum aplikasi" melewati gerbang: hanya pemegang izin approve, wajib alasan, hanya bersama penautan Perdes.
    const bypass = patch.enactedBeforeApp === true && !p.enactedBeforeApp;
    if (bypass) {
      if (!args.canApprove) return fail(403, "Hanya Kepala Desa atau admin yang dapat mencatat Peraturan Desa sebagai sudah ada sebelum memakai aplikasi.");
      if (!enactedReason || enactedReason.length < 10) return invalid({ errors: ["Jelaskan alasannya (paling sedikit 10 karakter)."], fieldErrors: { enactedReason: "Jelaskan alasannya (paling sedikit 10 karakter)." } });
      if (legalId === null) return fail(400, "Penanda ini hanya dapat dipasang bersamaan dengan menghubungkan Peraturan Desa.");
    }

    const start = patch.periodStart ?? p.periodStart;
    const end = patch.periodEnd ?? p.periodEnd;
    if (end < start) return fail(400, "Tahun akhir tidak boleh sebelum tahun awal.");
    if (end - start + 1 > LIMITS.maxPeriodYears) return fail(400, `Periode maksimal ${LIMITS.maxPeriodYears} tahun.`);
    const periodChanged = (patch.periodStart !== undefined && patch.periodStart !== p.periodStart) || (patch.periodEnd !== undefined && patch.periodEnd !== p.periodEnd);
    if (periodChanged) {
      const out = p.rpjmPrograms.filter((r) => r.year < start || r.year > end).length;
      if (out > 0) return fail(409, `Ada ${out} program di luar periode ${start}-${end}. Ubah atau hapus program itu lebih dahulu.`);
    }

    const used = async (meetingId: number) => tx.rpjmdesPlan.findFirst({ where: { NOT: { id: p.id }, OR: [{ musdesMeetingId: meetingId }, { draftMeetingId: meetingId }] }, select: { id: true } });
    if (patch.musdesMeetingId !== undefined && patch.musdesMeetingId !== null) {
      const m = await tx.villageMeeting.findFirst({ where: { id: patch.musdesMeetingId, villageId: args.villageId } });
      if (!m || !(MEETING_KINDS.musdes as readonly string[]).includes(m.kind)) return fail(400, "Pilih Musyawarah Desa perencanaan pembangunan milik desa ini.");
      if (await used(m.id)) return fail(409, "Musyawarah ini sudah dipakai oleh dokumen RPJM Desa lain.");
    }
    let draftMeeting = p.draftMeeting;
    if (patch.draftMeetingId !== undefined) {
      if (patch.draftMeetingId === null) draftMeeting = null;
      else {
        const m = await tx.villageMeeting.findFirst({ where: { id: patch.draftMeetingId, villageId: args.villageId } });
        const allowed: readonly string[] = p.reopenCount > 0 ? [...MEETING_KINDS.draft, ...MEETING_KINDS.draftAmendment] : MEETING_KINDS.draft;
        if (!m || !allowed.includes(m.kind)) return fail(400, "Pilih Musrenbangdes atau Musyawarah Desa milik desa ini untuk membahas rancangan.");
        if (await used(m.id)) return fail(409, "Musyawarah ini sudah dipakai oleh dokumen RPJM Desa lain.");
        draftMeeting = m as unknown as typeof p.draftMeeting;
      }
    }

    const vision = patch.vision !== undefined ? patch.vision : p.vision;
    const mission = patch.mission !== undefined ? patch.mission : p.mission;
    const policy = patch.policyDirection !== undefined ? patch.policyDirection : p.policyDirection;
    const draftReadyAt = patch.draftReadyAt !== undefined ? patch.draftReadyAt : p.draftReadyAt;
    const enactedBeforeApp = patch.enactedBeforeApp !== undefined ? patch.enactedBeforeApp : p.enactedBeforeApp;

    if (patch.draftReadyAt) {
      const b = draftReadyBlockers({ vision, mission, policyDirection: policy, programCount: p.rpjmPrograms.length });
      if (b.length) return fail(409, "Rancangan belum dapat ditandai selesai: " + b.join(" "));
    }
    if (patch.draftReadyAt === null && p.draftApprovedAt) return fail(409, "Cabut persetujuan Kepala Desa lebih dahulu sebelum membatalkan penanda rancangan selesai.");

    // Isi berubah setelah disetujui: persetujuan dicabut (juga bila Perdes dihubungkan pada permintaan yang sama).
    const contentChanged =
      (patch.vision !== undefined && patch.vision !== p.vision) ||
      (patch.mission !== undefined && patch.mission !== p.mission) ||
      (patch.policyDirection !== undefined && patch.policyDirection !== p.policyDirection) ||
      (patch.reviewSummary !== undefined && patch.reviewSummary !== p.reviewSummary) ||
      periodChanged;
    const revokes = Boolean(p.draftApprovedAt && contentChanged);
    const revokeData: Prisma.RpjmdesPlanUncheckedUpdateInput = {};
    if (revokes) {
      revokeData.draftApprovedAt = null;
      revokeData.draftApprovedById = null;
      if (patch.draftReadyAt === undefined && draftReadyBlockers({ vision, mission, policyDirection: policy, programCount: p.rpjmPrograms.length }).length) revokeData.draftReadyAt = null;
    }
    const approvedAfter = revokes ? null : p.draftApprovedAt;

    if (patch.legalDocumentId !== undefined && patch.legalDocumentId !== null) {
      const l = await tx.legalDocument.findFirst({ where: { id: patch.legalDocumentId, villageId: args.villageId } });
      if (!l || l.type !== "PERDES" || l.status !== "BERLAKU") return fail(400, "Pilih Peraturan Desa yang berlaku milik desa ini.");
      const [other, rkp] = await Promise.all([
        tx.rpjmdesPlan.findFirst({ where: { legalDocumentId: l.id, NOT: { id: p.id } }, select: { id: true } }),
        tx.rkpdesDocument.findFirst({ where: { legalDocumentId: l.id }, select: { id: true } }),
      ]);
      if (other || rkp) return fail(409, "Peraturan Desa ini sudah dipakai oleh dokumen perencanaan lain.");
      const b = perdesBlockers({ draftReadyAt: isoDay(draftReadyAt), draftApprovedAt: isoDay(approvedAfter), draftMeetingHeld: heldOrFinal(draftMeeting), enactedBeforeApp });
      if (b.length) return fail(409, "Peraturan Desa belum dapat dihubungkan: " + b.join(" "));
    }
    if (patch.legalDocumentId === null && p.legalDocumentId !== null) return LOCKED();

    try {
      await tx.rpjmdesPlan.update({ where: { id: p.id }, data: { ...patch, ...revokeData } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Peraturan Desa ini baru saja dipakai oleh dokumen lain.");
      throw e;
    }
    if (revokes) await logRevoke(tx, args.villageId, p.id, args.userId, "isi rancangan diubah");
    if (bypass) await tx.rpjmEvent.create({ data: { villageId: args.villageId, planId: p.id, kind: "BYPASS", reason: null, note: `Perdes dicatat sebagai sudah ada sebelum aplikasi: ${enactedReason}`.slice(0, 300), createdById: args.userId } });
    return { ok: true as const, data: { id: p.id } };
  });
}

/** Persetujuan rancangan oleh Kepala Desa (Pasal 24). `date` null = cabut (selama pembahasan belum terlaksana). */
export async function approveDraft(db: PrismaClient, args: { villageId: number; id: number; userId: number | null; date: Date | null }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const p = await lockPlan(tx, args.villageId, args.id);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId !== null) return LOCKED();
    if (args.date === null) {
      if (heldOrFinal(p.draftMeeting)) return fail(409, "Persetujuan tidak dapat dicabut karena rancangan sudah dibahas dalam musyawarah yang terlaksana.");
      await tx.rpjmdesPlan.update({ where: { id: p.id }, data: { draftApprovedAt: null, draftApprovedById: null } });
      return { ok: true as const, data: { id: p.id } };
    }
    if (!p.draftReadyAt) return fail(409, "Rancangan RPJM Desa belum ditandai selesai oleh tim penyusun (berita acara tim, Pasal 23).");
    const b = draftReadyBlockers({ vision: p.vision, mission: p.mission, policyDirection: p.policyDirection, programCount: p.rpjmPrograms.length });
    if (b.length) return fail(409, "Isi rancangan belum lengkap: " + b.join(" "));
    await tx.rpjmdesPlan.update({ where: { id: p.id }, data: { draftApprovedAt: args.date, draftApprovedById: args.userId } });
    return { ok: true as const, data: { id: p.id } };
  });
}

/** Buka kunci untuk perubahan RPJM Desa (Pasal 28; PP 16/2026 Pasal 148). Butuh alasan; musyawarah dan Perdes baru dibutuhkan lagi. */
export async function reopenPlan(db: PrismaClient, args: { villageId: number; id: number; userId: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p0 = parseReopen(args.input);
  if (!p0.ok) return invalid(p0);
  return db.$transaction(async (tx) => {
    const p = await lockPlan(tx, args.villageId, args.id);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId === null) return fail(409, "RPJM Desa ini belum terkunci; tidak perlu dibuka.");
    const note = `${p0.value.note} (Perdes ${p.legalDocument ? `${p.legalDocument.number}/${p.legalDocument.year}` : `id ${p.legalDocumentId}`})`.slice(0, 300);
    await tx.rpjmdesPlan.update({
      where: { id: p.id },
      data: { legalDocumentId: null, enactedBeforeApp: false, draftReadyAt: null, draftApprovedAt: null, draftApprovedById: null, draftMeetingId: null, reopenCount: { increment: 1 } },
    });
    await tx.rpjmEvent.create({ data: { villageId: args.villageId, planId: p.id, kind: "REOPEN", reason: p0.value.reason, note, createdById: args.userId } });
    return { ok: true as const, data: { id: p.id } };
  });
}

// --- Tim penyusun ---------------------------------------------------------

export async function addTeamMember(db: PrismaClient, args: { villageId: number; planId: number; input: unknown }): Promise<Result<{ id: number }>> {
  const p0 = parseTeamInput(args.input);
  if (!p0.ok) return invalid(p0);
  return db.$transaction(async (tx) => {
    const p = await lockPlan(tx, args.villageId, args.planId);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId !== null) return LOCKED();
    if (p.rpjmTeam.length >= LIMITS.teamHardMax) return fail(409, `Maksimal ${LIMITS.teamHardMax} anggota tim tercatat.`);
    let name = p0.value.name;
    let gender = p0.value.gender;
    if (p0.value.residentId !== null) {
      const r = await tx.resident.findFirst({ where: { id: p0.value.residentId, villageId: args.villageId }, select: { name: true, gender: true } });
      if (!r) return fail(400, "Warga tidak ditemukan di desa ini.");
      name = name ?? r.name;
      gender = gender ?? (r.gender === "Perempuan" ? "P" : r.gender === "Laki-laki" ? "L" : null);
      if (p.rpjmTeam.some((t) => t.residentId === p0.value.residentId)) return fail(409, "Warga ini sudah ada dalam tim.");
    }
    const row = await tx.rpjmTeamMember.create({ data: { villageId: args.villageId, planId: p.id, residentId: p0.value.residentId, name: name!, role: p0.value.role, position: p0.value.position, gender } });
    return { ok: true as const, data: { id: row.id } };
  });
}

export async function removeTeamMember(db: PrismaClient, args: { villageId: number; planId: number; memberId: number }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const p = await lockPlan(tx, args.villageId, args.planId);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId !== null) return LOCKED();
    const r = await tx.rpjmTeamMember.deleteMany({ where: { id: args.memberId, planId: p.id, villageId: args.villageId } });
    if (r.count === 0) return fail(404, "Anggota tim tidak ditemukan.");
    return { ok: true as const, data: { id: args.memberId } };
  });
}

// --- Program -----------------------------------------------------------------

export async function saveProgram(db: PrismaClient, args: { villageId: number; planId: number; programId?: number; userId?: number | null; input: unknown }): Promise<Result<{ id: number }>> {
  const p0 = parseProgramInput(args.input);
  if (!p0.ok) return invalid(p0);
  const v = p0.value;
  return db.$transaction(async (tx) => {
    const p = await lockPlan(tx, args.villageId, args.planId);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId !== null) return LOCKED();
    if (v.year < p.periodStart || v.year > p.periodEnd) return invalid({ errors: [`Tahun harus dalam periode RPJM Desa (${p.periodStart}-${p.periodEnd}).`], fieldErrors: { year: `Pilih tahun antara ${p.periodStart} dan ${p.periodEnd}.` } });
    const data = {
      fieldCode: v.fieldCode,
      year: v.year,
      title: v.title,
      description: v.description,
      activityCode: v.activityCode,
      location: v.location,
      outputVolume: v.outputVolume,
      outputUnit: v.outputUnit,
      benefit: v.benefit,
      budgetCents: v.budgetCents,
      fundSource: v.fundSource,
      method: v.method,
    };
    if (args.programId !== undefined) {
      const r = await tx.rpjmProgram.updateMany({ where: { id: args.programId, planId: p.id, villageId: args.villageId }, data });
      if (r.count === 0) return fail(404, "Program tidak ditemukan.");
      await revokeApprovalOnChange(tx, p, args.userId ?? null, "program diubah", p.rpjmPrograms.length);
      return { ok: true as const, data: { id: args.programId } };
    }
    if (p.rpjmPrograms.length >= LIMITS.programsPerPlan) return fail(409, `Maksimal ${LIMITS.programsPerPlan} program per dokumen.`);
    const row = await tx.rpjmProgram.create({ data: { ...data, villageId: args.villageId, planId: p.id } });
    await revokeApprovalOnChange(tx, p, args.userId ?? null, "program ditambah", p.rpjmPrograms.length + 1);
    return { ok: true as const, data: { id: row.id } };
  });
}

export async function removeProgram(db: PrismaClient, args: { villageId: number; planId: number; programId: number; userId?: number | null }): Promise<Result<{ id: number }>> {
  return db.$transaction(async (tx) => {
    const p = await lockPlan(tx, args.villageId, args.planId);
    if (!p) return NOT_FOUND();
    if (p.legalDocumentId !== null) return LOCKED();
    // Draf rancangan yang sudah ditandai selesai tidak boleh kehilangan seluruh programnya secara diam-diam.
    const target = p.rpjmPrograms.find((x) => x.id === args.programId);
    if (!target) return fail(404, "Program tidak ditemukan.");
    if (p.draftReadyAt && p.rpjmPrograms.length === 1) return fail(409, "Ini program terakhir pada rancangan yang sudah ditandai selesai. Batalkan penanda rancangan selesai lebih dahulu.");
    await tx.rpjmProgram.deleteMany({ where: { id: args.programId, planId: p.id, villageId: args.villageId } });
    await revokeApprovalOnChange(tx, p, args.userId ?? null, "program dihapus", p.rpjmPrograms.length - 1);
    return { ok: true as const, data: { id: args.programId } };
  });
}

// --- Tautan ke RKP Desa --------------------------------------------------------------

/** Pilihan program RPJM Desa untuk menyusun kegiatan RKP Desa tahun tertentu. Hanya membaca; tidak memaksa. */
export async function programOptionsForYear(db: Db, villageId: number, planId: number, year: number) {
  const rows = await db.rpjmProgram.findMany({
    where: { villageId, planId, year },
    orderBy: [{ fieldCode: "asc" }, { id: "asc" }],
    take: 300,
    include: { _count: { select: { rkpActivities: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    fieldCode: r.fieldCode,
    fieldLabel: FIELDS[r.fieldCode as FieldCode] ?? r.fieldCode,
    title: r.title,
    location: r.location,
    activityCode: r.activityCode,
    budget: r.budgetCents === null ? null : fromCents(r.budgetCents),
    fundSource: r.fundSource,
    method: r.method,
    outputVolume: r.outputVolume ? r.outputVolume.toFixed(2) : null,
    outputUnit: r.outputUnit,
    used: r._count.rkpActivities,
  }));
}
export type ProgramOption = Awaited<ReturnType<typeof programOptionsForYear>>[number];

export const TERMS = { fields: FIELDS, paguSources: PAGU_SOURCES, methods: METHODS, teamRoles: TEAM_ROLES, changeReasons: CHANGE_REASONS };
