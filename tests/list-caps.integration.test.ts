/**
 * Tes integrasi batas pengaman daftar (GET /api/announcements, GET /api/ukm-products; MySQL sementara + sesi JWT nyata).
 * Batas (LIST_SAFETY_CAP) sangat longgar dan HARUS jujur: terpotong => `truncated: true` + `total` sebenarnya + agregat
 * seluruh hasil; tidak terpotong => semua baris, tanpa query hitung tambahan. Pencarian/filter sisi server tetap menjangkau
 * data lama, data desa lain tidak bocor, urutan stabil. Butuh KEP_TEST_DATABASE_URL (nama DB wajib mengandung scratch/test).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { capRows, LIST_SAFETY_CAP, LIST_SAFETY_TAKE } from "../lib/http/list-cap";

describe("capRows (murni)", () => {
  it("tidak memotong sampai tepat batas, memotong di atasnya", () => {
    const at = Array.from({ length: LIST_SAFETY_CAP }, (_, i) => i);
    assert.deepEqual(capRows(at), { rows: at, truncated: false });
    const over = [...at, -1];
    const r = capRows(over);
    assert.equal(r.truncated, true);
    assert.equal(r.rows.length, LIST_SAFETY_CAP);
    assert.equal(LIST_SAFETY_TAKE, LIST_SAFETY_CAP + 1);
  });
  it("batas longgar (tidak pernah memotong data wajar)", () => {
    assert.ok(LIST_SAFETY_CAP >= 2000);
  });
});

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("batas pengaman daftar (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let announcements: typeof import("../app/api/announcements/route");
  let ukm: typeof import("../app/api/ukm-products/route");
  let NextRequest: typeof import("next/server").NextRequest;
  const SECRET = "uji-rahasia-batas-daftar-0123456789abcdef";
  let cookieA = "";
  let villageA = 0;
  let villageB = 0;
  const OVER = LIST_SAFETY_CAP + 25;

  const call = (fn: (r: import("next/server").NextRequest) => Promise<Response>, path: string, withSession = true) =>
    fn(new NextRequest(`http://localhost${path}`, { headers: withSession ? { cookie: `next-auth.session-token=${cookieA}` } : {} }));

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    announcements = await import("../app/api/announcements/route");
    ukm = await import("../app/api/ukm-products/route");
    const { encode } = await import("next-auth/jwt");
    const t = Date.now() % 1e6;
    const mkV = (c: string) =>
      prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a" } });
    const a = await mkV("LA");
    const b = await mkV("LB");
    villageA = a.id;
    villageB = b.id;
    const u = await prisma.user.create({
      data: { villageId: villageA, email: `adm${t}@uji.test`, password: "x", name: "adm", role: "admin" },
    });
    cookieA = await encode({
      secret: SECRET,
      token: { sub: String(u.id), id: String(u.id), role: "admin", villageId: villageA, villageCode: a.code, accountType: "village", name: "adm", email: u.email },
    });

    // Pengumuman desa A: OVER baris, baris ke-0 paling LAMA (tidak tampil tanpa pencarian), tiga yang lama disematkan.
    const base = Date.UTC(2020, 0, 1);
    await prisma.announcement.createMany({
      data: Array.from({ length: OVER }, (_, i) => ({
        villageId: villageA,
        title: i === 0 ? "Pengumuman-paling-lama-unik" : `Pengumuman ${i}`,
        content: "isi",
        category: i % 2 === 0 ? "UMUM" : "KEGIATAN",
        isPinned: i >= 1 && i <= 3,
        publishDate: new Date(base + i * 60_000),
        viewCount: 2,
      })),
    });
    await prisma.announcement.create({ data: { villageId: villageA, title: "Nonaktif", content: "x", category: "UMUM", isActive: false } });
    await prisma.announcement.create({ data: { villageId: villageB, title: "Milik-desa-B", content: "x", category: "UMUM" } });

    // Produk UKM desa A: OVER baris dengan updatedAt sama persis (uji penentu seri id); satu bukan UKM; desa B satu.
    const same = new Date(Date.UTC(2024, 5, 1));
    await prisma.potential.createMany({
      data: Array.from({ length: OVER }, (_, i) => ({
        villageId: villageA,
        category: i % 2 === 0 ? "UMKM" : "UKM",
        subCategory: i === 0 ? "Kerajinan-unik" : "Kuliner",
        name: i === 0 ? "Produk-paling-lama-unik" : `Produk ${i}`,
        description: "d",
        updatedAt: same,
      })),
    });
    await prisma.potential.create({ data: { villageId: villageA, category: "Pertanian", name: "Bukan UKM", description: "d" } });
    await prisma.potential.create({ data: { villageId: villageB, category: "UMKM", name: "Produk-desa-B", description: "d" } });
  });

  after(async () => {
    await prisma.village.deleteMany({ where: { id: { in: [villageA, villageB] } } });
    await prisma.$disconnect();
  });

  it("tanpa sesi 401", async () => {
    assert.equal((await call(announcements.GET, "/api/announcements", false)).status, 401);
    assert.equal((await call(ukm.GET, "/api/ukm-products", false)).status, 401);
  });

  describe("/api/announcements", () => {
    it("terpotong: batas, total sebenarnya, agregat seluruh hasil, disematkan dulu lalu terbaru, tanpa data desa lain", async () => {
      const r = await call(announcements.GET, "/api/announcements");
      assert.equal(r.status, 200);
      const j = await r.json();
      assert.equal(j.rows.length, LIST_SAFETY_CAP);
      assert.equal(j.truncated, true);
      assert.equal(j.total, OVER); // yang nonaktif & desa B tidak dihitung
      assert.equal(j.pinnedTotal, 3);
      assert.equal(j.viewsTotal, OVER * 2);
      // Disematkan lebih dulu (walau paling lama), lalu terbaru.
      assert.deepEqual(j.rows.slice(0, 3).map((x: { isPinned: boolean }) => x.isPinned), [true, true, true]);
      assert.equal(j.rows[3].title, `Pengumuman ${OVER - 1}`);
      assert.ok(!j.rows.some((x: { title: string }) => x.title === "Milik-desa-B" || x.title === "Nonaktif"));
      // Baris paling lama terpotong dari daftar bawaan ...
      assert.ok(!j.rows.some((x: { title: string }) => x.title === "Pengumuman-paling-lama-unik"));
    });

    it("pencarian & kategori sisi server tetap menjangkau data yang terpotong", async () => {
      const s = await (await call(announcements.GET, "/api/announcements?search=paling-lama-unik")).json();
      assert.equal(s.truncated, false);
      assert.equal(s.total, 1);
      assert.equal(s.rows[0].title, "Pengumuman-paling-lama-unik");
      const c = await (await call(announcements.GET, "/api/announcements?category=KEGIATAN")).json();
      assert.equal(c.truncated, false);
      assert.equal(c.total, c.rows.length);
      assert.ok(c.rows.every((x: { category: string }) => x.category === "KEGIATAN"));
    });

    it("tidak terpotong: semua baris, total = jumlah baris, tanpa agregat", async () => {
      const j = await (await call(announcements.GET, "/api/announcements?search=Pengumuman 1")).json();
      assert.equal(j.truncated, false);
      assert.equal(j.total, j.rows.length);
      assert.equal(j.pinnedTotal, undefined);
      assert.equal(j.viewsTotal, undefined);
    });

    it("urutan stabil antar-panggilan", async () => {
      const ids = async () => ((await (await call(announcements.GET, "/api/announcements")).json()).rows as { id: number }[]).map((x) => x.id);
      assert.deepEqual(await ids(), await ids());
    });
  });

  describe("/api/ukm-products", () => {
    it("terpotong: batas, total sebenarnya, hanya UKM/UMKM desa sendiri, urutan stabil (penentu seri id desc)", async () => {
      const r = await call(ukm.GET, "/api/ukm-products");
      assert.equal(r.status, 200);
      const j = await r.json();
      assert.equal(j.rows.length, LIST_SAFETY_CAP);
      assert.equal(j.truncated, true);
      assert.equal(j.total, OVER);
      assert.ok(!j.rows.some((x: { name: string }) => x.name === "Bukan UKM" || x.name === "Produk-desa-B"));
      const ids: number[] = j.rows.map((x: { id: number }) => x.id);
      assert.deepEqual(ids, [...ids].sort((a, b) => b - a)); // updatedAt sama => id menurun
      const again = (await (await call(ukm.GET, "/api/ukm-products")).json()).rows.map((x: { id: number }) => x.id);
      assert.deepEqual(again, ids);
    });

    it("search & category sisi server menjangkau baris terpotong", async () => {
      const s = await (await call(ukm.GET, "/api/ukm-products?search=paling-lama-unik")).json();
      assert.equal(s.truncated, false);
      assert.equal(s.total, 1);
      assert.equal(s.rows[0].name, "Produk-paling-lama-unik");
      const c = await (await call(ukm.GET, "/api/ukm-products?category=Kerajinan-unik")).json();
      assert.equal(c.total, 1);
      assert.equal(c.rows[0].name, "Produk-paling-lama-unik");
    });

    it("tidak terpotong: total = jumlah baris", async () => {
      const j = await (await call(ukm.GET, "/api/ukm-products?search=Produk 19")).json();
      assert.equal(j.truncated, false);
      assert.equal(j.total, j.rows.length);
      assert.ok(j.rows.length > 0);
    });
  });
});
