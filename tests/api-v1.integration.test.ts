/**
 * Tes integrasi /api/v1 terhadap MySQL sungguhan: memanggil handler rute dengan kunci asli.
 * Butuh KEP_TEST_DATABASE_URL ke database ber-nama "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("/api/v1 (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  type Handler = (req: Request, ctx?: { params: Promise<{ id: string }> }) => Promise<Response>;
  let prisma: typeof import("../lib/prisma").prisma;
  let keys: typeof import("../lib/api-keys/keys");
  let sync: typeof import("../lib/kependudukan/sync");
  const h: Record<string, Handler> = {};
  let vA = 0;
  let vB = 0;
  let allKey = "";
  let narrowKey = "";
  let nik = 3508000000050000;
  const ids: Record<string, number> = {};
  const FULL_NIKS: string[] = [];

  const call = async (name: string, secret: string, qs = "", id?: string) => {
    const path = name === "penduduk/[id]" ? `/api/v1/penduduk/${id}` : name === "keluarga/[id]" ? `/api/v1/keluarga/${id}` : `/api/v1/${name}`;
    const res = await h[name](new Request(`http://localhost${path}${qs}`, { headers: { authorization: `Bearer ${secret}` } }), id ? { params: Promise.resolve({ id: id! }) } : undefined);
    return { status: res.status, body: await res.json(), headers: res.headers };
  };

  const mkRes = (villageId: number, name: string, o: Record<string, unknown> = {}) => {
    const n = String(nik++);
    FULL_NIKS.push(n);
    return prisma.resident.create({
      data: { villageId, nik: n, name, birthplace: "Lumajang", birthDate: new Date("1990-05-17"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "Jl. Rahasia No 1", phone: "08123456789", email: "rahasia@example.com", rt: "01", rw: "01", hamlet: "Mawar", fatherNik: "3508999999999999", isPregnant: true, income: 5000000, desil: "3", ...o },
    });
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    keys = await import("../lib/api-keys/keys");
    sync = await import("../lib/kependudukan/sync");
    for (const n of ["penduduk", "penduduk/[id]", "keluarga", "keluarga/[id]", "wilayah", "perangkat", "pengumuman", "potensi", "statistik", "anggaran"]) {
      h[n] = (await import(`../app/api/v1/${n}/route`)).GET;
    }
    const t = Date.now() % 1e6;
    const mkV = (c: string, n: string) => prisma.village.create({ data: { code: `${c}${t}`, name: n, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("VA", "Desa A")).id;
    vB = (await mkV("VB", "Desa B")).id;
    const all = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "semua", scopes: ["kependudukan:read", "perangkat:read", "pengumuman:read", "potensi:read", "statistik:read", "anggaran:read"], expiresInDays: null });
    const narrow = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "sempit", scopes: ["statistik:read"], expiresInDays: null });
    assert.ok(all.ok && narrow.ok);
    allKey = all.ok ? all.secret : "";
    narrowKey = narrow.ok ? narrow.secret : "";

    for (let i = 1; i <= 5; i++) ids[`a${i}`] = (await mkRes(vA, `Warga A${i}`, { kk: i <= 3 ? "3508000000000501" : "3508000000000502", familyRole: i === 1 || i === 4 ? "Kepala Keluarga" : "Anak", rt: i % 2 ? "01" : "02" })).id;
    ids.gone = (await mkRes(vA, "Warga Meninggal", { isAlive: false, deathDate: new Date("2026-01-01") })).id;
    ids.moved = (await mkRes(vA, "Warga Pindah", { moveDate: new Date("2026-02-01") })).id;
    ids.b1 = (await mkRes(vB, "Warga Desa B", { kk: "3508000000000601" })).id;

    const pos = await prisma.position.create({ data: { villageId: vA, name: "Kepala Desa", level: 1 } });
    await prisma.official.create({ data: { villageId: vA, positionId: pos.id, nik: "3508000000000999", name: "Pak Kades", birthplace: "x", birthDate: new Date("1970-01-01"), gender: "Laki-laki", phone: "0811", email: "k@x.id", address: "Rumah Kades", startDate: new Date("2020-01-01"), status: "active" } });
    await prisma.official.create({ data: { villageId: vA, positionId: pos.id, nik: "3508000000000998", name: "Mantan", birthplace: "x", birthDate: new Date("1960-01-01"), gender: "Laki-laki", address: "x", startDate: new Date("2010-01-01"), status: "inactive" } });

    const now = Date.now();
    await prisma.announcement.createMany({
      data: [
        { villageId: vA, title: "Tayang", content: "isi", category: "Pengumuman", publishDate: new Date(now - 1000) },
        { villageId: vA, title: "Belum terbit", content: "isi", category: "Pengumuman", publishDate: new Date(now + 86_400_000) },
        { villageId: vA, title: "Kedaluwarsa", content: "isi", category: "Pengumuman", publishDate: new Date(now - 5e6), expiryDate: new Date(now - 1000) },
        { villageId: vA, title: "Nonaktif", content: "isi", category: "Pengumuman", publishDate: new Date(now - 1000), isActive: false },
        { villageId: vB, title: "Milik B", content: "isi", category: "Pengumuman", publishDate: new Date(now - 1000) },
      ],
    });
    await prisma.potential.createMany({
      data: [
        { villageId: vA, category: "UMKM", name: "Keripik", description: "d", annualIncome: 99000000, productionValue: 12345, status: "active" },
        { villageId: vA, category: "UMKM", name: "Tutup", description: "d", status: "inactive" },
        { villageId: vB, category: "UMKM", name: "Milik B", description: "d", status: "active" },
      ],
    });
    const user = await prisma.user.create({ data: { villageId: vA, email: `u${t}@x.id`, password: "x", name: "Admin", role: "admin" } });
    const b = (code: string, category: string, amount: number, realized: number, year = 2026, status = "active") => ({ villageId: vA, budgetCode: code, year, category, budgetAmount: amount, realizedAmount: realized, remainingAmount: amount - realized, description: "d", createdBy: user.id, status });
    await prisma.budget.createMany({ data: [b("B1", "Pembangunan", 1000, 250), b("B2", "Pembangunan", 500, 500), b("B3", "Pemerintahan", 2000, 1000), b("B4", "Pemerintahan", 700, 0, 2026, "cancelled"), b("B5", "Lama", 100, 100, 2025)] });
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("penduduk: hanya desa pemilik kunci, default aktif, NIK/KK tersamar, tanpa kolom pribadi", async () => {
    const r = await call("penduduk", allKey, "?limit=100");
    assert.equal(r.status, 200);
    const names = r.body.data.map((x: { name: string }) => x.name);
    assert.equal(r.body.data.length, 5);
    assert.ok(!names.includes("Warga Desa B") && !names.includes("Warga Meninggal") && !names.includes("Warga Pindah"));
    const json = JSON.stringify(r.body);
    for (const n of FULL_NIKS) assert.ok(!json.includes(n), "NIK lengkap bocor");
    for (const leak of ["Jl. Rahasia", "08123456789", "rahasia@example.com", "3508999999999999", "1990-05-17", "5000000"]) assert.ok(!json.includes(leak), leak);
    assert.match(r.body.data[0].nik, /^\*{12}\d{4}$/);
    assert.equal(r.headers.get("cache-control"), "no-store");
  });

  it("penduduk: paginasi kursor menelusuri semua data tanpa duplikat", async () => {
    const seen: number[] = [];
    let cursor = "";
    for (let i = 0; i < 10; i++) {
      const r = await call("penduduk", allKey, `?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      assert.equal(r.status, 200);
      seen.push(...r.body.data.map((x: { id: number }) => x.id));
      if (!r.body.page.hasMore) {
        assert.equal(r.body.page.nextCursor, null);
        break;
      }
      cursor = r.body.page.nextCursor;
    }
    assert.equal(seen.length, 5);
    assert.equal(new Set(seen).size, 5);
    assert.deepEqual([...seen].sort((a, b) => a - b), seen, "urut id naik");
  });

  it("penduduk: filter status/rt/q dan validasi parameter", async () => {
    assert.equal((await call("penduduk", allKey, "?status=meninggal")).body.data.length, 1);
    assert.equal((await call("penduduk", allKey, "?status=pindah")).body.data.length, 1);
    assert.equal((await call("penduduk", allKey, "?status=semua&limit=100")).body.data.length, 7);
    assert.equal((await call("penduduk", allKey, "?rt=02&limit=100")).body.data.length, 2);
    assert.equal((await call("penduduk", allKey, "?q=A3")).body.data.length, 1);
    for (const qs of ["?status=hapus", "?limit=0", "?limit=101", "?cursor=ngawur", "?q=a"]) {
      const r = await call("penduduk", allKey, qs);
      assert.equal(r.status, 400, qs);
      assert.equal(r.body.error.code, "invalid_request");
    }
  });

  it("penduduk/[id]: milik sendiri 200; desa lain dan id ngawur tidak membocorkan", async () => {
    assert.equal((await call("penduduk/[id]", allKey, "", String(ids.a1))).status, 200);
    const other = await call("penduduk/[id]", allKey, "", String(ids.b1));
    assert.equal(other.status, 404);
    assert.ok(!JSON.stringify(other.body).includes("Desa B"));
    assert.equal((await call("penduduk/[id]", allKey, "", "abc")).status, 400);
    assert.equal((await call("penduduk/[id]", allKey, "", "0")).status, 400);
    assert.equal((await call("penduduk/[id]", allKey, "", "999999999")).status, 404);
  });

  it("scope: kunci sempit ditolak 403 di endpoint lain tetapi bisa statistik", async () => {
    for (const n of ["penduduk", "perangkat", "pengumuman", "potensi", "anggaran"]) {
      const r = await call(n, narrowKey);
      assert.equal(r.status, 403, n);
      assert.equal(r.body.error.code, "insufficient_scope");
    }
    assert.equal((await call("statistik", narrowKey)).status, 200);
    assert.equal((await call("penduduk", "kld_" + "z".repeat(40))).status, 401);
  });

  it("keluarga dan wilayah: 409 bila fitur belum aktif; setelah aktif menyamarkan KK dan menyertakan anggota", async () => {
    for (const n of ["keluarga", "wilayah"]) {
      const off = await call(n, allKey);
      assert.equal(off.status, 409, n);
      assert.equal(off.body.error.code, "feature_not_enabled");
    }
    await sync.activateVillage(vA);
    // Pelajaran: village di kunci dibaca per permintaan, jadi bendera langsung terbaca.
    const list = await call("keluarga", allKey, "?limit=100");
    assert.equal(list.status, 200);
    assert.ok(list.body.data.length >= 2);
    assert.ok(!JSON.stringify(list.body).includes("3508000000000501"), "KK lengkap bocor");
    assert.match(list.body.data[0].kk, /^\*{12}\d{4}$/);
    const detail = await call("keluarga/[id]", allKey, "", String(list.body.data[0].id));
    assert.equal(detail.status, 200);
    assert.ok(detail.body.data.members.length >= 1);
    for (const n of FULL_NIKS) assert.ok(!JSON.stringify(detail.body).includes(n));
    const w = await call("wilayah", allKey);
    assert.equal(w.status, 200);
    assert.ok(Array.isArray(w.body.data.dusun) && Array.isArray(w.body.data.rw));
    const bFam = await prisma.household.findFirst({ where: { villageId: vB } });
    assert.equal(bFam, null);
    assert.equal((await call("keluarga/[id]", allKey, "", "999999")).status, 404);
  });

  it("perangkat: hanya yang aktif dan tanpa NIK/telepon/email/alamat", async () => {
    const r = await call("perangkat", allKey);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.length, 1);
    assert.equal(r.body.data[0].position, "Kepala Desa");
    const json = JSON.stringify(r.body);
    for (const leak of ["3508000000000999", "0811", "k@x.id", "Rumah Kades", "1970-01-01"]) assert.ok(!json.includes(leak), leak);
  });

  it("pengumuman: hanya yang tayang milik desa ini", async () => {
    const r = await call("pengumuman", allKey);
    assert.deepEqual(r.body.data.map((a: { title: string }) => a.title), ["Tayang"]);
  });

  it("potensi: hanya aktif, tanpa pendapatan/nilai produksi", async () => {
    const r = await call("potensi", allKey);
    assert.deepEqual(r.body.data.map((p: { name: string }) => p.name), ["Keripik"]);
    const json = JSON.stringify(r.body);
    assert.ok(!json.includes("99000000") && !json.includes("12345") && !/annualIncome|productionValue/.test(json));
  });

  it("statistik: angka agregat benar dan tanpa data pribadi", async () => {
    const r = await call("statistik", allKey);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.penduduk.aktif, 5);
    assert.equal(r.body.data.penduduk.meninggal, 1);
    assert.equal(r.body.data.penduduk.pindah, 1);
    assert.equal(r.body.data.penduduk.tercatat, 7);
    assert.equal(r.body.data.penduduk.lakiLaki, 5);
    assert.equal(Object.values(r.body.data.penduduk.kelompokUmur as Record<string, number>).reduce((a, b) => a + b, 0), 5);
    assert.equal(r.body.data.keluarga.aktif, 2);
    assert.ok(!JSON.stringify(r.body).includes("Warga A"));
  });

  it("anggaran: dijumlah per kategori, membuang yang dibatalkan, default tahun terbaru, validasi year", async () => {
    const r = await call("anggaran", allKey);
    assert.equal(r.body.data.year, 2026);
    const pb = r.body.data.categories.find((c: { category: string }) => c.category === "Pembangunan");
    assert.deepEqual([pb.budget, pb.realized, pb.remaining, pb.realizationPercent], [1500, 750, 750, 50]);
    const pm = r.body.data.categories.find((c: { category: string }) => c.category === "Pemerintahan");
    assert.equal(pm.budget, 2000, "yang dibatalkan tidak ikut");
    assert.deepEqual([r.body.data.totals.budget, r.body.data.totals.realized], [3500, 1750]);
    assert.equal((await call("anggaran", allKey, "?year=2025")).body.data.totals.budget, 100);
    assert.equal((await call("anggaran", allKey, "?year=abc")).status, 400);
  });
});
