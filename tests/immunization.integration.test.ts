/** Tes integrasi imunisasi anak terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Imunisasi anak (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/gizi/immunization");
  let vA = 0;
  let vB = 0;
  const id: Record<string, number> = {};
  const TODAY = new Date("2026-11-01T03:00:00Z");

  const rec = (villageId: number, residentId: number, codes: unknown, givenAt = "2026-10-15") => svc.recordDoses(prisma, { villageId, userId: 1, input: { residentId, codes, givenAt }, now: TODAY });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/gizi/immunization");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("IA")).id;
    vB = (await mkV("IB")).id;
    let n = 0;
    const mk = async (key: string, villageId: number, birth: string, isAlive = true) =>
      (id[key] = (await prisma.resident.create({ data: { villageId, nik: `33003${t}${++n}`.padEnd(16, "0").slice(0, 16), name: `Anak ${key}`, birthplace: "x", birthDate: new Date(birth), gender: "Perempuan", address: "a", rt: "01", rw: "02", religion: "Islam", maritalStatus: "Belum Menikah", familyRole: "Anak", isAlive } })).id);
    await mk("bayi", vA, "2026-08-01"); // 3 bulan
    await mk("lengkap", vA, "2026-05-01"); // 6 bulan
    await mk("balita", vA, "2023-01-01"); // > 24 bulan: tak dipantau
    await mk("wafat", vA, "2026-06-01", false);
    await mk("lain", vB, "2026-08-01");
  });
  after(async () => {
    for (const v of [vA, vB]) if (v) await prisma.village.delete({ where: { id: v } });
    await prisma.$disconnect();
  });

  it("mencatat beberapa dosis sekaligus; dosis yang sudah ada dilewati dan dilaporkan", async () => {
    const a = await rec(vA, id.bayi, ["HB0", "BCG", "OPV1"], "2026-08-02");
    assert.ok(a.ok && a.data.recorded.length === 3);
    const b = await rec(vA, id.bayi, ["BCG", "DPT1"], "2026-10-05");
    assert.ok(b.ok && b.data.recorded.join() === "DPT1" && b.data.alreadyRecorded.join() === "BCG");
    const st = await svc.childStatus(prisma, vA, id.bayi, TODAY);
    assert.ok(st.ok);
    if (st.ok) {
      assert.equal(st.data.doses.find((d) => d.code === "BCG")?.givenAt, "2026-08-02", "tanggal pertama tidak tertimpa");
      assert.equal(st.data.doses.find((d) => d.code === "DPT2")?.state, "WAKTUNYA", "usia 3 bulan 1 hari");
    }
  });

  it("validasi: kode asing, tanggal sebelum lahir/masa depan, anak desa lain", async () => {
    assert.ok(!(await rec(vA, id.bayi, ["XYZ"])).ok);
    assert.ok(!(await rec(vA, id.bayi, [])).ok);
    assert.ok(!(await rec(vA, id.bayi, "BCG" as never)).ok);
    assert.ok(!(await rec(vA, id.bayi, ["OPV2"], "2026-07-01")).ok, "sebelum lahir");
    assert.ok(!(await rec(vA, id.bayi, ["OPV2"], "2026-12-01")).ok, "masa depan");
    const cross = await rec(vA, id.lain, ["HB0"]);
    assert.ok(!cross.ok && cross.status === 404);
    assert.ok(!(await svc.childStatus(prisma, vA, id.lain, TODAY)).ok);
  });

  it("catatan serentak untuk dosis yang sama: hanya satu yang tercatat", async () => {
    const rs = await Promise.all(Array.from({ length: 4 }, () => rec(vA, id.lengkap, ["HB0"], "2026-05-02")));
    assert.equal(rs.filter((r) => r.ok && r.data.recorded.length === 1).length, 1);
    assert.equal(await prisma.immunizationRecord.count({ where: { residentId: id.lengkap, vaccineCode: "HB0" } }), 1);
  });

  it("hapus catatan salah: hanya milik desa sendiri", async () => {
    assert.ok(!(await svc.removeDose(prisma, { villageId: vB, residentId: id.bayi, code: "BCG" })).ok);
    assert.ok((await svc.removeDose(prisma, { villageId: vA, residentId: id.bayi, code: "BCG" })).ok);
    assert.ok(!(await svc.removeDose(prisma, { villageId: vA, residentId: id.bayi, code: "BCG" })).ok);
  });

  it("cakupan: hanya anak hidup 0-24 bulan, daftar tertinggal terurut, persentase benar, tanpa NIK", async () => {
    await rec(vA, id.lengkap, ["BCG", "OPV1", "DPT1", "OPV2", "PCV1", "RV1", "DPT2", "OPV3", "PCV2", "RV2"], "2026-08-01");
    const c = await svc.coverage(prisma, vA, TODAY);
    assert.equal(c.children, 2, "bayi dan lengkap saja (balita >24 bln dan yang wafat dikecualikan)");
    const names = c.behind.map((b) => b.name);
    assert.ok(!names.includes("Anak balita") && !names.includes("Anak wafat"));
    const lengkap = c.behind.find((b) => b.name === "Anak lengkap");
    assert.ok(lengkap && lengkap.missing.some((m) => /DPT-HB-Hib 3/.test(m)), "umur 6 bulan: DPT3/OPV4/IPV1/RV3 belum");
    const bcg = c.perVaccine.find((p) => p.code === "BCG")!;
    assert.deepEqual([bcg.eligible, bcg.given], [2, 1], "BCG bayi dihapus tadi, hanya 'lengkap' yang punya");
    assert.equal(bcg.percent, 50);
    assert.ok(c.perVaccine.every((p) => p.eligible > 0 && p.percent >= 0 && p.percent <= 100));
    assert.ok(!JSON.stringify(c).includes("nik"));
    assert.equal((await svc.coverage(prisma, vB, TODAY)).children, 1, "desa lain hanya melihat anaknya sendiri");
  });

  it("menghapus anak menghapus catatan imunisasinya", async () => {
    await prisma.resident.delete({ where: { id: id.bayi } });
    assert.equal(await prisma.immunizationRecord.count({ where: { residentId: id.bayi } }), 0);
  });
});
