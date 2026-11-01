/**
 * Kerja sama Desa (Permendagri 96/2017): berita acara kesepakatan, para pihak, RAB bersama, status bergerbang, tautan ke Musyawarah Desa.
 * Semua penulisan memegang kunci baris kerja sama (SELECT ... FOR UPDATE) sebagai pernyataan pertama transaksi.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { fail, invalid, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { END_REASONS, FIELDS, INITIATIVES, KINDS, LIMITS, MUSDES_KINDS, PARTY_KINDS, STATUS, type EndReason, type Status } from "./catalog";
import { agreementFindings, selfShareCents, totalCents, transitionBlockers, type AgreementFacts, type Finding, type MeetingFact } from "./calc";
import { AFTER_KEYS, DRAFT_KEYS, parseAgreementCreate, parseAgreementPatch, parseBudget, parseEnd, parseParty, parsePartyPatch, parseSign, type AgreementPatch } from "./schema";

type Db = Prisma.TransactionClient;
const ok = <T>(data: T): { ok: true; data: T } => ({ ok: true, data });
class Stop extends Error {
  constructor(
    msg: string,
    readonly all: string[] = [msg],
  ) {
    super(msg);
  }
}
const stop = (msg: string, all?: string[]): never => {
  throw new Stop(msg, all);
};
const asResult = (e: unknown): Result<never> => {
  if (e instanceof Stop) return fail(409, ...e.all);
  throw e;
};

/** Kunci baris kerja sama milik desa. HARUS pernyataan pertama dalam transaksi. */
async function lock(tx: Db, villageId: number, id: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM village_agreements WHERE id = ${id} AND villageId = ${villageId} FOR UPDATE`;
  if (!rows.length) stop("Kerja sama tidak ditemukan.");
}

type Full = Prisma.VillageAgreementGetPayload<{ include: { parties: true; budget: true } }>;
const FULL = { parties: { orderBy: { id: "asc" } }, budget: { orderBy: { id: "asc" } } } as const satisfies Prisma.VillageAgreementInclude;

async function mustLoad(tx: Db, villageId: number, id: number): Promise<Full> {
  const a = await tx.villageAgreement.findFirst({ where: { id, villageId }, include: FULL });
  if (!a) return stop("Kerja sama tidak ditemukan.");
  return a;
}

async function meetingFacts(db: Db, villageId: number, ids: (number | null)[]): Promise<Map<number, MeetingFact & { id: number; title: string; kind: string }>> {
  const want = ids.filter((x): x is number => x !== null);
  if (!want.length) return new Map();
  const rows = await db.villageMeeting.findMany({ where: { villageId, id: { in: want } }, select: { id: true, status: true, heldOn: true, title: true, kind: true } });
  return new Map(rows.map((m) => [m.id, { id: m.id, status: m.status, heldOn: isoDay(m.heldOn), title: m.title, kind: m.kind }]));
}

function factsOf(a: Full, meetings: Map<number, MeetingFact>): AgreementFacts {
  const kindOf = new Map(a.parties.map((p) => [p.id, p.kind]));
  return {
    kind: a.kind as AgreementFacts["kind"],
    initiative: a.initiative as AgreementFacts["initiative"],
    status: a.status as Status,
    scope: a.scope,
    procedures: a.procedures,
    rights: a.rights,
    funding: a.funding,
    amendment: a.amendment,
    dispute: a.dispute,
    termStartOn: isoDay(a.termStartOn),
    termEndOn: isoDay(a.termEndOn),
    prepMusdes: a.prepMusdesId ? (meetings.get(a.prepMusdesId) ?? null) : null,
    inPlanConfirmed: a.inPlanConfirmed,
    offerSentOn: isoDay(a.offerSentOn),
    offerMusdes: a.offerMusdesId ? (meetings.get(a.offerMusdesId) ?? null) : null,
    offerDecision: a.offerDecision,
    offerReplyOn: isoDay(a.offerReplyOn),
    consultRequired: a.consultRequired,
    consultedOn: isoDay(a.consultedOn),
    agreedOn: isoDay(a.agreedOn),
    signedOn: isoDay(a.signedOn),
    signedNumber: a.signedNumber,
    witnessName: a.witnessName,
    reportedOn: isoDay(a.reportedOn),
    reportedToCamatOn: isoDay(a.reportedToCamatOn),
    endReason: a.endReason,
    parties: a.parties.map((p) => ({ kind: p.kind, name: p.name, representativeName: p.representativeName })),
    budget: a.budget.map((b) => ({ amountCents: b.amountCents, bearerKind: b.bearerId ? (kindOf.get(b.bearerId) ?? null) : null })),
  };
}

// ───────────── tampilan ─────────────

export interface AgreementRow {
  id: number;
  year: number;
  title: string;
  kind: string;
  kindLabel: string;
  fieldLabel: string;
  status: string;
  statusLabel: string;
  counterparts: string[];
  total: string;
  selfShare: string;
  termStartOn: string | null;
  termEndOn: string | null;
  warnCount: number;
}
export async function listAgreements(db: PrismaClient, args: { villageId: number; year: number; today: string }): Promise<Result<{ year: number; agreements: AgreementRow[] }>> {
  if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) return fail(400, "Tahun tidak valid.");
  const rows = await db.villageAgreement.findMany({ where: { villageId: args.villageId, year: args.year }, orderBy: { id: "asc" }, take: LIMITS.agreementsPerYear, include: FULL });
  const meetings = await meetingFacts(db, args.villageId, rows.flatMap((r) => [r.prepMusdesId, r.offerMusdesId]));
  return ok({
    year: args.year,
    agreements: rows.map((a) => {
      const f = factsOf(a, meetings);
      return {
        id: a.id,
        year: a.year,
        title: a.title,
        kind: a.kind,
        kindLabel: KINDS[a.kind as keyof typeof KINDS] ?? a.kind,
        fieldLabel: FIELDS[a.field as keyof typeof FIELDS] ?? a.field,
        status: a.status,
        statusLabel: STATUS[a.status as Status] ?? a.status,
        counterparts: a.parties.filter((p) => p.kind !== "SELF").map((p) => p.name),
        total: fromCents(totalCents(f)),
        selfShare: fromCents(selfShareCents(f)),
        termStartOn: isoDay(a.termStartOn),
        termEndOn: isoDay(a.termEndOn),
        warnCount: agreementFindings(f, args.today).filter((x) => x.level === "WARN").length,
      };
    }),
  });
}

export interface Transition {
  to: string;
  label: string;
  blockers: string[];
}
export interface AgreementDetail {
  id: number;
  year: number;
  title: string;
  kind: string;
  kindLabel: string;
  initiative: string | null;
  initiativeLabel: string | null;
  field: string;
  fieldLabel: string;
  status: string;
  statusLabel: string;
  scope: string | null;
  procedures: string | null;
  rights: string | null;
  funding: string | null;
  amendment: string | null;
  dispute: string | null;
  termStartOn: string | null;
  termEndOn: string | null;
  prepMusdes: { id: number; title: string; status: string; heldOn: string | null } | null;
  inPlanConfirmed: boolean;
  offerSentOn: string | null;
  offerMusdes: { id: number; title: string; status: string; heldOn: string | null } | null;
  offerDecision: string | null;
  offerReplyOn: string | null;
  consultRequired: boolean;
  consultedOn: string | null;
  agreedOn: string | null;
  signedOn: string | null;
  signedNumber: string | null;
  witnessName: string | null;
  reportedOn: string | null;
  reportedToCamatOn: string | null;
  endReason: string | null;
  endReasonLabel: string | null;
  endNote: string | null;
  endedOn: string | null;
  parties: { id: number; kind: string; kindLabel: string; name: string; representativeName: string | null; representativeTitle: string | null; share: string }[];
  budget: { id: number; description: string; amount: string; bearerId: number | null; bearerName: string | null }[];
  total: string;
  selfShare: string;
  meetings: { id: number; kind: string; title: string; status: string; heldOn: string | null }[];
  transitions: Transition[];
  findings: Finding[];
}

const NEXT_LABEL: Record<Status, string> = { PERSIAPAN: "", PENAWARAN: "Kirim/terima penawaran", PENYUSUNAN: "Mulai menyusun rancangan", DITANDATANGANI: "Catat penandatanganan", PELAKSANAAN: "Mulai pelaksanaan", SELESAI: "Tandai berakhir", BATAL: "Batalkan" };

export async function getAgreement(db: PrismaClient, args: { villageId: number; id: number; today: string }): Promise<Result<AgreementDetail>> {
  const a = await db.villageAgreement.findFirst({ where: { id: args.id, villageId: args.villageId }, include: FULL });
  if (!a) return fail(404, "Kerja sama tidak ditemukan.");
  const meetings = await meetingFacts(db, args.villageId, [a.prepMusdesId, a.offerMusdesId]);
  const options = await db.villageMeeting.findMany({ where: { villageId: args.villageId, kind: { in: [...MUSDES_KINDS] }, status: { not: "CANCELLED" } }, orderBy: [{ scheduledOn: "desc" }, { id: "desc" }], take: 60, select: { id: true, kind: true, title: true, status: true, heldOn: true } });
  const optIds = new Set(options.map((m) => m.id));
  const extra = [...meetings.values()].filter((m) => !optIds.has(m.id));
  const f = factsOf(a, meetings);
  const status = a.status as Status;
  const targets: Status[] = status === "PERSIAPAN" ? ["PENAWARAN", "BATAL"] : status === "PENAWARAN" ? ["PENYUSUNAN", "BATAL"] : status === "PENYUSUNAN" ? ["DITANDATANGANI", "BATAL"] : status === "DITANDATANGANI" ? ["PELAKSANAAN", "SELESAI"] : status === "PELAKSANAAN" ? ["SELESAI"] : [];
  const bearer = new Map(a.parties.map((p) => [p.id, p.name]));
  const share = new Map<number, bigint>();
  for (const b of a.budget) if (b.bearerId) share.set(b.bearerId, (share.get(b.bearerId) ?? 0n) + b.amountCents);
  const asMeeting = (id: number | null) => (id && meetings.get(id) ? { id, title: meetings.get(id)!.title, status: meetings.get(id)!.status, heldOn: meetings.get(id)!.heldOn } : null);
  return ok<AgreementDetail>({
    id: a.id,
    year: a.year,
    title: a.title,
    kind: a.kind,
    kindLabel: KINDS[a.kind as keyof typeof KINDS] ?? a.kind,
    initiative: a.initiative,
    initiativeLabel: a.initiative ? (INITIATIVES[a.initiative as keyof typeof INITIATIVES] ?? a.initiative) : null,
    field: a.field,
    fieldLabel: FIELDS[a.field as keyof typeof FIELDS] ?? a.field,
    status: a.status,
    statusLabel: STATUS[status] ?? a.status,
    scope: a.scope,
    procedures: a.procedures,
    rights: a.rights,
    funding: a.funding,
    amendment: a.amendment,
    dispute: a.dispute,
    termStartOn: isoDay(a.termStartOn),
    termEndOn: isoDay(a.termEndOn),
    prepMusdes: asMeeting(a.prepMusdesId),
    inPlanConfirmed: a.inPlanConfirmed,
    offerSentOn: isoDay(a.offerSentOn),
    offerMusdes: asMeeting(a.offerMusdesId),
    offerDecision: a.offerDecision,
    offerReplyOn: isoDay(a.offerReplyOn),
    consultRequired: a.consultRequired,
    consultedOn: isoDay(a.consultedOn),
    agreedOn: isoDay(a.agreedOn),
    signedOn: isoDay(a.signedOn),
    signedNumber: a.signedNumber,
    witnessName: a.witnessName,
    reportedOn: isoDay(a.reportedOn),
    reportedToCamatOn: isoDay(a.reportedToCamatOn),
    endReason: a.endReason,
    endReasonLabel: a.endReason ? (END_REASONS[a.endReason as EndReason] ?? a.endReason) : null,
    endNote: a.endNote,
    endedOn: isoDay(a.endedOn),
    parties: a.parties.map((p) => ({ id: p.id, kind: p.kind, kindLabel: PARTY_KINDS[p.kind as keyof typeof PARTY_KINDS] ?? p.kind, name: p.name, representativeName: p.representativeName, representativeTitle: p.representativeTitle, share: fromCents(share.get(p.id) ?? 0n) })),
    budget: a.budget.map((b) => ({ id: b.id, description: b.description, amount: fromCents(b.amountCents), bearerId: b.bearerId, bearerName: b.bearerId ? (bearer.get(b.bearerId) ?? null) : null })),
    total: fromCents(totalCents(f)),
    selfShare: fromCents(selfShareCents(f)),
    meetings: [...options.map((m) => ({ id: m.id, kind: m.kind, title: m.title, status: m.status, heldOn: isoDay(m.heldOn) })), ...extra.map((m) => ({ id: m.id, kind: m.kind, title: m.title, status: m.status, heldOn: m.heldOn }))],
    transitions: targets.map((to) => ({ to, label: NEXT_LABEL[to], blockers: to === "BATAL" || to === "DITANDATANGANI" ? (to === "DITANDATANGANI" ? transitionBlockers(to, { ...f, signedOn: f.signedOn ?? f.agreedOn ?? args.today, signedNumber: f.signedNumber ?? "-" }) : []) : transitionBlockers(to, f) })),
    findings: agreementFindings(f, args.today),
  });
}

// ───────────── penulisan ─────────────

export async function createAgreement(db: PrismaClient, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<{ id: number; year: number; title: string; kind: string }>> {
  const parsed = parseAgreementCreate(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  const village = await db.village.findUnique({ where: { id: args.villageId }, select: { name: true } });
  if (!village) return fail(404, "Desa tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      if ((await tx.villageAgreement.count({ where: { villageId: args.villageId, year: v.year } })) >= LIMITS.agreementsPerYear) return stop(`Kerja sama maksimal ${LIMITS.agreementsPerYear} per tahun.`);
      const row = await tx.villageAgreement.create({ data: { villageId: args.villageId, year: v.year, kind: v.kind, initiative: v.initiative, title: v.title, field: v.field, createdById: args.userId, parties: { create: [{ villageId: args.villageId, kind: "SELF", name: `Pemerintah Desa ${village.name.replace(/^\s*desa\s+/i, "")}` }] } } });
      return ok({ id: row.id, year: row.year, title: row.title, kind: row.kind });
    })
    .catch(asResult);
}

const isoOf = (v: unknown) => (v instanceof Date ? isoDay(v) : typeof v === "bigint" ? String(v) : v);

export async function patchAgreement(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ before: Record<string, unknown>; after: Record<string, unknown> }>> {
  const parsed = parseAgreementPatch(args.input);
  if (!parsed.ok) return invalid(parsed);
  const patch = parsed.value;
  const keys = Object.keys(patch) as (keyof AgreementPatch)[];
  if (!keys.length) return fail(400, "Tidak ada perubahan.");
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, args.id);
      const a = await mustLoad(tx, args.villageId, args.id);
      const status = a.status as Status;
      if (status === "BATAL" || status === "SELESAI") return stop("Kerja sama yang sudah berakhir atau dibatalkan tidak dapat diubah.");
      const signed = status === "DITANDATANGANI" || status === "PELAKSANAAN";
      for (const k of keys) {
        if (signed && DRAFT_KEYS.includes(k)) return stop("Isi kerja sama terkunci setelah ditandatangani. Perubahan dilakukan lewat perjanjian baru yang menggantikan.");
        if (!signed && !DRAFT_KEYS.includes(k) && !AFTER_KEYS.includes(k)) return stop("Isian tidak dikenal.");
      }
      // Musyawarah yang dikaitkan harus milik desa ini, bukan musyawarah BLT, dan tidak dibatalkan.
      for (const k of ["prepMusdesId", "offerMusdesId"] as const) {
        const mid = patch[k];
        if (mid) {
          const m = await tx.villageMeeting.findFirst({ where: { id: mid, villageId: args.villageId, kind: { in: [...MUSDES_KINDS] }, status: { not: "CANCELLED" } }, select: { id: true } });
          if (!m) return stop("Musyawarah Desa tidak ditemukan atau jenisnya tidak dapat dikaitkan dengan kerja sama.");
        }
      }
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      for (const k of keys) {
        before[k] = isoOf((a as unknown as Record<string, unknown>)[k]);
        after[k] = isoOf(patch[k]);
      }
      const nextStart = "termStartOn" in patch ? patch.termStartOn : a.termStartOn;
      const nextEnd = "termEndOn" in patch ? patch.termEndOn : a.termEndOn;
      if (nextStart && nextEnd && nextEnd < nextStart) return stop("Tanggal berakhir tidak boleh sebelum tanggal mulai.");
      await tx.villageAgreement.update({ where: { id: a.id }, data: patch as Prisma.VillageAgreementUpdateInput });
      return ok({ before, after });
    })
    .catch(asResult);
}

export async function deleteAgreement(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ title: string; year: number; status: string }>> {
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, args.id);
      const a = await mustLoad(tx, args.villageId, args.id);
      if (a.status !== "PERSIAPAN" && a.status !== "BATAL") return stop("Hanya kerja sama tahap persiapan atau yang dibatalkan yang dapat dihapus.");
      await tx.villageAgreement.delete({ where: { id: a.id } });
      return ok({ title: a.title, year: a.year, status: a.status });
    })
    .catch(asResult);
}

const editable = (status: string) => {
  if (status === "DITANDATANGANI" || status === "PELAKSANAAN" || status === "SELESAI" || status === "BATAL") stop("Para pihak dan RAB terkunci setelah ditandatangani, berakhir, atau dibatalkan.");
};

export async function addParty(db: PrismaClient, args: { villageId: number; agreementId: number; input: unknown }): Promise<Result<{ id: number; name: string; kind: string }>> {
  const parsed = parseParty(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, args.agreementId);
      const a = await mustLoad(tx, args.villageId, args.agreementId);
      editable(a.status);
      if (a.kind === "ANTAR_DESA" && v.kind !== "DESA") return stop("Kerja sama antar-Desa hanya melibatkan desa lain.");
      if (a.kind === "PIHAK_KETIGA" && v.kind !== "PIHAK_KETIGA") return stop("Kerja sama dengan pihak ketiga hanya melibatkan pihak ketiga.");
      if (a.parties.length >= LIMITS.partiesPerAgreement) return stop(`Para pihak maksimal ${LIMITS.partiesPerAgreement}.`);
      if (a.parties.some((p) => p.name.toLowerCase() === v.name.toLowerCase())) return stop("Pihak dengan nama ini sudah terdaftar.");
      const row = await tx.villageAgreementParty.create({ data: { agreementId: a.id, villageId: args.villageId, kind: v.kind, name: v.name, representativeName: v.representativeName, representativeTitle: v.representativeTitle } });
      return ok({ id: row.id, name: row.name, kind: row.kind });
    })
    .catch(asResult);
}

async function partyHead(db: Db | PrismaClient, villageId: number, id: number) {
  return db.villageAgreementParty.findFirst({ where: { id, villageId }, select: { agreementId: true } });
}

export async function patchParty(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ agreementId: number; before: Record<string, unknown>; after: Record<string, unknown> }>> {
  const parsed = parsePartyPatch(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  const head = await partyHead(db, args.villageId, args.id);
  if (!head) return fail(404, "Pihak tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, head.agreementId);
      const a = await mustLoad(tx, args.villageId, head.agreementId);
      const p = a.parties.find((x) => x.id === args.id);
      if (!p) return stop("Pihak tidak ditemukan.");
      // Nama pihak dan penandatangan terkunci setelah ditandatangani: dokumen yang sudah ditandatangani tidak boleh berubah diam-diam.
      editable(a.status);
      if (v.name !== undefined && v.name !== p.name) {
        if (p.kind === "SELF") return stop("Nama pihak 'Desa ini' tidak dapat diubah.");
        if (a.parties.some((x) => x.id !== p.id && x.name.toLowerCase() === v.name!.toLowerCase())) return stop("Pihak dengan nama ini sudah terdaftar.");
      }
      const before = { name: p.name, representativeName: p.representativeName, representativeTitle: p.representativeTitle };
      const after = { name: v.name ?? p.name, representativeName: v.representativeName, representativeTitle: v.representativeTitle };
      await tx.villageAgreementParty.update({ where: { id: p.id }, data: { ...(v.name !== undefined ? { name: v.name } : {}), representativeName: v.representativeName, representativeTitle: v.representativeTitle } });
      return ok({ agreementId: a.id, before, after });
    })
    .catch(asResult);
}

export async function removeParty(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ agreementId: number; name: string; kind: string }>> {
  const head = await partyHead(db, args.villageId, args.id);
  if (!head) return fail(404, "Pihak tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, head.agreementId);
      const a = await mustLoad(tx, args.villageId, head.agreementId);
      const p = a.parties.find((x) => x.id === args.id);
      if (!p) return stop("Pihak tidak ditemukan.");
      editable(a.status);
      if (p.kind === "SELF") return stop("Pihak 'Desa ini' tidak dapat dihapus.");
      await tx.villageAgreementParty.delete({ where: { id: p.id } });
      return ok({ agreementId: a.id, name: p.name, kind: p.kind });
    })
    .catch(asResult);
}

export async function addBudget(db: PrismaClient, args: { villageId: number; agreementId: number; input: unknown }): Promise<Result<{ id: number; description: string; amount: string }>> {
  const parsed = parseBudget(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, args.agreementId);
      const a = await mustLoad(tx, args.villageId, args.agreementId);
      editable(a.status);
      if (v.bearerId && !a.parties.some((p) => p.id === v.bearerId)) return stop("Pihak penanggung bukan pihak dalam kerja sama ini.");
      if (a.budget.length >= LIMITS.budgetItemsPerAgreement) return stop(`Baris RAB maksimal ${LIMITS.budgetItemsPerAgreement}.`);
      const row = await tx.villageAgreementBudgetItem.create({ data: { agreementId: a.id, villageId: args.villageId, description: v.description, amountCents: v.amountCents, bearerId: v.bearerId } });
      return ok({ id: row.id, description: row.description, amount: fromCents(row.amountCents) });
    })
    .catch(asResult);
}

async function budgetHead(db: PrismaClient, villageId: number, id: number) {
  return db.villageAgreementBudgetItem.findFirst({ where: { id, villageId }, select: { agreementId: true } });
}
export async function patchBudget(db: PrismaClient, args: { villageId: number; id: number; input: unknown }): Promise<Result<{ agreementId: number; description: string }>> {
  const parsed = parseBudget(args.input);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  const head = await budgetHead(db, args.villageId, args.id);
  if (!head) return fail(404, "Baris RAB tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, head.agreementId);
      const a = await mustLoad(tx, args.villageId, head.agreementId);
      editable(a.status);
      if (!a.budget.some((b) => b.id === args.id)) return stop("Baris RAB tidak ditemukan.");
      if (v.bearerId && !a.parties.some((p) => p.id === v.bearerId)) return stop("Pihak penanggung bukan pihak dalam kerja sama ini.");
      await tx.villageAgreementBudgetItem.update({ where: { id: args.id }, data: { description: v.description, amountCents: v.amountCents, bearerId: v.bearerId } });
      return ok({ agreementId: a.id, description: v.description });
    })
    .catch(asResult);
}
export async function removeBudget(db: PrismaClient, args: { villageId: number; id: number }): Promise<Result<{ agreementId: number; description: string; amount: string }>> {
  const head = await budgetHead(db, args.villageId, args.id);
  if (!head) return fail(404, "Baris RAB tidak ditemukan.");
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, head.agreementId);
      const a = await mustLoad(tx, args.villageId, head.agreementId);
      editable(a.status);
      const b = a.budget.find((x) => x.id === args.id);
      if (!b) return stop("Baris RAB tidak ditemukan.");
      await tx.villageAgreementBudgetItem.delete({ where: { id: b.id } });
      return ok({ agreementId: a.id, description: b.description, amount: fromCents(b.amountCents) });
    })
    .catch(asResult);
}

// ───────────── status ─────────────

async function loadFacts(tx: Db, villageId: number, a: Full): Promise<AgreementFacts> {
  return factsOf(a, await meetingFacts(tx, villageId, [a.prepMusdesId, a.offerMusdesId]));
}

export async function transition(db: PrismaClient, args: { villageId: number; id: number; body: unknown }): Promise<Result<{ from: string; to: string; title: string }>> {
  const body = (typeof args.body === "object" && args.body !== null ? args.body : {}) as Record<string, unknown>;
  const to = body.to;
  if (typeof to !== "string" || !Object.hasOwn(STATUS, to)) return fail(400, "Status tujuan tidak valid.");
  if (to === "DITANDATANGANI") return fail(400, "Penandatanganan dicatat lewat tombol penandatanganan (butuh persetujuan Kepala Desa).");
  const target = to as Status;
  let reason: string | null = null;
  let end: ReturnType<typeof parseEnd> | null = null;
  if (target === "BATAL") {
    reason = typeof body.reason === "string" ? body.reason.replace(/\s+/g, " ").trim() : "";
    if (reason.length < 3 || reason.length > 300) return invalid({ errors: ["Alasan pembatalan wajib diisi (3 sampai 300 karakter)."], fieldErrors: { reason: "Isi alasan pembatalan (3 sampai 300 karakter)." } });
  }
  if (target === "SELESAI") {
    end = parseEnd(body);
    if (!end.ok) return invalid(end);
  }
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, args.id);
      const a = await mustLoad(tx, args.villageId, args.id);
      const facts = await loadFacts(tx, args.villageId, a);
      const blockers = transitionBlockers(target, end?.ok ? { ...facts, endReason: end.value.reason } : facts);
      if (blockers.length) return stop(blockers[0], blockers);
      const data: Prisma.VillageAgreementUpdateInput = { status: target };
      if (target === "BATAL") data.endNote = reason;
      if (target === "SELESAI" && end?.ok) Object.assign(data, { endReason: end.value.reason, endNote: end.value.note, endedOn: end.value.endedOn });
      await tx.villageAgreement.update({ where: { id: a.id }, data });
      return ok({ from: a.status, to: target, title: a.title });
    })
    .catch(asResult);
}

/** Mencatat penandatanganan (Kepala Desa/admin): tanggal, nomor, saksi; pagar dinilai dengan nilai baru, gagal = tidak ada yang tersimpan. */
export async function sign(db: PrismaClient, args: { villageId: number; id: number; body: unknown; /** izin approve milik pemanggil; WAJIB true (gerbang kedua di luar peta rute, karena id ter-encode dapat melewati pola) */ canApprove: boolean }): Promise<Result<{ title: string; signedNumber: string; signedOn: string }>> {
  if (args.canApprove !== true) return fail(403, "Penandatanganan hanya dapat dicatat oleh Kepala Desa atau admin.");
  const parsed = parseSign(args.body);
  if (!parsed.ok) return invalid(parsed);
  const v = parsed.value;
  return db
    .$transaction(async (tx) => {
      await lock(tx, args.villageId, args.id);
      const a = await mustLoad(tx, args.villageId, args.id);
      const facts = await loadFacts(tx, args.villageId, a);
      const blockers = transitionBlockers("DITANDATANGANI", { ...facts, signedOn: isoDay(v.signedOn), signedNumber: v.signedNumber });
      if (blockers.length) return stop(blockers[0], blockers);
      await tx.villageAgreement.update({ where: { id: a.id }, data: { status: "DITANDATANGANI", signedOn: v.signedOn, signedNumber: v.signedNumber, ...(v.witnessName ? { witnessName: v.witnessName } : {}) } });
      return ok({ title: a.title, signedNumber: v.signedNumber, signedOn: isoDay(v.signedOn) ?? "" });
    })
    .catch(asResult);
}

// ───────────── cetak ─────────────

export interface PrintBundle {
  village: { name: string; district: string; regency: string };
  agreement: AgreementDetail;
  villageHead: string | null;
}
export async function printBundle(db: PrismaClient, args: { villageId: number; id: number; today: string }): Promise<Result<PrintBundle>> {
  const r = await getAgreement(db, args);
  if (!r.ok) return r;
  const [village, year] = await Promise.all([
    db.village.findUnique({ where: { id: args.villageId }, select: { name: true, district: true, regency: true } }),
    db.apbdesYear.findUnique({ where: { villageId_year: { villageId: args.villageId, year: r.data.year } }, select: { villageHeadName: true } }),
  ]);
  return ok({ village: village ?? { name: "", district: "", regency: "" }, agreement: r.data, villageHead: year?.villageHeadName ?? null });
}
