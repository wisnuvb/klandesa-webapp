/**
 * Tes integrasi "Pecah KK" terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke database yang
 * namanya mengandung "scratch"/"test" (cara menjalankan sama dengan family.integration.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("pecah KK (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let fam: typeof import("../lib/kependudukan/family");
  let famSvc: typeof import("../lib/kependudukan/family-service");
  let svc: typeof import("../lib/kependudukan/split-service");
  let v2: { id: number; settings: unknown };
  let other: { id: number; settings: unknown };
  let plain: { id: number; settings: unknown };
  const NOW = new Date("2026-11-04T10:00:00Z");

  const KK_A = "3508070101100021";
  const KK_B = "3508070101100022";
  const KK_C = "3508070101100023";
  const KK_D = "3508070101100024";
  const NIK = { budi: "3508070101900011", siti: "3508074101920012", andi: "3508071501150013", dewi: "3508075501170014" };

  const base = { birthplace: "Lumajang", religion: "Islam" };
  const mem = (o: Record<string, unknown>) => fam.emptyMember({ ...base, maritalStatus: "Belum Menikah", ...o });
  const FAMILY = () => [
    mem({ familyRole: "Kepala Keluarga", name: "Budi", nik: NIK.budi, gender: "Laki-laki", birthDate: "1990-01-01", maritalStatus: "Menikah" }),
    mem({ familyRole: "Istri", name: "Siti", nik: NIK.siti, gender: "Perempuan", birthDate: "1992-01-01", maritalStatus: "Menikah" }),
    mem({ familyRole: "Anak", name: "Andi", nik: NIK.andi, gender: "Laki-laki", birthDate: "2015-01-15" }),
    mem({ familyRole: "Anak", name: "Dewi", nik: NIK.dewi, gender: "Perempuan", birthDate: "2017-01-15" }),
  ];

  const idOf = async (villageId: number, nik: string) => (await prisma.resident.findFirstOrThrow({ where: { villageId, nik }, select: { id: true } })).id;
  const hhOf = async (villageId: number, kk: string) => prisma.household.findFirst({ where: { villageId, kkNumber: kk }, select: { id: true, headResidentId: true, status: true } });
  const split = (village: { id: number; settings: unknown }, sourceKk: string, body: unknown) =>
    svc.splitFamily(prisma, { village, userId: 7, sourceKk, body, now: NOW });
  const mutCount = (villageId: number) => prisma.residentMutation.count({ where: { villageId, type: "KK_CHANGE" } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    fam = await import("../lib/kependudukan/family");
    famSvc = await import("../lib/kependudukan/family-service");
    svc = await import("../lib/kependudukan/split-service");
    const t = Date.now() % 1e6;
    const mk = (c: string, settings?: object) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a", ...(settings ? { settings } : {}) } });
    v2 = await mk("S", { kependudukanV2: true });
    other = await mk("O", { kependudukanV2: true });
    plain = await mk("P");
    const r = await famSvc.createFamily(prisma, { village: v2, userId: 7, body: { header: { ...fam.emptyHeader(), kk: KK_A, address: "Jl. Mawar 1", rt: "01", rw: "02", hamlet: "Karangsari" }, members: FAMILY() }, now: NOW });
    assert.ok(r.ok, r.ok ? "" : r.error);
  });

  after(async () => {
    for (const v of [v2, other, plain]) if (v) await prisma.village.delete({ where: { id: v.id } });
    await prisma.$disconnect();
  });

  it("pemeriksaan gagal tidak menulis apa pun (KK terpakai, semua pindah, anggota asing)", async () => {
    const [budi, siti, andi, dewi] = await Promise.all([NIK.budi, NIK.siti, NIK.andi, NIK.dewi].map((n) => idOf(v2.id, n)));
    const before = await mutCount(v2.id);
    const body = (o: Record<string, unknown>) => ({ newKk: KK_B, effectiveDate: "2026-11-01", moves: [{ residentId: andi, familyRole: "Kepala Keluarga" }], ...o });

    const same = await split(v2, KK_A, body({ newKk: KK_A }));
    assert.ok(!same.ok && same.status === 422 && same.issues?.newKk);
    const all = await split(v2, KK_A, body({ moves: [budi, siti, andi, dewi].map((residentId, i) => ({ residentId, familyRole: i === 0 ? "Kepala Keluarga" : "Anak" })) }));
    assert.ok(!all.ok && all.status === 422 && all.issues?.moves);
    const foreign = await split(v2, KK_A, body({ moves: [{ residentId: 999999999, familyRole: "Kepala Keluarga" }] }));
    assert.ok(!foreign.ok && foreign.status === 422);
    const garbage = await split(v2, KK_A, { moves: "x" });
    assert.ok(!garbage.ok && garbage.status === 400);

    assert.equal(await mutCount(v2.id), before);
    assert.equal(await prisma.resident.count({ where: { villageId: v2.id, kk: KK_A } }), 4);
  });

  it("KK dari desa lain atau yang tidak ada tidak bisa dipecah (404)", async () => {
    const body = { newKk: KK_B, effectiveDate: "2026-11-01", moves: [{ residentId: 1, familyRole: "Kepala Keluarga" }] };
    const r = await split(other, KK_A, body);
    assert.ok(!r.ok && r.status === 404);
    const none = await split(v2, "3508070101109999", body);
    assert.ok(!none.ok && none.status === 404);
    const bad = await split(v2, "123", body);
    assert.ok(!bad.ok && bad.status === 404);
  });

  it("pecah normal: anak + adik membentuk KK baru; Buku Mutasi tercatat; rumah tangga baru terbentuk, KK lama utuh", async () => {
    const [andi, dewi] = await Promise.all([NIK.andi, NIK.dewi].map((n) => idOf(v2.id, n)));
    const r = await split(v2, KK_A, {
      newKk: "3508 0701 0110 0022", effectiveDate: "2026-11-01",
      moves: [{ residentId: andi, familyRole: "Kepala Keluarga" }, { residentId: dewi, familyRole: "Anak" }],
    });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.data.moved.length, 2);
    assert.equal(r.data.mutations, 2);

    const moved = await prisma.resident.findMany({ where: { villageId: v2.id, kk: KK_B }, orderBy: { id: "asc" } });
    assert.deepEqual(moved.map((m) => [m.name, m.familyRole]), [["Andi", "Kepala Keluarga"], ["Dewi", "Anak"]]);
    assert.deepEqual(moved.map((m) => m.address), ["Jl. Mawar 1", "Jl. Mawar 1"], "alamat tidak berubah bila tidak diganti");
    assert.equal(await prisma.resident.count({ where: { villageId: v2.id, kk: KK_A } }), 2);

    const muts = await prisma.residentMutation.findMany({ where: { villageId: v2.id, type: "KK_CHANGE" }, orderBy: { id: "asc" } });
    assert.equal(muts.length, 2);
    for (const m of muts) {
      assert.equal(m.status, "APPLIED");
      assert.equal(m.householdKk, KK_A);
      assert.equal(m.requestedById, 7);
      assert.equal(m.effectiveDate.toISOString().slice(0, 10), "2026-11-01");
      assert.deepEqual(m.details, { toKk: KK_B, newFamilyRole: m.residentId === andi ? "Kepala Keluarga" : "Anak", via: "pecah-kk" });
      assert.ok(!JSON.stringify(m.details).includes(NIK.andi), "NIK lengkap tidak disimpan di mutasi");
    }

    const newHh = await hhOf(v2.id, KK_B);
    assert.ok(newHh, "rumah tangga KK baru terbentuk");
    assert.equal(newHh.headResidentId, andi);
    assert.equal(newHh.status, "ACTIVE");
    const oldHh = await hhOf(v2.id, KK_A);
    assert.equal(oldHh?.headResidentId, await idOf(v2.id, NIK.budi));
    assert.equal(await prisma.resident.count({ where: { villageId: v2.id, householdId: newHh.id } }), 2);
  });

  it("KK baru yang sudah dipakai ditolak dengan petunjuk ke Perubahan KK; tidak ada yang berubah", async () => {
    const siti = await idOf(v2.id, NIK.siti);
    const before = await mutCount(v2.id);
    const r = await split(v2, KK_A, { newKk: KK_B, effectiveDate: "2026-11-01", moves: [{ residentId: siti, familyRole: "Istri" }] });
    assert.ok(!r.ok && r.status === 422);
    assert.match(r.issues?.newKk ?? "", /sudah dipakai.*Perubahan KK/s);
    assert.equal(await mutCount(v2.id), before);
    assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: siti } })).kk, KK_A);
  });

  it("kepala lama ikut pindah: wajib tunjuk kepala baru; kepala baru ditetapkan, alamat berbeda diterapkan", async () => {
    const [budi, siti] = await Promise.all([NIK.budi, NIK.siti].map((n) => idOf(v2.id, n)));
    // KK_A kini hanya Budi (kepala) + Siti. Budi pindah → Siti yang tinggal wajib jadi kepala.
    const body = { newKk: KK_C, effectiveDate: "2026-11-02", moves: [{ residentId: budi, familyRole: "Kepala Keluarga" }], address: { enabled: true, address: "Jl. Melati 9", rt: "03", rw: "04", hamlet: "Sukamaju" } };
    const missing = await split(v2, KK_A, body);
    assert.ok(!missing.ok && missing.status === 422 && missing.issues?.newSourceHead);
    assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: budi } })).kk, KK_A, "gagal = tidak ada yang berubah");

    const ok = await split(v2, KK_A, { ...body, newSourceHeadId: siti });
    assert.ok(ok.ok, ok.ok ? "" : ok.error);
    assert.equal(ok.data.newSourceHeadId, siti);

    const b = await prisma.resident.findUniqueOrThrow({ where: { id: budi } });
    assert.deepEqual([b.kk, b.familyRole, b.address, b.rt, b.rw, b.hamlet], [KK_C, "Kepala Keluarga", "Jl. Melati 9", "03", "04", "Sukamaju"]);
    const s = await prisma.resident.findUniqueOrThrow({ where: { id: siti } });
    assert.deepEqual([s.kk, s.familyRole, s.address], [KK_A, "Kepala Keluarga", "Jl. Mawar 1"]);
    assert.equal((await hhOf(v2.id, KK_A))?.headResidentId, siti);
    assert.equal((await hhOf(v2.id, KK_C))?.headResidentId, budi);
  });

  it("anggota yang sudah meninggal/pindah tidak bisa dipindahkan dan tidak dihitung sebagai yang tinggal", async () => {
    // KK_B: Andi (kepala) + Dewi
    const [andi, dewi] = await Promise.all([NIK.andi, NIK.dewi].map((n) => idOf(v2.id, n)));
    await prisma.resident.update({ where: { id: dewi }, data: { isAlive: false, deathDate: new Date("2026-10-30T00:00:00Z") } });
    const r = await split(v2, KK_B, { newKk: KK_D, effectiveDate: "2026-11-02", moves: [{ residentId: andi, familyRole: "Kepala Keluarga" }] });
    // Hanya Andi yang aktif; memindahkannya = semua aktif pindah.
    assert.ok(!r.ok && r.status === 422 && r.issues?.moves);
    const dead = await split(v2, KK_B, { newKk: KK_D, effectiveDate: "2026-11-02", moves: [{ residentId: dewi, familyRole: "Kepala Keluarga" }] });
    assert.ok(!dead.ok && dead.status === 422);
    assert.match(Object.values(dead.issues?.members ?? {})[0] ?? "", /sudah meninggal atau pindah/);
  });

  it("desa TANPA Kependudukan v2 (jalur Data KK lama): warga pindah, tanpa Buku Mutasi dan tanpa rumah tangga; atomik", async () => {
    const r0 = await famSvc.createFamily(prisma, { village: plain, userId: 7, body: { header: { ...fam.emptyHeader(), kk: KK_A, address: "Jl. Mawar 1", rt: "01", rw: "02" }, members: FAMILY() }, now: NOW });
    assert.ok(r0.ok, r0.ok ? "" : r0.error);
    const [andi, dewi, siti] = await Promise.all([NIK.andi, NIK.dewi, NIK.siti].map((n) => idOf(plain.id, n)));

    const bad = await split(plain, KK_A, { newKk: KK_A, effectiveDate: "2026-11-01", moves: [{ residentId: andi, familyRole: "Kepala Keluarga" }] });
    assert.ok(!bad.ok && bad.status === 422);
    assert.equal(await prisma.resident.count({ where: { villageId: plain.id, kk: KK_A } }), 4, "gagal = tidak ada yang berubah");

    const ok = await split(plain, KK_A, { newKk: KK_B, effectiveDate: "2026-11-01", moves: [{ residentId: andi, familyRole: "Kepala Keluarga" }, { residentId: dewi, familyRole: "Anak" }] });
    assert.ok(ok.ok, ok.ok ? "" : ok.error);
    assert.equal(ok.data.mutations, 0);
    assert.deepEqual((await prisma.resident.findMany({ where: { villageId: plain.id, kk: KK_B }, orderBy: { id: "asc" } })).map((r) => [r.name, r.familyRole]), [["Andi", "Kepala Keluarga"], ["Dewi", "Anak"]]);
    assert.equal(await prisma.resident.count({ where: { villageId: plain.id, kk: KK_A } }), 2);
    assert.equal(await prisma.residentMutation.count({ where: { villageId: plain.id } }), 0);
    assert.equal(await prisma.household.count({ where: { villageId: plain.id } }), 0);
    assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: siti } })).kk, KK_A);
  });

  it("KK sumber yang bukan 16 angka (data lama) tetap bisa dipecah ke KK baru yang benar", async () => {
    const [budi, siti] = await Promise.all([NIK.budi, NIK.siti].map((n) => idOf(plain.id, n)));
    // Setelah tes sebelumnya KK_A berisi Budi (kepala) + Siti; ubah ke nomor KK rusak seperti data lama.
    await prisma.resident.updateMany({ where: { villageId: plain.id, id: { in: [budi, siti] } }, data: { kk: "350807" } });
    const r = await split(plain, "350807", { newKk: KK_C, effectiveDate: "2026-11-02", moves: [{ residentId: siti, familyRole: "Kepala Keluarga" }] });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: siti } })).kk, KK_C);
    assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: budi } })).kk, "350807");
    // KK baru tetap wajib 16 angka.
    const bad = await split(plain, "350807", { newKk: "12345", effectiveDate: "2026-11-02", moves: [{ residentId: budi, familyRole: "Kepala Keluarga" }] });
    assert.ok(!bad.ok);
  });
});
