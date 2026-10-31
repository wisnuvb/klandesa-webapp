/**
 * Tes integrasi sinkronisasi kependudukan v2 terhadap MySQL SUNGGUHAN (database sementara).
 * Dilewati bila KEP_TEST_DATABASE_URL tidak diisi. Menolak berjalan bila nama database tidak mengandung "scratch" atau "test".
 *
 *   KEP_TEST_DATABASE_URL="mysql://user:pass@localhost:3306/klandesa_p1_sync_scratch" \
 *     node --import tsx --test tests/kependudukan-sync.integration.test.ts
 *
 * Skema database sementara dibuat dengan: DATABASE_URL=<url> npx prisma db push
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("kependudukan sync (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  type Mod = typeof import("../lib/kependudukan/sync");
  let sync: Mod;
  let prisma: typeof import("../lib/prisma").prisma;
  let villageId = 0;
  const KK1 = "3508000000000001";
  const KK2 = "3508000000000002";
  let nik = 3508000000010000;
  const ids: Record<string, number> = {};

  const mk = (name: string, o: Record<string, unknown> = {}) =>
    prisma.resident.create({
      data: {
        villageId,
        nik: String(nik++),
        name,
        birthplace: "Lumajang",
        birthDate: new Date("1990-01-01"),
        gender: "Laki-laki",
        religion: "Islam",
        maritalStatus: "Menikah",
        familyRole: "Anak",
        address: "Jl. Mawar",
        ...o,
      },
    });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    sync = await import("../lib/kependudukan/sync");
    const v = await prisma.village.create({
      data: { code: `T${Date.now() % 1e7}`, name: "Desa Uji", district: "k", regency: "r", province: "p", address: "a", settings: { kependudukanV2: true } },
    });
    villageId = v.id;
    ids.budi = (await mk("Budi", { kk: KK1, familyRole: "Kepala Keluarga", rt: "01", rw: "1", hamlet: "Mawar" })).id;
    ids.sari = (await mk("Sari", { kk: KK1, familyRole: "Istri", rt: "1", rw: "01", hamlet: "MAWAR" })).id;
    ids.adi = (await mk("Adi", { kk: KK1, familyRole: "Anak", rt: "1", rw: "1", hamlet: "Mawar" })).id;
    ids.tono = (await mk("Tono", { kk: KK2, familyRole: "Istri", rt: "02", rw: "01", hamlet: "Melati" })).id; // KK2 tanpa kepala
    ids.nokk = (await mk("Tanpa KK", { kk: null, rt: "02", rw: "01" })).id;
  });

  after(async () => {
    if (villageId) await prisma.village.delete({ where: { id: villageId } });
    await prisma.$disconnect();
  });

  it("bendera hanya hidup bila diaktifkan", () => {
    assert.equal(sync.isKependudukanV2({ kependudukanV2: true }), true);
    assert.equal(sync.isKependudukanV2({ kependudukanV2: "true" }), false);
    assert.equal(sync.isKependudukanV2(null), false);
    assert.equal(sync.isKependudukanV2({}), false);
  });

  it("reconcileVillage membangun rumah tangga, kepala, dan wilayah (varian 01/1 digabung)", async () => {
    const r = await sync.reconcileVillage(prisma, villageId);
    assert.equal(r.householdsCreated, 2);
    assert.ok(r.unitsCreated > 0);

    const hh = await prisma.household.findMany({ where: { villageId }, orderBy: { kkNumber: "asc" } });
    assert.equal(hh.length, 2);
    assert.equal(hh[0].headResidentId, ids.budi);
    assert.equal(hh[1].headResidentId, null, "KK tanpa kepala tidak dipaksa");

    const units = await prisma.wilayahUnit.findMany({ where: { villageId } });
    assert.equal(units.filter((u) => u.type === "rw" && u.canonicalKey === "rw:1").length, 1, "RW '1' dan '01' satu unit");
    assert.equal(units.filter((u) => u.type === "dusun" && u.canonicalKey === "dusun:MAWAR").length, 1, "dusun beda huruf besar satu unit");
    const rt1 = units.find((u) => u.canonicalKey === "rt:1|1");
    assert.ok(rt1?.parentId, "RT berinduk RW");

    const budi = await prisma.resident.findUniqueOrThrow({ where: { id: ids.budi } });
    const sari = await prisma.resident.findUniqueOrThrow({ where: { id: ids.sari } });
    assert.equal(budi.householdId, hh[0].id);
    assert.equal(budi.wilayahUnitId, sari.wilayahUnitId, "01 dan 1 menunjuk RT yang sama");
    const nokk = await prisma.resident.findUniqueOrThrow({ where: { id: ids.nokk } });
    assert.equal(nokk.householdId, null);
    assert.ok(nokk.wilayahUnitId, "warga tanpa KK tetap punya wilayah");
  });

  it("idempoten: dijalankan lagi tidak mengubah apa pun", async () => {
    const r = await sync.reconcileVillage(prisma, villageId);
    assert.deepEqual(r, { unitsCreated: 0, householdsCreated: 0, householdsUpdated: 0, householdsDeactivated: 0, residentsLinked: 0 });
  });

  it("kolom lama tidak berubah oleh sinkronisasi", async () => {
    const sari = await prisma.resident.findUniqueOrThrow({ where: { id: ids.sari } });
    assert.equal(sari.rt, "1");
    assert.equal(sari.rw, "01");
    assert.equal(sari.hamlet, "MAWAR");
  });

  it("syncResidents: memindah anggota ke KK lain menghitung ulang kedua rumah tangga", async () => {
    await prisma.resident.update({ where: { id: ids.adi }, data: { kk: KK2 } });
    const r = await sync.syncResidents(prisma, villageId, [ids.adi], [KK1]);
    assert.ok(r.residentsLinked >= 1);
    const hh2 = await prisma.household.findUniqueOrThrow({ where: { villageId_kkNumber: { villageId, kkNumber: KK2 } }, include: { members: true } });
    assert.deepEqual(hh2.members.map((m) => m.id).sort(), [ids.tono, ids.adi].sort());
    const hh1 = await prisma.household.findUniqueOrThrow({ where: { villageId_kkNumber: { villageId, kkNumber: KK1 } }, include: { members: true } });
    assert.equal(hh1.members.length, 2);
  });

  it("syncResidents: menghapus kepala tidak memblokir dan KK dihitung ulang", async () => {
    const existing = await prisma.resident.findUniqueOrThrow({ where: { id: ids.budi } });
    await prisma.$transaction(async (tx) => {
      await sync.archiveResident(tx, villageId, existing as never, 1, "uji");
      await tx.resident.delete({ where: { id: ids.budi } });
    });
    await sync.syncResidents(prisma, villageId, [], [existing.kk]);

    const arch = await prisma.residentArchive.findFirst({ where: { villageId, residentId: ids.budi } });
    assert.ok(arch);
    assert.equal((arch!.snapshot as { name: string }).name, "Budi");
    const hh1 = await prisma.household.findUniqueOrThrow({ where: { villageId_kkNumber: { villageId, kkNumber: KK1 } }, include: { members: true } });
    assert.equal(hh1.headResidentId, null);
    assert.equal(hh1.members.length, 1);
    assert.equal(hh1.status, "ACTIVE");
  });

  it("KK tanpa anggota tersisa menjadi INACTIVE", async () => {
    await prisma.resident.delete({ where: { id: ids.sari } });
    await sync.syncResidents(prisma, villageId, [], [KK1]);
    const hh1 = await prisma.household.findUniqueOrThrow({ where: { villageId_kkNumber: { villageId, kkNumber: KK1 } } });
    assert.equal(hh1.status, "INACTIVE");
    assert.equal(hh1.headResidentId, null);
  });

  it("recordLegacyMutations menulis mutasi tanpa NIK lengkap", async () => {
    const r = await prisma.resident.findUniqueOrThrow({ where: { id: ids.tono } });
    const before = { isAlive: true, deathDate: null, moveDate: null, kk: r.kk, familyRole: r.familyRole };
    const after = { ...before, isAlive: false, deathDate: new Date("2026-10-01") };
    const n = await sync.recordLegacyMutations(prisma, villageId, 1, r, before, after);
    assert.equal(n, 1);
    const m = await prisma.residentMutation.findFirstOrThrow({ where: { villageId, residentId: ids.tono } });
    assert.equal(m.type, "DEATH");
    assert.equal(m.status, "APPLIED");
    assert.equal(m.source, "legacy_edit");
    assert.equal(m.residentNikLast4, r.nik.slice(-4));
    assert.ok(!JSON.stringify(m, (_k, v) => (typeof v === "bigint" ? String(v) : v)).includes(r.nik), "NIK lengkap tidak boleh tersimpan");
  });

  it("menghapus warga tidak memblokir catatan mutasinya (tetap terbaca)", async () => {
    await prisma.resident.delete({ where: { id: ids.tono } });
    const m = await prisma.residentMutation.findFirstOrThrow({ where: { villageId, type: "DEATH" } });
    assert.equal(m.residentId, null);
    assert.equal(m.residentName, "Tono");
  });

  it("runKependudukanSync: bendera mati = tidak menjalankan tugas", async () => {
    let ran = false;
    await sync.runKependudukanSync({ id: villageId, settings: {} }, "uji", async () => {
      ran = true;
    });
    assert.equal(ran, false);
  });

  it("runKependudukanSync: tugas gagal tidak melempar dan desa ditandai butuh rekonsiliasi", async () => {
    await sync.runKependudukanSync({ id: villageId, settings: { kependudukanV2: true } }, "uji", async () => {
      throw new Error("sengaja gagal");
    });
    const v = await prisma.village.findUniqueOrThrow({ where: { id: villageId } });
    const s = v.settings as Record<string, unknown>;
    assert.equal(s.kependudukanV2, true, "bendera tetap");
    assert.ok(typeof s.kependudukanV2NeedsReconcile === "string");
  });

  it("tidak menyentuh desa lain", async () => {
    const other = await prisma.village.create({
      data: { code: `U${Date.now() % 1e7}`, name: "Lain", district: "k", regency: "r", province: "p", address: "a" },
    });
    try {
      const o = await prisma.resident.create({
        data: { villageId: other.id, nik: "3508999999999999", name: "Orang Lain", birthplace: "x", birthDate: new Date("1980-01-01"), gender: "Perempuan", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", address: "x", kk: KK2, rt: "09", rw: "09" },
      });
      await sync.reconcileVillage(prisma, villageId);
      const after = await prisma.resident.findUniqueOrThrow({ where: { id: o.id } });
      assert.equal(after.householdId, null, "warga desa lain tak tersentuh walau KK sama");
      assert.equal(await prisma.household.count({ where: { villageId: other.id } }), 0);
    } finally {
      await prisma.village.delete({ where: { id: other.id } });
    }
  });

  describe("aktivasi dan pemulihan mandiri", () => {
    let vid = 0;
    const KK3 = "3508000000000301";
    const settingsOf = async () => ((await prisma.village.findUniqueOrThrow({ where: { id: vid } })).settings ?? {}) as Record<string, unknown>;
    const waitFor = async (cond: () => Promise<boolean>) => {
      for (let i = 0; i < 40; i++) {
        if (await cond()) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    };

    before(async () => {
      vid = (await prisma.village.create({ data: { code: `A${Date.now() % 1e7}`, name: "Desa Aktivasi", district: "k", regency: "r", province: "p", address: "a" } })).id;
      for (const [name, role] of [["Kepala", "Kepala Keluarga"], ["Anak", "Anak"]] as const) {
        await prisma.resident.create({
          data: { villageId: vid, nik: String(nik++), name, kk: KK3, birthplace: "x", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: role, address: "Jl. A", rt: "01", rw: "01" },
        });
      }
    });
    after(async () => {
      if (vid) await prisma.village.delete({ where: { id: vid } });
    });

    it("activateVillage membentuk struktur, menyalakan bendera, dan aman diulang", async () => {
      assert.equal(sync.isKependudukanV2(await settingsOf()), false);
      const a = await sync.activateVillage(vid);
      assert.equal(a.households, 1);
      assert.equal(a.withoutHead, 0);
      assert.ok(a.units >= 2, "RW dan RT terbentuk");
      assert.equal(sync.isKependudukanV2(await settingsOf()), true);
      const again = await sync.activateVillage(vid);
      assert.equal(again.households, 1);
      assert.deepEqual(again.result, { unitsCreated: 0, householdsCreated: 0, householdsUpdated: 0, householdsDeactivated: 0, residentsLinked: 0 });
    });

    it("pengaktifan tidak mengubah kolom data warga", async () => {
      const r = await prisma.resident.findFirstOrThrow({ where: { villageId: vid, familyRole: "Anak" } });
      assert.equal(r.kk, KK3);
      assert.equal(r.rt, "01");
      assert.equal(r.address, "Jl. A");
    });

    it("healIfNeeded memulihkan desa yang bertanda butuh rekonsiliasi lalu menghapus tandanya", async () => {
      // simulasikan perubahan yang terlewat sinkronisasi + tanda gagal
      await prisma.resident.create({
        data: { villageId: vid, nik: String(nik++), name: "Terlewat", kk: KK3, birthplace: "x", birthDate: new Date("2000-01-01"), gender: "Perempuan", religion: "Islam", maritalStatus: "Belum Menikah", familyRole: "Anak", address: "Jl. A", rt: "01", rw: "01" },
      });
      await sync.markNeedsReconcile(vid);
      const v = await prisma.village.findUniqueOrThrow({ where: { id: vid } });
      sync.healIfNeeded(v);
      const healed = await waitFor(async () => (await settingsOf())[sync.SETTINGS_NEEDS_RECONCILE] === undefined);
      assert.ok(healed, "tanda dihapus setelah rekonsiliasi");
      const missed = await prisma.resident.findFirstOrThrow({ where: { villageId: vid, name: "Terlewat" } });
      assert.ok(missed.householdId, "warga yang terlewat kini tertaut ke rumah tangga");
      assert.equal(sync.isKependudukanV2(await settingsOf()), true, "bendera tetap menyala");
    });

    it("healIfNeeded tidak melakukan apa pun bila tidak ada tanda atau bendera mati", async () => {
      const v = await prisma.village.findUniqueOrThrow({ where: { id: vid } });
      sync.healIfNeeded(v); // tanpa tanda: tidak ada pekerjaan
      sync.healIfNeeded({ id: vid, settings: { kependudukanV2NeedsReconcile: "x" } }); // bendera mati
      assert.equal((await settingsOf())[sync.SETTINGS_NEEDS_RECONCILE], undefined);
    });
  });
});
