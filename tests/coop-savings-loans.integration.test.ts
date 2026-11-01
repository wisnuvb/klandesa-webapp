/** Tes integrasi simpan-pinjam koperasi terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Simpan-pinjam koperasi (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/coop/savings-loans");
  let vA = 0;
  let vB = 0;
  let coopA = 0;
  let coopB = 0;
  const m: Record<string, number> = {};
  const NOW = new Date("2026-11-01T03:00:00Z");

  const save = (memberId: number, kind: string, direction: string, amount: string | number, txDate = "2026-10-01", cooperativeId = coopA) =>
    svc.addSaving(prisma, { cooperativeId, userId: 1, input: { memberId, kind, direction, amount, txDate }, now: NOW });
  const loan = (memberId: number, over: Record<string, unknown> = {}) =>
    svc.createLoan(prisma, { cooperativeId: coopA, userId: 1, input: { memberId, principal: "1200000", ratePercent: "1", termMonths: 6, disbursedAt: "2026-01-15", ...over }, now: NOW });
  const pay = (loanId: number, amount: string | number, paidAt = "2026-02-15", cooperativeId = coopA) => svc.addPayment(prisma, { cooperativeId, userId: 1, loanId, input: { amount, paidAt }, now: NOW });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/coop/savings-loans");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("KA")).id;
    vB = (await mkV("KB")).id;
    coopA = (await prisma.cooperative.create({ data: { villageId: vA, name: "Kopdes A" } })).id;
    coopB = (await prisma.cooperative.create({ data: { villageId: vB, name: "Kopdes B" } })).id;
    const mk = async (key: string, cooperativeId: number, status = "active") => (m[key] = (await prisma.cooperativeMember.create({ data: { cooperativeId, name: `Anggota ${key}`, status } })).id);
    await mk("ani", coopA);
    await mk("budi", coopA);
    await mk("keluar", coopA, "inactive");
    await mk("asing", coopB);
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("setoran menambah saldo per jenis; saldo dihitung benar sampai sen", async () => {
    const a = await save(m.ani, "POKOK", "SETOR", "100000");
    assert.ok(a.ok && a.data.balance === "100000.00");
    await save(m.ani, "WAJIB", "SETOR", "25000.50");
    await save(m.ani, "WAJIB", "SETOR", "25000.50");
    const s = await save(m.ani, "SUKARELA", "SETOR", 500000);
    assert.ok(s.ok);
    const b = (await svc.memberBalances(prisma, coopA)).find((x) => x.id === m.ani)!;
    assert.deepEqual([b.pokok, b.wajib, b.sukarela, b.total].map(String), ["10000000", "5000100", "50000000", "65000100"]);
  });

  it("aturan penarikan: sukarela boleh sampai saldo; pokok/wajib tidak selama aktif; boleh setelah keluar", async () => {
    assert.ok((await save(m.ani, "SUKARELA", "TARIK", "100000")).ok);
    const over = await save(m.ani, "SUKARELA", "TARIK", "999999999");
    assert.ok(!over.ok && over.status === 409 && over.fieldErrors?.amount);
    const pokok = await save(m.ani, "POKOK", "TARIK", "10000");
    assert.ok(!pokok.ok && pokok.status === 409);
    // anggota yang sudah keluar: tak boleh menyetor, tapi pokoknya boleh dikembalikan
    await prisma.cooperativeMember.update({ where: { id: m.budi }, data: { status: "active" } });
    await save(m.budi, "POKOK", "SETOR", "50000");
    await prisma.cooperativeMember.update({ where: { id: m.budi }, data: { status: "inactive" } });
    assert.ok(!(await save(m.budi, "WAJIB", "SETOR", "10000")).ok, "nonaktif tak boleh menyetor");
    assert.ok((await save(m.budi, "POKOK", "TARIK", "50000")).ok);
    await prisma.cooperativeMember.update({ where: { id: m.budi }, data: { status: "active" } });
  });

  it("penarikan serentak tak bisa melewati saldo (baris anggota dikunci)", async () => {
    await save(m.budi, "SUKARELA", "SETOR", "100000");
    const rs = await Promise.all(Array.from({ length: 5 }, () => save(m.budi, "SUKARELA", "TARIK", "60000")));
    assert.equal(rs.filter((r) => r.ok).length, 1, "saldo 100.000 hanya cukup untuk satu penarikan 60.000");
    const b = (await svc.memberBalances(prisma, coopA)).find((x) => x.id === m.budi)!;
    assert.equal(b.sukarela, 4_000_000n);
  });

  it("validasi masukan dan isolasi koperasi", async () => {
    for (const bad of [0, -5, "abc", "1.234", null]) assert.ok(!(await save(m.ani, "SUKARELA", "SETOR", bad as never)).ok, String(bad));
    assert.ok(!(await save(m.ani, "XYZ", "SETOR", 1000)).ok);
    assert.ok(!(await save(m.ani, "SUKARELA", "SETOR", 1000, "2027-01-01")).ok, "masa depan");
    const cross = await save(m.asing, "SUKARELA", "SETOR", 1000);
    assert.ok(!cross.ok && cross.status === 404, "anggota koperasi lain tak dikenali");
    assert.equal((await svc.memberBalances(prisma, coopB)).find((x) => x.id === m.asing)!.total, 0n);
    assert.equal((await svc.listSavings(prisma, coopB, { page: 1, pageSize: 50 })).total, 0);
  });

  it("pinjaman: hanya anggota aktif, batas pinjaman aktif, jadwal dan sisa benar", async () => {
    assert.ok(!(await loan(m.keluar)).ok, "anggota nonaktif");
    assert.ok(!(await loan(m.asing)).ok, "anggota koperasi lain");
    const r = await loan(m.ani);
    assert.ok(r.ok);
    const id = r.ok ? r.data.id : 0;
    const d = await svc.getLoan(prisma, coopA, id, NOW);
    assert.ok(d.ok);
    if (d.ok) {
      assert.equal(d.data.totalDue, "1272000.00");
      assert.equal(d.data.outstanding, "1272000.00");
      assert.equal(d.data.schedule.length, 6);
      assert.equal(d.data.schedule[0].total, "212000.00");
      assert.equal(d.data.overdueCount, 6, "semua jatuh tempo sebelum 1 Nov 2026 dan belum dibayar");
    }
    await loan(m.ani);
    await loan(m.ani);
    const fourth = await loan(m.ani);
    assert.ok(!fourth.ok && fourth.status === 409);
    for (const bad of [{ principal: "0" }, { termMonths: 61 }, { termMonths: 0 }, { ratePercent: "11" }, { disbursedAt: "2027-02-01" }, { ratePercent: "abc" }]) assert.ok(!(await loan(m.budi, bad)).ok, JSON.stringify(bad));
  });

  it("pembayaran: dialokasikan ke angsuran terlama, tak boleh melebihi sisa, lunas otomatis, dan tak bisa lagi setelah lunas", async () => {
    const r = await loan(m.budi, { principal: "300000", ratePercent: "0", termMonths: 3 });
    const id = r.ok ? r.data.id : 0;
    assert.ok(!(await pay(id, "50000", "2025-12-01")).ok, "sebelum pencairan");
    assert.ok((await pay(id, "100000", "2026-02-15")).ok);
    let d = await svc.getLoan(prisma, coopA, id, NOW);
    assert.ok(d.ok && d.data.schedule[0].state === "LUNAS" && d.data.outstanding === "200000.00");
    const over = await pay(id, "200000.01");
    assert.ok(!over.ok && over.status === 409 && over.fieldErrors?.amount);
    const last = await pay(id, "200000", "2026-03-15");
    assert.ok(last.ok && last.data.status === "LUNAS" && last.data.outstanding === "0.00");
    d = await svc.getLoan(prisma, coopA, id, NOW);
    assert.ok(d.ok && d.data.status === "LUNAS" && d.data.overdueCount === 0);
    const after_ = await pay(id, "1");
    assert.ok(!after_.ok && after_.status === 409);
    assert.ok(!(await svc.getLoan(prisma, coopB, id, NOW)).ok, "koperasi lain tak bisa melihat");
    assert.ok(!(await pay(id, "1", "2026-03-16", coopB)).ok);
  });

  it("pembayaran serentak yang melebihi sisa: hanya yang muat yang berhasil", async () => {
    const r = await loan(m.ani, { principal: "100000", ratePercent: "0", termMonths: 2, disbursedAt: "2026-09-01" }).catch(() => null);
    // Ani sudah 3 pinjaman aktif; gunakan Budi (aktif) yang pinjaman sebelumnya sudah lunas.
    const fresh = r && r.ok ? r : await loan(m.budi, { principal: "100000", ratePercent: "0", termMonths: 2, disbursedAt: "2026-09-01" });
    const id = fresh.ok ? fresh.data.id : 0;
    assert.ok(id > 0);
    const rs = await Promise.all(Array.from({ length: 4 }, () => pay(id, "60000", "2026-10-01")));
    assert.equal(rs.filter((x) => x.ok).length, 1, "sisa 100.000 hanya muat satu pembayaran 60.000");
    const d = await svc.getLoan(prisma, coopA, id, NOW);
    assert.ok(d.ok && d.data.outstanding === "40000.00");
  });

  it("anggota yang punya catatan keuangan terdeteksi (rute menolak menghapusnya)", async () => {
    assert.equal(await svc.memberHasFinancialRecords(prisma, m.ani), true);
    assert.equal(await svc.memberHasFinancialRecords(prisma, m.keluar), false);
  });

  it("kalkulator SHU: memakai saldo akhir tahun dan bunga yang dibayar tahun itu; total terbagi + sisa = total", async () => {
    const r = await svc.shuPreview(prisma, { cooperativeId: coopA, year: 2026, total: "1000000", savingsSharePercent: 60 });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(Number(r.data.distributed) + Number(r.data.undistributed), 1_000_000);
      assert.ok(r.data.rows.length >= 1);
      assert.ok(r.data.rows.every((x) => Number(x.total) > 0));
    }
    assert.ok(!(await svc.shuPreview(prisma, { cooperativeId: coopA, year: 2026, total: "0", savingsSharePercent: 60 })).ok);
    assert.ok(!(await svc.shuPreview(prisma, { cooperativeId: coopA, year: 2026, total: "1000", savingsSharePercent: 120 })).ok);
    const other = await svc.shuPreview(prisma, { cooperativeId: coopB, year: 2026, total: "1000", savingsSharePercent: 50 });
    assert.ok(other.ok && other.data.rows.length === 0);
  });
});
