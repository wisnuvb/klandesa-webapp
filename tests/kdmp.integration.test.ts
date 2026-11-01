/** Tes integrasi dukungan KDMP terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("KDMP (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let kd: typeof import("../lib/kdmp/service");
  let vA = 0;
  let vB = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");
  const TODAY = "2026-11-01";

  const recv = (villageId: number, amount: string, o: Record<string, unknown> = {}) => kd.addDisbursement(prisma, { villageId, userId: 1, now: NOW, input: { year: 2026, receivedOn: "2026-10-01", amount, ...o } });
  const pay = (villageId: number, amount: string, o: Record<string, unknown> = {}) => kd.addInstallment(prisma, { villageId, userId: 1, now: NOW, input: { year: 2026, paidOn: "2026-10-15", amount, payee: "PT Pembangun", ...o } });
  const fac = async (villageId: number, o: Record<string, unknown> = {}) => {
    const r = await kd.createFacility(prisma, { villageId, userId: 1, input: { year: 2026, kind: "GERAI", name: "Gerai Desa", contract: "100000000", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const prog = (villageId: number, id: number, pct: number, on = "2026-10-10") => kd.addProgress(prisma, { villageId, id, userId: 1, now: NOW, input: { recordedOn: on, progressPct: pct } });
  const view = async (villageId: number, year = 2026) => {
    const r = await kd.getOverview(prisma, { villageId, year, today: TODAY });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    kd = await import("../lib/kdmp/service");
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("KA")).id;
    vB = (await mk("KB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("angsuran tidak boleh melebihi dana yang diterima; menghapus penyaluran tidak boleh membuat angsuran tak tertutup", async () => {
    assert.equal((await pay(vA, "1000000")).ok, false, "belum ada penyaluran");
    const d1 = await recv(vA, "10000000");
    assert.ok(d1.ok);
    assert.ok((await pay(vA, "6000000")).ok);
    const over = await pay(vA, "4000001");
    assert.ok(!over.ok && over.status === 409 && /melebihi dana KDMP/.test(over.errors[0]!));
    assert.ok((await pay(vA, "4000000")).ok, "tepat habis masih sah");
    const rem = await kd.removeDisbursement(prisma, { villageId: vA, id: d1.ok ? d1.data.id : 0 });
    assert.ok(!rem.ok && rem.status === 409, "dana tinggal 0 sementara angsuran 10 juta");
    const v = await view(vA);
    assert.equal(v.totals.received, "10000000.00");
    assert.equal(v.totals.paid, "10000000.00");
    assert.equal(v.totals.balance, "0.00");
  });

  it("dua angsuran serentak yang bersama-sama melebihi dana: tepat satu yang lolos (kunci desa-tahun)", async () => {
    const vid = (await prisma.village.create({ data: { code: `KC${Date.now() % 1e6}`, name: "KC", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
    try {
      assert.ok((await recv(vid, "10000000")).ok);
      const rs = await Promise.all([pay(vid, "6000000"), pay(vid, "6000000"), pay(vid, "6000000")]);
      assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => r.ok)));
      assert.equal((await view(vid)).totals.paid, "6000000.00");
    } finally {
      await prisma.village.delete({ where: { id: vid } });
    }
  });

  it("angsuran per gerai tidak melebihi nilai pekerjaan; nilai pekerjaan tidak boleh diturunkan di bawah angsuran", async () => {
    const id = await fac(vA, { year: 2026, name: "Gudang", kind: "GUDANG", contract: "30000000" });
    assert.ok((await recv(vA, "100000000", { receivedOn: "2026-10-02", reference: "KEP-2" })).ok);
    assert.ok((await pay(vA, "20000000", { facilityId: id })).ok);
    const over = await pay(vA, "10000001", { facilityId: id });
    assert.ok(!over.ok && over.status === 409 && /nilai pekerjaan/.test(over.errors[0]!));
    const low = await kd.patchFacility(prisma, { villageId: vA, id, input: { contract: "19999999" } });
    assert.ok(!low.ok && low.status === 409);
    assert.ok((await kd.patchFacility(prisma, { villageId: vA, id, input: { contract: "25000000" } })).ok);
    const clear = await kd.patchFacility(prisma, { villageId: vA, id, input: { contract: "" } });
    assert.ok(!clear.ok && clear.status === 409 && /dikosongkan/.test(clear.errors[0]!), "mengosongkan nilai pekerjaan tidak melonggarkan batas");
    const after = await kd.patchFacility(prisma, { villageId: vA, id, input: { contract: "26000000" } });
    assert.ok(after.ok && after.data.before.contract === "25000000.00" && after.data.after.contract === "26000000.00", "audit memuat nilai sebelum dan sesudah");
    const missing = await pay(vA, "1", { facilityId: 987654 });
    assert.ok(!missing.ok && missing.status === 404);
  });

  it("progres: tidak turun menurut urutan tanggal, tanggal di antara dihormati, hapus menghitung ulang, beroperasi butuh 100%", async () => {
    const id = await fac(vA, { name: "Gerai Progres" });
    assert.ok((await prog(vA, id, 20, "2026-09-01")).ok);
    assert.ok((await prog(vA, id, 60, "2026-10-01")).ok);
    const down = await prog(vA, id, 40, "2026-10-05");
    assert.ok(!down.ok && down.status === 409 && /lebih rendah/.test(down.errors[0]!));
    const mid = await prog(vA, id, 70, "2026-09-15");
    assert.ok(!mid.ok && /lebih tinggi/.test(mid.errors[0]!), "70% pada 15 Sep melebihi catatan 60% sesudahnya");
    assert.ok((await prog(vA, id, 40, "2026-09-15")).ok);
    assert.equal((await prog(vA, id, 101)).ok, false);
    let f = (await view(vA)).facilities.find((x) => x.id === id)!;
    assert.equal(f.progressPct, 60);
    assert.equal(f.status, "PEMBANGUNAN");
    const early = await kd.patchFacility(prisma, { villageId: vA, id, now: NOW, input: { operatingOn: "2026-10-30" } });
    assert.ok(!early.ok && early.status === 400, "belum 100%");
    assert.ok((await prog(vA, id, 100, "2026-10-20")).ok);
    assert.ok((await kd.patchFacility(prisma, { villageId: vA, id, now: NOW, input: { operatingOn: "2026-10-30" } })).ok);
    f = (await view(vA)).facilities.find((x) => x.id === id)!;
    assert.equal(f.status, "BEROPERASI");
    const hist = await kd.listProgress(prisma, { villageId: vA, id });
    assert.ok(hist.ok && hist.data.rows.length === 4 && hist.data.rows[0]!.progressPct === 100);
    const last = hist.ok ? hist.data.rows[0]!.id : 0;
    const blocked = await kd.removeProgress(prisma, { villageId: vA, id, progressId: last });
    assert.ok(!blocked.ok && blocked.status === 409, "sudah beroperasi");
    assert.ok((await kd.patchFacility(prisma, { villageId: vA, id, now: NOW, input: { operatingOn: null } })).ok);
    const removed = await kd.removeProgress(prisma, { villageId: vA, id, progressId: last });
    assert.ok(removed.ok && removed.data.progressPct === 60);
    f = (await view(vA)).facilities.find((x) => x.id === id)!;
    assert.equal(f.progressPct, 60);
  });

  it("detail untuk audit: pembuatan memuat penerima/nomor, progres mengembalikan id catatan, hapus gerai memuat nilai dan jumlah riwayat", async () => {
    const f = await kd.createFacility(prisma, { villageId: vA, userId: 1, input: { year: 2026, kind: "KELENGKAPAN", name: "Rak gudang", contract: "5000000" } });
    assert.ok(f.ok && f.data.name === "Rak gudang" && f.data.contract === "5000000.00" && f.data.kind === "KELENGKAPAN");
    const id = f.ok ? f.data.id : 0;
    const pr = await prog(vA, id, 15);
    assert.ok(pr.ok && pr.data.recordId > 0 && pr.data.recordedOn === "2026-10-10");
    const ins = await pay(vA, "1000", { reference: "PKS-9" });
    assert.ok(ins.ok && ins.data.payee === "PT Pembangun" && ins.data.reference === "PKS-9");
    const dis = await recv(vA, "1000", { reference: "KEP-9" });
    assert.ok(dis.ok && dis.data.reference === "KEP-9");
    const del = await kd.deleteFacility(prisma, { villageId: vA, id });
    assert.ok(del.ok && del.data.contract === "5000000.00" && del.data.progressRecords === 1);
  });

  it("pagar DB: baris yang melanggar CHECK ditolak MySQL meski melewati aplikasi", async () => {
    const f = await fac(vA, { name: "Uji CHECK", contract: "1000" });
    const bad = (fn: () => Promise<unknown>) => assert.rejects(fn, /check constraint|CHECK/i);
    await bad(() => prisma.kdmpDisbursement.create({ data: { villageId: vA, year: 2026, receivedOn: new Date("2026-10-01"), amountCents: 0n } }));
    await bad(() => prisma.kdmpInstallment.create({ data: { villageId: vA, year: 2026, paidOn: new Date("2026-10-01"), amountCents: -5n, payee: "x" } }));
    await bad(() => prisma.kdmpFacility.update({ where: { id: f }, data: { progressPct: 101 } }));
    await bad(() => prisma.kdmpFacility.update({ where: { id: f }, data: { contractCents: 0n } }));
    await bad(() => prisma.kdmpFacilityProgress.create({ data: { facilityId: f, villageId: vA, recordedOn: new Date("2026-10-01"), progressPct: -1 } }));
    assert.ok((await kd.deleteFacility(prisma, { villageId: vA, id: f })).ok);
  });

  it("tanggal di masa depan ditolak; gerai berangsuran tidak bisa dihapus", async () => {
    const r = await recv(vA, "1", { receivedOn: "2026-11-09" });
    assert.ok(!r.ok && r.status === 400);
    const p = await pay(vA, "1", { paidOn: "2026-11-09" });
    assert.ok(!p.ok && p.status === 400);
    const id = await fac(vA, { name: "Berangsur", contract: "50000000" });
    assert.ok((await pay(vA, "1000", { facilityId: id })).ok);
    const del = await kd.deleteFacility(prisma, { villageId: vA, id });
    assert.ok(!del.ok && del.status === 409);
  });

  it("pencocokan anggaran: dana KDMP di APB Desa dihitung dari kegiatan bertanda fokus KDMP bersumber DD", async () => {
    const year = 2031;
    const doc = await prisma.apbdesDocument.create({ data: { villageId: vB, year, version: 0, status: "DITETAPKAN" } as never });
    await prisma.apbdesLine.createMany({
      data: [
        { documentId: doc.id, villageId: vB, activityCode: "2.01.01", accountCode: "5.2.3.01", amountCents: 80_000_000_00n, fundSource: "DD", description: "Angsuran gerai" },
        { documentId: doc.id, villageId: vB, activityCode: "2.01.02", accountCode: "5.2.3.01", amountCents: 70_000_000_00n, fundSource: "DD", description: "Lain" },
        { documentId: doc.id, villageId: vB, activityCode: "2.01.01", accountCode: "5.2.3.01", amountCents: 9_000_000_00n, fundSource: "PAD", description: "Bukan DD" },
      ] as never,
    });
    await prisma.ddFocusTag.createMany({ data: [{ villageId: vB, year, activityCode: "2.01.01", focus: "KDMP" }, { villageId: vB, year, activityCode: "2.01.02", focus: "PANGAN_EKONOMI" }] });
    const v = await view(vB, year);
    assert.equal(v.totals.budgeted, "80000000.00", "hanya kegiatan KDMP bersumber DD");
    assert.equal(v.apbdes?.label, "APB Desa");
  });

  it("data antardesa terpisah: desa lain tidak bisa melihat, mengubah, atau menghapus", async () => {
    const id = await fac(vA, { name: "Milik A", contract: "1000000" });
    assert.ok(!(await kd.patchFacility(prisma, { villageId: vB, id, input: { name: "Curian" } })).ok);
    assert.ok(!(await kd.deleteFacility(prisma, { villageId: vB, id })).ok);
    assert.ok(!(await prog(vB, id, 10)).ok);
    assert.ok(!(await kd.listProgress(prisma, { villageId: vB, id })).ok);
    const p = await pay(vB, "1", { facilityId: id });
    assert.ok(!p.ok, "gerai desa lain tidak boleh dipakai");
    const disbA = await prisma.kdmpDisbursement.findFirst({ where: { villageId: vA } });
    assert.ok(!(await kd.removeDisbursement(prisma, { villageId: vB, id: disbA!.id })).ok);
    const instA = await prisma.kdmpInstallment.findFirst({ where: { villageId: vA } });
    assert.ok(!(await kd.removeInstallment(prisma, { villageId: vB, id: instA!.id })).ok);
    const names = (await view(vB, 2026)).facilities.map((f) => f.name);
    assert.ok(!names.includes("Milik A"));
  });

  it("menghapus angsuran mengurangi total terbayar; menghapus gerai tanpa angsuran ikut menghapus riwayatnya", async () => {
    const before = (await view(vA)).totals.paid;
    const inst = await prisma.kdmpInstallment.findFirst({ where: { villageId: vA, facilityId: null }, orderBy: { id: "asc" } });
    const r = await kd.removeInstallment(prisma, { villageId: vA, id: inst!.id });
    assert.ok(r.ok);
    assert.notEqual((await view(vA)).totals.paid, before);
    const id = await fac(vA, { name: "Sementara" });
    assert.ok((await prog(vA, id, 10)).ok);
    assert.ok((await kd.deleteFacility(prisma, { villageId: vA, id })).ok);
    assert.equal(await prisma.kdmpFacilityProgress.count({ where: { facilityId: id } }), 0);
  });
});
