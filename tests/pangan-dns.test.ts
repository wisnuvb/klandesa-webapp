import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { createDnsCache, createRacingResolver } from "../lib/pangan/dns-cache.ts";
import { httpFetch } from "../lib/pangan/sp2kp-client.ts";

const tick = () => new Promise<void>((r) => setImmediate(r));

describe("cache DNS klien SP2KP", () => {
  it("resolusi pertama ditunggu; berikutnya langsung dari cache walau resolver macet", async () => {
    let calls = 0;
    let hang = false;
    const c = createDnsCache({
      resolve: () => {
        calls++;
        return hang ? new Promise<string[]>(() => undefined) : Promise.resolve(["103.42.205.215"]);
      },
      now: () => 0,
    });
    assert.deepEqual(await c.get("h.test"), ["103.42.205.215"]);
    hang = true;
    assert.deepEqual(await c.get("h.test"), ["103.42.205.215"]); // tidak menunggu resolver yang macet
    assert.equal(calls, 1);
  });

  it("alamat tua tetap dipakai seketika, disegarkan di latar belakang, dan kegagalan tidak membuangnya", async () => {
    let clock = 0;
    let calls = 0;
    let mode: "ok2" | "fail" = "ok2";
    const c = createDnsCache({
      resolve: async () => {
        calls++;
        if (calls === 1) return ["1.1.1.1"];
        if (mode === "fail") throw new Error("SERVFAIL");
        return ["2.2.2.2"];
      },
      now: () => clock,
      refreshAfterMs: 60_000,
    });
    await c.get("h.test");
    clock = 61_000;
    mode = "fail";
    assert.deepEqual(await c.get("h.test"), ["1.1.1.1"]); // masih alamat lama
    await tick();
    assert.equal(calls, 2); // penyegaran dicoba
    assert.deepEqual(await c.get("h.test"), ["1.1.1.1"]); // gagal → alamat lama bertahan
    await tick(); // biarkan penyegaran yang gagal selesai (kalau tidak, penyegaran berikutnya digabung ke dia)

    mode = "ok2";
    clock = 200_000;
    await c.get("h.test"); // memicu penyegaran yang berhasil
    await tick();
    await tick();
    assert.deepEqual(await c.get("h.test"), ["2.2.2.2"]);
  });

  it("permintaan bersamaan hanya satu resolusi; hasil kosong dianggap galat", async () => {
    let calls = 0;
    const c = createDnsCache({
      resolve: async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 10));
        return ["9.9.9.9"];
      },
    });
    await Promise.all([c.get("a.test"), c.get("a.test"), c.get("a.test")]);
    assert.equal(calls, 1);

    const empty = createDnsCache({ resolve: async () => [] });
    await assert.rejects(empty.get("x.test"));
    assert.equal(empty.size(), 0);
  });

  it("lookup: bentuk callback untuk all:true dan all:false; IP literal diteruskan", async () => {
    const c = createDnsCache({ resolve: async () => ["10.1.2.3"] });
    const one = await new Promise<unknown[]>((res, rej) =>
      (c.lookup as unknown as (...a: unknown[]) => void)("h.test", {}, (e: unknown, ...rest: unknown[]) => (e ? rej(e) : res(rest))),
    );
    assert.deepEqual(one, ["10.1.2.3", 4]);
    const all = await new Promise<unknown>((res, rej) =>
      (c.lookup as unknown as (...a: unknown[]) => void)("h.test", { all: true }, (e: unknown, list: unknown) => (e ? rej(e) : res(list))),
    );
    assert.deepEqual(all, [{ address: "10.1.2.3", family: 4 }]);
    const lit = await new Promise<unknown[]>((res, rej) =>
      (c.lookup as unknown as (...a: unknown[]) => void)("127.0.0.1", {}, (e: unknown, ...rest: unknown[]) => (e ? rej(e) : res(rest))),
    );
    assert.equal(lit[0], "127.0.0.1");
    assert.equal(c.size(), 1); // IP literal tidak masuk cache
  });

  it("resolver berlomba bisa dibuat dengan/ tanpa server publik", () => {
    assert.equal(typeof createRacingResolver({ PANGAN_DNS_SERVERS: "" }), "function");
    assert.equal(typeof createRacingResolver({}), "function");
  });
});

describe("transport httpFetch", () => {
  let server: http.Server;
  let base = "";
  const seen: Array<{ method?: string; url?: string; ct: string; body: string }> = [];

  before(async () => {
    server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        seen.push({ method: req.method, url: req.url, ct: String(req.headers["content-type"] ?? ""), body: Buffer.concat(chunks).toString() });
        if (req.url?.startsWith("/slow")) return; // tidak pernah menjawab
        if (req.url?.startsWith("/boom")) {
          res.statusCode = 500;
          return res.end("x");
        }
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ status: "success", data: [1, 2] }));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it("GET: status dan JSON utuh", async () => {
    const res = await httpFetch(`${base}/master/api/wilayah/kab-kota/35?`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "success", data: [1, 2] });
    assert.equal(seen.at(-1)?.url, "/master/api/wilayah/kab-kota/35?");
  });

  it("POST FormData: dikirim sebagai multipart dengan boundary dan semua field", async () => {
    const form = new FormData();
    form.append("tanggal", "2026-10-30");
    form.append("kode_kab_kota", "3578");
    const res = await httpFetch(`${base}/report`, { method: "POST", body: form });
    assert.equal(res.status, 200);
    const last = seen.at(-1)!;
    assert.equal(last.method, "POST");
    assert.match(last.ct, /^multipart\/form-data; boundary=/);
    assert.match(last.body, /name="tanggal"\r\n\r\n2026-10-30/);
    assert.match(last.body, /name="kode_kab_kota"\r\n\r\n3578/);
  });

  it("status galat diteruskan; batas waktu membatalkan permintaan yang tak dijawab", async () => {
    assert.equal((await httpFetch(`${base}/boom`)).status, 500);
    const t0 = Date.now();
    await assert.rejects(
      httpFetch(`${base}/slow`, { signal: AbortSignal.timeout(150) }),
      (e: unknown) => ["TimeoutError", "AbortError"].includes((e as { name?: string }).name ?? ""),
    );
    assert.ok(Date.now() - t0 < 2000);
  });
});
