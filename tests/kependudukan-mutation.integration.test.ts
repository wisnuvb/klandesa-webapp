/**
 * Tes integrasi alur mutasi penduduk terhadap MySQL sungguhan (database sementara). Cara menjalankan sama dengan
 * kependudukan-sync.integration.test.ts: butuh KEP_TEST_DATABASE_URL ke database yang namanya mengandung "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("alur mutasi (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/kependudukan/mutation-service");
  let sync: typeof import("../lib/kependudukan/sync");
  let villageId = 0;
  let otherVillageId = 0;
  const KK = "3508000000000101";
  const KK_B = "3508000000000102";
  const ids: Record<string, number> = {};
  let nik = 3508000000020000;
  const NOW = new Date("2026-10-31T00:00:00Z");

  const mk = (name: string, o: Record<string, unknown> = {}) =>
    prisma.resident.create({
      data: { villageId, nik: String(nik++), name, birthplace: "Lumajang", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "Jl. Mawar 1", rt: "01", rw: "01", ...o },
    });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/kependudukan/mutation-service");
    sync = await import("../lib/kependudukan/sync");
    const t = Date.now() % 1e6;
    villageId = (await prisma.village.create({ data: { code: `M${t}`, name: "Desa Mutasi", district: "k", regency: "r", province: "p", address: "a", settings: { kependudukanV2: true } } })).id;
    otherVillageId = (await prisma.village.create({ data: { code: `N${t}`, name: "Desa Lain", district: "k", regency: "r", province: "p", address: "a" } })).id;
    ids.head = (await mk("Pak Kepala", { kk: KK, familyRole: "Kepala Keluarga" })).id;
    ids.mother = (await mk("Bu Ibu", { kk: KK, familyRole: "Istri", gender: "Perempuan" })).id;
    ids.kid = (await mk("Si Anak", { kk: KK, familyRole: "Anak" })).id;
    ids.other = (await mk("Warga B", { kk: KK_B, familyRole: "Kepala Keluarga" })).id;
    await sync.reconcileVillage(prisma, villageId);
  });

  after(async () => {
    for (const id of [villageId, otherVillageId]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  const submit = (input: Parameters<typeof svc.submitMutation>[1]["input"]) => svc.submitMutation(prisma, { villageId, userId: 7, input, now: NOW });
  const decide = (mutationId: string, o: Partial<Parameters<typeof svc.decideMutationAtomic>[0]> = {}) =>
    svc.decideMutationAtomic({ villageId, mutationId: BigInt(mutationId), userId: 9, decision: "approve", now: NOW, ...o });

  it("mengajukan kematian: PENDING, warga belum berubah; pengajuan ganda ditolak 409", async () => {
    const r = await submit({ type: "DEATH", effectiveDate: "2026-10-20", residentId: ids.kid, details: { cause: "sakit" } });
    assert.ok(r.ok);
    const kid = await prisma.resident.findUniqueOrThrow({ where: { id: ids.kid } });
    assert.equal(kid.isAlive, true);
    const dup = await submit({ type: "DEATH", effectiveDate: "2026-10-20", residentId: ids.kid, details: {} });
    assert.ok(!dup.ok && dup.status === 409);
    ids.deathMut = Number(r.ok ? r.data.id : 0);
  });

  it("menolak harus beralasan; menolak tidak mengubah warga", async () => {
    const noReason = await decide(String(ids.deathMut), { decision: "reject" });
    assert.ok(!noReason.ok && noReason.status === 422);
    const ok = await decide(String(ids.deathMut), { decision: "reject", reason: "Salah orang" });
    assert.ok(ok.ok && ok.data.status === "REJECTED");
    const kid = await prisma.resident.findUniqueOrThrow({ where: { id: ids.kid } });
    assert.equal(kid.isAlive, true);
    const again = await decide(String(ids.deathMut));
    assert.ok(!again.ok && again.status === 409, "yang sudah ditolak tak bisa disetujui");
  });

  it("menyetujui kematian kepala keluarga: warga dinonaktifkan, KK tanpa kepala, tercatat APPLIED", async () => {
    const s = await submit({ type: "DEATH", effectiveDate: "2026-10-21", residentId: ids.head, details: {} });
    assert.ok(s.ok);
    const d = await decide(s.ok ? s.data.id : "0");
    assert.ok(d.ok && d.data.status === "APPLIED" && d.data.suspendResidentId === ids.head);
    const head = await prisma.resident.findUniqueOrThrow({ where: { id: ids.head } });
    assert.equal(head.isAlive, false);
    assert.equal(head.deathDate?.toISOString().slice(0, 10), "2026-10-21");
    const hh = await prisma.household.findUniqueOrThrow({ where: { villageId_kkNumber: { villageId, kkNumber: KK } } });
    assert.equal(hh.headResidentId, null, "kepala meninggal tidak lagi kepala");
    const m = await prisma.residentMutation.findFirstOrThrow({ where: { villageId, residentId: ids.head } });
    assert.equal(m.status, "APPLIED");
    assert.equal(m.decidedById, 9);
  });

  it("kematian warga yang sudah meninggal ditolak saat diajukan", async () => {
    const r = await submit({ type: "DEATH", effectiveDate: "2026-10-22", residentId: ids.head, details: {} });
    assert.ok(!r.ok && r.status === 422);
  });

  it("kelahiran: NIK tidak disimpan di pengajuan; menyetujui tanpa NIK gagal dan tetap PENDING; dengan NIK berhasil", async () => {
    const BABY_NIK = "3508004110260001"; // perempuan, lahir 01-10-2026
    const motherNik = (await prisma.resident.findUniqueOrThrow({ where: { id: ids.mother } })).nik;
    const s = await submit({
      type: "BIRTH",
      effectiveDate: "2026-10-01",
      details: { newResident: { name: "Bayi Baru", gender: "Perempuan", birthplace: "Lumajang", birthDate: "2026-10-01", motherNik, familyRole: "Anak" } },
    });
    assert.ok(s.ok, JSON.stringify(s));
    const mutId = s.ok ? s.data.id : "0";

    const stored = await prisma.residentMutation.findUniqueOrThrow({ where: { id: BigInt(mutId) } });
    const blob = JSON.stringify(stored.details);
    assert.ok(!blob.includes(motherNik), "NIK ibu tidak disimpan");
    assert.equal((stored.details as { newResident: { kk: string } }).newResident.kk, KK, "KK ditemukan dari ibu");

    const noNik = await decide(mutId);
    assert.ok(!noNik.ok && noNik.status === 422);
    const still = await prisma.residentMutation.findUniqueOrThrow({ where: { id: BigInt(mutId) } });
    assert.equal(still.status, "PENDING", "rollback: klaim dibatalkan saat validasi gagal");
    assert.equal(await prisma.resident.count({ where: { villageId, nik: BABY_NIK } }), 0);

    const ok = await decide(mutId, { nik: BABY_NIK });
    assert.ok(ok.ok, JSON.stringify(ok));
    const baby = await prisma.resident.findFirstOrThrow({ where: { villageId, nik: BABY_NIK } });
    assert.equal(baby.kk, KK);
    assert.equal(baby.religion, "Islam", "agama diwarisi dari KK");
    assert.equal(baby.address, "Jl. Mawar 1");
    assert.ok(baby.householdId, "langsung tertaut ke rumah tangga");
    const done = await prisma.residentMutation.findUniqueOrThrow({ where: { id: BigInt(mutId) } });
    assert.equal(done.status, "APPLIED");
    assert.equal(done.residentId, baby.id);
    assert.ok(!JSON.stringify(done.details).includes(BABY_NIK), "NIK bayi tidak tersimpan di mutasi");
  });

  it("kelahiran dengan NIK tidak cocok tanggal lahir/jenis kelamin tidak bisa diterapkan", async () => {
    const s = await submit({
      type: "BIRTH",
      effectiveDate: "2026-10-02",
      details: { newResident: { name: "Bayi Dua", gender: "Laki-laki", birthplace: "Lumajang", birthDate: "2026-10-02", kk: KK } },
    });
    assert.ok(s.ok);
    const bad = await decide(s.ok ? s.data.id : "0", { nik: "3508004110260009" }); // perempuan 01-10 ≠ laki-laki 02-10
    assert.ok(!bad.ok && bad.errors.some((e) => /tidak cocok/i.test(e)));
  });

  it("pindah keluar lalu datang kembali", async () => {
    const out = await submit({ type: "MOVE_OUT", effectiveDate: "2026-10-10", residentId: ids.other, details: { destination: "Surabaya" } });
    assert.ok(out.ok);
    assert.ok((await decide(out.ok ? out.data.id : "0")).ok);
    assert.ok((await prisma.resident.findUniqueOrThrow({ where: { id: ids.other } })).moveDate);
    const back = await submit({ type: "MOVE_IN", effectiveDate: "2026-10-25", residentId: ids.other, details: { origin: "Surabaya" } });
    assert.ok(back.ok);
    assert.ok((await decide(back.ok ? back.data.id : "0")).ok);
    assert.equal((await prisma.resident.findUniqueOrThrow({ where: { id: ids.other } })).moveDate, null);
  });

  it("perubahan KK memindahkan anggota dan menyinkronkan kedua rumah tangga", async () => {
    const s = await submit({ type: "KK_CHANGE", effectiveDate: "2026-10-26", residentId: ids.kid, details: { toKk: KK_B, newFamilyRole: "Anak" } });
    assert.ok(s.ok);
    assert.ok((await decide(s.ok ? s.data.id : "0")).ok);
    const kid = await prisma.resident.findUniqueOrThrow({ where: { id: ids.kid }, include: { household: true } });
    assert.equal(kid.kk, KK_B);
    assert.equal(kid.household?.kkNumber, KK_B);
  });

  it("membatalkan: hanya pengaju atau pejabat; pengajuan desa lain tidak ditemukan", async () => {
    const s = await submit({ type: "MOVE_OUT", effectiveDate: "2026-10-27", residentId: ids.mother, details: { destination: "Malang" } });
    assert.ok(s.ok);
    const id = BigInt(s.ok ? s.data.id : "0");
    const stranger = await svc.cancelMutation(prisma, { villageId, mutationId: id, userId: 55, isDecider: false });
    assert.ok(!stranger.ok && stranger.status === 403);
    const wrongVillage = await svc.cancelMutation(prisma, { villageId: otherVillageId, mutationId: id, userId: 7, isDecider: true });
    assert.ok(!wrongVillage.ok && wrongVillage.status === 404);
    const crossDecide = await svc.decideMutationAtomic({ villageId: otherVillageId, mutationId: id, userId: 9, decision: "approve", now: NOW });
    assert.ok(!crossDecide.ok && crossDecide.status === 404);
    const own = await svc.cancelMutation(prisma, { villageId, mutationId: id, userId: 7, isDecider: false });
    assert.ok(own.ok);
    const m = await prisma.residentMutation.findUniqueOrThrow({ where: { id } });
    assert.equal(m.status, "CANCELLED");
  });

  it("dua persetujuan serentak: hanya satu yang berhasil", async () => {
    const s = await submit({ type: "MOVE_OUT", effectiveDate: "2026-10-28", residentId: ids.mother, details: { destination: "Blitar" } });
    assert.ok(s.ok);
    const id = s.ok ? s.data.id : "0";
    const [a, b] = await Promise.all([decide(id), decide(id)]);
    assert.equal([a, b].filter((r) => r.ok).length, 1);
    assert.equal(await prisma.residentMutation.count({ where: { villageId, residentId: ids.mother, status: "APPLIED" } }), 1);
  });
});
