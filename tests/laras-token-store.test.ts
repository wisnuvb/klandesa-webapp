import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import { consumeActionToken, releaseActionToken } from "../lib/ai/laras-token-store.ts";

// Penghitung rate-limit di memori yang meniru tabel mobile_rate_limits.
let rows: Map<string, number>;
beforeEach(() => {
  rows = new Map();
  const p = prisma as unknown as Record<string, unknown>;
  p.$executeRaw = async (_s: TemplateStringsArray, key: string) => {
    rows.set(key, (rows.get(key) ?? 0) + 1);
    return 1;
  };
  p.mobileRateLimit = {
    findUnique: async ({ where }: { where: { key: string } }) =>
      rows.has(where.key) ? { count: rows.get(where.key), windowStart: new Date() } : null,
    deleteMany: async ({ where }: { where: { key: string } }) => ({ count: rows.delete(where.key) ? 1 : 0 }),
  };
});

describe("token aksi sekali pakai", () => {
  it("pemakaian pertama lolos, berikutnya ditolak", async () => {
    assert.equal(await consumeActionToken("tok-a"), true);
    assert.equal(await consumeActionToken("tok-a"), false);
    assert.equal(await consumeActionToken("tok-a"), false);
  });
  it("token berbeda tidak saling memengaruhi", async () => {
    assert.equal(await consumeActionToken("tok-a"), true);
    assert.equal(await consumeActionToken("tok-b"), true);
  });
  it("token yang dilepas (galat sementara) bisa dipakai lagi", async () => {
    assert.equal(await consumeActionToken("tok-a"), true);
    await releaseActionToken("tok-a");
    assert.equal(await consumeActionToken("tok-a"), true);
  });
  it("kunci di DB berupa hash, bukan isi token (isi pengumuman tidak tersimpan)", async () => {
    await consumeActionToken("isi-token-yang-memuat-teks-pengumuman");
    for (const k of rows.keys()) {
      assert.ok(k.startsWith("laras:tok:"));
      assert.ok(!k.includes("pengumuman"));
      assert.ok(k.length <= 120);
    }
  });
});
