/** Tes integrasi laporan gizi balita dan pelacak pembentukan Kopdes terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Gizi balita & Kopdes (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let gizi: typeof import("../lib/gizi/report");
  let form: typeof import("../lib/coop/formation");
  let vA = 0;
  let vB = 0;
  const id: Record<string, number> = {};
  const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    gizi = await import("../lib/gizi/report");
    form = await import("../lib/coop/formation");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("GA")).id;
    vB = (await mkV("GB")).id;
    let n = 0;
    const mkR = async (key: string, villageId: number, birth: Date, gender: string | null) =>
      (id[key] = (await prisma.resident.create({ data: { villageId, nik: `33000${t}${++n}`.padEnd(16, "0").slice(0, 16), name: `Anak ${key}`, birthplace: "x", birthDate: birth, gender: gender ?? "", address: "a", rt: "01", rw: "02", religion: "Islam", maritalStatus: "Belum Menikah", familyRole: "Anak" } })).id);
    await mkR("pendek", vA, day(2025, 1, 1), "Laki-laki");
    await mkR("normal", vA, day(2025, 1, 1), "Perempuan");
    await mkR("tua", vA, day(2015, 1, 1), "Laki-laki");
    await mkR("tanpaJk", vA, day(2025, 1, 1), null);
    await mkR("lain", vB, day(2025, 1, 1), "Laki-laki");
    const s1 = await prisma.posyanduSession.create({ data: { villageId: vA, sessionDate: day(2025, 12, 1), location: "Posyandu 1" } });
    const s2 = await prisma.posyanduSession.create({ data: { villageId: vA, sessionDate: day(2026, 1, 1), location: "Posyandu 1" } });
    const sB = await prisma.posyanduSession.create({ data: { villageId: vB, sessionDate: day(2026, 1, 1), location: "Posyandu B" } });
    const visit = (sessionId: number, residentId: number, weightKg: number | null, heightCm: number | null, isStunting = false) => prisma.posyanduVisit.create({ data: { sessionId, residentId, weightKg, heightCm, isStunting } });
    // Anak pendek: 11 bln di s1 (normal), 12 bln di s2 (tinggi 68 cm = sangat rendah, tanda sistem belum diberi)
    await visit(s1.id, id.pendek, 8.5, 73);
    await visit(s2.id, id.pendek, 7.5, 68, false);
    // Anak normal: tanda stunting salah di sistem (mismatch)
    await visit(s2.id, id.normal, 9, 74.5, true);
    await visit(s2.id, id.tua, 25, 120);
    await visit(s2.id, id.tanpaJk, 9, 75);
    await visit(sB.id, id.lain, 5, 60);
  });
  after(async () => {
    for (const v of [vA, vB]) if (v) await prisma.village.delete({ where: { id: v } });
    await prisma.$disconnect();
  });

  it("memakai pengukuran TERAKHIR tiap anak, menghitung stunting, dan menandai tanda sistem yang berbeda", async () => {
    const r = await gizi.giziReport(prisma, vA);
    const byName = Object.fromEntries(r.rows.map((x) => [x.name, x]));
    assert.equal(byName["Anak pendek"].measuredOn, "2026-01-01", "yang terakhir");
    assert.equal(byName["Anak pendek"].assessment?.stunted, true);
    assert.equal(byName["Anak pendek"].mismatch, true, "hitungan stunting, tanda sistem belum");
    assert.equal(byName["Anak normal"].assessment?.stunted, false);
    assert.equal(byName["Anak normal"].mismatch, true, "tanda sistem stunting padahal normal");
  });

  it("anak di atas 60 bulan tak masuk laporan; data kurang dilaporkan sebagai belum lengkap, bukan galat", async () => {
    const r = await gizi.giziReport(prisma, vA);
    assert.ok(!r.rows.some((x) => x.name === "Anak tua"));
    const tanpa = r.rows.find((x) => x.name === "Anak tanpaJk");
    assert.ok(tanpa && tanpa.assessment === null && /Jenis kelamin/.test(tanpa.reason ?? ""));
    assert.equal(r.summary.children, r.rows.length);
    assert.equal(r.summary.incomplete, 1);
    assert.equal(r.summary.stunted, 1);
    assert.equal(r.summary.mismatch, 2);
  });

  it("isolasi desa: desa lain tak melihat anak desa ini dan sebaliknya; tanpa NIK dalam hasil", async () => {
    const b = await gizi.giziReport(prisma, vB);
    assert.deepEqual(b.rows.map((x) => x.name), ["Anak lain"]);
    assert.ok(!JSON.stringify((await gizi.giziReport(prisma, vA)).rows).includes("nik"));
  });

  it("filter per sesi hanya memuat kunjungan sesi itu", async () => {
    const s1 = (await prisma.posyanduSession.findFirstOrThrow({ where: { villageId: vA, sessionDate: day(2025, 12, 1) } })).id;
    const r = await gizi.giziReport(prisma, vA, { sessionId: s1 });
    assert.deepEqual(r.rows.map((x) => x.name), ["Anak pendek"]);
    const other = await gizi.giziReport(prisma, vB, { sessionId: s1 });
    assert.equal(other.rows.length, 0, "sesi desa lain tak bisa diintip");
  });

  it("pelacak Kopdes: simpan bertahap (upsert), isian diganti utuh, dan terhapus bersama koperasinya", async () => {
    const coop = await prisma.cooperative.create({ data: { villageId: vA, name: "Kopdes Merah Putih A" } });
    const empty = await form.getFormation(prisma, coop.id);
    assert.ok(empty.steps.every((s) => !s.done));
    const now = new Date("2026-11-01T00:00:00Z");
    const a = await form.saveFormation(prisma, { cooperativeId: coop.id, userId: 1, input: { musdesusAt: "2026-03-01", musdesusRef: "BA/1", kadesApprovedAt: "2026-03-02" }, now });
    assert.ok(a.ok && a.data.steps.filter((s) => s.done).length === 2);
    const b = await form.saveFormation(prisma, { cooperativeId: coop.id, userId: 1, input: { musdesusAt: "2026-03-01", musdesusRef: "BA/1", deedNumber: "03", deedDate: "2026-03-10", commitmentAmount: "250000000" }, now });
    assert.ok(b.ok);
    if (b.ok) {
      assert.equal(b.data.kadesApprovedAt, null, "kolom yang dikosongkan ikut dikosongkan");
      assert.equal(b.data.commitmentAmount, "250000000.00");
      assert.equal(b.data.steps.filter((s) => s.done).length, 2);
    }
    assert.equal(await prisma.cooperativeFormation.count({ where: { cooperativeId: coop.id } }), 1, "satu baris per koperasi");
    const bad = await form.saveFormation(prisma, { cooperativeId: coop.id, userId: 1, input: { musdesusAt: "2026-03-10", deedDate: "2026-03-01" }, now });
    assert.ok(!bad.ok);
    assert.equal((await form.getFormation(prisma, coop.id)).deedDate, "2026-03-10", "simpan gagal tak mengubah data");
    await prisma.cooperative.delete({ where: { id: coop.id } });
    assert.equal(await prisma.cooperativeFormation.count({ where: { cooperativeId: coop.id } }), 0);
  });
});
