/** Tes integrasi DPA, SPP, dan panjar terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("DPA, SPP, dan panjar (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/apbdes/service");
  let dpa: typeof import("../lib/apbdes/dpa");
  let spp: typeof import("../lib/apbdes/spp");
  let rep: typeof import("../lib/apbdes/report-data");
  let more: typeof import("../lib/apbdes/report-more");
  let sek: typeof import("../lib/apbdes/sektoral");
  const created: number[] = [];
  const NOW = new Date("2026-11-15T03:00:00Z");

  /** APB Desa 2026 ditetapkan: DD 1.000.000; kegiatan 1.1.04 ATK 400.000 (5.2.1.01) + material 200.000 (5.2.1.07). */
  async function setup(tag: string) {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `${tag}${t}`, name: tag, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    created.push(v.id);
    const d = await svc.createDocument(prisma, { villageId: v.id, year: 2026, userId: 1 });
    assert.ok(d.ok);
    const id = d.ok ? d.data.id : 0;
    for (const [accountCode, amount, activityCode] of [["4.2.1.01", 1_000_000, undefined], ["5.2.1.01", 400_000, "1.1.04"], ["5.2.1.07", 200_000, "1.1.04"]] as const) {
      assert.ok((await svc.addLine(prisma, { villageId: v.id, documentId: id, input: { accountCode, amount, activityCode } })).ok);
    }
    assert.ok((await svc.adoptDocument(prisma, { villageId: v.id, documentId: id, regulationNumber: "Perdes 1/2026", regulationDate: "2025-12-20", now: NOW })).ok);
    return v.id;
  }
  const receive = (villageId: number, amount: number) => svc.addEntry(prisma, { villageId, userId: 1, input: { voucherNo: "T-1", description: "dana", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-01-05", amount, accountCode: "4.2.1.01" }, now: NOW });
  const months = (m: Record<number, number>) => Array.from({ length: 12 }, (_, i) => m[i + 1] ?? 0);
  async function approvedDpa(villageId: number) {
    assert.ok((await dpa.savePlan(prisma, { villageId, year: 2026, activityCode: "1.1.04", input: { executorName: "Kasi Pelayanan" } })).ok);
    assert.ok((await dpa.saveCashPlan(prisma, { villageId, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.01", months: months({ 1: 100_000, 11: 300_000 }) } })).ok);
    assert.ok((await dpa.saveCashPlan(prisma, { villageId, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.07", months: months({ 11: 200_000 }) } })).ok);
    assert.ok((await dpa.advancePlan(prisma, { villageId, year: 2026, activityCode: "1.1.04", action: "verify", now: NOW })).ok);
    assert.ok((await dpa.advancePlan(prisma, { villageId, year: 2026, activityCode: "1.1.04", action: "approve", now: NOW })).ok);
  }
  const request = (villageId: number, o: Record<string, unknown> = {}) =>
    spp.createRequest(prisma, { villageId, userId: 1, year: 2026, now: NOW, input: { activityCode: "1.1.04", mode: "SWAKELOLA", executorName: "Kasi Pelayanan", lines: [{ accountCode: "5.2.1.01", amount: 350_000 }, { accountCode: "5.2.1.07", amount: 200_000 }], ...o } });
  const act = (villageId: number, requestId: number, action: "verify" | "approve" | "reject" | "pay", input?: unknown) => spp.actOnRequest(prisma, { villageId, userId: 1, requestId, action, input, now: NOW });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/apbdes/service");
    dpa = await import("../lib/apbdes/dpa");
    spp = await import("../lib/apbdes/spp");
    rep = await import("../lib/apbdes/report-data");
    more = await import("../lib/apbdes/report-more");
    sek = await import("../lib/apbdes/sektoral");
  });
  after(async () => {
    for (const id of created) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("DPA: rencana penarikan tak boleh melebihi anggaran, verifikasi butuh rencana lengkap, disetujui terkunci", async () => {
    const v = await setup("DA");
    assert.equal((await dpa.savePlan(prisma, { villageId: v, year: 2026, activityCode: "2.2.02", input: { executorName: "x" } })).ok, false, "kegiatan tak ada di APB Desa");
    assert.ok((await dpa.savePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", input: { executorName: "Kasi Pelayanan", startMonth: 1, endMonth: 12 } })).ok);
    assert.equal((await dpa.savePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", input: { startMonth: 5, endMonth: 2 } })).ok, false, "bulan selesai sebelum mulai");
    assert.equal((await dpa.saveCashPlan(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.01", months: months({ 1: 400_001 }) } })).ok, false, "melebihi anggaran");
    assert.equal((await dpa.saveCashPlan(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.02", months: months({ 1: 1 }) } })).ok, false, "rekening tak dianggarkan");
    assert.ok((await dpa.saveCashPlan(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.01", months: months({ 1: 100_000, 11: 300_000 }) } })).ok);
    const verify = () => dpa.advancePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", action: "verify", now: NOW });
    assert.equal((await verify()).ok, false, "rekening 5.2.1.07 belum punya rencana");
    assert.ok((await dpa.saveCashPlan(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.07", months: months({ 11: 200_000 }) } })).ok);
    assert.equal((await dpa.advancePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", action: "approve", now: NOW })).ok, false, "harus diverifikasi dulu");
    assert.ok((await verify()).ok);
    assert.ok((await dpa.advancePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", action: "approve", now: NOW })).ok);
    assert.equal((await dpa.savePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", input: { executorName: "Lain" } })).ok, false, "terkunci");
    assert.equal((await dpa.addCostItem(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.01", description: "Kertas", volume: 10, unit: "rim", unitPrice: 50_000 } })).ok, false, "terkunci");
    const ov = await dpa.planOverview(prisma, v, 2026);
    assert.equal(ov.activities[0]!.status, "DISETUJUI");
    assert.equal(ov.activities[0]!.rakComplete, true);
  });

  it("RAB: jumlah = volume x harga (dibulatkan), tak boleh melebihi anggaran rekening", async () => {
    const v = await setup("DB");
    assert.ok((await dpa.addCostItem(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.01", description: "Kertas HVS", volume: "10.5", unit: "rim", unitPrice: "35000" } })).ok);
    const ov = await dpa.planOverview(prisma, v, 2026);
    assert.equal(ov.activities[0]!.costItems[0]!.amount, "367500.00");
    assert.equal((await dpa.addCostItem(prisma, { villageId: v, year: 2026, input: { activityCode: "1.1.04", accountCode: "5.2.1.01", description: "Lagi", volume: 10, unit: "rim", unitPrice: 50_000 } })).ok, false, "367.500 + 500.000 > 400.000");
    const items = ov.activities[0]!.costItems;
    assert.equal((await dpa.deleteCostItem(prisma, { villageId: v, year: 2026, itemId: items[0]!.id })).ok, true);
  });

  it("SPP: butuh DPA disetujui, tak melebihi anggaran maupun rencana penarikan, penyedia butuh bukti penerimaan", async () => {
    const v = await setup("SA");
    assert.equal((await request(v)).ok, false, "DPA belum disetujui");
    await approvedDpa(v);
    assert.equal((await request(v, { mode: "PENYEDIA", hasReceipt: false })).ok, false, "penyedia tanpa bukti penerimaan");
    assert.equal((await request(v, { mode: "SWAKELOLA", executorName: "" })).ok, false, "swakelola butuh nama penerima panjar");
    assert.equal((await request(v, { lines: [{ accountCode: "5.2.1.01", amount: 400_001 }] })).ok, false, "melebihi anggaran");
    assert.equal((await request(v, { lines: [{ accountCode: "5.2.1.02", amount: 1 }] })).ok, false, "rekening tak dianggarkan");
    const first = await request(v);
    assert.ok(first.ok && first.data.number === 1);
    const second = await request(v, { lines: [{ accountCode: "5.2.1.01", amount: 60_000 }] });
    assert.equal(second.ok, false, "350.000 sedang berjalan + 60.000 melebihi anggaran 400.000");
    assert.match(second.ok ? "" : second.errors[0]!, /sisa anggaran/);
    assert.equal((await spp.getRequest(prisma, 99999999, first.ok ? first.data.id : 0)).ok, false, "desa lain tak bisa membaca");
  });

  it("SPP dibayar: alur verifikasi-persetujuan-bayar, catatan buku kas dan panjar terbentuk, saldo tak boleh minus", async () => {
    const v = await setup("SB");
    await approvedDpa(v);
    const r = await request(v);
    const id = r.ok ? r.data.id : 0;
    const pay = { paidAt: "2026-11-10", channel: "BANK" };
    assert.equal((await act(v, id, "approve")).ok, false, "belum diverifikasi");
    assert.equal((await act(v, id, "pay", pay)).ok, false, "belum disetujui");
    assert.ok((await act(v, id, "verify")).ok);
    assert.ok((await act(v, id, "approve")).ok);
    const broke = await act(v, id, "pay", pay);
    assert.equal(broke.ok, false, "saldo bank nol");
    assert.equal((await spp.getRequest(prisma, v, id)).ok && (await prisma.apbdesEntry.count({ where: { villageId: v, requestId: id } })), 0, "tak ada catatan tertinggal setelah gagal");
    assert.equal((await spp.getRequest(prisma, v, id)).ok ? ((await spp.getRequest(prisma, v, id)) as { data: { status: string } }).data.status : "", "DISETUJUI");
    assert.ok((await receive(v, 1_000_000)).ok);
    assert.equal((await act(v, id, "pay", { paidAt: "2026-11-20", channel: "BANK" })).ok, false, "tanggal masa depan");
    const paid = await act(v, id, "pay", pay);
    assert.ok(paid.ok && paid.data.status === "DIBAYAR");
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: v, requestId: id, type: "PENGELUARAN" } }), 2);
    assert.equal((await act(v, id, "pay", pay)).ok, false, "tak bisa dibayar dua kali");
    const ov = await rep.overview(prisma, v, 2026, NOW);
    assert.equal(ov.summary.expenseRealized, "550000.00");
    assert.equal(ov.balances.bank, "450000.00");
    const linked = await prisma.apbdesEntry.findFirst({ where: { villageId: v, requestId: id } });
    assert.equal((await svc.deleteEntry(prisma, { villageId: v, entryId: linked!.id })).ok, false, "catatan dari SPP tak bisa dihapus lewat jalur umum");
    assert.equal((await dpa.advancePlan(prisma, { villageId: v, year: 2026, activityCode: "1.1.04", action: "reopen", now: NOW })).ok, false, "DPA tak bisa dibuka setelah ada SPP");
    const rejected = await request(v, { lines: [{ accountCode: "5.2.1.01", amount: 10_000 }] });
    assert.ok(rejected.ok);
    assert.equal((await act(v, rejected.ok ? rejected.data.id : 0, "reject", { note: "" })).ok, false, "alasan wajib");
    assert.ok((await act(v, rejected.ok ? rejected.data.id : 0, "reject", { note: "Bukti belum lengkap" })).ok);
  });

  it("panjar swakelola: jatuh tempo 10 hari kerja, SPJ dan pengembalian tak melebihi saldo, pengembalian mengurangi realisasi", async () => {
    const v = await setup("SC");
    await approvedDpa(v);
    assert.ok((await receive(v, 1_000_000)).ok);
    const r = await request(v);
    const id = r.ok ? r.data.id : 0;
    for (const a of ["verify", "approve"] as const) assert.ok((await act(v, id, a)).ok);
    assert.ok((await act(v, id, "pay", { paidAt: "2026-11-02", channel: "BANK" })).ok);
    let list = await spp.listPanjar(prisma, v, 2026, NOW);
    assert.equal(list.length, 1);
    const p = list[0]!;
    assert.equal(p.given, "550000.00");
    assert.equal(p.dueAt, "2026-11-16", "2 Nov (Senin) + 10 hari kerja = 16 Nov");
    assert.equal(p.state, "TERBUKA", "jatuh tempo 16 Nov, hari ini 15 Nov");
    assert.equal((await spp.listPanjar(prisma, v, 2026, new Date("2026-11-17T03:00:00Z")))[0]!.state, "TERLAMBAT");

    const spj = (amount: number, date = "2026-11-05") => spp.addPanjarSpj(prisma, { villageId: v, panjarId: p.id, input: { spjDate: date, voucherNo: "KW-1", description: "Beli ATK", amount }, now: NOW });
    assert.equal((await spj(550_001)).ok, false, "melebihi panjar");
    assert.equal((await spj(100, "2026-11-01")).ok, false, "bukti sebelum panjar diberikan");
    const s1 = await spj(300_000);
    assert.ok(s1.ok && s1.data.balance === "250000.00");
    assert.equal((await spp.checkPanjarSpj(prisma, { villageId: v, spjId: s1.ok ? s1.data.id : 0 })).ok, true);
    assert.equal((await spp.checkPanjarSpj(prisma, { villageId: v, spjId: s1.ok ? s1.data.id : 0 })).ok, false, "sudah diperiksa");

    const back = (amount: number, accountCode = "5.2.1.01", o: Record<string, unknown> = {}) => spp.returnPanjar(prisma, { villageId: v, userId: 1, panjarId: p.id, now: NOW, input: { date: "2026-11-10", voucherNo: "STS-1", channel: "TUNAI", accountCode, amount, ...o } });
    assert.equal((await back(250_001)).ok, false, "melebihi saldo panjar");
    assert.equal((await back(10, "5.2.1.99")).ok, false, "rekening bukan bagian SPP");
    assert.ok((await back(10, "5.2.1.01", { channel: "BANK" })).ok, "pengembalian ke rekening bank");
    assert.ok((await back(200_000, "5.2.1.07")).ok, "tepat sebesar yang dibayarkan pada rekening itu");
    assert.equal((await back(1, "5.2.1.07")).ok, false, "rekening 5.2.1.07 sudah dikembalikan penuh");
    assert.equal((await back(150_001, "5.2.1.01")).ok, false, "saldo panjar tinggal 49.990");
    const last = await back(49_990, "5.2.1.01");
    assert.ok(last.ok && last.data.balance === "0.00");
    list = await spp.listPanjar(prisma, v, 2026, NOW);
    assert.equal(list[0]!.state, "LUNAS");
    assert.equal((await spj(1)).ok, false, "panjar sudah nol");

    // Realisasi belanja = yang dipertanggungjawabkan: 550.000 dibayar dikurangi 250.000 dikembalikan
    const ov = await rep.overview(prisma, v, 2026, NOW);
    assert.equal(ov.summary.expenseRealized, "300000.00");
    assert.equal(ov.balances.bank, "450010.00", "1.000.000 - 550.000 dibayar + 10 dikembalikan ke bank");
    assert.equal(ov.balances.tunai, "249990.00", "sisa panjar lainnya dikembalikan tunai");
    const bku = await rep.buildReport(prisma, v, 2026, "bku", 11);
    assert.ok(bku.ok && bku.data.rows.some((r) => r.cells[3]!.startsWith("Pengembalian sisa panjar")));
    const entry = await prisma.apbdesEntry.findFirst({ where: { villageId: v, type: "PANJAR_KEMBALI" } });
    assert.equal((await svc.deleteEntry(prisma, { villageId: v, entryId: entry!.id })).ok, false, "pengembalian panjar tak bisa dihapus lewat jalur umum");
  });

  it("laporan lanjutan: setiap jenis tersusun, kolom sama dengan sel, rekonsiliasi CaLK sesuai, program sektoral tercatat", async () => {
    const v = await setup("SR");
    await approvedDpa(v);
    assert.ok((await receive(v, 1_000_000)).ok);
    assert.ok((await svc.addEntry(prisma, { villageId: v, userId: 1, now: NOW, input: { voucherNo: "T-2", description: "pajak uji", channel: "BANK", type: "PENGELUARAN", entryDate: "2026-02-03", amount: 0 + 10_000, accountCode: "5.2.1.01", activityCode: "1.1.04", taxAmount: 1_000, taxKind: "PPN" } })).ok);
    const r = await request(v);
    const id = r.ok ? r.data.id : 0;
    for (const a of ["verify", "approve"] as const) assert.ok((await act(v, id, a)).ok);
    assert.ok((await act(v, id, "pay", { paidAt: "2026-11-10", channel: "BANK" })).ok);
    assert.equal((await sek.addProgram(prisma, { villageId: v, year: 2026, input: { programName: "PKH", activityKind: "Bantuan sosial", volume: 12, unit: "KPM", amount: 5_000_000, fundSource: "APBN" } })).ok, true);
    assert.equal((await sek.addProgram(prisma, { villageId: v, year: 2026, input: { programName: "", activityKind: "x", volume: 1, unit: "u", amount: 1, fundSource: "y" } })).ok, false);
    const kinds: [string, Record<string, unknown>][] = [["rka", { activityCode: "1.1.04" }], ["rab", { activityCode: "1.1.04" }], ["rkk", {}], ["rak", {}], ["spp", { id }], ["ptjb", { id }], ["panjar", {}], ["kegiatan-t3", {}], ["kegiatan-t3", { semester: true }], ["sektoral", {}], ["calk", {}]];
    for (const [kind, params] of kinds) {
      const t = await more.loadMoreReport(prisma, v, 2026, kind as never, params);
      assert.ok(t.ok, `${kind}: ${t.ok ? "" : t.errors[0]}`);
      if (!t.ok) continue;
      for (const row of t.data.rows) assert.equal(row.cells.length, t.data.columns.length, `${kind}: jumlah sel sama dengan kolom`);
    }
    assert.equal((await more.loadMoreReport(prisma, v, 2026, "spp", { id: 999999 })).ok, false);
    const calk = await more.loadMoreReport(prisma, v, 2026, "calk", {});
    assert.ok(calk.ok && calk.data.rows.some((x) => x.cells[0]!.startsWith("Rekonsiliasi: SiLPA + pajak belum disetor = saldo kas (sesuai)")), "SiLPA + pajak belum disetor = saldo kas");
    const rak = await more.loadMoreReport(prisma, v, 2026, "rak", {});
    assert.ok(rak.ok && rak.data.rows.some((x) => x.cells[1] === "ARUS KAS KELUAR" && x.cells[12] === "500.000,00" && x.cells[2] === "100.000,00"), "RAK: November 300.000 + 200.000, Januari 100.000");
    const sektoral = await more.loadMoreReport(prisma, v, 2026, "sektoral", {});
    assert.ok(sektoral.ok && sektoral.data.rows[0]!.cells[1] === "PKH");
  });
});
