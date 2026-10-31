import { prisma } from "../../lib/prisma.ts";

/**
 * DB tiruan di memori untuk uji keamanan: delegasi Prisma yang DIPAKAI Laras diganti tabel yang benar-benar memfilter
 * `where`, termasuk `villageId`. Operator yang tidak dikenal melempar galat (agar tes gagal keras, bukan lolos diam-diam).
 */
export type Row = Record<string, unknown>;

function matches(r: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]) => {
    if (k === "OR") return (v as Row[]).some((w) => matches(r, w));
    if (k === "AND") return (v as Row[]).every((w) => matches(r, w));
    if (v !== null && typeof v === "object" && !(v instanceof Date) && typeof v !== "bigint") {
      const ops = v as Row;
      return Object.entries(ops).every(([op, arg]) => {
        const cur = r[k] as never;
        switch (op) {
          case "in": return (arg as unknown[]).includes(cur);
          case "not": return cur !== arg;
          case "gte": return cur >= (arg as never);
          case "gt": return cur > (arg as never);
          case "lt": return cur < (arg as never);
          case "lte": return cur <= (arg as never);
          default: throw new Error(`fake-db: operator tidak didukung: ${op}`);
        }
      });
    }
    return r[k] === v;
  });
}

export function table(rows: Row[], extra: Record<string, unknown> = {}) {
  return {
    rows,
    findFirst: async (a: { where?: Row } = {}) => rows.find((r) => matches(r, a.where)) ?? null,
    findUnique: async (a: { where: Row }) => rows.find((r) => matches(r, a.where)) ?? null,
    findMany: async (a: { where?: Row; take?: number } = {}) => rows.filter((r) => matches(r, a.where)).slice(0, a.take ?? Infinity),
    count: async (a: { where?: Row } = {}) => rows.filter((r) => matches(r, a.where)).length,
    updateMany: async (a: { where?: Row; data: Row }) => {
      const hit = rows.filter((r) => matches(r, a.where));
      for (const r of hit) Object.assign(r, a.data);
      return { count: hit.length };
    },
    create: async (a: { data: Row }) => {
      const row = { id: rows.length + 1000, ...a.data };
      rows.push(row);
      return row;
    },
    ...extra,
  };
}

export function installFakeDb(tables: Record<string, Row[]>) {
  const p = prisma as unknown as Record<string, unknown>;
  const made: Record<string, ReturnType<typeof table>> = {};
  for (const [name, rows] of Object.entries(tables)) {
    made[name] = table(rows);
    p[name] = made[name];
  }
  p.villageModuleSubscription ??= { findMany: async () => [], updateMany: async () => ({ count: 0 }) };
  p.websiteSubscription ??= { findUnique: async () => null };
  p.$transaction = async (fn: (tx: unknown) => unknown) => fn(p);
  return made;
}
