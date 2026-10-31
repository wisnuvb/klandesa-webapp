import type { Prisma } from "@prisma/client";
import { cleanText, fail, future, invalid, isoDay, isRecord, parseIsoDate, type Parsed, type Result } from "@/lib/form-input";
import { isKind, isSource, isStatus, isFinal, LIMITS, STALE_DAYS, TRANSITIONS, type Kind, type Outcome, type Source, type Status } from "./catalog";

type Db = Prisma.TransactionClient;

export interface ProposalInput {
  residentId: number;
  kind: Kind;
  source: Source;
  reason: string;
  knownDesil: string | null;
}

export function parseProposalInput(body: unknown): Parsed<ProposalInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const residentId = Number(body.residentId);
  if (!Number.isInteger(residentId) || residentId < 1) fe.residentId = "Pilih warga yang diusulkan.";
  const kind = isKind(body.kind) ? body.kind : null;
  if (!kind) fe.kind = "Pilih jenis usulan.";
  const source = isSource(body.source) ? body.source : null;
  if (!source) fe.source = "Pilih siapa yang mengusulkan.";
  const reason = cleanText(body.reason, 1000);
  if (reason.bad || !reason.value) fe.reason = "Isi alasan usulan.";
  else if (reason.tooLong) fe.reason = "Alasan maksimal 1000 karakter.";
  const desil = cleanText(body.knownDesil, 20);
  if (desil.bad || desil.tooLong) fe.knownDesil = "Desil maksimal 20 karakter.";
  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { residentId, kind: kind as Kind, source: source as Source, reason: reason.value as string, knownDesil: desil.value } };
}

type Row = Prisma.DtsenProposalGetPayload<object>;
export function serializeProposal(r: Row, now: Date = new Date()) {
  const days = Math.floor((now.getTime() - r.statusChangedAt.getTime()) / 86_400_000);
  return {
    id: r.id,
    residentId: r.residentId,
    residentName: r.residentName,
    residentRt: r.residentRt,
    residentRw: r.residentRw,
    kind: r.kind,
    source: r.source,
    reason: r.reason,
    knownDesil: r.knownDesil,
    status: r.status,
    statusChangedAt: r.statusChangedAt.toISOString(),
    daysInStatus: days,
    stale: isStatus(r.status) && !isFinal(r.status) && days >= STALE_DAYS,
    verifiedAt: isoDay(r.verifiedAt),
    verifiedBy: r.verifiedBy,
    verificationNote: r.verificationNote,
    musdesAt: isoDay(r.musdesAt),
    musdesRef: r.musdesRef,
    forwardedAt: isoDay(r.forwardedAt),
    forwardedRef: r.forwardedRef,
    outcome: r.outcome,
    outcomeAt: isoDay(r.outcomeAt),
    outcomeNote: r.outcomeNote,
    createdAt: r.createdAt.toISOString(),
  };
}
export type ProposalView = ReturnType<typeof serializeProposal>;

/** Usulan "terbuka" = belum berstatus akhir. */
const OPEN: Status[] = ["DIAJUKAN", "TERVERIFIKASI", "DISETUJUI_MUSDES", "DITERUSKAN"];

export async function createProposal(db: Db, args: { villageId: number; userId: number | null; input: unknown }): Promise<Result<ProposalView>> {
  const p = parseProposalInput(args.input);
  if (!p.ok) return invalid(p);
  const resident = await db.resident.findFirst({ where: { id: p.value.residentId, villageId: args.villageId }, select: { id: true, name: true, rt: true, rw: true } });
  if (!resident) return { ok: false, status: 400, errors: ["Warga tidak ditemukan di desa ini."], fieldErrors: { residentId: "Warga tidak ditemukan di desa ini." } };
  if ((await db.dtsenProposal.count({ where: { villageId: args.villageId } })) >= LIMITS.proposalsPerVillage) return fail(409, "Daftar usulan sudah mencapai batas.");
  const dup = await db.dtsenProposal.count({ where: { villageId: args.villageId, residentId: resident.id, kind: p.value.kind, status: { in: OPEN } } });
  if (dup) {
    const msg = "Warga ini sudah punya usulan sejenis yang masih berjalan.";
    return { ok: false, status: 409, errors: [msg], fieldErrors: { residentId: msg } };
  }
  const row = await db.dtsenProposal.create({
    data: { villageId: args.villageId, createdById: args.userId, residentId: resident.id, residentName: resident.name, residentRt: resident.rt, residentRw: resident.rw, kind: p.value.kind, source: p.value.source, reason: p.value.reason, knownDesil: p.value.knownDesil },
  });
  return { ok: true, data: serializeProposal(row) };
}

export async function listProposals(db: Db, villageId: number, f: { status?: string; kind?: string; stale?: boolean; search?: string; page: number; pageSize: number }, now: Date = new Date()) {
  const where: Prisma.DtsenProposalWhereInput = { villageId };
  if (isStatus(f.status)) where.status = f.status;
  if (isKind(f.kind)) where.kind = f.kind;
  if (f.stale) {
    where.status = { in: OPEN };
    where.statusChangedAt = { lte: new Date(now.getTime() - STALE_DAYS * 86_400_000) };
  }
  if (f.search) where.OR = [{ residentName: { contains: f.search } }, { reason: { contains: f.search } }, { musdesRef: { contains: f.search } }];
  const [rows, total, byStatus, stale] = await Promise.all([
    db.dtsenProposal.findMany({ where, orderBy: [{ statusChangedAt: "asc" }, { id: "asc" }], skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    db.dtsenProposal.count({ where }),
    db.dtsenProposal.groupBy({ by: ["status"], where: { villageId }, _count: { _all: true } }),
    db.dtsenProposal.count({ where: { villageId, status: { in: OPEN }, statusChangedAt: { lte: new Date(now.getTime() - STALE_DAYS * 86_400_000) } } }),
  ]);
  return { items: rows.map((r) => serializeProposal(r, now)), total, page: f.page, pageSize: f.pageSize, byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])), stale };
}

export interface TransitionInput {
  ids: number[];
  to: Status;
  data: Prisma.DtsenProposalUpdateManyMutationInput;
}

/** Isian tiap tahap. Tanggal tidak boleh di masa depan; urutan tanggal antartahap dicek di `transition`. */
export function parseTransition(body: unknown, now: Date = new Date()): Parsed<TransitionInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number))] : [];
  if (!ids.length || ids.some((n) => !Number.isInteger(n) || n < 1)) fe.ids = "Pilih minimal satu usulan.";
  else if (ids.length > LIMITS.bulk) fe.ids = `Maksimal ${LIMITS.bulk} usulan sekali proses.`;
  const to = isStatus(body.to) ? body.to : null;
  if (!to) fe.to = "Tahap tujuan tidak dikenal.";

  const date = (key: string, label: string): Date | null => {
    const d = parseIsoDate(body[key]);
    if (!d) fe[key] = `Isi ${label}.`;
    else if (future(d, now)) fe[key] = `${label[0].toUpperCase()}${label.slice(1)} tidak boleh di masa depan.`;
    return d;
  };
  const text = (key: string, label: string, max: number, required: boolean): string | null => {
    const t = cleanText(body[key], max);
    if (t.bad || (required && !t.value)) fe[key] = `Isi ${label}.`;
    else if (t.tooLong) fe[key] = `${label[0].toUpperCase()}${label.slice(1)} maksimal ${max} karakter.`;
    return t.value;
  };

  let data: Prisma.DtsenProposalUpdateManyMutationInput = {};
  if (to === "TERVERIFIKASI") data = { verifiedAt: date("verifiedAt", "tanggal verifikasi"), verifiedBy: text("verifiedBy", "nama pemverifikasi", 150, true), verificationNote: text("verificationNote", "hasil verifikasi lapangan", 1000, true) };
  else if (to === "DISETUJUI_MUSDES" || to === "DITOLAK_MUSDES") data = { musdesAt: date("musdesAt", "tanggal musyawarah desa"), musdesRef: text("musdesRef", "nomor berita acara musyawarah", 150, true) };
  else if (to === "DITERUSKAN") data = { forwardedAt: date("forwardedAt", "tanggal diteruskan"), forwardedRef: text("forwardedRef", "nomor surat pengantar", 150, true) };
  else if (to === "SELESAI") {
    const outcome = body.outcome === "DITERIMA" || body.outcome === "DITOLAK" ? (body.outcome as Outcome) : null;
    if (!outcome) fe.outcome = "Pilih hasil dari Dinas Sosial.";
    data = { outcome, outcomeAt: date("outcomeAt", "tanggal hasil"), outcomeNote: text("outcomeNote", "catatan hasil", 500, false) };
  } else if (to === "DIBATALKAN") data = { outcomeNote: text("outcomeNote", "alasan pembatalan", 500, true) };
  else if (to === "DIAJUKAN") fe.to = "Usulan tidak bisa dikembalikan ke tahap awal.";

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: { ids, to: to as Status, data } };
}

export interface TransitionResult {
  moved: number[];
  skipped: { id: number; reason: string }[];
}

/**
 * Pindahkan beberapa usulan ke tahap berikutnya (mis. satu berita acara musyawarah untuk banyak usulan).
 * Tiap usulan dicek terhadap alur dan diperbarui dengan UPDATE bersyarat pada status lamanya, jadi dua operator
 * yang menekan tombol bersamaan tidak menimpa satu sama lain. Yang tak bisa dipindah dilaporkan, bukan digagalkan semua.
 */
export async function transition(db: Db, args: { villageId: number; input: unknown; now?: Date }): Promise<Result<TransitionResult>> {
  const now = args.now ?? new Date();
  const p = parseTransition(args.input, now);
  if (!p.ok) return invalid(p);
  const rows = await db.dtsenProposal.findMany({ where: { id: { in: p.value.ids }, villageId: args.villageId }, select: { id: true, status: true, verifiedAt: true, musdesAt: true, forwardedAt: true } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const moved: number[] = [];
  const skipped: TransitionResult["skipped"] = [];
  const d = p.value.data as Record<string, unknown>;

  for (const id of p.value.ids) {
    const r = byId.get(id);
    if (!r) {
      skipped.push({ id, reason: "Usulan tidak ditemukan." });
      continue;
    }
    if (!isStatus(r.status) || !TRANSITIONS[r.status].includes(p.value.to)) {
      skipped.push({ id, reason: `Tidak bisa dari tahap "${r.status}" ke "${p.value.to}".` });
      continue;
    }
    // Urutan tanggal: musyawarah tak boleh sebelum verifikasi, diteruskan tak sebelum musyawarah, hasil tak sebelum diteruskan.
    const before = (a: Date | null, b: unknown) => a && b instanceof Date && b.getTime() < a.getTime();
    if ((p.value.to === "DISETUJUI_MUSDES" || p.value.to === "DITOLAK_MUSDES") && before(r.verifiedAt, d.musdesAt)) { skipped.push({ id, reason: "Tanggal musyawarah sebelum tanggal verifikasi." }); continue; }
    if (p.value.to === "DITERUSKAN" && before(r.musdesAt, d.forwardedAt)) { skipped.push({ id, reason: "Tanggal diteruskan sebelum tanggal musyawarah." }); continue; }
    if (p.value.to === "SELESAI" && before(r.forwardedAt, d.outcomeAt)) { skipped.push({ id, reason: "Tanggal hasil sebelum tanggal diteruskan." }); continue; }

    const done = await db.dtsenProposal.updateMany({ where: { id, villageId: args.villageId, status: r.status }, data: { ...p.value.data, status: p.value.to, statusChangedAt: now } });
    if (done.count) moved.push(id);
    else skipped.push({ id, reason: "Status usulan baru saja berubah. Muat ulang lalu coba lagi." });
  }
  return { ok: true, data: { moved, skipped } };
}
