/**
 * Tes integrasi daftar KK (/data-kk) terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke database
 * yang namanya mengandung "scratch"/"test" (cara menjalankan sama dengan family.integration.test.ts).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("daftar KK (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/kependudukan/kk-list-service");
  let lib: typeof import("../lib/kependudukan/kk-list");
  let v: { id: number };
  let other: { id: number };

  const NOW = new Date();
  const yearsAgo = (y: number, extraDays = 0) => new Date(NOW.getFullYear() - y, NOW.getMonth(), NOW.getDate() - extraDays, 12);

  const KK = {
    sehat: "3508070101100001", // kepala + istri hamil + bayi + 1 meninggal
    lansia: "3508070101100002", // satu lansia, dusun Karangsari RW 02 RT 01
    tanpaKepala: "3508070101100003", // RW "2" RT "1" (harus sama dengan "02"/"01")
    duaKepala: "3508070101100004",
    nikBuruk: "3508070101100005",
    kosong: "3508070101100006", // semua meninggal
    anakSaja: "3508070101100007", // tanpa dewasa, ada disabilitas
    lain: "3508070101100099", // desa lain
  };

  let seq = 0;
  const nik = () => `35080701${String(10000000 + ++seq)}`; // 16 angka
  type M = { kk: string; name: string; role: string; age: number; gender?: string; nik?: string; isAlive?: boolean; moveDate?: Date | null; isPregnant?: boolean; isDisability?: boolean; isStunting?: boolean; address?: string; rt?: string; rw?: string; hamlet?: string; villageId?: number };
  const mk = (m: M) =>
    prisma.resident.create({
      data: {
        villageId: m.villageId ?? v.id,
        nik: m.nik ?? nik(),
        kk: m.kk,
        name: m.name,
        birthplace: "Lumajang",
        birthDate: m.age < 1 ? yearsAgo(0, 100) : yearsAgo(m.age, 3),
        gender: m.gender ?? "Laki-laki",
        religion: "Islam",
        maritalStatus: "Menikah",
        familyRole: m.role,
        address: m.address ?? "Jl. Mawar 1",
        rt: m.rt ?? "01",
        rw: m.rw ?? "02",
        hamlet: m.hamlet ?? "Karangsari",
        isAlive: m.isAlive ?? true,
        moveDate: m.moveDate ?? null,
        isPregnant: m.isPregnant ?? false,
        isDisability: m.isDisability ?? false,
        isStunting: m.isStunting ?? false,
      },
    });

  const query = (o: Partial<import("../lib/kependudukan/kk-list").KkQuery> = {}) =>
    lib.parseKkQuery(new URLSearchParams(Object.entries(o).filter(([, x]) => x !== undefined && x !== null && x !== "").map(([k, x]) => [k, String(x)])));
  const list = (o: Parameters<typeof query>[0] = {}) => svc.listKk(prisma, { villageId: v.id, query: query({ pageSize: 100, ...o }), now: NOW });
  const kks = async (o: Parameters<typeof query>[0] = {}) => (await list(o)).rows.map((r) => r.kk).sort();

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/kependudukan/kk-list-service");
    lib = await import("../lib/kependudukan/kk-list");
    const t = Date.now() % 1e6;
    const village = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a" } });
    v = await village("K");
    other = await village("L");

    await mk({ kk: KK.sehat, name: "Budi Santoso", role: "Kepala Keluarga", age: 35, address: "Jl. Mawar 1" });
    await mk({ kk: KK.sehat, name: "Siti Aminah", role: "Istri", age: 32, gender: "Perempuan", isPregnant: true });
    await mk({ kk: KK.sehat, name: "Bayi Budi", role: "Anak", age: 0 });
    await mk({ kk: KK.sehat, name: "Kakek Almarhum", role: "Orang Tua", age: 80, isAlive: false });

    await mk({ kk: KK.lansia, name: "Mbah Sarmi", role: "Kepala Keluarga", age: 78, gender: "Perempuan", address: "Jl. Melati 5" });
    await mk({ kk: KK.tanpaKepala, name: "Dewi", role: "Istri", age: 40, gender: "Perempuan", rt: "1", rw: "2", hamlet: "Sukamaju", address: "Jl. Kenanga 2" });
    await mk({ kk: KK.tanpaKepala, name: "Andi", role: "Anak", age: 18, rt: "1", rw: "2", hamlet: "Sukamaju" });
    await mk({ kk: KK.duaKepala, name: "Rudi", role: "Kepala Keluarga", age: 50, rt: "03", rw: "10", hamlet: "Sukamaju" });
    await mk({ kk: KK.duaKepala, name: "Rani", role: "Kepala Keluarga", age: 48, gender: "Perempuan", rt: "03", rw: "10", hamlet: "Sukamaju" });
    await mk({ kk: KK.nikBuruk, name: "Joko", role: "Kepala Keluarga", age: 45, nik: "350807010199999", rt: "02", rw: "10", hamlet: "Sukamaju" }); // 15 angka
    await mk({ kk: KK.kosong, name: "Almarhum A", role: "Kepala Keluarga", age: 70, isAlive: false });
    await mk({ kk: KK.kosong, name: "Pindah B", role: "Istri", age: 65, gender: "Perempuan", moveDate: new Date("2026-01-01") });
    await mk({ kk: KK.anakSaja, name: "Kakak Kecil", role: "Kepala Keluarga", age: 12, isDisability: true });
    await mk({ kk: KK.anakSaja, name: "Adik Kecil", role: "Anak", age: 9 });
    await mk({ kk: KK.lain, name: "Warga Desa Lain", role: "Kepala Keluarga", age: 40, villageId: other.id });
  });

  after(async () => {
    for (const x of [v, other]) if (x) await prisma.village.delete({ where: { id: x.id } });
    await prisma.$disconnect();
  });

  it("hanya KK milik desa ini, dan hanya anggota aktif yang dihitung", async () => {
    const { rows, total } = await list();
    assert.equal(total, 7);
    assert.ok(!rows.some((r) => r.kk === KK.lain));
    const sehat = rows.find((r) => r.kk === KK.sehat)!;
    assert.equal(sehat.activeCount, 3);
    assert.equal(sehat.inactiveCount, 1);
    assert.equal(sehat.headCount, 1);
    assert.equal(sehat.headName, "Budi Santoso");
    assert.equal(sehat.balita, 1);
    assert.equal(sehat.hamil, 1);
    assert.equal(sehat.lansia, 0, "kakek yang meninggal tidak dihitung lansia");
    assert.ok(sehat.ref > 0);
  });

  it("anggota yang pindah dan yang meninggal sama-sama tidak aktif", async () => {
    const r = (await list()).rows.find((x) => x.kk === KK.kosong)!;
    assert.equal(r.activeCount, 0);
    assert.equal(r.inactiveCount, 2);
  });

  it("lencana: SQL 'perlu perhatian' sama persis dengan kkFlags di TypeScript", async () => {
    const all = (await list()).rows;
    const fromTs = all.filter((r) => lib.needsAttention(lib.kkFlags(r))).map((r) => r.kk).sort();
    assert.deepEqual(await kks({ preset: "perhatian" }), fromTs);
    assert.deepEqual(fromTs, [KK.tanpaKepala, KK.duaKepala, KK.nikBuruk].sort());
    const kosong = all.find((r) => r.kk === KK.kosong)!;
    assert.deepEqual(lib.kkFlags(kosong), ["NO_ACTIVE"]);
  });

  it("preset lansia sendiri dan tanpa dewasa", async () => {
    assert.deepEqual(await kks({ preset: "lansia_sendiri" }), [KK.lansia]);
    assert.deepEqual(await kks({ preset: "tanpa_dewasa" }), [KK.anakSaja]);
  });

  it("filter 'ada anggota'", async () => {
    assert.deepEqual(await kks({ has: "hamil" }), [KK.sehat]);
    assert.deepEqual(await kks({ has: "disabilitas" }), [KK.anakSaja]);
    assert.deepEqual(await kks({ has: "lansia" }), [KK.lansia]);
    assert.deepEqual(await kks({ has: "balita" }), [KK.sehat]);
    assert.deepEqual(await kks({ has: "stunting" }), []);
  });

  it("filter ukuran keluarga memakai anggota aktif", async () => {
    assert.deepEqual(await kks({ size: "1" }), [KK.lansia, KK.nikBuruk].sort());
    assert.deepEqual(await kks({ size: "2-4" }), [KK.sehat, KK.tanpaKepala, KK.duaKepala, KK.anakSaja].sort());
    assert.deepEqual(await kks({ size: "5+" }), []);
  });

  it("filter wilayah: '01' dan '1' satu unit; dusun tidak peka huruf besar", async () => {
    assert.deepEqual(await kks({ rw: "2" }), [KK.sehat, KK.lansia, KK.kosong, KK.anakSaja, KK.tanpaKepala].sort());
    assert.deepEqual(await kks({ rw: "02" }), await kks({ rw: "2" }));
    assert.deepEqual(await kks({ rw: "2", rt: "01" }), await kks({ rw: "2", rt: "1" }));
    assert.deepEqual(await kks({ dusun: "sukamaju" }), [KK.tanpaKepala, KK.duaKepala, KK.nikBuruk].sort());
    assert.deepEqual(await kks({ dusun: "Sukamaju", preset: "perhatian", rw: "10" }), [KK.duaKepala, KK.nikBuruk].sort());
  });

  it("pencarian: lewat nama anggota tetap menghitung SELURUH anggota KK itu", async () => {
    const r = await list({ search: "Siti" });
    assert.equal(r.total, 1);
    assert.equal(r.rows[0].kk, KK.sehat);
    assert.equal(r.rows[0].activeCount, 3);
  });

  it("pencarian: lewat NIK anggota, nomor KK, dan alamat", async () => {
    const nikBuruk = await list({ search: "350807010199999" });
    assert.deepEqual(nikBuruk.rows.map((r) => r.kk), [KK.nikBuruk]);
    assert.deepEqual((await list({ search: KK.lansia.slice(-6) })).rows.map((r) => r.kk), [KK.lansia]);
    assert.deepEqual((await list({ search: "Melati" })).rows.map((r) => r.kk), [KK.lansia]);
  });

  it("pencarian: karakter khusus LIKE diperlakukan apa adanya", async () => {
    assert.equal((await list({ search: "%" })).total, 0);
    assert.equal((await list({ search: "_" })).total, 0);
    assert.equal((await list({ search: "Siti|" })).total, 0);
  });

  it("masukan jahat tidak merusak query (parameter terikat)", async () => {
    const r = await list({ dusun: "x' OR 1=1 --", search: "'; DROP TABLE residents; --" });
    assert.equal(r.total, 0);
    assert.equal(await prisma.resident.count({ where: { villageId: v.id } }), 14);
  });

  it("urutan di SQL: jumlah anggota, RT/RW alami, alamat; ikatan diputus nomor KK", async () => {
    const asc = (await list({ sortKey: "jumlahAnggota", sortOrder: "asc" })).rows;
    assert.deepEqual(asc.map((r) => r.activeCount), [...asc.map((r) => r.activeCount)].sort((a, b) => a - b));
    const desc = (await list({ sortKey: "jumlahAnggota", sortOrder: "desc" })).rows;
    assert.equal(desc[0].activeCount, Math.max(...desc.map((r) => r.activeCount)));

    // RW 2 harus sebelum RW 10 (urutan angka, bukan huruf).
    const rt = (await list({ sortKey: "rt_rw", sortOrder: "asc" })).rows.map((r) => Number(lib.normalizeUnit(r.rw)));
    assert.deepEqual(rt, [...rt].sort((a, b) => a - b));
    const names = (await list({ sortKey: "alamat" })).rows.map((r) => r.address);
    assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });

  it("paging: halaman dipotong di SQL, total tetap utuh", async () => {
    const p1 = await list({ pageSize: 3, page: 1 });
    const p3 = await list({ pageSize: 3, page: 3 });
    assert.equal(p1.total, 7);
    assert.equal(p1.rows.length, 3);
    assert.equal(p3.rows.length, 1);
    const all = [...p1.rows, ...(await list({ pageSize: 3, page: 2 })).rows, ...p3.rows].map((r) => r.kk);
    assert.equal(new Set(all).size, 7, "tidak ada KK ganda/terlewat antar halaman");
  });

  it("ringkasan: angka dan pilihan wilayah", async () => {
    const s = await svc.summarizeKk(prisma, { villageId: v.id, now: NOW });
    assert.equal(s.totalKk, 7);
    assert.equal(s.totalJiwa, 3 + 1 + 2 + 2 + 1 + 0 + 2);
    assert.equal(s.perhatian, 3);
    assert.equal(s.lansiaSendiri, 1);
    assert.equal(s.tanpaDewasa, 1);
    assert.deepEqual(s.wilayah.dusun, ["Karangsari", "Sukamaju"]);
    assert.deepEqual(s.wilayah.rw, ["2", "10"]);
    assert.deepEqual(s.wilayah.rt, ["1", "2", "3"]);
    assert.ok(s.rataRataAnggota > 0);
  });

  it("ref membuka KK yang benar; ref desa lain atau tak dikenal = null", async () => {
    const sehat = (await list()).rows.find((r) => r.kk === KK.sehat)!;
    assert.equal(await svc.resolveKkKey(prisma, v.id, String(sehat.ref)), KK.sehat);
    const foreign = await prisma.resident.findFirstOrThrow({ where: { villageId: other.id }, select: { id: true } });
    assert.equal(await svc.resolveKkKey(prisma, v.id, String(foreign.id)), null);
    assert.equal(await svc.resolveKkKey(prisma, v.id, "999999999"), null);
    assert.equal(await svc.resolveKkKey(prisma, v.id, KK.sehat), KK.sehat, "nomor KK utuh (rute lama) tetap diterima");
  });
});
