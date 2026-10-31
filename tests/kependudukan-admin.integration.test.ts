/**
 * Tes integrasi: ganti kepala, ubah nama/gabung wilayah, arsip warga terhapus, akun mobile kembali.
 * Butuh KEP_TEST_DATABASE_URL ke database ber-nama "scratch"/"test" (lihat kependudukan-sync.integration.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("administrasi kependudukan (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let sync: typeof import("../lib/kependudukan/sync");
  let hh: typeof import("../lib/kependudukan/household-service");
  let wil: typeof import("../lib/kependudukan/wilayah-service");
  let arc: typeof import("../lib/kependudukan/archive-service");
  let mut: typeof import("../lib/kependudukan/mutation-service");
  let villageId = 0;
  let nik = 3508000000030000;
  const ids: Record<string, number> = {};
  const KK = "3508000000000401";
  const NOW = new Date("2026-10-31T00:00:00Z");

  const mk = (name: string, o: Record<string, unknown> = {}) =>
    prisma.resident.create({
      data: { villageId, nik: String(nik++), name, birthplace: "x", birthDate: new Date("1985-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "Jl. A", rt: "01", rw: "01", hamlet: "Mawar", ...o },
    });
  const tx = <T>(fn: (t: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>) => prisma.$transaction(fn, { timeout: 60_000 });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    sync = await import("../lib/kependudukan/sync");
    hh = await import("../lib/kependudukan/household-service");
    wil = await import("../lib/kependudukan/wilayah-service");
    arc = await import("../lib/kependudukan/archive-service");
    mut = await import("../lib/kependudukan/mutation-service");
    villageId = (await prisma.village.create({ data: { code: `X${Date.now() % 1e7}`, name: "Desa Admin", district: "k", regency: "r", province: "p", address: "a", settings: { kependudukanV2: true } } })).id;
    ids.ayah = (await mk("Ayah", { kk: KK, familyRole: "Kepala Keluarga" })).id;
    ids.ibu = (await mk("Ibu", { kk: KK, familyRole: "Istri", gender: "Perempuan" })).id;
    ids.kakek = (await mk("Kakek", { kk: KK, familyRole: "Orang Tua", isAlive: false, deathDate: new Date("2026-01-01") })).id;
    // wilayah: dua penulisan dusun yang salah ketik
    ids.w1 = (await mk("Warga1", { kk: "3508000000000402", familyRole: "Kepala Keluarga", hamlet: "Mawr", rt: "02", rw: "02" })).id;
    ids.w2 = (await mk("Warga2", { kk: "3508000000000403", familyRole: "Kepala Keluarga", hamlet: "Mawar", rt: "02", rw: "02" })).id;
    await sync.reconcileVillage(prisma, villageId);
  });
  after(async () => {
    if (villageId) await prisma.village.delete({ where: { id: villageId } });
    await prisma.$disconnect();
  });

  describe("ganti Kepala Keluarga", () => {
    let householdId = 0;
    before(async () => {
      householdId = (await prisma.household.findFirstOrThrow({ where: { villageId, kkNumber: KK } })).id;
    });
    it("kepala lama wajib diberi hubungan baru", async () => {
      const r = await tx((t) => hh.changeHead(t, { villageId, householdId, newHeadId: ids.ibu }));
      assert.ok(!r.ok && r.status === 422);
    });
    it("yang meninggal tidak bisa jadi kepala; bukan anggota → 404", async () => {
      const dead = await tx((t) => hh.changeHead(t, { villageId, householdId, newHeadId: ids.kakek, otherHeadsRole: "Orang Tua" }));
      assert.ok(!dead.ok && dead.status === 422);
      const stranger = await tx((t) => hh.changeHead(t, { villageId, householdId, newHeadId: ids.w1, otherHeadsRole: "Anak" }));
      assert.ok(!stranger.ok && stranger.status === 404);
    });
    it("berhasil: peran tertukar, rumah tangga menunjuk kepala baru", async () => {
      const r = await tx((t) => hh.changeHead(t, { villageId, householdId, newHeadId: ids.ibu, otherHeadsRole: "Suami" as string }));
      assert.ok(!r.ok, "peran di luar daftar ditolak");
      const ok = await tx((t) => hh.changeHead(t, { villageId, householdId, newHeadId: ids.ibu, otherHeadsRole: "Famili Lain" }));
      assert.ok(ok.ok);
      assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: ids.ibu } })).familyRole, "Kepala Keluarga");
      assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: ids.ayah } })).familyRole, "Famili Lain");
      assert.equal((await prisma.household.findUniqueOrThrow({ where: { id: householdId } })).headResidentId, ids.ibu);
    });
    it("kepala yang sama diminta lagi → 409", async () => {
      const r = await tx((t) => hh.changeHead(t, { villageId, householdId, newHeadId: ids.ibu }));
      assert.ok(!r.ok && r.status === 409);
    });
  });

  describe("ubah nama / gabung wilayah", () => {
    it("menggabung dusun salah ketik ke yang benar: satu dusun, kolom lama diseragamkan, unit lama hilang", async () => {
      const wrong = await prisma.wilayahUnit.findFirstOrThrow({ where: { villageId, canonicalKey: "dusun:MAWR" } });
      const r = await tx((t) => wil.rewriteWilayah(t, { villageId, unitId: wrong.id, newName: "Mawar" }));
      assert.ok(r.ok && r.data.merged && r.data.moved === 1, JSON.stringify(r));
      assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: ids.w1 } })).hamlet, "Mawar");
      assert.equal(await prisma.wilayahUnit.count({ where: { villageId, canonicalKey: "dusun:MAWR" } }), 0);
      const w1 = await prisma.resident.findUniqueOrThrow({ where: { id: ids.w1 } });
      const w2 = await prisma.resident.findUniqueOrThrow({ where: { id: ids.w2 } });
      assert.equal(w1.dusunUnitId, w2.dusunUnitId);
    });
    it("ganti nama dusun ke nama baru membentuk unit baru dan membuang yang lama", async () => {
      const d = await prisma.wilayahUnit.findFirstOrThrow({ where: { villageId, canonicalKey: "dusun:MAWAR" } });
      const r = await tx((t) => wil.rewriteWilayah(t, { villageId, unitId: d.id, newName: "Melati" }));
      assert.ok(r.ok && !r.data.merged);
      assert.equal(await prisma.wilayahUnit.count({ where: { villageId, canonicalKey: "dusun:MAWAR" } }), 0);
      assert.equal(await prisma.wilayahUnit.count({ where: { villageId, canonicalKey: "dusun:MELATI" } }), 1);
    });
    it("menggabung RW memindahkan RT-nya dan tidak membuat warga kehilangan wilayah", async () => {
      const rw2 = await prisma.wilayahUnit.findFirstOrThrow({ where: { villageId, canonicalKey: "rw:2" } });
      const r = await tx((t) => wil.rewriteWilayah(t, { villageId, unitId: rw2.id, newName: "1" }));
      assert.ok(r.ok && r.data.merged);
      const w1 = await prisma.resident.findUniqueOrThrow({ where: { id: ids.w1 }, include: { wilayahUnit: true } });
      assert.equal(w1.rw, "1");
      assert.equal(w1.wilayahUnit?.canonicalKey, "rt:1|2");
      assert.equal(await prisma.wilayahUnit.count({ where: { villageId, canonicalKey: { in: ["rw:2", "rt:2|2"] } } }), 0);
    });
    it("nama kosong atau terlalu panjang ditolak; unit desa lain 404", async () => {
      const u = await prisma.wilayahUnit.findFirstOrThrow({ where: { villageId, type: "rw" } });
      assert.ok(!(await tx((t) => wil.rewriteWilayah(t, { villageId, unitId: u.id, newName: "  " }))).ok);
      assert.ok(!(await tx((t) => wil.rewriteWilayah(t, { villageId, unitId: u.id, newName: "12345678901" }))).ok);
      assert.ok(!(await tx((t) => wil.rewriteWilayah(t, { villageId: villageId + 9999, unitId: u.id, newName: "9" }))).ok);
    });
  });

  describe("arsip warga terhapus", () => {
    it("hapus → arsip → pulihkan: data kembali utuh, tertaut lagi ke keluarga, arsip terpakai", async () => {
      const victim = await prisma.resident.findUniqueOrThrow({ where: { id: ids.w2 } });
      await prisma.$transaction(async (t) => {
        await sync.archiveResident(t, villageId, victim as never, 1, "uji");
        await t.resident.delete({ where: { id: victim.id } });
      });
      await sync.syncResidents(prisma, villageId, [], [victim.kk]);
      const list = await arc.listArchives(prisma, villageId, 1, 10);
      assert.equal(list.total, 1);
      assert.equal(list.items[0].name, "Warga2");
      assert.equal(list.items[0].nikLast4, victim.nik.slice(-4));
      assert.ok(!JSON.stringify(list).includes(victim.nik), "NIK lengkap tidak dikirim di daftar");

      const r = await tx((t) => arc.restoreResident(t, { villageId, archiveId: BigInt(list.items[0].id) }));
      assert.ok(r.ok, JSON.stringify(r));
      const back = await prisma.resident.findFirstOrThrow({ where: { villageId, nik: victim.nik } });
      assert.equal(back.id, victim.id, "id lama dipakai kembali");
      assert.equal(back.name, "Warga2");
      assert.equal(back.birthDate.toISOString(), victim.birthDate.toISOString());
      assert.ok(back.householdId, "tertaut lagi ke rumah tangga");
      assert.equal((await arc.listArchives(prisma, villageId, 1, 10)).total, 0);
    });
    it("NIK yang sudah dipakai warga lain menolak pemulihan (409)", async () => {
      const w = await prisma.resident.findUniqueOrThrow({ where: { id: ids.w1 } });
      await prisma.residentArchive.create({ data: { villageId, residentId: 999999, snapshot: JSON.parse(JSON.stringify(w)) } });
      const a = await prisma.residentArchive.findFirstOrThrow({ where: { villageId } });
      const r = await tx((t) => arc.restoreResident(t, { villageId, archiveId: a.id }));
      assert.ok(!r.ok && r.status === 409);
    });
    it("pembersihan hanya membuang arsip yang melewati masa simpan", async () => {
      const old = new Date(NOW.getTime() - (arc.ARCHIVE_RETENTION_DAYS + 5) * 86_400_000);
      await prisma.residentArchive.create({ data: { villageId, residentId: 1, snapshot: { name: "Lama" }, deletedAt: old } });
      const before = await prisma.residentArchive.count({ where: { villageId } });
      const n = await arc.purgeExpiredArchives(prisma, NOW);
      assert.ok(n >= 1);
      assert.equal(await prisma.residentArchive.count({ where: { villageId } }), before - 1);
      assert.equal(await prisma.residentArchive.count({ where: { villageId, deletedAt: { lt: old } } }), 0);
    });
  });

  describe("warga yang kembali ke desa", () => {
    it("akun mobile yang ditangguhkan karena pindah aktif lagi saat 'datang kembali' disetujui", async () => {
      const r = await mk("Perantau", { kk: KK });
      const acct = await prisma.citizenAccount.create({
        data: { villageId, residentId: r.id, status: "ACTIVE", username: `u${Date.now() % 1e9}`, passwordHash: "x" },
      });
      const out = await mut.submitMutation(prisma, { villageId, userId: 1, input: { type: "MOVE_OUT", effectiveDate: "2026-10-01", residentId: r.id, details: { destination: "Surabaya" } }, now: NOW });
      assert.ok(out.ok);
      assert.ok((await mut.decideMutationAtomic({ villageId, mutationId: BigInt(out.ok ? out.data.id : "0"), userId: 2, decision: "approve", now: NOW })).ok);
      assert.equal((await prisma.citizenAccount.findUniqueOrThrow({ where: { id: acct.id } })).status, "SUSPENDED");
      const back = await mut.submitMutation(prisma, { villageId, userId: 1, input: { type: "MOVE_IN", effectiveDate: "2026-10-20", residentId: r.id, details: { origin: "Surabaya" } }, now: NOW });
      assert.ok(back.ok);
      assert.ok((await mut.decideMutationAtomic({ villageId, mutationId: BigInt(back.ok ? back.data.id : "0"), userId: 2, decision: "approve", now: NOW })).ok);
      assert.equal((await prisma.citizenAccount.findUniqueOrThrow({ where: { id: acct.id } })).status, "ACTIVE");
    });
  });
});
