/**
 * Tes integrasi GET /api/account/permissions (sesi JWT nyata, MySQL sementara). Endpoint ini menggantikan izin yang dulu
 * dititipkan layout server: harus mengembalikan role & penyesuaian DARI DB (bukan JWT), hanya milik pemanggil,
 * tetap terbaca saat langganan berakhir, dan menolak tanpa sesi / akun nonaktif. Butuh KEP_TEST_DATABASE_URL.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("GET /api/account/permissions (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let route: typeof import("../app/api/account/permissions/route");
  let NextRequest: typeof import("next/server").NextRequest;
  const SECRET = "uji-rahasia-izin-0123456789abcdef";
  const cookies: Record<string, string> = {};
  const ids: Record<string, number> = {};
  let villageId = 0;
  let expiredVillageId = 0;

  const get = (who: string | null) =>
    route.GET(new NextRequest("http://localhost/api/account/permissions", { headers: who ? { cookie: `next-auth.session-token=${cookies[who]}` } : {} }));

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    route = await import("../app/api/account/permissions/route");
    const { encode } = await import("next-auth/jwt");
    const t = Date.now() % 1e6;
    const mkV = (c: string, extra: Record<string, unknown> = {}) =>
      prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a", ...extra } });
    const v = await mkV("I");
    const vx = await mkV("X", { subscriptionStatus: "inactive", subscriptionExpiry: new Date(Date.now() - 86_400_000) });
    villageId = v.id;
    expiredVillageId = vx.id;

    const mk = async (key: string, vid: number, role: string, overrides: unknown, isActive = true, jwtRole = role) => {
      const u = await prisma.user.create({
        data: { villageId: vid, email: `${key}${t}@uji.test`, password: "x", name: key, role, isActive, ...(overrides ? { permissionOverrides: overrides as object } : {}) },
      });
      ids[key] = u.id;
      const code = vid === villageId ? v.code : vx.code;
      cookies[key] = await encode({
        secret: SECRET,
        token: { sub: String(u.id), id: String(u.id), role: jwtRole, villageId: vid, villageCode: code, accountType: "village", name: key, email: u.email },
      });
    };
    await mk("admin", villageId, "admin", null);
    await mk("staf", villageId, "staff", { deny: { ukm: ["read"] } });
    await mk("nonaktif", villageId, "staff", null, false);
    await mk("kedaluwarsa", expiredVillageId, "admin", null);
    // JWT lama masih bilang "admin" padahal di DB sudah diturunkan jadi staf: DB yang berlaku.
    await mk("diturunkan", villageId, "staff", null, true, "admin");
  });
  after(async () => {
    await prisma.village.deleteMany({ where: { id: { in: [villageId, expiredVillageId] } } });
    await prisma.$disconnect();
  });

  it("mengembalikan role & penyesuaian akun dari DB, tidak di-cache", async () => {
    const r = await get("staf");
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { role: "staff", permissionOverrides: { deny: { ukm: ["read"] } } });
    assert.match(r.headers.get("cache-control") ?? "", /no-store/);
    const a = await (await get("admin")).json();
    assert.deepEqual(a, { role: "admin", permissionOverrides: null });
  });

  it("role dari DB, bukan JWT: akun yang diturunkan tidak lagi terlihat sebagai admin", async () => {
    assert.equal((await (await get("diturunkan")).json()).role, "staff");
  });

  it("tanpa sesi 401; akun nonaktif 403", async () => {
    assert.equal((await get(null)).status, 401);
    assert.equal((await get("nonaktif")).status, 403);
  });

  it("tetap terbaca saat langganan desa berakhir (pengecualian langganan)", async () => {
    const r = await get("kedaluwarsa");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).role, "admin");
  });
});
