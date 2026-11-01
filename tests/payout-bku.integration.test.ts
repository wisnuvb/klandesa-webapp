/** Tes integrasi pencatatan pembayaran BLT, upah PKTD, dan angsuran KDMP ke Buku Kas Umum (MySQL sungguhan). */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Tautan pembayaran modul ke Buku Kas Umum (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let ap: typeof import("../lib/apbdes/service");
  let po: typeof import("../lib/apbdes/payout");
  let kd: typeof import("../lib/kdmp/service");
  let pk: typeof import("../lib/pktd/service");
  let blt: typeof import("../lib/blt/service");
  let vA = 0;
  let vB = 0;
  let seq = 0;
  const NOW = new Date("2026-11-15T03:00:00Z");
  const CH = { activityCode: "1.1.04", accountCode: "5.2.1.01", channel: "BANK", voucherNo: "BKU-1" };

  async function village(tag: string, opts: { adopt?: boolean; budget?: number; cash?: number } = {}) {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `${tag}${t}${seq++}`, name: tag, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    if (opts.adopt !== false) {
      const d = await ap.createDocument(prisma, { villageId: v.id, year: 2026, userId: 1 });
      assert.ok(d.ok);
      const id = d.ok ? d.data.id : 0;
      assert.ok((await ap.addLine(prisma, { villageId: v.id, documentId: id, input: { accountCode: "4.2.1.01", amount: 5_000_000 } })).ok);
      assert.ok((await ap.addLine(prisma, { villageId: v.id, documentId: id, input: { accountCode: "5.2.1.01", amount: opts.budget ?? 1_000_000, activityCode: "1.1.04", fundSource: "DD" } })).ok);
      const a = await ap.adoptDocument(prisma, { villageId: v.id, documentId: id, regulationNumber: "Perdes 1/2026", regulationDate: "2025-12-20", now: NOW });
      assert.ok(a.ok, JSON.stringify(a));
      if (opts.cash !== 0) assert.ok((await ap.addEntry(prisma, { villageId: v.id, userId: 1, now: NOW, input: { voucherNo: "T-1", description: "kas", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-01-05", amount: opts.cash ?? 5_000_000, accountCode: "4.2.1.01" } })).ok);
    }
    return v.id;
  }
  const entries = (villageId: number) => prisma.apbdesEntry.findMany({ where: { villageId, type: "PENGELUARAN" }, orderBy: { id: "asc" } });

  const kdInst = async (villageId: number, amount: string, o: Record<string, unknown> = {}) => {
    const d = await kd.addDisbursement(prisma, { villageId, userId: 1, now: NOW, input: { year: 2026, receivedOn: "2026-02-01", amount: "5000000" } });
    assert.ok(d.ok, JSON.stringify(d));
    const r = await kd.addInstallment(prisma, { villageId, userId: 1, now: NOW, input: { year: 2026, paidOn: "2026-03-10", amount, payee: "PT Pembangun", reference: "PKS-1", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    ap = await import("../lib/apbdes/service");
    po = await import("../lib/apbdes/payout");
    kd = await import("../lib/kdmp/service");
    pk = await import("../lib/pktd/service");
    blt = await import("../lib/blt/service");
    vA = await village("PA");
    vB = await village("PB");
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("pilihan belanja: hanya pasangan kegiatan-rekening di APB Desa yang berlaku, dengan sisa anggaran; Dana Desa di atas", async () => {
    const o = await po.payoutOptions(prisma, vA, 2026);
    assert.ok(o.hasActiveDocument);
    assert.equal(o.options.length, 1);
    assert.deepEqual([o.options[0]!.activityCode, o.options[0]!.accountCode, o.options[0]!.budget, o.options[0]!.remaining, o.options[0]!.hasDanaDesa], ["1.1.04", "5.2.1.01", "1000000.00", "1000000.00", true]);
    const none = await village("PN", { adopt: false });
    assert.deepEqual(await po.payoutOptions(prisma, none, 2026), { options: [], hasActiveDocument: false });
    await prisma.village.delete({ where: { id: none } });
  });

  it("KDMP: angsuran tercatat sebagai satu pengeluaran BKU; tak bisa dicatat dua kali, dihapus, atau diubah dari BKU; batal mengembalikan", async () => {
    const id = await kdInst(vA, "400000");
    const r = await kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id, input: CH, now: NOW });
    assert.ok(r.ok, JSON.stringify(r));
    const [e] = await entries(vA);
    assert.equal(e!.amountCents, 40_000_000n);
    assert.deepEqual([e!.type, e!.channel, e!.activityCode, e!.accountCode, e!.voucherNo], ["PENGELUARAN", "BANK", "1.1.04", "5.2.1.01", "BKU-1"]);
    assert.equal(e!.entryDate.toISOString().slice(0, 10), "2026-03-10");
    assert.match(e!.description, /PT Pembangun/);
    const ov = await kd.getOverview(prisma, { villageId: vA, year: 2026, today: "2026-11-15" });
    assert.ok(ov.ok && ov.data.installments[0]!.bkuVoucher === "BKU-1");
    const again = await kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id, input: { ...CH, voucherNo: "BKU-2" }, now: NOW });
    assert.ok(!again.ok && again.status === 409);
    assert.equal((await entries(vA)).length, 1);
    const del = await kd.removeInstallment(prisma, { villageId: vA, id });
    assert.ok(!del.ok && del.status === 409, "angsuran tertaut tak dapat dihapus");
    const manualDel = await ap.deleteEntry(prisma, { villageId: vA, entryId: e!.id });
    assert.ok(!manualDel.ok && manualDel.status === 409 && /BLT, upah PKTD, atau angsuran KDMP/.test(manualDel.errors[0]!));
    const manualUpd = await ap.updateEntry(prisma, { villageId: vA, entryId: e!.id, now: NOW, input: { voucherNo: "X", description: "x", channel: "BANK", type: "PENGELUARAN", entryDate: "2026-03-10", amount: 1, accountCode: "5.2.1.01", activityCode: "1.1.04" } });
    assert.ok(!manualUpd.ok && manualUpd.status === 409);
    const un = await kd.unpostInstallmentFromBku(prisma, { villageId: vA, id });
    assert.ok(un.ok, JSON.stringify(un));
    assert.equal((await entries(vA)).length, 0);
    assert.equal((await prisma.kdmpInstallment.findUnique({ where: { id } }))!.bkuEntryId, null);
    assert.ok(!(await kd.unpostInstallmentFromBku(prisma, { villageId: vA, id })).ok, "belum tercatat");
    assert.ok((await kd.removeInstallment(prisma, { villageId: vA, id })).ok, "setelah dibatalkan dapat dihapus");
  });

  it("aturan buku kas tetap berlaku: melebihi anggaran, saldo kas kurang, bulan sudah ditutup, rekening di luar APB Desa", async () => {
    const small = await village("PS", { budget: 300_000 });
    const id = await kdInst(small, "400000");
    const over = await kd.postInstallmentToBku(prisma, { villageId: small, userId: 1, id, input: CH, now: NOW });
    assert.ok(!over.ok && over.status === 409 && /melebihi anggaran/i.test(over.errors[0]!));
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: small, type: "PENGELUARAN" } }), 0);
    assert.equal((await prisma.kdmpInstallment.findUnique({ where: { id } }))!.bkuEntryId, null, "gagal berarti tak ada tautan");
    await prisma.village.delete({ where: { id: small } });

    const poor = await village("PP", { cash: 100_000 });
    const id2 = await kdInst(poor, "400000");
    const noCash = await kd.postInstallmentToBku(prisma, { villageId: poor, userId: 1, id: id2, input: CH, now: NOW });
    assert.ok(!noCash.ok && noCash.status === 409);
    await prisma.village.delete({ where: { id: poor } });

    const closed = await village("PC");
    const id3 = await kdInst(closed, "400000");
    for (const month of [1, 3]) assert.ok((await ap.actOnMonth(prisma, { villageId: closed, userId: 1, year: 2026, month, action: "close", now: NOW })).ok);
    const lock = await kd.postInstallmentToBku(prisma, { villageId: closed, userId: 1, id: id3, input: CH, now: NOW });
    assert.ok(!lock.ok && lock.status === 409 && /ditutup/.test(lock.errors[0]!));
    await prisma.village.delete({ where: { id: closed } });

    const id4 = await kdInst(vA, "100000");
    const wrong = await kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id: id4, input: { ...CH, accountCode: "5.2.1.02" }, now: NOW });
    assert.ok(!wrong.ok && wrong.status === 409, "pasangan tak ada di APB Desa");
    const badInput = await kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id: id4, input: { ...CH, accountCode: "4.2.1.01", channel: "X" }, now: NOW });
    assert.ok(!badInput.ok && badInput.status === 400);
    await prisma.kdmpInstallment.deleteMany({ where: { villageId: vA } });
  });

  it("dua pencatatan serentak atas angsuran yang sama: hanya satu catatan buku kas", async () => {
    const id = await kdInst(vA, "100000");
    const rs = await Promise.all([1, 2, 3].map((n) => kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id, input: { ...CH, voucherNo: `P-${n}` }, now: NOW })));
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => r.ok)));
    assert.equal((await entries(vA)).length, 1);
    assert.ok((await kd.unpostInstallmentFromBku(prisma, { villageId: vA, id })).ok);
    await prisma.kdmpInstallment.deleteMany({ where: { villageId: vA } });
  });

  it("dua pencatatan serentak yang bersama-sama melebihi anggaran: yang melebihi ditolak (kunci tahun)", async () => {
    const v = await village("PR", { budget: 500_000 });
    const a = await kdInst(v, "300000");
    const b = (await kd.addInstallment(prisma, { villageId: v, userId: 1, now: NOW, input: { year: 2026, paidOn: "2026-03-11", amount: "300000", payee: "CV Lain" } }));
    assert.ok(b.ok);
    const rs = await Promise.all([kd.postInstallmentToBku(prisma, { villageId: v, userId: 1, id: a, input: { ...CH, voucherNo: "R-1" }, now: NOW }), kd.postInstallmentToBku(prisma, { villageId: v, userId: 1, id: b.ok ? b.data.id : 0, input: { ...CH, voucherNo: "R-2" }, now: NOW })]);
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors[0]))));
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: v, type: "PENGELUARAN" } }), 1);
    await prisma.village.delete({ where: { id: v } });
  });

  it("PKTD: upah satu tanggal bayar menjadi satu pengeluaran; hapus hari kerja ditolak; batal mengembalikan", async () => {
    const act = await pk.createActivity(prisma, { villageId: vA, userId: 1, input: { year: 2026, title: "Rabat jalan", cost: "1000000", plannedWage: "600000" } });
    assert.ok(act.ok);
    const aid = act.ok ? act.data.id : 0;
    const w = [];
    for (const n of ["A", "B"]) {
      const r = await pk.addWorker(prisma, { villageId: vA, activityId: aid, input: { name: `Pak ${n}`, gender: "L", priority: "PENGANGGUR" } });
      assert.ok(r.ok);
      w.push(r.ok ? r.data.id : 0);
    }
    assert.ok((await pk.addWorkDays(prisma, { villageId: vA, activityId: aid, userId: 1, now: NOW, input: { workDate: "2026-03-02", task: "PELAKSANAAN", wage: "80000", workerIds: w, paid: true } })).ok);
    assert.ok((await pk.addWorkDays(prisma, { villageId: vA, activityId: aid, userId: 1, now: NOW, input: { workDate: "2026-03-03", task: "PELAKSANAAN", wage: "80000", workerIds: w, paid: false } })).ok);
    const none = await pk.postWagesToBku(prisma, { villageId: vA, activityId: aid, userId: 1, input: { ...CH, paidOn: "2026-03-03" }, now: NOW });
    assert.ok(!none.ok && none.status === 404, "hari yang belum dibayar tak bisa dicatat");
    const r = await pk.postWagesToBku(prisma, { villageId: vA, activityId: aid, userId: 1, input: { ...CH, paidOn: "2026-03-02", voucherNo: "UPAH-1" }, now: NOW });
    assert.ok(r.ok && r.data.days === 2 && r.data.amount === "160000.00", JSON.stringify(r));
    const [e] = await entries(vA);
    assert.equal(e!.amountCents, 16_000_000n);
    const v = await pk.getActivity(prisma, vA, aid);
    assert.ok(v.ok && v.data.payouts.length === 1 && v.data.payouts[0]!.voucherNo === "UPAH-1" && v.data.payouts[0]!.days === 2);
    assert.ok(!(await pk.postWagesToBku(prisma, { villageId: vA, activityId: aid, userId: 1, input: { ...CH, paidOn: "2026-03-02" }, now: NOW })).ok, "tak bisa dua kali");
    const del = await pk.deleteWorkDays(prisma, { villageId: vA, activityId: aid, date: new Date("2026-03-02"), allowPaid: true });
    assert.ok(!del.ok && del.status === 409 && /Buku Kas Umum/.test(del.errors[0]!));
    assert.ok(!(await pk.unpostWagesFromBku(prisma, { villageId: vB, activityId: aid, entryId: e!.id })).ok, "desa lain tak bisa membatalkan");
    assert.ok((await pk.unpostWagesFromBku(prisma, { villageId: vA, activityId: aid, entryId: e!.id })).ok);
    assert.equal((await entries(vA)).length, 0);
    assert.equal(await prisma.pktdWorkDay.count({ where: { activityId: aid, bkuEntryId: { not: null } } }), 0);
    assert.ok((await pk.deleteWorkDays(prisma, { villageId: vA, activityId: aid, date: new Date("2026-03-02"), allowPaid: true })).ok);
  });

  it("BLT: pembayaran satu tanggal bayar menjadi satu pengeluaran; batalkan pembayaran ditolak selama tertaut", async () => {
    const mk = async (name: string) => {
      seq += 1;
      return prisma.resident.create({ data: { villageId: vA, nik: `${String(Date.now() % 1e8).padStart(8, "0")}${String(seq).padStart(8, "0")}`, kk: `${String(Date.now() % 1e8).padStart(8, "1")}${String(seq).padStart(8, "0")}`, name, birthplace: "x", birthDate: new Date("1980-05-05"), gender: "Laki-laki", address: "Jl", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", rt: "01", rw: "02", occupation: "Buruh" } });
    };
    const pr = await blt.createProgram(prisma, { villageId: vA, userId: 1, input: { year: 2026, title: "BLT 2026", monthly: "300000", totalMonths: 6 } });
    assert.ok(pr.ok);
    const pid = pr.ok ? pr.data.id : 0;
    const bens: number[] = [];
    for (const n of ["Budi", "Siti"]) {
      const res = await mk(n);
      const b = await blt.addBeneficiary(prisma, { villageId: vA, programId: pid, input: { residentId: res.id, source: "PEMERINTAH", category: "Miskin ekstrem" } });
      assert.ok(b.ok, JSON.stringify(b));
      bens.push(b.ok ? b.data.id : 0);
    }
    const m = await prisma.villageMeeting.create({ data: { villageId: vA, kind: "MUSDES_BLT", title: "Musdes BLT", scheduledOn: new Date("2026-02-01"), status: "HELD", heldOn: new Date("2026-02-01") } });
    assert.ok((await blt.patchProgram(prisma, { villageId: vA, id: pid, input: { musdesMeetingId: m.id, decreeNumber: "1/Kpts/2026", decreeDate: "2026-03-01" } })).ok);
    assert.ok((await blt.changeStatus(prisma, { villageId: vA, id: pid, action: "tetapkan" })).ok);
    const payIds: number[] = [];
    for (const b of bens) {
      const r = await blt.addPayment(prisma, { villageId: vA, programId: pid, userId: 1, now: NOW, input: { beneficiaryId: b, monthFrom: 1, method: "NONTUNAI", paidOn: "2026-03-10" } });
      assert.ok(r.ok, JSON.stringify(r));
      payIds.push(r.ok ? r.data.id : 0);
    }
    const r = await blt.postPaymentsToBku(prisma, { villageId: vA, programId: pid, userId: 1, input: { ...CH, paidOn: "2026-03-10", voucherNo: "BLT-1" }, now: NOW });
    assert.ok(r.ok && r.data.payments === 2 && r.data.amount === "600000.00", JSON.stringify(r));
    const [e] = await entries(vA);
    assert.equal(e!.amountCents, 60_000_000n);
    const view = await blt.getProgram(prisma, vA, pid);
    assert.ok(view.ok && view.data.payouts.length === 1 && view.data.payouts[0]!.voucherNo === "BLT-1" && view.data.payouts[0]!.method === "NONTUNAI" && view.data.payments.every((p) => p.bkuEntryId === e!.id));
    const voided = await blt.voidPayment(prisma, { villageId: vA, programId: pid, id: payIds[0]! });
    assert.ok(!voided.ok && voided.status === 409 && /Buku Kas Umum/.test(voided.errors[0]!));
    assert.ok(!(await blt.postPaymentsToBku(prisma, { villageId: vA, programId: pid, userId: 1, input: { ...CH, paidOn: "2026-03-10" }, now: NOW })).ok, "tak bisa dua kali");
    assert.ok(!(await blt.unpostPaymentsFromBku(prisma, { villageId: vB, programId: pid, entryId: e!.id })).ok, "desa lain tak bisa membatalkan");
    // pembayaran baru pada tanggal yang sama setelah pencatatan dicatat sebagai catatan terpisah (sisanya saja)
    assert.ok((await blt.unpostPaymentsFromBku(prisma, { villageId: vA, programId: pid, entryId: e!.id })).ok);
    assert.equal((await entries(vA)).length, 0);
    assert.ok((await blt.voidPayment(prisma, { villageId: vA, programId: pid, id: payIds[0]! })).ok, "setelah dibatalkan dapat dibatalkan pembayarannya");
  });

  it("catatan bertaut ditandai fromPayout di tampilan buku kas; hasil pencatatan memuat rincian untuk audit; pencatatan tanpa dasar tidak membuat baris tahun", async () => {
    const id = await kdInst(vA, "100000", { paidOn: "2026-03-12" });
    const r = await kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id, input: CH, now: NOW });
    assert.ok(r.ok && r.data.activityCode === "1.1.04" && r.data.accountCode === "5.2.1.01" && r.data.channel === "BANK" && r.data.paidOn === "2026-03-12", JSON.stringify(r));
    const ids = await ap.payoutLinkedIds(prisma, vA, 2026);
    const rows = await ap.loadEntries(prisma, vA, 2026);
    const views = rows.map((e) => ap.entryView(e, new Set(), ids));
    assert.deepEqual(views.filter((v) => v.fromPayout).map((v) => v.voucherNo), ["BKU-1"]);
    assert.ok(views.filter((v) => v.fromPayout).every((v) => v.linked), "bertaut berarti tak dapat diubah dari formulir umum");
    assert.ok(views.filter((v) => !v.fromPayout).every((v) => !v.linked));
    const un = await kd.unpostInstallmentFromBku(prisma, { villageId: vA, id });
    assert.ok(un.ok && un.data.accountCode === "5.2.1.01" && un.data.paidOn === "2026-03-12");
    await prisma.kdmpInstallment.deleteMany({ where: { villageId: vA } });

    const bare = await village("PE", { adopt: false });
    const act = await pk.createActivity(prisma, { villageId: bare, userId: 1, input: { year: 2031, title: "Kosong", cost: "1000000", plannedWage: "600000" } });
    assert.ok(act.ok);
    const none = await pk.postWagesToBku(prisma, { villageId: bare, activityId: act.ok ? act.data.id : 0, userId: 1, input: { ...CH, paidOn: "2031-05-05" }, now: new Date("2031-06-01") });
    assert.ok(!none.ok && none.status === 404);
    assert.equal(await prisma.apbdesYear.count({ where: { villageId: bare } }), 0, "tidak ada baris tahun dibuat");
    await prisma.village.delete({ where: { id: bare } });
  });

  it("FK ON DELETE SET NULL: bila catatan kas hilang lewat jalur lain, tautan ikut lepas (tak ada penunjuk menggantung)", async () => {
    const id = await kdInst(vA, "100000");
    assert.ok((await kd.postInstallmentToBku(prisma, { villageId: vA, userId: 1, id, input: CH, now: NOW })).ok);
    const e = (await entries(vA))[0]!;
    await prisma.apbdesEntry.delete({ where: { id: e.id } });
    assert.equal((await prisma.kdmpInstallment.findUnique({ where: { id } }))!.bkuEntryId, null);
    await prisma.kdmpInstallment.deleteMany({ where: { villageId: vA } });
  });
});
