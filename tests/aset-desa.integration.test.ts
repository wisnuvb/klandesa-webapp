/** Tes integrasi Aset Desa (buku inventaris) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Aset Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/aset-desa/service");
  let vA = 0;
  let vB = 0;
  let mapB = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");
  const base = { name: "Laptop Sekdes", category: "KOMPUTER_ELEKTRONIK", origin: "APBDES", acquiredYear: 2024, quantity: 2, acquisitionValue: "7500000" };
  const add = (villageId: number, over: Record<string, unknown> = {}) => svc.createItem(prisma, { villageId, userId: 1, input: { ...base, ...over }, now: NOW });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/aset-desa/service");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("IA")).id;
    vB = (await mkV("IB")).id;
    mapB = (await prisma.villageAsset.create({ data: { villageId: vB, name: "Titik B", assetType: "other" } })).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("mencatat barang dan mengembalikan nilai sebagai string (bukan float)", async () => {
    const r = await add(vA);
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    if (r.ok) {
      assert.equal(r.data.acquisitionValue, "7500000.00");
      assert.equal(r.data.status, "ACTIVE");
      assert.equal(r.data.strategic, false);
    }
  });

  it("menolak isian tak valid dengan 400 dan pesan per kolom", async () => {
    const r = await add(vA, { quantity: 0, name: "" });
    assert.ok(!r.ok);
    if (!r.ok) {
      assert.equal(r.status, 400);
      assert.ok(r.fieldErrors?.quantity && r.fieldErrors?.name);
    }
  });

  it("isolasi desa: tak bisa menautkan titik peta desa lain, tak bisa melihat/mengubah/menghapus barang desa lain", async () => {
    const cross = await add(vA, { mapAssetId: mapB });
    assert.ok(!cross.ok && cross.status === 400);
    const mine = await add(vA, { name: "Printer" });
    assert.ok(mine.ok);
    const id = mine.ok ? mine.data.id : 0;
    assert.equal(await svc.getItem(prisma, vB, id), null);
    const upd = await svc.updateItem(prisma, { villageId: vB, id, input: { ...base, name: "DIBAJAK" }, now: NOW });
    assert.ok(!upd.ok && upd.status === 404);
    const disp = await svc.disposeItem(prisma, { villageId: vB, id, input: { reason: "PEMUSNAHAN", disposedAt: "2026-10-01", decree: "X" }, now: NOW });
    assert.ok(!disp.ok && disp.status === 404);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id } })).name, "Printer");
    const list = await svc.listItems(prisma, vB, { page: 1, pageSize: 50 });
    assert.equal(list.total, 0);
  });

  it("menautkan titik peta milik sendiri; titik peta dihapus tidak menghapus barang", async () => {
    const m = await prisma.villageAsset.create({ data: { villageId: vA, name: "Balai", assetType: "other" } });
    const r = await add(vA, { name: "Balai Desa", category: "BANGUNAN_DESA", origin: "ASLI_DESA", mapAssetId: m.id });
    assert.ok(r.ok);
    await prisma.villageAsset.delete({ where: { id: m.id } });
    const after_ = await svc.getItem(prisma, vA, r.ok ? r.data.id : 0);
    assert.ok(after_ && after_.mapAssetId === null);
  });

  it("penghapusan aset biasa: butuh nomor SK, menyimpan riwayat, tak bisa dua kali dan tak bisa diubah lagi", async () => {
    const r = await add(vA, { name: "Kursi Rapat" });
    const id = r.ok ? r.data.id : 0;
    const noDecree = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "PEMUSNAHAN", disposedAt: "2026-10-01", decree: "" }, now: NOW });
    assert.ok(!noDecree.ok && noDecree.status === 400);
    const ok = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "PEMUSNAHAN", disposedAt: "2026-10-01", decree: "Kep. Kades 12/2026", note: "rusak berat" }, now: NOW });
    assert.ok(ok.ok);
    if (ok.ok) {
      assert.equal(ok.data.status, "DISPOSED");
      assert.equal(ok.data.disposedAt, "2026-10-01");
      assert.equal(ok.data.disposalDecree, "Kep. Kades 12/2026");
    }
    const again = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "PEMUSNAHAN", disposedAt: "2026-10-02", decree: "lain" }, now: NOW });
    assert.ok(!again.ok && again.status === 409);
    const edit = await svc.updateItem(prisma, { villageId: vA, id, input: { ...base, name: "Diam-diam diubah" }, now: NOW });
    assert.ok(!edit.ok && edit.status === 409);
    assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id } })).name, "Kursi Rapat");
  });

  it("penghapusan dua permintaan serentak: hanya satu yang menang", async () => {
    const r = await add(vA, { name: "Proyektor" });
    const id = r.ok ? r.data.id : 0;
    const call = (decree: string) => svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "SEBAB_LAIN", disposedAt: "2026-10-05", decree }, now: NOW });
    const results = await Promise.all([call("SK-1"), call("SK-2"), call("SK-3")]);
    assert.equal(results.filter((x) => x.ok).length, 1);
    const row = await prisma.inventoryItem.findUniqueOrThrow({ where: { id } });
    assert.ok(["SK-1", "SK-2", "SK-3"].includes(row.disposalDecree ?? ""));
  });

  it("aset strategis: ditolak tanpa persetujuan Bupati, diterima dengan persetujuan dan tercatat di keterangan", async () => {
    const r = await add(vA, { name: "Pasar Desa Makmur", category: "PASAR_DESA", origin: "ASLI_DESA" });
    const id = r.ok ? r.data.id : 0;
    assert.ok(r.ok && r.data.strategic);
    const no = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "BERALIH_KEPEMILIKAN", disposedAt: "2026-10-01", decree: "SK 1" }, now: NOW });
    assert.ok(!no.ok && no.status === 400);
    const yes = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "BERALIH_KEPEMILIKAN", disposedAt: "2026-10-01", decree: "SK 1", regencyApproved: true }, now: NOW });
    assert.ok(yes.ok && /Bupati/.test(yes.data.disposalNote ?? ""));
  });

  it("tanggal penghapusan tak boleh sebelum tahun perolehan", async () => {
    const r = await add(vA, { name: "Genset", acquiredYear: 2026 });
    const id = r.ok ? r.data.id : 0;
    const bad = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "PEMUSNAHAN", disposedAt: "2025-01-01", decree: "SK" }, now: NOW });
    assert.ok(!bad.ok && bad.status === 400);
  });

  it("filter, pencarian, dan ringkasan hanya menghitung barang yang masih tercatat", async () => {
    const active = await svc.listItems(prisma, vA, { status: "ACTIVE", page: 1, pageSize: 100 });
    assert.ok(active.items.every((i) => i.status === "ACTIVE"));
    const disposed = await svc.listItems(prisma, vA, { status: "DISPOSED", page: 1, pageSize: 100 });
    assert.ok(disposed.total >= 3 && disposed.items.every((i) => i.status === "DISPOSED"));
    const found = await svc.listItems(prisma, vA, { search: "Printer", page: 1, pageSize: 10 });
    assert.equal(found.total, 1);
    const cat = await svc.listItems(prisma, vA, { category: "PASAR_DESA", page: 1, pageSize: 10 });
    assert.ok(cat.items.every((i) => i.category === "PASAR_DESA"));
    const unknownCat = await svc.listItems(prisma, vA, { category: "constructor", page: 1, pageSize: 10 });
    assert.equal(unknownCat.total, active.total + disposed.total, "kategori tak dikenal diabaikan, bukan error");
    const s = await svc.summarize(prisma, vA);
    assert.equal(s.active, active.total);
    assert.equal(s.disposed, disposed.total);
    // Nilai total = jumlah (nilai satuan x jumlah) barang aktif yang bernilai.
    const expected = (await prisma.inventoryItem.findMany({ where: { villageId: vA, status: "ACTIVE" } })).reduce((a, r) => a + Number(r.acquisitionValue ?? 0) * r.quantity, 0);
    assert.equal(Number(s.totalValue), expected);
  });

  it("buku inventaris per tahun: barang dihapus tetap tampil di tahun-tahun sebelum penghapusan", async () => {
    const r = await add(vA, { name: "Mesin Tik Kuno", acquiredYear: 2010 });
    const id = r.ok ? r.data.id : 0;
    const d = await svc.disposeItem(prisma, { villageId: vA, id, input: { reason: "PEMUSNAHAN", disposedAt: "2025-06-01", decree: "SK 9/2025" }, now: NOW });
    assert.ok(d.ok);
    const has = async (year: number) => (await svc.bookForYear(prisma, vA, year)).some((i) => i.id === id);
    assert.equal(await has(2024), true, "masih tercatat akhir 2024");
    assert.equal(await has(2025), false, "dihapus pada 2025: tak ada di buku akhir 2025");
    assert.equal(await has(2026), false);
    assert.equal(await has(2009), false, "belum diperoleh");
    assert.ok((await svc.disposedInYear(prisma, vA, 2025)).some((i) => i.id === id));
    assert.ok(!(await svc.disposedInYear(prisma, vA, 2024)).some((i) => i.id === id));
  });
});
