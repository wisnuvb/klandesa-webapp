import { Prisma, type PrismaClient } from "@prisma/client";
import { cleanText, fail, invalid, isRecord, type Parsed, type Result } from "@/lib/form-input";

type Db = Prisma.TransactionClient;

export const POLL_LIMITS = { optionsMin: 2, optionsMax: 10, optionLen: 100, maxDays: 90, pollsPerVillage: 2000 } as const;

import { STATUS_LABEL, type PollStatus } from "./catalog";

export { STATUS_LABEL, type PollStatus };

export interface PollInput {
  title: string;
  description: string | null;
  options: string[];
  minAge: number;
  showLive: boolean;
  opensAt: Date | null;
  closesAt: Date;
}

function dateTime(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parsePollInput(body: unknown, now: Date = new Date()): Parsed<PollInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const title = cleanText(body.title, 200);
  if (title.bad || !title.value) fe.title = "Isi pertanyaan atau judul polling.";
  else if (title.tooLong) fe.title = "Judul maksimal 200 karakter.";
  const description = cleanText(body.description, 1000);
  if (description.bad || description.tooLong) fe.description = "Penjelasan maksimal 1000 karakter.";

  let options: string[] = [];
  if (!Array.isArray(body.options)) fe.options = "Isi pilihan jawaban.";
  else {
    const cleaned = body.options.map((o) => cleanText(o, POLL_LIMITS.optionLen));
    if (cleaned.some((c) => c.bad || c.tooLong)) fe.options = `Tiap pilihan maksimal ${POLL_LIMITS.optionLen} karakter.`;
    options = cleaned.map((c) => c.value).filter((v): v is string => v !== null);
    if (!fe.options && (options.length < POLL_LIMITS.optionsMin || options.length > POLL_LIMITS.optionsMax)) fe.options = `Isi ${POLL_LIMITS.optionsMin} sampai ${POLL_LIMITS.optionsMax} pilihan.`;
    else if (!fe.options && new Set(options.map((o) => o.toLowerCase())).size !== options.length) fe.options = "Pilihan tidak boleh sama.";
  }

  const minAge = body.minAge === undefined || body.minAge === null || body.minAge === "" ? 17 : Number(body.minAge);
  if (!Number.isInteger(minAge) || minAge < 0 || minAge > 100) fe.minAge = "Umur minimum antara 0 dan 100 tahun.";
  if (body.showLive !== undefined && typeof body.showLive !== "boolean") fe.showLive = "Pilihan tampil hasil tidak valid.";

  let opensAt: Date | null = null;
  if (body.opensAt !== undefined && body.opensAt !== null && body.opensAt !== "") {
    opensAt = dateTime(body.opensAt);
    if (!opensAt) fe.opensAt = "Waktu mulai tidak valid.";
  }
  const closesAt = dateTime(body.closesAt);
  if (!closesAt) fe.closesAt = "Isi waktu penutupan.";
  else {
    const start = opensAt ?? now;
    if (closesAt.getTime() <= now.getTime()) fe.closesAt = "Waktu penutupan harus di masa depan.";
    else if (closesAt.getTime() <= start.getTime()) fe.closesAt = "Penutupan harus setelah waktu mulai.";
    else if (closesAt.getTime() - start.getTime() > POLL_LIMITS.maxDays * 86_400_000) fe.closesAt = `Maksimal ${POLL_LIMITS.maxDays} hari.`;
  }

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { title: title.value as string, description: description.value, options, minAge, showLive: body.showLive === true, opensAt, closesAt: closesAt as Date } };
}

type Row = Prisma.PollGetPayload<object>;

export function pollStatus(p: Pick<Row, "publishedAt" | "opensAt" | "closesAt" | "closedAt">, now: Date): PollStatus {
  if (!p.publishedAt) return "DRAFT";
  if (p.closedAt || now.getTime() >= p.closesAt.getTime()) return "CLOSED";
  if (p.opensAt && now.getTime() < p.opensAt.getTime()) return "SCHEDULED";
  return "OPEN";
}

export const optionsOf = (p: Pick<Row, "options">): string[] => (Array.isArray(p.options) ? (p.options as unknown[]).filter((o): o is string => typeof o === "string") : []);

/** Tanggal lahir paling akhir agar sudah berumur `minAge` tahun pada `now`. */
export const birthCutoff = (minAge: number, now: Date): Date => new Date(Date.UTC(now.getUTCFullYear() - minAge, now.getUTCMonth(), now.getUTCDate()));

export function serializePoll(p: Row, now: Date) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    options: optionsOf(p),
    minAge: p.minAge,
    showLive: p.showLive,
    status: pollStatus(p, now),
    publishedAt: p.publishedAt?.toISOString() ?? null,
    opensAt: p.opensAt?.toISOString() ?? null,
    closesAt: p.closesAt.toISOString(),
    closedAt: p.closedAt?.toISOString() ?? null,
  };
}
export type PollView = ReturnType<typeof serializePoll>;

export interface PollResults {
  counts: number[];
  total: number;
  /** Jumlah warga yang berhak memilih (hidup, memenuhi umur minimum) saat ini. */
  eligible: number;
  turnoutPercent: number;
}

export async function pollResults(db: Db, poll: Row, now: Date): Promise<PollResults> {
  const options = optionsOf(poll);
  const [grouped, eligible] = await Promise.all([
    db.pollVote.groupBy({ by: ["optionIndex"], where: { pollId: poll.id }, _count: { _all: true } }),
    db.resident.count({ where: { villageId: poll.villageId, isAlive: true, birthDate: { lte: birthCutoff(poll.minAge, now) } } }),
  ]);
  const counts = options.map((_, i) => grouped.find((g) => g.optionIndex === i)?._count._all ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  return { counts, total, eligible, turnoutPercent: eligible > 0 ? Math.round((total / eligible) * 1000) / 10 : 0 };
}

export async function listPolls(db: Db, villageId: number, now: Date = new Date()) {
  const rows = await db.poll.findMany({ where: { villageId }, orderBy: [{ createdAt: "desc" }], take: 200 });
  const counts = await db.pollVote.groupBy({ by: ["pollId"], where: { pollId: { in: rows.map((r) => r.id) } }, _count: { _all: true } });
  return rows.map((r) => ({ ...serializePoll(r, now), votes: counts.find((c) => c.pollId === r.id)?._count._all ?? 0 }));
}

export async function getPoll(db: Db, villageId: number, id: number, now: Date = new Date()): Promise<Result<{ poll: PollView; results: PollResults }>> {
  const row = await db.poll.findFirst({ where: { id, villageId } });
  if (!row) return fail(404, "Polling tidak ditemukan.");
  return { ok: true, data: { poll: serializePoll(row, now), results: await pollResults(db, row, now) } };
}

export async function createPoll(db: Db, args: { villageId: number; userId: number | null; input: unknown; now?: Date }): Promise<Result<PollView>> {
  const now = args.now ?? new Date();
  const p = parsePollInput(args.input, now);
  if (!p.ok) return invalid(p);
  if ((await db.poll.count({ where: { villageId: args.villageId } })) >= POLL_LIMITS.pollsPerVillage) return fail(409, "Jumlah polling sudah mencapai batas.");
  const row = await db.poll.create({ data: { villageId: args.villageId, createdById: args.userId, ...p.value, options: p.value.options } });
  return { ok: true, data: serializePoll(row, now) };
}

/** Ubah polling yang masih draf. Setelah diterbitkan, isinya dikunci agar suara yang masuk tetap bermakna. */
export async function updatePoll(db: Db, args: { villageId: number; id: number; input: unknown; now?: Date }): Promise<Result<PollView>> {
  const now = args.now ?? new Date();
  const p = parsePollInput(args.input, now);
  if (!p.ok) return invalid(p);
  const done = await db.poll.updateMany({ where: { id: args.id, villageId: args.villageId, publishedAt: null }, data: { ...p.value, options: p.value.options } });
  if (done.count === 0) {
    const exists = await db.poll.count({ where: { id: args.id, villageId: args.villageId } });
    return exists ? fail(409, "Polling yang sudah diterbitkan tidak dapat diubah.") : fail(404, "Polling tidak ditemukan.");
  }
  const row = await db.poll.findFirstOrThrow({ where: { id: args.id, villageId: args.villageId } });
  return { ok: true, data: serializePoll(row, now) };
}

export async function deletePoll(db: Db, villageId: number, id: number): Promise<Result<{ id: number }>> {
  const done = await db.poll.deleteMany({ where: { id, villageId, publishedAt: null } });
  if (done.count) return { ok: true, data: { id } };
  return (await db.poll.count({ where: { id, villageId } })) ? fail(409, "Polling yang sudah diterbitkan tidak dapat dihapus; tutup saja.") : fail(404, "Polling tidak ditemukan.");
}

/** Terbitkan draf: mulai berlaku pada `opensAt` (bila diisi dan belum lewat) atau sekarang. */
export async function publishPoll(db: Db, args: { villageId: number; id: number; now?: Date }): Promise<Result<PollView>> {
  const now = args.now ?? new Date();
  const cur = await db.poll.findFirst({ where: { id: args.id, villageId: args.villageId } });
  if (!cur) return fail(404, "Polling tidak ditemukan.");
  if (cur.publishedAt) return fail(409, "Polling ini sudah diterbitkan.");
  if (cur.closesAt.getTime() <= now.getTime()) return fail(400, "Waktu penutupan sudah lewat. Ubah waktu penutupan sebelum menerbitkan.");
  const done = await db.poll.updateMany({ where: { id: cur.id, villageId: args.villageId, publishedAt: null }, data: { publishedAt: now, opensAt: cur.opensAt && cur.opensAt.getTime() > now.getTime() ? cur.opensAt : now } });
  if (done.count === 0) return fail(409, "Polling ini sudah diterbitkan.");
  return { ok: true, data: serializePoll(await db.poll.findFirstOrThrow({ where: { id: cur.id } }), now) };
}

export async function closePoll(db: Db, args: { villageId: number; id: number; now?: Date }): Promise<Result<PollView>> {
  const now = args.now ?? new Date();
  const cur = await db.poll.findFirst({ where: { id: args.id, villageId: args.villageId } });
  if (!cur) return fail(404, "Polling tidak ditemukan.");
  if (pollStatus(cur, now) === "DRAFT") return fail(409, "Polling masih draf; hapus saja bila tidak jadi dipakai.");
  if (pollStatus(cur, now) === "CLOSED") return fail(409, "Polling ini sudah ditutup.");
  await db.poll.updateMany({ where: { id: cur.id, villageId: args.villageId, closedAt: null }, data: { closedAt: now } });
  return { ok: true, data: serializePoll(await db.poll.findFirstOrThrow({ where: { id: cur.id } }), now) };
}

export type VoteResult = { ok: true } | { ok: false; status: number; code: "NOT_FOUND" | "NOT_OPEN" | "NOT_ELIGIBLE" | "ALREADY_VOTED" | "INVALID_OPTION"; message: string };
const no = (status: number, code: Extract<VoteResult, { ok: false }>["code"], message: string): VoteResult => ({ ok: false, status, code, message });

/**
 * Warga memilih satu kali. Partisipasi (siapa) dan suara (apa) ditulis dalam satu transaksi tetapi disimpan terpisah
 * tanpa kaitan, jadi pilihan seseorang tidak dapat ditelusuri. Pilihan tidak bisa diubah atau ditarik.
 */
export async function castVote(db: PrismaClient, args: { villageId: number; residentId: number; pollId: number; optionIndex: unknown; now?: Date }): Promise<VoteResult> {
  const now = args.now ?? new Date();
  const idx = args.optionIndex;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0) return no(400, "INVALID_OPTION", "Pilihan tidak valid.");
  try {
    return await db.$transaction(async (tx) => {
      const poll = await tx.poll.findFirst({ where: { id: args.pollId, villageId: args.villageId, publishedAt: { not: null } } });
      if (!poll) return no(404, "NOT_FOUND", "Polling tidak ditemukan.");
      if (pollStatus(poll, now) !== "OPEN") return no(409, "NOT_OPEN", "Polling ini tidak sedang dibuka.");
      if (idx >= optionsOf(poll).length) return no(400, "INVALID_OPTION", "Pilihan tidak valid.");
      const resident = await tx.resident.findFirst({ where: { id: args.residentId, villageId: args.villageId, isAlive: true, birthDate: { lte: birthCutoff(poll.minAge, now) } }, select: { id: true } });
      if (!resident) return no(403, "NOT_ELIGIBLE", `Polling ini untuk warga berumur ${poll.minAge} tahun ke atas.`);
      await tx.pollParticipation.create({ data: { pollId: poll.id, residentId: resident.id } });
      await tx.pollVote.create({ data: { pollId: poll.id, optionIndex: idx } });
      return { ok: true } as const;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return no(409, "ALREADY_VOTED", "Anda sudah memberikan suara pada polling ini.");
    throw e;
  }
}

/** Polling untuk satu warga (aplikasi mobile): yang berjalan, terjadwal, dan yang ditutup 30 hari terakhir. */
export async function pollsForResident(db: Db, args: { villageId: number; residentId: number; birthDate: Date; now?: Date }) {
  const now = args.now ?? new Date();
  const rows = await db.poll.findMany({
    where: { villageId: args.villageId, publishedAt: { not: null }, OR: [{ closedAt: null, closesAt: { gt: new Date(now.getTime() - 30 * 86_400_000) } }, { closedAt: { gt: new Date(now.getTime() - 30 * 86_400_000) } }] },
    orderBy: { closesAt: "asc" },
    take: 50,
  });
  const mine = await db.pollParticipation.findMany({ where: { residentId: args.residentId, pollId: { in: rows.map((r) => r.id) } }, select: { pollId: true } });
  const voted = new Set(mine.map((m) => m.pollId));
  const out = [];
  for (const r of rows) {
    const v = serializePoll(r, now);
    const eligible = args.birthDate.getTime() <= birthCutoff(r.minAge, now).getTime();
    const showResults = v.status === "CLOSED" || (r.showLive && v.status === "OPEN");
    out.push({ id: v.id, title: v.title, description: v.description, options: v.options, status: v.status, opensAt: v.opensAt, closesAt: v.closedAt ?? v.closesAt, minAge: v.minAge, eligible, voted: voted.has(r.id), results: showResults ? await pollResults(db, r, now) : null });
  }
  return out;
}
