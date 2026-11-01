/** Tes integrasi bank sampah transaksional terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Bank sampah transaksional (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/lingkungan/waste-bank");
  let vA = 0;
  let vB = 0;
  let bankA = 0;
  let bankA2 = 0;
  let bankB = 0;
  let resA = 0;
  let resB = 0;
  const NOW = new Date("2026-11-15T03:00:00Z");

  const item = async (name: string, pricePerKg: string | number, bankId = bankA, villageId = vA) => {
    const r = await svc.saveItem(prisma, { villageId, bankId, input: { name, pricePerKg } });
    return r.ok ? r.data.id : 0;
  };
  const acct = async (name: string, bankId = bankA, villageId = vA) => {
    const r = await svc.createAccount(prisma, { villageId, bankId, input: { name } });
    return r.ok ? r.data.id : 0;
  };
  const dep = (accountId: number, itemId: number, weightKg: string | number, txDate = "2026-11-10", bankId = bankA, villageId = vA) =>
    svc.deposit(prisma, { villageId, bankId, userId: 1, input: { accountId, itemId, weightKg, txDate }, now: NOW });
  const wd = (accountId: number, amount: string | number, txDate = "2026-11-12", bankId = bankA, villageId = vA) =>
    svc.withdraw(prisma, { villageId, bankId, userId: 1, input: { accountId, amount, txDate }, now: NOW });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/lingkungan/waste-bank");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("BA")).id;
    vB = (await mkV("BB")).id;
    bankA = (await prisma.wasteBank.create({ data: { villageId: vA, name: "Bank Sampah A1" } })).id;
    bankA2 = (await prisma.wasteBank.create({ data: { villageId: vA, name: "Bank Sampah A2" } })).id;
    bankB = (await prisma.wasteBank.create({ data: { villageId: vB, name: "Bank Sampah B" } })).id;
    const mkR = (villageId: number, nik: string, name: string) => prisma.resident.create({ data: { villageId, nik: nik.padEnd(16, "0").slice(0, 16), name, birthplace: "x", birthDate: new Date("1980-01-01"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga" } });
    resA = (await mkR(vA, `33002${t}1`, "Warga Bank A")).id;
    resB = (await mkR(vB, `33002${t}2`, "Warga Bank B")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("jenis sampah: nama unik per bank, ubah harga, dan bank desa lain tak bisa disentuh", async () => {
    const id = await item("Botol plastik", "3500");
    assert.ok(id > 0);
    const dup = await svc.saveItem(prisma, { villageId: vA, bankId: bankA, input: { name: "Botol plastik", pricePerKg: 100 } });
    assert.ok(!dup.ok && dup.status === 409 && dup.fieldErrors?.name);
    assert.ok((await item("Botol plastik", "3500", bankA2)) > 0, "nama sama di bank lain boleh");
    assert.ok((await svc.saveItem(prisma, { villageId: vA, bankId: bankA, itemId: id, input: { name: "Botol plastik", pricePerKg: "4000" } })).ok);
    assert.equal((await item("X", 100, bankB, vA)), 0, "bank milik desa lain");
    assert.ok(!(await svc.saveItem(prisma, { villageId: vA, bankId: bankA2, itemId: id, input: { name: "Disusupi", pricePerKg: 1 } })).ok, "item milik bank lain");
  });

  it("nasabah dari data warga mengambil nama; warga desa lain ditolak; butuh nama atau warga", async () => {
    const a = await svc.createAccount(prisma, { villageId: vA, bankId: bankA, input: { residentId: resA } });
    assert.ok(a.ok);
    const ledA = await svc.ledger(prisma, vA, bankA, NOW);
    assert.ok(ledA.ok && JSON.stringify(ledA.data).includes("Warga Bank A"));
    assert.ok(!(await svc.createAccount(prisma, { villageId: vA, bankId: bankA, input: { residentId: resB } })).ok);
    assert.ok(!(await svc.createAccount(prisma, { villageId: vA, bankId: bankA, input: {} })).ok);
    assert.ok(!(await svc.createAccount(prisma, { villageId: vB, bankId: bankA, input: { name: "Penyusup" } })).ok, "bank desa lain");
  });

  it("setoran: nilai = berat x harga saat ini (disalin), saldo bertambah; harga baru tak mengubah setoran lama", async () => {
    const itemId = await item("Kardus", "2000");
    const id = await acct("Pak Dani");
    const d1 = await dep(id, itemId, "2.5");
    assert.ok(d1.ok && d1.data.amount === "5000.00" && d1.data.balance === "5000.00");
    await svc.saveItem(prisma, { villageId: vA, bankId: bankA, itemId, input: { name: "Kardus", pricePerKg: "3000" } });
    const d2 = await dep(id, itemId, "1");
    assert.ok(d2.ok && d2.data.amount === "3000.00" && d2.data.balance === "8000.00");
    const first = await prisma.wasteBankTx.findUniqueOrThrow({ where: { id: d1.ok ? d1.data.id : 0 } });
    assert.equal(first.pricePerKg?.toFixed(2), "2000.00", "salinan harga lama utuh");
    assert.equal(first.itemName, "Kardus");
  });

  it("penarikan: sampai saldo; serentak tak melewati saldo; nominal tak valid ditolak", async () => {
    const itemId = await item("Kaleng", "1000");
    const id = await acct("Bu Rini");
    await dep(id, itemId, "10");
    assert.ok((await wd(id, "4000")).ok);
    const over = await wd(id, "6000.01");
    assert.ok(!over.ok && over.status === 409 && over.fieldErrors?.amount);
    const rs = await Promise.all(Array.from({ length: 5 }, () => wd(id, "4000")));
    assert.equal(rs.filter((r) => r.ok).length, 1, "sisa 6.000 hanya cukup untuk satu penarikan 4.000");
    for (const bad of [0, -1, "abc", "1.234"]) assert.ok(!(await wd(id, bad as never)).ok, String(bad));
  });

  it("jenis tak aktif tak diterima; setoran/penarikan di bank atau desa lain ditolak; tanggal masa depan ditolak", async () => {
    const itemId = await item("Kaca", "500");
    const id = await acct("Pak Eko");
    await svc.saveItem(prisma, { villageId: vA, bankId: bankA, itemId, input: { name: "Kaca", pricePerKg: "500", active: false } });
    const off = await dep(id, itemId, "1");
    assert.ok(!off.ok && off.status === 409);
    const live = await item("Aluminium", "9000");
    assert.ok(!(await dep(id, live, "1", "2026-11-10", bankA2)).ok, "nasabah milik bank lain");
    assert.ok(!(await dep(id, live, "1", "2026-11-10", bankA, vB)).ok, "desa lain");
    assert.ok(!(await dep(id, live, "1", "2026-12-25")).ok, "masa depan");
    assert.ok(!(await dep(id, live, "0")).ok);
    assert.ok(!(await wd(id, "1", "2026-11-12", bankA, vB)).ok);
  });

  it("papan: saldo per nasabah, total saldo, dan rekap bulan ini per jenis", async () => {
    const r = await svc.ledger(prisma, vA, bankA, NOW);
    assert.ok(r.ok);
    if (r.ok) {
      const d = r.data as { accounts: { name: string; balance: string }[]; totalBalance: string; month: { totalKg: string; byItem: { itemName: string; kg: string }[] }; recent: unknown[] };
      assert.equal(d.accounts.find((a) => a.name === "Pak Dani")?.balance, "8000.00");
      assert.equal(d.accounts.find((a) => a.name === "Bu Rini")?.balance, "2000.00");
      assert.equal(Number(d.totalBalance), d.accounts.reduce((a, x) => a + Number(x.balance), 0));
      assert.ok(Number(d.month.totalKg) >= 13.5);
      assert.ok(d.month.byItem.some((i) => i.itemName === "Kardus"));
      assert.ok(d.recent.length > 0);
    }
    assert.ok(!(await svc.ledger(prisma, vB, bankA, NOW)).ok, "desa lain tak bisa melihat");
  });

  it("menghapus warga tidak menghapus rekening (nama tersimpan); menghapus bank ikut menghapus catatannya", async () => {
    const id = await acct("Nasabah Warga", bankA);
    await prisma.wasteBankAccount.update({ where: { id }, data: { residentId: resA } });
    await prisma.resident.delete({ where: { id: resA } });
    const row = await prisma.wasteBankAccount.findUniqueOrThrow({ where: { id } });
    assert.equal(row.residentId, null);
    assert.equal(row.name, "Nasabah Warga");
    await prisma.wasteBank.delete({ where: { id: bankA } });
    assert.equal(await prisma.wasteBankTx.count({ where: { wasteBankId: bankA } }), 0);
  });
});
