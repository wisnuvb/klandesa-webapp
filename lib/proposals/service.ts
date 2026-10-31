/**
 * Usulan perubahan data (maker-checker). Aplikasi luar (kunci API / MCP) hanya bisa MENGUSULKAN; admin atau sekretaris
 * desa yang menyetujui, dan baru saat itu data berubah lewat jalur yang sama dengan operator (validasi penuh, audit).
 * Aturan keras: usulan hanya boleh memuat kolom ber-kelas data NONE (bukan data pribadi), dan tidak bisa membuat baris
 * bila tabel punya kolom wajib berisi data pribadi (karena kolom itu tak boleh diisi dari luar).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { createRecord, getTable, updateRecord, type Result } from "@/lib/custom-data/service";
import { LIMITS, validateRecord } from "@/lib/custom-data/schema";

type Db = Prisma.TransactionClient;

export const PROPOSAL_TTL_DAYS = 30;
export const MAX_PENDING_PER_VILLAGE = 100;
export const MAX_PENDING_PER_KEY = 30;
export const NOTE_MAX = 300;

const fail = (status: number, ...errors: string[]): { ok: false; status: number; errors: string[] } => ({ ok: false, status, errors });
const isObj = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);
const asData = (v: unknown): Record<string, unknown> => (isObj(v) ? v : {});

export type ProposalStatus = "PENDING" | "APPLIED" | "REJECTED" | "EXPIRED";
const STATUSES: readonly ProposalStatus[] = ["PENDING", "APPLIED", "REJECTED", "EXPIRED"];
const toStatus = (s: string): ProposalStatus => (STATUSES as readonly string[]).includes(s) ? (s as ProposalStatus) : "PENDING";

export interface SubmitArgs {
  villageId: number;
  key: { id: number; prefix: string; name: string };
  slug: string;
  body: unknown;
  source?: "api_key" | "mcp";
  now?: Date;
}

export interface SubmittedProposal {
  id: string;
  status: "PENDING";
  expiresAt: string;
}

/** Tandai usulan yang lewat masa berlaku. Murah; dipanggil saat mengajukan dan saat melihat daftar. */
export async function expireStale(db: Db, villageId: number, now = new Date()): Promise<void> {
  await db.changeProposal.updateMany({ where: { villageId, status: "PENDING", expiresAt: { lte: now } }, data: { status: "EXPIRED" } });
}

export async function submitProposal(db: Db, a: SubmitArgs): Promise<Result<SubmittedProposal & { tableId: number; operation: string }>> {
  const now = a.now ?? new Date();
  if (!isObj(a.body)) return fail(400, "Isi permintaan harus berupa objek JSON.");
  const b = a.body;
  const operation = b.operation;
  if (operation !== "create" && operation !== "update") return fail(422, 'operation harus "create" atau "update".');
  if (!isObj(b.data)) return fail(422, "data harus berupa objek { kunciKolom: nilai }.");
  const note = typeof b.note === "string" ? b.note.trim().slice(0, NOTE_MAX) || null : null;

  const table = await getTable(db, a.villageId, { slug: a.slug });
  if (!table) return fail(404, "Tabel tidak ditemukan.");

  const active = new Map(table.fields.filter((f) => !f.isArchived).map((f) => [f.key, f]));
  const keys = Object.keys(b.data);
  if (keys.length === 0) return fail(422, "Isi minimal satu kolom.");
  const problems: string[] = [];
  for (const k of keys) {
    const f = active.get(k);
    if (!f) problems.push(`Kolom "${k.slice(0, 60)}" tidak dikenal atau sudah diarsipkan.`);
    else if (f.piiClass !== "NONE") problems.push(`Kolom "${f.label}" berisi data pribadi dan tidak bisa diisi lewat API.`);
  }
  if (problems.length) return fail(422, ...problems);

  const safeFields = [...active.values()].filter((f) => f.piiClass === "NONE");
  await expireStale(db, a.villageId, now);

  let targetRecordId: bigint | null = null;
  let validated: Record<string, unknown>;
  if (operation === "create") {
    const blocked = [...active.values()].filter((f) => f.required && f.piiClass !== "NONE");
    if (blocked.length) return fail(409, `Tabel ini punya kolom wajib berisi data pribadi (${blocked.map((f) => f.label).join(", ")}), jadi baris baru tidak bisa diusulkan lewat API.`);
    if (table.recordCount >= LIMITS.recordsPerTable) return fail(409, `Tabel ini sudah mencapai batas ${LIMITS.recordsPerTable.toLocaleString("id-ID")} baris.`);
    const v = validateRecord(safeFields, b.data, {}, "create");
    if (!v.ok) return { ok: false, status: 422, errors: Object.values(v.errors), fieldErrors: v.errors };
    validated = v.data;
  } else {
    const raw = b.recordId;
    const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
    if (!/^\d{1,18}$/.test(text) || text === "0") return fail(422, "recordId wajib berupa angka id baris yang akan diubah.");
    targetRecordId = BigInt(text);
    const existing = await db.customRecord.findFirst({ where: { id: targetRecordId, villageId: a.villageId, tableId: table.id, deletedAt: null }, select: { data: true } });
    if (!existing) return fail(404, "Baris yang akan diubah tidak ditemukan.");
    const old = asData(existing.data);
    const oldSafe: Record<string, unknown> = {};
    for (const f of safeFields) if (f.key in old) oldSafe[f.key] = old[f.key];
    const v = validateRecord(safeFields, b.data, oldSafe, "update");
    if (!v.ok) return { ok: false, status: 422, errors: Object.values(v.errors), fieldErrors: v.errors };
    validated = v.data;
  }

  // Hanya kolom yang disebut pengusul; mengosongkan kolom opsional dinyatakan sebagai null.
  const payload: Record<string, unknown> = {};
  for (const k of keys) payload[k] = Object.prototype.hasOwnProperty.call(validated, k) ? validated[k] : null;

  const [perKey, perVillage] = await Promise.all([
    db.changeProposal.count({ where: { villageId: a.villageId, apiKeyId: a.key.id, status: "PENDING" } }),
    db.changeProposal.count({ where: { villageId: a.villageId, status: "PENDING" } }),
  ]);
  if (perKey >= MAX_PENDING_PER_KEY) return fail(429, `Kunci ini sudah punya ${MAX_PENDING_PER_KEY} usulan yang belum diputuskan. Tunggu admin desa memprosesnya.`);
  if (perVillage >= MAX_PENDING_PER_VILLAGE) return fail(429, "Terlalu banyak usulan yang menunggu persetujuan di desa ini. Coba lagi nanti.");

  const expiresAt = new Date(now.getTime() + PROPOSAL_TTL_DAYS * 86_400_000);
  const row = await db.changeProposal.create({
    data: {
      villageId: a.villageId,
      source: a.source ?? "api_key",
      apiKeyId: a.key.id,
      keyPrefix: a.key.prefix,
      keyName: a.key.name.slice(0, 100),
      entity: "custom_record",
      operation,
      tableId: table.id,
      targetRecordId,
      payload: payload as Prisma.InputJsonValue,
      note,
      expiresAt,
    },
    select: { id: true },
  });
  return { ok: true, data: { id: String(row.id), status: "PENDING", expiresAt: expiresAt.toISOString(), tableId: table.id, operation } };
}

export interface OwnProposalView {
  id: string;
  operation: string;
  recordId: string | null;
  status: ProposalStatus;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** Usulan milik satu kunci pada satu tabel (supaya aplikasi tahu hasilnya). */
export async function listOwnProposals(db: Db, a: { villageId: number; keyId: number; slug: string; limit?: number }): Promise<OwnProposalView[] | null> {
  const table = await getTable(db, a.villageId, { slug: a.slug });
  if (!table) return null;
  await expireStale(db, a.villageId);
  const rows = await db.changeProposal.findMany({
    where: { villageId: a.villageId, apiKeyId: a.keyId, tableId: table.id },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(a.limit ?? 50, 1), 100),
    select: { id: true, operation: true, targetRecordId: true, appliedRecordId: true, status: true, rejectionReason: true, createdAt: true, decidedAt: true },
  });
  return rows.map((r) => ({
    id: String(r.id),
    operation: r.operation,
    recordId: String(r.appliedRecordId ?? r.targetRecordId ?? "") || null,
    status: toStatus(r.status),
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
}

export interface ProposalChange {
  key: string;
  label: string;
  type: string;
  value: unknown;
  /** Nilai sekarang (hanya untuk usulan ubah). */
  before?: unknown;
}

export interface ProposalView {
  id: string;
  operation: "create" | "update";
  tableId: number;
  tableName: string;
  tableSlug: string;
  recordId: string | null;
  keyName: string | null;
  keyPrefix: string | null;
  note: string | null;
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
  changes: ProposalChange[];
}

export async function countPending(db: Db, villageId: number): Promise<number> {
  await expireStale(db, villageId);
  return db.changeProposal.count({ where: { villageId, status: "PENDING" } });
}

/** Daftar untuk admin. `status`: PENDING (bawaan) atau ALL (riwayat terbaru). */
export async function listProposals(db: Db, a: { villageId: number; status?: "PENDING" | "ALL"; limit?: number }): Promise<ProposalView[]> {
  await expireStale(db, a.villageId);
  const rows = await db.changeProposal.findMany({
    where: { villageId: a.villageId, ...(a.status === "ALL" ? {} : { status: "PENDING" }) },
    orderBy: { id: a.status === "ALL" ? "desc" : "asc" },
    take: Math.min(Math.max(a.limit ?? 50, 1), 100),
  });
  if (!rows.length) return [];
  const tables = await db.customTable.findMany({
    where: { villageId: a.villageId, id: { in: [...new Set(rows.map((r) => r.tableId))] } },
    select: { id: true, slug: true, name: true, fields: { select: { key: true, label: true, type: true, piiClass: true } } },
  });
  const byTable = new Map(tables.map((t) => [t.id, t]));
  const targetIds = rows.flatMap((r) => (r.targetRecordId != null && r.status === "PENDING" ? [r.targetRecordId] : []));
  const existing = targetIds.length ? await db.customRecord.findMany({ where: { villageId: a.villageId, id: { in: targetIds } }, select: { id: true, data: true } }) : [];
  const existingById = new Map(existing.map((r) => [String(r.id), asData(r.data)]));

  return rows.map((r) => {
    const t = byTable.get(r.tableId);
    const fieldInfo = new Map((t?.fields ?? []).map((f) => [f.key, f]));
    const payload = asData(r.payload);
    const old = r.targetRecordId != null ? existingById.get(String(r.targetRecordId)) : undefined;
    return {
      id: String(r.id),
      operation: r.operation === "update" ? "update" : "create",
      tableId: r.tableId,
      tableName: t?.name ?? "(tabel dihapus)",
      tableSlug: t?.slug ?? "",
      recordId: r.targetRecordId != null ? String(r.targetRecordId) : r.appliedRecordId != null ? String(r.appliedRecordId) : null,
      keyName: r.keyName,
      keyPrefix: r.keyPrefix,
      note: r.note,
      status: toStatus(r.status),
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      decidedAt: r.decidedAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
      // Kolom yang kini bukan NONE tidak ditampilkan nilainya (daftar ini terbaca peran selain admin).
      changes: Object.keys(payload).map((k) => {
        const f = fieldInfo.get(k);
        if (f && f.piiClass !== "NONE") return { key: k, label: f.label, type: "text", value: "(kolom ini kini ditandai data pribadi)", ...(old ? { before: "(disembunyikan)" } : {}) };
        return { key: k, label: f?.label ?? k, type: f?.type ?? "text", value: payload[k], ...(old ? { before: old[k] ?? null } : {}) };
      }),
    };
  });
}

/** Buang usulan yang sudah diputuskan/kedaluwarsa lebih dari 90 hari. */
export async function purgeOldProposals(db: Db, now = new Date()): Promise<number> {
  const r = await db.changeProposal.deleteMany({ where: { status: { not: "PENDING" }, createdAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } } });
  return r.count;
}

class Abort extends Error {
  constructor(public result: { ok: false; status: number; errors: string[] }) {
    super("abort");
  }
}

export interface DecideArgs {
  villageId: number;
  id: bigint;
  userId: number | null;
  decision: "approve" | "reject";
  reason?: unknown;
  now?: Date;
}

export interface DecideOutcome {
  status: "APPLIED" | "REJECTED";
  tableId: number;
  operation: "create" | "update";
  recordId: string | null;
}

/**
 * Putuskan satu usulan. Persetujuan dan perubahan data terjadi dalam SATU transaksi: bila data tak bisa diterapkan
 * (mis. barisnya sudah dihapus atau skema berubah), semua dibatalkan dan usulan tetap menunggu.
 */
export async function decideProposal(client: PrismaClient, a: DecideArgs): Promise<Result<DecideOutcome>> {
  const now = a.now ?? new Date();
  const reason = typeof a.reason === "string" ? a.reason.trim().slice(0, 300) || null : null;
  try {
    const outcome = await client.$transaction(
      async (tx) => {
        const row = await tx.changeProposal.findFirst({ where: { id: a.id, villageId: a.villageId } });
        if (!row) throw new Abort(fail(404, "Usulan tidak ditemukan."));
        if (row.status !== "PENDING") throw new Abort(fail(409, "Usulan ini sudah diputuskan atau kedaluwarsa."));
        if (row.expiresAt.getTime() <= now.getTime()) {
          await tx.changeProposal.update({ where: { id: row.id }, data: { status: "EXPIRED" } });
          return { expired: true as const };
        }
        const operation: "create" | "update" = row.operation === "update" ? "update" : "create";

        const claim = await tx.changeProposal.updateMany({
          where: { id: row.id, villageId: a.villageId, status: "PENDING" },
          data: { status: a.decision === "approve" ? "APPLIED" : "REJECTED", decidedById: a.userId, decidedAt: now, rejectionReason: a.decision === "reject" ? reason : null },
        });
        if (claim.count !== 1) throw new Abort(fail(409, "Usulan ini baru saja diputuskan oleh orang lain."));
        if (a.decision === "reject") return { status: "REJECTED" as const, tableId: row.tableId, operation, recordId: null };

        const data = asData(row.payload);
        // Penyaring terakhir: klasifikasi kolom bisa berubah sejak usulan diajukan; nilai dari luar tak boleh masuk kolom pribadi.
        const live = await tx.customField.findMany({ where: { tableId: row.tableId, isArchived: false, key: { in: Object.keys(data) } }, select: { key: true, piiClass: true } });
        const nowPrivate = live.filter((f) => f.piiClass !== "NONE");
        if (nowPrivate.length) throw new Abort(fail(409, `Tidak bisa diterapkan: kolom "${nowPrivate[0].key}" kini ditandai data pribadi. Tolak usulan ini.`));
        let recordId: string;
        if (operation === "create") {
          const r = await createRecord(tx, { villageId: a.villageId, tableId: row.tableId, userId: a.userId, data });
          if (!r.ok) throw new Abort(fail(409, `Tidak bisa diterapkan: ${r.errors[0]}`));
          recordId = r.data.id;
        } else {
          if (row.targetRecordId == null) throw new Abort(fail(409, "Tidak bisa diterapkan: baris tujuan tidak tercatat."));
          const r = await updateRecord(tx, { villageId: a.villageId, recordId: row.targetRecordId, userId: a.userId, data });
          if (!r.ok) throw new Abort(fail(409, `Tidak bisa diterapkan: ${r.errors[0]}`));
          recordId = r.data.id;
        }
        await tx.changeProposal.update({ where: { id: row.id }, data: { appliedRecordId: BigInt(recordId) } });
        return { status: "APPLIED" as const, tableId: row.tableId, operation, recordId };
      },
      { maxWait: 10_000, timeout: 20_000 },
    );
    if ("expired" in outcome) return fail(410, "Usulan ini sudah kedaluwarsa dan tidak bisa diterapkan.");
    return { ok: true, data: outcome };
  } catch (e) {
    if (e instanceof Abort) return e.result;
    throw e;
  }
}
