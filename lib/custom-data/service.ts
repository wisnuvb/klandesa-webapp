/** Layanan data kustom (DB): tabel, skema, dan baris. Semua kueri dibatasi `villageId`; baris dihapus lunak. Tanpa HTTP. */
import type { Prisma } from "@prisma/client";
import {
  isFieldType,
  isPiiClass,
  LIMITS,
  planSchemaChange,
  slugify,
  toCsv,
  validateRecord,
  validateTableInput,
  type FieldDef,
  type SchemaChange,
  type SchemaDiff,
  type TableInput,
} from "./schema";

type Db = Prisma.TransactionClient;

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; errors: string[]; fieldErrors?: Record<string, string> };
const fail = (status: number, ...errors: string[]): { ok: false; status: number; errors: string[] } => ({ ok: false, status, errors });

type FieldRow = { key: string; label: string; type: string; required: boolean; options: unknown; piiClass: string; position: number; isArchived: boolean };

export const toFieldDef = (r: FieldRow): FieldDef => ({
  key: r.key,
  label: r.label,
  type: isFieldType(r.type) ? r.type : "text",
  required: r.required,
  options: r.options ?? null,
  piiClass: isPiiClass(r.piiClass) ? r.piiClass : "SENSITIVE", // nilai tak dikenal diperlakukan paling tertutup
  position: r.position,
  isArchived: r.isArchived,
});

export interface TableSummary {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  linkResident: boolean;
  fieldCount: number;
  recordCount: number;
  updatedAt: string;
}

export async function listTables(db: Db, villageId: number): Promise<TableSummary[]> {
  const tables = await db.customTable.findMany({
    where: { villageId, isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true, linkResident: true, updatedAt: true, fields: { where: { isArchived: false }, select: { id: true } } },
  });
  const counts = await db.customRecord.groupBy({ by: ["tableId"], where: { villageId, deletedAt: null, tableId: { in: tables.map((t) => t.id) } }, _count: { _all: true } });
  const byTable = new Map(counts.map((c) => [c.tableId, c._count._all]));
  return tables.map((t) => ({ id: t.id, slug: t.slug, name: t.name, description: t.description, linkResident: t.linkResident, fieldCount: t.fields.length, recordCount: byTable.get(t.id) ?? 0, updatedAt: t.updatedAt.toISOString() }));
}

export interface TableDetail {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  linkResident: boolean;
  isArchived: boolean;
  fields: FieldDef[];
  recordCount: number;
}

export async function getTable(db: Db, villageId: number, ref: { id?: number; slug?: string }): Promise<TableDetail | null> {
  const t = await db.customTable.findFirst({
    where: { villageId, isArchived: false, ...(ref.id != null ? { id: ref.id } : { slug: ref.slug }) },
    select: { id: true, slug: true, name: true, description: true, linkResident: true, isArchived: true, fields: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
  });
  if (!t) return null;
  const recordCount = await db.customRecord.count({ where: { villageId, tableId: t.id, deletedAt: null } });
  return { id: t.id, slug: t.slug, name: t.name, description: t.description, linkResident: t.linkResident, isArchived: t.isArchived, fields: t.fields.map(toFieldDef), recordCount };
}

export async function createTable(db: Db, a: { villageId: number; userId: number | null; input: TableInput }): Promise<Result<{ id: number; slug: string }>> {
  const v = validateTableInput(a.input);
  if (!v.ok) return fail(422, ...v.errors);
  const count = await db.customTable.count({ where: { villageId: a.villageId, isArchived: false } });
  if (count >= LIMITS.tablesPerVillage) return fail(409, `Maksimal ${LIMITS.tablesPerVillage} tabel per desa. Arsipkan tabel yang tidak dipakai dulu.`);

  // slug unik per desa (termasuk yang diarsipkan): tambahkan -2, -3, ... bila bentrok
  let slug = v.value.slug;
  const taken = new Set((await db.customTable.findMany({ where: { villageId: a.villageId, slug: { startsWith: slug } }, select: { slug: true } })).map((t) => t.slug));
  for (let i = 2; taken.has(slug); i++) slug = `${slugify(v.value.name, 56)}-${i}`;

  const t = await db.customTable.create({
    data: {
      villageId: a.villageId,
      slug,
      name: v.value.name,
      description: v.value.description,
      linkResident: v.value.linkResident,
      createdById: a.userId,
      fields: { create: v.value.fields.map((f, i) => ({ key: f.key, label: f.label, type: f.type, required: f.required, options: (f.options ?? undefined) as Prisma.InputJsonValue | undefined, piiClass: f.piiClass, position: i })) },
    },
    select: { id: true, slug: true },
  });
  return { ok: true, data: t };
}

/** Pratinjau (`dryRun`) dan penerapan perubahan skema. Mengembalikan ringkasan perubahan untuk layar dan audit. */
export async function changeSchema(db: Db, a: { villageId: number; tableId: number; change: SchemaChange; dryRun?: boolean }): Promise<Result<{ diff: SchemaDiff }>> {
  const table = await getTable(db, a.villageId, { id: a.tableId });
  if (!table) return fail(404, "Tabel tidak ditemukan.");
  const plan = planSchemaChange(table.fields, a.change, table.recordCount > 0);
  if (!plan.ok) return fail(422, ...plan.errors);
  if (a.dryRun) return { ok: true, data: { diff: plan.diff } };

  const d = plan.diff;
  if (d.name !== null || d.description !== undefined) {
    await db.customTable.update({ where: { id: table.id }, data: { ...(d.name !== null ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}) } });
  }
  for (const r of d.renamed) await db.customField.update({ where: { tableId_key: { tableId: table.id, key: r.key } }, data: { label: r.label } });
  for (const key of d.archived) await db.customField.update({ where: { tableId_key: { tableId: table.id, key } }, data: { isArchived: true } });
  for (const o of d.optionsAdded) {
    const f = table.fields.find((x) => x.key === o.key)!;
    await db.customField.update({ where: { tableId_key: { tableId: table.id, key: o.key } }, data: { options: [...(Array.isArray(f.options) ? (f.options as string[]) : []), ...o.options] } });
  }
  for (const p of d.piiChanged) await db.customField.update({ where: { tableId_key: { tableId: table.id, key: p.key } }, data: { piiClass: p.to } });
  let position = Math.max(-1, ...table.fields.map((f) => f.position)) + 1;
  for (const f of d.added) {
    await db.customField.create({ data: { tableId: table.id, key: f.key, label: f.label, type: f.type, required: f.required, options: (f.options ?? undefined) as Prisma.InputJsonValue | undefined, piiClass: f.piiClass, position: position++ } });
  }
  await db.customTable.update({ where: { id: table.id }, data: { updatedAt: new Date() } });
  return { ok: true, data: { diff: d } };
}

export async function archiveTable(db: Db, villageId: number, tableId: number): Promise<boolean> {
  const r = await db.customTable.updateMany({ where: { id: tableId, villageId, isArchived: false }, data: { isArchived: true } });
  return r.count === 1;
}

// ---------- baris ----------

export interface RecordView {
  id: string;
  data: Record<string, unknown>;
  resident: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

const asData = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const RECORD_SELECT = { id: true, data: true, createdAt: true, updatedAt: true, resident: { select: { id: true, name: true } } } as const;
const toView = (r: { id: bigint; data: unknown; createdAt: Date; updatedAt: Date; resident: { id: number; name: string } | null }): RecordView => ({
  id: String(r.id),
  data: asData(r.data),
  resident: r.resident,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export async function listRecords(db: Db, a: { villageId: number; tableId: number; cursor?: bigint | null; limit: number }): Promise<{ items: RecordView[]; nextCursor: string | null }> {
  const rows = await db.customRecord.findMany({
    where: { villageId: a.villageId, tableId: a.tableId, deletedAt: null, ...(a.cursor ? { id: { lt: a.cursor } } : {}) },
    orderBy: { id: "desc" },
    take: a.limit + 1,
    select: RECORD_SELECT,
  });
  const more = rows.length > a.limit;
  const page = more ? rows.slice(0, a.limit) : rows;
  return { items: page.map(toView), nextCursor: more ? String(page[page.length - 1].id) : null };
}

async function checkResident(db: Db, villageId: number, table: TableDetail, residentId: unknown): Promise<Result<number | null>> {
  if (!table.linkResident) return residentId == null || residentId === "" ? { ok: true, data: null } : fail(422, "Tabel ini tidak terkait warga.");
  const id = Number(residentId);
  if (!Number.isInteger(id) || id <= 0) return fail(422, "Pilih warga yang terkait dengan data ini.");
  const exists = await db.resident.findFirst({ where: { id, villageId }, select: { id: true } });
  return exists ? { ok: true, data: id } : fail(422, "Warga tidak ditemukan di desa ini.");
}

export async function createRecord(db: Db, a: { villageId: number; tableId: number; userId: number | null; data: unknown; residentId?: unknown }): Promise<Result<RecordView>> {
  const table = await getTable(db, a.villageId, { id: a.tableId });
  if (!table) return fail(404, "Tabel tidak ditemukan.");
  if (table.recordCount >= LIMITS.recordsPerTable) return fail(409, `Tabel ini sudah mencapai batas ${LIMITS.recordsPerTable.toLocaleString("id-ID")} baris.`);
  const v = validateRecord(table.fields, a.data, {}, "create");
  if (!v.ok) return { ok: false, status: 422, errors: Object.values(v.errors), fieldErrors: v.errors };
  const res = await checkResident(db, a.villageId, table, a.residentId);
  if (!res.ok) return res;
  const row = await db.customRecord.create({
    data: { villageId: a.villageId, tableId: table.id, data: v.data as Prisma.InputJsonValue, residentId: res.data, createdById: a.userId, updatedById: a.userId },
    select: RECORD_SELECT,
  });
  return { ok: true, data: toView(row) };
}

export async function updateRecord(db: Db, a: { villageId: number; recordId: bigint; userId: number | null; data: unknown; residentId?: unknown }): Promise<Result<RecordView & { tableId: number }>> {
  const existing = await db.customRecord.findFirst({ where: { id: a.recordId, villageId: a.villageId, deletedAt: null }, select: { id: true, tableId: true, data: true } });
  if (!existing) return fail(404, "Data tidak ditemukan.");
  const table = await getTable(db, a.villageId, { id: existing.tableId });
  if (!table) return fail(404, "Tabel tidak ditemukan.");
  const v = validateRecord(table.fields, a.data, asData(existing.data), "update");
  if (!v.ok) return { ok: false, status: 422, errors: Object.values(v.errors), fieldErrors: v.errors };
  let residentPatch: { residentId: number | null } | Record<string, never> = {};
  if (a.residentId !== undefined) {
    const res = await checkResident(db, a.villageId, table, a.residentId);
    if (!res.ok) return res;
    residentPatch = { residentId: res.data };
  }
  const row = await db.customRecord.update({ where: { id: existing.id }, data: { data: v.data as Prisma.InputJsonValue, updatedById: a.userId, ...residentPatch }, select: RECORD_SELECT });
  return { ok: true, data: { ...toView(row), tableId: table.id } };
}

/** Hapus lunak. Mengembalikan id tabel bila berhasil (untuk audit), null bila tidak ada. */
export async function deleteRecord(db: Db, a: { villageId: number; recordId: bigint; userId: number | null }): Promise<number | null> {
  const r = await db.customRecord.findFirst({ where: { id: a.recordId, villageId: a.villageId, deletedAt: null }, select: { id: true, tableId: true } });
  if (!r) return null;
  await db.customRecord.update({ where: { id: r.id }, data: { deletedAt: new Date(), updatedById: a.userId } });
  return r.tableId;
}

export async function exportCsv(db: Db, villageId: number, table: TableDetail): Promise<string> {
  const active = table.fields.filter((f) => !f.isArchived);
  const rows = await db.customRecord.findMany({
    where: { villageId, tableId: table.id, deletedAt: null },
    orderBy: { id: "asc" },
    take: LIMITS.recordsPerTable,
    select: { id: true, data: true, createdAt: true, resident: { select: { name: true, nik: true } } },
  });
  const header = [...(table.linkResident ? ["Warga", "NIK (4 digit akhir)"] : []), ...active.map((f) => f.label), "Dibuat"];
  return toCsv(
    header,
    rows.map((r) => {
      const d = asData(r.data);
      return [...(table.linkResident ? [r.resident?.name ?? "", r.resident ? r.resident.nik.slice(-4) : ""] : []), ...active.map((f) => d[f.key] ?? ""), r.createdAt.toISOString().slice(0, 10)];
    }),
  );
}
