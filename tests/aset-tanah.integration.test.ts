/** Tes integrasi tanah kas desa dan perjanjian pemanfaatan terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Tanah kas desa dan pemanfaatan aset (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let land: typeof import("../lib/aset-desa/land-service");
  let aset: typeof import("../lib/aset-desa/service");
  let apb: typeof import("../lib/apbdes/service");
  let vA = 0;
  let vB = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");

  const item = async (villageId: number, over: Record<string, unknown> = {}) => {
    const r = await aset.createItem(prisma, { villageId, userId: 1, input: { name: "Tanah Kas Blok A", category: "TANAH_KAS_DESA", origin: "ASLI_DESA", acquiredYear: 2010, ...over }, now: NOW });
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    return r.ok ? r.data.id : 0;
  };
  const base = (over: Record<string, unknown> = {}) => ({
    kind: "SEWA",
    lesseeName: "Pak Slamet",
    lesseeKind: "PERORANGAN",
    startOn: "2026-01-01",
    endOn: "2026-12-31",
    periodUnit: "BULAN",
    amount: "500000",
    tenantDuties: "Pajak dan perawatan oleh penyewa",
    forceMajeureIncluded: true,
    agreementNo: "01/SWA/2026",
    signedOn: "2025-12-29",
    perdesNo: "3/2025",
    perdesDate: "2025-12-20",
    ...over,
  });
  const draft = async (villageId: number, itemId: number, over: Record<string, unknown> = {}) => {
    const r = await land.createAgreement(prisma, { villageId, userId: 1, itemId, input: base(over) });
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    return r.ok ? r.data.id : 0;
  };
  const activate = (villageId: number, id: number) => land.activateAgreement(prisma, { villageId, userId: 1, id });
  const live = async (villageId: number, itemId: number, over: Record<string, unknown> = {}) => {
    const id = await draft(villageId, itemId, over);
    const r = await activate(villageId, id);
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    return id;
  };
  const chargesOf = (id: number) => prisma.landCharge.findMany({ where: { agreementId: id }, orderBy: { seq: "asc" } });
  const entriesOf = (villageId: number, year = 2026) => prisma.apbdesEntry.findMany({ where: { villageId, year } });
  const receive = (villageId: number, chargeId: number, over: Record<string, unknown> = {}) => land.receiveCharge(prisma, { villageId, userId: 1, chargeId, input: { receivedOn: "2026-10-30", channel: "BANK", ...over }, now: NOW });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    land = await import("../lib/aset-desa/land-service");
    aset = await import("../lib/aset-desa/service");
    apb = await import("../lib/apbdes/service");
    const t = `${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("TA")).id;
    vB = (await mk("TB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("atribut tanah: hanya golongan tanah, isolasi desa, simpan ulang mengubah (bukan menggandakan), luas string", async () => {
    const id = await item(vA);
    const ok1 = await land.saveParcel(prisma, { villageId: vA, userId: 1, itemId: id, input: { areaSqm: "1250,5", rightKind: "SHM", rightNumber: "00123", boundaryNorth: "Jalan desa", usage: "DISEWAKAN" }, now: NOW });
    assert.ok(ok1.ok);
    if (ok1.ok) assert.equal(ok1.data.areaSqm, "1250.50");
    const again = await land.saveParcel(prisma, { villageId: vA, userId: 1, itemId: id, input: { areaSqm: "1300", rightKind: "SHM", rightNumber: "00123" }, now: NOW });
    assert.ok(again.ok);
    assert.equal(await prisma.landParcel.count({ where: { itemId: id } }), 1);
    const notLand = await item(vA, { name: "Kursi", category: "MEBEL_PERLENGKAPAN", origin: "APBDES" });
    const bad = await land.saveParcel(prisma, { villageId: vA, userId: 1, itemId: notLand, input: { areaSqm: "10", rightKind: "BELUM_ADA" }, now: NOW });
    assert.ok(!bad.ok && bad.status === 400);
    const cross = await land.saveParcel(prisma, { villageId: vB, userId: 1, itemId: id, input: { areaSqm: "10", rightKind: "BELUM_ADA" }, now: NOW });
    assert.ok(!cross.ok && cross.status === 404);
    const parallel = await item(vA, { name: "Tanah P" });
    const rs = await Promise.all([1, 2, 3, 4].map(() => land.saveParcel(prisma, { villageId: vA, userId: 1, itemId: parallel, input: { areaSqm: "10", rightKind: "BELUM_ADA" }, now: NOW })));
    assert.ok(rs.every((r) => r.ok), "simpan paralel tidak boleh melempar galat kunci unik");
    assert.equal(await prisma.landParcel.count({ where: { itemId: parallel } }), 1);
    const list = await land.listLand(prisma, vB, { page: 1, pageSize: 50 });
    assert.equal(list.total, 0);
  });

  it("draf: objek harus milik desa sendiri, golongan boleh disewakan, luas tak melebihi tanah; aktivasi menolak yang belum lengkap", async () => {
    const id = await item(vA);
    await land.saveParcel(prisma, { villageId: vA, userId: 1, itemId: id, input: { areaSqm: "1000", rightKind: "SHM", rightNumber: "9" }, now: NOW });
    const other = await item(vB);
    const cross = await land.createAgreement(prisma, { villageId: vA, userId: 1, itemId: other, input: base() });
    assert.ok(!cross.ok && cross.status === 400);
    const car = await item(vA, { name: "Mobil", category: "KENDARAAN", origin: "APBDES" });
    assert.ok(!(await land.createAgreement(prisma, { villageId: vA, userId: 1, itemId: car, input: base() })).ok);
    const big = await land.createAgreement(prisma, { villageId: vA, userId: 1, itemId: id, input: base({ leasedAreaSqm: "1001" }) });
    assert.ok(!big.ok && big.fieldErrors?.leasedAreaSqm);
    const d = await draft(vA, id, { perdesNo: null, perdesDate: null, forceMajeureIncluded: false, agreementNo: null });
    const r = await activate(vA, d);
    assert.ok(!r.ok && r.status === 409 && r.errors[0]!.includes("Pasal 11 ayat 3"));
    assert.equal(await prisma.landCharge.count({ where: { agreementId: d } }), 0);
    const detail = await land.getAgreement(prisma, vA, d);
    assert.ok(detail && detail.blockers.length === 3);
    assert.equal((await prisma.landAgreement.findUniqueOrThrow({ where: { id: d } })).accountCode, "4.1.2.01");
  });

  it("aktivasi membuat jadwal tagihan; kerja sama tanpa izin Bupati ditolak; draf aktif tak bisa diubah isinya, hanya dilengkapi", async () => {
    const id = await item(vA);
    const ks = await draft(vA, id, { kind: "KERJASAMA", periodUnit: "TAHUN", endOn: "2030-12-31" });
    const no = await activate(vA, ks);
    assert.ok(!no.ok && no.errors[0]!.includes("Pasal 17"));
    await prisma.landAgreement.update({ where: { id: ks }, data: { regencyPermitNo: "B/5/2026", regencyPermitDate: new Date("2025-12-30") } });
    const yes = await activate(vA, ks);
    assert.ok(yes.ok && yes.data.charges === 5);
    const cs = await chargesOf(ks);
    assert.deepEqual(cs.map((c) => c.dueOn.toISOString().slice(0, 10)), ["2026-01-01", "2027-01-01", "2028-01-01", "2029-01-01", "2030-01-01"]);
    assert.ok(cs.every((c) => c.amountCents === 50_000_000n && c.status === "BELUM"));
    const twice = await activate(vA, ks);
    assert.ok(!twice.ok && twice.status === 409);
    assert.equal(await prisma.landCharge.count({ where: { agreementId: ks } }), 5);
    const upd = await land.updateDraft(prisma, { villageId: vA, id: ks, input: base({ amount: "1" }) });
    assert.ok(!upd.ok && upd.status === 409);
    const del = await land.deleteDraft(prisma, { villageId: vA, id: ks });
    assert.ok(!del.ok && del.status === 409);
    const am = await land.amendAgreement(prisma, { villageId: vA, id: ks, input: { lesseeContact: "0812345" } });
    assert.ok(am.ok);
    const amBad = await land.amendAgreement(prisma, { villageId: vA, id: ks, input: { amount: 1 } });
    assert.ok(!amBad.ok);
  });

  it("tumpang tindih: objek yang sama pada waktu bersamaan ditolak; sewa sebagian sampai luas penuh diterima", async () => {
    const id = await item(vA, { name: "Tanah Sebagian" });
    await land.saveParcel(prisma, { villageId: vA, userId: 1, itemId: id, input: { areaSqm: "1000", rightKind: "BELUM_ADA" }, now: NOW });
    await live(vA, id, { leasedAreaSqm: "600" });
    const p2 = await draft(vA, id, { leasedAreaSqm: "400", lesseeName: "Bu Ani" });
    assert.ok((await activate(vA, p2)).ok);
    const p3 = await draft(vA, id, { leasedAreaSqm: "1", lesseeName: "Pak Dodi" });
    const r3 = await activate(vA, p3);
    assert.ok(!r3.ok && r3.errors[0]!.includes("melebihi luas"));
    const later = await draft(vA, id, { leasedAreaSqm: "1000", startOn: "2027-01-01", endOn: "2027-12-31" });
    assert.ok((await activate(vA, later)).ok, "waktu berbeda tidak bertabrakan");
  });

  it("KONKURENSI: dua perjanjian yang sama-sama mengklaim seluruh objek, diaktifkan bersamaan: tepat satu yang berlaku", async () => {
    for (let round = 0; round < 6; round++) {
      const id = await item(vA, { name: `Tanah Balap ${round}` });
      const a = await draft(vA, id, { lesseeName: "A" });
      const b = await draft(vA, id, { lesseeName: "B" });
      const rs = await Promise.all([activate(vA, a), activate(vA, b)]);
      assert.equal(rs.filter((r) => r.ok).length, 1, `putaran ${round}: ${JSON.stringify(rs.map((r) => r.ok))}`);
      assert.equal(await prisma.landAgreement.count({ where: { itemId: id, status: "AKTIF" } }), 1);
    }
  });

  it("KONKURENSI: menghapus barang dari buku vs memberlakukan perjanjian bersamaan tidak pernah menyisakan barang terhapus dengan perjanjian berlaku", async () => {
    for (let round = 0; round < 6; round++) {
      const id = await item(vA, { name: `Tanah Hapus ${round}` });
      const a = await draft(vA, id);
      const [act, disp] = await Promise.all([
        activate(vA, a),
        aset.disposeItem(prisma, { villageId: vA, id, input: { reason: "SEBAB_LAIN", disposedAt: "2026-10-01", decree: "KD 1/2026", regencyApproved: true }, now: NOW }),
      ]);
      const it_ = await prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
      const ag = await prisma.landAgreement.findUniqueOrThrow({ where: { id: a } });
      assert.ok(!(it_.status === "DISPOSED" && ag.status === "AKTIF"), `putaran ${round}: act=${act.ok} disp=${disp.ok}`);
    }
  });

  it("barang dengan perjanjian berlaku tidak dapat dihapus dari buku; setelah perjanjian diakhiri dapat", async () => {
    const id = await item(vA, { name: "Tanah Dihapus" });
    const ag = await live(vA, id);
    const blocked = await aset.disposeItem(prisma, { villageId: vA, id, input: { reason: "BERALIH_KEPEMILIKAN", disposedAt: "2026-10-01", decree: "KD 2/2026", regencyApproved: true }, now: NOW });
    assert.ok(!blocked.ok && blocked.status === 409 && blocked.errors[0]!.includes("perjanjian"));
    assert.ok((await land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "SELESAI", reason: "Selesai lebih awal", endedOn: "2026-10-31", now: NOW })).ok);
    const done = await aset.disposeItem(prisma, { villageId: vA, id, input: { reason: "BERALIH_KEPEMILIKAN", disposedAt: "2026-10-01", decree: "KD 2/2026", regencyApproved: true }, now: NOW });
    assert.ok(done.ok);
  });

  it("menerima tagihan: tepat satu catatan PENERIMAAN di Buku Kas Umum dengan rekening 4.1.2.01 dan jumlah tagihan", async () => {
    const id = await item(vA, { name: "Tanah Terima" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    const r = await receive(vA, c1!.id, { voucherNo: "BKT-77" });
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    const entries = (await entriesOf(vA)).filter((e) => e.voucherNo === "BKT-77");
    assert.equal(entries.length, 1);
    const e = entries[0]!;
    assert.equal(e.type, "PENERIMAAN");
    assert.equal(e.accountCode, "4.1.2.01");
    assert.equal(e.amountCents, 50_000_000n);
    assert.equal(e.channel, "BANK");
    assert.equal(e.entryDate.toISOString().slice(0, 10), "2026-10-30");
    assert.equal(e.activityCode, null);
    assert.ok(e.description.includes("Tanah Terima") && e.description.includes("Pak Slamet"));
    const c = await prisma.landCharge.findUniqueOrThrow({ where: { id: c1!.id } });
    assert.equal(c.status, "DITERIMA");
    assert.equal(c.entryId, e.id);
    assert.equal(c.voucherNo, "BKT-77");
    const again = await receive(vA, c1!.id);
    assert.ok(!again.ok && again.status === 409);
    assert.equal((await entriesOf(vA)).filter((x) => x.id === e.id).length, 1);
  });

  it("KONKURENSI: klik ganda/permintaan bersamaan pada tagihan yang sama hanya mencatat satu penerimaan", async () => {
    const id = await item(vA, { name: "Tanah Ganda" });
    const ag = await live(vA, id);
    const cs = await chargesOf(ag);
    for (const c of cs.slice(0, 3)) {
      const before = (await entriesOf(vA)).length;
      const rs = await Promise.all([1, 2, 3, 4, 5].map(() => receive(vA, c.id)));
      assert.equal(rs.filter((r) => r.ok).length, 1);
      assert.equal((await entriesOf(vA)).length, before + 1);
    }
  });

  it("penerimaan ditolak bila bulannya sudah ditutup di Buku Kas Umum, dan tak meninggalkan tagihan setengah jadi", async () => {
    const id = await item(vA, { name: "Tanah Tutup" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    await apb.ensureYear(prisma, vA, 2026);
    await prisma.apbdesMonthClose.create({ data: { villageId: vA, year: 2026, month: 9 } });
    const r = await receive(vA, c1!.id, { receivedOn: "2026-09-10" });
    assert.ok(!r.ok && r.status === 409 && r.errors[0]!.includes("ditutup"));
    const c = await prisma.landCharge.findUniqueOrThrow({ where: { id: c1!.id } });
    assert.equal(c.status, "BELUM");
    assert.equal(c.entryId, null);
    await prisma.apbdesMonthClose.deleteMany({ where: { villageId: vA, year: 2026, month: 9 } });
  });

  it("batalkan penerimaan: catatan Buku Kas Umum hilang lewat fungsi buku kas, tagihan kembali 'belum', dapat diterima ulang", async () => {
    const id = await item(vA, { name: "Tanah Batal Terima" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    const r = await receive(vA, c1!.id, { voucherNo: "BKT-REV" });
    assert.ok(r.ok);
    const entryId = r.ok ? r.data.entryId : 0;
    assert.ok((await land.revertReceipt(prisma, { villageId: vA, chargeId: c1!.id })).ok);
    assert.equal(await prisma.apbdesEntry.count({ where: { id: entryId } }), 0);
    const c = await prisma.landCharge.findUniqueOrThrow({ where: { id: c1!.id } });
    assert.equal(c.status, "BELUM");
    assert.equal(c.entryId, null);
    assert.ok(!(await land.revertReceipt(prisma, { villageId: vA, chargeId: c1!.id })).ok);
    assert.ok((await receive(vA, c1!.id, { voucherNo: "BKT-REV2" })).ok);
  });

  it("batalkan penerimaan pada bulan yang sudah ditutup ditolak dan tagihan tetap diterima", async () => {
    const id = await item(vA, { name: "Tanah Revert Tutup" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    const r = await receive(vA, c1!.id, { receivedOn: "2026-08-10" });
    assert.ok(r.ok);
    await prisma.apbdesMonthClose.create({ data: { villageId: vA, year: 2026, month: 8 } });
    const rev = await land.revertReceipt(prisma, { villageId: vA, chargeId: c1!.id });
    assert.ok(!rev.ok && rev.status === 409);
    const c = await prisma.landCharge.findUniqueOrThrow({ where: { id: c1!.id } });
    assert.equal(c.status, "DITERIMA");
    assert.equal(await prisma.apbdesEntry.count({ where: { id: c.entryId! } }), 1);
    await prisma.apbdesMonthClose.deleteMany({ where: { villageId: vA, year: 2026, month: 8 } });
  });

  it("catatan Buku Kas Umum hilang dari luar jalur aplikasi: terdeteksi sebagai peringatan BKU_HILANG dan penerimaan dapat dibatalkan lalu dicatat ulang", async () => {
    const id = await item(vA, { name: "Tanah BKU Hilang" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    const r = await receive(vA, c1!.id, { receivedOn: "2026-10-05" });
    assert.ok(r.ok);
    // Menu APB Desa kini menolak menghapus catatan sewa (penguncian modul APB Desa); kehilangan lewat jalur lain (SQL langsung, pemulihan data) disimulasikan di sini.
    await prisma.apbdesEntry.deleteMany({ where: { id: r.ok ? r.data.entryId : 0 } });
    const ov = await land.overview(prisma, vA, NOW);
    assert.ok(ov.findings.some((f) => f.code === "BKU_HILANG" && f.agreementId === ag));
    const detail = await land.getAgreement(prisma, vA, ag);
    assert.ok(detail?.charges[0]?.entryMissing);
    assert.ok((await land.revertReceipt(prisma, { villageId: vA, chargeId: c1!.id })).ok);
    assert.ok((await receive(vA, c1!.id, { receivedOn: "2026-10-05" })).ok);
  });

  it("jumlah di Buku Kas Umum diubah dari luar: terdeteksi sebagai BKU_BEDA", async () => {
    const id = await item(vA, { name: "Tanah BKU Beda" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    const r = await receive(vA, c1!.id, { receivedOn: "2026-10-06" });
    assert.ok(r.ok);
    await prisma.apbdesEntry.update({ where: { id: r.ok ? r.data.entryId : 0 }, data: { amountCents: 1n } });
    const ov = await land.overview(prisma, vA, NOW);
    assert.ok(ov.findings.some((f) => f.code === "BKU_BEDA" && f.agreementId === ag));
  });

  it("mengakhiri: tagihan yang belum jatuh tempo dibatalkan, yang sudah jatuh tempo tetap ditagih; BATAL ditolak bila sudah ada penerimaan", async () => {
    const id = await item(vA, { name: "Tanah Akhiri" });
    const ag = await live(vA, id);
    const cs = await chargesOf(ag);
    assert.ok((await receive(vA, cs[0]!.id)).ok);
    const batal = await land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "BATAL", reason: "salah", endedOn: "2026-06-15", now: NOW });
    assert.ok(!batal.ok && batal.status === 409);
    const r = await land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "SELESAI", reason: "Penyewa pindah", endedOn: "2026-06-15", now: NOW });
    assert.ok(r.ok && r.data.voided === 6);
    const after_ = await chargesOf(ag);
    assert.equal(after_.filter((c) => c.status === "BATAL").length, 6);
    assert.equal(after_.filter((c) => c.status === "BELUM").length, 5);
    assert.equal(after_.filter((c) => c.status === "DITERIMA").length, 1);
    assert.ok(!(await receive(vA, after_.find((c) => c.status === "BATAL")!.id)).ok, "tagihan batal tak dapat diterima");
    assert.ok(!(await land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "SELESAI", reason: "lagi", now: NOW })).ok);
    const whole = await item(vA, { name: "Tanah Batal Penuh" });
    const ag2 = await live(vA, whole);
    const rb = await land.closeAgreement(prisma, { villageId: vA, id: ag2, mode: "BATAL", reason: "Salah input", now: NOW });
    assert.ok(rb.ok && rb.data.voided === 12);
    assert.ok(!(await land.closeAgreement(prisma, { villageId: vA, id: ag2, mode: "SELESAI", reason: "x", now: NOW })).ok, "alasan terlalu pendek");
  });

  it("KONKURENSI: membatalkan perjanjian vs mencatat penerimaan bersamaan tidak pernah menyisakan perjanjian BATAL dengan tagihan diterima", async () => {
    for (let round = 0; round < 12; round++) {
      const id = await item(vA, { name: `Tanah Balap Terima ${round}` });
      const ag = await live(vA, id);
      const [c1] = await chargesOf(ag);
      const [cl, rc] = await Promise.all([
        land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "BATAL", reason: "Salah input", now: NOW }),
        receive(vA, c1!.id, { voucherNo: `BAL-${round}` }),
      ]);
      const a = await prisma.landAgreement.findUniqueOrThrow({ where: { id: ag } });
      const received = await prisma.landCharge.count({ where: { agreementId: ag, status: "DITERIMA" } });
      assert.ok(!(a.status === "BATAL" && received > 0), `putaran ${round}: close=${cl.ok} receive=${rc.ok} status=${a.status} diterima=${received}`);
      const entries = await prisma.apbdesEntry.count({ where: { villageId: vA, voucherNo: `BAL-${round}` } });
      assert.equal(entries, received, "catatan Buku Kas Umum selalu sejalan dengan tagihan diterima");
    }
  });

  it("perjanjian SELESAI: tunggakan yang sudah jatuh tempo tetap dapat diterima dan dibatalkan penerimaannya; tagihan yang dibatalkan tidak", async () => {
    const id = await item(vA, { name: "Tanah Selesai" });
    const ag = await live(vA, id);
    assert.ok((await land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "SELESAI", reason: "Penyewa pindah", endedOn: "2026-06-15", now: NOW })).ok);
    const cs = await chargesOf(ag);
    const due = cs.filter((c) => c.status === "BELUM");
    const voided = cs.filter((c) => c.status === "BATAL");
    assert.equal(due.length, 6, "Jan-Jun masih ditagih");
    assert.equal(voided.length, 6, "Jul-Des dibatalkan");
    const ok1 = await receive(vA, due[0]!.id, { voucherNo: "TGK-1" });
    assert.ok(ok1.ok, ok1.ok ? "" : ok1.errors.join());
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: vA, voucherNo: "TGK-1", type: "PENERIMAAN", accountCode: "4.1.2.01" } }), 1);
    const bad = await receive(vA, voided[0]!.id);
    assert.ok(!bad.ok && bad.status === 409, "tagihan yang dibatalkan tak dapat diterima");
    const ov = await land.overview(prisma, vA, NOW);
    assert.ok(ov.findings.some((f) => f.code === "TERLAMBAT" && f.agreementId === ag), "tunggakan perjanjian SELESAI tampil sebagai peringatan");
    assert.ok((await land.revertReceipt(prisma, { villageId: vA, chargeId: due[0]!.id })).ok, "penerimaan pada perjanjian SELESAI dapat dikoreksi");
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: vA, voucherNo: "TGK-1" } }), 0);
    assert.ok((await receive(vA, due[0]!.id, { voucherNo: "TGK-2" })).ok);
  });

  it("syarat status perjanjian: BATAL dan DRAF tidak pernah menerima; SELESAI menolak tagihan yang jatuh tempo sesudah berakhir (pertahanan berlapis)", async () => {
    const id = await item(vA, { name: "Tanah Syarat Status" });
    const ag = await live(vA, id);
    const [c1] = await chargesOf(ag);
    assert.ok((await land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "BATAL", reason: "Salah input", now: NOW })).ok);
    // Data rusak sengaja: tagihan dikembalikan ke BELUM di bawah perjanjian BATAL.
    await prisma.landCharge.update({ where: { id: c1!.id }, data: { status: "BELUM" } });
    const r = await receive(vA, c1!.id);
    assert.ok(!r.ok && r.status === 409, "perjanjian BATAL menolak");
    assert.equal(await prisma.apbdesEntry.count({ where: { villageId: vA, voucherNo: `SEWA-${ag}-1` } }), 0);

    const id2 = await item(vA, { name: "Tanah Syarat Status 2" });
    const ag2 = await live(vA, id2);
    await land.closeAgreement(prisma, { villageId: vA, id: ag2, mode: "SELESAI", reason: "Selesai", endedOn: "2026-06-15", now: NOW });
    const future = (await chargesOf(ag2)).find((c) => c.status === "BATAL")!;
    await prisma.landCharge.update({ where: { id: future.id }, data: { status: "BELUM" } });
    const r2 = await receive(vA, future.id);
    assert.ok(!r2.ok && r2.status === 409 && r2.errors[0]!.includes("sesudah perjanjian diakhiri"));
    const after_ = await prisma.landCharge.findUniqueOrThrow({ where: { id: future.id } });
    assert.equal(after_.status, "BELUM", "transaksi dibatalkan utuh");
    assert.equal(after_.entryId, null);

    const id3 = await item(vA, { name: "Tanah Draf" });
    const dr = await draft(vA, id3);
    await prisma.landCharge.create({ data: { villageId: vA, agreementId: dr, seq: 1, dueOn: new Date("2026-01-01"), amountCents: 100n } });
    const cDraft = await prisma.landCharge.findFirstOrThrow({ where: { agreementId: dr } });
    assert.ok(!(await receive(vA, cDraft.id)).ok, "draf menolak");
  });

  it("KONKURENSI: mengakhiri perjanjian vs menerima tagihan yang jatuh tempo sebelum dan sesudah tanggal berakhir: Buku Kas Umum selalu sejalan dengan tagihan", async () => {
    for (let round = 0; round < 10; round++) {
      const id = await item(vA, { name: `Tanah Balap Akhiri ${round}` });
      const ag = await live(vA, id);
      const cs = await chargesOf(ag);
      const before = cs[0]!;
      const after_ = cs[8]!; // jatuh tempo September, sesudah 15 Juni
      const tag = `BAK-${round}`;
      await Promise.all([
        land.closeAgreement(prisma, { villageId: vA, id: ag, mode: "SELESAI", reason: "Selesai", endedOn: "2026-06-15", now: NOW }),
        receive(vA, before.id, { voucherNo: `${tag}-a` }),
        receive(vA, after_.id, { voucherNo: `${tag}-b` }),
      ]);
      const fin = await chargesOf(ag);
      const accepted = fin.filter((c) => c.status === "DITERIMA");
      const entries = await prisma.apbdesEntry.findMany({ where: { villageId: vA, voucherNo: { startsWith: tag } } });
      assert.equal(entries.length, accepted.length, `putaran ${round}: entri Buku Kas = tagihan diterima`);
      assert.ok(fin.every((c) => c.status !== "BATAL" || c.entryId === null), "tagihan batal tak bertaut ke Buku Kas");
      assert.ok(accepted.every((c) => c.entryId !== null));
      assert.equal((await prisma.landAgreement.findUniqueOrThrow({ where: { id: ag } })).status, "SELESAI");
    }
  });

  it("ISOLASI DESA: desa lain tak bisa melihat, mengaktifkan, menerima, membatalkan, mengakhiri, atau melampirkan", async () => {
    const id = await item(vA, { name: "Tanah Isolasi" });
    const ag = await draft(vA, id);
    assert.equal(await land.getAgreement(prisma, vB, ag), null);
    assert.ok(!(await activate(vB, ag)).ok);
    assert.equal(await prisma.landAgreement.findUniqueOrThrow({ where: { id: ag } }).then((a) => a.status), "DRAF");
    assert.ok((await activate(vA, ag)).ok);
    const [c1] = await chargesOf(ag);
    const r = await receive(vB, c1!.id);
    assert.ok(!r.ok && r.status === 404);
    assert.equal((await prisma.landCharge.findUniqueOrThrow({ where: { id: c1!.id } })).status, "BELUM");
    assert.ok(!(await land.closeAgreement(prisma, { villageId: vB, id: ag, mode: "SELESAI", reason: "bajak", now: NOW })).ok);
    assert.ok(!(await land.revertReceipt(prisma, { villageId: vB, chargeId: c1!.id })).ok);
    assert.ok(!(await land.amendAgreement(prisma, { villageId: vB, id: ag, input: { lesseeContact: "x" } })).ok);
    assert.ok(!(await land.deleteDraft(prisma, { villageId: vB, id: ag })).ok);
    assert.equal((await land.listAgreements(prisma, vB, { page: 1, pageSize: 50 })).total, 0);
    assert.equal((await land.overview(prisma, vB, NOW)).counts.activeAgreements, 0);
    const bIds = new Set((await prisma.inventoryItem.findMany({ where: { villageId: vB }, select: { id: true } })).map((x) => x.id));
    assert.ok((await land.leasableItems(prisma, vB)).every((x) => bIds.has(x.id)));
    const archB = await prisma.digitalArchive.create({ data: { villageId: vB, fileName: "x.pdf", filePath: "p", fileType: "pdf", fileSize: 1n, category: "SK", title: "Dok B", uploadedBy: 1 } });
    const bad = await land.addDoc(prisma, { villageId: vA, userId: 1, agreementId: ag, input: { kind: "PERDES", archiveId: archB.id.toString() } });
    assert.ok(!bad.ok && bad.status === 400);
    assert.equal(await prisma.landAgreementDoc.count({ where: { agreementId: ag } }), 0);
  });

  it("lampiran: dokumen Arsip Digital desa sendiri, tidak ganda, terlepas tanpa menghapus arsip; arsip hilang ditandai", async () => {
    const id = await item(vA, { name: "Tanah Lampiran" });
    const ag = await draft(vA, id);
    const arch = await prisma.digitalArchive.create({ data: { villageId: vA, fileName: "perdes.pdf", filePath: "p", fileType: "pdf", fileSize: 1n, category: "SK", title: "Perdes 3/2025", uploadedBy: 1 } });
    const r = await land.addDoc(prisma, { villageId: vA, userId: 1, agreementId: ag, input: { kind: "PERDES", archiveId: arch.id.toString() } });
    assert.ok(r.ok);
    const dup = await land.addDoc(prisma, { villageId: vA, userId: 1, agreementId: ag, input: { kind: "PERDES", archiveId: arch.id.toString() } });
    assert.ok(!dup.ok && dup.status === 409);
    const d1 = await land.getAgreement(prisma, vA, ag);
    assert.equal(d1?.docs[0]?.title, "Perdes 3/2025");
    await prisma.digitalArchive.delete({ where: { id: arch.id } });
    assert.equal((await land.getAgreement(prisma, vA, ag))?.docs[0]?.missing, true);
    assert.ok((await land.removeDoc(prisma, { villageId: vA, agreementId: ag, docId: r.ok ? r.data.id : 0 })).ok);
    assert.ok(!(await land.removeDoc(prisma, { villageId: vB, agreementId: ag, docId: r.ok ? r.data.id : 0 })).ok);
  });

  it("ringkasan: menghitung perjanjian aktif, tagihan terlambat, dan tanah yang belum dilengkapi", async () => {
    const v = (await prisma.village.create({ data: { code: `TC${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`, name: "TC", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
    try {
      const id = await item(v, { name: "Tanah Ringkas" });
      await item(v, { name: "Tanah Kosong" });
      await live(v, id);
      const ov = await land.overview(prisma, v, NOW);
      assert.equal(ov.counts.activeAgreements, 1);
      assert.equal(ov.counts.overdue, 10, "tagihan bulan Jan-Okt 2026 belum diterima");
      assert.ok(ov.findings.some((f) => f.code === "TANAH_BELUM_LENGKAP"));
      assert.equal(ov.findings[0]!.severity, "bahaya");
    } finally {
      await prisma.village.delete({ where: { id: v } });
    }
  });
});
