/** Cache agregat dasbor wilayah (5 menit): hasil dipakai ulang untuk lingkup+desa yang sama, terpisah antar lingkup. Butuh KEP_TEST_DATABASE_URL (scratch). */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Cache agregat wilayah (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let agg: typeof import("../lib/regional-aggregate");
  const t = Date.now() % 1e6;
  const scope = (regency: string) => ({ level: "REGENCY" as const, regency });
  let vA = 0;
  let vB = 0;
  let seq = 0;
  const mkResident = (villageId: number) => {
    seq += 1;
    return prisma.resident.create({
      data: {
        villageId, nik: `${String(t).padStart(6, "0")}${String(villageId).padStart(4, "0")}${String(seq).padStart(6, "0")}`, name: `W${seq}`,
        birthplace: "x", birthDate: new Date("1990-01-01"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga",
      },
    });
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    agg = await import("../lib/regional-aggregate");
    vA = (await prisma.village.create({ data: { code: `RCA${t}`, name: "A", district: "k", regency: `Kab A ${t}`, province: "p", address: "a" } })).id;
    vB = (await prisma.village.create({ data: { code: `RCB${t}`, name: "B", district: "k", regency: `Kab B ${t}`, province: "p", address: "a" } })).id;
    await mkResident(vA);
    await mkResident(vA);
    await mkResident(vB);
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it("panggilan kedua (lingkup + desa sama) memakai cache; setelah dikosongkan membaca data terbaru", async () => {
    agg.clearRegionalAggregateCache();
    const s = scope(`Kab A ${t}`);
    const first = await agg.aggregateRegionalDemographics(s, [vA]);
    assert.equal(first.totalResidents, 2);
    await mkResident(vA);
    const second = await agg.aggregateRegionalDemographics(s, [vA]);
    assert.equal(second.totalResidents, 2, "masih dari cache dalam TTL");
    assert.equal(second, first, "objek yang sama");
    agg.clearRegionalAggregateCache();
    assert.equal((await agg.aggregateRegionalDemographics(s, [vA])).totalResidents, 3);
  });

  it("kunci memuat lingkup dan daftar desa: tidak tercampur antar lingkup, urutan id tidak memengaruhi", async () => {
    agg.clearRegionalAggregateCache();
    const a = await agg.aggregateRegionalDemographics(scope(`Kab A ${t}`), [vA]);
    const b = await agg.aggregateRegionalDemographics(scope(`Kab B ${t}`), [vB]);
    assert.equal(a.totalResidents, 3);
    assert.equal(b.totalResidents, 1);
    const both1 = await agg.aggregateRegionalDemographics(scope("X"), [vA, vB]);
    const both2 = await agg.aggregateRegionalDemographics(scope("X"), [vB, vA]);
    assert.equal(both1.totalResidents, 4);
    assert.equal(both2, both1, "urutan id desa tidak menggandakan entri cache");
  });

  it("desa kosong tetap memberi hasil kosong yang benar", async () => {
    const empty = await agg.aggregateRegionalDemographics(scope("Kosong"), []);
    assert.equal(empty.villagesIncluded, 0);
    assert.equal(empty.totalResidents, 0);
  });
});
