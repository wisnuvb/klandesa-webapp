import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import { addTokensUsed, checkTokenBudget, estimateTokens, getDailyTokenCap, DEFAULT_DAILY_TOKEN_CAP, readTokensUsed } from "../lib/ai/token-budget.ts";
import { trimHistoryForAi, HISTORY_MAX_CHARS, HISTORY_MESSAGE_MAX_CHARS } from "../lib/ai/history.ts";
import { createTtlCache } from "../lib/ai/ttl-cache.ts";
import { ndjsonResponse, readNdjson, type StreamEvent } from "../lib/ai/ndjson.ts";
import { larasToolLabel, larasToolSpecs } from "../lib/ai/laras-tools.ts";
import { AI_RETENTION, aiThreadPurgeBefore } from "../lib/ai/retention-policy.ts";
import { purgeExpiredAiThreads } from "../lib/ai/retention.ts";

type Any = Record<string, unknown>;
const p = prisma as unknown as Record<string, unknown>;
const DAY = 24 * 60 * 60 * 1000;

describe("anggaran token harian", () => {
  let store: Map<string, { count: number; windowStart: Date }>;
  beforeEach(() => {
    store = new Map();
    // Meniru INSERT ... ON DUPLICATE KEY UPDATE: values = [key, n, now, ...].
    p.$executeRaw = async (_s: TemplateStringsArray, ...v: unknown[]) => {
      const [key, n, now] = v as [string, number, Date];
      const cur = store.get(key);
      if (!cur || cur.windowStart.getTime() < now.getTime() - DAY) store.set(key, { count: n, windowStart: now });
      else cur.count += n;
      return 1;
    };
    p.mobileRateLimit = { findUnique: async ({ where }: { where: { key: string } }) => store.get(where.key) ?? null };
  });
  it("mengakumulasi pemakaian dan memblokir saat melewati batas", async () => {
    assert.equal((await checkTokenBudget(7, 10_000)).ok, true);
    await addTokensUsed(7, 6_000);
    assert.equal((await checkTokenBudget(7, 10_000)).ok, true);
    await addTokensUsed(7, 4_500);
    const b = await checkTokenBudget(7, 10_000);
    assert.equal(b.ok, false);
    assert.equal(b.used, 10_500);
  });
  it("pengguna lain tidak terpengaruh; jendela 24 jam menyetel ulang pemakaian", async () => {
    await addTokensUsed(7, 20_000);
    assert.equal((await checkTokenBudget(8, 10_000)).ok, true);
    const old = [...store.values()][0]!;
    old.windowStart = new Date(Date.now() - DAY - 1000);
    assert.equal(await readTokensUsed(7), 0);
    assert.equal((await checkTokenBudget(7, 10_000)).ok, true);
  });
  it("angka tak sah diabaikan; nilai ekstrem dibatasi", async () => {
    await addTokensUsed(7, 0);
    await addTokensUsed(7, -5);
    await addTokensUsed(7, Number.NaN);
    assert.equal(store.size, 0);
    await addTokensUsed(7, 9e12);
    assert.equal([...store.values()][0]!.count, 2_000_000);
  });
  it("batas harian bawaan dan override lewat env (dengan batas bawah aman)", () => {
    assert.equal(getDailyTokenCap({}), DEFAULT_DAILY_TOKEN_CAP);
    assert.equal(getDailyTokenCap({ LARAS_DAILY_TOKEN_CAP: "1500000" }), 1_500_000);
    assert.equal(getDailyTokenCap({ LARAS_DAILY_TOKEN_CAP: "5" }), DEFAULT_DAILY_TOKEN_CAP);
    assert.equal(getDailyTokenCap({ LARAS_DAILY_TOKEN_CAP: "abc" }), DEFAULT_DAILY_TOKEN_CAP);
  });
  it("estimasi token ≈ karakter/3,5", () => {
    assert.equal(estimateTokens(350), 100);
    assert.equal(estimateTokens(0), 0);
  });
});

describe("trimHistoryForAi", () => {
  const m = (role: "user" | "assistant", n: number, ch = "a") => ({ role, content: ch.repeat(n) });
  it("riwayat pendek tidak berubah", () => {
    const h = [m("user", 10), m("assistant", 20)];
    assert.deepEqual(trimHistoryForAi(h), h);
  });
  it("pesan terbaru diutamakan dan total dibatasi", () => {
    const h = Array.from({ length: 8 }, (_, i) => m(i % 2 === 0 ? "user" : "assistant", 3_900, String(i)));
    const out = trimHistoryForAi(h);
    const total = out.reduce((n, x) => n + x.content.length, 0);
    assert.ok(total <= HISTORY_MAX_CHARS);
    assert.equal(out.at(-1)!.content[0], "7");
    assert.ok(out.length < 8);
  });
  it("pesan raksasa dipotong dan tetap dimuat", () => {
    const out = trimHistoryForAi([m("user", 8_000)]);
    assert.equal(out.length, 1);
    assert.ok(out[0]!.content.length <= HISTORY_MESSAGE_MAX_CHARS + 1);
  });
  it("selalu diawali pesan pengguna", () => {
    const out = trimHistoryForAi([m("assistant", 10), m("user", 10), m("assistant", 10)]);
    assert.equal(out[0]!.role, "user");
    assert.deepEqual(trimHistoryForAi([m("assistant", 10)]), []);
  });
});

describe("createTtlCache", () => {
  it("memakai cache dalam TTL dan memuat ulang setelah kedaluwarsa", async () => {
    let t = 0, loads = 0;
    const c = createTtlCache<number, string>({ ttlMs: 1000, max: 10, now: () => t });
    const load = async () => `v${++loads}`;
    assert.equal(await c.get(1, load), "v1");
    t = 999;
    assert.equal(await c.get(1, load), "v1");
    t = 1000;
    assert.equal(await c.get(1, load), "v2");
  });
  it("permintaan serentak berbagi satu pemuatan (tanpa badai query)", async () => {
    let loads = 0;
    const c = createTtlCache<number, number>({ ttlMs: 1000, max: 10 });
    const load = async () => (loads++, await new Promise((r) => setTimeout(r, 10)), 42);
    const r = await Promise.all([c.get(1, load), c.get(1, load), c.get(1, load)]);
    assert.deepEqual(r, [42, 42, 42]);
    assert.equal(loads, 1);
  });
  it("kegagalan tidak disimpan", async () => {
    let n = 0;
    const c = createTtlCache<number, number>({ ttlMs: 1000, max: 10 });
    await assert.rejects(() => c.get(1, async () => { n++; throw new Error("x"); }));
    await new Promise((r) => setImmediate(r));
    assert.equal(await c.get(1, async () => 7), 7);
    assert.equal(n, 1);
  });
  it("kunci berbeda terpisah dan ukuran dibatasi", async () => {
    const c = createTtlCache<number, number>({ ttlMs: 10_000, max: 3 });
    for (let i = 0; i < 10; i++) await c.get(i, async () => i);
    assert.ok(c.size() <= 3);
    assert.equal(await c.get(100, async () => 5), 5);
    assert.equal(await c.get(101, async () => 6), 6);
  });
});

describe("NDJSON", () => {
  it("server: mengirim event berurutan satu per baris dengan header anti-buffer", async () => {
    const res = ndjsonResponse(async (emit) => {
      emit({ type: "progress", label: "Memeriksa data keuangan…" });
      emit({ type: "done", ok: true, reply: "Halo" });
    });
    assert.match(res.headers.get("content-type")!, /application\/x-ndjson/);
    assert.equal(res.headers.get("x-accel-buffering"), "no");
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines, [{ type: "progress", label: "Memeriksa data keuangan…" }, { type: "done", ok: true, reply: "Halo" }]);
  });
  it("server: galat tak terduga menjadi event error 500, aliran tetap tertutup rapi", async () => {
    const res = ndjsonResponse(async () => { throw new Error("boom"); });
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines, [{ type: "error", error: "Server error", status: 500 }]);
  });
  it("klien: tahan terhadap pemotongan di tengah baris, baris rusak diabaikan, baris terakhir tanpa newline dibaca", async () => {
    const enc = new TextEncoder();
    const chunks = ['{"type":"progress","lab', 'el":"A"}\nsampah bukan json\n{"type":"prog', 'ress","label":"B"}\n{"type":"done","reply":"x"}'];
    const body = new ReadableStream<Uint8Array>({ start(c) { chunks.forEach((x) => c.enqueue(enc.encode(x))); c.close(); } });
    const got: StreamEvent[] = [];
    await readNdjson(body, (e) => got.push(e));
    assert.deepEqual(got.map((e) => e.type), ["progress", "progress", "done"]);
    assert.equal((got[1] as { label: string }).label, "B");
  });
  it("klien: karakter multibyte yang terpotong antar-potongan tidak rusak", async () => {
    const bytes = new TextEncoder().encode('{"type":"progress","label":"Memeriksa… ✓"}\n');
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes.slice(0, 33)); c.enqueue(bytes.slice(33)); c.close(); } });
    const got: StreamEvent[] = [];
    await readNdjson(body, (e) => got.push(e));
    assert.equal((got[0] as { label: string }).label, "Memeriksa… ✓");
  });
  it("label langkah tersedia untuk setiap tool dan ada nilai bawaan", () => {
    for (const t of larasToolSpecs()) assert.ok(larasToolLabel(t.function.name).endsWith("…"), t.function.name);
    assert.equal(larasToolLabel("tool_tak_dikenal"), "Mengambil data desa…");
  });
});

describe("retensi riwayat chat", () => {
  it("batas hapus = 90 hari dari sekarang", () => {
    const now = new Date("2026-10-31T00:00:00Z");
    assert.equal(now.getTime() - aiThreadPurgeBefore(now).getTime(), AI_RETENTION.THREAD_PURGE_DAYS * DAY);
    assert.equal(AI_RETENTION.THREAD_PURGE_DAYS, 90);
  });
  it("menghapus per batch sampai habis, memakai batas updatedAt, lalu idempoten", async () => {
    let remaining = 1100;
    const wheres: Any[] = [];
    p.aiAssistantThread = {
      findMany: async (a: { where: Any; take: number }) => {
        wheres.push(a.where);
        return Array.from({ length: Math.min(remaining, a.take) }, (_, i) => ({ id: i + 1 }));
      },
      deleteMany: async (a: { where: { id: { in: number[] } } }) => {
        remaining -= a.where.id.in.length;
        return { count: a.where.id.in.length };
      },
    };
    const now = new Date("2026-10-31T00:00:00Z");
    assert.deepEqual(await purgeExpiredAiThreads(now), { threadsDeleted: 1100 });
    assert.deepEqual((wheres[0]!.updatedAt as { lt: Date }).lt, aiThreadPurgeBefore(now));
    assert.deepEqual(await purgeExpiredAiThreads(now), { threadsDeleted: 0 });
  });
  it("berhenti pada batas jumlah batch agar satu panggilan tidak berjalan tanpa akhir", async () => {
    let calls = 0;
    p.aiAssistantThread = {
      findMany: async (a: { take: number }) => (calls++, Array.from({ length: a.take }, (_, i) => ({ id: i }))),
      deleteMany: async (a: { where: { id: { in: number[] } } }) => ({ count: a.where.id.in.length }),
    };
    const r = await purgeExpiredAiThreads();
    assert.equal(calls, AI_RETENTION.PURGE_MAX_BATCHES);
    assert.equal(r.threadsDeleted, AI_RETENTION.PURGE_MAX_BATCHES * AI_RETENTION.PURGE_BATCH_SIZE);
  });
});
