/** Tes integrasi: pembayaran BLT, upah PKTD, dan angsuran KDMP hanya dapat dicatat dari SPP yang sudah dibayar (MySQL sungguhan). */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pembayaran modul dibiayai SPP (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let ap: typeof import("../lib/apbdes/service");
  let dpa: typeof import("../lib/apbdes/dpa");
  let spp: typeof import("../lib/apbdes/spp");
  let fund: typeof import("../lib/apbdes/funding");
  let kd: typeof import("../lib/kdmp/service");
  let pk: typeof import("../lib/pktd/service");
  let blt: typeof import("../lib/blt/service");
  const created: number[] = [];
  let seq = 0;
  const NOW = new Date("2026-11-15T03:00:00Z");
  const months = (m: Record<number, number>) => Array.from({ length: 12 }, (_, i) => m[i + 1] ?? 0);
  const REQ = { activityCode: "2.3.01", accountCode: "5.2.1.01", executorName: "Kaur Pembangunan" };

  /** Desa dengan APB Desa 2026 ditetapkan (belanja 2.3.01/5.2.1.01 = Rp5.000.000, DD), kas bank Rp10.000.000, DPA kegiatan disetujui. */
  async function village(tag: string, o: { dpa?: boolean } = {}) {
    const v = await prisma.village.create({ data: { code: `${tag}${Date.now() % 1e6}${seq++}`, name: tag, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    created.push(v.id);
    const d = await ap.createDocument(prisma, { villageId: v.id, year: 2026, userId: 1 });
    assert.ok(d.ok);
    const id = d.ok ? d.data.id : 0;
    assert.ok((await ap.addLine(prisma, { villageId: v.id, documentId: id, input: { accountCode: "4.2.1.01", amount: 10_000_000 } })).ok);
    assert.ok((await ap.addLine(prisma, { villageId: v.id, documentId: id, input: { accountCode: "5.2.1.01", amount: 5_000_000, activityCode: "2.3.01", fundSource: "DD" } })).ok);
    assert.ok((await ap.adoptDocument(prisma, { villageId: v.id, documentId: id, regulationNumber: "Perdes 1/2026", regulationDate: "2025-12-20", now: NOW })).ok);
    assert.ok((await ap.addEntry(prisma, { villageId: v.id, userId: 1, now: NOW, input: { voucherNo: "T-1", description: "kas", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-01-05", amount: 10_000_000, accountCode: "4.2.1.01" } })).ok);
    if (o.dpa !== false) {
      assert.ok((await dpa.savePlan(prisma, { villageId: v.id, year: 2026, activityCode: "2.3.01", input: { executorName: "Kaur Pembangunan" } })).ok);
      assert.ok((await dpa.saveCashPlan(prisma, { villageId: v.id, year: 2026, input: { activityCode: "2.3.01", accountCode: "5.2.1.01", months: months({ 1: 5_000_000 }) } })).ok);
      for (const action of ["verify", "approve"] as const) assert.ok((await dpa.advancePlan(prisma, { villageId: v.id, year: 2026, activityCode: "2.3.01", action, now: NOW })).ok);
    }
    return v.id;
  }
  const act = (villageId: number, requestId: number, action: "verify" | "approve" | "reject" | "pay", input?: unknown) => spp.actOnRequest(prisma, { villageId, userId: 1, requestId, action, input, now: NOW });
  /** Verifikasi, persetujuan, dan pembayaran SPP pada 2026-03-01. */
  async function payOut(villageId: number, id: number) {
    for (const a of ["verify", "approve"] as const) assert.ok((await act(villageId, id, a)).ok);
    const r = await act(villageId, id, "pay", { paidAt: "2026-03-01", channel: "BANK" });
    assert.ok(r.ok, JSON.stringify(r));
  }

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    ap = await import("../lib/apbdes/service");
    dpa = await import("../lib/apbdes/dpa");
    spp = await import("../lib/apbdes/spp");
    fund = await import("../lib/apbdes/funding");
    kd = await import("../lib/kdmp/service");
    pk = await import("../lib/pktd/service");
    blt = await import("../lib/blt/service");
  });
  after(async () => {
    for (const id of created) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  // ---- KDMP

  const kdmpFund = async (v: number, received = "3000000") => assert.ok((await kd.addDisbursement(prisma, { villageId: v, userId: 1, now: NOW, input: { year: 2026, receivedOn: "2026-02-01", amount: received } })).ok);
  const inst = (v: number, amount: string, paidOn = "2026-03-10") => kd.addInstallment(prisma, { villageId: v, userId: 1, now: NOW, input: { year: 2026, paidOn, amount, payee: "PT Pembangun" } });
  const kdSpp = (v: number, amount: string, o: Record<string, unknown> = {}) => kd.requestInstallmentSpp(prisma, { villageId: v, year: 2026, userId: 1, now: NOW, input: { ...REQ, amount, payee: "PT Pembangun", hasReceipt: true, ...o } });

  it("KDMP: angsuran ditolak tanpa SPP, saat SPP belum dibayar, dan dilayani sesudah SPP dibayar sampai dananya habis", async () => {
    const v = await village("FK");
    await kdmpFund(v);
    const none = await inst(v, "500000");
    assert.ok(!none.ok && none.status === 409 && /belum ada SPP/.test(none.errors[0]!), JSON.stringify(none));
    const r = await kdSpp(v, "2000000");
    assert.ok(r.ok, JSON.stringify(r));
    const id = r.ok ? r.data.id : 0;
    const open = await inst(v, "500000");
    assert.ok(!open.ok && /belum dibayar/.test(open.errors[0]!), "SPP masih diajukan");
    const tooMuch = await kdSpp(v, "1000001");
    assert.ok(!tooMuch.ok && tooMuch.status === 400, "SPP kedua melebihi kebutuhan yang belum didanai (3jt - 2jt = 1jt)");
    await payOut(v, id);
    const e = await prisma.apbdesEntry.findMany({ where: { villageId: v, requestId: id } });
    assert.equal(e.length, 1, "BKU terbentuk lewat jalur SPP biasa");
    assert.equal(e[0]!.amountCents, 200_000_000n);
    const early = await inst(v, "500000", "2026-02-20");
    assert.ok(!early.ok && /lebih awal/.test(early.errors[0]!), "dibayar sebelum SPP dibayar");
    assert.ok((await inst(v, "1500000")).ok);
    const over = await inst(v, "600000");
    assert.ok(!over.ok && /tidak cukup/.test(over.errors[0]!) && /Rp500\.000/.test(over.errors[0]!), JSON.stringify(over));
    assert.ok((await inst(v, "500000")).ok, "tepat habis masih sah");
    const rows = await prisma.kdmpInstallment.findMany({ where: { villageId: v } });
    assert.ok(rows.every((x) => x.sppId === id));
    const ov = await kd.getOverview(prisma, { villageId: v, year: 2026, today: "2026-11-15" });
    assert.ok(ov.ok);
    assert.deepEqual([ov.data.funding.spps[0]!.gross, ov.data.funding.spps[0]!.used, ov.data.funding.spps[0]!.available], ["2000000.00", "2000000.00", "0.00"]);
    assert.equal(ov.data.funding.fundable, "1000000.00", "diterima 3jt, diangsur 2jt");
  });

  it("SPP ditolak melepas dananya; SPP butuh DPA disetujui; desa lain tak dapat memakai SPP desa ini", async () => {
    const v = await village("FR");
    await kdmpFund(v);
    const r = await kdSpp(v, "3000000");
    assert.ok(r.ok);
    assert.ok(!(await kdSpp(v, "1")).ok, "seluruh kebutuhan sudah didanai");
    assert.ok((await act(v, r.ok ? r.data.id : 0, "reject", { note: "salah" })).ok);
    assert.ok((await kdSpp(v, "3000000")).ok, "setelah ditolak, dana dapat diajukan lagi");

    const nodpa = await village("FD", { dpa: false });
    await kdmpFund(nodpa);
    const bad = await kdSpp(nodpa, "100000");
    assert.ok(!bad.ok && bad.status === 409 && /DPA/.test(bad.errors[0]!));

    const funded = await village("FF");
    await kdmpFund(funded);
    const fr = await kdSpp(funded, "1000000");
    assert.ok(fr.ok);
    await payOut(funded, fr.ok ? fr.data.id : 0);
    const other = await village("FO");
    await kdmpFund(other);
    const stolen = await inst(other, "100000");
    assert.ok(!stolen.ok && /belum ada SPP/.test(stolen.errors[0]!), "SPP desa lain tidak dihitung");
  });

  it("dua angsuran serentak yang bersama-sama melebihi dana SPP: tepat satu lolos", async () => {
    const v = await village("FC");
    await kdmpFund(v);
    const r = await kdSpp(v, "1000000");
    assert.ok(r.ok);
    await payOut(v, r.ok ? r.data.id : 0);
    const rs = await Promise.all([inst(v, "600000", "2026-03-10"), inst(v, "600000", "2026-03-11"), inst(v, "600000", "2026-03-12")]);
    assert.equal(rs.filter((x) => x.ok).length, 1, JSON.stringify(rs.map((x) => (x.ok ? "ok" : x.errors[0]))));
  });

  // ---- PKTD

  async function activity(v: number) {
    const a = await pk.createActivity(prisma, { villageId: v, userId: 1, input: { year: 2026, title: "Rabat jalan", cost: "10000000", plannedWage: "6000000", activityCode: "2.3.01" } });
    assert.ok(a.ok);
    const id = a.ok ? a.data.id : 0;
    const w: number[] = [];
    for (const n of ["A", "B"]) {
      const r = await pk.addWorker(prisma, { villageId: v, activityId: id, input: { name: `Pak ${n}`, gender: "L", priority: "PENGANGGUR" } });
      assert.ok(r.ok);
      w.push(r.ok ? r.data.id : 0);
    }
    return { id, w };
  }
  const days = (v: number, id: number, w: number[], o: Record<string, unknown> = {}) => pk.addWorkDays(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { workDate: "2026-03-02", task: "PELAKSANAAN", wage: "80000", workerIds: w, ...o } });

  it("PKTD: upah dibayar hanya dari SPP dibayar; menandai dibayar ikut digerbangi; panjar menghitung upah sebagai pertanggungjawaban dan sisanya dapat dikembalikan", async () => {
    const v = await village("FP");
    const { id, w } = await activity(v);
    assert.ok((await days(v, id, w, { paid: false })).ok, "mencatat hari kerja belum dibayar tak butuh SPP");
    const noSpp = await days(v, id, w, { workDate: "2026-03-03", paid: true });
    assert.ok(!noSpp.ok && noSpp.status === 409 && /belum ada SPP/.test(noSpp.errors[0]!));
    const pay0 = await pk.markPaid(prisma, { villageId: v, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-03-05" } });
    assert.ok(!pay0.ok && pay0.status === 409);
    const big = await pk.requestActivitySpp(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { ...REQ, amount: "6000001" } });
    assert.ok(!big.ok && big.status === 400, "melebihi kebutuhan upah (rencana Rp6.000.000)");
    const noExec = await pk.requestActivitySpp(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { ...REQ, executorName: "", amount: "200000" } });
    assert.ok(!noExec.ok && noExec.status === 400 && (noExec as { fieldErrors?: Record<string, string> }).fieldErrors?.executorName);
    const r = await pk.requestActivitySpp(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { ...REQ, amount: "300000" } });
    assert.ok(r.ok, JSON.stringify(r));
    await payOut(v, r.ok ? r.data.id : 0);
    assert.ok((await pk.markPaid(prisma, { villageId: v, activityId: id, now: NOW, input: { workDate: "2026-03-02", paidOn: "2026-03-05" } })).ok, "160.000 dari 300.000");
    const second = await days(v, id, w, { workDate: "2026-03-04", paid: true });
    assert.ok(!second.ok && /tidak cukup/.test(second.errors[0]!), "tersisa 140.000 < 160.000");
    const pj = await spp.listPanjar(prisma, v, 2026, NOW);
    assert.equal(pj.length, 1);
    assert.deepEqual([pj[0]!.given, pj[0]!.fromModule, pj[0]!.balance, pj[0]!.moduleKind], ["300000.00", "160000.00", "140000.00", "PKTD"]);
    const back = await spp.returnPanjar(prisma, { villageId: v, userId: 1, panjarId: pj[0]!.id, now: NOW, input: { date: "2026-03-20", accountCode: "5.2.1.01", amount: 140000, voucherNo: "STS-1", channel: "BANK" } });
    assert.ok(back.ok, JSON.stringify(back));
    const over = await spp.returnPanjar(prisma, { villageId: v, userId: 1, panjarId: pj[0]!.id, now: NOW, input: { date: "2026-03-21", accountCode: "5.2.1.01", amount: 1, voucherNo: "STS-2", channel: "BANK" } });
    assert.ok(!over.ok, "tidak bisa mengembalikan lebih dari sisa panjar");
    const view = await pk.getActivity(prisma, v, id);
    assert.ok(view.ok);
    assert.equal(view.data.funding.spps[0]!.available, "0.00");
    // sisa dana dikembalikan -> kebutuhan dapat diajukan lagi
    assert.ok(Number(view.data.funding.fundable) > 0);
  });

  it("PKTD: menghapus catatan hari kerja yang sudah dibayar mengembalikan dana SPP-nya", async () => {
    const v = await village("FQ");
    const { id, w } = await activity(v);
    const r = await pk.requestActivitySpp(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { ...REQ, amount: "160000" } });
    assert.ok(r.ok);
    await payOut(v, r.ok ? r.data.id : 0);
    assert.ok((await days(v, id, w, { paid: true, workDate: "2026-03-05" })).ok);
    assert.ok(!(await days(v, id, w, { paid: true, workDate: "2026-03-06" })).ok, "dana habis");
    assert.ok((await pk.deleteWorkDays(prisma, { villageId: v, activityId: id, date: new Date("2026-03-05"), allowPaid: true })).ok);
    assert.ok((await days(v, id, w, { paid: true, workDate: "2026-03-06" })).ok, "dana kembali setelah catatan dihapus");
  });

  // ---- BLT

  async function program(v: number) {
    const pr = await blt.createProgram(prisma, { villageId: v, userId: 1, input: { year: 2026, title: "BLT 2026", monthly: "300000", totalMonths: 6 } });
    assert.ok(pr.ok);
    const pid = pr.ok ? pr.data.id : 0;
    const bens: number[] = [];
    for (const n of ["Budi", "Siti"]) {
      seq += 1;
      const res = await prisma.resident.create({ data: { villageId: v, nik: `${String(Date.now() % 1e8).padStart(8, "0")}${String(seq).padStart(8, "0")}`, kk: `${String(Date.now() % 1e8).padStart(8, "1")}${String(seq).padStart(8, "0")}`, name: n, birthplace: "x", birthDate: new Date("1980-05-05"), gender: "Laki-laki", address: "Jl", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", rt: "01", rw: "02", occupation: "Buruh" } });
      const b = await blt.addBeneficiary(prisma, { villageId: v, programId: pid, input: { residentId: res.id, source: "PEMERINTAH", category: "Miskin ekstrem" } });
      assert.ok(b.ok);
      bens.push(b.ok ? b.data.id : 0);
    }
    return { pid, bens };
  }
  const decide = async (v: number, pid: number) => {
    const m = await prisma.villageMeeting.create({ data: { villageId: v, kind: "MUSDES_BLT", title: "Musdes BLT", scheduledOn: new Date("2026-02-01"), status: "HELD", heldOn: new Date("2026-02-01") } });
    assert.ok((await blt.patchProgram(prisma, { villageId: v, id: pid, input: { musdesMeetingId: m.id, decreeNumber: "1/Kpts/2026", decreeDate: "2026-02-15" } })).ok);
    assert.ok((await blt.changeStatus(prisma, { villageId: v, id: pid, action: "tetapkan" })).ok);
  };
  const bltPay = (v: number, pid: number, b: number, o: Record<string, unknown> = {}) => blt.addPayment(prisma, { villageId: v, programId: pid, userId: 1, now: NOW, input: { beneficiaryId: b, monthFrom: 1, method: "TUNAI", paidOn: "2026-03-10", ...o } });

  it("BLT: SPP baru bisa diajukan setelah program ditetapkan; pembayaran dilayani dari SPP dibayar; pembatalan pembayaran mengembalikan dana", async () => {
    const v = await village("FB");
    const { pid, bens } = await program(v);
    const early = await blt.requestProgramSpp(prisma, { villageId: v, programId: pid, userId: 1, now: NOW, input: { ...REQ, amount: "600000" } });
    assert.ok(!early.ok && early.status === 409 && /ditetapkan/.test(early.errors[0]!));
    await decide(v, pid);
    const big = await blt.requestProgramSpp(prisma, { villageId: v, programId: pid, userId: 1, now: NOW, input: { ...REQ, amount: "3600001" } });
    assert.ok(!big.ok && big.status === 400, "kebutuhan 2 penerima x 6 bulan x 300.000 = 3.600.000");
    assert.ok(!(await bltPay(v, pid, bens[0]!)).ok, "tanpa SPP");
    const r = await blt.requestProgramSpp(prisma, { villageId: v, programId: pid, userId: 1, now: NOW, input: { ...REQ, amount: "600000" } });
    assert.ok(r.ok, JSON.stringify(r));
    await payOut(v, r.ok ? r.data.id : 0);
    const p1 = await bltPay(v, pid, bens[0]!);
    const p2 = await bltPay(v, pid, bens[1]!);
    assert.ok(p1.ok && p2.ok);
    const p3 = await bltPay(v, pid, bens[0]!, { monthFrom: 2 });
    assert.ok(!p3.ok && /tidak cukup/.test(p3.errors[0]!), "dana SPP habis");
    const view = await blt.getProgram(prisma, v, pid);
    assert.ok(view.ok);
    assert.deepEqual([view.data.funding.spps[0]!.used, view.data.funding.spps[0]!.available], ["600000.00", "0.00"]);
    assert.equal(view.data.funding.fundable, "3000000.00", "kebutuhan 3,6jt - 0,6jt sudah dibayar; dana SPP terpakai tak lagi menganggur");
    assert.ok((await blt.voidPayment(prisma, { villageId: v, programId: pid, id: p1.ok ? p1.data.id : 0 })).ok);
    assert.ok((await bltPay(v, pid, bens[0]!, { monthFrom: 2 })).ok, "dana kembali setelah pembayaran dibatalkan");
    const pj = await spp.listPanjar(prisma, v, 2026, NOW);
    assert.equal(pj[0]!.moduleKind, "BLT");
    assert.equal(pj[0]!.fromModule, "600000.00");
  });

  it("BLT: desa lain tak dapat mengajukan SPP untuk program desa ini; SPP biasa tak mendanai modul", async () => {
    const a = await village("FX");
    const b = await village("FY");
    const { pid } = await program(a);
    await decide(a, pid);
    const r = await blt.requestProgramSpp(prisma, { villageId: b, programId: pid, userId: 1, now: NOW, input: { ...REQ, amount: "100000" } });
    assert.ok(!r.ok && r.status === 404);
    // SPP biasa (tanpa sumber) tidak menjadi dasar pembayaran program
    const plain = await spp.createRequest(prisma, { villageId: a, userId: 1, year: 2026, now: NOW, input: { activityCode: "2.3.01", mode: "SWAKELOLA", executorName: "Kaur", lines: [{ accountCode: "5.2.1.01", amount: 600_000 }] } });
    assert.ok(plain.ok);
    await payOut(a, plain.ok ? plain.data.id : 0);
    const { bens } = { bens: (await prisma.bltBeneficiary.findMany({ where: { programId: pid } })).map((x) => x.id) };
    const p = await bltPay(a, pid, bens[0]!);
    assert.ok(!p.ok && /belum ada SPP/.test(p.errors[0]!));
  });

  it("SPJ manual ditolak untuk panjar SPP modul (pertanggungjawaban otomatis); program/kegiatan dengan SPP aktif tak dapat dihapus; KDMP wajib bukti terlampir", async () => {
    const v = await village("FG");
    const { id } = await activity(v);
    const r = await pk.requestActivitySpp(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { ...REQ, amount: "160000" } });
    assert.ok(r.ok);
    const del = await pk.deleteActivity(prisma, { villageId: v, id });
    assert.ok(!del.ok && del.status === 409 && /SPP/.test(del.errors[0]!), "SPP diajukan");
    await payOut(v, r.ok ? r.data.id : 0);
    assert.ok(!(await pk.deleteActivity(prisma, { villageId: v, id })).ok, "SPP dibayar");
    const panjar = (await prisma.apbdesPanjar.findFirst({ where: { villageId: v } }))!;
    const spj = await spp.addPanjarSpj(prisma, { villageId: v, panjarId: panjar.id, now: NOW, input: { spjDate: "2026-03-05", voucherNo: "B-1", description: "bukti manual", amount: 160000 } });
    assert.ok(!spj.ok && spj.status === 409 && /otomatis/.test(spj.errors[0]!), JSON.stringify(spj));
    // SPP biasa (bukan modul) tetap dapat diberi SPJ manual
    const plain = await spp.createRequest(prisma, { villageId: v, userId: 1, year: 2026, now: NOW, input: { activityCode: "2.3.01", mode: "SWAKELOLA", executorName: "Kaur", lines: [{ accountCode: "5.2.1.01", amount: 100_000 }] } });
    assert.ok(plain.ok);
    await payOut(v, plain.ok ? plain.data.id : 0);
    const pj2 = (await prisma.apbdesPanjar.findFirst({ where: { villageId: v, requestId: plain.ok ? plain.data.id : 0 } }))!;
    assert.ok((await spp.addPanjarSpj(prisma, { villageId: v, panjarId: pj2.id, now: NOW, input: { spjDate: "2026-03-05", voucherNo: "B-2", description: "bukti", amount: 100000 } })).ok);

    const k = await village("FH");
    await kdmpFund(k);
    const noReceipt = await kdSpp(k, "100000", { hasReceipt: false });
    assert.ok(!noReceipt.ok && noReceipt.status === 400);

    const b = await village("FI");
    const { pid } = await program(b);
    await decide(b, pid);
    const rb = await blt.requestProgramSpp(prisma, { villageId: b, programId: pid, userId: 1, now: NOW, input: { ...REQ, amount: "600000" } });
    assert.ok(rb.ok);
    const cab = await blt.changeStatus(prisma, { villageId: b, id: pid, action: "cabut" });
    assert.ok(!cab.ok && cab.status === 409 && /SPP/.test(cab.errors[0]!));
    assert.ok((await act(b, rb.ok ? rb.data.id : 0, "reject", { note: "batal" })).ok);
    assert.ok((await blt.changeStatus(prisma, { villageId: b, id: pid, action: "cabut" })).ok, "SPP ditolak tidak lagi menghalangi");
  });

  it("pencatatan upah serentak dengan pengembalian panjar: dana SPP yang sama tidak dapat dibayarkan sekaligus dikembalikan (kunci modul)", async () => {
    for (let round = 0; round < 6; round++) {
      const v = await village(`FZ${round}`);
      const { id, w } = await activity(v);
      const r = await pk.requestActivitySpp(prisma, { villageId: v, activityId: id, userId: 1, now: NOW, input: { ...REQ, amount: "160000" } });
      assert.ok(r.ok);
      await payOut(v, r.ok ? r.data.id : 0);
      const pj = (await prisma.apbdesPanjar.findFirst({ where: { villageId: v } }))!;
      const [a, b] = await Promise.all([
        days(v, id, w, { paid: true, workDate: "2026-03-05" }),
        spp.returnPanjar(prisma, { villageId: v, userId: 1, panjarId: pj.id, now: NOW, input: { date: "2026-03-20", accountCode: "5.2.1.01", amount: 160000, voucherNo: `STS-${round}`, channel: "BANK" } }),
      ]);
      assert.equal([a.ok, b.ok].filter(Boolean).length, 1, `putaran ${round}: ${JSON.stringify([a.ok, b.ok])}`);
      const view = await spp.listPanjar(prisma, v, 2026, NOW);
      assert.ok(Number(view[0]!.balance) >= 0, `saldo panjar tak boleh negatif (putaran ${round}): ${view[0]!.balance}`);
    }
  });

  it("pilihan belanja memuat Dana Desa dan status DPA", async () => {
    const v = await village("FO2", { dpa: false });
    const o = await fund.budgetOptions(prisma, v, 2026);
    assert.ok(o.hasActiveDocument && o.options.length === 1);
    assert.deepEqual([o.options[0]!.activityCode, o.options[0]!.hasDanaDesa, o.options[0]!.dpaApproved, o.options[0]!.remaining], ["2.3.01", true, false, "5000000.00"]);
  });
});
