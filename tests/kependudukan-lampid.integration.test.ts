/**
 * Tes integrasi laporan LAMPID terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke
 * database yang namanya mengandung "scratch"/"test" (cara menjalankan sama dengan family.integration.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("laporan LAMPID (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let load: typeof import("../lib/kependudukan/lampid-service").loadLampidReport;
  let tally: typeof import("../lib/kependudukan/lampid").tallyTotal;
  let a: { id: number };
  let b: { id: number };
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
  let seq = 0;

  const person = (villageId: number, o: Record<string, unknown> = {}) => {
    seq += 1;
    return prisma.resident.create({
      data: {
        villageId,
        nik: `35080701019${String(seq).padStart(5, "0")}`,
        name: `Warga ${seq}`,
        birthplace: "Lumajang",
        birthDate: d("1985-03-03"),
        gender: "Laki-laki",
        religion: "Islam",
        maritalStatus: "Menikah",
        familyRole: "Anak",
        address: "Jl. Mawar 1",
        hamlet: "Dusun A",
        rt: "01",
        rw: "01",
        ...o,
      },
    });
  };
  const mutation = (villageId: number, o: Record<string, unknown>) =>
    prisma.residentMutation.create({ data: { villageId, status: "APPLIED", source: "web", effectiveDate: d("2026-06-10"), type: "BIRTH", ...o } as never });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    ({ loadLampidReport: load } = await import("../lib/kependudukan/lampid-service"));
    ({ tallyTotal: tally } = await import("../lib/kependudukan/lampid"));
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a" } });
    a = await mk("LA");
    b = await mk("LB");

    // Penduduk aktif: R1, R2 (lama), R3 (bayi Juni, juga tercatat mutasi), R4 (datang Juni), R5 (bayi Juli), R10 (bayi Juni lewat mutasi)
    await person(a.id);
    await person(a.id, { gender: "Perempuan" });
    const r3 = await person(a.id, { birthDate: d("2026-06-10"), motherName: "Siti", familyRole: "Anak" });
    await person(a.id, { gender: "Perempuan", hamlet: "Dusun B", arrivalDate: d("2026-06-20"), originAddress: "Bogor" });
    await person(a.id, { birthDate: d("2026-07-05") });
    const r10 = await person(a.id, { birthDate: d("2026-06-03") });
    // Tidak aktif
    await person(a.id, { isAlive: false, deathDate: d("2026-06-05") }); // R6 meninggal Juni
    await person(a.id, { gender: "Perempuan", hamlet: "Dusun B", nationality: "Jepang", moveDate: d("2026-06-15") }); // R7 pindah Juni
    await person(a.id, { isAlive: false, deathDate: d("2026-07-02") }); // R8 meninggal Juli
    await person(a.id, { isAlive: false }); // R9 meninggal tanpa tanggal

    await mutation(a.id, { type: "BIRTH", effectiveDate: d("2026-06-10"), residentId: r3.id }); // dobel dengan kolom R3
    await mutation(a.id, { type: "BIRTH", effectiveDate: d("2026-06-03"), residentId: r10.id });
    await mutation(a.id, { type: "MOVE_OUT", effectiveDate: d("2026-06-12"), residentId: null, residentName: "Sudah Dihapus", residentNikLast4: "9999", details: { destination: "Medan" } });
    await mutation(a.id, { type: "DEATH", status: "PENDING", effectiveDate: d("2026-06-14"), residentId: r3.id }); // belum diputuskan: diabaikan
    await mutation(a.id, { type: "KK_CHANGE", effectiveDate: d("2026-06-14"), residentId: r3.id }); // tidak memengaruhi jumlah

    // Desa lain: tidak boleh bocor
    await person(b.id, { isAlive: false, deathDate: d("2026-06-08") });
    await person(b.id);
  });

  after(async () => {
    for (const v of [a, b]) if (v) await prisma.village.delete({ where: { id: v.id } });
    await prisma.$disconnect();
  });

  it("Juni: kejadian dari mutasi dan kolom tergabung tanpa hitung ganda; awal/akhir cocok", async () => {
    const r = await load(a.id, "2026-06", "dusun");
    assert.deepEqual([r.totals.lahir, r.totals.mati, r.totals.pindah, r.totals.datang].map(tally), [2, 1, 2, 1]);
    // Stok sekarang 6; sesudah Juni +1 lahir (R5) −1 mati (R8) → akhir Juni 6; net Juni 0 → awal 6.
    assert.equal(tally(r.totals.akhir), 6);
    assert.equal(tally(r.totals.awal), 6);
    assert.deepEqual(r.sources, { mutasi: 3, data: 3 });
    assert.equal(r.totals.lahir.wniL, 2);
    assert.equal(r.totals.pindah.wnaP, 1); // R7 warga negara asing perempuan
  });

  it("daftar nama memuat keterangan dan hanya 4 digit akhir NIK", async () => {
    const r = await load(a.id, "2026-06", "dusun");
    const lahir = r.list.LAHIR.find((i) => i.date === "2026-06-10");
    assert.equal(lahir?.nikLast4.length, 4);
    assert.equal(r.list.DATANG[0].note, "Bogor");
    const medan = r.list.PINDAH.find((i) => i.note === "Medan");
    assert.equal(medan?.name, "Sudah Dihapus");
    assert.equal(medan?.region, "(Belum diisi)");
    assert.ok(!JSON.stringify(r).match(/\d{16}/), "NIK penuh tidak boleh ada di laporan");
  });

  it("per dusun: Dusun B menampung warga yang datang dan yang pindah", async () => {
    const r = await load(a.id, "2026-06", "dusun");
    const b2 = r.lines.find((l) => l.region === "Dusun B");
    assert.ok(b2);
    assert.deepEqual([b2.lahir, b2.mati, b2.pindah, b2.datang], [0, 0, 1, 1]);
    assert.equal(b2.awal + b2.lahir - b2.mati - b2.pindah + b2.datang, b2.akhir);
    for (const l of r.lines) assert.equal(l.awal + l.lahir - l.mati - l.pindah + l.datang, l.akhir, l.region);
  });

  it("peringatan: tanggal meninggal kosong dan sumber dari data warga", async () => {
    const r = await load(a.id, "2026-06", "rtrw");
    assert.ok(r.warnings.some((w) => w.includes("1 warga berstatus meninggal")));
    assert.ok(r.warnings.some((w) => w.includes("3 dari 6 kejadian")));
    assert.ok(r.lines.some((l) => l.region === "RW 01 / RT 01"));
  });

  it("Juli: bayi Juli dan kematian Juli; awal Juli sama dengan akhir Juni", async () => {
    const jun = await load(a.id, "2026-06", "dusun");
    const jul = await load(a.id, "2026-07", "dusun");
    assert.deepEqual([jul.totals.lahir, jul.totals.mati].map(tally), [1, 1]);
    assert.equal(tally(jul.totals.awal), tally(jun.totals.akhir));
  });

  it("desa lain terisolasi", async () => {
    const r = await load(b.id, "2026-06", "dusun");
    assert.deepEqual([r.totals.lahir, r.totals.mati, r.totals.pindah, r.totals.datang].map(tally), [0, 1, 0, 0]);
    assert.equal(tally(r.totals.akhir), 1);
  });
});
