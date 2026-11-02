/** Tes integrasi cermin pangan terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("cermin pangan (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let store: typeof import("../lib/pangan/mirror-store").prismaMirrorStore;
  let createMirror: typeof import("../lib/pangan/mirror").createMirror;
  let sync: typeof import("../lib/pangan/sync");
  const villages: number[] = [];
  const tag = `${Date.now() % 1e6}`;
  const NOW = new Date("2026-11-02T03:00:00Z");

  before(async () => {
    ({ prisma } = await import("../lib/prisma"));
    ({ prismaMirrorStore: store } = await import("../lib/pangan/mirror-store"));
    ({ createMirror } = await import("../lib/pangan/mirror"));
    sync = await import("../lib/pangan/sync");
    await prisma.panganHargaSnapshot.deleteMany({});
    await prisma.panganWilayah.deleteMany({});
  });
  after(async () => {
    await prisma.village.deleteMany({ where: { id: { in: villages } } });
    await prisma.panganHargaSnapshot.deleteMany({});
    await prisma.panganWilayah.deleteMany({});
    await prisma.$disconnect();
  });

  const key = (over: Record<string, string> = {}) => ({
    kind: "harga" as const,
    kodeProvinsi: "35",
    kodeKabKota: "3578",
    tanggal: "2026-10-30",
    tanggalPembanding: "2026-10-23",
    ...over,
  });

  it("snapshot: simpan dua kali = satu baris (upsert); baca kembali payload JSON utuh", async () => {
    const payload1 = { status: "success", data: [{ variant_id: 1, harga: 100 }] };
    const payload2 = { status: "success", data: [{ variant_id: 1, harga: 200 }] };
    await store.saveSnapshot(key(), { payload: payload1, hasData: true, at: NOW });
    await store.saveSnapshot(key(), { payload: payload2, hasData: true, at: new Date(NOW.getTime() + 1000) });
    assert.equal(await prisma.panganHargaSnapshot.count(), 1);
    const row = await store.getSnapshot(key());
    assert.deepEqual(row?.payload, payload2);
    assert.equal(row?.hasData, true);
    assert.equal(row?.fetchedAt.getTime(), NOW.getTime() + 1000);
  });

  it("snapshot: kunci berbeda = baris berbeda; HET nasional memakai kode kosong", async () => {
    await store.saveSnapshot(key({ tanggalPembanding: "2026-10-29" }), { payload: { data: [] }, hasData: false, at: NOW });
    const het = { kind: "het" as const, kodeProvinsi: "", kodeKabKota: "", tanggal: "2026-10-30", tanggalPembanding: "" };
    await store.saveSnapshot(het, { payload: { data: [{ a: 1 }] }, hasData: true, at: NOW });
    assert.equal(await prisma.panganHargaSnapshot.count(), 3);
    assert.equal((await store.getSnapshot(het))?.hasData, true);
    assert.equal(await store.getSnapshot(key({ kodeKabKota: "3579" })), null);
  });

  it("markAttempt: mencatat percobaan & galat tanpa mengubah payload, dan tidak membuat baris baru", async () => {
    const before_ = await store.getSnapshot(key());
    await store.markAttempt(key(), new Date(NOW.getTime() + 5000), "timeout");
    const after_ = await store.getSnapshot(key());
    assert.deepEqual(after_?.payload, before_?.payload);
    assert.equal(after_?.lastAttemptAt?.getTime(), NOW.getTime() + 5000);
    const before = await prisma.panganHargaSnapshot.count();
    await store.markAttempt(key({ kodeKabKota: "3500" }), NOW, "x");
    assert.equal(await prisma.panganHargaSnapshot.count(), before);
    const err = await prisma.panganHargaSnapshot.findFirst({ where: { kodeKabKota: "3578", tanggalPembanding: "2026-10-23" } });
    assert.equal(err?.lastError, "timeout");
  });

  it("wilayah: upsert, nonaktifkan yang hilang, hanya aktif yang dibaca, waktu tertua dilaporkan", async () => {
    const t1 = new Date("2026-10-01T00:00:00Z");
    const t2 = new Date("2026-10-20T00:00:00Z");
    await store.replaceWilayah("35", [
      { kode_kab_kota: "3501", nama_kab_kota: "Kab. Pacitan" },
      { kode_kab_kota: "3502", nama_kab_kota: "Kab. Ponorogo" },
      { kode_kab_kota: "3578", nama_kab_kota: "Kota Surabaya" },
    ], t1);
    const r2 = await store.replaceWilayah("35", [
      { kode_kab_kota: "3501", nama_kab_kota: "Kab. Pacitan (baru)" },
      { kode_kab_kota: "3578", nama_kab_kota: "Kota Surabaya" },
    ], t2);
    assert.deepEqual(r2, { upserted: 2, deactivated: 1 });
    const w = await store.getWilayah("35");
    assert.deepEqual(w.rows.map((r) => r.kode_kab_kota), ["3501", "3578"]);
    assert.equal(w.rows[0].nama_kab_kota, "Kab. Pacitan (baru)");
    assert.equal(w.oldestFetchedAt?.getTime(), t2.getTime());
    // baris nonaktif tetap ada (riwayat), dan aktif lagi bila muncul kembali
    assert.equal(await prisma.panganWilayah.count({ where: { kodeProvinsi: "35", isActive: false } }), 1);
    await store.replaceWilayah("35", [{ kode_kab_kota: "3502", nama_kab_kota: "Kab. Ponorogo" }, { kode_kab_kota: "3501", nama_kab_kota: "Kab. Pacitan" }], t2);
    assert.equal((await store.getWilayah("35")).rows.length, 2);
    assert.deepEqual((await store.getWilayah("99")).rows, []);
    assert.equal((await store.getWilayah("99")).oldestFetchedAt, null);
  });

  it("mirror + penyimpanan Prisma end-to-end: ambil, simpan, baca dari DB; sumber mati → stale", async () => {
    let calls = 0;
    let alive = true;
    const fetchJson = (async () => {
      calls++;
      if (!alive) throw Object.assign(new Error("x"), { name: "Sp2kpError" });
      return { status: "success", data: [{ variant_id: 1, harga: 5000 }] };
    }) as never;
    let clock = NOW;
    const m = createMirror({ store, now: () => clock, fetchJson });
    const input = { tanggal: "2026-10-28", tanggalPembanding: "2026-10-21", kodeProvinsi: "32", kodeKabKota: "3273" };
    assert.equal((await m.getHarga(input)).source, "live");
    assert.equal((await m.getHarga(input)).source, "db");
    assert.equal(calls, 1);
    // maju 8 hari: data 28 Okt (>3 hari, ada data) → TTL 7 hari lewat; sumber mati → stale
    clock = new Date(NOW.getTime() + 8 * 24 * 3_600_000);
    alive = false;
    const r = await m.getHarga({ ...input });
    assert.equal(r.stale, true);
    assert.equal(r.source, "stale");
    assert.equal(calls, 2);
  });

  it("loadVillageTargets: kode tersimpan di settings, dicocokkan dari teks (memakai tabel wilayah), dan env tambahan", async () => {
    const mk = async (n: string, province: string, regency: string, settings?: object) => {
      const v = await prisma.village.create({
        data: { code: `P${n}${tag}`.slice(0, 20), name: n, district: "k", regency, province, address: "a", ...(settings ? { settings } : {}) },
      });
      villages.push(v.id);
    };
    await store.replaceWilayah("35", [
      { kode_kab_kota: "3501", nama_kab_kota: "Kab. Pacitan" },
      { kode_kab_kota: "3578", nama_kab_kota: "Kota Surabaya" },
    ], NOW);
    await mk("a", "Jawa Timur", "Kab. Tidak Dikenal", { wilayah: { kode_provinsi: "33", kode_kab_kota: "3374" } });
    await mk("b", "Jawa Timur", "Kota Surabaya"); // dicocokkan lewat tabel pangan_wilayah (3578)
    await mk("c", "Provinsi Entah", "Kab. X"); // tak bisa dipetakan
    process.env.PANGAN_PREFETCH_EXTRA = "3171, 99";
    try {
      const targets = await sync.loadVillageTargets();
      const set = new Set(targets.map((t) => `${t.kodeProvinsi}:${t.kodeKabKota}`));
      assert.ok(set.has("33:3374"), "dari settings");
      assert.ok(set.has("35:3578"), "dari teks via tabel wilayah");
      assert.ok(set.has("31:3171"), "dari env");
      assert.ok(![...set].some((s) => s.endsWith(":99")), "kode env tak valid dibuang");
    } finally {
      delete process.env.PANGAN_PREFETCH_EXTRA;
    }
  });

  it("purge: hanya menghapus snapshot lebih tua dari batas tanggal", async () => {
    await store.saveSnapshot(key({ tanggal: "2025-01-01", tanggalPembanding: "2024-12-25" }), { payload: { data: [] }, hasData: false, at: NOW });
    const deleted = await sync.purgeOldSnapshots("2025-09-28");
    assert.equal(deleted, 1);
    assert.ok((await prisma.panganHargaSnapshot.count()) >= 3);
  });
});
