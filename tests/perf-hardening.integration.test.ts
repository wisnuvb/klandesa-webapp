/**
 * Penghematan query (audit 2026-11-05), handler asli + MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 * - Ringkasan kualitas KK/NIK (`?summary=1`): hitungan SAMA dengan daftar penuh, di-cache per desa (tidak bocor antar desa),
 *   sedangkan daftar penuh tetap segar.
 * - Statistik per kategori: hasil tetap benar (filter/cari/urut/halaman) dan terpisah per desa meski daftar mentah di-cache.
 * - billing/status: tetap benar tanpa baca ulang desa yang tidak perlu.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Penghematan query dashboard (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let kualitas: typeof import("../app/api/kependudukan/kualitas/route");
  let kualitasNik: typeof import("../app/api/kependudukan/kualitas/nik/route");
  let byCategory: typeof import("../app/api/statistics/residents-by-category/route");
  let billing: typeof import("../app/api/billing/status/route");
  const SECRET = "uji-rahasia-perf-0123456789abcdef";
  const t = Date.now() % 1e6;
  const cookies: Record<string, string> = {};
  const vids: Record<string, number> = {};
  let seq = 0;

  const call = (h: (r: NextRequest) => Promise<Response>, who: string, path: string) =>
    h(new NextRequest(`http://localhost${path}`, { headers: { cookie: `next-auth.session-token=${cookies[who]}` } }));

  const mkResident = (villageId: number, over: Record<string, unknown> = {}) => {
    seq += 1;
    return prisma.resident.create({
      data: {
        villageId, nik: `${String(t).padStart(6, "0")}${String(villageId).padStart(4, "0")}${String(seq).padStart(6, "0")}`, name: `Warga ${seq}`,
        birthplace: "x", birthDate: new Date("1985-05-05"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah",
        familyRole: "Kepala Keluarga", rt: "01", rw: "02", kk: "3201010101010001", ...over,
      },
    });
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    kualitas = await import("../app/api/kependudukan/kualitas/route");
    kualitasNik = await import("../app/api/kependudukan/kualitas/nik/route");
    byCategory = await import("../app/api/statistics/residents-by-category/route");
    billing = await import("../app/api/billing/status/route");
    const { encode } = await import("next-auth/jwt");
    for (const key of ["A", "B"]) {
      const v = await prisma.village.create({ data: { code: `P${key}${t}`, name: `Desa ${key}`, district: "k", regency: "r", province: "p", address: "a" } });
      vids[key] = v.id;
      const u = await prisma.user.create({ data: { villageId: v.id, email: `adm${key}${t}@uji.test`, password: "x", name: key, role: "admin", isActive: true } });
      cookies[key] = await encode({
        secret: SECRET,
        token: { sub: String(u.id), id: String(u.id), role: "admin", villageId: v.id, villageCode: v.code, accountType: "village", name: key, email: u.email },
      });
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe("kualitas KK/NIK: ?summary=1", () => {
    it("hitungan ringkasan = hitungan daftar penuh; ringkasan di-cache, daftar penuh tetap segar", async () => {
      const A = vids.A;
      await mkResident(A, { kk: "123" }); // KK tidak valid
      await mkResident(A, { kk: null }); // KK kosong
      await mkResident(A, { kk: "3201010101010002", familyRole: "Kepala Keluarga" });

      const full = await (await call(kualitas.GET, "A", "/api/kependudukan/kualitas?limit=1")).json();
      const sum1 = await (await call(kualitas.GET, "A", "/api/kependudukan/kualitas?summary=1")).json();
      assert.deepEqual(sum1.counts, full.counts, "ringkasan sama dengan counts daftar penuh");
      assert.equal(Object.keys(sum1).join(","), "counts", "ringkasan hanya memuat counts (tidak ada data warga)");
      const totalBefore = Object.values(sum1.counts as Record<string, number>).reduce((a, b) => a + b, 0);
      assert.ok(totalBefore >= 2, `ada temuan: ${JSON.stringify(sum1.counts)}`);

      // Tambah temuan baru: ringkasan (cache 60 dtk) belum berubah, daftar penuh langsung berubah.
      await mkResident(A, { kk: "99" });
      const sum2 = await (await call(kualitas.GET, "A", "/api/kependudukan/kualitas?summary=1")).json();
      assert.deepEqual(sum2.counts, sum1.counts, "ringkasan memakai cache dalam TTL");
      const fullAfter = await (await call(kualitas.GET, "A", "/api/kependudukan/kualitas?limit=1")).json();
      const totalAfter = Object.values(fullAfter.counts as Record<string, number>).reduce((a, b) => a + b, 0);
      assert.equal(totalAfter, totalBefore + 1, "daftar penuh tidak di-cache");
    });

    it("cache terpisah per desa: desa B tidak melihat temuan desa A", async () => {
      const sumB = await (await call(kualitas.GET, "B", "/api/kependudukan/kualitas?summary=1")).json();
      assert.equal(Object.values(sumB.counts as Record<string, number>).reduce((a, b) => a + b, 0), 0);
    });

    it("tanpa sesi tetap 401 (ringkasan tidak melewati guard)", async () => {
      const res = await kualitas.GET(new NextRequest("http://localhost/api/kependudukan/kualitas?summary=1"));
      assert.equal(res.status, 401);
    });

    it("NIK: ringkasan = counts daftar penuh dan hanya {total, counts}", async () => {
      await mkResident(vids.A, { nik: "123" }); // NIK tidak valid
      const full = await (await call(kualitasNik.GET, "A", "/api/kependudukan/kualitas/nik?limit=1")).json();
      const sum = await (await call(kualitasNik.GET, "A", "/api/kependudukan/kualitas/nik?summary=1")).json();
      assert.deepEqual(sum.counts, full.counts);
      assert.equal(sum.total, full.total);
      assert.deepEqual(Object.keys(sum).sort(), ["counts", "total"]);
      assert.ok(Object.values(sum.counts as Record<string, number>).reduce((a, b) => a + b, 0) >= 1);
    });
  });

  describe("statistik per kategori (daftar mentah di-cache 60 dtk)", () => {
    const q = (who: string, extra = "") => call(byCategory.GET, who, `/api/statistics/residents-by-category?dimension=gender&category=Perempuan${extra}`).then((r) => r.json());

    it("filter, cari, urut, halaman tetap benar; hanya warga hidup", async () => {
      const B = vids.B;
      for (let i = 0; i < 5; i++) await mkResident(B, { gender: "Perempuan", name: `Ibu ${String.fromCharCode(69 - i)}` });
      await mkResident(B, { gender: "Perempuan", name: "Ibu Meninggal", isAlive: false });
      await mkResident(B, { gender: "Laki-laki", name: "Bapak X" });

      const all = await q("B", "&pageSize=100");
      assert.equal(all.total, 5, "tidak termasuk yang meninggal dan laki-laki");
      const page1 = await q("B", "&pageSize=2&page=1");
      const page3 = await q("B", "&pageSize=2&page=3");
      assert.equal(page1.rows.length, 2);
      assert.equal(page3.rows.length, 1);
      assert.equal(page1.total, 5);
      const found = await q("B", "&search=Ibu%20C");
      assert.equal(found.total, 1);
      assert.equal(found.rows[0].name, "Ibu C");
    });

    it("hasil dari cache tidak bocor ke desa lain dan tidak berubah oleh urutan/pencarian sebelumnya", async () => {
      const a = await q("A", "&pageSize=100");
      assert.equal(a.total, 0, "desa A tidak punya perempuan hidup");
      const bAgain = await q("B", "&pageSize=100&sortKey=name&sortOrder=desc");
      assert.equal(bAgain.total, 5);
      const names = (bAgain.rows as { name: string }[]).map((r) => r.name);
      assert.deepEqual(names, [...names].sort((x, y) => y.localeCompare(x)));
      const plain = await q("B", "&pageSize=100");
      assert.equal(plain.total, 5, "pengurutan sebelumnya tidak mengubah daftar yang disimpan");
    });
  });

  describe("GET /api/billing/status", () => {
    it("tetap mengembalikan status langganan desa (tanpa baca ulang bila tak ada transisi)", async () => {
      const res = await call(billing.GET, "A", "/api/billing/status");
      assert.equal(res.status, 200, JSON.stringify(await res.clone().json()));
      const body = await res.json();
      assert.equal(typeof body.subscription?.active, "boolean");
      assert.ok("village" in body);
    });

    it("trial yang sudah lewat berpindah fase dan respons memuat status TERBARU (baca ulang saat ada transisi)", async () => {
      const v = await prisma.village.create({
        data: {
          code: `PT${t}`, name: "Desa Trial", district: "k", regency: "r", province: "p", address: "a",
          subscriptionStatus: "trial", subscriptionExpiry: new Date(Date.now() - 30 * 86_400_000),
        },
      });
      const { encode } = await import("next-auth/jwt");
      const u = await prisma.user.create({ data: { villageId: v.id, email: `trial${t}@uji.test`, password: "x", name: "T", role: "admin", isActive: true } });
      cookies.T = await encode({
        secret: SECRET,
        token: { sub: String(u.id), id: String(u.id), role: "admin", villageId: v.id, villageCode: v.code, accountType: "village", name: "T", email: u.email },
      });
      const res = await call(billing.GET, "T", "/api/billing/status");
      assert.equal(res.status, 200);
      const body = await res.json();
      const inDb = await prisma.village.findUnique({ where: { id: v.id }, select: { subscriptionStatus: true, subscriptionExpiry: true } });
      // Trial lewat -> masa tenggang (tulis ke DB). Respons harus memuat status BARU, bukan baris lama dari guard ("trial").
      assert.equal(inDb?.subscriptionStatus, "grace", "transisi tertulis ke DB");
      assert.equal(body.subscription.status, "grace", "respons mengikuti baris terbaru (dibaca ulang karena ada transisi)");
      assert.equal(body.subscription.phase, "grace");
      assert.equal(body.subscription.active, true, "grace masih bisa dibaca");
      assert.equal(body.subscription.writable, false, "grace hanya baca");
      assert.equal(new Date(body.subscription.expiry).getTime(), inDb?.subscriptionExpiry?.getTime(), "tanggal berakhir = nilai baru di DB");
    });
  });
});
