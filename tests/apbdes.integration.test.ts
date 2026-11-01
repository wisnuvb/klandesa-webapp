/** Tes integrasi keuangan desa (APB Desa, Buku Kas Umum, penutupan bulan) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Keuangan desa Permendagri 20/2018 (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/apbdes/service");
  let rep: typeof import("../lib/apbdes/report-data");
  let vA = 0;
  let vB = 0;
  const NOW = new Date("2026-11-15T03:00:00Z");

  const line = (villageId: number, documentId: number, accountCode: string, amount: number, activityCode?: string) => svc.addLine(prisma, { villageId, documentId, input: { accountCode, amount, activityCode } });
  const entry = (villageId: number, o: Record<string, unknown>) => svc.addEntry(prisma, { villageId, userId: 1, input: { voucherNo: "B-1", description: "uji", channel: "BANK", ...o }, now: NOW });
  const receive = (villageId: number, date: string, amount: number, accountCode = "4.2.1.01", channel = "BANK") => entry(villageId, { type: "PENERIMAAN", entryDate: date, amount, accountCode, channel });
  const spend = (villageId: number, date: string, amount: number, o: Record<string, unknown> = {}) => entry(villageId, { type: "PENGELUARAN", entryDate: date, amount, accountCode: "5.2.1.01", activityCode: "1.1.04", ...o });

  /** Desa dengan APB Desa 2026 ditetapkan: DD 1.000 + SiLPA 0 ; belanja ATK 1.000 (kegiatan 1.1.04). */
  async function adoptedVillage(tag: string) {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `${tag}${t}`, name: tag, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    const d = await svc.createDocument(prisma, { villageId: v.id, year: 2026, userId: 1 });
    assert.ok(d.ok);
    const id = d.ok ? d.data.id : 0;
    assert.ok((await line(v.id, id, "4.2.1.01", 1000_000)).ok);
    assert.ok((await line(v.id, id, "5.2.1.01", 1000_000, "1.1.04")).ok);
    const a = await svc.adoptDocument(prisma, { villageId: v.id, documentId: id, regulationNumber: "Perdes 3/2026", regulationDate: "2025-12-20", now: NOW });
    assert.ok(a.ok, JSON.stringify(a));
    return { villageId: v.id, documentId: id };
  }

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/apbdes/service");
    rep = await import("../lib/apbdes/report-data");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("KA")).id;
    vB = (await mkV("KB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("APB Desa: draf bisa diubah, ditetapkan butuh Perdes, setelah itu terkunci; hanya satu APB Desa awal per tahun", async () => {
    const d = await svc.createDocument(prisma, { villageId: vA, year: 2026, userId: 1 });
    assert.ok(d.ok);
    const id = d.ok ? d.data.id : 0;
    assert.equal((await svc.createDocument(prisma, { villageId: vA, year: 2026, userId: 1 })).ok, false);
    assert.equal((await line(vA, id, "5.2.1.01", 500_000)).ok, false, "belanja tanpa kegiatan ditolak");
    const l1 = await line(vA, id, "4.2.1.01", 800_000);
    const l2 = await line(vA, id, "5.2.1.01", 500_000, "1.1.04");
    assert.ok(l1.ok && l2.ok);
    assert.equal((await svc.adoptDocument(prisma, { villageId: vA, documentId: id, regulationNumber: "", regulationDate: "2025-12-20", now: NOW })).ok, false, "nomor Perdes wajib");
    assert.equal((await svc.adoptDocument(prisma, { villageId: vA, documentId: id, regulationNumber: "P1", regulationDate: "2027-01-01", now: NOW })).ok, false, "tanggal masa depan ditolak");
    const a = await svc.adoptDocument(prisma, { villageId: vA, documentId: id, regulationNumber: "Perdes 1/2026", regulationDate: "2025-12-20", now: NOW });
    assert.ok(a.ok && a.data.warnings.length === 1, "anggaran tak seimbang diperingatkan, bukan diblokir");
    assert.equal((await line(vA, id, "4.2.1.01", 1)).ok, false, "dokumen ditetapkan terkunci");
    assert.equal((await svc.deleteLine(prisma, { villageId: vA, documentId: id, lineId: l1.ok ? l1.data.id : 0 })).ok, false);
    assert.equal((await svc.deleteDocument(prisma, { villageId: vA, documentId: id })).ok, false);
    assert.equal((await svc.getDocument(prisma, vB, id)).ok, false, "desa lain tak bisa membaca");
    assert.equal((await line(vB, id, "4.2.1.01", 1)).ok, false, "desa lain tak bisa mengubah");
  });

  it("Perubahan APB Desa: salinan dokumen terakhir; kedua dan seterusnya wajib alasan luar biasa", async () => {
    const { villageId, documentId } = await adoptedVillage("PA");
    const a1 = await svc.createAmendment(prisma, { villageId, year: 2026, userId: 1 });
    assert.ok(a1.ok && a1.data.version === 1);
    assert.equal((await svc.createAmendment(prisma, { villageId, year: 2026, userId: 1 })).ok, false, "masih ada draf");
    const copy = await svc.getDocument(prisma, villageId, a1.ok ? a1.data.id : 0);
    assert.ok(copy.ok && (copy.data as { lines: unknown[] }).lines.length === 2);
    const adopt = await svc.adoptDocument(prisma, { villageId, documentId: a1.ok ? a1.data.id : 0, regulationNumber: "Perdes 9/2026", regulationDate: "2026-09-01", now: NOW });
    assert.ok(adopt.ok);
    assert.equal((await svc.adoptDocument(prisma, { villageId, documentId, regulationNumber: "x", regulationDate: "2026-09-01", now: NOW })).ok, false, "dokumen lama sudah ditetapkan");
    const a2 = await svc.createAmendment(prisma, { villageId, year: 2026, userId: 1 });
    assert.equal(a2.ok, false, "perubahan kedua tanpa alasan ditolak");
    const a2b = await svc.createAmendment(prisma, { villageId, year: 2026, userId: 1, exceptionalReason: "Bencana banjir bandang awal Oktober" });
    assert.ok(a2b.ok && a2b.data.version === 2);
    assert.equal((await svc.createAmendment(prisma, { villageId: vB, year: 2026, userId: 1 })).ok, false, "desa tanpa APB Desa tak bisa membuat perubahan");
  });

  it("belanja butuh APB Desa yang berlaku, rekening yang dianggarkan, dan tidak boleh melebihi pagu", async () => {
    const noDoc = await prisma.village.create({ data: { code: `ND${Date.now() % 1e6}`, name: "ND", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 86_400_000) } });
    assert.ok((await receive(noDoc.id, "2026-01-05", 5_000_000)).ok, "penerimaan boleh tanpa APB Desa");
    assert.equal((await spend(noDoc.id, "2026-01-06", 1000)).ok, false);
    await prisma.village.delete({ where: { id: noDoc.id } });

    const { villageId } = await adoptedVillage("PG");
    assert.ok((await receive(villageId, "2026-01-05", 5_000_000)).ok);
    assert.equal((await spend(villageId, "2026-01-10", 100_000, { accountCode: "5.2.1.02" })).ok, false, "rekening tak dianggarkan");
    assert.equal((await spend(villageId, "2026-01-10", 100_000, { activityCode: "1.1.05" })).ok, false, "kegiatan tak dianggarkan");
    assert.ok((await spend(villageId, "2026-01-10", 900_000)).ok);
    const over = await spend(villageId, "2026-01-11", 100_001);
    assert.equal(over.ok, false);
    assert.match(over.ok ? "" : over.errors[0]!, /melebihi anggaran/i);
    assert.ok((await spend(villageId, "2026-01-11", 100_000)).ok, "tepat sampai pagu boleh");
  });

  it("saldo tak boleh minus, dan pencatatan serentak tidak lolos bersama-sama (kunci tahun)", async () => {
    const { villageId } = await adoptedVillage("PC");
    assert.ok((await receive(villageId, "2026-02-01", 100_000)).ok);
    assert.equal((await spend(villageId, "2026-02-02", 100_001)).ok, false);
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => spend(villageId, "2026-02-03", 40_000, { voucherNo: `S${i}` })));
    assert.equal(results.filter((r) => r.ok).length, 2, "saldo 100 hanya cukup untuk dua belanja 40");
    const bal = await rep.overview(prisma, villageId, 2026, NOW);
    assert.equal(bal.balances.bank, "20000.00");
  });

  it("pajak dipotong tertahan, setoran pajak tak boleh melebihi, dan ringkasan saldo benar", async () => {
    const { villageId } = await adoptedVillage("PT");
    assert.ok((await receive(villageId, "2026-03-01", 1_000_000)).ok);
    assert.ok((await spend(villageId, "2026-03-02", 400_000, { taxAmount: 40_000, taxKind: "PPN" })).ok);
    let o = await rep.overview(prisma, villageId, 2026, NOW);
    assert.equal(o.balances.bank, "640000.00");
    assert.equal(o.balances.pajak, "40000.00");
    assert.equal((await entry(villageId, { type: "SETOR_PAJAK", entryDate: "2026-03-05", amount: 40_001 })).ok, false);
    assert.ok((await entry(villageId, { type: "SETOR_PAJAK", entryDate: "2026-03-05", amount: 40_000 })).ok);
    o = await rep.overview(prisma, villageId, 2026, NOW);
    assert.equal(o.balances.bank, "600000.00");
    assert.equal(o.balances.pajak, "0.00");
    const tax = await rep.buildReport(prisma, villageId, 2026, "pajak");
    assert.ok(tax.ok && tax.data.rows.length === 3);
  });

  it("tarik tunai: tunai tak bisa dibelanjakan sebelum ditarik; menghapus penerimaan yang menopang belanja ditolak", async () => {
    const { villageId } = await adoptedVillage("PD");
    const r = await receive(villageId, "2026-04-01", 500_000);
    assert.equal((await spend(villageId, "2026-04-02", 100_000, { channel: "TUNAI" })).ok, false);
    assert.ok((await entry(villageId, { type: "TARIK_BANK", entryDate: "2026-04-02", amount: 200_000 })).ok);
    const s = await spend(villageId, "2026-04-03", 150_000, { channel: "TUNAI" });
    assert.ok(s.ok);
    assert.equal((await entry(villageId, { type: "SETOR_BANK", entryDate: "2026-04-04", amount: 60_000 })).ok, false, "tunai tinggal 50.000");
    const del = await svc.deleteEntry(prisma, { villageId, entryId: r.ok ? r.data.id : 0 });
    assert.equal(del.ok, false);
    assert.ok((await svc.deleteEntry(prisma, { villageId, entryId: s.ok ? s.data.id : 0 })).ok);
  });

  it("penutupan bulan: terkunci, berurutan, diverifikasi lalu disetujui, dan bisa dibuka kembali dari bulan terakhir", async () => {
    const { villageId } = await adoptedVillage("PM");
    const e1 = await receive(villageId, "2026-05-10", 100_000);
    assert.ok(e1.ok);
    assert.ok((await receive(villageId, "2026-06-10", 50_000)).ok);
    const act = (month: number, action: "close" | "verify" | "approve" | "reopen", allowReopenApproved = false) => svc.actOnMonth(prisma, { villageId, userId: 1, year: 2026, month, action, now: NOW, allowReopenApproved });
    assert.equal((await act(6, "close")).ok, false, "bulan Mei yang ada catatannya harus ditutup dulu");
    assert.ok((await act(5, "close")).ok);
    assert.equal((await act(5, "close")).ok, false);
    assert.equal((await receive(villageId, "2026-05-20", 1)).ok, false, "bulan tertutup menolak catatan");
    assert.equal((await svc.deleteEntry(prisma, { villageId, entryId: e1.ok ? e1.data.id : 0 })).ok, false);
    assert.equal((await svc.updateEntry(prisma, { villageId, entryId: e1.ok ? e1.data.id : 0, input: { voucherNo: "x", description: "y", channel: "BANK", type: "PENERIMAAN", entryDate: "2026-05-10", amount: 5, accountCode: "4.2.1.01" }, now: NOW })).ok, false);
    assert.equal((await act(5, "approve")).ok, false, "belum diverifikasi");
    assert.ok((await act(5, "verify")).ok);
    assert.equal((await act(5, "verify")).ok, false);
    const done = await act(5, "approve");
    assert.ok(done.ok && done.data[4]!.state === "DISETUJUI");
    assert.equal((await act(12, "close")).ok, false, "bulan Desember belum dimulai (sekarang 15 Nov)");
    assert.ok((await act(6, "close")).ok);
    assert.equal((await act(5, "reopen")).ok, false, "buka dari bulan paling akhir");
    assert.ok((await act(6, "reopen")).ok);
    assert.equal((await act(5, "reopen")).ok, false, "bulan yang sudah disetujui Kepala Desa tidak bisa dibuka tanpa wewenang persetujuan");
    const reopened = await act(5, "reopen", true);
    assert.ok(reopened.ok && reopened.data[4]!.state === "BUKA" && reopened.data[4]!.approvedAt === null, "persetujuan lama terhapus sepenuhnya");
    assert.ok((await receive(villageId, "2026-05-20", 1)).ok, "setelah dibuka, catatan diterima lagi");
  });

  it("catatan mundur ke bulan terbuka yang mendahului bulan tertutup ditolak; bulan berjalan tak bisa ditutup", async () => {
    const { villageId } = await adoptedVillage("PB");
    assert.ok((await receive(villageId, "2026-03-10", 100_000)).ok);
    const act = (month: number, action: "close" | "verify" | "approve" | "reopen") => svc.actOnMonth(prisma, { villageId, userId: 1, year: 2026, month, action, now: NOW, allowReopenApproved: true });
    assert.ok((await act(3, "close")).ok);
    const back = await receive(villageId, "2026-02-10", 5);
    assert.equal(back.ok, false, "Februari terbuka tetapi Maret sudah tertutup: saldo Maret akan bergeser");
    assert.match(back.ok ? "" : back.errors[0]!, /ditutup/);
    assert.ok((await receive(villageId, "2026-04-10", 5)).ok, "bulan sesudah bulan tertutup tetap boleh");
    assert.equal((await act(11, "close")).ok, false, "November sedang berjalan pada 15 November");
    assert.ok((await act(10, "close")).ok === false, "Oktober tidak boleh ditutup sebelum April ditutup");
    assert.ok((await act(4, "close")).ok);
  });

  it("antar desa terisolasi dan laporan memakai APB Desa yang berlaku (perubahan menggantikan awal)", async () => {
    const { villageId } = await adoptedVillage("PL");
    await receive(villageId, "2026-01-05", 700_000);
    await spend(villageId, "2026-02-10", 300_000);
    const sem = await rep.buildReport(prisma, villageId, 2026, "semester1");
    assert.ok(sem.ok && sem.data.rows.length > 5);
    const a = await svc.createAmendment(prisma, { villageId, year: 2026, userId: 1 });
    assert.ok(a.ok);
    const id = a.ok ? a.data.id : 0;
    const doc = await svc.getDocument(prisma, villageId, id);
    const expense = (doc.ok ? (doc.data as { lines: { id: number; accountCode: string }[] }).lines : []).find((l) => l.accountCode === "5.2.1.01")!;
    assert.ok((await svc.updateLine(prisma, { villageId, documentId: id, lineId: expense.id, input: { accountCode: "5.2.1.01", activityCode: "1.1.04", amount: 400_000 } })).ok);
    assert.ok((await svc.adoptDocument(prisma, { villageId, documentId: id, regulationNumber: "Perdes 8/2026", regulationDate: "2026-08-01", now: NOW })).ok);
    const o = await rep.overview(prisma, villageId, 2026, NOW);
    assert.equal(o.activeLabel, "Perubahan APB Desa ke-1");
    assert.equal(o.summary.expenseBudget, "400000.00");
    assert.equal((await spend(villageId, "2026-09-01", 100_001)).ok, false, "pagu perubahan 400.000, terpakai 300.000");
    assert.ok((await spend(villageId, "2026-09-01", 100_000)).ok);
    for (const kind of rep.REPORT_KINDS) {
      const t = await rep.buildReport(prisma, villageId, 2026, kind, 2);
      assert.ok(t.ok && t.data.columns.length > 2, kind);
      for (const row of t.ok ? t.data.rows : []) assert.equal(row.cells.length, t.ok ? t.data.columns.length : 0, `${kind}: jumlah sel sama dengan kolom`);
    }
    const pub = await rep.buildReport(prisma, villageId, 2026, "publik");
    assert.ok(pub.ok && pub.data.rows.some((r) => r.cells[0]!.startsWith("E. Alamat pengaduan")) && pub.data.rows.some((r) => r.cells[0]!.startsWith("1.1.04")));
    const other = await rep.overview(prisma, vB, 2026, NOW);
    assert.equal(other.entryCount, 0);
    assert.equal(other.documents.length, 0);
  });
});
