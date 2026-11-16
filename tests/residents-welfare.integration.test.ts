/** Tes integrasi kesejahteraan & hunian warga terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("kesejahteraan & hunian warga (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let extra: typeof import("../lib/residents/extra-fields");
  let welfare: typeof import("../lib/residents/welfare-fields");
  let vA = 0;
  let vB = 0;
  let seq = 0;

  const mk = (villageId: number, over: Record<string, unknown> = {}) =>
    prisma.resident.create({
      data: {
        villageId, nik: `${String(1e15 + ++seq + (Date.now() % 1e6) * 1e4).slice(0, 16)}`, name: `Warga ${seq}`, birthplace: "x", birthDate: new Date(1990, 0, 1),
        gender: "Perempuan", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Istri", rt: "01", rw: "01", ...over,
      } as never,
    });

  /** Jalur yang sama dengan PATCH /api/residents/[id]: parse → reconcile terhadap data tersimpan → update. */
  async function patch(id: number, body: unknown) {
    const parsed = extra.parseExtraFields(body);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    const existing = await prisma.resident.findFirstOrThrow({ where: { id } });
    const checked = welfare.reconcileWelfare(parsed.data, existing);
    if (!checked.ok) return { ok: false as const, error: checked.error };
    const row = await prisma.resident.update({ where: { id }, data: { ...parsed.data } as never });
    return { ok: true as const, row };
  }

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    extra = await import("../lib/residents/extra-fields");
    welfare = await import("../lib/residents/welfare-fields");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("WA")).id;
    vB = (await mkV("WB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("warga yang sudah ada (tanpa data baru) tetap utuh: jenis kosong, bantuan false", async () => {
    const r = await mk(vA);
    assert.deepEqual(
      [r.bpjsType, r.electricityType, r.electricityPowerVa, r.aidPkh, r.aidBpnt, r.aidOther, r.houseOwnership],
      [null, null, null, false, false, null, null],
    );
  });

  it("lengkapi lalu baca ulang: BPJS Mandiri, rumah, listrik meteran + daya, PKH + lain-lain", async () => {
    const r = await mk(vA);
    const res = await patch(r.id, { bpjsType: "MANDIRI", houseOwnership: "Milik Sendiri", electricityType: "METERAN", electricityPowerVa: 900, aidPkh: true, aidOther: "BLT Dana Desa" });
    assert.ok(res.ok);
    const back = await prisma.resident.findFirstOrThrow({ where: { id: r.id } });
    assert.deepEqual(
      [back.isBpjsKis, back.bpjsType, back.houseOwnership, back.electricityType, back.electricityPowerVa, back.aidPkh, back.aidBpnt, back.aidOther],
      [true, "MANDIRI", "Milik Sendiri", "METERAN", 900, true, false, "BLT Dana Desa"],
    );
  });

  it("bisa diubah dan DIKOSONGKAN: ganti jenis BPJS, cabut BPJS, ganti listrik, cabut bantuan", async () => {
    const r = await mk(vA);
    await patch(r.id, { bpjsType: "BANTUAN_PEMERINTAH", electricityType: "METERAN", electricityPowerVa: 450, aidPkh: true, aidBpnt: true, aidOther: "BLT" });
    let row = (await patch(r.id, { bpjsType: "MANDIRI" }) as { row: typeof r }).row;
    assert.deepEqual([row.isBpjsKis, row.bpjsType], [true, "MANDIRI"]);

    row = (await patch(r.id, { isBpjsKis: false }) as { row: typeof r }).row;
    assert.deepEqual([row.isBpjsKis, row.bpjsType], [false, null], "mencabut BPJS membersihkan jenisnya");

    row = (await patch(r.id, { electricityType: "PASANG_SENDIRI" }) as { row: typeof r }).row;
    assert.deepEqual([row.electricityType, row.electricityPowerVa], ["PASANG_SENDIRI", null], "bukan meteran = daya dibersihkan");

    row = (await patch(r.id, { aidPkh: false, aidBpnt: false, aidOther: null }) as { row: typeof r }).row;
    assert.deepEqual([row.aidPkh, row.aidBpnt, row.aidOther], [false, false, null]);

    row = (await patch(r.id, { houseOwnership: null }) as { row: typeof r }).row;
    assert.equal(row.houseOwnership, null);
  });

  it("kombinasi tak sah ditolak dan data tersimpan tidak berubah", async () => {
    const r = await mk(vA);
    await patch(r.id, { electricityType: "NON_METERAN", houseOwnership: "Sewa" });
    const bad1 = await patch(r.id, { electricityPowerVa: 900 });
    assert.ok(!bad1.ok && /Meteran/.test(bad1.error));
    const bad2 = await patch(r.id, { isBpjsKis: false, bpjsType: "MANDIRI" });
    assert.ok(!bad2.ok);
    const bad3 = await patch(r.id, { houseOwnership: "istana" });
    assert.ok(!bad3.ok);
    const row = await prisma.resident.findFirstOrThrow({ where: { id: r.id } });
    assert.deepEqual([row.electricityType, row.electricityPowerVa, row.houseOwnership, row.isBpjsKis], ["NON_METERAN", null, "Sewa", false]);
    // Daya boleh diubah bila yang tersimpan sudah METERAN.
    await patch(r.id, { electricityType: "METERAN", electricityPowerVa: 450 });
    const ok = await patch(r.id, { electricityPowerVa: 1300 });
    assert.ok(ok.ok && ok.row.electricityPowerVa === 1300);
  });

  it("tidak bocor lintas desa: perubahan satu warga tidak menyentuh warga desa lain", async () => {
    const a = await mk(vA);
    const b = await mk(vB);
    await patch(a.id, { aidPkh: true, bpjsType: "MANDIRI" });
    const other = await prisma.resident.findFirstOrThrow({ where: { id: b.id } });
    assert.deepEqual([other.aidPkh, other.bpjsType, other.isBpjsKis], [false, null, false]);
  });

  it("penyaringan: bantuan dan jenis BPJS dapat dihitung langsung di database", async () => {
    const before_ = await prisma.resident.count({ where: { villageId: vA, aidPkh: true } });
    const r = await mk(vA);
    await patch(r.id, { aidPkh: true });
    assert.equal(await prisma.resident.count({ where: { villageId: vA, aidPkh: true } }), before_ + 1);
    assert.ok((await prisma.resident.count({ where: { villageId: vA, bpjsType: "MANDIRI" } })) >= 1);
  });
});
