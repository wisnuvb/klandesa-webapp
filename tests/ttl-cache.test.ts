import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTtlCache } from "../lib/cache/ttl-cache.ts";

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createTtlCache", () => {
  it("memakai hasil yang sama selama TTL dan memuat ulang setelah kedaluwarsa", async () => {
    let t = 1000;
    const cache = createTtlCache<number, string>({ ttlMs: 100, now: () => t });
    let calls = 0;
    const load = async () => `v${++calls}`;

    assert.equal(await cache.getOrLoad(1, load), "v1");
    t += 99;
    assert.equal(await cache.getOrLoad(1, load), "v1");
    assert.equal(calls, 1);
    t += 2;
    assert.equal(await cache.getOrLoad(1, load), "v2");
    assert.equal(calls, 2);
  });

  it("kunci berbeda tidak saling berbagi hasil (desa A tidak pernah menerima data desa B)", async () => {
    const cache = createTtlCache<number, string>({ ttlMs: 1000 });
    assert.equal(await cache.getOrLoad(1, async () => "desa-1"), "desa-1");
    assert.equal(await cache.getOrLoad(2, async () => "desa-2"), "desa-2");
    assert.equal(await cache.getOrLoad(1, async () => "salah"), "desa-1");
  });

  it("single-flight: permintaan serentak untuk kunci yang sama hanya memicu satu pemuatan", async () => {
    const cache = createTtlCache<number, string>({ ttlMs: 1000 });
    const gate = deferred<string>();
    let calls = 0;
    const load = () => {
      calls++;
      return gate.promise;
    };
    const all = Promise.all(Array.from({ length: 20 }, () => cache.getOrLoad(7, load)));
    gate.resolve("hasil");
    assert.deepEqual(new Set(await all), new Set(["hasil"]));
    assert.equal(calls, 1);
  });

  it("pemuatan yang gagal tidak disimpan: permintaan berikutnya mencoba lagi", async () => {
    const cache = createTtlCache<number, string>({ ttlMs: 1000 });
    await assert.rejects(cache.getOrLoad(1, async () => { throw new Error("db mati"); }), /db mati/);
    assert.equal(cache.size, 0);
    assert.equal(await cache.getOrLoad(1, async () => "pulih"), "pulih");
  });

  it("kegagalan berbagi ke semua penunggu serentak, tanpa meninggalkan entri macet", async () => {
    const cache = createTtlCache<number, string>({ ttlMs: 1000 });
    const gate = deferred<string>();
    const a = cache.getOrLoad(1, () => gate.promise);
    const b = cache.getOrLoad(1, () => gate.promise);
    gate.reject(new Error("gagal"));
    await assert.rejects(a, /gagal/);
    await assert.rejects(b, /gagal/);
    assert.equal(await cache.getOrLoad(1, async () => "ok"), "ok");
  });

  it("membatasi jumlah entri (yang terlama dibuang) dan invalidate/clear bekerja", async () => {
    const cache = createTtlCache<number, number>({ ttlMs: 1000, maxEntries: 3 });
    for (let k = 1; k <= 5; k++) await cache.getOrLoad(k, async () => k);
    assert.equal(cache.size, 3);
    let reloaded = 0;
    await cache.getOrLoad(1, async () => (reloaded++, 1)); // 1 sudah terbuang -> dimuat ulang
    assert.equal(reloaded, 1);

    cache.invalidate(5);
    await cache.getOrLoad(5, async () => (reloaded++, 5));
    assert.equal(reloaded, 2);

    cache.clear();
    assert.equal(cache.size, 0);
  });
});
