/** Tes integrasi data sasaran posyandu terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("data sasaran posyandu (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let data: typeof import("../lib/pkk/sasaran-data");
  let stats: typeof import("../lib/pkk/stats");
  let vA = 0;
  let vB = 0;
  const NOW = new Date(2026, 10, 16, 9, 0, 0);
  const born = (yearsAgo: number) => new Date(NOW.getFullYear() - yearsAgo, 0, 1);
  let seq = 0;
  const mk = (villageId: number, over: Record<string, unknown> = {}) =>
    prisma.resident.create({
      data: {
        villageId, nik: `${String(1e15 + ++seq + (Date.now() % 1e6) * 1e4).slice(0, 16)}`, name: `Warga ${seq}`, birthplace: "x", birthDate: born(30), gender: "Perempuan",
        address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Istri", rt: "01", rw: "01", ...over,
      } as never,
    });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    data = await import("../lib/pkk/sasaran-data");
    stats = await import("../lib/pkk/stats");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("SA")).id;
    vB = (await mkV("SB")).id;
    // Desa A: 2 RT; aktif, pindah, meninggal.
    await mk(vA, { birthDate: born(2), gender: "Laki-laki", rt: "1" }); // balita RT 01
    await mk(vA, { birthDate: born(25), isPregnant: true, rt: "01" }); // hamil + PUS + WUS RT 01
    await mk(vA, { birthDate: born(70), gender: "Laki-laki", rt: "RT 02" }); // lansia RT 02
    await mk(vA, { birthDate: born(8), gender: "Laki-laki", rt: null }); // sekolah, tanpa RT
    await mk(vA, { birthDate: born(30), moveDate: new Date(2026, 5, 1), rt: "01", isPregnant: true }); // PINDAH
    await mk(vA, { birthDate: born(1), moveDate: new Date(2026, 6, 1), rt: "02", gender: "Laki-laki" }); // PINDAH
    await mk(vA, { birthDate: born(40), isAlive: false, deathDate: new Date(2026, 1, 1) }); // meninggal: tak pernah dihitung
    await mk(vB, { birthDate: born(2), gender: "Laki-laki" }); // desa lain
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("aktif (bawaan): tanpa yang pindah dan meninggal; RT '1' dan '01' satu baris; tanpa RT terpisah", async () => {
    const r = await data.sasaranReport(prisma, vA, "aktif", NOW);
    assert.equal(r.status, "aktif");
    assert.equal(r.totals.total, 4);
    assert.deepEqual(r.rows.map((x) => [x.label, x.total]), [["RT 01 / RW 01", 2], ["RT 02 / RW 01", 1], ["Tanpa RT (RW 01)", 1]]);
    assert.equal(r.totals.balita, 1);
    assert.equal(r.totals.ibuHamil, 1);
    assert.equal(r.totals.pus, 1);
    assert.equal(r.totals.wus, 1);
    assert.equal(r.totals.lansia, 1);
    assert.equal(r.totals.sekolah, 1);
    assert.equal(r.tanpaRt, 1);
  });

  it("pindah: hanya yang bertanggal pindah; meninggal tetap tidak ikut", async () => {
    const r = await data.sasaranReport(prisma, vA, "pindah", NOW);
    assert.equal(r.totals.total, 2);
    assert.equal(r.totals.ibuHamil, 1);
    assert.equal(r.totals.balita, 1);
    assert.equal(r.totals.lansia, 0);
  });

  it("semua: aktif + pindah (6), tetap tanpa yang meninggal", async () => {
    const r = await data.sasaranReport(prisma, vA, "semua", NOW);
    assert.equal(r.totals.total, 6);
    const a = await data.sasaranReport(prisma, vA, "aktif", NOW);
    const p = await data.sasaranReport(prisma, vA, "pindah", NOW);
    assert.equal(a.totals.total + p.totals.total, r.totals.total);
  });

  it("desa lain tidak bocor (angka dan daftar nama)", async () => {
    const a = await data.sasaranReport(prisma, vA, "semua", NOW);
    const b = await data.sasaranReport(prisma, vB, "semua", NOW);
    assert.equal(b.totals.total, 1);
    assert.equal(a.totals.total, 6);
    const list = await data.sasaranList(prisma, vB, "semua", null, "semua", NOW);
    assert.equal(list.total, 1);
    assert.ok(list.people.every((p) => p.name.startsWith("Warga")));
    const none = await data.sasaranList(prisma, vB, "lansia", null, "semua", NOW);
    assert.equal(none.total, 0);
  });

  it("daftar nama cocok dengan angka tiap sel, membawa tanggal pindah, dan tanpa NIK/KK/alamat", async () => {
    for (const status of ["aktif", "pindah", "semua"] as const) {
      const rep = await data.sasaranReport(prisma, vA, status, NOW);
      for (const row of rep.rows) {
        for (const g of ["ibuHamil", "balita", "sekolah", "dewasa", "lansia", "pus", "wus"] as const) {
          const l = await data.sasaranList(prisma, vA, g, row.key, status, NOW);
          assert.equal(l.total, row[g], `${status} ${row.label} ${g}`);
        }
      }
    }
    const moved = await data.sasaranList(prisma, vA, "semua", null, "pindah", NOW);
    assert.equal(moved.total, 2);
    assert.ok(moved.people.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.moveDate ?? "")));
    const active = await data.sasaranList(prisma, vA, "semua", null, "aktif", NOW);
    assert.ok(active.people.every((p) => p.moveDate === null));
    for (const p of [...moved.people, ...active.people]) {
      assert.deepEqual(Object.keys(p).sort(), ["age", "gender", "id", "isPregnant", "maritalStatus", "moveDate", "name", "rt", "rw"]);
    }
  });

  it("daftar terurut RW lalu RT sebagai angka; warga tanpa RT paling bawah", async () => {
    const l = await data.sasaranList(prisma, vA, "semua", null, "aktif", NOW);
    assert.deepEqual(l.people.map((p) => p.rt), ["01", "01", "02", null]);
  });

  it("kartu ringkasan PKK memakai aturan yang sama (yang pindah tidak dihitung)", async () => {
    const s = await stats.computePkkStats(vA);
    assert.equal(s.ibuHamil, 1, "ibu hamil yang sudah pindah tidak ikut");
    assert.equal(s.balita, 1, "balita yang sudah pindah tidak ikut");
  });
});
