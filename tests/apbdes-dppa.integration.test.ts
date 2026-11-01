/** Tes integrasi DPPA (DPA perubahan, berversi) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("DPPA berversi (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/apbdes/service");
  let dpa: typeof import("../lib/apbdes/dpa");
  let spp: typeof import("../lib/apbdes/spp");
  const created: number[] = [];
  const NOW = new Date("2026-11-15T03:00:00Z");
  const ACT = "1.1.04";

  /** APB Desa 2026 ditetapkan: DD 1.000.000; kegiatan 1.1.04 ATK 400.000 (5.2.1.01) + material 200.000 (5.2.1.07). */
  async function setup(tag: string) {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `${tag}${t}${Math.random().toString(36).slice(2, 5)}`, name: tag, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    created.push(v.id);
    const d = await svc.createDocument(prisma, { villageId: v.id, year: 2026, userId: 1 });
    assert.ok(d.ok);
    for (const [accountCode, amount, activityCode] of [["4.2.1.01", 1_000_000, undefined], ["5.2.1.01", 400_000, ACT], ["5.2.1.07", 200_000, ACT]] as const) {
      assert.ok((await svc.addLine(prisma, { villageId: v.id, documentId: d.ok ? d.data.id : 0, input: { accountCode, amount, activityCode } })).ok);
    }
    assert.ok((await svc.adoptDocument(prisma, { villageId: v.id, documentId: d.ok ? d.data.id : 0, regulationNumber: "Perdes 1/2026", regulationDate: "2025-12-20", now: NOW })).ok);
    return v.id;
  }
  const months = (m: Record<number, number>) => Array.from({ length: 12 }, (_, i) => m[i + 1] ?? 0);
  const rak = (villageId: number, accountCode: string, m: Record<number, number>, activityCode = ACT) => dpa.saveCashPlan(prisma, { villageId, year: 2026, input: { activityCode, accountCode, months: months(m) } });
  const step = (villageId: number, action: "verify" | "approve" | "reopen", activityCode = ACT) => dpa.advancePlan(prisma, { villageId, year: 2026, activityCode, action, userId: 7, now: NOW });
  async function approvedDpa(villageId: number) {
    assert.ok((await dpa.savePlan(prisma, { villageId, year: 2026, activityCode: ACT, input: { executorName: "Kasi Pelayanan" } })).ok);
    assert.ok((await rak(villageId, "5.2.1.01", { 1: 100_000, 11: 300_000 })).ok);
    assert.ok((await rak(villageId, "5.2.1.07", { 11: 200_000 })).ok);
    assert.ok((await step(villageId, "verify")).ok);
    assert.ok((await step(villageId, "approve")).ok);
  }
  /** SPP 550.000 (350.000 ATK + 200.000 material) dibayar penuh: realisasi 550.000. */
  async function spentSpp(villageId: number) {
    assert.ok((await svc.addEntry(prisma, { villageId, userId: 1, now: NOW, input: { voucherNo: "T-1", description: "dana", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-01-05", amount: 1_000_000, accountCode: "4.2.1.01" } })).ok);
    const r = await spp.createRequest(prisma, { villageId, userId: 1, year: 2026, now: NOW, input: { activityCode: ACT, mode: "SWAKELOLA", executorName: "Kasi Pelayanan", lines: [{ accountCode: "5.2.1.01", amount: 350_000 }, { accountCode: "5.2.1.07", amount: 200_000 }] } });
    assert.ok(r.ok);
    const id = r.ok ? r.data.id : 0;
    for (const action of ["verify", "approve"] as const) assert.ok((await spp.actOnRequest(prisma, { villageId, userId: 1, requestId: id, action, now: NOW })).ok);
    assert.ok((await spp.actOnRequest(prisma, { villageId, userId: 1, requestId: id, action: "pay", input: { paidAt: "2026-11-02", channel: "BANK" }, now: NOW })).ok);
  }
  /** Membuat Perubahan APB Desa dari versi terakhir, mengubah baris 5.2.1.01 kegiatan ACT ke `atk`, lalu menetapkannya. */
  async function amend(villageId: number, atk: number, o: { reason?: string; extra?: { accountCode: string; amount: number; activityCode: string } } = {}) {
    const a = await svc.createAmendment(prisma, { villageId, year: 2026, userId: 1, exceptionalReason: o.reason });
    assert.ok(a.ok, a.ok ? "" : a.errors.join(" "));
    const documentId = a.ok ? a.data.id : 0;
    const line = await prisma.apbdesLine.findFirstOrThrow({ where: { documentId, accountCode: "5.2.1.01", activityCode: ACT } });
    assert.ok((await svc.updateLine(prisma, { villageId, documentId, lineId: line.id, input: { accountCode: "5.2.1.01", amount: atk, activityCode: ACT } })).ok);
    if (o.extra) assert.ok((await svc.addLine(prisma, { villageId, documentId, input: o.extra })).ok);
    const adopted = await svc.adoptDocument(prisma, { villageId, documentId, regulationNumber: `Perdes P${a.ok ? a.data.version : 0}/2026`, regulationDate: "2026-10-01", now: NOW });
    assert.ok(adopted.ok);
    return { documentId, version: a.ok ? a.data.version : 0 };
  }
  const view = async (villageId: number, code = ACT) => (await dpa.planOverview(prisma, villageId, 2026, { detail: true })).activities.find((x) => x.activityCode === code)!;

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/apbdes/service");
    dpa = await import("../lib/apbdes/dpa");
    spp = await import("../lib/apbdes/spp");
  });
  after(async () => {
    for (const id of created) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("persetujuan DPA menyimpan riwayat beku; membuka kembali tanpa perubahan anggaran tidak menaikkan revisi dan tetap terkunci bila sudah ada SPP", async () => {
    const v = await setup("DP1");
    await approvedDpa(v);
    let a = await view(v);
    assert.equal(a.label, "DPA");
    assert.equal(a.history.length, 1);
    assert.deepEqual([a.history[0]!.revision, a.history[0]!.baseLabel, a.history[0]!.budget], [0, "APB Desa", "600000.00"]);
    const snap = await prisma.apbdesActivityPlanVersion.findFirstOrThrow({ where: { villageId: v } });
    assert.equal(snap.approvedById, 7);
    // buka kembali + setujui lagi (tanpa SPP) menimpa riwayat revisi yang sama, bukan menambah
    assert.ok((await step(v, "reopen")).ok);
    a = await view(v);
    assert.equal(a.revision, 0);
    assert.ok((await step(v, "verify")).ok && (await step(v, "approve")).ok);
    assert.equal(await prisma.apbdesActivityPlanVersion.count({ where: { villageId: v } }), 1);
    await spentSpp(v);
    const blocked = await step(v, "reopen");
    assert.equal(blocked.ok, false, "sudah ada SPP dan anggaran belum berubah");
    assert.match(blocked.ok ? "" : blocked.errors.join(" "), /DPPA/);
  });

  it("Perubahan APB Desa: peringatan DPPA dan di bawah realisasi; SPP baru diarahkan ke DPPA; buka kembali sebagai DPPA tetap menjaga SPP", async () => {
    const v = await setup("DP2");
    await approvedDpa(v);
    await spentSpp(v);
    const { documentId } = await amend(v, 500_000);
    const warn = await dpa.amendmentWarnings(prisma, v, documentId);
    assert.equal(warn.length, 1);
    assert.match(warn[0]!, /1 kegiatan.*1\.1\.04.*DPPA/s);
    let a = await view(v);
    assert.equal(a.needsRevision, true);
    assert.equal(a.accounts.find((x) => x.accountCode === "5.2.1.01")!.previousBudget, "400000.00");
    // SPP baru melebihi RAK lama: ditolak dengan petunjuk DPPA; yang masih dalam RAK lama tetap boleh
    const over = await spp.createRequest(prisma, { villageId: v, userId: 1, year: 2026, now: NOW, input: { activityCode: ACT, mode: "SWAKELOLA", executorName: "Kasi Pelayanan", lines: [{ accountCode: "5.2.1.01", amount: 60_000 }] } });
    assert.equal(over.ok, false);
    assert.match(over.ok ? "" : over.errors.join(" "), /susun DPPA/);
    // dibuka sebagai DPPA walau sudah ada SPP; SPP lama utuh
    const sppBefore = await prisma.apbdesPayRequest.count({ where: { villageId: v } });
    const re = await step(v, "reopen");
    assert.ok(re.ok && re.data.revision === 1 && re.data.status === "DRAFT");
    assert.equal(await prisma.apbdesPayRequest.count({ where: { villageId: v } }), sppBefore);
    a = await view(v);
    assert.deepEqual([a.label, a.revising, a.hasSpp], ["DPPA ke-1", true, true]);
    // selama DPPA disusun, SPP baru ditolak (DPA belum disetujui)
    const during = await spp.createRequest(prisma, { villageId: v, userId: 1, year: 2026, now: NOW, input: { activityCode: ACT, mode: "SWAKELOLA", executorName: "Kasi Pelayanan", lines: [{ accountCode: "5.2.1.01", amount: 1_000 }] } });
    assert.equal(during.ok, false);
    // RAK belum sama dengan anggaran baru: verifikasi ditolak
    assert.equal((await step(v, "verify")).ok, false);
    // total sama dengan anggaran (500.000) tetapi sampai November hanya 200.000 < 350.000 terpakai: ditolak
    assert.ok((await rak(v, "5.2.1.01", { 11: 200_000, 12: 300_000 })).ok);
    const short = await step(v, "verify");
    assert.equal(short.ok, false);
    assert.match(short.ok ? "" : short.errors.join(" "), /5\.2\.1\.01.*sudah terpakai Rp350000\.00/);
    assert.ok((await rak(v, "5.2.1.01", { 1: 100_000, 11: 350_000, 12: 50_000 })).ok);
    assert.ok((await dpa.addCostItem(prisma, { villageId: v, year: 2026, input: { activityCode: ACT, accountCode: "5.2.1.01", description: "Kertas HVS", volume: 10, unit: "rim", unitPrice: 50_000 } })).ok);
    assert.ok((await step(v, "verify")).ok);
    const ok = await step(v, "approve");
    assert.ok(ok.ok && ok.data.revision === 1);
    a = await view(v);
    assert.deepEqual([a.label, a.status, a.history.map((h) => [h.revision, h.baseLabel, h.budget])], ["DPPA ke-1", "DISETUJUI", [[0, "APB Desa", "600000.00"], [1, "Perubahan APB Desa ke-1", "700000.00"]]]);
    const frozen = await prisma.apbdesActivityPlanVersion.findFirstOrThrow({ where: { villageId: v, revision: 1 } });
    assert.equal((frozen.rab as { description: string }[]).length, 1, "RAB ikut dibekukan");
    assert.equal((frozen.rab as { description: string }[])[0]!.description, "Kertas HVS");
    assert.equal((frozen.work as { startMonth: number | null }).startMonth, null);
    assert.equal((await prisma.apbdesActivityPlanVersion.findFirstOrThrow({ where: { villageId: v, revision: 0 } })).rab instanceof Array, true);
    // SPP baru dalam RAK baru diterima
    const good = await spp.createRequest(prisma, { villageId: v, userId: 1, year: 2026, now: NOW, input: { activityCode: ACT, mode: "SWAKELOLA", executorName: "Kasi Pelayanan", lines: [{ accountCode: "5.2.1.01", amount: 100_000 }] } });
    assert.ok(good.ok, good.ok ? "" : good.errors.join(" "));
    // sudah sesuai: tidak bisa membuka lagi sebagai DPPA (anggaran tak berubah sejak DPPA)
    assert.equal((await step(v, "reopen")).ok, false);
  });

  it("Perubahan yang tidak menyentuh kegiatan ini tidak membuka jalan DPPA; anggaran di bawah realisasi diperingatkan", async () => {
    const v = await setup("DP3");
    await approvedDpa(v);
    await spentSpp(v);
    // hanya menambah kegiatan lain; 1.1.04 tidak berubah
    const { documentId } = await amend(v, 400_000, { extra: { accountCode: "5.2.1.01", amount: 50_000, activityCode: "1.1.01" } });
    const warn = await dpa.amendmentWarnings(prisma, v, documentId);
    assert.equal(warn.length, 0, "tidak ada kegiatan DPA-nya yang berubah");
    const a = await view(v);
    assert.equal(a.needsRevision, false);
    assert.equal((await step(v, "reopen")).ok, false, "anggaran 1.1.04 sama, SPP ada: tetap terkunci");
    assert.equal((await view(v, "1.1.01")).hasPlan, false, "kegiatan baru menunggu DPA awal");
    // perubahan kedua memangkas ATK di bawah realisasi 350.000
    const second = await amend(v, 300_000, { reason: "Keadaan luar biasa: bencana banjir bandang" });
    const w2 = await dpa.amendmentWarnings(prisma, v, second.documentId);
    assert.ok(w2.some((w) => /di bawah realisasi/.test(w) && /1\.1\.04 \/ 5\.2\.1\.01.*anggaran Rp300000\.00, terpakai Rp350000\.00/.test(w)), w2.join("|"));
    const created2 = await spp.createRequest(prisma, { villageId: v, userId: 1, year: 2026, now: NOW, input: { activityCode: ACT, mode: "SWAKELOLA", executorName: "Kasi Pelayanan", lines: [{ accountCode: "5.2.1.01", amount: 1_000 }] } });
    assert.equal(created2.ok, false, "tidak ada sisa anggaran");
  });

  it("persetujuan menolak bila anggaran berubah di antara verifikasi dan persetujuan; kegiatan desa lain tidak terjangkau", async () => {
    const v = await setup("DP4");
    const other = await setup("DP5");
    assert.ok((await dpa.savePlan(prisma, { villageId: v, year: 2026, activityCode: ACT, input: { executorName: "Kasi Pelayanan" } })).ok);
    assert.ok((await rak(v, "5.2.1.01", { 3: 400_000 })).ok);
    assert.ok((await rak(v, "5.2.1.07", { 3: 200_000 })).ok);
    assert.ok((await step(v, "verify")).ok);
    await amend(v, 450_000);
    const late = await step(v, "approve");
    assert.equal(late.ok, false);
    assert.match(late.ok ? "" : late.errors.join(" "), /berubah sejak diverifikasi/);
    assert.equal(await prisma.apbdesActivityPlanVersion.count({ where: { villageId: v } }), 0, "tidak ada riwayat dari persetujuan yang gagal");
    assert.equal((await step(other, "approve")).ok, false, "desa lain belum punya DPA sama sekali");
    assert.equal(await prisma.apbdesActivityPlanVersion.count({ where: { villageId: other } }), 0);
  });
  it("revisi tidak melompat dari DPPA yang belum disetujui; persetujuan memeriksa ulang pemakaian; RAB tak bisa dihapus setelah verifikasi", async () => {
    const v = await setup("DP6");
    await approvedDpa(v);
    await spentSpp(v);
    await amend(v, 500_000);
    assert.ok((await step(v, "reopen")).ok);
    assert.ok((await rak(v, "5.2.1.01", { 1: 100_000, 11: 350_000, 12: 50_000 })).ok);
    const item = await dpa.addCostItem(prisma, { villageId: v, year: 2026, input: { activityCode: ACT, accountCode: "5.2.1.01", description: "Kertas", volume: 1, unit: "rim", unitPrice: 10_000 } });
    assert.ok(item.ok);
    assert.ok((await step(v, "verify")).ok);
    assert.equal((await dpa.deleteCostItem(prisma, { villageId: v, year: 2026, itemId: item.ok ? item.data.id : 0 })).ok, false, "RAB terkunci setelah diverifikasi");
    // belanja manual menambah pemakaian di antara verifikasi dan persetujuan: sampai November 350.000 + 120.000 > 450.000
    assert.ok((await svc.addEntry(prisma, { villageId: v, userId: 1, now: NOW, input: { voucherNo: "K-9", description: "beli kertas", channel: "BANK", type: "PENGELUARAN", entryDate: "2026-11-10", amount: 120_000, accountCode: "5.2.1.01", activityCode: ACT } })).ok);
    const late = await step(v, "approve");
    assert.equal(late.ok, false);
    assert.match(late.ok ? "" : late.errors.join(" "), /lebih kecil dari yang sudah terpakai/);
    // perubahan kedua ditetapkan selagi DPPA ke-1 baru diverifikasi: dibuka lagi tetap DPPA ke-1 (belum pernah disetujui)
    await amend(v, 480_000, { reason: "Keadaan luar biasa: bencana banjir bandang" });
    const again = await step(v, "reopen");
    assert.ok(again.ok);
    assert.equal(again.ok ? again.data.revision : -1, 1, "tidak ada nomor kosong");
  });
});
