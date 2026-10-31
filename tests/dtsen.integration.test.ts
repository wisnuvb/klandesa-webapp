/** Tes integrasi usulan DTSEN terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Usulan DTSEN (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/dtsen/service");
  let vA = 0;
  let vB = 0;
  const rid: Record<string, number> = {};
  const NOW = new Date("2026-11-01T03:00:00Z");
  const verify = { to: "TERVERIFIKASI", verifiedAt: "2026-10-20", verifiedBy: "Petugas A", verificationNote: "Layak diusulkan" };

  const propose = (villageId: number, residentId: number, over: Record<string, unknown> = {}) =>
    svc.createProposal(prisma, { villageId, userId: 1, input: { residentId, kind: "TAMBAH", source: "RT", reason: "Rumah tidak layak huni", ...over } });
  const move = (villageId: number, ids: number[], body: Record<string, unknown>) => svc.transition(prisma, { villageId, input: { ids, ...body }, now: NOW });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/dtsen/service");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("DA")).id;
    vB = (await mkV("DB")).id;
    const mkR = async (key: string, villageId: number, n: number) =>
      (rid[key] = (await prisma.resident.create({ data: { villageId, nik: `33000000${t}${n}`.slice(0, 16).padEnd(16, "0"), name: `Warga ${key}`, birthplace: "x", birthDate: new Date("1980-01-01"), gender: "Laki-laki", address: "a", rt: "02", rw: "03", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga" } })).id);
    await mkR("a1", vA, 1);
    await mkR("a2", vA, 2);
    await mkR("a3", vA, 3);
    await mkR("b1", vB, 4);
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("mencatat usulan dengan salinan nama dan RT/RW (tanpa NIK), status awal DIAJUKAN", async () => {
    const r = await propose(vA, rid.a1);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.data.status, "DIAJUKAN");
      assert.equal(r.data.residentName, "Warga a1");
      assert.equal(r.data.residentRt, "02");
      assert.ok(!JSON.stringify(r.data).includes("nik"));
    }
  });

  it("menolak warga desa lain dan usulan sejenis ganda yang masih berjalan; jenis lain boleh", async () => {
    const cross = await propose(vA, rid.b1);
    assert.ok(!cross.ok && cross.status === 400);
    const dup = await propose(vA, rid.a1);
    assert.ok(!dup.ok && dup.status === 409);
    assert.ok((await propose(vA, rid.a1, { kind: "UBAH", knownDesil: "7" })).ok);
  });

  it("alur penuh satu usulan sampai selesai; tahap tak boleh dilompati atau diulang", async () => {
    const r = await propose(vA, rid.a2);
    const id = r.ok ? r.data.id : 0;
    const skip = await move(vA, [id], { to: "DISETUJUI_MUSDES", musdesAt: "2026-10-25", musdesRef: "BA/1" });
    assert.ok(skip.ok && skip.data.moved.length === 0 && /Tidak bisa/.test(skip.data.skipped[0].reason), "tak bisa melompati verifikasi");
    assert.ok((await move(vA, [id], verify)).ok);
    assert.equal((await prisma.dtsenProposal.findUniqueOrThrow({ where: { id } })).status, "TERVERIFIKASI");
    const again = await move(vA, [id], verify);
    assert.ok(again.ok && again.data.moved.length === 0, "verifikasi ulang ditolak");
    const early = await move(vA, [id], { to: "DISETUJUI_MUSDES", musdesAt: "2026-10-10", musdesRef: "BA/1" });
    assert.ok(early.ok && early.data.moved.length === 0 && /sebelum tanggal verifikasi/.test(early.data.skipped[0].reason));
    assert.equal((await move(vA, [id], { to: "DISETUJUI_MUSDES", musdesAt: "2026-10-25", musdesRef: "BA/1" })).ok, true);
    assert.equal((await move(vA, [id], { to: "DITERUSKAN", forwardedAt: "2026-10-28", forwardedRef: "S-9" })).ok, true);
    const cancelFwd = await move(vA, [id], { to: "DIBATALKAN", outcomeNote: "x" });
    assert.ok(cancelFwd.ok && cancelFwd.data.moved.length === 0, "setelah diteruskan tak bisa dibatalkan");
    const fin = await move(vA, [id], { to: "SELESAI", outcome: "DITERIMA", outcomeAt: "2026-10-31", outcomeNote: "Masuk desil 4" });
    assert.ok(fin.ok && fin.data.moved[0] === id);
    const row = await prisma.dtsenProposal.findUniqueOrThrow({ where: { id } });
    assert.deepEqual([row.status, row.outcome, row.musdesRef, row.forwardedRef], ["SELESAI", "DITERIMA", "BA/1", "S-9"]);
    const done = await move(vA, [id], { to: "DIBATALKAN", outcomeNote: "x" });
    assert.ok(done.ok && done.data.moved.length === 0, "status akhir tak bisa diubah");
  });

  it("proses massal: satu berita acara untuk banyak usulan; yang tak memenuhi syarat dilaporkan, sisanya tetap jalan", async () => {
    const r1 = await propose(vA, rid.a3);
    const r2 = await propose(vA, rid.a3, { kind: "HAPUS", reason: "Sudah mampu" });
    const ids = [r1.ok ? r1.data.id : 0, r2.ok ? r2.data.id : 0];
    await move(vA, [ids[0]], verify); // hanya yang pertama diverifikasi
    const batch = await move(vA, ids, { to: "DISETUJUI_MUSDES", musdesAt: "2026-10-25", musdesRef: "BA/2" });
    assert.ok(batch.ok);
    if (batch.ok) {
      assert.deepEqual(batch.data.moved, [ids[0]]);
      assert.equal(batch.data.skipped.length, 1);
      assert.equal(batch.data.skipped[0].id, ids[1]);
    }
  });

  it("isolasi desa: desa lain tak bisa memproses usulan ini dan tak melihatnya di daftar", async () => {
    const r = await propose(vA, rid.a1, { kind: "HAPUS", reason: "Pindah" });
    const id = r.ok ? r.data.id : 0;
    const x = await move(vB, [id], { to: "DIBATALKAN", outcomeNote: "dibajak" });
    assert.ok(x.ok && x.data.moved.length === 0 && /tidak ditemukan/.test(x.data.skipped[0].reason));
    assert.equal((await prisma.dtsenProposal.findUniqueOrThrow({ where: { id } })).status, "DIAJUKAN");
    assert.equal((await svc.listProposals(prisma, vB, { page: 1, pageSize: 50 })).total, 0);
  });

  it("proses serentak pada usulan yang sama: hanya satu yang berhasil memindahkan", async () => {
    const r = await propose(vA, rid.a2, { reason: "Usulan baru" });
    const id = r.ok ? r.data.id : 0;
    const results = await Promise.all([1, 2, 3, 4].map((n) => move(vA, [id], { ...verify, verifiedBy: `Petugas ${n}` })));
    assert.equal(results.reduce((a, x) => a + (x.ok ? x.data.moved.length : 0), 0), 1);
  });

  it("daftar: filter status/jenis, hitungan per tahap, dan penanda usulan mandek", async () => {
    const old = await prisma.dtsenProposal.create({ data: { villageId: vA, residentId: rid.a2, residentName: "Warga a2", kind: "TAMBAH", source: "WARGA", reason: "Lama", status: "DIAJUKAN", statusChangedAt: new Date(NOW.getTime() - 45 * 86_400_000) } });
    const stale = await svc.listProposals(prisma, vA, { stale: true, page: 1, pageSize: 50 }, NOW);
    assert.ok(stale.items.some((i) => i.id === old.id && i.stale && i.daysInStatus >= 45));
    assert.ok(stale.items.every((i) => i.stale));
    assert.ok(stale.stale >= 1);
    const all = await svc.listProposals(prisma, vA, { page: 1, pageSize: 100 }, NOW);
    assert.equal(Object.values(all.byStatus).reduce((a, b) => a + b, 0), all.total);
    const onlySelesai = await svc.listProposals(prisma, vA, { status: "SELESAI", page: 1, pageSize: 50 }, NOW);
    assert.ok(onlySelesai.items.every((i) => i.status === "SELESAI") && onlySelesai.total >= 1);
    assert.equal((await svc.listProposals(prisma, vA, { status: "constructor", page: 1, pageSize: 100 }, NOW)).total, all.total, "status asing diabaikan");
  });

  it("menghapus warga tidak menghapus riwayat usulan (nama tersalin)", async () => {
    const id = (await prisma.dtsenProposal.findFirstOrThrow({ where: { residentId: rid.a3 } })).id;
    await prisma.resident.delete({ where: { id: rid.a3 } });
    const row = await prisma.dtsenProposal.findUniqueOrThrow({ where: { id } });
    assert.equal(row.residentId, null);
    assert.equal(row.residentName, "Warga a3");
  });
});
