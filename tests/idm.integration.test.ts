/** Tes integrasi impor IDM terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("IDM (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let idm: typeof import("../lib/idm/service");
  let vA = 0;
  let vB = 0;
  const made: number[] = [];
  const mkVillage = async (c: string, settings?: unknown) => {
    const v = await prisma.village.create({ data: { code: `${c}${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000), ...(settings ? { settings: settings as never } : {}) } });
    made.push(v.id);
    return v.id;
  };
  const sum = (villageId: number, year: number, s: Record<string, unknown>, fileName = "idm.xlsx") => idm.importIdm(prisma, { villageId, userId: 1, input: { year, layout: "SUMMARY", fileName, summary: s } });
  const inds = (villageId: number, year: number, list: Record<string, unknown>[]) => idm.importIdm(prisma, { villageId, userId: 1, input: { year, layout: "INDICATORS", fileName: "rumusan.xlsx", indicators: list } });
  const ov = async (villageId: number, year?: number) => {
    const r = await idm.getOverview(prisma, { villageId, year });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    idm = await import("../lib/idm/service");
    vA = await mkVillage("IA", { integrations: { idmVillageCode: "3313042002" } });
    vB = await mkVillage("IB");
  });
  after(async () => {
    for (const id of made) await prisma.village.delete({ where: { id } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("impor skor per tahun: disimpan apa adanya (termasuk skala poin), diimpor ulang menggantikan, tahun terbaru terpilih", async () => {
    assert.deepEqual((await ov(vA)).years, []);
    const r1 = await sum(vA, 2024, { iks: "0,7563", ike: 0.612, ikl: 0.8001, idm: 0.7228, status: "MAJU" });
    assert.ok(r1.ok && r1.data.replaced === false);
    const r2 = await sum(vA, 2025, { iks: 53, ike: 113, ikl: 62, idm: 228, status: "MAJU" });
    assert.ok(r2.ok);
    const o = await ov(vA);
    assert.deepEqual(o.years.map((y) => y.year), [2025, 2024]);
    assert.equal(o.selectedYear, 2025);
    assert.equal(o.village.idmVillageCode, "3313042002");
    const y24 = o.years.find((y) => y.year === 2024)!;
    assert.deepEqual([y24.iks, y24.ike, y24.ikl, y24.idm, y24.status], [0.7563, 0.612, 0.8001, 0.7228, "MAJU"]);
    assert.equal(o.scalesDiffer, true, "0-1 versus poin diperingatkan");
    const again = await sum(vA, 2024, { iks: 0.8, ike: null, ikl: null, idm: null, status: "MANDIRI" }, "baru.xlsx");
    assert.ok(again.ok && again.data.replaced === true);
    const y2 = (await ov(vA, 2024)).years.find((y) => y.year === 2024)!;
    assert.deepEqual([y2.iks, y2.ike, y2.status, y2.sourceName], [0.8, null, "MANDIRI", "baru.xlsx"], "diganti seluruhnya, bukan digabung");
    assert.equal((await ov(vA, 1999)).selectedYear, 2025, "tahun tak dikenal jatuh ke terbaru");
  });

  it("impor indikator menggantikan seluruh indikator tahun itu, menyusun rekomendasi, dan tidak menyentuh skor", async () => {
    const list = [
      { dimension: "IKS", code: "1", name: "Akses kesehatan", score: 2, maxScore: 5, suggestion: "Bangun polindes" },
      { dimension: "IKS", code: "2", name: "Akses pendidikan", score: 5, maxScore: 5 },
      { dimension: "IKE", code: "3", name: "Keragaman produksi", score: "1,5", maxScore: 5, note: "Rendah" },
      { dimension: "IKL", code: "4", name: "Kualitas lingkungan", score: 4, maxScore: 5 },
    ];
    const r = await inds(vA, 2025, list);
    assert.ok(r.ok && r.data.indicators === 4);
    const o = await ov(vA, 2025);
    assert.equal(o.indicators.length, 4);
    assert.equal(o.indicators[2].score, 1.5);
    assert.deepEqual(o.recommendation?.overall.map((i) => i.name).slice(0, 2), ["Keragaman produksi", "Akses kesehatan"], "terendah menurut rasio");
    assert.equal(o.recommendation?.basis, "RASIO");
    assert.equal(o.recommendation?.weakestDimension?.dimension, "IKS", "dimensi terlemah dari skor 53/113/62");
    assert.equal(o.years.find((y) => y.year === 2025)?.idm, 228, "skor tidak tersentuh");
    const r2 = await inds(vA, 2025, [{ dimension: "IKL", name: "Hanya satu", score: 1 }]);
    assert.ok(r2.ok && r2.data.replaced === true);
    const o2 = await ov(vA, 2025);
    assert.deepEqual(o2.indicators.map((i) => i.name), ["Hanya satu"]);
    assert.equal(o2.recommendation?.basis, "MENTAH");
  });

  it("isolasi lintas desa: data desa B tidak terlihat dan tidak dapat dihapus oleh desa lain", async () => {
    assert.ok((await sum(vB, 2025, { idm: 0.5, status: "BERKEMBANG" })).ok);
    const a = await ov(vA);
    const b = await ov(vB);
    assert.equal(b.years.length, 1);
    assert.equal(b.years[0].idm, 0.5);
    assert.ok(a.years.every((y) => y.status !== "BERKEMBANG"));
    const del = await idm.deleteYear(prisma, { villageId: vA, year: 2025 });
    assert.ok(del.ok);
    assert.equal((await ov(vB)).years[0].status, "BERKEMBANG", "milik B tetap");
    const vC = await mkVillage("IC");
    assert.ok(!(await idm.deleteYear(prisma, { villageId: vC, year: 2025 })).ok, "desa lain tidak punya data tahun itu");
    assert.equal(await prisma.idmIndicator.count({ where: { villageId: vA, year: 2025 } }), 0, "indikator ikut terhapus");
  });

  it("impor serentak tahun yang sama tidak menggandakan indikator (kunci baris desa-tahun)", async () => {
    const v = await mkVillage("ID");
    const mk = (n: number) => Array.from({ length: 5 }, (_, i) => ({ dimension: "IKS", name: `Ind ${n}-${i}`, score: i }));
    const rs = await Promise.all([1, 2, 3, 4, 5, 6].map((n) => inds(v, 2025, mk(n))));
    assert.ok(rs.every((r) => r.ok), JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors))));
    assert.equal(await prisma.idmIndicator.count({ where: { villageId: v, year: 2025 } }), 5, "tepat satu berkas yang tersisa");
    const names = (await prisma.idmIndicator.findMany({ where: { villageId: v, year: 2025 }, select: { name: true } })).map((x) => x.name.split("-")[0]);
    assert.equal(new Set(names).size, 1, "semua indikator berasal dari satu impor");
    assert.equal(await prisma.idmScore.count({ where: { villageId: v, year: 2025 } }), 1);
  });

  it("masukan jahat ditolak tanpa mengubah data", async () => {
    const v = await mkVillage("IE");
    assert.ok((await sum(v, 2025, { idm: 0.6 })).ok);
    for (const input of [{ year: 2025, layout: "SUMMARY", summary: { iks: "1e9" } }, { year: 1900, layout: "SUMMARY", summary: { idm: 1 } }, { year: 2025, layout: "INDICATORS", indicators: [{ name: "", score: 1 }] }, { year: 2025, layout: "SUMMARY", summary: { status: "x".repeat(50) } }, "bukan objek", null]) {
      const r = await idm.importIdm(prisma, { villageId: v, userId: 1, input });
      assert.equal(r.ok, false, JSON.stringify(input));
    }
    assert.equal((await ov(v)).years[0].idm, 0.6);
    assert.ok(!(await idm.deleteYear(prisma, { villageId: v, year: 1800 })).ok);
  });

  it("layout berupa kunci prototipe ditolak 400 dan tidak menghapus indikator yang ada", async () => {
    const v = await mkVillage("IP");
    assert.ok((await inds(v, 2025, [{ dimension: "IKS", name: "Akses", score: 2, maxScore: 5 }])).ok);
    for (const layout of ["constructor", "__proto__", "toString"]) {
      const r = await idm.importIdm(prisma, { villageId: v, userId: 1, input: { year: 2025, layout, indicators: [{ name: "x", score: 1 }], summary: { idm: 1 } } });
      assert.ok(!r.ok && r.status === 400, layout);
    }
    assert.equal(await prisma.idmIndicator.count({ where: { villageId: v, year: 2025 } }), 1, "indikator tahun itu utuh");
  });
});
