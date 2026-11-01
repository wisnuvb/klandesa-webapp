/** Tes integrasi Dana Desa (Paket 2) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Dana Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let dd: typeof import("../lib/dana-desa/service");
  let vA = 0;
  let vB = 0;

  const doc = async (villageId: number, version: number, status: string, lines: { code?: string; account: string; cents: bigint; fund?: string | null; desc?: string }[]) => {
    const d = await prisma.apbdesDocument.create({ data: { villageId, year: 2026, version, status, regulationDate: status === "DITETAPKAN" ? new Date("2025-12-20") : null } });
    await prisma.apbdesLine.createMany({ data: lines.map((l) => ({ documentId: d.id, villageId, activityCode: l.code ?? null, accountCode: l.account, description: l.desc ?? "uji", amountCents: l.cents, fundSource: l.fund === undefined ? "DD" : l.fund })) });
    return d.id;
  };
  const view = async (villageId: number, apbdesId?: number) => {
    const r = await dd.getOverview(prisma, { villageId, year: 2026, apbdesId, today: "2026-11-01" });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    dd = await import("../lib/dana-desa/service");
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("DA")).id;
    vB = (await mk("DB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("ringkasan: hanya baris Dana Desa; sebaran fokus, batas operasional, dan indikasi larangan terhitung", async () => {
    await doc(vA, 0, "DITETAPKAN", [
      { code: "2.3.01", account: "5.2.1.07", cents: 90_000_000n },
      { code: "1.2.03", account: "5.2.5.01", cents: 4_000_000n },
      { code: "1.1.01", account: "5.1.1.01", cents: 1_000_000n, desc: "Penghasilan tetap kepala desa" },
      { code: "3.1.02", account: "5.2.1.07", cents: 999_999_999n, fund: "ADD" },
      { account: "4.2.1.01", cents: 999_999_999n, fund: null },
    ]);
    assert.ok((await dd.saveYearSetting(prisma, { villageId: vA, year: 2026, input: { regular: "1000000", kdmp: "0" } })).ok);
    assert.ok((await dd.setFocusTag(prisma, { villageId: vA, year: 2026, input: { activityCode: "2.3.01", focus: "PADAT_KARYA" } })).ok);
    assert.ok((await dd.setFocusTag(prisma, { villageId: vA, year: 2026, input: { activityCode: "1.2.03", focus: "OPERASIONAL" } })).ok);

    const o = await view(vA);
    assert.equal(o.apbdes?.label, "APB Desa");
    assert.equal(o.analysis.spend, "950000.00", "ADD dan pendapatan tidak ikut: 900.000 + 40.000 + 10.000");
    assert.equal(o.analysis.operational, "40000.00");
    assert.equal(o.analysis.operationalCap, "30000.00", "3% dari pagu reguler Rp1.000.000");
    const codes = o.analysis.findings.map((f) => f.code);
    assert.ok(codes.includes("OPS_OVER"));
    assert.ok(codes.includes("UNTAGGED"), "1.1.01 belum ditandai");
    assert.ok(codes.includes("PROHIBITED_CODE"), "penghasilan tetap kades dari Dana Desa");
    assert.ok(codes.includes("NOT_PUBLISHED"), "APB Desa ditetapkan tanpa bukti publikasi");
    assert.equal(o.analysis.byFocus.find((f) => f.focus === "PADAT_KARYA")!.budget, "900000.00");
    assert.equal(o.activities.find((a) => a.activityCode === "1.1.01")!.suggestion, "OPERASIONAL");
    assert.equal(o.rules.exact, true);
    assert.equal(o.stages?.[0]?.amount, "400000.00");
  });

  it("pengecualian hanya untuk baris Dana Desa yang nyata, menggugurkan peringatan, dan dapat dicabut", async () => {
    const bad = await dd.addException(prisma, { villageId: vA, year: 2026, userId: 1, input: { ruleKey: "L1", activityCode: "1.1.01", accountCode: "5.1.2.01", reason: "Alasan yang cukup panjang untuk uji" } });
    assert.equal(bad.ok, false, "rekening itu tidak ada pada APB Desa");
    const okc = await dd.addException(prisma, { villageId: vA, year: 2026, userId: 1, input: { ruleKey: "L1", activityCode: "1.1.01", accountCode: "5.1.1.01", reason: "Disetujui kabupaten sesuai surat resmi" } });
    assert.ok(okc.ok, JSON.stringify(okc));
    let o = await view(vA);
    assert.equal(o.analysis.findings.some((f) => f.code === "PROHIBITED_CODE"), false);
    assert.equal(o.analysis.prohibitions[0]!.exceptionReason, "Disetujui kabupaten sesuai surat resmi");
    // tidak menimpa alasan yang sudah ada, dan tidak untuk baris yang tidak terindikasi
    const dup = await dd.addException(prisma, { villageId: vA, year: 2026, userId: 2, input: { ruleKey: "L1", activityCode: "1.1.01", accountCode: "5.1.1.01", reason: "Alasan pengganti yang cukup panjang" } });
    assert.equal(dup.ok, false, "alasan lama tidak boleh ditimpa diam-diam");
    const clean = await dd.addException(prisma, { villageId: vA, year: 2026, userId: 1, input: { ruleKey: "L2", activityCode: "2.3.01", accountCode: "5.2.1.07", reason: "Alasan yang cukup panjang untuk uji" } });
    assert.equal(clean.ok, false, "baris biasa tidak terindikasi L2, jadi pengecualian ditolak");
    // desa lain tidak dapat mencabutnya
    assert.equal((await dd.removeException(prisma, { villageId: vB, id: okc.ok ? okc.data.id : 0 })).ok, false);
    assert.ok((await dd.removeException(prisma, { villageId: vA, id: okc.ok ? okc.data.id : 0 })).ok);
    o = await view(vA);
    assert.ok(o.analysis.findings.some((f) => f.code === "PROHIBITED_CODE"));
  });

  it("publikasi: bukti menghapus peringatan; daftar publik memuat nama, lokasi, besaran; antar-desa tertutup", async () => {
    const add = await dd.addPublication(prisma, { villageId: vA, year: 2026, userId: 1, input: { channel: "BALIHO", publishedOn: "2026-01-15", location: "Depan balai desa" } });
    assert.ok(add.ok);
    assert.equal((await dd.addPublication(prisma, { villageId: vA, year: 2026, userId: 1, input: { channel: "TV", publishedOn: "2026-01-15" } })).ok, false);
    const o = await view(vA);
    assert.equal(o.analysis.findings.some((f) => f.code === "NOT_PUBLISHED"), false);
    assert.equal(o.publications[0]!.channelLabel, "Baliho");

    await prisma.apbdesActivityPlan.create({ data: { villageId: vA, year: 2026, activityCode: "2.3.01", location: "Dusun Krajan" } });
    const pl = await dd.publicList(prisma, { villageId: vA, year: 2026 });
    assert.ok(pl.ok);
    if (pl.ok) {
      assert.equal(pl.data.items.length, 3);
      assert.deepEqual(pl.data.items.find((i) => i.activityCode === "2.3.01"), { activityCode: "2.3.01", name: pl.data.items.find((i) => i.activityCode === "2.3.01")!.name, location: "Dusun Krajan", amount: "900000.00" });
      assert.equal(pl.data.total, "950000.00");
    }
    assert.equal((await dd.removePublication(prisma, { villageId: vB, id: add.ok ? add.data.id : 0 })).ok, false);
    assert.equal((await view(vB)).publications.length, 0);
    assert.equal((await dd.getOverview(prisma, { villageId: vB, year: 2026, apbdesId: 1, today: "2026-11-01" })).ok, false, "dokumen APB Desa lain tidak bisa dipilih");
  });

  it("KDMP: perubahan APB Desa dipilih sebagai pembanding; anggaran KDMP dibandingkan dengan pagunya", async () => {
    const amend = await doc(vA, 1, "DRAFT", [
      { code: "2.3.01", account: "5.2.1.07", cents: 90_000_000n },
      { code: "4.1.01", account: "5.3.1.01", cents: 60_000_000n, desc: "Angsuran gerai KDMP" },
    ]);
    assert.ok((await dd.saveYearSetting(prisma, { villageId: vA, year: 2026, input: { regular: "1000000", kdmp: "500000" } })).ok);
    assert.ok((await dd.setFocusTag(prisma, { villageId: vA, year: 2026, input: { activityCode: "4.1.01", focus: "KDMP" } })).ok);
    const o = await view(vA, amend);
    assert.equal(o.apbdes?.label, "Perubahan APB Desa ke-1");
    assert.equal(o.apbdesOptions[0]!.id, amend, "terbaru di atas");
    assert.equal(o.analysis.kdmpBudget, "600000.00");
    assert.ok(o.analysis.findings.some((f) => f.code === "OVER_KDMP"));
    assert.equal(o.analysis.findings.some((f) => f.code === "KDMP_IN_BASE"), false);
  });

  it("pengaturan: simpan sebagian tidak menghapus kolom lain; tahun/isian ngawur ditolak", async () => {
    assert.ok((await dd.saveYearSetting(prisma, { villageId: vA, year: 2026, input: { isMandiri: true, focusReportedOn: "2026-10-30" } })).ok);
    const o = await view(vA);
    assert.equal(o.setting.regular, "1000000.00", "pagu yang sudah ada tetap");
    assert.equal(o.setting.isMandiri, true);
    assert.equal(o.stages?.[0]?.pct, 60, "Desa mandiri 60/40");
    assert.equal(o.checklist.find((c) => c.key === "laporan-fokus")!.doneOn, "2026-10-30");
    assert.equal((await dd.saveYearSetting(prisma, { villageId: vA, year: 1999, input: {} })).ok, false);
    assert.equal((await dd.saveYearSetting(prisma, { villageId: vA, year: 2026, input: { regular: "-5" } })).ok, false);
    assert.equal(await prisma.ddYearSetting.count({ where: { villageId: vB } }), 0, "desa lain tidak tersentuh");
  });
});
