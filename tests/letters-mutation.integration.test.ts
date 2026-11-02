/**
 * Tes integrasi: menerbitkan surat pindah/datang mengajukan mutasi PENDING di Buku Mutasi (MySQL sungguhan, DB sementara).
 * Cara menjalankan sama dengan kependudukan-mutation.integration.test.ts: KEP_TEST_DATABASE_URL ke DB bernama "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("surat pindah/datang → pengajuan mutasi (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/letters/server/service");
  let village: import("@prisma/client").Village;
  let offVillage: import("@prisma/client").Village;
  let adminId = 0;
  let viewerId = 0;
  let offAdminId = 0;
  const tpl: Record<string, number> = {};
  const rid: Record<string, number> = {};
  let nik = 3508000000030000;
  const KK = "3508000000000301";

  const mk = (villageId: number, name: string, o: Record<string, unknown> = {}) =>
    prisma.resident.create({
      data: { villageId, nik: String(nik++), name, birthplace: "Lumajang", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "Jl. Mawar 1", rt: "01", rw: "01", kk: KK, ...o },
    });

  const issue = (templateKey: string, body: Record<string, unknown>, o: { v?: typeof village; userId?: number } = {}) =>
    svc.createLetter({ village: o.v ?? village, userId: o.userId ?? adminId, body: { templateId: tpl[templateKey], status: "completed", letterDate: "2026-10-31", ...body } });
  const pending = (v = village) => prisma.residentMutation.findMany({ where: { villageId: v.id }, orderBy: { id: "asc" } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/letters/server/service");
    const { getAllCatalogDefinitions, buildCatalogInserts } = await import("../lib/mail/catalogTemplates");
    const t = Date.now() % 1e6;
    const mkVillage = (code: string, settings: object | undefined) =>
      prisma.village.create({ data: { code: `${code}${t}`, name: `Desa ${code}`, district: "k", regency: "r", province: "p", address: "a", ...(settings ? { settings } : {}) } });
    village = await mkVillage("L", { kependudukanV2: true });
    offVillage = await mkVillage("O", undefined);

    adminId = (await prisma.user.create({ data: { villageId: village.id, email: `a${t}@l.test`, password: "x", name: "Admin", role: "admin" } })).id;
    viewerId = (await prisma.user.create({ data: { villageId: village.id, email: `v${t}@l.test`, password: "x", name: "Pembaca", role: "viewer" } })).id;
    offAdminId = (await prisma.user.create({ data: { villageId: offVillage.id, email: `o${t}@l.test`, password: "x", name: "Admin O", role: "admin" } })).id;

    for (const key of ["cat_kep_sk_pindah", "cat_kep_skpwni", "cat_kep_sk_datang", "cat_kep_sk_lahir"]) {
      const def = getAllCatalogDefinitions().find((d) => d.catalogKey === key)!;
      const row = buildCatalogInserts(def);
      tpl[key] = (await prisma.mailTemplate.create({ data: { ...row, catalogKey: `${row.catalogKey}_t${t}`, inheritsCatalogKey: key, isGlobal: false, villageId: village.id, isActive: true } })).id;
    }
    // template yang sama untuk desa tanpa Buku Mutasi
    const def = getAllCatalogDefinitions().find((d) => d.catalogKey === "cat_kep_sk_pindah")!;
    const row = buildCatalogInserts(def);
    tpl.off = (await prisma.mailTemplate.create({ data: { ...row, catalogKey: `${row.catalogKey}_off${t}`, inheritsCatalogKey: "cat_kep_sk_pindah", isGlobal: false, villageId: offVillage.id, isActive: true } })).id;

    rid.head = (await mk(village.id, "Pak Kepala", { familyRole: "Kepala Keluarga" })).id;
    rid.mother = (await mk(village.id, "Bu Ibu", { familyRole: "Istri", gender: "Perempuan" })).id;
    rid.kid = (await mk(village.id, "Si Anak")).id;
    rid.gone = (await mk(village.id, "Sudah Pindah", { moveDate: new Date("2026-01-01"), kk: "3508000000000302" })).id;
    rid.offHead = (await mk(offVillage.id, "Warga Desa O", { familyRole: "Kepala Keluarga" })).id;
  });

  after(async () => {
    for (const v of [village, offVillage]) if (v) await prisma.village.delete({ where: { id: v.id } });
    await prisma.$disconnect();
  });

  const OUT = { tanggal_pindah: "2026-10-30", alamat_tujuan: "Jl. Baru 1, Malang", alasan_pindah: "Pekerjaan" };

  it("pindah keluar terbit: pemohon + pengikut dari Data Warga → 2 pengajuan PENDING (sumber letter), data warga belum berubah", async () => {
    const r = await issue("cat_kep_sk_pindah", { people: { pemohon: { residentId: rid.head } }, fields: OUT, groups: { pengikut: [{ residentId: rid.mother }, { values: { nama: "Anak Manual" } }] } });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.status, "completed");
    assert.equal(r.value.mutation?.kind, "MOVE_OUT");
    assert.equal(r.value.mutation?.created.length, 2);
    assert.equal(r.value.mutation?.skipped.length, 1); // pengikut manual dijelaskan

    const rows = await pending();
    assert.equal(rows.length, 2);
    for (const m of rows) {
      assert.equal(m.type, "MOVE_OUT");
      assert.equal(m.status, "PENDING");
      assert.equal(m.source, "letter");
      assert.equal(m.requestedById, adminId);
      assert.equal(m.effectiveDate.toISOString().slice(0, 10), "2026-10-30");
      assert.equal((m.details as { destination?: string }).destination, "Jl. Baru 1, Malang");
    }
    assert.deepEqual(rows.map((m) => m.residentId).sort(), [rid.head, rid.mother].sort());
    const head = await prisma.resident.findUniqueOrThrow({ where: { id: rid.head } });
    assert.equal(head.moveDate, null);
    assert.equal(head.isAlive, true);
  });

  it("menerbitkan lagi untuk warga yang sama: 409 dari anti-ganda dijelaskan, tidak ada baris ganda, surat tetap terbit", async () => {
    const r = await issue("cat_kep_sk_pindah", { people: { pemohon: { residentId: rid.head } }, fields: OUT });
    assert.ok(r.ok);
    assert.equal(r.value.status, "completed");
    assert.equal(r.value.mutation?.created.length, 0);
    assert.match(r.value.mutation?.skipped[0] ?? "", /sudah ada pengajuan/i);
    assert.equal((await pending()).length, 2);
  });

  it("draf tidak mengajukan apa pun; menerbitkan draf (PATCH) baru mengajukan", async () => {
    const before_ = (await pending()).length;
    const draft = await issue("cat_kep_sk_pindah", { status: "draft", people: { pemohon: { residentId: rid.kid } }, fields: OUT });
    assert.ok(draft.ok);
    assert.equal(draft.value.mutation, undefined);
    assert.equal((await pending()).length, before_);

    const done = await svc.updateLetter({ village, userId: adminId, id: BigInt(draft.value.id), body: { status: "completed", letterDate: "2026-10-31", people: { pemohon: { residentId: rid.kid } }, fields: OUT, groups: {} } });
    assert.ok(done.ok, done.ok ? "" : done.error);
    assert.equal(done.value.mutation?.created.length, 1);
    assert.equal((await pending()).length, before_ + 1);
  });

  it("tanggal pindah di masa depan: surat terbit, tidak ada pengajuan, alasan menyebut masa depan", async () => {
    const before_ = (await pending()).length;
    const r = await issue("cat_kep_sk_pindah", { people: { pemohon: { residentId: rid.mother } }, fields: { ...OUT, tanggal_pindah: "2099-01-01" } });
    assert.ok(r.ok);
    assert.equal(r.value.status, "completed");
    assert.equal(r.value.mutation?.created.length, 0);
    assert.match(r.value.mutation?.skipped[0] ?? "", /masa depan/);
    assert.equal((await pending()).length, before_);
  });

  it("pemohon manual (bukan dari Data Warga): surat terbit, tidak ada pengajuan", async () => {
    const before_ = (await pending()).length;
    const r = await issue("cat_kep_sk_pindah", { people: { pemohon: { manual: { nama: "Orang Luar", nik: "3508000000099999" } } }, fields: OUT });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.mutation?.created.length, 0);
    assert.equal((await pending()).length, before_);
  });

  it("pindah datang: warga lama yang kembali (tercatat pindah) → MOVE_IN PENDING dengan asal", async () => {
    const r = await issue("cat_kep_skpwni", { people: { pemohon: { residentId: rid.gone } }, fields: { daerah_asal: "Surabaya", tanggal_datang: "2026-10-28" } });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.mutation?.kind, "MOVE_IN");
    assert.equal(r.value.mutation?.created.length, 1);
    const m = (await pending()).find((x) => x.type === "MOVE_IN")!;
    assert.equal(m.status, "PENDING");
    assert.equal(m.residentId, rid.gone);
    assert.equal(m.source, "letter");
    assert.equal((m.details as { origin?: string }).origin, "Surabaya");
    const gone = await prisma.resident.findUniqueOrThrow({ where: { id: rid.gone } });
    assert.ok(gone.moveDate, "data warga belum berubah sebelum disetujui");
  });

  it("pindah datang dengan pemohon aktif (tidak tercatat pindah): ditolak aturan mutasi → alasan, bukan galat", async () => {
    const r = await issue("cat_kep_sk_datang", { people: { pemohon: { residentId: rid.kid } }, fields: { alamat_asal: "Kediri", tanggal_datang: "2026-10-28", status_tinggal: "Pindah menetap" } });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.mutation?.created.length, 0);
    assert.match(r.value.mutation?.skipped[0] ?? "", /tidak tercatat pindah keluar/);
  });

  it("pendatang baru tanpa KK/NIK lengkap → dilewati dengan penjelasan (surat tetap terbit)", async () => {
    const r = await issue("cat_kep_skpwni", { people: { pemohon: { manual: { nama: "Pendatang", nik: "3578016801850002", ttl: "Surabaya, 28 Januari 1985", jenis_kelamin: "Perempuan" } } }, fields: { daerah_asal: "Surabaya", tanggal_datang: "2026-10-28" } });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.mutation?.created.length, 0);
    assert.match(r.value.mutation?.skipped[0] ?? "", /nomor KK tujuan/);
  });

  it("jenis surat lain (kelahiran) tidak membawa info mutasi dan tidak membuat pengajuan", async () => {
    const before_ = (await pending()).length;
    const r = await issue("cat_kep_sk_lahir", { people: {}, fields: {} });
    // boleh gagal validasi isian wajib; yang penting tidak ada mutasi
    if (r.ok) assert.equal(r.value.mutation, undefined);
    assert.equal((await pending()).length, before_);
  });

  it("peran tanpa hak mengajukan mutasi: surat terbit, alasan peran, tidak ada pengajuan", async () => {
    const before_ = (await pending()).length;
    const r = await issue("cat_kep_sk_pindah", { people: { pemohon: { residentId: rid.mother } }, fields: OUT }, { userId: viewerId });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.mutation?.created.length, 0);
    assert.match(r.value.mutation?.skipped[0] ?? "", /Peran Anda/);
    assert.equal((await pending()).length, before_);
  });

  it("desa tanpa Buku Mutasi (flag mati): surat terbit, alasan, tanpa pengajuan", async () => {
    const r = await issue("off", { people: { pemohon: { residentId: rid.offHead } }, fields: OUT }, { v: offVillage, userId: offAdminId });
    assert.ok(r.ok, r.ok ? "" : r.error);
    assert.equal(r.value.mutation?.created.length, 0);
    assert.match(r.value.mutation?.skipped[0] ?? "", /belum aktif/);
    assert.equal((await pending(offVillage)).length, 0);
  });

  it("kegagalan pengajuan tidak membatalkan surat: submit yang melempar → alasan, surat tetap ada", async () => {
    const { proposeLetterMutations } = await import("../lib/letters/server/mutation-link");
    const { emptyLetterValues } = await import("../lib/letters/values");
    const v = emptyLetterValues();
    v.people.pemohon = { nama: "Budi" };
    v.fields = { ...OUT };
    const out = await proposeLetterMutations({
      village, userId: adminId, template: { inheritsCatalogKey: "cat_kep_sk_pindah" },
      input: { letterDate: null, number: null, people: { pemohon: { residentId: rid.kid, manual: false, overrides: {} } }, fields: {}, groups: {} } as unknown as Parameters<typeof proposeLetterMutations>[0]["input"],
      values: v,
      submit: async () => { throw new Error("DB mati"); },
    });
    assert.equal(out?.created.length, 0);
    assert.match(out?.skipped[0] ?? "", /gagal/);
  });
});
