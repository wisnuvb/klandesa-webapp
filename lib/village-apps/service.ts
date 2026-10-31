/**
 * Aplikasi Desa (DB): ajukan templat dari tabel sendiri, tinjau (admin platform), pasang di desa lain, dan tampilkan dasbor.
 * Templat hanya membawa SKEMA (tanpa baris data). Memasang templat tidak memberi kunci API atau akses apa pun; ia hanya
 * membuat tabel kustom di desa pemasang, lewat jalur yang sama dengan membuat tabel manual (batas dan validasi sama).
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { createTable, getTable, type Result } from "@/lib/custom-data/service";
import { LIMITS } from "@/lib/custom-data/schema";
import { manifestHash, reviewManifest, summarizeManifest, validateManifest, MANIFEST_LIMITS, type AppManifest, type ManifestSummary, type Widget } from "./manifest";

type Db = Prisma.TransactionClient;

export const MAX_PENDING_PER_VILLAGE = 10;
const fail = (status: number, ...errors: string[]): { ok: false; status: number; errors: string[] } => ({ ok: false, status, errors });
const isRec = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);
const asManifest = (v: unknown): AppManifest | null => {
  const r = validateManifest(v);
  return r.ok ? r.manifest : null; // manifes tersimpan divalidasi ulang tiap dibaca; yang rusak diperlakukan tidak ada
};
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

// ---------- ajukan ----------

const toRef = (slug: string, taken: Set<string>): string => {
  let base = slug.replace(/-/g, "_").replace(/[^a-z0-9_]/g, "");
  if (!/^[a-z]/.test(base)) base = `t_${base}`;
  base = base.slice(0, 26).replace(/_+$/, "") || "tabel";
  let ref = base;
  for (let i = 2; taken.has(ref); i++) ref = `${base}_${i}`;
  taken.add(ref);
  return ref;
};

export interface SubmitArgs {
  villageId: number;
  villageName: string;
  userId: number | null;
  tableIds: unknown;
  name: unknown;
  description: unknown;
  /** Isi untuk menerbitkan versi baru dari templat milik desa ini. */
  lineageKey?: unknown;
}

export const MAX_SUBMISSIONS_PER_DAY = 20;
const isUniqueViolation = (e: unknown) => typeof e === "object" && e != null && (e as { code?: unknown }).code === "P2002";

export async function submitTemplate(db: Db, a: SubmitArgs): Promise<Result<{ id: number; version: number; warnings: string[]; tableIds: number[] }>> {
  const name = typeof a.name === "string" ? a.name.trim().replace(/\s+/g, " ") : "";
  const description = typeof a.description === "string" ? a.description.trim() : "";
  if (!name || name.length > LIMITS.name) return fail(422, `Nama aplikasi wajib diisi (maksimal ${LIMITS.name} huruf).`);
  if (!description || description.length > LIMITS.description) return fail(422, `Penjelasan wajib diisi (maksimal ${LIMITS.description} huruf).`);
  const ids = Array.isArray(a.tableIds) ? [...new Set(a.tableIds.filter((x): x is number => Number.isInteger(x) && x > 0))] : [];
  if (ids.length < 1 || ids.length > MANIFEST_LIMITS.tables) return fail(422, `Pilih 1–${MANIFEST_LIMITS.tables} tabel.`);

  const taken = new Set<string>();
  const tables: AppManifest["tables"] = [];
  for (const id of ids) {
    const t = await getTable(db, a.villageId, { id });
    if (!t) return fail(404, "Salah satu tabel tidak ditemukan.");
    tables.push({
      ref: toRef(t.slug, taken),
      name: t.name,
      description: t.description,
      linkResident: t.linkResident,
      fields: t.fields.filter((f) => !f.isArchived).map((f) => ({ label: f.label, type: f.type, required: f.required, options: f.options ?? null, piiClass: f.piiClass })),
    });
  }
  const dashboard: Widget[] = tables.flatMap((t): Widget[] => {
    const cols = t.fields.filter((f) => f.type !== "longtext").slice(0, 3).map((f) => f.label);
    return [{ type: "count", title: `Jumlah data ${t.name}`, table: t.ref }, ...(cols.length ? [{ type: "recent" as const, title: `${t.name} terbaru`, table: t.ref, columns: cols, limit: 5 }] : [])];
  });
  const checked = validateManifest({ schemaVersion: 1, tables, dashboard: dashboard.slice(0, MANIFEST_LIMITS.widgets) });
  if (!checked.ok) return { ok: false, status: 422, errors: checked.errors };
  const manifest = checked.manifest;
  const hash = manifestHash(manifest);

  if ((await db.appTemplate.count({ where: { publisherVillageId: a.villageId, status: "PENDING" } })) >= MAX_PENDING_PER_VILLAGE) {
    return fail(429, `Sudah ada ${MAX_PENDING_PER_VILLAGE} templat yang menunggu tinjauan. Tunggu keputusan dulu.`);
  }
  if ((await db.appTemplate.count({ where: { publisherVillageId: a.villageId, createdAt: { gte: new Date(Date.now() - 86_400_000) } } })) >= MAX_SUBMISSIONS_PER_DAY) {
    return fail(429, "Terlalu banyak pengajuan hari ini. Coba lagi besok.");
  }
  if (await db.appTemplate.findFirst({ where: { publisherVillageId: a.villageId, status: "PENDING", manifestHash: hash }, select: { id: true } })) {
    return fail(409, "Templat yang sama persis sudah menunggu tinjauan.");
  }
  let lineageKey: string;
  let version = 1;
  if (typeof a.lineageKey === "string" && a.lineageKey) {
    const prev = await db.appTemplate.findMany({ where: { lineageKey: a.lineageKey, publisherVillageId: a.villageId }, select: { version: true, manifestHash: true, status: true } });
    if (!prev.length) return fail(404, "Templat yang akan diperbarui tidak ditemukan.");
    if (prev.some((p) => p.manifestHash === hash && p.status !== "REJECTED" && p.status !== "WITHDRAWN")) return fail(409, "Tidak ada perubahan dari versi sebelumnya.");
    lineageKey = a.lineageKey;
    version = Math.max(...prev.map((p) => p.version)) + 1;
  } else {
    lineageKey = `app_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
  }

  const warnings = reviewManifest(manifest);
  let row: { id: number };
  try {
    row = await db.appTemplate.create({
    data: {
      lineageKey,
      version,
      publisherVillageId: a.villageId,
      publisherName: a.villageName.slice(0, 150),
      name,
      description,
      manifest: manifest as unknown as Prisma.InputJsonValue,
      manifestHash: hash,
      warnings: warnings as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  } catch (e) {
    if (isUniqueViolation(e)) return fail(409, "Ada pengajuan versi lain yang sedang diproses. Coba lagi.");
    throw e;
  }
  return { ok: true, data: { id: row.id, version, warnings, tableIds: ids } };
}

// ---------- galeri ----------

export interface TemplateCard {
  id: number;
  lineageKey: string;
  version: number;
  name: string;
  description: string;
  publisherName: string;
  official: boolean;
  status: "PENDING" | "PUBLISHED" | "REJECTED" | "WITHDRAWN";
  reviewNote: string | null;
  installCount: number;
  installed: boolean;
  summary: ManifestSummary;
  createdAt: string;
}

const STATUSES = ["PENDING", "PUBLISHED", "REJECTED", "WITHDRAWN"] as const;
const toStatus = (s: string): TemplateCard["status"] => (STATUSES as readonly string[]).includes(s) ? (s as TemplateCard["status"]) : "PENDING";

type Row = { publisherVillageId: number | null; id: number; lineageKey: string; version: number; name: string; description: string; publisherName: string; official: boolean; status: string; reviewNote: string | null; installCount: number; manifest: unknown; createdAt: Date };
const CARD_SELECT = { publisherVillageId: true, id: true, lineageKey: true, version: true, name: true, description: true, publisherName: true, official: true, status: true, reviewNote: true, installCount: true, manifest: true, createdAt: true } as const;

function toCard(r: Row, installed: Set<string>, opts: { villageId?: number; publisherVillageId?: number | null; installs?: Map<string, number> } = {}): TemplateCard | null {
  const m = asManifest(r.manifest);
  if (!m) return null;
  return {
    id: r.id,
    lineageKey: r.lineageKey,
    version: r.version,
    name: r.name,
    description: r.description,
    publisherName: r.publisherName,
    official: r.official,
    status: toStatus(r.status),
    // Catatan peninjau pada templat terbit bersifat internal: hanya penerbit yang melihatnya.
    reviewNote: r.status === "PUBLISHED" && opts.villageId !== undefined && opts.publisherVillageId !== opts.villageId ? null : r.reviewNote,
    installCount: opts.installs?.get(r.lineageKey) ?? 0,
    installed: installed.has(r.lineageKey),
    summary: summarizeManifest(m),
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listGallery(db: Db, villageId: number): Promise<{ published: TemplateCard[]; mine: TemplateCard[] }> {
  const [published, mine, installs, counts] = await Promise.all([
    db.appTemplate.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ official: "desc" }, { id: "desc" }], take: 200, select: CARD_SELECT }),
    db.appTemplate.findMany({ where: { publisherVillageId: villageId }, orderBy: { id: "desc" }, take: 100, select: CARD_SELECT }),
    db.appInstall.findMany({ where: { villageId }, select: { lineageKey: true } }),
    // Jumlah desa yang memasang = baris AppInstall (unik per desa dan templat), jadi tidak bisa digelembungkan dengan pasang-lepas.
    db.appInstall.groupBy({ by: ["lineageKey"], _count: { _all: true } }),
  ]);
  const installed = new Set(installs.map((i) => i.lineageKey));
  const perLineage = new Map(counts.map((c) => [c.lineageKey, c._count._all]));
  const cardOpts = { villageId, installs: perLineage };
  const best = new Map<string, Row>();
  for (const r of published) if (!best.has(r.lineageKey) || best.get(r.lineageKey)!.version < r.version) best.set(r.lineageKey, r);
  const ranked = [...best.values()].sort((x, y) => Number(y.official) - Number(x.official) || (perLineage.get(y.lineageKey) ?? 0) - (perLineage.get(x.lineageKey) ?? 0) || y.id - x.id);
  const cards = ranked.map((r) => toCard(r, installed, { ...cardOpts, publisherVillageId: r.publisherVillageId })).filter((c): c is TemplateCard => c != null);
  return { published: cards, mine: mine.map((r) => toCard(r, installed, { ...cardOpts, publisherVillageId: r.publisherVillageId })).filter((c): c is TemplateCard => c != null) };
}

export interface TemplateDetail extends TemplateCard {
  tables: { name: string; description: string | null; linkResident: boolean; fields: { label: string; type: string; required: boolean; piiClass: string }[] }[];
  widgets: { type: string; title: string }[];
  /** Peringatan otomatis (isi manifes saja, bukan rahasia): penerbit, peninjau, dan pemasang melihatnya. */
  warnings: string[];
}

/** Rincian untuk pratinjau sebelum memasang: terlihat bila PUBLISHED, atau milik desa ini. */
export async function getTemplateDetail(db: Db, villageId: number, id: number): Promise<TemplateDetail | null> {
  const r = await db.appTemplate.findFirst({ where: { id, OR: [{ status: "PUBLISHED" }, { publisherVillageId: villageId }] }, select: { ...CARD_SELECT, warnings: true, publisherVillageId: true } });
  if (!r) return null;
  const installed = new Set((await db.appInstall.findMany({ where: { villageId }, select: { lineageKey: true } })).map((i) => i.lineageKey));
  const counts = await db.appInstall.groupBy({ by: ["lineageKey"], where: { lineageKey: r.lineageKey }, _count: { _all: true } });
  const card = toCard(r, installed, { villageId, publisherVillageId: r.publisherVillageId, installs: new Map(counts.map((c) => [c.lineageKey, c._count._all])) });
  const m = asManifest(r.manifest);
  if (!card || !m) return null;
  return {
    ...card,
    tables: m.tables.map((t) => ({ name: t.name, description: t.description, linkResident: t.linkResident, fields: t.fields.map((f) => ({ label: f.label, type: f.type, required: f.required, piiClass: f.piiClass })) })),
    widgets: m.dashboard.map((w) => ({ type: w.type, title: w.title })),
    warnings: strList(r.warnings),
  };
}

export async function withdrawTemplate(db: Db, a: { villageId: number; id: number }): Promise<Result<{ status: "WITHDRAWN" }>> {
  const r = await db.appTemplate.updateMany({ where: { id: a.id, publisherVillageId: a.villageId, status: { in: ["PENDING", "PUBLISHED"] } }, data: { status: "WITHDRAWN" } });
  return r.count ? { ok: true, data: { status: "WITHDRAWN" } } : fail(404, "Templat tidak ditemukan atau sudah ditarik.");
}

// ---------- pasang ----------

export interface ResolvedWidget {
  type: Widget["type"];
  title: string;
  tableId: number;
  columns?: { key: string; label: string; type: string }[];
  limit?: number;
  field?: { key: string; label: string; type: string };
}

class Abort extends Error {
  constructor(public result: { ok: false; status: number; errors: string[] }) {
    super("abort");
  }
}

export async function installTemplate(client: PrismaClient, a: { villageId: number; userId: number | null; templateId: number }): Promise<Result<{ installId: number; tableIds: number[] }>> {
  try {
    const out = await client.$transaction(
      async (tx) => {
        const t = await tx.appTemplate.findFirst({ where: { id: a.templateId, status: "PUBLISHED" }, select: { id: true, lineageKey: true, name: true, manifest: true } });
        if (!t) throw new Abort(fail(404, "Templat tidak ditemukan atau belum diterbitkan."));
        const manifest = asManifest(t.manifest);
        if (!manifest) throw new Abort(fail(409, "Templat ini rusak dan tidak bisa dipasang."));
        if (await tx.appInstall.findUnique({ where: { villageId_lineageKey: { villageId: a.villageId, lineageKey: t.lineageKey } }, select: { id: true } })) {
          throw new Abort(fail(409, "Aplikasi ini sudah terpasang di desa Anda."));
        }

        const byRef = new Map<string, { id: number; fields: Map<string, { key: string; label: string; type: string }> }>();
        for (const mt of manifest.tables) {
          const r = await createTable(tx, { villageId: a.villageId, userId: a.userId, input: { name: mt.name, description: mt.description, linkResident: mt.linkResident, fields: mt.fields } });
          if (!r.ok) throw new Abort(fail(r.status, r.errors[0]));
          const made = await getTable(tx, a.villageId, { id: r.data.id });
          if (!made) throw new Abort(fail(500, "Tabel gagal dibuat."));
          byRef.set(mt.ref, { id: made.id, fields: new Map(made.fields.map((f) => [f.label, { key: f.key, label: f.label, type: f.type }])) });
        }
        const dashboard: ResolvedWidget[] = manifest.dashboard.map((w) => {
          const tb = byRef.get(w.table)!;
          const base = { type: w.type, title: w.title, tableId: tb.id } as ResolvedWidget;
          if (w.type === "recent") return { ...base, columns: w.columns.map((l) => tb.fields.get(l)!), limit: w.limit };
          if (w.type === "breakdown" || w.type === "sum") return { ...base, field: tb.fields.get(w.field)! };
          return base;
        });
        const tableIds = [...byRef.values()].map((x) => x.id);
        const inst = await tx.appInstall.create({
          data: {
            villageId: a.villageId,
            templateId: t.id,
            lineageKey: t.lineageKey,
            name: t.name,
            tables: [...byRef.entries()].map(([ref, v]) => ({ ref, tableId: v.id })) as unknown as Prisma.InputJsonValue,
            dashboard: dashboard as unknown as Prisma.InputJsonValue,
            installedById: a.userId,
          },
          select: { id: true },
        });
        await tx.appTemplate.update({ where: { id: t.id }, data: { installCount: { increment: 1 } } }); // kolom cadangan; peringkat memakai hitungan AppInstall
        return { installId: inst.id, tableIds };
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
    return { ok: true, data: out };
  } catch (e) {
    if (e instanceof Abort) return e.result;
    if (isUniqueViolation(e)) return fail(409, "Aplikasi ini sedang atau sudah terpasang di desa Anda.");
    throw e;
  }
}

export interface InstallView {
  id: number;
  name: string;
  createdAt: string;
  tables: { tableId: number; name: string }[];
}

export async function listInstalls(db: Db, villageId: number): Promise<InstallView[]> {
  const rows = await db.appInstall.findMany({ where: { villageId }, orderBy: { id: "desc" }, select: { id: true, name: true, createdAt: true, tables: true } });
  const ids = rows.flatMap((r) => (Array.isArray(r.tables) ? (r.tables as { tableId?: unknown }[]).map((t) => Number(t.tableId)) : []));
  const names = new Map((await db.customTable.findMany({ where: { villageId, id: { in: ids } }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt.toISOString(),
    tables: (Array.isArray(r.tables) ? (r.tables as { tableId?: unknown }[]) : []).map((t) => ({ tableId: Number(t.tableId), name: names.get(Number(t.tableId)) ?? "(tabel dihapus)" })),
  }));
}

/** Lepas aplikasi dari daftar. Tabel dan datanya TETAP ada (hanya pintasan dasbor yang hilang). */
export async function uninstall(db: Db, a: { villageId: number; id: number }): Promise<boolean> {
  return (await db.appInstall.deleteMany({ where: { id: a.id, villageId: a.villageId } })).count > 0;
}

// ---------- dasbor ----------

export type WidgetResult =
  | { type: "count"; title: string; value: number; available: boolean }
  | { type: "recent"; title: string; columns: { key: string; label: string; type: string }[]; rows: { id: string; values: Record<string, unknown> }[]; available: boolean }
  | { type: "breakdown"; title: string; field: string; items: { label: string; count: number }[]; available: boolean }
  | { type: "sum"; title: string; field: string; total: number; average: number | null; filled: number; available: boolean };

const SCAN_LIMIT = LIMITS.recordsPerTable;

export async function getDashboard(db: Db, a: { villageId: number; id: number }): Promise<{ name: string; widgets: WidgetResult[]; tables: { tableId: number; name: string }[] } | null> {
  const inst = await db.appInstall.findFirst({ where: { id: a.id, villageId: a.villageId }, select: { name: true, dashboard: true, tables: true } });
  if (!inst) return null;
  const widgets = (Array.isArray(inst.dashboard) ? inst.dashboard : []).filter(isRec) as unknown as ResolvedWidget[];
  const tableIds = [...new Set(widgets.map((w) => w.tableId))];
  const live = new Map((await db.customTable.findMany({ where: { villageId: a.villageId, id: { in: tableIds }, isArchived: false }, select: { id: true, name: true } })).map((t) => [t.id, t.name]));
  const where = (tableId: number) => ({ villageId: a.villageId, tableId, deletedAt: null });

  const results: WidgetResult[] = [];
  for (const w of widgets) {
    const ok = live.has(w.tableId);
    if (w.type === "count") results.push({ type: "count", title: w.title, value: ok ? await db.customRecord.count({ where: where(w.tableId) }) : 0, available: ok });
    else if (w.type === "recent") {
      const cols = w.columns ?? [];
      const rows = ok ? await db.customRecord.findMany({ where: where(w.tableId), orderBy: { id: "desc" }, take: Math.min(w.limit ?? 5, MANIFEST_LIMITS.recentRows), select: { id: true, data: true } }) : [];
      results.push({
        type: "recent",
        title: w.title,
        columns: cols,
        available: ok,
        rows: rows.map((r) => {
          const d = isRec(r.data) ? r.data : {};
          return { id: String(r.id), values: Object.fromEntries(cols.map((c) => [c.key, d[c.key] ?? null])) };
        }),
      });
    } else if (w.type === "breakdown" && w.field) {
      const counts = new Map<string, number>();
      if (ok) {
        for (const r of await db.customRecord.findMany({ where: where(w.tableId), select: { data: true }, take: SCAN_LIMIT })) {
          const v = isRec(r.data) ? r.data[w.field.key] : undefined;
          const label = v === undefined || v === null || v === "" ? "(kosong)" : v === true ? "Ya" : v === false ? "Tidak" : String(v).slice(0, 80);
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      }
      results.push({ type: "breakdown", title: w.title, field: w.field.label, available: ok, items: [...counts.entries()].map(([label, count]) => ({ label, count })).sort((x, y) => y.count - x.count || x.label.localeCompare(y.label, "id")).slice(0, 20) });
    } else if (w.type === "sum" && w.field) {
      let total = 0;
      let filled = 0;
      if (ok) {
        for (const r of await db.customRecord.findMany({ where: where(w.tableId), select: { data: true }, take: SCAN_LIMIT })) {
          const v = isRec(r.data) ? r.data[w.field.key] : undefined;
          if (typeof v === "number" && Number.isFinite(v)) {
            total += v;
            filled++;
          }
        }
      }
      results.push({ type: "sum", title: w.title, field: w.field.label, total, average: filled ? total / filled : null, filled, available: ok });
    }
  }
  const tables = (Array.isArray(inst.tables) ? (inst.tables as { tableId?: unknown }[]) : []).map((t) => ({ tableId: Number(t.tableId), name: live.get(Number(t.tableId)) ?? "(tabel dihapus/diarsipkan)" }));
  return { name: inst.name, widgets: results, tables };
}

// ---------- tinjauan oleh admin platform ----------

export interface ReviewItem extends TemplateCard {
  warnings: string[];
  /** Semua teks yang dibagikan, supaya peninjau melihat seluruhnya (termasuk pilihan, satuan, dan judul widget). */
  tables: {
    name: string;
    description: string | null;
    linkResident: boolean;
    fields: { label: string; type: string; required: boolean; piiClass: string; options: string[] | null; unit: string | null }[];
  }[];
  widgets: { type: string; title: string }[];
}

export async function listForReview(db: Db, status: "PENDING" | "ALL"): Promise<ReviewItem[]> {
  const rows = await db.appTemplate.findMany({ where: status === "ALL" ? {} : { status: "PENDING" }, orderBy: { id: status === "ALL" ? "desc" : "asc" }, take: 100, select: { ...CARD_SELECT, warnings: true } });
  const out: ReviewItem[] = [];
  for (const r of rows) {
    const card = toCard(r, new Set());
    const m = asManifest(r.manifest);
    if (!card || !m) continue;
    out.push({
      ...card,
      warnings: strList(r.warnings),
      widgets: m.dashboard.map((w) => ({ type: w.type, title: w.title })),
      tables: m.tables.map((t) => ({
        name: t.name,
        description: t.description,
        linkResident: t.linkResident,
        fields: t.fields.map((f) => ({
          label: f.label,
          type: f.type,
          required: f.required,
          piiClass: f.piiClass,
          options: Array.isArray(f.options) ? (f.options as unknown[]).filter((o): o is string => typeof o === "string") : null,
          unit: isRec(f.options) && typeof f.options.unit === "string" ? f.options.unit : null,
        })),
      })),
    });
  }
  return out;
}

/** Admin platform: cabut templat yang sudah terbit (misalnya ketahuan memuat kolom pribadi yang salah tanda). Pemasangan lama tetap jalan. */
export async function unpublishTemplate(db: Db, a: { id: number; adminId: number | null; reason: unknown; now?: Date }): Promise<Result<{ status: "WITHDRAWN" }>> {
  const reason = typeof a.reason === "string" ? a.reason.trim().slice(0, 300) : "";
  if (!reason) return fail(422, "Isi alasan pencabutan.");
  const r = await db.appTemplate.updateMany({ where: { id: a.id, status: "PUBLISHED" }, data: { status: "WITHDRAWN", reviewNote: reason, reviewedById: a.adminId, reviewedAt: a.now ?? new Date(), official: false } });
  return r.count === 1 ? { ok: true, data: { status: "WITHDRAWN" } } : fail(409, "Templat ini tidak sedang terbit.");
}

/** Admin platform: pasang atau cabut lencana "Resmi" pada templat yang terbit. */
export async function setTemplateOfficial(db: Db, a: { id: number; official: boolean }): Promise<Result<{ official: boolean }>> {
  const r = await db.appTemplate.updateMany({ where: { id: a.id, status: "PUBLISHED" }, data: { official: a.official } });
  return r.count === 1 ? { ok: true, data: { official: a.official } } : fail(409, "Templat ini tidak sedang terbit.");
}

export async function decideTemplate(db: Db, a: { id: number; adminId: number | null; decision: "approve" | "reject"; note?: unknown; official?: boolean; now?: Date }): Promise<Result<{ status: "PUBLISHED" | "REJECTED" }>> {
  const now = a.now ?? new Date();
  const note = typeof a.note === "string" ? a.note.trim().slice(0, 300) || null : null;
  if (a.decision === "reject" && !note) return fail(422, "Isi alasan penolakan agar penerbit tahu apa yang perlu diperbaiki.");
  const row = await db.appTemplate.findUnique({ where: { id: a.id }, select: { id: true, manifest: true } });
  if (!row) return fail(404, "Templat tidak ditemukan.");
  if (a.decision === "approve" && !asManifest(row.manifest)) return fail(409, "Manifes tidak lolos validasi; tidak bisa diterbitkan.");
  const r = await db.appTemplate.updateMany({
    where: { id: a.id, status: "PENDING" },
    data: a.decision === "approve" ? { status: "PUBLISHED", reviewNote: note, reviewedById: a.adminId, reviewedAt: now, publishedAt: now, official: a.official === true } : { status: "REJECTED", reviewNote: note, reviewedById: a.adminId, reviewedAt: now },
  });
  if (r.count !== 1) return fail(409, "Templat ini sudah diputuskan.");
  return { ok: true, data: { status: a.decision === "approve" ? "PUBLISHED" : "REJECTED" } };
}

