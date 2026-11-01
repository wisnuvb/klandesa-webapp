/* eslint-disable @typescript-eslint/no-explicit-any -- badan respons JSON diperiksa dinamis di tes */
/**
 * Tes integrasi produk UKM milik warga (API mobile + helper web) terhadap MySQL sungguhan.
 * Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test" yang skemanya sudah di-push.
 * Memanggil handler rute langsung dengan NextRequest + token mobile asli.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

const CDN = "https://cdn.test";

describe("Produk UKM milik warga (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let NextRequest: typeof import("next/server").NextRequest;
  let sign: typeof import("../lib/mobile/tokens").signMobileAccessToken;
  let catalog: typeof import("../app/api/mobile/v1/ukm/route");
  let mine: typeof import("../app/api/mobile/v1/ukm/mine/route");
  let item: typeof import("../app/api/mobile/v1/ukm/[id]/route");
  let owner: typeof import("../lib/ukm/owner");
  let serialize: typeof import("../app/api/ukm-products/_serialize");

  let vA = 0;
  let vB = 0;
  let codeA = "";
  const rid: Record<string, number> = {};
  const tok: Record<string, string> = {};
  const pid: Record<string, number> = {};
  const t = Date.now() % 1e6;

  const ownPhoto = (n: string) => `${CDN}/villages/${codeA}/mobile-ukm/2026/11/${n}.jpg`;
  const req = (path: string, token: string | null, method = "GET", body?: unknown) =>
    new NextRequest(`http://localhost/api/mobile/v1${path}`, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as Record<string, any> });
  const idParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
  const getCatalog = async (who: string, qs = "") => json(await catalog.GET(req(`/ukm${qs}`, tok[who])));
  const getItem = async (who: string, id: number) => json(await item.GET(req(`/ukm/${id}`, tok[who]), idParams(id)));
  const patch = async (who: string, id: number, body: unknown) => json(await item.PATCH(req(`/ukm/${id}`, tok[who], "PATCH", body), idParams(id)));
  const post = async (who: string | null, body: unknown) => json(await catalog.POST(req("/ukm", who ? tok[who] : null, "POST", body)));
  /** Notifikasi dikirim fire-and-forget (tidak menahan respons), jadi tunggu sebentar sebelum memeriksa. */
  const eventually = async <T>(fn: () => Promise<T | null | undefined>, ms = 3000): Promise<T | null | undefined> => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await fn();
      if (v || Date.now() > end) return v;
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const statusOf = async (id: number) => (await prisma.potential.findUniqueOrThrow({ where: { id } })).status;

  const mkProduct = (data: Record<string, unknown>) =>
    prisma.potential.create({ data: { villageId: vA, category: "UMKM", description: "Deskripsi produk contoh", ...data } as never });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET ||= "tes-rahasia-ukm-0123456789";
    Object.assign(process.env, {
      SPACES_REGION: "sgp1", SPACES_BUCKET: "tes", SPACES_ENDPOINT: "https://sgp1.example.test",
      SPACES_ACCESS_KEY_ID: "k", SPACES_SECRET_ACCESS_KEY: "s", SPACES_CDN_BASE_URL: CDN,
    });
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    ({ signMobileAccessToken: sign } = await import("../lib/mobile/tokens"));
    catalog = await import("../app/api/mobile/v1/ukm/route");
    mine = await import("../app/api/mobile/v1/ukm/mine/route");
    item = await import("../app/api/mobile/v1/ukm/[id]/route");
    owner = await import("../lib/ukm/owner");
    serialize = await import("../app/api/ukm-products/_serialize");

    const mkV = (c: string) =>
      prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    const a = await mkV("UA");
    const b = await mkV("UB");
    vA = a.id; vB = b.id; codeA = a.code;

    let n = 0;
    const mkR = async (key: string, villageId: number, isAlive = true) =>
      (rid[key] = (await prisma.resident.create({ data: { villageId, nik: `33002${t}${++n}`.padEnd(16, "0").slice(0, 16), name: key === "a" ? "SITI AMINAH PUTRI" : `Warga ${key}`, hamlet: key === "a" ? "Dusun Mawar" : null, birthplace: "x", birthDate: new Date("1985-01-01"), gender: "Perempuan", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", isAlive } })).id);
    await mkR("a", vA); await mkR("b", vA); await mkR("dead", vA, false); await mkR("vb", vB);
    // Akun terpisah per kelompok skenario: pembatas laju tulis (20/10 menit) berada di memori dan dibagi POST+PATCH.
    await mkR("p", vA); await mkR("q", vA); await mkR("rl", vA);

    const mkAcc = async (key: string, villageId: number) => {
      const acc = await prisma.citizenAccount.create({ data: { villageId, residentId: rid[key], username: `ukm${t}${key}`, passwordHash: "x", status: "ACTIVE" } });
      tok[key] = sign({ t: "citizen", id: acc.id, villageId, role: "citizen" });
    };
    await mkAcc("a", vA); await mkAcc("b", vA); await mkAcc("vb", vB);
    await mkAcc("p", vA); await mkAcc("q", vA); await mkAcc("rl", vA);

    await prisma.user.create({ data: { villageId: vA, email: `admin${t}@ukm.test`, password: "x", name: "Admin", role: "admin" } });

    pid.admin = (await mkProduct({ name: "Madu Desa", subCategory: "Makanan", status: "active", productNotes: "RAHASIA-SUPPLIER" })).id;
    pid.keripik = (await mkProduct({ name: "Keripik Singkong", subCategory: "Makanan", status: "active", residentId: rid.a, productNotes: "RAHASIA-SUPPLIER", productionValue: 15000, productionUnit: "bungkus", stockQuantity: 12, images: [ownPhoto("k1")] })).id;
    pid.lama = (await mkProduct({ name: "Kerupuk Lama", status: "inactive", residentId: rid.a })).id;
    pid.dodol = (await mkProduct({ name: "Dodol Nenek", status: "pending", residentId: rid.b })).id;
    await mkProduct({ name: "Kategori: Kerajinan", subCategory: "Kerajinan", status: "inactive" });
    await prisma.potential.create({ data: { villageId: vA, category: "Pertanian", name: "Sawah Padi", description: "Bukan produk UKM", status: "active" } });
    pid.pk = (await mkProduct({ name: "Keripik Pisang", subCategory: "Makanan", status: "active", residentId: rid.p, images: [ownPhoto("k1")] })).id;
    pid.pl = (await mkProduct({ name: "Kerupuk Tua", status: "inactive", residentId: rid.p })).id;
    pid.vb = (await prisma.potential.create({ data: { villageId: vB, category: "UMKM", name: "Produk Desa Lain", description: "Desa lain", status: "active" } })).id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe("katalog", () => {
    it("hanya produk UKM tayang di desa sendiri; tanpa pending/inactive/placeholder kategori/non-UKM/desa lain", async () => {
      const { status, body } = await getCatalog("a");
      assert.equal(status, 200);
      assert.deepEqual(body.items.map((i: any) => i.name).sort(), ["Keripik Pisang", "Keripik Singkong", "Madu Desa"]);
    });

    it("tidak membocorkan status, catatan internal, atau data pribadi", async () => {
      const raw = JSON.stringify((await getCatalog("a")).body);
      assert.doesNotMatch(raw, /RAHASIA-SUPPLIER|"status"|nik|residentId/i);
    });

    it("nama penjual disamarkan, penanda 'mine', produk desa = Pengelola desa", async () => {
      const items = (await getCatalog("a")).body.items as any[];
      const k = items.find((i) => i.name === "Keripik Singkong");
      assert.deepEqual([k.seller, k.mine, k.price, k.unit], ["Siti A.", true, 15000, "bungkus"]);
      assert.equal(k.thumb, ownPhoto("k1"));
      const m = items.find((i) => i.name === "Madu Desa");
      assert.deepEqual([m.seller, m.mine], ["Pengelola desa", false]);
      const asB = ((await getCatalog("b")).body.items as any[]).find((i) => i.name === "Keripik Singkong");
      assert.equal(asB.mine, false);
    });

    it("kategori filter hanya dari produk tayang (kategori kosong buatan admin tidak muncul)", async () => {
      assert.deepEqual((await getCatalog("a")).body.categories, ["Makanan"]);
    });

    it("pencarian dan filter kategori", async () => {
      assert.deepEqual(((await getCatalog("a", "?q=kerip")).body.items as any[]).map((i) => i.name).sort(), ["Keripik Pisang", "Keripik Singkong"]);
      assert.deepEqual(((await getCatalog("a", "?q=singkong")).body.items as any[]).map((i) => i.name), ["Keripik Singkong"]);
      assert.equal(((await getCatalog("a", "?category=Makanan")).body.items as any[]).length, 3);
      assert.equal(((await getCatalog("a", "?category=Tidak%20Ada")).body.items as any[]).length, 0);
    });

    it("warga desa lain tidak melihat produk desa ini, dan sebaliknya", async () => {
      assert.deepEqual(((await getCatalog("vb")).body.items as any[]).map((i) => i.name), ["Produk Desa Lain"]);
    });

    it("tanpa token = 401", async () => {
      assert.equal((await json(await catalog.GET(req("/ukm", null)))).status, 401);
    });

    it("halaman: 20 per halaman, kursor tanpa tumpang tindih, kursor rusak diabaikan", async () => {
      await prisma.potential.createMany({
        data: Array.from({ length: 23 }, (_, i) => ({ villageId: vA, category: "UKM", name: `Massal ${String(i).padStart(2, "0")}`, description: "Deskripsi massal", status: "active" })),
      });
      const p1 = (await getCatalog("a")).body;
      assert.equal(p1.items.length, 20);
      assert.ok(p1.nextCursor);
      const p2 = (await getCatalog("a", `?cursor=${p1.nextCursor}`)).body;
      const ids1 = new Set(p1.items.map((i: any) => i.id));
      assert.ok(p2.items.every((i: any) => !ids1.has(i.id)), "tanpa duplikat antar halaman");
      assert.equal(p1.items.length + p2.items.length, 26, "3 produk tayang + 23 massal");
      assert.equal(p2.nextCursor, null);
      assert.equal((await getCatalog("a", "?cursor=1%20OR%201=1")).body.items.length, 20);
      await prisma.potential.deleteMany({ where: { villageId: vA, name: { startsWith: "Massal " } } });
    });
  });

  describe("produk saya", () => {
    it("semua status milik sendiri, tidak termasuk milik warga lain", async () => {
      const { status, body } = await json(await mine.GET(req("/ukm/mine", tok.a)));
      assert.equal(status, 200);
      const byName = Object.fromEntries(body.items.map((i: any) => [i.name, i]));
      assert.deepEqual(Object.keys(byName).sort(), ["Keripik Singkong", "Kerupuk Lama"]);
      assert.deepEqual([byName["Kerupuk Lama"].status, byName["Kerupuk Lama"].statusLabel], ["inactive", "Disembunyikan oleh desa"]);
      assert.deepEqual(body.limits, { maxProducts: 30, maxPhotos: 4, maxPerDay: 5 });
    });

    it("kategori formulir memuat kategori kosong buatan admin", async () => {
      const { body } = await json(await mine.GET(req("/ukm/mine", tok.a)));
      assert.deepEqual(body.categories, ["Kerajinan", "Makanan"]);
    });

    it("staf/tanpa token ditolak", async () => {
      assert.equal((await json(await mine.GET(req("/ukm/mine", null)))).status, 401);
    });
  });

  describe("detail", () => {
    it("pemilik melihat produk sendiri apa pun statusnya, lengkap dengan catatan dan hak ubah", async () => {
      const { status, body } = await getItem("a", pid.lama);
      assert.equal(status, 200);
      assert.deepEqual([body.mine, body.canEdit, body.canToggleVisible, body.status], [true, true, false, "inactive"]);
      assert.match(body.statusNote, /diajukan ulang/);
    });

    it("warga lain: produk tayang boleh dilihat, pending/inactive milik orang lain = 404", async () => {
      assert.equal((await getItem("b", pid.lama)).status, 404);
      assert.equal((await getItem("a", pid.dodol)).status, 404);
      const ok = await getItem("b", pid.keripik);
      assert.equal(ok.status, 200);
      assert.deepEqual([ok.body.mine, ok.body.canEdit, ok.body.statusNote, ok.body.sellerArea, ok.body.seller], [false, false, null, "Dusun Mawar", "Siti A."]);
      assert.doesNotMatch(JSON.stringify(ok.body), /RAHASIA-SUPPLIER|nik/i);
    });

    it("desa lain = 404 (tidak bocor lintas desa)", async () => {
      assert.equal((await getItem("vb", pid.keripik)).status, 404);
      assert.equal((await getItem("a", pid.vb)).status, 404);
    });

    it("id bukan angka/nol = 400", async () => {
      const res = await item.GET(req("/ukm/abc", tok.a), { params: Promise.resolve({ id: "abc" }) });
      assert.equal(res.status, 400);
    });
  });

  describe("tambah produk (POST)", () => {
    const valid = { name: "Dodol Durian", description: "Dodol durian asli, dimasak 6 jam.", price: 25000, unit: "bungkus", category: "Makanan", stock: 10, photos: [] as string[] };

    it("tanpa token = 401", async () => {
      assert.equal((await post(null, valid)).status, 401);
    });

    it("produk baru selalu pending dan milik pembuatnya; tidak tampil di katalog", async () => {
      const r = await post("a", { ...valid, photos: [ownPhoto("d1")] });
      assert.equal(r.status, 201);
      assert.equal(r.body.status, "pending");
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: r.body.id } });
      assert.deepEqual([row.status, row.residentId, row.villageId, row.category, row.subCategory], ["pending", rid.a, vA, "UMKM", "Makanan"]);
      assert.equal(Number(row.productionValue), 25000);
      assert.ok(!((await getCatalog("b")).body.items as any[]).some((i) => i.id === r.body.id));
      assert.ok(((await json(await mine.GET(req("/ukm/mine", tok.a)))).body.items as any[]).some((i) => i.id === r.body.id));
    });

    it("badan tak bisa mengubah pemilik, desa, atau status", async () => {
      const r = await post("a", { ...valid, name: "Coba Curang", residentId: rid.b, villageId: vB, status: "active" });
      assert.equal(r.status, 201);
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: r.body.id } });
      assert.deepEqual([row.residentId, row.villageId, row.status], [rid.a, vA, "pending"]);
    });

    it("mencatat jejak audit dan memberi tahu staf desa", async () => {
      const audit = await eventually(() => prisma.auditLog.findFirst({ where: { villageId: vA, entity: "ukm_products", action: "create" }, orderBy: { id: "desc" } }));
      assert.ok(audit, "ada audit create");
      assert.doesNotMatch(JSON.stringify(audit.changes), /Deskripsi|dimasak/);
      const notif = await eventually(() => prisma.userNotification.findFirst({ where: { villageId: vA, accountType: "staff", title: "Produk UKM baru dari warga" } }));
      assert.ok(notif, "staf desa dinotifikasi");
    });

    it("validasi: nama/deskripsi pendek, kategori di luar daftar, harga negatif, stok pecahan", async () => {
      for (const bad of [
        { ...valid, name: "ab" },
        { ...valid, description: "pendek" },
        { ...valid, category: "Buatan Sendiri" },
        { ...valid, price: -5 },
        { ...valid, stock: 1.5 },
      ]) assert.equal((await post("a", bad)).status, 400, JSON.stringify(bad).slice(0, 60));
    });

    it("foto: URL luar, desa lain, atau folder lain ditolak", async () => {
      for (const u of ["https://evil.example/x.jpg", `${CDN}/villages/LAIN/mobile-ukm/x.jpg`, `${CDN}/villages/${codeA}/mobile-reports/x.jpg`, `${CDN}/villages/${codeA}/mobile-ukm/../../x.jpg`]) {
        assert.equal((await post("a", { ...valid, photos: [u] })).status, 400, u);
      }
      assert.equal((await post("a", { ...valid, photos: Array.from({ length: 5 }, (_, i) => ownPhoto(`m${i}`)) })).status, 400);
    });

    it("batas produk baru per hari (5): yang ke-6 ditolak dengan pesan 'hari ini'", async () => {
      await prisma.potential.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({ villageId: vA, category: "UMKM", name: `Harian ${i}`, description: "Deskripsi harian", status: "pending", residentId: rid.q })),
      });
      const r = await post("q", valid);
      assert.equal(r.status, 429);
      assert.match(r.body.error.message, /hari ini/);
    });

    it("pembatas laju tulis: permintaan ke-21 dalam 10 menit = 429 dengan retryAfterSec", async () => {
      let r = { status: 0, body: {} as Record<string, any> };
      for (let i = 0; i < 21; i++) r = await patch("rl", pid.vb, {}); // 404/400 pun dihitung sebagai percobaan tulis
      assert.equal(r.status, 429);
      assert.ok(r.body.error.retryAfterSec > 0);
    });

    it("batas jumlah produk: 30 tidak-tersembunyi; produk tersembunyi tidak menghabiskan kuota", async () => {
      const old = new Date(Date.now() - 3 * 86_400_000);
      await prisma.potential.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({ villageId: vA, category: "UMKM", name: `Stok ${i}`, description: "Deskripsi stok", status: "active", residentId: rid.b, createdAt: old })),
      });
      const full = await post("b", { ...valid, name: "Produk ke-31" });
      assert.equal(full.status, 400);
      assert.match(full.body.error.message, /30 produk/);
      // b sudah punya 1 produk lain (Dodol, pending) + 30 baru = 31. Sembunyikan 2 => 29 < 30.
      await prisma.potential.updateMany({ where: { residentId: rid.b, name: { in: ["Stok 0", "Stok 1"] } }, data: { status: "hidden" } });
      assert.equal((await post("b", { ...valid, name: "Produk ke-31" })).status, 201);
    });
  });

  describe("ubah produk (PATCH)", () => {
    it("hanya pemilik: produk warga lain, produk desa, dan lintas desa = 404", async () => {
      assert.equal((await patch("b", pid.pk, { name: "Diambil alih" })).status, 404);
      assert.equal((await patch("p", pid.admin, { name: "Diambil alih" })).status, 404);
      assert.equal((await patch("vb", pid.pk, { name: "Diambil alih" })).status, 404);
      assert.equal((await prisma.potential.findUniqueOrThrow({ where: { id: pid.pk } })).name, "Keripik Pisang");
    });

    it("tanpa perubahan atau 'visible' bukan boolean = 400", async () => {
      assert.equal((await patch("p", pid.pk, {})).status, 400);
      assert.equal((await patch("p", pid.pk, { visible: "ya" })).status, 400);
      assert.equal((await patch("p", pid.pk, { visible: true })).status, 400, "sudah tayang: tidak ada yang berubah");
    });

    it("memperbaiki produk yang sudah tayang langsung berlaku dan tetap tayang", async () => {
      const r = await patch("p", pid.pk, { name: "Keripik Singkong Pedas", price: 17500, stock: 8, unit: "pak", category: null });
      assert.equal(r.status, 200);
      assert.equal(r.body.status, "active");
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: pid.pk } });
      assert.deepEqual([row.name, Number(row.productionValue), row.stockQuantity, row.productionUnit, row.subCategory], ["Keripik Singkong Pedas", 17500, 8, "pak", null]);
    });

    it("bidang yang tidak dikirim tidak berubah (PATCH sebagian)", async () => {
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: pid.pk } });
      assert.equal(row.description, "Deskripsi produk contoh");
      assert.deepEqual(row.images, [ownPhoto("k1")]);
    });

    it("pemilik bisa menyembunyikan lalu menayangkan kembali produknya", async () => {
      assert.deepEqual((await patch("p", pid.pk, { visible: false })).body.status, "hidden");
      assert.equal(await statusOf(pid.pk), "hidden");
      assert.ok(!((await getCatalog("b")).body.items as any[]).some((i) => i.id === pid.pk), "tersembunyi dari katalog");
      assert.equal((await getItem("p", pid.pk)).status, 200, "pemilik tetap melihatnya");
      assert.deepEqual((await patch("p", pid.pk, { visible: true })).body.status, "active");
    });

    it("produk yang ditutup desa tidak bisa ditayangkan sendiri, tetapi diperbaiki = diajukan ulang", async () => {
      assert.equal((await patch("p", pid.pl, { visible: true })).status, 400);
      assert.equal(await statusOf(pid.pl), "inactive");
      const r = await patch("p", pid.pl, { description: "Sudah diperbaiki, kini sesuai aturan desa." });
      assert.equal(r.status, 200);
      assert.equal(r.body.status, "pending");
      const notif = await eventually(() => prisma.userNotification.findFirst({ where: { villageId: vA, accountType: "staff", title: "Produk UKM diajukan ulang" } }));
      assert.ok(notif);
    });

    it("produk menunggu persetujuan tidak bisa ditayangkan sendiri; diedit tetap pending", async () => {
      assert.equal((await patch("p", pid.pl, { visible: true })).status, 400);
      assert.equal((await patch("p", pid.pl, { name: "Kerupuk Baru" })).body.status, "pending");
    });

    it("validasi tetap berlaku pada PATCH; foto lama (mis. unggahan web) boleh dipertahankan", async () => {
      assert.equal((await patch("p", pid.pk, { name: "x" })).status, 400);
      assert.equal((await patch("p", pid.pk, { category: "Tidak Ada" })).status, 400);
      const web = `${CDN}/villages/${codeA}/ukm/foto-web.jpg`;
      await prisma.potential.update({ where: { id: pid.pk }, data: { images: [web] } });
      assert.equal((await patch("p", pid.pk, { photos: [web, ownPhoto("baru")] })).status, 200);
      assert.deepEqual((await prisma.potential.findUniqueOrThrow({ where: { id: pid.pk } })).images, [web, ownPhoto("baru")]);
      assert.equal((await patch("p", pid.pk, { photos: [`${CDN}/villages/${codeA}/ukm/lain.jpg`] })).status, 400, "URL web yang bukan miliknya ditolak");
    });
  });

  describe("persetujuan produk warga bersifat opsional (pengaturan desa)", () => {
    let vC = 0;
    let settings: typeof import("../lib/mobile/ukm-logic");
    const staffNotifs = () => prisma.userNotification.count({ where: { villageId: vC, accountType: "staff", title: "Produk UKM baru dari warga" } });
    const setModeration = async (moderation: boolean) => {
      const row = await prisma.village.findUniqueOrThrow({ where: { id: vC }, select: { settings: true } });
      await prisma.village.update({ where: { id: vC }, data: { settings: settings.mergeUkmSettings(row.settings, { moderation }) as never } });
    };
    const newProduct = (who: string, name: string) => post(who, { name, description: "Produk contoh untuk uji persetujuan." });

    before(async () => {
      settings = await import("../lib/mobile/ukm-logic");
      vC = (await prisma.village.create({ data: { code: `UC${t}`, name: "UC", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000), settings: { wilayah: { kode_provinsi: "33" } } } })).id;
      // Staf desa C: tanpa penerima, uji "diberi tahu / tidak diberi tahu" tidak berarti apa-apa.
      await prisma.user.create({ data: { villageId: vC, email: `admin-c${t}@ukm.test`, password: "x", name: "Admin C", role: "admin" } });
      for (const [key, name] of [["m1", "Penjual Satu"], ["m2", "Penjual Dua"]] as const) {
        const r = await prisma.resident.create({ data: { villageId: vC, nik: `33003${t}${key}`.padEnd(16, "0").slice(0, 16), name, birthplace: "x", birthDate: new Date("1985-01-01"), gender: "Perempuan", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga" } });
        rid[key] = r.id;
        const acc = await prisma.citizenAccount.create({ data: { villageId: vC, residentId: r.id, username: `ukm${t}${key}`, passwordHash: "x", status: "ACTIVE" } });
        tok[key] = sign({ t: "citizen", id: acc.id, villageId: vC, role: "citizen" });
      }
    });

    it("tanpa pengaturan: bawaan memeriksa dulu (pending) dan staf diberi tahu", async () => {
      assert.equal((await json(await mine.GET(req("/ukm/mine", tok.m1)))).body.moderation, true);
      const r = await newProduct("m1", "Produk Bawaan");
      assert.deepEqual([r.status, r.body.status], [201, "pending"]);
      assert.ok(await eventually(async () => ((await staffNotifs()) > 0 ? true : null)));
      assert.equal((await getCatalog("m2")).body.items.length, 0, "belum tayang di katalog");
    });

    it("persetujuan dimatikan: produk baru langsung tayang, tampil di katalog warga lain, staf tidak dibebani", async () => {
      await setModeration(false);
      const before = await staffNotifs();
      assert.equal((await json(await mine.GET(req("/ukm/mine", tok.m1)))).body.moderation, false);
      const r = await newProduct("m1", "Produk Langsung Tayang");
      assert.deepEqual([r.status, r.body.status], [201, "active"]);
      assert.equal(await statusOf(r.body.id), "active");
      assert.deepEqual((await getCatalog("m2")).body.items.map((i: any) => i.name), ["Produk Langsung Tayang"]);
      await new Promise((res) => setTimeout(res, 300));
      assert.equal(await staffNotifs(), before, "tidak ada notifikasi 'perlu diperiksa'");
    });

    it("pengaturan lain di villages.settings tidak hilang saat menyimpan", async () => {
      const row = await prisma.village.findUniqueOrThrow({ where: { id: vC }, select: { settings: true } });
      assert.deepEqual(row.settings, { wilayah: { kode_provinsi: "33" }, ukm: { moderation: false } });
    });

    it("produk yang sengaja ditutup admin tetap harus diajukan ulang walau persetujuan mati", async () => {
      const p = await prisma.potential.create({ data: { villageId: vC, category: "UMKM", name: "Ditutup Admin", description: "Ditutup oleh admin desa.", status: "inactive", residentId: rid.m1 } });
      const r = await patch("m1", p.id, { name: "Ditutup Admin (diperbaiki)" });
      assert.deepEqual([r.status, r.body.status], [200, "pending"]);
    });

    it("persetujuan dinyalakan lagi: produk baru kembali pending", async () => {
      await setModeration(true);
      assert.equal((await json(await mine.GET(req("/ukm/mine", tok.m1)))).body.moderation, true);
      assert.equal((await newProduct("m1", "Produk Setelah Dinyalakan")).body.status, "pending");
    });

    it("pengaturan tiap desa terpisah", async () => {
      await setModeration(false);
      assert.equal((await json(await mine.GET(req("/ukm/mine", tok.a)))).body.moderation, true, "desa A tidak ikut berubah");
    });
  });

  describe("kontak penjual: pemilik yang memilih", () => {
    const PHONE = "081234567890";
    const create = (body: Record<string, unknown> = {}) => post("c1", { name: "Sambal Roa", description: "Sambal roa pedas khas desa kami.", ...body });
    const asActive = async (id: number) => { await prisma.potential.update({ where: { id }, data: { status: "active" } }); };

    before(async () => {
      const r = await prisma.resident.create({ data: { villageId: vA, nik: `33004${t}`.padEnd(16, "0").slice(0, 16), name: "Rina Kontak", birthplace: "x", birthDate: new Date("1985-01-01"), gender: "Perempuan", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", phone: "085500000000" } });
      rid.c1 = r.id;
      const acc = await prisma.citizenAccount.create({ data: { villageId: vA, residentId: r.id, username: `ukm${t}c1`, passwordHash: "x", status: "ACTIVE" } });
      tok.c1 = sign({ t: "citizen", id: acc.id, villageId: vA, role: "citizen" });
    });

    it("bawaan: tanpa kontak; nomor terdaftar warga TIDAK dipakai dan tidak bocor", async () => {
      const r = await create();
      assert.equal(r.status, 201);
      pid.c0 = r.body.id;
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: pid.c0 } });
      assert.deepEqual([row.contactPhone, row.contactVisible], [null, false]);
      await asActive(pid.c0);
      const d = (await getItem("b", pid.c0)).body;
      assert.deepEqual([d.contactPhone, d.showContact], [null, false]);
      assert.doesNotMatch(JSON.stringify(d), /085500000000/);
    });

    it("pemilik menampilkan kontak: warga lain melihat nomor hanya setelah produk tayang", async () => {
      const r = await create({ name: "Sambal Tampil", contactPhone: "0812-3456-7890", showContact: true });
      assert.equal(r.status, 201);
      pid.c1 = r.body.id;
      assert.equal((await getItem("b", pid.c1)).status, 404, "pending: belum terlihat siapa pun selain pemilik");
      const own = (await getItem("c1", pid.c1)).body;
      assert.deepEqual([own.contactPhone, own.showContact], [PHONE, true]);
      await asActive(pid.c1);
      const other = (await getItem("b", pid.c1)).body;
      assert.deepEqual([other.contactPhone, other.showContact], [PHONE, false], "orang lain: nomor ya, pilihan pemilik tidak dibocorkan");
    });

    it("pemilik menyimpan nomor tetapi tidak menampilkannya: orang lain tidak melihat apa pun, pemilik tetap melihat", async () => {
      const r = await create({ name: "Sambal Privat", contactPhone: PHONE, showContact: false });
      pid.c2 = r.body.id;
      await asActive(pid.c2);
      assert.deepEqual([(await getItem("b", pid.c2)).body.contactPhone, (await getItem("b", pid.c2)).body.showContact], [null, false]);
      const own = (await getItem("c1", pid.c2)).body;
      assert.deepEqual([own.contactPhone, own.showContact], [PHONE, false]);
    });

    it("mengubah pilihan saja (PATCH) berhasil dan tidak mengubah status", async () => {
      const on = await patch("c1", pid.c2, { showContact: true });
      assert.deepEqual([on.status, on.body.status], [200, "active"]);
      assert.equal((await getItem("b", pid.c2)).body.contactPhone, PHONE);
      const off = await patch("c1", pid.c2, { showContact: false });
      assert.equal(off.status, 200);
      assert.equal((await getItem("b", pid.c2)).body.contactPhone, null);
      assert.equal((await patch("c1", pid.c2, { showContact: false })).status, 400, "tanpa perubahan = ditolak, bukan diam-diam sukses");
    });

    it("menghapus nomor otomatis mematikan tampil", async () => {
      await patch("c1", pid.c2, { showContact: true });
      const r = await patch("c1", pid.c2, { contactPhone: null });
      assert.equal(r.status, 200);
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: pid.c2 } });
      assert.deepEqual([row.contactPhone, row.contactVisible], [null, false]);
    });

    it("validasi: tampil tanpa nomor, nomor tidak valid, tipe salah", async () => {
      assert.equal((await create({ name: "Tanpa Nomor", showContact: true })).status, 400);
      assert.equal((await create({ name: "Nomor Jelek", contactPhone: "abc123" })).status, 400);
      assert.equal((await create({ name: "Tipe Salah", contactPhone: PHONE, showContact: "ya" })).status, 400);
      assert.equal((await patch("c1", pid.c2, { showContact: true })).status, 400, "nomor sudah dihapus: tidak bisa ditampilkan");
      assert.equal((await patch("c1", pid.c2, { contactPhone: 81234567890 })).status, 400);
    });

    it("produk disembunyikan pemilik atau ditutup admin: nomor tidak terlihat orang lain", async () => {
      await patch("c1", pid.c1, { visible: false });
      assert.equal((await getItem("b", pid.c1)).status, 404);
      await patch("c1", pid.c1, { visible: true });
      await prisma.potential.update({ where: { id: pid.c1 }, data: { status: "inactive" } });
      assert.equal((await getItem("b", pid.c1)).status, 404);
    });

    it("daftar katalog dan 'milik saya' tidak pernah memuat nomor", async () => {
      await asActive(pid.c1);
      const cat = JSON.stringify((await getCatalog("b")).body);
      const mineList = JSON.stringify((await json(await mine.GET(req("/ukm/mine", tok.c1)))).body);
      assert.doesNotMatch(cat + mineList, /contactPhone|showContact|081234567890/);
    });

    it("tidak masuk API publik v1 dan dibaca-saja di serializer admin web", async () => {
      const views = await import("../lib/api-v1/views");
      assert.ok(!("contactPhone" in views.POTENTIAL_SELECT) && !("contactVisible" in views.POTENTIAL_SELECT));
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: pid.c1 }, select: serialize.ukmProductSelect });
      assert.deepEqual(serialize.toUkmProduct(row).contact, { phone: PHONE, visible: true });
      const none = await prisma.potential.findUniqueOrThrow({ where: { id: pid.c0 }, select: serialize.ukmProductSelect });
      assert.equal(serialize.toUkmProduct(none).contact, null);
    });
  });

  describe("sisi web (admin)", () => {
    it("serializer admin menampilkan pemilik dengan 4 digit NIK saja", async () => {
      const row = await prisma.potential.findUniqueOrThrow({ where: { id: pid.keripik }, select: serialize.ukmProductSelect });
      const p = serialize.toUkmProduct(row);
      assert.deepEqual(p.owner, { id: rid.a, name: "SITI AMINAH PUTRI", nikLast4: (await prisma.resident.findUniqueOrThrow({ where: { id: rid.a } })).nik.slice(-4) });
      assert.doesNotMatch(JSON.stringify(p), /\d{16}/, "tidak ada NIK utuh");
      const admin = serialize.toUkmProduct(await prisma.potential.findUniqueOrThrow({ where: { id: pid.admin }, select: serialize.ukmProductSelect }));
      assert.equal(admin.owner, null);
    });

    it("resolveUkmOwner: warga desa ini boleh; desa lain, sudah meninggal, atau tak ada ditolak; null melepas tautan", async () => {
      assert.deepEqual(await owner.resolveUkmOwner(vA, rid.b), { ok: true, residentId: rid.b });
      assert.deepEqual(await owner.resolveUkmOwner(vA, String(rid.b)), { ok: true, residentId: rid.b });
      assert.deepEqual(await owner.resolveUkmOwner(vA, null), { ok: true, residentId: null });
      for (const bad of [rid.vb, rid.dead, 99_999_999, "abc", -1, 1.5]) {
        const r = await owner.resolveUkmOwner(vA, bad);
        assert.equal(r.ok, false, String(bad));
      }
    });

    it("notifyUkmOwner mengirim notifikasi dengan deep link ke produk, hanya ke akun warga yang sesuai", async () => {
      await owner.notifyUkmOwner(vA, rid.a, { id: pid.keripik, name: "Keripik" }, "active");
      const acc = await prisma.citizenAccount.findUniqueOrThrow({ where: { residentId: rid.a } });
      const n = await prisma.userNotification.findFirst({ where: { accountType: "citizen", accountId: acc.id, title: "Produk Anda sudah tayang" } });
      assert.ok(n);
      assert.equal(n.deepLink, `/ukm/${pid.keripik}`);
      // desa tidak cocok => diam saja, tidak melempar
      await owner.notifyUkmOwner(vB, rid.a, { id: 1, name: "X" }, "inactive");
      assert.equal(await prisma.userNotification.count({ where: { accountId: acc.id, title: "Produk Anda disembunyikan desa" } }), 0);
    });

    it("menghapus warga pemilik tidak menghapus produknya (ON DELETE SET NULL)", async () => {
      const tmp = await prisma.resident.create({ data: { villageId: vA, nik: `33009${t}`.padEnd(16, "0").slice(0, 16), name: "Sementara", birthplace: "x", birthDate: new Date("1990-01-01"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga" } });
      const p = await mkProduct({ name: "Produk Sementara", residentId: tmp.id });
      await prisma.resident.delete({ where: { id: tmp.id } });
      const after = await prisma.potential.findUniqueOrThrow({ where: { id: p.id } });
      assert.equal(after.residentId, null);
    });
  });
});
