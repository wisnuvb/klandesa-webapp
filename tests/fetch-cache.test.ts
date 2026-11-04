import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createFetchCache, isNeverCached } from "../lib/client/fetch-cache.ts";

type Call = { url: string; init?: RequestInit };
type Plan = { status?: number; body?: unknown; raw?: string; fail?: boolean; gate?: Promise<void> };

/** fetch palsu: antrean respons per URL; `gate` menahan respons sampai dilepas (uji serentak). */
function mockFetch() {
  const calls: Call[] = [];
  const plans = new Map<string, Plan[]>();
  const fn = (async (input: unknown, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const plan = plans.get(url)?.shift() ?? { status: 200, body: { n: calls.length } };
    if (plan.gate) await plan.gate;
    if (plan.fail) throw new TypeError("Failed to fetch");
    const status = plan.status ?? 200;
    const text = plan.raw ?? JSON.stringify(plan.body ?? {});
    return { ok: status >= 200 && status < 300, status, text: async () => text } as unknown as Response;
  }) as typeof fetch;
  return {
    fn,
    calls,
    queue(url: string, ...p: Plan[]) {
      plans.set(url, [...(plans.get(url) ?? []), ...p]);
    },
  };
}

function gate() {
  let open!: () => void;
  const promise = new Promise<void>((r) => {
    open = r;
  });
  return { promise, open };
}

const flush = () => new Promise<void>((r) => setImmediate(r));

describe("fetch-cache", () => {
  let t = 1000;
  let m: ReturnType<typeof mockFetch>;
  let cache: ReturnType<typeof createFetchCache>;
  beforeEach(() => {
    t = 1000;
    m = mockFetch();
    cache = createFetchCache({ fetch: m.fn, now: () => t });
  });
  afterEach(() => cache.clear());

  it("dedupe permintaan serentak ke URL yang sama: satu request jaringan", async () => {
    const g = gate();
    m.queue("/api/a", { body: { v: 1 }, gate: g.promise });
    const p1 = cache.fetchJson<{ v: number }>("/api/a");
    const p2 = cache.fetchJson<{ v: number }>("/api/a");
    const p3 = cache.fetchJson<{ v: number }>("/api/a");
    g.open();
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    assert.equal(m.calls.length, 1);
    assert.deepEqual([r1.body, r2.body, r3.body], [{ v: 1 }, { v: 1 }, { v: 1 }]);
    assert.equal(r1.source, "network");
    // objek tiap pemanggil terpisah (mutasi di satu komponen tidak merusak yang lain)
    assert.notEqual(r1.body, r2.body);
  });

  it("tanpa opsi cache: tidak ada cache lintas panggilan (semantik no-store lama)", async () => {
    await cache.fetchJson("/api/a");
    await cache.fetchJson("/api/a");
    assert.equal(m.calls.length, 2);
    assert.equal(m.calls[0].init?.cache, "no-store");
  });

  it("URL berbeda tidak berbagi request", async () => {
    await Promise.all([cache.fetchJson("/api/a?x=1"), cache.fetchJson("/api/a?x=2")]);
    assert.equal(m.calls.length, 2);
  });

  it("TTL: data segar dikembalikan tanpa request; setelah TTL memuat ulang", async () => {
    m.queue("/api/a", { body: { v: 1 } }, { body: { v: 2 } });
    const a = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100 });
    assert.equal(a.source, "network");
    t += 99;
    const b = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100 });
    assert.equal(b.source, "fresh");
    assert.deepEqual(b.body, { v: 1 });
    assert.equal(m.calls.length, 1);
    t += 2;
    const c = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100 });
    assert.equal(c.source, "network");
    assert.deepEqual(c.body, { v: 2 });
    assert.equal(m.calls.length, 2);
  });

  it("stale-while-revalidate: data basi tampil seketika, revalidasi latar belakang memperbarui cache dan memberi tahu pelanggan", async () => {
    m.queue("/api/a", { body: { v: 1 } });
    await cache.fetchJson("/api/a", { ttlMs: 100, staleMs: 500 });
    t += 200; // lewat TTL, dalam jendela stale

    const g = gate();
    m.queue("/api/a", { body: { v: 2 }, gate: g.promise });
    const seen: unknown[] = [];
    cache.subscribe("/api/a", (r) => seen.push(r.body));

    const stale = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100, staleMs: 500 });
    assert.equal(stale.source, "stale");
    assert.deepEqual(stale.body, { v: 1 });
    assert.equal(m.calls.length, 2, "revalidasi dimulai di latar belakang");

    // pemanggil lain selama revalidasi: tetap basi, tanpa request ketiga
    const again = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100, staleMs: 500 });
    assert.equal(again.source, "stale");
    assert.equal(m.calls.length, 2);

    g.open();
    await flush();
    assert.deepEqual(seen, [{ v: 2 }]);
    const fresh = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100, staleMs: 500 });
    assert.equal(fresh.source, "fresh");
    assert.deepEqual(fresh.body, { v: 2 });
    assert.equal(m.calls.length, 2);
  });

  it("lewat jendela stale: menunggu jaringan", async () => {
    m.queue("/api/a", { body: { v: 1 } }, { body: { v: 2 } });
    await cache.fetchJson("/api/a", { ttlMs: 100, staleMs: 100 });
    t += 250;
    const r = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100, staleMs: 100 });
    assert.equal(r.source, "network");
    assert.deepEqual(r.body, { v: 2 });
  });

  it("revalidasi latar belakang yang gagal diam dan data basi tetap bisa dipakai di jendelanya", async () => {
    m.queue("/api/a", { body: { v: 1 } }, { fail: true });
    await cache.fetchJson("/api/a", { ttlMs: 100, staleMs: 500 });
    t += 200;
    const r = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100, staleMs: 500 });
    assert.equal(r.source, "stale");
    await flush(); // tidak boleh ada unhandled rejection
    const r2 = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 100, staleMs: 500 });
    assert.deepEqual(r2.body, { v: 1 });
  });

  it("galat jaringan tidak di-cache", async () => {
    m.queue("/api/a", { fail: true }, { body: { v: 2 } });
    await assert.rejects(cache.fetchJson("/api/a", { ttlMs: 1000 }), TypeError);
    const r = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 1000 });
    assert.equal(r.source, "network");
    assert.deepEqual(r.body, { v: 2 });
    assert.equal(m.calls.length, 2);
  });

  it("respons non-OK dikembalikan apa adanya tetapi tidak disimpan", async () => {
    m.queue("/api/a", { status: 500, body: { error: "boom" } }, { status: 409, body: { code: "KEPENDUDUKAN_V2_OFF" } }, { body: { v: 3 } });
    const e = await cache.fetchJson<{ error: string }>("/api/a", { ttlMs: 1000 });
    assert.equal(e.ok, false);
    assert.equal(e.status, 500);
    assert.equal(e.body?.error, "boom");
    const c = await cache.fetchJson<{ code: string }>("/api/a", { ttlMs: 1000 });
    assert.equal(c.status, 409);
    assert.equal(c.body?.code, "KEPENDUDUKAN_V2_OFF");
    const ok = await cache.fetchJson<{ v: number }>("/api/a", { ttlMs: 1000 });
    assert.equal(ok.ok, true);
    assert.equal(m.calls.length, 3, "tiap non-OK memicu request baru");
    assert.equal(cache.peek("/api/a", { ttlMs: 1000 })?.status, 200);
  });

  it("badan sukses yang bukan JSON tidak disimpan", async () => {
    m.queue("/api/a", { raw: "<html>" }, { body: { v: 1 } });
    const r = await cache.fetchJson("/api/a", { ttlMs: 1000 });
    assert.equal(r.ok, true);
    assert.equal(r.body, null);
    await cache.fetchJson("/api/a", { ttlMs: 1000 });
    assert.equal(m.calls.length, 2);
  });

  it("invalidate(url) dan invalidate(prefix) membuang entri", async () => {
    await cache.fetchJson("/api/billing/status", { ttlMs: 1000 });
    await cache.fetchJson("/api/billing/invoices", { ttlMs: 1000 });
    await cache.fetchJson("/api/other", { ttlMs: 1000 });
    assert.equal(m.calls.length, 3);

    cache.invalidate("/api/billing");
    assert.equal(cache.peek("/api/billing/status", { ttlMs: 1000 }), null);
    assert.equal(cache.peek("/api/billing/invoices", { ttlMs: 1000 }), null);
    assert.ok(cache.peek("/api/other", { ttlMs: 1000 }));

    await cache.fetchJson("/api/billing/status", { ttlMs: 1000 });
    assert.equal(m.calls.length, 4);
    await cache.fetchJson("/api/other", { ttlMs: 1000 });
    assert.equal(m.calls.length, 4);
  });

  it("invalidate saat request berjalan: hasilnya tidak disimpan dan pemanggil baru memulai request baru", async () => {
    const g = gate();
    m.queue("/api/a", { body: { v: "lama" }, gate: g.promise }, { body: { v: "baru" } });
    const p = cache.fetchJson<{ v: string }>("/api/a", { ttlMs: 1000 });
    cache.invalidate("/api/a");
    const fresh = await cache.fetchJson<{ v: string }>("/api/a", { ttlMs: 1000 });
    assert.equal(fresh.body?.v, "baru");
    g.open();
    assert.equal((await p).body?.v, "lama");
    assert.equal(cache.peek<{ v: string }>("/api/a", { ttlMs: 1000 })?.body?.v, "baru", "respons lama tidak menimpa");
  });

  it("force melewati cache dan request yang berjalan; hasil lama tidak menimpa hasil baru", async () => {
    const g = gate();
    m.queue("/api/a", { body: { v: "lama" }, gate: g.promise }, { body: { v: "baru" } });
    const slow = cache.fetchJson<{ v: string }>("/api/a", { ttlMs: 1000 });
    const forced = await cache.fetchJson<{ v: string }>("/api/a", { ttlMs: 1000, force: true });
    assert.equal(forced.body?.v, "baru");
    assert.equal(m.calls.length, 2);
    g.open();
    await slow;
    assert.equal(cache.peek<{ v: string }>("/api/a", { ttlMs: 1000 })?.body?.v, "baru");
  });

  it("isolasi antar-akun: pergantian scope mengosongkan cache; akun baru tidak membaca data akun lama", async () => {
    cache.setScope("village:1");
    m.queue("/api/me", { body: { name: "A" } }, { body: { name: "B" } });
    const a = await cache.fetchJson<{ name: string }>("/api/me", { ttlMs: 60_000 });
    assert.equal(a.body?.name, "A");
    assert.equal((await cache.fetchJson<{ name: string }>("/api/me", { ttlMs: 60_000 })).source, "fresh");

    cache.setScope("village:2");
    assert.equal(cache.peek("/api/me", { ttlMs: 60_000 }), null);
    const b = await cache.fetchJson<{ name: string }>("/api/me", { ttlMs: 60_000 });
    assert.equal(b.body?.name, "B");
    assert.equal(b.source, "network");
  });

  it("setScope dengan nilai sama tidak mengosongkan cache", async () => {
    cache.setScope("village:1");
    await cache.fetchJson("/api/me", { ttlMs: 60_000 });
    cache.setScope("village:1");
    assert.ok(cache.peek("/api/me", { ttlMs: 60_000 }));
  });

  it("respons akun lama yang terlambat tiba tidak masuk cache akun baru dan tidak dibagikan ke pemanggil baru", async () => {
    cache.setScope("village:1");
    const g = gate();
    m.queue("/api/me", { body: { name: "A" }, gate: g.promise }, { body: { name: "B" } });
    const late = cache.fetchJson<{ name: string }>("/api/me", { ttlMs: 60_000 });

    cache.setScope("village:2");
    const b = await cache.fetchJson<{ name: string }>("/api/me", { ttlMs: 60_000 });
    assert.equal(b.body?.name, "B", "tidak ikut request akun lama yang masih berjalan");
    assert.equal(m.calls.length, 2);

    g.open();
    await late;
    assert.equal(cache.peek<{ name: string }>("/api/me", { ttlMs: 60_000 })?.body?.name, "B");
  });

  it("clear() mengosongkan cache dan menahan request lama menulis ke cache", async () => {
    await cache.fetchJson("/api/a", { ttlMs: 60_000 });
    cache.clear();
    assert.equal(cache.peek("/api/a", { ttlMs: 60_000 }), null);

    const g = gate();
    m.queue("/api/b", { body: { v: 1 }, gate: g.promise });
    const p = cache.fetchJson("/api/b", { ttlMs: 60_000 });
    cache.clear();
    g.open();
    await p;
    assert.equal(cache.peek("/api/b", { ttlMs: 60_000 }), null);
  });

  it("/api/account/permissions tidak pernah di-cache atau dibagi", async () => {
    assert.equal(isNeverCached("/api/account/permissions"), true);
    assert.equal(isNeverCached("/api/account/permissions?x=1"), true);
    assert.equal(isNeverCached("https://my.klandesa.com/api/account/permissions"), true);
    assert.equal(isNeverCached("/api/account/permissions-extra"), false);

    const g = gate();
    m.queue("/api/account/permissions", { body: { role: "admin" }, gate: g.promise }, { body: { role: "viewer" } });
    const p1 = cache.fetchJson<{ role: string }>("/api/account/permissions", { ttlMs: 60_000, staleMs: 60_000 });
    const p2 = cache.fetchJson<{ role: string }>("/api/account/permissions", { ttlMs: 60_000, staleMs: 60_000 });
    g.open();
    await Promise.all([p1, p2]);
    assert.equal(m.calls.length, 2, "tanpa dedupe");
    const r3 = await cache.fetchJson<{ role: string }>("/api/account/permissions", { ttlMs: 60_000 });
    assert.equal(m.calls.length, 3, "tanpa cache");
    assert.equal(r3.source, "network");
    assert.equal(cache.peek("/api/account/permissions", { ttlMs: 60_000 }), null);
  });

  it("selain GET tidak di-cache dan tidak di-dedupe", async () => {
    await Promise.all([
      cache.fetchJson("/api/a", { method: "POST", ttlMs: 1000 }),
      cache.fetchJson("/api/a", { method: "POST", ttlMs: 1000 }),
    ]);
    assert.equal(m.calls.length, 2);
    assert.equal(m.calls[0].init?.method, "POST");
    assert.equal(cache.peek("/api/a", { ttlMs: 1000 }), null);
  });

  it("signal: membatalkan penantian pemanggil itu saja; request bersama tetap selesai untuk yang lain", async () => {
    const g = gate();
    m.queue("/api/a", { body: { v: 1 }, gate: g.promise });
    const ctrl = new AbortController();
    const aborted = cache.fetchJson("/api/a", { signal: ctrl.signal });
    const other = cache.fetchJson<{ v: number }>("/api/a");
    ctrl.abort();
    await assert.rejects(aborted, (e: Error) => e.name === "AbortError");
    g.open();
    assert.deepEqual((await other).body, { v: 1 });
    assert.equal(m.calls.length, 1);

    const pre = new AbortController();
    pre.abort();
    await assert.rejects(cache.fetchJson("/api/a", { signal: pre.signal }), (e: Error) => e.name === "AbortError");
  });

  it("ttl pemanggil yang bergabung ikut menentukan penyimpanan (satu request, disimpan bila ada yang meminta cache)", async () => {
    const g = gate();
    m.queue("/api/a", { body: { v: 1 }, gate: g.promise });
    const plain = cache.fetchJson("/api/a");
    const cached = cache.fetchJson("/api/a", { ttlMs: 1000 });
    g.open();
    await Promise.all([plain, cached]);
    assert.equal(m.calls.length, 1);
    assert.equal(cache.peek("/api/a", { ttlMs: 1000 })?.source, "fresh");
    // pemanggil tanpa opsi tetap tidak membaca cache
    await cache.fetchJson("/api/a");
    assert.equal(m.calls.length, 2);
  });

  it("subscribe: berhenti menerima setelah unsubscribe", async () => {
    const seen: number[] = [];
    const off = cache.subscribe("/api/a", (r) => seen.push(r.stamp));
    await cache.fetchJson("/api/a", { ttlMs: 1000 });
    off();
    await cache.fetchJson("/api/a", { ttlMs: 1000, force: true });
    assert.equal(seen.length, 1);
  });

  it("tanpa deps memakai globalThis.fetch yang dibaca saat dipanggil (bisa di-mock)", async () => {
    const real = globalThis.fetch;
    const mm = mockFetch();
    globalThis.fetch = mm.fn;
    try {
      const c = createFetchCache();
      await Promise.all([c.fetchJson("/api/x"), c.fetchJson("/api/x")]);
      assert.equal(mm.calls.length, 1);
    } finally {
      globalThis.fetch = real;
    }
  });
});
