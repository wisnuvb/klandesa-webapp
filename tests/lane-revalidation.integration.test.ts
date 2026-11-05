/**
 * Sesi platform/regional/mitra dibaca ulang dari DB pada setiap request (audit 2026-11-05): JWT 30 hari tidak boleh
 * mempertahankan akses akun yang sudah dinonaktifkan/diturunkan/dipersempit. Handler asli + MySQL sungguhan;
 * butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Revalidasi sesi lane platform/regional/mitra (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let adminPartners: typeof import("../app/api/admin/partners/route");
  let regionalSummary: typeof import("../app/api/regional/summary/route");
  let partnerCommissions: typeof import("../app/api/partner/commissions/route");
  let encode: typeof import("next-auth/jwt").encode;
  const SECRET = "uji-rahasia-lane-0123456789abcdef";
  const t = Date.now() % 1e6;
  let ipN = 0;

  const cookie = (token: Record<string, unknown>) => encode({ secret: SECRET, token });
  const get = (h: (r: NextRequest) => Promise<Response>, path: string, c: string) =>
    h(new NextRequest(`http://localhost${path}`, { headers: { cookie: `next-auth.session-token=${c}`, "x-real-ip": `10.8.${t % 250}.${++ipN}` } }));

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ encode } = await import("next-auth/jwt"));
    adminPartners = await import("../app/api/admin/partners/route");
    regionalSummary = await import("../app/api/regional/summary/route");
    partnerCommissions = await import("../app/api/partner/commissions/route");
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe("platform", () => {
    it("admin aktif lolos; dinonaktifkan -> 401 walau JWT masih sah; diturunkan ke support -> 403", async () => {
      const u = await prisma.platformUser.create({ data: { email: `plat${t}@uji.test`, password: "x", name: "P", role: "platform_admin" } });
      const c = await cookie({ sub: `pl:${u.id}`, id: `pl:${u.id}`, accountType: "platform", role: "platform_admin", email: u.email, name: "P" });
      assert.equal((await get(adminPartners.GET, "/api/admin/partners", c)).status, 200);

      await prisma.platformUser.update({ where: { id: u.id }, data: { role: "platform_support" } });
      assert.equal((await get(adminPartners.GET, "/api/admin/partners", c)).status, 403, "role dari DB (JWT masih bilang admin)");

      await prisma.platformUser.update({ where: { id: u.id }, data: { role: "platform_admin", isActive: false } });
      assert.equal((await get(adminPartners.GET, "/api/admin/partners", c)).status, 401);

      await prisma.platformUser.delete({ where: { id: u.id } });
      assert.equal((await get(adminPartners.GET, "/api/admin/partners", c)).status, 401, "akun terhapus");
    });
  });

  describe("regional", () => {
    const scopeOf = async (res: Response) => (await res.json()).scope as { level: string; regency: string };

    it("aktif lolos dengan lingkup dari DB; lingkup dipersempit/diganti berlaku segera; nonaktif -> 403", async () => {
      const u = await prisma.regionalUser.create({
        data: { email: `reg${t}@uji.test`, password: "x", name: "R", role: "regional_kabupaten", scopeRegency: "Kab Lama", scopeProvince: "Prov" },
      });
      // JWT membawa lingkup LAMA yang sengaja berbeda dari DB.
      const c = await cookie({
        sub: `rg:${u.id}`, id: `rg:${u.id}`, accountType: "regional", role: "regional_kabupaten", email: u.email, name: "R",
        regionalScope: { level: "REGENCY", regency: "Kab Dari JWT" },
      });
      const first = await get(regionalSummary.GET, "/api/regional/summary", c);
      assert.equal(first.status, 200, JSON.stringify(await first.clone().json()));
      assert.equal((await scopeOf(first)).regency, "Kab Lama", "lingkup dibaca dari DB, bukan JWT");

      await prisma.regionalUser.update({ where: { id: u.id }, data: { scopeRegency: "Kab Baru" } });
      assert.equal((await scopeOf(await get(regionalSummary.GET, "/api/regional/summary", c))).regency, "Kab Baru");

      await prisma.regionalUser.update({ where: { id: u.id }, data: { isActive: false } });
      assert.equal((await get(regionalSummary.GET, "/api/regional/summary", c)).status, 403);
    });

    it("role di DB bukan role regional -> ditolak", async () => {
      const u = await prisma.regionalUser.create({
        data: { email: `reg2${t}@uji.test`, password: "x", name: "R2", role: "regional_kabupaten", scopeRegency: "Kab" },
      });
      const c = await cookie({
        sub: `rg:${u.id}`, id: `rg:${u.id}`, accountType: "regional", role: "regional_kabupaten", email: u.email, name: "R2",
        regionalScope: { level: "REGENCY", regency: "Kab" },
      });
      assert.equal((await get(regionalSummary.GET, "/api/regional/summary", c)).status, 200);
      await prisma.regionalUser.update({ where: { id: u.id }, data: { role: "sembarang" } });
      assert.equal((await get(regionalSummary.GET, "/api/regional/summary", c)).status, 403);
    });
  });

  describe("mitra", () => {
    it("Partner aktif lolos; ditangguhkan -> 401; terhapus -> 401", async () => {
      const p = await prisma.partner.create({ data: { email: `mitra${t}@uji.test`, password: "x", name: "M", status: "active" } });
      const c = await cookie({ sub: `pt:${p.id}`, id: `pt:${p.id}`, accountType: "partner", role: "partner", email: p.email, name: "M" });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 200);
      await prisma.partner.update({ where: { id: p.id }, data: { status: "suspended" } });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 401);
      await prisma.partner.delete({ where: { id: p.id } });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 401);
    });

    it("akun desa dengan mitra tertaut: lolos selama akun desa aktif & tautan email berlaku; gugur bila nonaktif/mitra ditangguhkan/tautan putus", async () => {
      const village = await prisma.village.create({ data: { code: `LM${t}`, name: "Desa LM", district: "k", regency: "r", province: "p", address: "a" } });
      const email = `tertaut${t}@uji.test`;
      const p = await prisma.partner.create({ data: { email, password: "x", name: "M2", status: "active" } });
      const u = await prisma.user.create({ data: { villageId: village.id, email, password: "x", name: "U", role: "admin", isActive: true } });
      const c = await cookie({
        sub: String(u.id), id: String(u.id), accountType: "village", role: "admin", villageId: village.id, villageCode: village.code,
        email, name: "U", partnerId: p.id,
      });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 200);

      await prisma.partner.update({ where: { id: p.id }, data: { status: "suspended" } });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 401, "mitra ditangguhkan -> tautan tidak berlaku");
      await prisma.partner.update({ where: { id: p.id }, data: { status: "active" } });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 200);

      await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: 1 } });
      const cOld = await cookie({
        sub: String(u.id), id: String(u.id), accountType: "village", role: "admin", villageId: village.id, villageCode: village.code,
        email, name: "U", partnerId: p.id, sv: 0,
      });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", cOld)).status, 401, "sesi lama setelah ganti sandi");
      await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: 0, isActive: false } });
      assert.equal((await get(partnerCommissions.GET, "/api/partner/commissions", c)).status, 401, "akun desa nonaktif");
    });
  });
});
