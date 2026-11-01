/** Tes integrasi BUMDes inti terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("BUMDes inti (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/bumdes/service");
  let apb: typeof import("../lib/apbdes/service");
  const villages: number[] = [];
  const NOW = new Date("2026-11-15T03:00:00Z");
  const TODAY = "2026-11-15";
  const tag = `${Date.now() % 1e6}${Math.floor(Math.random() * 90 + 10)}`;
  let seqV = 0;

  const mkVillage = async (name: string) => {
    const v = await prisma.village.create({ data: { code: `B${name}${tag}${seqV++}`.slice(0, 20), name, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    villages.push(v.id);
    return v.id;
  };
  const user = async (villageId: number) => (await prisma.user.create({ data: { villageId, email: `u${tag}${seqV++}@t.id`, name: "Op", password: "x", role: "admin" } as never })).id;
  /** Desa + BUMDes + dua unit + satu pengguna. */
  async function setup(name: string) {
    const villageId = await mkVillage(name);
    const userId = await user(villageId);
    const b = await prisma.bumdes.create({ data: { villageId, name: `BUM Desa ${name}` } });
    const u1 = await prisma.bumdesUnit.create({ data: { bumdesId: b.id, name: "Wisata" } });
    const u2 = await prisma.bumdesUnit.create({ data: { bumdesId: b.id, name: "Simpan Pinjam" } });
    return { villageId, userId, bumdesId: b.id, u1: u1.id, u2: u2.id, name: b.name };
  }
  type Ctx = Awaited<ReturnType<typeof setup>>;

  const cash = (c: Ctx, o: Record<string, unknown> = {}) => svc.createCashTransaction(prisma, { bumdesId: c.bumdesId, userId: c.userId, now: NOW, input: { unitId: c.u1, entryDate: "2026-03-01", direction: "income", amount: "1000000", category: "Tiket", ...o } });
  const cashOk = async (c: Ctx, o: Record<string, unknown> = {}) => {
    const r = await cash(c, o);
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };
  const report = async (c: Ctx, year: number, kind: "S1" | "S2" | "TAHUN") => {
    const r = await svc.getReport(prisma, c.bumdesId, year, kind);
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data : (null as never);
  };
  const period = (c: Ctx, year: number, half: number, action: "tutup" | "buka", extra: Record<string, unknown> = {}, now = NOW) => svc.actOnPeriod(prisma, { bumdesId: c.bumdesId, userId: c.userId, now, input: { year, half, action, ...extra } });
  const journal = (c: Ctx, o: Record<string, unknown> = {}) => svc.createManualJournal(prisma, { bumdesId: c.bumdesId, userId: c.userId, now: NOW, input: { unitId: null, entryDate: "2026-03-02", description: "Saldo awal", lines: [{ accountCode: "1.1.01.02", debit: "5000000" }, { accountCode: "3.3.01.01", credit: "5000000" }], ...o } });

  /** Musyawarah Desa beserta tiga butir keputusan; mengembalikan id rapat dan id butir. */
  const meeting = async (villageId: number, kind = "MUSDES_BUMDES", status = "FINAL") => {
    const m = await prisma.villageMeeting.create({ data: { villageId, kind, title: `Musdes ${kind}`, scheduledOn: new Date("2026-03-01"), status, heldOn: status === "PLANNED" ? null : new Date("2026-03-01") } });
    const decisions: number[] = [];
    for (let i = 1; i <= 3; i++) decisions.push((await prisma.villageMeetingDecision.create({ data: { meetingId: m.id, seq: i, text: `Keputusan ${i}` } })).id);
    return { id: m.id, decisions };
  };

  /** Menjalankan semua pernyataan CHECK dari berkas migrasi pada DB scratch (idempoten). */
  async function applyChecks() {
    const sql = readFileSync("docs/PHASE3_BUMDES_MIGRATION.sql", "utf8");
    const stmts = sql.split("\n").filter((l) => /^ALTER TABLE `bumdes_[a-z_]+` ADD CONSTRAINT `[a-z_]+_chk` CHECK/.test(l));
    assert.ok(stmts.length >= 16);
    for (const s of stmts) {
      const name = /ADD CONSTRAINT `([a-z_]+)`/.exec(s)![1]!;
      const have = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT COUNT(*) AS n FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = '${name}'`);
      const table = /^ALTER TABLE `([a-z_]+)`/.exec(s)![1]!;
      // Selalu pasang definisi terbaru dari berkas migrasi (CHECK lama pada DB scratch diganti).
      if (Number(have[0]!.n) > 0) await prisma.$executeRawUnsafe(`ALTER TABLE \`${table}\` DROP CHECK \`${name}\``);
      await prisma.$executeRawUnsafe(s.replace(/;$/, ""));
    }
  }

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/bumdes/service");
    apb = await import("../lib/apbdes/service");
    await applyChecks();
  });
  after(async () => {
    for (const id of villages) await prisma.village.delete({ where: { id } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("transaksi kas menghasilkan jurnal berpasangan, bernomor, dan masuk ke neraca dan laba rugi", async () => {
    const c = await setup("A1");
    const t = await cashOk(c, { amount: "1500000.50", accountCode: "4.1.01.01", cashAccountCode: "1.1.01.02" });
    const j = await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: t.journalId }, include: { lines: true } });
    assert.equal(j.source, "KAS");
    assert.equal(j.transactionId, t.id);
    assert.equal(j.totalDebitCents, 150_000_050n);
    assert.equal(j.totalCreditCents, 150_000_050n);
    assert.equal(j.voucherNo, `0001/03/U${c.u1}/2026`);
    const dr = j.lines.find((l) => l.accountCode === "1.1.01.02")!;
    const cr = j.lines.find((l) => l.accountCode === "4.1.01.01")!;
    assert.equal(dr.debitCents, 150_000_050n);
    assert.equal(cr.creditCents, 150_000_050n);
    const rep = await report(c, 2026, "TAHUN");
    const wisata = rep.entities.find((e) => e.unitId === c.u1)!;
    assert.equal(wisata.labaRugi.labaBersih, "1500000.50");
    assert.equal(wisata.neraca.totalAset, "1500000.50");
    assert.equal(wisata.neraca.balanced, true);
    assert.equal(rep.consolidated.neraca.balanced, true);
    // nomor urut naik
    const t2 = await cashOk(c, { entryDate: "2026-03-09" });
    const j2 = await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: t2.journalId } });
    assert.equal(j2.voucherNo, `0002/03/U${c.u1}/2026`);
  });

  it("ubah transaksi: wajib alasan, isi lama masuk riwayat, jurnal lama dibatalkan dan diganti, laporan mengikuti", async () => {
    const c = await setup("A2");
    const t = await cashOk(c, { amount: "1000000", category: "Tiket" });
    const upd = (o: Record<string, unknown>) => svc.updateCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: o });
    assert.equal((await upd({ amount: "1200000" })).ok, false, "tanpa alasan ditolak");
    assert.equal((await upd({ amount: "1000000", reason: "tidak berubah" })).ok, false, "tanpa perubahan ditolak");
    const r = await upd({ amount: "1200000", category: "Tiket VIP", reason: "Salah nominal" });
    assert.ok(r.ok && r.data.revision === 1, JSON.stringify(r));
    const row = await prisma.bumdesTransaction.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(String(row.amount), "1200000");
    assert.equal(row.category, "Tiket VIP");
    assert.equal(row.status, "AKTIF");
    const hist = await svc.transactionHistory(prisma, c.bumdesId, t.id);
    assert.ok(hist.ok && hist.data.revisions.length === 1);
    const rev = hist.ok ? hist.data.revisions[0]! : (null as never);
    assert.equal(rev.action, "UBAH");
    assert.equal(rev.reason, "Salah nominal");
    assert.equal((rev.before as { amount: string }).amount, "1000000.00");
    assert.equal((rev.after as { amount: string }).amount, "1200000.00");
    const js = await prisma.bumdesJournal.findMany({ where: { transactionId: t.id }, orderBy: { id: "asc" } });
    assert.equal(js.length, 2);
    assert.equal(js[0]!.status, "DIBATALKAN");
    assert.match(js[0]!.voidReason ?? "", /Salah nominal/);
    assert.equal(js[1]!.status, "AKTIF");
    assert.equal(js[1]!.correctsId, js[0]!.id);
    assert.equal(js[1]!.totalDebitCents, 120_000_000n);
    const rep = await report(c, 2026, "TAHUN");
    assert.equal(rep.consolidated.labaRugi.labaBersih, "1200000.00", "jurnal lama tidak ikut terhitung");
    // dua kali ubah: revisi 2
    const r2 = await upd({ amount: "900000", reason: "Koreksi kedua" });
    assert.ok(r2.ok && r2.data.revision === 2);
    assert.equal((await prisma.bumdesTransactionRevision.count({ where: { transactionId: t.id } })), 2);
    assert.equal((await prisma.bumdesJournal.count({ where: { transactionId: t.id, status: "AKTIF" } })), 1);
  });

  it("batalkan transaksi: baris tetap ada berstatus DIBATALKAN, jurnal ikut batal, tak masuk ringkasan, tak bisa diubah/dibatalkan lagi", async () => {
    const c = await setup("A3");
    const keep = await cashOk(c, { amount: "300000" });
    const t = await cashOk(c, { amount: "700000" });
    const bad = await svc.voidCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: {} });
    assert.equal(bad.ok, false, "alasan wajib");
    const v = await svc.voidCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { reason: "Input ganda" } });
    assert.ok(v.ok);
    const row = await prisma.bumdesTransaction.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(row.status, "DIBATALKAN");
    assert.equal(row.voidReason, "Input ganda");
    assert.ok(row.voidedAt && row.voidedById === c.userId);
    assert.equal((await prisma.bumdesJournal.count({ where: { transactionId: t.id, status: "AKTIF" } })), 0);
    const sum = await svc.cashSummary(prisma, c.bumdesId);
    assert.equal(sum.totalIncome, 300_000);
    assert.equal(sum.voidedCount, 1);
    assert.equal((await svc.voidCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { reason: "lagi" } })).ok, false);
    const upd = await svc.updateCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { amount: "1", reason: "mengubah yang batal" } });
    assert.ok(!upd.ok && upd.status === 409);
    const rep = await report(c, 2026, "TAHUN");
    assert.equal(rep.consolidated.labaRugi.labaBersih, "300000.00");
    assert.ok(keep.id > 0);
    const hist = await svc.transactionHistory(prisma, c.bumdesId, t.id);
    assert.ok(hist.ok && hist.data.revisions[0]!.action === "BATAL");
  });

  it("pagar DB: jurnal tak seimbang, baris dua sisi, status liar, dan arus nol ditolak MySQL meski melewati aplikasi", async () => {
    const c = await setup("A4");
    const bad = (fn: () => Promise<unknown>) => assert.rejects(fn, /check constraint|CHECK/i);
    const head = { bumdesId: c.bumdesId, entryDate: new Date("2026-03-01"), year: 2026, voucherNo: "x", description: "d", source: "MANUAL" };
    await bad(() => prisma.bumdesJournal.create({ data: { ...head, seq: 901, totalDebitCents: 100n, totalCreditCents: 99n } }));
    await bad(() => prisma.bumdesJournal.create({ data: { ...head, seq: 902, totalDebitCents: 0n, totalCreditCents: 0n } }));
    await bad(() => prisma.bumdesJournal.create({ data: { ...head, seq: 903, totalDebitCents: 5n, totalCreditCents: 5n, source: "LAIN" } }));
    await bad(() => prisma.bumdesJournal.create({ data: { ...head, seq: 904, totalDebitCents: 5n, totalCreditCents: 5n, status: "HAPUS" } }));
    const okj = await prisma.bumdesJournal.create({ data: { ...head, seq: 905, totalDebitCents: 5n, totalCreditCents: 5n } });
    await bad(() => prisma.bumdesJournalLine.create({ data: { journalId: okj.id, lineNo: 1, accountCode: "1.1.01.01", debitCents: 5n, creditCents: 5n } }));
    await bad(() => prisma.bumdesJournalLine.create({ data: { journalId: okj.id, lineNo: 2, accountCode: "1.1.01.01", debitCents: 0n, creditCents: 0n } }));
    await bad(() => prisma.bumdesJournalLine.create({ data: { journalId: okj.id, lineNo: 3, accountCode: "1.1.01.01", debitCents: -5n, creditCents: 0n } }));
    await bad(() => prisma.bumdesJournal.update({ where: { id: okj.id }, data: { totalCreditCents: 6n } }));
    await bad(() => prisma.bumdesJournal.update({ where: { id: okj.id }, data: { status: "DIBATALKAN" } }));
    await bad(() => prisma.bumdesPeriodClose.create({ data: { bumdesId: c.bumdesId, year: 2026, half: 3, profitCents: 0n, assetCents: 0n } }));
    const mt = await meeting(c.villageId, "MUSDES_BUMDES", "FINAL");
    const rs = await prisma.bumdesMusdesResolution.create({ data: { bumdesId: c.bumdesId, kind: "BAGI_HASIL", musdesMeetingId: mt.id, decisionId: mt.decisions[0]!, fiscalYear: 2025, amountCents: 1000n } });
    await bad(() => prisma.bumdesVillageFlow.create({ data: { bumdesId: c.bumdesId, resolutionId: rs.id, kind: "BAGI_HASIL", flowDate: new Date("2026-03-01"), amountCents: 0n, musdesMeetingId: mt.id, cashAccountCode: "1.1.01.01", apbdesYear: 2026 } }));
    await bad(() => prisma.bumdesVillageFlow.create({ data: { bumdesId: c.bumdesId, resolutionId: rs.id, kind: "LAINNYA", flowDate: new Date("2026-03-01"), amountCents: 5n, musdesMeetingId: mt.id, cashAccountCode: "1.1.01.01", apbdesYear: 2026 } }));
    await bad(() => prisma.bumdesMusdesResolution.create({ data: { bumdesId: c.bumdesId, kind: "BAGI_HASIL", musdesMeetingId: mt.id, decisionId: mt.decisions[0]!, amountCents: 0n } }));
    await bad(() => prisma.bumdesMusdesResolution.create({ data: { bumdesId: c.bumdesId, kind: "LAIN", musdesMeetingId: mt.id, decisionId: mt.decisions[0]!, amountCents: 5n } }));
    await bad(() => prisma.bumdesJournal.create({ data: { ...head, seq: 906, totalDebitCents: 5n, totalCreditCents: 5n, source: "SALDO_AWAL2" } }));
    const t = await cashOk(c);
    await bad(() => prisma.bumdesTransaction.update({ where: { id: t.id }, data: { status: "DIBATALKAN" } }));
    await bad(() => prisma.bumdesTransaction.update({ where: { id: t.id }, data: { status: "LAIN" } }));
  });

  it("jurnal manual: tak seimbang ditolak di server; koreksi mengganti jurnal lama; hanya jurnal manual yang bisa dikoreksi/dibatalkan langsung", async () => {
    const c = await setup("A5");
    const bad = await journal(c, { lines: [{ accountCode: "1.1.01.02", debit: "100" }, { accountCode: "3.3.01.01", credit: "99" }] });
    assert.ok(!bad.ok && /tidak seimbang/.test(bad.errors[0]!));
    assert.equal(await prisma.bumdesJournal.count({ where: { bumdesId: c.bumdesId } }), 0, "tak ada yang tertulis");
    const j = await journal(c);
    assert.ok(j.ok && j.data.voucherNo === "0001/03/PUSAT/2026");
    const jid = j.ok ? j.data.id : 0;
    const noReason = await svc.correctManualJournal(prisma, { bumdesId: c.bumdesId, journalId: jid, userId: c.userId, now: NOW, input: { unitId: null, entryDate: "2026-03-02", description: "x", lines: [{ accountCode: "1.1.01.02", debit: "10" }, { accountCode: "3.3.01.01", credit: "10" }] } });
    assert.equal(noReason.ok, false, "koreksi wajib alasan");
    const fix = await svc.correctManualJournal(prisma, { bumdesId: c.bumdesId, journalId: jid, userId: c.userId, now: NOW, input: { reason: "Salah nominal", unitId: null, entryDate: "2026-03-02", description: "Saldo awal (benar)", lines: [{ accountCode: "1.1.01.02", debit: "6000000" }, { accountCode: "3.3.01.01", credit: "6000000" }] } });
    assert.ok(fix.ok, JSON.stringify(fix));
    const old = await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: jid } });
    assert.equal(old.status, "DIBATALKAN");
    const neu = await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: fix.ok ? fix.data.id : 0 } });
    assert.equal(neu.correctsId, jid);
    assert.equal(neu.totalDebitCents, 600_000_000n);
    const rep = await report(c, 2026, "TAHUN");
    assert.equal(rep.consolidated.neraca.totalAset, "6000000.00");
    assert.equal((await svc.correctManualJournal(prisma, { bumdesId: c.bumdesId, journalId: jid, userId: c.userId, now: NOW, input: { reason: "lagi", unitId: null, entryDate: "2026-03-02", description: "x", lines: [{ accountCode: "1.1.01.02", debit: "10" }, { accountCode: "3.3.01.01", credit: "10" }] } })).ok, false, "jurnal batal tak bisa dikoreksi lagi");
    const t = await cashOk(c);
    const viaManual = await svc.voidManualJournal(prisma, { bumdesId: c.bumdesId, journalId: t.journalId, userId: c.userId, now: NOW, input: { reason: "mencoba" } });
    assert.ok(!viaManual.ok && viaManual.status === 409, "jurnal turunan kas tak bisa dibatalkan lewat jurnal");
    const v = await svc.voidManualJournal(prisma, { bumdesId: c.bumdesId, journalId: neu.id, userId: c.userId, now: NOW, input: { reason: "Dobel" } });
    assert.ok(v.ok);
    const list = await svc.listJournals(prisma, c.bumdesId, { page: 1, pageSize: 50, status: "AKTIF" });
    assert.equal(list.items.every((x) => x.status === "AKTIF"), true);
    assert.equal(list.total, 1);
  });

  it("neraca per unit dan gabungan seimbang; RK pusat/unit dieliminasi; semester dan tahunan konsisten", async () => {
    const c = await setup("A6");
    assert.ok((await journal(c, { entryDate: "2026-01-05" })).ok);
    // Pusat menyalurkan 2 juta ke unit wisata (kedua sisi)
    assert.ok((await journal(c, { entryDate: "2026-01-10", lines: [{ accountCode: "1.1.99.01", debit: "2000000" }, { accountCode: "1.1.01.02", credit: "2000000" }] })).ok);
    assert.ok((await journal(c, { unitId: c.u1, entryDate: "2026-01-10", description: "Terima dari pusat", lines: [{ accountCode: "1.1.01.01", debit: "2000000" }, { accountCode: "3.8.01.01", credit: "2000000" }] })).ok);
    await cashOk(c, { entryDate: "2026-02-01", amount: "800000", accountCode: "4.1.01.01" });
    await cashOk(c, { entryDate: "2026-02-03", direction: "expense", amount: "300000", accountCode: "6.2.01.01" });
    await cashOk(c, { unitId: c.u2, entryDate: "2026-08-03", amount: "500000", accountCode: "4.1.08.01", cashAccountCode: "1.1.01.02" });
    const s1 = await report(c, 2026, "S1");
    const s2 = await report(c, 2026, "S2");
    const th = await report(c, 2026, "TAHUN");
    for (const r of [s1, s2, th]) {
      for (const e of r.entities) assert.equal(e.neraca.balanced, true, `${r.kind} ${e.name}`);
      assert.equal(r.consolidated.neraca.balanced, true, `${r.kind} gabungan`);
      assert.equal(r.elimination.balanced, true);
    }
    assert.equal(s1.consolidated.labaRugi.labaBersih, "500000.00");
    assert.equal(s2.consolidated.labaRugi.labaBersih, "500000.00");
    assert.equal(th.consolidated.labaRugi.labaBersih, "1000000.00");
    assert.equal(s2.consolidated.neraca.ekuitas.lines.find((l) => l.code === "LABA-BERJALAN")!.amount, "1000000.00");
    assert.equal(th.consolidated.neraca.totalAset, "6000000.00".replace("6000000.00", "6000000.00"), "kas bank 5jt-2jt + kas wisata 2jt+0.8jt-0.3jt + kas bank unit SP 0.5jt");
    assert.equal(th.elimination.rkUnit, "2000000.00");
    assert.equal(th.elimination.rkPusat, "-2000000.00");
    assert.ok(!th.consolidated.neraca.aset.lines.some((l) => l.code === "1.1.99.01"));
    const pusat = th.entities.find((e) => e.unitId === null)!;
    const wisata = th.entities.find((e) => e.unitId === c.u1)!;
    assert.equal(pusat.neraca.totalAset, "5000000.00");
    assert.equal(wisata.neraca.totalAset, "2500000.00");
    // RK yang timpang → terlihat sebagai temuan dan neraca gabungan tak lagi seimbang
    assert.ok((await journal(c, { entryDate: "2026-03-10", lines: [{ accountCode: "1.1.99.01", debit: "100" }, { accountCode: "1.1.01.02", credit: "100" }] })).ok);
    const sk = await report(c, 2026, "TAHUN");
    assert.equal(sk.elimination.balanced, false);
    assert.equal(sk.consolidated.neraca.balanced, false);
    assert.ok(sk.findings.some((f) => /RK/.test(f.message)));
  });

  it("neraca: transaksi lama tanpa jurnal dilaporkan, dapat disusun jurnalnya, dan periode tak bisa ditutup sebelum itu", async () => {
    const c = await setup("A7");
    await prisma.bumdesTransaction.create({ data: { bumdesId: c.bumdesId, unitId: c.u1, entryDate: new Date("2026-02-01"), direction: "income", amount: "250000", category: "Lama", createdBy: c.userId } });
    await prisma.bumdesTransaction.create({ data: { bumdesId: c.bumdesId, unitId: c.u1, entryDate: new Date("2026-02-02"), direction: "expense", amount: "50000", category: "Lama 2", createdBy: c.userId } });
    const before = await report(c, 2026, "S1");
    assert.ok(before.findings.some((f) => /2 transaksi kas belum berjurnal/.test(f.message)));
    const p = await svc.getPeriods(prisma, c.bumdesId, 2026, NOW);
    assert.ok(p.ok && /2 transaksi kas belum berjurnal/.test(p.data.periods[0]!.closeBlocker ?? ""));
    const blocked = await period(c, 2026, 1, "tutup");
    assert.ok(!blocked.ok && /belum berjurnal/.test(blocked.errors[0]!));
    const j = await svc.journalizeLegacy(prisma, { bumdesId: c.bumdesId, userId: c.userId });
    assert.ok(j.ok && j.data.created === 2 && j.data.remaining === 0, JSON.stringify(j));
    const after = await report(c, 2026, "S1");
    assert.equal(after.consolidated.labaRugi.labaBersih, "200000.00");
    assert.equal(after.consolidated.neraca.balanced, true);
    assert.equal(await svc.legacyCount(prisma, c.bumdesId), 0);
    const again = await svc.journalizeLegacy(prisma, { bumdesId: c.bumdesId, userId: c.userId });
    assert.ok(again.ok && again.data.created === 0, "idempoten");
    assert.ok((await period(c, 2026, 1, "tutup")).ok);
  });

  it("penutupan periode: urutan, tak bisa sebelum berakhir, menahan segala tulisan, buka kembali wajib alasan dan tercatat", async () => {
    const c = await setup("A8");
    const t = await cashOk(c, { entryDate: "2026-02-10", amount: "400000" });
    await cashOk(c, { entryDate: "2026-09-10", amount: "100000" });
    const jm = await journal(c, { entryDate: "2026-02-11" });
    assert.ok(jm.ok);
    assert.equal((await period(c, 2026, 2, "tutup")).ok, false, "S2 butuh S1 dulu");
    assert.equal((await period(c, 2026, 1, "tutup", {}, new Date("2026-06-15T00:00:00Z"))).ok, false, "S1 belum berakhir");
    const closed = await period(c, 2026, 1, "tutup");
    assert.ok(closed.ok, JSON.stringify(closed));
    const row = await prisma.bumdesPeriodClose.findFirstOrThrow({ where: { bumdesId: c.bumdesId, year: 2026, half: 1 } });
    assert.equal(row.profitCents, 40_000_000n);
    assert.equal(row.assetCents, 40_000_000n + 500_000_000n);
    assert.equal((await period(c, 2026, 1, "tutup")).ok, false, "tak bisa ditutup dua kali");
    // semua tulisan pada S1 ditolak
    const reject = (r: { ok: boolean; status?: number; errors?: string[] }, msg: string) => {
      assert.equal(r.ok, false, msg);
      assert.match((r.errors ?? [])[0] ?? "", /sudah ditutup/, msg);
    };
    reject(await cash(c, { entryDate: "2026-03-01" }), "tambah transaksi");
    reject(await svc.updateCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { amount: "1", reason: "mencoba ubah" } }), "ubah transaksi");
    reject(await svc.updateCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { entryDate: "2026-09-01", reason: "pindah ke S2 pun ditolak" } }), "pindah dari S1");
    reject(await svc.voidCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { reason: "mencoba batal" } }), "batal transaksi");
    reject(await journal(c, { entryDate: "2026-04-01" }), "jurnal manual");
    reject(await svc.voidManualJournal(prisma, { bumdesId: c.bumdesId, journalId: jm.ok ? jm.data.id : 0, userId: c.userId, now: NOW, input: { reason: "mencoba batal" } }), "batal jurnal");
    reject(await svc.correctManualJournal(prisma, { bumdesId: c.bumdesId, journalId: jm.ok ? jm.data.id : 0, userId: c.userId, now: NOW, input: { reason: "mencoba koreksi", unitId: null, entryDate: "2026-09-01", description: "x", lines: [{ accountCode: "1.1.01.02", debit: "10" }, { accountCode: "3.3.01.01", credit: "10" }] } }), "koreksi jurnal");
    // S2 masih terbuka; menulis ke S2 boleh
    await cashOk(c, { entryDate: "2026-10-10", amount: "10000" });
    // laporan S1 tetap sama setelah S2 bertambah
    const s1 = await report(c, 2026, "S1");
    assert.equal(s1.consolidated.labaRugi.labaBersih, "400000.00");
    assert.deepEqual(s1.periodState, [{ half: 1, state: "DITUTUP" }]);
    // buka kembali: wajib alasan
    assert.equal((await period(c, 2026, 1, "buka")).ok, false);
    assert.equal((await period(c, 2026, 1, "buka", { reason: "ab" })).ok, false);
    assert.ok((await period(c, 2026, 2, "buka", { reason: "belum tertutup" })).ok === false, "S2 belum ditutup");
    // S2 ditutup lagi → S1 tak bisa dibuka sebelum S2
    const skip = await period(c, 2027, 1, "tutup", {}, new Date("2028-01-01T00:00:00Z"));
    assert.ok(!skip.ok && /Semester II 2026/.test(skip.errors[0]!), "rantai antar tahun: S2 2026 harus ditutup dulu");
    const s2 = await period(c, 2026, 2, "tutup", {}, new Date("2027-02-01T00:00:00Z"));
    assert.ok(s2.ok, JSON.stringify(s2));
    assert.ok((await period(c, 2027, 1, "tutup", {}, new Date("2028-01-01T00:00:00Z"))).ok, "setelah S2 2026 tertutup, S1 2027 boleh");
    const crossYear = await period(c, 2026, 2, "buka", { reason: "Menambah bukti S2" });
    assert.ok(!crossYear.ok && /Semester I 2027/.test(crossYear.errors[0]!), "buka kembali ditolak bila ada penutupan lebih akhir lintas tahun");
    assert.ok((await period(c, 2027, 1, "buka", { reason: "Urutan pembukaan" })).ok);
    const blockedOpen = await period(c, 2026, 1, "buka", { reason: "Koreksi nominal sewa" });
    assert.ok(!blockedOpen.ok && /Semester II/.test(blockedOpen.errors[0]!));
    assert.ok((await period(c, 2026, 2, "buka", { reason: "Menambah bukti S2" })).ok);
    const op = await period(c, 2026, 1, "buka", { reason: "Koreksi nominal sewa" });
    assert.ok(op.ok);
    // sesudah dibuka, koreksi bisa
    const fix = await svc.updateCashTransaction(prisma, { bumdesId: c.bumdesId, id: t.id, userId: c.userId, now: NOW, input: { amount: "450000", reason: "Koreksi nominal sewa" } });
    assert.ok(fix.ok, JSON.stringify(fix));
    const logs = await prisma.bumdesPeriodLog.findMany({ where: { bumdesId: c.bumdesId, year: 2026 }, orderBy: { id: "asc" } });
    assert.deepEqual(logs.map((l) => `${l.half}${l.action}`), ["1TUTUP", "2TUTUP", "2BUKA", "1BUKA"]);
    assert.equal(logs[3]!.reason, "Koreksi nominal sewa");
    const late = await svc.getPeriods(prisma, c.bumdesId, 2026, new Date("2027-08-01T00:00:00Z"));
    assert.ok(late.ok && late.data.reminders[0]?.level === "WARN" && /2027-06-30/.test(late.data.reminders[0].message), "tenggat Musdes tahunan 6 bulan");
    const early = await svc.getPeriods(prisma, c.bumdesId, 2026, new Date("2027-02-01T00:00:00Z"));
    assert.ok(early.ok && early.data.reminders[0]?.level === "INFO");
    const mid = await svc.getPeriods(prisma, c.bumdesId, 2026, new Date("2026-09-01T00:00:00Z"));
    assert.ok(mid.ok && mid.data.reminders.length === 0);
  });

  it("balapan: banyak pencatatan serentak mendapat nomor jurnal berbeda; penutupan periode serentak dengan pencatatan tak menyelipkan data", async () => {
    const c = await setup("A9");
    const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => cash(c, { entryDate: `2026-03-${String(10 + i).padStart(2, "0")}`, amount: String(1000 + i) })));
    assert.equal(rs.filter((r) => r.ok).length, 8, JSON.stringify(rs.filter((r) => !r.ok)));
    const js = await prisma.bumdesJournal.findMany({ where: { bumdesId: c.bumdesId, year: 2026 }, select: { seq: true } });
    assert.deepEqual(js.map((j) => j.seq).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8]);

    // Balapan tutup vs catat: pada tahun berbeda tiap putaran, snapshot yang disimpan harus sama dengan laporan sekarang.
    for (let round = 0; round < 10; round++) {
      const year = 2010 + round;
      const sc = await Promise.all([
        period(c, year, 1, "tutup", {}, new Date(`${year}-12-01T00:00:00Z`)),
        svc.createCashTransaction(prisma, { bumdesId: c.bumdesId, userId: c.userId, now: new Date(`${year}-12-01T00:00:00Z`), input: { unitId: c.u1, entryDate: `${year}-03-05`, direction: "income", amount: "777", category: "Balapan" } }),
        svc.createCashTransaction(prisma, { bumdesId: c.bumdesId, userId: c.userId, now: new Date(`${year}-12-01T00:00:00Z`), input: { unitId: c.u1, entryDate: `${year}-04-05`, direction: "income", amount: "333", category: "Balapan" } }),
      ]);
      void sc;
      const closeRow = await prisma.bumdesPeriodClose.findFirst({ where: { bumdesId: c.bumdesId, year, half: 1 } });
      if (!closeRow) continue; // penutupan ditolak (mis. transaksi belum berjurnal tak mungkin; bila ditolak, tak ada yang dipertaruhkan)
      const rep = await report(c, year, "S1");
      assert.equal(fromCentsStr(closeRow.profitCents), rep.consolidated.labaRugi.labaBersih, `putaran ${year}: angka saat ditutup harus = laporan sekarang`);
    }
  });

  it("isolasi desa: desa lain tak dapat mengubah, membatalkan, membaca, atau menutup milik desa ini", async () => {
    const a = await setup("IA");
    const b = await setup("IB");
    const t = await cashOk(a, { entryDate: "2026-02-02" });
    const jm = await journal(a);
    assert.ok(jm.ok);
    const upd = await svc.updateCashTransaction(prisma, { bumdesId: b.bumdesId, id: t.id, userId: b.userId, now: NOW, input: { amount: "1", reason: "serangan lintas desa" } });
    assert.ok(!upd.ok && upd.status === 404);
    assert.ok(!(await svc.voidCashTransaction(prisma, { bumdesId: b.bumdesId, id: t.id, userId: b.userId, now: NOW, input: { reason: "serangan lintas desa" } })).ok);
    assert.ok(!(await svc.voidManualJournal(prisma, { bumdesId: b.bumdesId, journalId: jm.ok ? jm.data.id : 0, userId: b.userId, now: NOW, input: { reason: "serangan lintas desa" } })).ok);
    assert.ok(!(await svc.transactionHistory(prisma, b.bumdesId, t.id)).ok);
    // unit milik desa lain tak bisa dipakai
    const cross = await cash(b, { unitId: a.u1 });
    assert.ok(!cross.ok && cross.status === 404);
    const crossJ = await journal(b, { unitId: a.u1 });
    assert.equal(crossJ.ok, false);
    const lb = await svc.listJournals(prisma, b.bumdesId, { page: 1, pageSize: 50 });
    assert.equal(lb.total, 0);
    const rb = await report(b, 2026, "TAHUN");
    assert.equal(rb.consolidated.labaRugi.labaBersih, "0.00");
    assert.ok(rb.consolidated.empty);
    // penutupan desa B tak menyentuh A
    assert.ok((await period(b, 2026, 1, "tutup")).ok);
    assert.equal(await prisma.bumdesPeriodClose.count({ where: { bumdesId: a.bumdesId } }), 0);
    assert.ok((await cash(a, { entryDate: "2026-02-03" })).ok);
    // Musyawarah Desa milik desa lain tak bisa dihubungkan
    const mB = await meeting(b.villageId);
    const leg = await svc.saveLegal(prisma, { villageId: a.villageId, bumdesId: a.bumdesId, userId: a.userId, input: { establishMeetingId: mB.id } });
    assert.ok(!leg.ok && leg.fieldErrors?.establishMeetingId);
    const crossRes = await svc.createResolution(prisma, { villageId: a.villageId, bumdesId: a.bumdesId, userId: a.userId, input: { kind: "BAGI_HASIL", musdesMeetingId: mB.id, decisionId: mB.decisions[0], amount: "1000", fiscalYear: 2025 } });
    assert.ok(!crossRes.ok && crossRes.fieldErrors?.musdesMeetingId, "Musdes desa lain tak bisa jadi dasar keputusan");
    const resB = await svc.createResolution(prisma, { villageId: b.villageId, bumdesId: b.bumdesId, userId: b.userId, input: { kind: "BAGI_HASIL", musdesMeetingId: mB.id, decisionId: mB.decisions[0], amount: "1000", fiscalYear: 2025 } });
    assert.ok(resB.ok);
    const flowCross = await svc.createFlow(prisma, { villageId: a.villageId, bumdesId: a.bumdesId, bumdesName: a.name, userId: a.userId, now: NOW, input: { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "1000", resolutionId: resB.ok ? resB.data.id : 0, cashAccountCode: "1.1.01.02" } });
    assert.ok(!flowCross.ok && flowCross.fieldErrors?.resolutionId, "keputusan desa lain tak bisa dipakai");
    assert.ok(!(await svc.voidResolution(prisma, { bumdesId: a.bumdesId, id: resB.ok ? resB.data.id : 0, userId: a.userId, input: { reason: "serangan lintas desa" } })).ok);
    // pengurus dan arus: id desa lain
    const off = await svc.addOfficer(prisma, { bumdesId: a.bumdesId, input: { role: "BENDAHARA", name: "Sari" } });
    assert.ok(off.ok);
    const del = await svc.removeOfficer(prisma, { bumdesId: b.bumdesId, id: off.ok ? off.data.id : 0 });
    assert.ok(!del.ok && del.status === 404);
    assert.ok(!(await svc.updateOfficer(prisma, { bumdesId: b.bumdesId, id: off.ok ? off.data.id : 0, input: { role: "BENDAHARA", name: "Dicuri" } })).ok);
  });

  it("legalitas dan pengurus: simpan, temuan tenggat 20 hari kerja, masa jabatan 5 tahun, daftar kelengkapan", async () => {
    const c = await setup("L1");
    const m = await prisma.villageMeeting.create({ data: { villageId: c.villageId, kind: "MUSDES_LAINNYA", title: "Musdes pendirian BUM Desa", scheduledOn: new Date("2026-01-10"), status: "FINAL", heldOn: new Date("2026-01-10") } });
    const bad = await svc.saveLegal(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { nib: "123", npwp: "1" } });
    assert.ok(!bad.ok && bad.fieldErrors?.nib && bad.fieldErrors?.npwp);
    const s = await svc.saveLegal(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { legalStatus: "BELUM_DAFTAR", establishMeetingId: m.id, perdesNumber: "Perdes 2/2026", perdesDate: "2026-02-02", artNumber: "Perkades 1/2026", artDate: "2026-02-10", nib: "1234567890123", npwp: "01.234.567.8-901.000", businessFields: "Air bersih", initialCapital: "50000000" } });
    assert.ok(s.ok, JSON.stringify(s));
    assert.ok((await svc.addOfficer(prisma, { bumdesId: c.bumdesId, input: { role: "PELAKSANA_OPERASIONAL", name: "Budi", startOn: "2020-01-01" } })).ok);
    assert.ok((await svc.addOfficer(prisma, { bumdesId: c.bumdesId, input: { role: "BENDAHARA", name: "Sari", startOn: "2026-01-01" } })).ok);
    const g = await svc.getLegal(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, today: TODAY });
    assert.ok(g.ok);
    const d = g.ok ? g.data : (null as never);
    assert.equal(d.profile.nib, "1234567890123");
    assert.equal(d.profile.npwp, "012345678901000");
    assert.equal(d.profile.initialCapital, "50000000.00");
    assert.equal(d.profile.establishMeeting?.status, "FINAL");
    assert.ok(d.findings.some((f) => /20 hari kerja/.test(f.message) && f.level === "WARN"), "Perdes 2 Feb 2026 + 20 hari kerja sudah lewat");
    assert.ok(d.findings.some((f) => /Masa jabatan pelaksana operasional \(direktur\) Budi berakhir 2025-01-01/.test(f.message)));
    assert.equal(d.officers.find((o) => o.name === "Sari")!.termEnd, "2031-01-01");
    assert.equal(d.checklist.find((x) => x.key === "musdes")!.done, true);
    assert.equal(d.checklist.find((x) => x.key === "pengurus")!.done, false, "sekretaris dan pengawas belum ada");
    assert.equal(d.checklist.find((x) => x.key === "sertifikat")!.done, false);
    // simpan ulang (upsert), tetap satu baris
    assert.ok((await svc.saveLegal(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { legalStatus: "BADAN_HUKUM", certificateNo: "AHU-0001", certificateDate: "2026-03-01" } })).ok);
    assert.equal(await prisma.bumdesLegalProfile.count({ where: { bumdesId: c.bumdesId } }), 1);
    const pack = await svc.registrationPack(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, today: TODAY });
    assert.ok(pack.ok && pack.data.units.length === 2 && pack.data.village?.name === "L1");
  });

  // ---- Arus APB Desa ----
  type FV = Awaited<ReturnType<typeof apbdesVillage>>;
  async function apbdesVillage(tag2: string, receipt = 1_000_000) {
    const c = await setup(tag2);
    const d = await apb.createDocument(prisma, { villageId: c.villageId, year: 2026, userId: 1 });
    assert.ok(d.ok);
    const id = d.ok ? d.data.id : 0;
    assert.ok((await apb.addLine(prisma, { villageId: c.villageId, documentId: id, input: { accountCode: "4.2.1.01", amount: 1_000_000 } })).ok);
    assert.ok((await apb.addLine(prisma, { villageId: c.villageId, documentId: id, input: { accountCode: "5.2.1.01", amount: 500_000, activityCode: "1.1.04" } })).ok);
    const pm = await apb.addLine(prisma, { villageId: c.villageId, documentId: id, input: { accountCode: "6.2.2.01", amount: 300_000 } });
    assert.ok(pm.ok, JSON.stringify(pm));
    const a = await apb.adoptDocument(prisma, { villageId: c.villageId, documentId: id, regulationNumber: "Perdes 1/2026", regulationDate: "2025-12-20", now: NOW });
    assert.ok(a.ok, JSON.stringify(a));
    const rec = await apb.addEntry(prisma, { villageId: c.villageId, userId: 1, now: NOW, input: { voucherNo: "B-1", description: "DD", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-02-01", amount: receipt, accountCode: "4.2.1.01" } });
    assert.ok(rec.ok, JSON.stringify(rec));
    const final = await meeting(c.villageId, "MUSDES_BUMDES", "FINAL");
    const held = await meeting(c.villageId, "MUSDES_BUMDES", "HELD");
    return { ...c, meetingId: final.id, decisions: final.decisions, heldId: held.id, nextDecision: 0 };
  }
  /** Keputusan Musyawarah Desa; memakai butir keputusan baru tiap kali (satu butir = satu keputusan per jenis). */
  const resolution = async (c: FV, kind: "PENYERTAAN_MODAL" | "BAGI_HASIL", amount: string, o: Record<string, unknown> = {}) => {
    const extra = kind === "BAGI_HASIL" ? { fiscalYear: 2025 } : {};
    if (c.nextDecision >= c.decisions.length) {
      const m = await meeting(c.villageId, "MUSDES_BUMDES", "FINAL");
      c.meetingId = m.id;
      c.decisions = m.decisions;
      c.nextDecision = 0;
    }
    const r = await svc.createResolution(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { kind, musdesMeetingId: c.meetingId, decisionId: c.decisions[c.nextDecision++], amount, ...extra, ...o } });
    return r;
  };
  const resOk = async (c: FV, kind: "PENYERTAAN_MODAL" | "BAGI_HASIL", amount: string, o: Record<string, unknown> = {}) => {
    const r = await resolution(c, kind, amount, o);
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const flowWith = (c: FV, resolutionId: number, o: Record<string, unknown> = {}) => svc.createFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, bumdesName: c.name, userId: c.userId, now: NOW, input: { kind: "PENYERTAAN_MODAL", flowDate: "2026-04-01", amount: "200000", resolutionId, cashAccountCode: "1.1.01.02", ...o } });
  /** Arus dengan keputusan besar yang dibuat otomatis (satu per jenis per desa). */
  const bigRes = new Map<string, number>();
  const flow = async (c: FV, o: Record<string, unknown> = {}) => {
    const kind = (o.kind as "PENYERTAAN_MODAL" | "BAGI_HASIL" | undefined) ?? "PENYERTAAN_MODAL";
    const key = `${c.bumdesId}:${kind}`;
    if (!bigRes.has(key)) bigRes.set(key, await resOk(c, kind, "100000000"));
    return flowWith(c, o.resolutionId !== undefined ? (o.resolutionId as number) : bigRes.get(key)!, o);
  };
  /** Bekal bagi hasil: saldo awal kas Kantor Pusat (jurnal pembukaan tak menyentuh akun Desa) dan laba tahun buku 2025 di unit. */
  async function fund(c: FV, cash = "1000000", profit = "500000") {
    const op = await journal(c, { entryDate: "2025-01-02", opening: true, lines: [{ accountCode: "1.1.01.01", debit: cash }, { accountCode: "3.3.01.01", credit: cash }] });
    assert.ok(op.ok, JSON.stringify(op));
    await cashOk(c, { entryDate: "2025-06-01", amount: profit, accountCode: "4.1.01.01" });
  }

  it("keputusan Musyawarah Desa: jenis rapat, berita acara final, butir keputusan, dan kepemilikan desa diperiksa", async () => {
    const c = await apbdesVillage("R1");
    const bad = async (o: Record<string, unknown>, field: string) => {
      const r = await resolution(c, "PENYERTAAN_MODAL", "100000", o);
      assert.ok(!r.ok && r.fieldErrors?.[field], `${field}: ${JSON.stringify(r)}`);
    };
    const lainnya = await meeting(c.villageId, "MUSDES_LAINNYA", "FINAL");
    const blt = await meeting(c.villageId, "MUSDES_BLT", "FINAL");
    const rkp = await meeting(c.villageId, "MUSDES_PERENCANAAN", "FINAL");
    await bad({ musdesMeetingId: lainnya.id, decisionId: lainnya.decisions[0] }, "musdesMeetingId");
    await bad({ musdesMeetingId: blt.id, decisionId: blt.decisions[0] }, "musdesMeetingId");
    await bad({ musdesMeetingId: rkp.id, decisionId: rkp.decisions[0] }, "musdesMeetingId");
    await bad({ musdesMeetingId: c.heldId, decisionId: c.decisions[0] }, "musdesMeetingId");
    await bad({ decisionId: lainnya.decisions[0] }, "decisionId"); // butir milik rapat lain
    await bad({ musdesMeetingId: null }, "musdesMeetingId");
    await bad({ decisionId: null }, "decisionId");
    await bad({ amount: "0" }, "amount");
    await bad({ amount: "1e5" }, "amount");
    const badKind = await svc.createResolution(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { kind: "LAIN", musdesMeetingId: c.meetingId, decisionId: c.decisions[0], amount: "1" } });
    assert.ok(!badKind.ok && badKind.fieldErrors?.kind);
    const bhNoYear = await svc.createResolution(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { kind: "BAGI_HASIL", musdesMeetingId: c.meetingId, decisionId: c.decisions[0], amount: "1" } });
    assert.ok(!bhNoYear.ok && bhNoYear.fieldErrors?.fiscalYear);
    assert.equal(await prisma.bumdesMusdesResolution.count({ where: { bumdesId: c.bumdesId } }), 0, "tak ada yang tertulis");
    const ok1 = await resolution(c, "PENYERTAAN_MODAL", "100000");
    assert.ok(ok1.ok);
    const dup = await svc.createResolution(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, userId: c.userId, input: { kind: "PENYERTAAN_MODAL", musdesMeetingId: c.meetingId, decisionId: c.decisions[0], amount: "5" } });
    assert.ok(!dup.ok && dup.fieldErrors?.decisionId, "satu butir hanya satu keputusan per jenis");
    // flow tanpa keputusan
    const none = await flowWith(c, 0, { resolutionId: null });
    assert.ok(!none.ok && none.fieldErrors?.resolutionId);
    // rapat dibuka kembali (tidak final) setelah keputusan dicatat → arus ditolak
    await prisma.villageMeeting.update({ where: { id: c.meetingId }, data: { status: "HELD" } });
    const after = await flowWith(c, ok1.ok ? ok1.data.id : 0, { amount: "50000" });
    assert.ok(!after.ok && /tidak lagi final/.test(after.errors.join(" ")));
    await prisma.villageMeeting.update({ where: { id: c.meetingId }, data: { status: "FINAL" } });
    // jenis rapat diubah bukan BUMDES → ditolak
    await prisma.villageMeeting.update({ where: { id: c.meetingId }, data: { kind: "MUSDES_LAINNYA" } });
    const wrongKind = await flowWith(c, ok1.ok ? ok1.data.id : 0, { amount: "50000" });
    assert.ok(!wrongKind.ok && /bukan jenis/.test(wrongKind.errors.join(" ")));
    await prisma.villageMeeting.update({ where: { id: c.meetingId }, data: { kind: "MUSDES_BUMDES" } });
    assert.ok((await flowWith(c, ok1.ok ? ok1.data.id : 0, { amount: "50000" })).ok);
  });

  it("penyertaan modal: bersandar pada keputusan; menulis BKU lewat fungsi buku kas, jurnal ekuitas, dan baris arus sekaligus; plafon kumulatif per keputusan", async () => {
    const c = await apbdesVillage("F1");
    const rid = await resOk(c, "PENYERTAAN_MODAL", "250000");
    const before = await prisma.apbdesEntry.count({ where: { villageId: c.villageId } });
    const early = await flowWith(c, rid, { flowDate: "2026-02-15" });
    assert.ok(!early.ok && early.fieldErrors?.flowDate, "tak boleh sebelum Musdes");
    const r = await flowWith(c, rid, { amount: "200000" });
    assert.ok(r.ok, JSON.stringify(r));
    const d = r.ok ? r.data : (null as never);
    const e = await prisma.apbdesEntry.findUniqueOrThrow({ where: { id: d.apbdesEntryId } });
    assert.equal(e.type, "PENGELUARAN");
    assert.equal(e.accountCode, "6.2.2.01");
    assert.equal(e.activityCode, null);
    assert.equal(e.amountCents, 20_000_000n);
    assert.equal(e.channel, "BANK");
    assert.match(e.voucherNo, /^BUMDes\/PM\/2026\/001$/);
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: c.villageId } }), before + 1);
    const j = await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: d.journalId }, include: { lines: true } });
    assert.equal(j.source, "MODAL");
    assert.equal(j.unitId, null);
    assert.equal(j.lines.find((l) => l.accountCode === "1.1.01.02")!.debitCents, 20_000_000n);
    assert.equal(j.lines.find((l) => l.accountCode === "3.1.01.01")!.creditCents, 20_000_000n);
    const fl = await prisma.bumdesVillageFlow.findUniqueOrThrow({ where: { id: d.id } });
    assert.equal(fl.resolutionId, rid);
    assert.equal(fl.musdesMeetingId, c.meetingId);
    // plafon kumulatif: 200 + 60 > 250 ditolak, atomik; 50 tepat habis
    const snap = async () => ({ e: await prisma.apbdesEntry.count({ where: { villageId: c.villageId } }), j: await prisma.bumdesJournal.count({ where: { bumdesId: c.bumdesId } }), f: await prisma.bumdesVillageFlow.count({ where: { bumdesId: c.bumdesId } }) });
    const s0 = await snap();
    const over = await flowWith(c, rid, { amount: "60000" });
    assert.ok(!over.ok && /Melebihi jumlah yang diputuskan/.test(over.errors[0]!) && over.fieldErrors?.amount, JSON.stringify(over));
    assert.deepEqual(await snap(), s0);
    assert.ok((await flowWith(c, rid, { amount: "50000" })).ok);
    assert.equal((await flowWith(c, rid, { amount: "1" })).ok, false, "plafon habis");
    // keputusan jenis lain tak bisa dipakai
    const bh = await resOk(c, "BAGI_HASIL", "1000");
    const wrong = await flowWith(c, bh, { amount: "10" });
    assert.ok(!wrong.ok && wrong.fieldErrors?.resolutionId);
    const rep = await report(c, 2026, "TAHUN");
    assert.equal(rep.consolidated.neraca.ekuitas.lines.find((l) => l.code === "3.1.01.01")!.amount, "250000.00");
    assert.equal(rep.consolidated.neraca.balanced, true);
    assert.ok(!rep.findings.some((f) => f.level === "ERROR"), "rekonsiliasi akun modal bersih");
    const list = await svc.listFlows(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, year: 2026 });
    assert.ok(list.ok);
    const lv = list.ok ? list.data : (null as never);
    assert.equal(lv.flows[0]!.apbdesEntry?.state, "OK");
    assert.equal(lv.capital.budgeted, "300000.00");
    const rv = lv.resolutions.find((x) => x.id === rid)!;
    assert.equal(rv.used, "250000.00");
    assert.equal(rv.remaining, "0.00");
    assert.ok(lv.meetings.some((m) => m.id === c.meetingId && m.decisions.length === 3) && !lv.meetings.some((m) => m.id === c.heldId));
    // keputusan yang masih dipakai tak bisa dibatalkan; yang tak dipakai bisa
    const cancel = await svc.voidResolution(prisma, { bumdesId: c.bumdesId, id: rid, userId: c.userId, input: { reason: "salah catat" } });
    assert.ok(!cancel.ok && cancel.status === 409);
    assert.ok((await svc.voidResolution(prisma, { bumdesId: c.bumdesId, id: bh, userId: c.userId, input: { reason: "salah catat" } })).ok);
    const afterVoid = await flowWith(c, bh, { kind: "BAGI_HASIL", amount: "10" });
    assert.ok(!afterVoid.ok);
  });

  it("penyertaan modal melebihi anggaran APB Desa atau tanpa APB Desa ditetapkan: ditolak dan tidak ada yang tertulis di sisi mana pun", async () => {
    const c = await apbdesVillage("F2");
    assert.ok((await flow(c, { amount: "250000" })).ok);
    const snap = async () => ({ e: await prisma.apbdesEntry.count({ where: { villageId: c.villageId } }), j: await prisma.bumdesJournal.count({ where: { bumdesId: c.bumdesId } }), f: await prisma.bumdesVillageFlow.count({ where: { bumdesId: c.bumdesId } }) });
    const s0 = await snap();
    const over = await flow(c, { amount: "100000" });
    assert.ok(!over.ok && /melebihi anggaran/.test(over.errors[0]!), JSON.stringify(over));
    assert.deepEqual(await snap(), s0, "atomik: tidak ada setengah tulisan");
    const noDoc = await setup("F2b");
    const m = await meeting(noDoc.villageId);
    const rr = await svc.createResolution(prisma, { villageId: noDoc.villageId, bumdesId: noDoc.bumdesId, userId: noDoc.userId, input: { kind: "PENYERTAAN_MODAL", musdesMeetingId: m.id, decisionId: m.decisions[0], amount: "100000" } });
    assert.ok(rr.ok);
    const r = await svc.createFlow(prisma, { villageId: noDoc.villageId, bumdesId: noDoc.bumdesId, bumdesName: noDoc.name, userId: noDoc.userId, now: NOW, input: { kind: "PENYERTAAN_MODAL", flowDate: "2026-04-01", amount: "1000", resolutionId: rr.ok ? rr.data.id : 0, cashAccountCode: "1.1.01.02" } });
    assert.ok(!r.ok && /belum ditetapkan/.test(r.errors.join(" ")));
    assert.equal(await prisma.bumdesJournal.count({ where: { bumdesId: noDoc.bumdesId } }), 0);
  });

  it("dua penyertaan modal serentak yang bersama-sama melebihi anggaran: tepat satu lolos (kunci BUMDes lalu tahun APB Desa)", async () => {
    const c = await apbdesVillage("F3");
    const rid = await resOk(c, "PENYERTAAN_MODAL", "1000000");
    const rs = await Promise.all([flowWith(c, rid, { amount: "200000" }), flowWith(c, rid, { amount: "200000" }), flowWith(c, rid, { amount: "200000" })]);
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors[0]))));
    assert.equal(await prisma.bumdesVillageFlow.count({ where: { bumdesId: c.bumdesId } }), 1);
    assert.equal(await prisma.bumdesJournal.count({ where: { bumdesId: c.bumdesId, source: "MODAL" } }), 1);
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: c.villageId, accountCode: "6.2.2.01" } }), 1);
  });

  it("penyertaan modal melawan pengeluaran BKU lain secara serentak: saldo kas Desa tidak pernah minus (kunci tahun APB Desa dipegang modul ini)", async () => {
    for (let round = 0; round < 8; round++) {
      const c = await apbdesVillage(`F3b${round}`, 600_000);
      const rid = await resOk(c, "PENYERTAAN_MODAL", "1000000");
      const rs = await Promise.all([
        flowWith(c, rid, { amount: "300000" }),
        apb.addEntry(prisma, { villageId: c.villageId, userId: 1, now: NOW, input: { voucherNo: "B-9", description: "belanja", channel: "BANK", type: "PENGELUARAN", entryDate: "2026-04-01", amount: 500_000, accountCode: "5.2.1.01", activityCode: "1.1.04" } }),
      ]);
      const okCount = rs.filter((r) => r.ok).length;
      assert.equal(okCount, 1, `putaran ${round}: ${JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors[0])))}`);
      const entries = await prisma.apbdesEntry.findMany({ where: { villageId: c.villageId } });
      const saldo = entries.reduce((s, e) => s + (e.type === "PENERIMAAN" ? e.amountCents : -e.amountCents), 0n);
      assert.ok(saldo >= 0n, `putaran ${round}: saldo kas Desa minus ${saldo}`);
    }
  });

  it("bagi hasil: pendapatan 4.1.1.01 di BKU, jurnal pengambilan oleh pemilik; DITOLAK bila melebihi laba bersih tahun buku atau saldo kas BUMDes", async () => {
    const c = await apbdesVillage("F4");
    const rid = await resOk(c, "BAGI_HASIL", "5000000");
    // belum ada pembukuan: laba 0 dan kas 0 → ditolak (bukan sekadar peringatan)
    const empty = await flowWith(c, rid, { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "1000", cashAccountCode: "1.1.01.01" });
    assert.ok(!empty.ok && /melebihi laba bersih/.test(empty.errors[0]!), JSON.stringify(empty));
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: c.villageId, accountCode: "4.1.1.01" } }), 0);
    await fund(c, "1000000", "500000");
    const over = await flowWith(c, rid, { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "500001", cashAccountCode: "1.1.01.01" });
    assert.ok(!over.ok && /melebihi laba bersih tahun buku 2025/.test(over.errors[0]!) && over.fieldErrors?.amount, JSON.stringify(over));
    const r = await flowWith(c, rid, { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "300000", cashAccountCode: "1.1.01.01", villageChannel: "TUNAI" });
    assert.ok(r.ok, JSON.stringify(r));
    const d = r.ok ? r.data : (null as never);
    const e = await prisma.apbdesEntry.findUniqueOrThrow({ where: { id: d.apbdesEntryId } });
    assert.equal(e.type, "PENERIMAAN");
    assert.equal(e.accountCode, "4.1.1.01");
    assert.equal(e.channel, "TUNAI");
    assert.match(e.description, /tahun buku 2025/);
    const j = await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: d.journalId }, include: { lines: true } });
    assert.equal(j.source, "BAGI_HASIL");
    assert.equal(j.lines.find((l) => l.accountCode === "3.2.01.01")!.debitCents, 30_000_000n);
    assert.equal(j.lines.find((l) => l.accountCode === "1.1.01.01")!.creditCents, 30_000_000n);
    // kumulatif per tahun buku: 300 + 200 = 500 ok (tepat laba), +1 ditolak
    assert.ok((await flowWith(c, rid, { kind: "BAGI_HASIL", flowDate: "2026-05-02", amount: "200000", cashAccountCode: "1.1.01.01" })).ok);
    const full = await flowWith(c, rid, { kind: "BAGI_HASIL", flowDate: "2026-05-03", amount: "1", cashAccountCode: "1.1.01.01" });
    assert.ok(!full.ok && /melebihi laba bersih/.test(full.errors[0]!));
    // kas tak cukup: laba besar tapi kas Pusat hanya 100 ribu
    const c2 = await apbdesVillage("F4b");
    const rid2 = await resOk(c2, "BAGI_HASIL", "5000000");
    await fund(c2, "100000", "900000");
    const cash = await flowWith(c2, rid2, { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "100001", cashAccountCode: "1.1.01.01" });
    assert.ok(!cash.ok && /tidak cukup/.test(cash.errors[0]!) && cash.fieldErrors?.cashAccountCode, JSON.stringify(cash));
    assert.ok((await flowWith(c2, rid2, { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "100000", cashAccountCode: "1.1.01.01" })).ok);
    // tahun buku setelah tanggal penerimaan ditolak
    const c3 = await apbdesVillage("F4c");
    const rid3 = await resOk(c3, "BAGI_HASIL", "1000", { fiscalYear: 2027 });
    const future = await flowWith(c3, rid3, { kind: "BAGI_HASIL", flowDate: "2026-05-01", amount: "10", cashAccountCode: "1.1.01.01" });
    assert.ok(!future.ok && future.fieldErrors?.flowDate);
  });

  it("akun Penyertaan Modal/Bagi Hasil: tak bisa dijurnal lewat transaksi kas atau jurnal manual; jurnal pembukaan hanya untuk modal; rekonsiliasi mendeteksi penyimpangan", async () => {
    const c = await setup("K1");
    for (const acc of ["3.1.01.01", "3.2.01.01"]) {
      const tx = await cash(c, { accountCode: acc });
      assert.ok(!tx.ok && tx.fieldErrors?.accountCode, `kas ${acc}`);
      const jm = await journal(c, { lines: [{ accountCode: "1.1.01.02", debit: "100" }, { accountCode: acc, credit: "100" }] });
      assert.ok(!jm.ok && jm.fieldErrors?.lines, `jurnal ${acc}`);
      const op = await journal(c, { opening: true, lines: [{ accountCode: "1.1.01.02", debit: "100" }, { accountCode: acc, credit: "100" }] });
      if (acc === "3.2.01.01") assert.ok(!op.ok, "bagi hasil tak boleh lewat pembukaan");
      else assert.ok(op.ok, JSON.stringify(op));
    }
    const unitOpening = await journal(c, { unitId: c.u1, opening: true, lines: [{ accountCode: "1.1.01.02", debit: "100" }, { accountCode: "3.1.01.01", credit: "100" }] });
    assert.ok(!unitOpening.ok, "pembukaan hanya di Kantor Pusat");
    assert.equal(await prisma.bumdesJournal.count({ where: { bumdesId: c.bumdesId, source: "KAS" } }), 0, "tak ada transaksi kas tertulis");
    // koreksi jurnal biasa tak bisa "naik" menjadi pembukaan atau memakai akun modal
    const plain = await journal(c);
    assert.ok(plain.ok);
    const fix = await svc.correctManualJournal(prisma, { bumdesId: c.bumdesId, journalId: plain.ok ? plain.data.id : 0, userId: c.userId, now: NOW, input: { reason: "mengganti akun", opening: true, unitId: null, entryDate: "2026-03-02", description: "x", lines: [{ accountCode: "1.1.01.02", debit: "10" }, { accountCode: "3.1.01.01", credit: "10" }] } });
    assert.ok(!fix.ok, "opening dalam koreksi diabaikan: sumber tetap MANUAL");
    const opening = await prisma.bumdesJournal.findFirstOrThrow({ where: { bumdesId: c.bumdesId, source: "SALDO_AWAL" } });
    const fixOpening = await svc.correctManualJournal(prisma, { bumdesId: c.bumdesId, journalId: opening.id, userId: c.userId, now: NOW, input: { reason: "salah nominal", unitId: null, entryDate: "2026-03-02", description: "Saldo awal benar", lines: [{ accountCode: "1.1.01.02", debit: "200" }, { accountCode: "3.1.01.01", credit: "200" }] } });
    assert.ok(fixOpening.ok, JSON.stringify(fixOpening));
    assert.equal((await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: fixOpening.ok ? fixOpening.data.id : 0 } })).source, "SALDO_AWAL");
    // pembukaan terlihat sebagai catatan; tanpa kesalahan
    const r0 = await report(c, 2026, "TAHUN");
    assert.ok(r0.findings.some((f) => f.level === "INFO" && /saldo awal/.test(f.message)));
    assert.ok(!r0.findings.some((f) => f.level === "ERROR"));
    // penyimpangan: jurnal MANUAL liar yang menembus penjaga aplikasi (ditulis langsung ke DB)
    const bad = await prisma.bumdesJournal.create({ data: { bumdesId: c.bumdesId, entryDate: new Date("2026-04-01"), year: 2026, seq: 900, voucherNo: "x", description: "liar", source: "MANUAL", totalDebitCents: 5_000n, totalCreditCents: 5_000n, lines: { create: [{ lineNo: 1, accountCode: "1.1.01.02", debitCents: 5_000n, creditCents: 0n }, { lineNo: 2, accountCode: "3.1.01.01", debitCents: 0n, creditCents: 5_000n }] } } });
    const r1 = await report(c, 2026, "TAHUN");
    assert.ok(r1.findings.some((f) => f.level === "ERROR" && /bukan-arus/.test(f.message)), JSON.stringify(r1.findings));
    await prisma.bumdesJournal.update({ where: { id: bad.id }, data: { status: "DIBATALKAN", voidedAt: new Date() } });
    // penyimpangan: total arus tak sama dengan jurnal arus
    const fv = await apbdesVillage("K1b");
    const rid = await resOk(fv, "PENYERTAAN_MODAL", "250000");
    const fl = await flowWith(fv, rid, { amount: "200000" });
    assert.ok(fl.ok);
    assert.ok(!(await report(fv, 2026, "TAHUN")).findings.some((f) => f.level === "ERROR"));
    await prisma.bumdesVillageFlow.update({ where: { id: fl.ok ? fl.data.id : 0 }, data: { amountCents: 21_000_000n } });
    const r2 = await report(fv, 2026, "TAHUN");
    assert.ok(r2.findings.some((f) => f.level === "ERROR" && /3\.1\.01\.01/.test(f.message)), JSON.stringify(r2.findings));
  });

  it("catatan BKU hasil arus tertaut: tak dapat diubah atau dihapus dari menu APB Desa; pembatalan lewat BUMDes menghapusnya; ditutup/berbeda/hilang ditangani", async () => {
    const c = await apbdesVillage("F5");
    const rid = await resOk(c, "PENYERTAAN_MODAL", "1000000");
    const a = await flowWith(c, rid, { amount: "100000" });
    assert.ok(a.ok);
    const aid = a.ok ? a.data.id : 0;
    const entryId = a.ok ? a.data.apbdesEntryId : 0;
    // menu APB Desa menolak ubah/hapus
    const upd = await apb.updateEntry(prisma, { villageId: c.villageId, entryId, now: NOW, input: { voucherNo: "BUMDes/PM/2026/001", description: "diubah", channel: "BANK", type: "PENGELUARAN", entryDate: "2026-04-01", amount: 90_000, accountCode: "6.2.2.01" } });
    assert.ok(!upd.ok && upd.status === 409 && /menu BUMDes/.test(upd.errors[0]!), JSON.stringify(upd));
    const del = await apb.deleteEntry(prisma, { villageId: c.villageId, entryId });
    assert.ok(!del.ok && del.status === 409 && /menu BUMDes/.test(del.errors[0]!), JSON.stringify(del));
    assert.equal(await prisma.apbdesEntry.count({ where: { id: entryId } }), 1);
    const noReason = await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: aid, userId: c.userId, now: NOW, input: {} });
    assert.equal(noReason.ok, false);
    // bulan BKU ditutup → ditolak, tidak ada yang berubah
    assert.ok((await apb.actOnMonth(prisma, { villageId: c.villageId, userId: 1, year: 2026, month: 2, action: "close", now: NOW })).ok);
    assert.ok((await apb.actOnMonth(prisma, { villageId: c.villageId, userId: 1, year: 2026, month: 4, action: "close", now: NOW })).ok);
    const closed = await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: aid, userId: c.userId, now: NOW, input: { reason: "Salah catat" } });
    assert.ok(!closed.ok && /ditutup/.test(closed.errors[0]!), JSON.stringify(closed));
    assert.equal((await prisma.bumdesVillageFlow.findUniqueOrThrow({ where: { id: aid } })).status, "AKTIF");
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: c.villageId, accountCode: "6.2.2.01" } }), 1);
    assert.ok((await apb.actOnMonth(prisma, { villageId: c.villageId, userId: 1, year: 2026, month: 4, action: "reopen", now: NOW })).ok);
    // data diubah di luar aplikasi (langsung ke DB): daftar menandai BERBEDA, pembatalan menolak
    await prisma.apbdesEntry.update({ where: { id: entryId }, data: { amountCents: 9_000_000n } });
    const l1 = await svc.listFlows(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, year: 2026 });
    assert.ok(l1.ok && l1.data.flows[0]!.apbdesEntry?.state === "BERBEDA" && l1.data.flows[0]!.warnings.length > 0);
    const diff = await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: aid, userId: c.userId, now: NOW, input: { reason: "Salah catat" } });
    assert.ok(!diff.ok && /berbeda/.test(diff.errors[0]!));
    await prisma.apbdesEntry.update({ where: { id: entryId }, data: { amountCents: 10_000_000n } });
    const v = await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: aid, userId: c.userId, now: NOW, input: { reason: "Salah catat" } });
    assert.ok(v.ok, JSON.stringify(v));
    assert.equal(await prisma.apbdesEntry.count({ where: { id: entryId } }), 0, "catatan BKU dihapus lewat fungsi buku kas");
    const row = await prisma.bumdesVillageFlow.findUniqueOrThrow({ where: { id: aid } });
    assert.equal(row.status, "DIBATALKAN");
    assert.equal(row.voidReason, "Salah catat");
    assert.equal((await prisma.bumdesJournal.findUniqueOrThrow({ where: { id: row.journalId! } })).status, "DIBATALKAN");
    assert.ok(!(await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: aid, userId: c.userId, now: NOW, input: { reason: "lagi" } })).ok);
    const rep = await report(c, 2026, "TAHUN");
    assert.equal(rep.consolidated.neraca.ekuitas.lines.find((l) => l.code === "3.1.01.01"), undefined, "ekuitas kembali nol");
    // setelah dibatalkan, plafon keputusan pulih dan catatan BKU-nya tak lagi tertaut
    const b = await flowWith(c, rid, { amount: "50000", flowDate: "2026-04-02" });
    assert.ok(b.ok);
    await prisma.apbdesEntry.delete({ where: { id: b.ok ? b.data.apbdesEntryId : 0 } });
    const l2 = await svc.listFlows(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, year: 2026 });
    assert.ok(l2.ok && l2.data.flows.find((f) => f.id === (b.ok ? b.data.id : 0))!.apbdesEntry?.state === "HILANG");
    assert.ok((await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: b.ok ? b.data.id : 0, userId: c.userId, now: NOW, input: { reason: "Catatan BKU sudah dihapus" } })).ok);
  });

  it("periode BUMDes tertutup menolak arus APB Desa pada tanggalnya (tidak menulis BKU)", async () => {
    const c = await apbdesVillage("F6");
    assert.ok((await period(c, 2026, 1, "tutup")).ok);
    const before = await prisma.apbdesEntry.count({ where: { villageId: c.villageId } });
    const r = await flow(c, { flowDate: "2026-04-01" });
    assert.ok(!r.ok && /sudah ditutup/.test(r.errors[0]!));
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: c.villageId } }), before);
    assert.ok((await flow(c, { flowDate: "2026-08-01" })).ok, "S2 terbuka");
  });

  it("peran dihitung dari DATABASE, bukan klaim JWT: admin yang diturunkan langsung kehilangan akses tulis, staf yang dinaikkan mendapat akses", async () => {
    const mod = await import("../lib/bumdes/api-context");
    const c = await setup("P1");
    const village = await prisma.village.findUniqueOrThrow({ where: { id: c.villageId } });
    const ctxOf = (dbRole: string, jwtRole: string) => ({ session: { user: { id: String(c.userId), role: jwtRole, villageId: c.villageId } }, userId: c.userId, village, dbUser: { id: c.userId, villageId: c.villageId, isActive: true, role: dbRole } }) as never;
    const w = async (db: string, jwt: string, write: boolean) => (await mod.bumdesScope(ctxOf(db, jwt), { write })).ok;
    assert.equal(await w("admin", "admin", true), true);
    assert.equal(await w("staff", "admin", true), false, "diturunkan di DB, JWT lama masih admin → ditolak");
    assert.equal(await w("staff", "admin", false), true, "staf tetap boleh membaca");
    assert.equal(await w("admin", "staff", true), true, "dinaikkan di DB → diizinkan");
    assert.equal(await w("secretary", "admin", true), false);
    assert.equal(await w("village_head", "staff", true), true);
    assert.equal(await w("tamu", "admin", false), false, "peran tak dikenal di DB tak boleh membaca");
    const loaded = await mod.requireBumdesManage({ role: "staff" });
    assert.ok(loaded);
    assert.equal(mod.requireBumdesManage({ role: "admin" }), null);
  });

  it("daftar dan pintu menu APB Desa: catatan hasil arus BUMDes dan penerimaan sewa tanah kas ditandai tertaut, ubah/hapus ditolak 409; pembatalan lewat modulnya tetap jalan", async () => {
    const land = await import("../lib/aset-desa/land-service");
    const aset = await import("../lib/aset-desa/service");
    const c = await apbdesVillage("L2");
    const rid = await resOk(c, "PENYERTAAN_MODAL", "1000000");
    const fl = await flowWith(c, rid, { amount: "100000" });
    assert.ok(fl.ok);
    const itemR = await aset.createItem(prisma, { villageId: c.villageId, userId: 1, input: { name: "Tanah Kas Blok A", category: "TANAH_KAS_DESA", origin: "ASLI_DESA", acquiredYear: 2010 }, now: NOW });
    assert.ok(itemR.ok, JSON.stringify(itemR));
    const ag = await land.createAgreement(prisma, { villageId: c.villageId, userId: 1, itemId: itemR.ok ? itemR.data.id : 0, input: { kind: "SEWA", lesseeName: "Pak Slamet", lesseeKind: "PERORANGAN", startOn: "2026-01-01", endOn: "2026-12-31", periodUnit: "BULAN", amount: "500000", tenantDuties: "Pajak dan perawatan oleh penyewa", forceMajeureIncluded: true, agreementNo: "01/SWA/2026", signedOn: "2025-12-29", perdesNo: "3/2025", perdesDate: "2025-12-20" } });
    assert.ok(ag.ok, JSON.stringify(ag));
    assert.ok((await land.activateAgreement(prisma, { villageId: c.villageId, userId: 1, id: ag.ok ? ag.data.id : 0 })).ok);
    const charge = await prisma.landCharge.findFirstOrThrow({ where: { agreementId: ag.ok ? ag.data.id : 0 }, orderBy: { seq: "asc" } });
    const rec = await land.receiveCharge(prisma, { villageId: c.villageId, userId: 1, chargeId: charge.id, input: { receivedOn: "2026-10-30", channel: "BANK" }, now: NOW });
    assert.ok(rec.ok, JSON.stringify(rec));
    const sewaId = rec.ok ? rec.data.entryId : 0;
    const modalId = fl.ok ? fl.data.apbdesEntryId : 0;
    const free = await apb.addEntry(prisma, { villageId: c.villageId, userId: 1, now: NOW, input: { voucherNo: "B-5", description: "bebas", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-05-01", amount: 1_000, accountCode: "4.2.1.01" } });
    assert.ok(free.ok);
    // penanda di daftar BKU
    const msgs = await apb.linkedEntryMessages(prisma, c.villageId, [sewaId, modalId, free.ok ? free.data.id : 0]);
    assert.match(msgs.get(modalId)?.note ?? "", /menu BUMDes/);
    assert.match(msgs.get(sewaId)?.note ?? "", /Aset Desa/);
    assert.equal(msgs.has(free.ok ? free.data.id : 0), false, "catatan bebas tidak tertaut");
    const notes = new Map([...msgs].map(([id, v]) => [id, v.note]));
    const views = (await apb.loadEntries(prisma, c.villageId, 2026)).map((e) => apb.entryView(e, new Set(), notes));
    assert.equal(views.find((v) => v.id === sewaId)!.linked, true);
    assert.match(views.find((v) => v.id === sewaId)!.linkedNote ?? "", /Aset Desa/);
    assert.equal(views.find((v) => v.id === modalId)!.linked, true);
    assert.equal(views.find((v) => v.id === (free.ok ? free.data.id : 0))!.linked, false);
    // desa lain tak ikut tertaut
    assert.equal((await apb.linkedEntryMessages(prisma, c.villageId + 999999, [sewaId, modalId])).size, 0);
    // ubah/hapus dari menu APB Desa ditolak
    const upd = (id: number) => apb.updateEntry(prisma, { villageId: c.villageId, entryId: id, now: NOW, input: { voucherNo: "X", description: "diubah", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-10-30", amount: 1, accountCode: "4.1.2.01" } });
    const u = await upd(sewaId);
    assert.ok(!u.ok && u.status === 409 && /menu Aset Desa \(Pemanfaatan\)/.test(u.errors[0]!), JSON.stringify(u));
    const d = await apb.deleteEntry(prisma, { villageId: c.villageId, entryId: sewaId });
    assert.ok(!d.ok && d.status === 409 && /menu Aset Desa \(Pemanfaatan\)/.test(d.errors[0]!), JSON.stringify(d));
    assert.equal(await prisma.apbdesEntry.count({ where: { id: sewaId } }), 1);
    assert.ok(!(await apb.deleteEntry(prisma, { villageId: c.villageId, entryId: modalId })).ok);
    // catatan bebas tetap dapat dihapus lewat menu
    assert.ok((await apb.deleteEntry(prisma, { villageId: c.villageId, entryId: free.ok ? free.data.id : 0 })).ok);
    // pembatalan lewat modul masing-masing tetap menghapus catatan
    assert.ok((await land.revertReceipt(prisma, { villageId: c.villageId, chargeId: charge.id })).ok);
    assert.equal(await prisma.apbdesEntry.count({ where: { id: sewaId } }), 0);
    assert.ok((await svc.voidFlow(prisma, { villageId: c.villageId, bumdesId: c.bumdesId, id: fl.ok ? fl.data.id : 0, userId: c.userId, now: NOW, input: { reason: "Uji pembatalan" } })).ok);
    assert.equal(await prisma.apbdesEntry.count({ where: { id: modalId } }), 0);
  });

  it("modul tidak menulis apbdes_entries sendiri: kode sumber hanya memanggil createEntryInTx/deleteEntryInTx", () => {
    const src = readFileSync("lib/bumdes/service.ts", "utf8");
    assert.ok(!/apbdesEntry\.(create|update|delete|createMany|updateMany|deleteMany|upsert)/.test(src));
    assert.ok(/createEntryInTx\(/.test(src) && /deleteEntryInTx\(/.test(src));
    assert.ok(!/\$executeRaw[\s\S]{0,80}apbdes_entries/.test(src));
  });
});

const fromCentsStr = (c: bigint): string => `${c < 0n ? "-" : ""}${(c < 0n ? -c : c) / 100n}.${String((c < 0n ? -c : c) % 100n).padStart(2, "0")}`;
