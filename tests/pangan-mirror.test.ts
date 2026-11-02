import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysIso,
  extractRows,
  hasHargaData,
  hasHetData,
  isDateInWindow,
  isIsoDate,
  isStandardPair,
  snapshotTtlMs,
  todayWib,
} from "../lib/pangan/mirror-policy.ts";
import { Sp2kpError, sp2kpJson, type Sp2kpBudget } from "../lib/pangan/sp2kp-client.ts";
import {
  createMirror,
  MirrorError,
  parseKabKotaRows,
  type KabKotaRow,
  type MirrorStore,
  type SnapshotKey,
  type SnapshotRow,
} from "../lib/pangan/mirror.ts";
import { buildPrefetchKeys, discoverLatestDataDate, runPool, syncPangan } from "../lib/pangan/sync.ts";

const H = 3_600_000;
const NOW = new Date("2026-11-02T03:00:00Z"); // 10:00 WIB, Senin
const TODAY = "2026-11-02";

const hargaPayload = (harga: number) => ({
  status: "success",
  data: [{ variant_id: 1, harga, harga_pembanding: 0 }],
});
const EMPTY_HET = { status: "success", data: null };
const HET_OK = { status: "success", data: [{ variant_id: 52, group_wilayah: "Nasional" }] };

describe("kebijakan cermin pangan", () => {
  it("tanggal: validasi, geser hari, hari ini WIB", () => {
    assert.equal(isIsoDate("2026-11-02"), true);
    assert.equal(isIsoDate("2026-13-45"), false);
    assert.equal(isIsoDate("2026-02-30"), false);
    assert.equal(addDaysIso("2026-03-01", -1), "2026-02-28");
    assert.equal(addDaysIso("2026-11-02", -7), "2026-10-26");
    assert.equal(todayWib(new Date("2026-11-01T18:30:00Z")), "2026-11-02"); // sudah lewat tengah malam WIB
  });

  it("jendela tanggal: menolak masa depan dan >400 hari", () => {
    assert.equal(isDateInWindow(TODAY, NOW), true);
    assert.equal(isDateInWindow("2026-11-03", NOW), false);
    assert.equal(isDateInWindow(addDaysIso(TODAY, -400), NOW), true);
    assert.equal(isDateInWindow(addDaysIso(TODAY, -401), NOW), false);
    assert.equal(isDateInWindow("abc", NOW), false);
  });

  it("pasangan standar vs bebas", () => {
    for (const d of [1, 7, 14, 30]) assert.equal(isStandardPair(TODAY, addDaysIso(TODAY, -d)), true, String(d));
    assert.equal(isStandardPair(TODAY, addDaysIso(TODAY, -5)), false);
    assert.equal(isStandardPair(TODAY, TODAY), false);
  });

  it("deteksi data: harga 0 semua = tidak ada data; HET null = tidak ada", () => {
    assert.equal(hasHargaData(hargaPayload(0)), false);
    assert.equal(hasHargaData(hargaPayload(12500)), true);
    assert.equal(hasHargaData({ data: null }), false);
    assert.equal(hasHetData(EMPTY_HET), false);
    assert.equal(hasHetData(HET_OK), true);
    assert.deepEqual(extractRows({ data: { data: [{ a: 1 }] } }), [{ a: 1 }]);
    assert.deepEqual(extractRows("x"), []);
  });

  it("TTL: data lama tetap lama; kosong & baru dicek sering", () => {
    const t = (hasData: boolean, tanggal: string) => snapshotTtlMs({ hasData, tanggal, now: NOW });
    assert.equal(t(true, "2026-10-30"), 6 * H); // 3 hari → masih bisa dikoreksi
    assert.equal(t(true, "2026-10-20"), 7 * 24 * H);
    assert.equal(t(false, "2026-11-01"), 1 * H); // sumber tertinggal, data bisa menyusul
    assert.equal(t(false, "2026-10-01"), 24 * H);
  });
});

describe("klien SP2KP", () => {
  const budget: Sp2kpBudget = { attempts: 3, timeoutMs: 50, backoffMs: 0 };
  const noSleep = async () => undefined;
  const res = (status: number, body: string) => new Response(body, { status });

  it("mengulang setelah timeout lalu berhasil", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("t"), { name: "TimeoutError" });
      return res(200, JSON.stringify({ status: "success", data: [] }));
    }) as unknown as typeof fetch;
    const out = await sp2kpJson({ path: "/x", budget, fetchImpl, sleepImpl: noSleep });
    assert.equal(calls, 2);
    assert.deepEqual(out.data, []);
  });

  it("gagal jadi timeout setelah semua percobaan habis", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      throw Object.assign(new Error("t"), { name: "TimeoutError" });
    }) as unknown as typeof fetch;
    await assert.rejects(
      sp2kpJson({ path: "/x", budget, fetchImpl, sleepImpl: noSleep }),
      (e: unknown) => e instanceof Sp2kpError && e.kind === "timeout",
    );
    assert.equal(calls, 3);
  });

  it("4xx tidak diulang; 5xx diulang", async () => {
    let calls = 0;
    const f404 = (async () => (calls++, res(404, "no"))) as unknown as typeof fetch;
    await assert.rejects(sp2kpJson({ path: "/x", budget, fetchImpl: f404, sleepImpl: noSleep }));
    assert.equal(calls, 1);
    calls = 0;
    const f502 = (async () => (calls++, res(502, "bad"))) as unknown as typeof fetch;
    await assert.rejects(sp2kpJson({ path: "/x", budget, fetchImpl: f502, sleepImpl: noSleep }));
    assert.equal(calls, 3);
  });

  it("menolak respons bukan JSON / tanpa data / status bukan success", async () => {
    for (const body of ["<html>", "[]", JSON.stringify({ status: "success" }), JSON.stringify({ status: "error", data: [] })]) {
      const f = (async () => res(200, body)) as unknown as typeof fetch;
      await assert.rejects(
        sp2kpJson({ path: "/x", budget: { ...budget, attempts: 1 }, fetchImpl: f, sleepImpl: noSleep }),
        (e: unknown) => e instanceof Sp2kpError && e.kind === "invalid",
        body,
      );
    }
  });
});

class MemStore implements MirrorStore {
  snaps = new Map<string, SnapshotRow & { lastError: string | null }>();
  wilayah = new Map<string, { rows: KabKotaRow[]; at: Date }>();
  k = (key: SnapshotKey) => [key.kind, key.kodeProvinsi, key.kodeKabKota, key.tanggal, key.tanggalPembanding].join("|");
  async getSnapshot(key: SnapshotKey) {
    return this.snaps.get(this.k(key)) ?? null;
  }
  async saveSnapshot(key: SnapshotKey, row: { payload: unknown; hasData: boolean; at: Date }) {
    this.snaps.set(this.k(key), { payload: row.payload, hasData: row.hasData, fetchedAt: row.at, lastAttemptAt: row.at, lastError: null });
  }
  async markAttempt(key: SnapshotKey, at: Date, error: string | null) {
    const r = this.snaps.get(this.k(key));
    if (r) Object.assign(r, { lastAttemptAt: at, lastError: error });
  }
  async getWilayah(prov: string) {
    const w = this.wilayah.get(prov);
    return { rows: w?.rows ?? [], oldestFetchedAt: w?.at ?? null };
  }
  async replaceWilayah(prov: string, rows: KabKotaRow[], at: Date) {
    this.wilayah.set(prov, { rows, at });
    return { upserted: rows.length, deactivated: 0 };
  }
}

const key = (over: Partial<SnapshotKey> = {}): SnapshotKey => ({
  kind: "harga",
  kodeProvinsi: "35",
  kodeKabKota: "3578",
  tanggal: "2026-10-30",
  tanggalPembanding: "2026-10-23",
  ...over,
});

const INPUT = { tanggal: "2026-10-30", tanggalPembanding: "2026-10-23", kodeProvinsi: "35", kodeKabKota: "3578" };

function setup(responder: (path: string, form?: Record<string, string>) => unknown, now: () => Date = () => NOW) {
  const store = new MemStore();
  const calls: Array<{ path: string; form?: Record<string, string> }> = [];
  const fetchJson = (async (req: { path: string; form?: Record<string, string> }) => {
    calls.push({ path: req.path, form: req.form });
    const out = responder(req.path, req.form);
    if (out instanceof Error) throw out;
    return out as Record<string, unknown>;
  }) as unknown as typeof sp2kpJson;
  return { store, calls, mirror: createMirror({ store, now, fetchJson }) };
}

describe("cermin pangan", () => {
  it("baris belum ada → ambil dari sumber, simpan, panggilan berikutnya dari DB", async () => {
    const { mirror, calls } = setup(() => hargaPayload(10000));
    const a = await mirror.getHarga(INPUT);
    assert.equal(a.source, "live");
    const b = await mirror.getHarga(INPUT);
    assert.equal(b.source, "db");
    assert.equal(calls.length, 1);
  });

  it("permintaan kembar yang bersamaan hanya satu panggilan ke sumber", async () => {
    const { mirror, calls } = setup(() => hargaPayload(10000));
    await Promise.all([mirror.getHarga(INPUT), mirror.getHarga(INPUT), mirror.getHarga(INPUT)]);
    assert.equal(calls.length, 1);
  });

  it("pasangan tanggal bebas: dilayani dari sumber tapi tidak disimpan", async () => {
    const { mirror, store, calls } = setup(() => hargaPayload(10000));
    const free = { ...INPUT, tanggalPembanding: "2026-10-27" };
    await mirror.getHarga(free);
    await mirror.getHarga(free);
    assert.equal(calls.length, 2);
    assert.equal(store.snaps.size, 0);
  });

  it("sumber mati & belum ada baris → MirrorError 504 untuk timeout, 502 untuk lainnya", async () => {
    const t = setup(() => new Sp2kpError("timeout", "x"));
    await assert.rejects(t.mirror.getHarga(INPUT), (e: unknown) => e instanceof MirrorError && e.status === 504);
    const n = setup(() => new Sp2kpError("network", "x"));
    await assert.rejects(n.mirror.getHarga(INPUT), (e: unknown) => e instanceof MirrorError && e.status === 502);
  });

  it("baris kedaluwarsa & sumber mati → sajikan data lama (stale), tidak error", async () => {
    const { mirror, store } = setup(() => new Sp2kpError("timeout", "x"));
    await store.saveSnapshot(key(), { payload: hargaPayload(9000), hasData: true, at: new Date(NOW.getTime() - 10 * H) });
    const r = await mirror.getHarga(INPUT);
    assert.equal(r.stale, true);
    assert.equal(r.source, "stale");
    assert.equal((r.payload.data as Array<{ harga: number }>)[0].harga, 9000);
  });

  it("masa tenang: setelah gagal, tidak memanggil sumber lagi dalam 60 dtk", async () => {
    const { mirror, store, calls } = setup(() => new Sp2kpError("timeout", "x"));
    await store.saveSnapshot(key(), { payload: hargaPayload(9000), hasData: true, at: new Date(NOW.getTime() - 10 * H) });
    await mirror.getHarga(INPUT); // gagal → percobaan tercatat
    await mirror.getHarga(INPUT);
    await mirror.getHarga(INPUT);
    assert.equal(calls.length, 1);
  });

  it("baris kedaluwarsa & sumber hidup → disegarkan", async () => {
    const { mirror, store } = setup(() => hargaPayload(11000));
    await store.saveSnapshot(key(), { payload: hargaPayload(9000), hasData: true, at: new Date(NOW.getTime() - 10 * H) });
    const r = await mirror.getHarga(INPUT);
    assert.equal(r.source, "live");
    assert.equal((r.payload.data as Array<{ harga: number }>)[0].harga, 11000);
  });

  it("sumber tiba-tiba kosong → data lama yang berisi dipertahankan", async () => {
    const { mirror, store } = setup(() => hargaPayload(0));
    await store.saveSnapshot(key(), { payload: hargaPayload(9000), hasData: true, at: new Date(NOW.getTime() - 10 * H) });
    const r = await mirror.getHarga(INPUT);
    assert.equal(r.stale, true);
    assert.equal((r.payload.data as Array<{ harga: number }>)[0].harga, 9000);
  });

  it("kab/kota: ambil sekali, lalu dari DB; daftar menyusut drastis tidak menimpa", async () => {
    const rows = (n: number) => ({
      status: "success",
      data: Array.from({ length: n }, (_, i) => ({ kode_kab_kota: `35${String(i + 1).padStart(2, "0")}`, nama_kab_kota: `Kab ${i + 1}` })),
    });
    let size = 8;
    const { mirror, store, calls } = setup(() => rows(size));
    const a = await mirror.getKabKota("35");
    assert.equal(a.rows.length, 8);
    assert.equal(a.source, "live");
    assert.equal((await mirror.getKabKota("35")).source, "db");
    assert.equal(calls.length, 1);

    size = 2; // sumber menyusut mendadak
    const r = await mirror.ensureWilayah("35", { attempts: 1, timeoutMs: 10, backoffMs: 0 }, true);
    assert.equal(r.status, "failed");
    assert.match(r.error ?? "", /menyusut/);
    assert.equal(store.wilayah.get("35")?.rows.length, 8);
  });

  it("parseKabKotaRows membuang baris cacat dan duplikat", () => {
    const out = parseKabKotaRows({
      data: [
        { kode_kab_kota: "3501", nama_kab_kota: "Kab. Pacitan" },
        { kode_kab_kota: "3501", nama_kab_kota: "Dobel" },
        { kode_kab_kota: "35", nama_kab_kota: "Pendek" },
        { kode_kab_kota: "3502", nama_kab_kota: "" },
        null,
      ],
    });
    assert.deepEqual(out, [{ kode_kab_kota: "3501", nama_kab_kota: "Kab. Pacitan" }]);
  });

  it("isKnownKabKota: kode harus berawalan provinsi & ada di daftar bila daftar sudah ada", async () => {
    const { mirror, store } = setup(() => ({}));
    assert.equal(await mirror.isKnownKabKota("35", "3299"), false);
    assert.equal(await mirror.isKnownKabKota("35", "3578"), true); // daftar belum ada → longgar
    store.wilayah.set("35", { rows: [{ kode_kab_kota: "3578", nama_kab_kota: "Kota Surabaya" }], at: NOW });
    assert.equal(await mirror.isKnownKabKota("35", "3578"), true);
    assert.equal(await mirror.isKnownKabKota("35", "3599"), false);
  });
});

describe("sinkronisasi pangan", () => {
  it("mencari tanggal terbaru yang HET-nya berisi (melewati akhir pekan kosong)", async () => {
    const { mirror, calls } = setup((_p, form) => (form?.tanggal === "2026-10-30" ? HET_OK : EMPTY_HET));
    assert.equal(await discoverLatestDataDate(mirror, TODAY), "2026-10-30");
    assert.deepEqual(
      calls.map((c) => c.form?.tanggal),
      ["2026-11-02", "2026-11-01", "2026-10-31", "2026-10-30"],
    );
  });

  it("tak ada data dalam jendela → null", async () => {
    const { mirror } = setup(() => EMPTY_HET);
    assert.equal(await discoverLatestDataDate(mirror, TODAY, 3), null);
  });

  it("kunci prefetch: H-7 dan H-1 dari tanggal terbaru, per kab/kota", () => {
    const keys = buildPrefetchKeys([{ kodeProvinsi: "35", kodeKabKota: "3578" }], "2026-10-30");
    assert.deepEqual(
      keys.map((k) => k.tanggalPembanding),
      ["2026-10-23", "2026-10-29"],
    );
    assert.ok(keys.every((k) => isStandardPair(k.tanggal, k.tanggalPembanding)));
  });

  it("runPool: patuhi paralelisme dan berhenti saat batas waktu", async () => {
    let active = 0;
    let maxActive = 0;
    const r = await runPool([1, 2, 3, 4, 5, 6], 2, Number.MAX_SAFE_INTEGER, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((res) => setTimeout(res, 5));
      active--;
    });
    assert.equal(r.done, 6);
    assert.equal(maxActive, 2);

    let t = 0;
    const cut = await runPool([1, 2, 3, 4], 1, 2, async () => undefined, () => t++);
    assert.equal(cut.done + cut.skipped, 4);
    assert.ok(cut.skipped > 0);
  });

  it("syncPangan scope=harga: prefetch hanya yang kedaluwarsa, lalu idempoten", async () => {
    const { mirror, store, calls } = setup((path) => (path.endsWith("het-ha") ? HET_OK : hargaPayload(10000)));
    const deps = {
      mirror,
      now: () => NOW,
      loadTargets: async () => [
        { kodeProvinsi: "35", kodeKabKota: "3578" },
        { kodeProvinsi: "32", kodeKabKota: "3273" },
      ],
      sleep: async () => undefined,
    };
    // HET hari ini sudah ada → tanggal terbaru = hari ini (2026-11-02)
    const first = await syncPangan({ scope: "harga", deadlineMs: 60_000 }, deps);
    assert.equal(first.latestDataDate, TODAY);
    assert.equal(first.harga?.tasks, 4);
    assert.equal(first.harga?.refreshed, 4);
    assert.equal(first.incomplete, false);
    assert.equal([...store.snaps.keys()].filter((k) => k.startsWith("harga")).length, 4);

    const before = calls.length;
    const second = await syncPangan({ scope: "harga", deadlineMs: 60_000 }, deps);
    assert.equal(second.harga?.fresh, 4);
    assert.equal(second.harga?.refreshed, 0);
    assert.equal(calls.length, before); // run kedua hanya membaca DB → tak ada panggilan baru ke sumber
  });

  it("syncPangan: sumber mati → dilaporkan incomplete, tidak melempar", async () => {
    const { mirror } = setup(() => new Sp2kpError("timeout", "x"));
    const rep = await syncPangan(
      { scope: "harga", deadlineMs: 60_000 },
      { mirror, now: () => NOW, loadTargets: async () => [{ kodeProvinsi: "35", kodeKabKota: "3578" }], sleep: async () => undefined },
    );
    assert.equal(rep.latestDataDate, null);
    assert.equal(rep.incomplete, true);
  });
});
