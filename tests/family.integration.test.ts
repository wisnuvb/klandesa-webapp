/**
 * Tes integrasi wizard "Tambah Keluarga" terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke
 * database yang namanya mengandung "scratch"/"test" (cara menjalankan sama dengan kependudukan-sync.integration.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("tambah keluarga (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/kependudukan/family-service");
  let fam: typeof import("../lib/kependudukan/family");
  let v2: { id: number; settings: unknown };
  let plain: { id: number; settings: unknown };
  const NOW = new Date("2026-11-02T00:00:00Z");

  const KK_A = "3508070101100011";
  const KK_B = "3508070101100012";
  const KK_C = "3508070101100013";
  const NIK = { budi: "3508070101900001", siti: "3508074101920002", andi: "3508071501150003", bayi: "3508072510260004", tamu: "3508070101880005" };

  const header = (kk: string, o: Record<string, unknown> = {}) => ({ ...fam.emptyHeader(), kk, address: "Jl. Mawar 1", rt: "01", rw: "02", hamlet: "Karangsari", ...o });
  const base = { birthplace: "Lumajang", religion: "Islam" };
  const budi = (o = {}) => fam.emptyMember({ ...base, familyRole: "Kepala Keluarga", name: "Budi", nik: NIK.budi, gender: "Laki-laki", birthDate: "1990-01-01", maritalStatus: "Menikah", ethnicity: "jawa", ...o });
  const siti = (o = {}) => fam.emptyMember({ ...base, familyRole: "Istri", name: "Siti", nik: NIK.siti, gender: "Perempuan", birthDate: "1992-01-01", maritalStatus: "Menikah", ...o });
  const andi = (o = {}) => fam.emptyMember({ ...base, familyRole: "Anak", name: "Andi", nik: NIK.andi, gender: "Laki-laki", birthDate: "2015-01-15", maritalStatus: "Belum Menikah", ...o });
  const create = (village: { id: number; settings: unknown }, h: ReturnType<typeof header>, members: unknown[]) =>
    svc.createFamily(prisma, { village, userId: 7, body: { header: h, members }, now: NOW });
  const count = (villageId: number) => prisma.resident.count({ where: { villageId } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/kependudukan/family-service");
    fam = await import("../lib/kependudukan/family");
    const t = Date.now() % 1e6;
    const mk = (c: string, settings?: object) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a", ...(settings ? { settings } : {}) } });
    v2 = await mk("F", { kependudukanV2: true });
    plain = await mk("P");
  });

  after(async () => {
    for (const v of [v2, plain]) if (v) await prisma.village.delete({ where: { id: v.id } });
    await prisma.$disconnect();
  });

  it("keluarga baru: semua anggota tersimpan, orang tua anak terisi dari peran, suku dibakukan, rumah tangga terbentuk", async () => {
    const r = await create(v2, header(KK_A), [budi(), siti(), andi()]);
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.data.created.length, 3);
    const rows = await prisma.resident.findMany({ where: { villageId: v2.id, kk: KK_A }, orderBy: { id: "asc" } });
    assert.equal(rows.length, 3);
    assert.equal(rows[0].ethnicity, "Jawa");
    assert.equal(rows[0].gender, "Laki-laki");
    assert.deepEqual([rows[0].rt, rows[0].rw, rows[0].hamlet], ["01", "02", "Karangsari"]);
    const child = rows[2];
    assert.equal(child.fatherName, "Budi");
    assert.equal(child.fatherNik, NIK.budi);
    assert.equal(child.motherName, "Siti");
    assert.equal(child.motherNik, NIK.siti);
    assert.equal(r.data.mutations, 0);
    const hh = await prisma.household.findFirst({ where: { villageId: v2.id, kkNumber: KK_A }, include: { members: true } });
    assert.ok(hh && hh.members.length === 3 && hh.headResidentId === rows[0].id, "sinkron rumah tangga");
  });

  it("NIK yang sudah ada di desa menolak seluruh keluarga: tidak ada yang tersimpan (semua-atau-tidak-sama-sekali)", async () => {
    const before = await count(v2.id);
    const r = await create(v2, header(KK_B), [budi({ nik: "3508070101900099" }), siti({ nik: NIK.andi })]);
    assert.ok(!r.ok && r.status === 422);
    assert.match(r.ok ? "" : r.issues!.members[1].nik, /sudah terdaftar di desa ini atas nama Andi/);
    assert.equal(await count(v2.id), before);
  });

  it("anggota bermasalah (tanggal lahir buruk) membatalkan seluruh keluarga", async () => {
    const before = await count(v2.id);
    const r = await create(v2, header(KK_B), [budi({ nik: "3508070101900098" }), siti({ nik: "3508074101920097", birthDate: "1992-02-30" })]);
    assert.ok(!r.ok && r.status === 422 && r.issues!.members[1].birthDate);
    assert.equal(await count(v2.id), before);
    assert.equal(await prisma.household.count({ where: { villageId: v2.id, kkNumber: KK_B } }), 0);
  });

  it("menambah ke KK yang sudah ada: tidak boleh kepala baru; anggota biasa masuk ke rumah tangga yang sama", async () => {
    const dupHead = await create(v2, header(KK_A), [budi({ nik: "3508070101900077", name: "Kepala Dua" })]);
    assert.ok(!dupHead.ok && /sudah punya Kepala Keluarga/.test(dupHead.issues!.members[0].familyRole));
    const baby = await create(v2, header(KK_A), [andi({ name: "Bayi", nik: NIK.bayi, birthDate: "2026-10-25", event: "BIRTH" })]);
    assert.ok(baby.ok, baby.ok ? "" : baby.error);
    assert.equal(baby.data.mutations, 1);
    const hh = await prisma.household.findFirst({ where: { villageId: v2.id, kkNumber: KK_A }, include: { members: true } });
    assert.equal(hh?.members.length, 4);
    const mut = await prisma.residentMutation.findFirstOrThrow({ where: { villageId: v2.id, type: "BIRTH" } });
    assert.equal(mut.status, "APPLIED");
    assert.equal(mut.effectiveDate.toISOString().slice(0, 10), "2026-10-25");
    assert.equal(mut.residentNikLast4, NIK.bayi.slice(-4));
    assert.equal(mut.householdKk, KK_A);
    assert.ok(!JSON.stringify(mut.details).includes(NIK.bayi), "NIK lengkap tidak boleh ada di catatan mutasi");
  });

  it("keluarga baru datang: tanggal/asal/status tersimpan dan mutasi Datang tercatat per anggota", async () => {
    const h = header(KK_C, { arrival: { enabled: true, date: "2026-10-20", origin: "Surabaya", residencyStatus: "TIDAK_TETAP" } });
    const r = await create(v2, h, [budi({ nik: NIK.tamu, event: "MOVE_IN" }), siti({ nik: "3508074101920006", event: "MOVE_IN" })]);
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.data.mutations, 2);
    const row = await prisma.resident.findFirstOrThrow({ where: { villageId: v2.id, nik: NIK.tamu } });
    assert.equal(row.arrivalDate?.toISOString().slice(0, 10), "2026-10-20");
    assert.equal(row.originAddress, "Surabaya");
    assert.equal(row.residencyStatus, "TIDAK_TETAP");
    const moves = await prisma.residentMutation.findMany({ where: { villageId: v2.id, type: "MOVE_IN" } });
    assert.equal(moves.length, 2);
    assert.ok(moves.every((m) => m.effectiveDate.toISOString().slice(0, 10) === "2026-10-20" && (m.details as { origin?: string }).origin === "Surabaya"));
  });

  it("desa tanpa Kependudukan v2: warga tersimpan, tanpa mutasi dan tanpa rumah tangga", async () => {
    const h = header(KK_A, { arrival: { enabled: true, date: "2026-10-20", origin: "Malang", residencyStatus: "TETAP" } });
    const r = await create(plain, h, [budi({ event: "MOVE_IN" }), siti()]);
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.data.mutations, 0);
    assert.equal(await prisma.residentMutation.count({ where: { villageId: plain.id } }), 0);
    assert.equal(await prisma.household.count({ where: { villageId: plain.id } }), 0);
    assert.equal(await count(plain.id), 2);
  });

  it("NIK/KK sama di desa lain tidak saling mengganggu (isolasi desa)", async () => {
    // budi/siti dengan NIK yang sama sudah ada di desa v2 DAN plain: pemeriksaan di plain tidak melihat v2 dan sebaliknya.
    const c = await svc.checkFamily(prisma, plain.id, { header: header(KK_A), members: [budi({ nik: "3508070101900055" })] }, NOW);
    assert.ok(c && c.existing?.activeMembers === 2, "KK_A di plain hanya berisi 2 anggota miliknya");
    const c2 = await svc.checkFamily(prisma, v2.id, { header: header(KK_A), members: [] }, NOW);
    assert.ok(c2 && c2.existing?.activeMembers === 4);
  });

  it("dua keluarga serentak dengan NIK sama: hanya satu berhasil, yang kalah tidak meninggalkan anggota setengah jadi", async () => {
    const kkX = "3508070101100021";
    const kkY = "3508070101100022";
    const shared = "3508070101850031";
    const [a, b] = await Promise.all([
      create(v2, header(kkX), [budi({ nik: shared, name: "Pemenang X" }), siti({ nik: "3508074101920032", name: "Istri X" })]),
      create(v2, header(kkY), [budi({ nik: shared, name: "Pemenang Y" }), siti({ nik: "3508074101920033", name: "Istri Y" })]),
    ]);
    assert.equal([a, b].filter((r) => r.ok).length, 1, "tepat satu yang lolos");
    const loser = a.ok ? b : a;
    assert.ok(!loser.ok && (loser.status === 422 || loser.status === 409));
    assert.equal(await prisma.resident.count({ where: { villageId: v2.id, nik: shared } }), 1);
    const loserKk = a.ok ? kkY : kkX;
    assert.equal(await prisma.resident.count({ where: { villageId: v2.id, kk: loserKk } }), 0, "tidak ada anggota yatim dari keluarga yang gagal");
  });

  it("masukan sampah ditolak tanpa melempar", async () => {
    assert.equal(await svc.checkFamily(prisma, v2.id, null), null);
    assert.equal(await svc.checkFamily(prisma, v2.id, { header: {}, members: "x" }), null);
    const r = await svc.createFamily(prisma, { village: v2, userId: 1, body: 42 });
    assert.ok(!r.ok && r.status === 400);
    const empty = await svc.createFamily(prisma, { village: v2, userId: 1, body: { header: {}, members: [] } });
    assert.ok(!empty.ok && empty.status === 422);
  });
});
