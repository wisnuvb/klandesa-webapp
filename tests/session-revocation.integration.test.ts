/** Pencabutan sesi web saat kata sandi berubah, dengan cookie NextAuth sungguhan + handler asli. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pencabutan sesi web saat kata sandi berubah (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let perms: typeof import("../app/api/account/permissions/route");
  let pw: typeof import("../app/api/account/password/route");
  let setPw: typeof import("../app/api/auth/atur-sandi/route");
  let svc: typeof import("../lib/rbac/accounts");
  let links: typeof import("../lib/rbac/access-links");
  let vA = 0;
  const t = Date.now() % 1e6;
  const SECRET = "__dev_only_nextauth_secret_min_32_chars_static__";

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.NEXTAUTH_URL = "http://localhost:2042";
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    ({ prisma } = await import("../lib/prisma"));
    perms = await import("../app/api/account/permissions/route");
    pw = await import("../app/api/account/password/route");
    setPw = await import("../app/api/auth/atur-sandi/route");
    svc = await import("../lib/rbac/accounts");
    links = await import("../lib/rbac/access-links");
    vA = (await prisma.village.create({ data: { code: `SV${t}`, name: "SV", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
  });
  after(async () => {
    if (vA) await prisma.village.delete({ where: { id: vA } });
    await prisma.$disconnect();
  });

  const mkUser = async (email: string, password = "x", role = "admin") => prisma.user.create({ data: { villageId: vA, email, password, name: "Budi", role } });

  /** Cookie sesi persis seperti yang diterbitkan NextAuth saat login (JWT terenkripsi). `sv` kosong = cookie lama sebelum fitur ini. */
  const cookie = async (u: { id: number; email: string; role: string }, sv?: number) =>
    `next-auth.session-token=${await encode({ secret: SECRET, token: { id: String(u.id), email: u.email, name: "Budi", role: u.role, accountType: "village", villageId: vA, ...(sv === undefined ? {} : { sv }) } })}`;
  const get = async (u: { id: number; email: string; role: string }, sv?: number) =>
    perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: await cookie(u, sv) } }));
  const body = async (r: Response) => (await r.json()) as { code?: string; role?: string };

  it("dasar: cookie dengan sv sesuai atau cookie lama tanpa sv diterima selama kata sandi belum berubah (tak ada yang terkeluar saat rilis)", async () => {
    const u = await mkUser(`a${t}@a.id`);
    assert.equal((await get(u, 0)).status, 200);
    assert.equal((await get(u)).status, 200, "cookie lama tanpa sv dianggap 0");
  });

  it("kata sandi berubah -> cookie lama ditolak 401 SESSION_REVOKED (termasuk yang ditandatangani ulang NextAuth), cookie hasil login baru diterima", async () => {
    const u = await mkUser(`b${t}@a.id`);
    const stolen = await cookie(u, 0);
    await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 } } });
    for (const sv of [0, undefined, 2]) {
      const r = await get(u, sv);
      assert.equal(r.status, 401, `sv=${sv}`);
      assert.equal((await body(r)).code, "SESSION_REVOKED");
    }
    // NextAuth menerbitkan ulang cookie (iat baru) tiap sesi dibaca: klaim sv tetap lama, jadi tetap ditolak. Tidak bergantung pada iat.
    const reissued = `next-auth.session-token=${await encode({ secret: SECRET, token: { id: String(u.id), email: u.email, role: u.role, accountType: "village", villageId: vA, sv: 0 } })}`;
    assert.notEqual(reissued, stolen);
    assert.equal((await perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: reissued } }))).status, 401);
    const fresh = await get(u, 1);
    assert.equal(fresh.status, 200);
    assert.equal((await body(fresh)).role, "admin");
  });

  it("ganti sandi sendiri (/api/account/password): berhasil, versi naik, cookie yang sama langsung tidak sah", async () => {
    const { hashPassword } = await import("../lib/auth");
    const u = await mkUser(`c${t}@a.id`, await hashPassword("Lama12345"));
    const c = await cookie(u, 0);
    const res = await pw.POST(new NextRequest("http://localhost/api/account/password", { method: "POST", headers: { cookie: c, "content-type": "application/json", "x-real-ip": `10.5.${t % 250}.1` }, body: JSON.stringify({ currentPassword: "Lama12345", newPassword: "Baru12345" }) }));
    assert.equal(res.status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).sessionVersion, 1);
    const after = await perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: c } }));
    assert.equal(after.status, 401);
    // Percobaan dengan sandi lama yang salah tidak menaikkan versi.
    const u2 = await mkUser(`c2${t}@a.id`, await hashPassword("Lama12345"));
    const bad = await pw.POST(new NextRequest("http://localhost/api/account/password", { method: "POST", headers: { cookie: await cookie(u2, 0), "content-type": "application/json", "x-real-ip": `10.6.${t % 250}.1` }, body: JSON.stringify({ currentPassword: "Salah12345", newPassword: "Baru12345" }) }));
    assert.equal(bad.status, 400);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u2.id } })).sessionVersion, 0);
  });

  it("reset oleh admin menaikkan versi (sesi web target mati seketika); reset akun lain tidak menyentuh akun berbeda", async () => {
    const admin = await mkUser(`d-admin${t}@a.id`);
    const target = await mkUser(`d${t}@a.id`, "x", "staff");
    const other = await mkUser(`d2${t}@a.id`, "x", "staff");
    const r = await svc.updateAccount(prisma, { villageId: vA, actorUserId: admin.id, targetUserId: target.id, resetPassword: true });
    assert.ok(r.ok);
    assert.equal((await get(target, 0)).status, 401);
    assert.equal((await get(other, 0)).status, 200, "akun lain tidak terpengaruh");
    assert.equal((await get(admin, 0)).status, 200);
  });

  it("atur kata sandi lewat tautan email menaikkan versi (pencuri tak bertahan setelah korban memulihkan akun)", async () => {
    const u = await mkUser(`e${t}@a.id`, "x", "staff");
    const stolen = await cookie(u, 0);
    assert.equal((await perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: stolen } }))).status, 200);
    const { token } = await links.issueAuthToken(prisma, { userId: u.id, purpose: "RESET", ttlMs: 60_000 });
    const res = await setPw.POST(new NextRequest("http://localhost/api/auth/atur-sandi", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": `10.7.${t % 250}.1` }, body: JSON.stringify({ token, password: "Pulih12345" }) }));
    assert.equal(res.status, 200);
    assert.equal((await perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: stolen } }))).status, 401);
    assert.equal((await get(u, 1)).status, 200, "login baru (sv=1) diterima");
  });

  it("rantai login: rute login mengembalikan versi akun -> callback jwt mencatat sv -> callback session meneruskannya; akun non-desa membawa versi tabelnya", async () => {
    const { hashPassword } = await import("../lib/auth");
    const { authOptions } = await import("../auth");
    const login = await import("../app/api/auth/login/route");
    const u = await mkUser(`g${t}@a.id`, await hashPassword("Masuk12345"), "staff");
    await prisma.user.update({ where: { id: u.id }, data: { sessionVersion: 3 } });
    const res = await login.POST(new NextRequest("http://localhost/api/auth/login", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": `10.8.${t % 250}.1` }, body: JSON.stringify({ email: u.email, password: "Masuk12345" }) }));
    assert.equal(res.status, 200);
    const data = (await res.json()) as { user: { sessionVersion: number } };
    assert.equal(data.user.sessionVersion, 3);

    // Yang dikembalikan authorize() untuk akun desa (lihat auth.ts) -> callback jwt/session NextAuth.
    const authUser = { id: String(u.id), name: "Budi", email: u.email, role: "staff", accountType: "village", sessionVersion: data.user.sessionVersion };
    const jwt = await authOptions.callbacks!.jwt!({ token: {}, user: authUser as never, account: null, trigger: "signIn" } as never);
    assert.equal(jwt.sv, 3);
    // Pembaruan token berikutnya (tanpa `user`) tidak boleh mengubah sv.
    const refreshed = await authOptions.callbacks!.jwt!({ token: { ...jwt }, trigger: "update" } as never);
    assert.equal(refreshed.sv, 3);
    const session = await authOptions.callbacks!.session!({ session: { user: {}, expires: "" }, token: jwt } as never);
    assert.equal((session as { user: { sessionVersion?: number } }).user.sessionVersion, 3);

    // Akun platform/regional/mitra membawa versi tabelnya sendiri (audit 2026-11-05); tanpa versi -> 0 (sama dengan bawaan DB).
    const reg = await authOptions.callbacks!.jwt!({ token: {}, user: { id: "rg:1", accountType: "regional", sessionVersion: 9 } as never, account: null, trigger: "signIn" } as never);
    assert.equal(reg.sv, 9);
    const plain = await authOptions.callbacks!.jwt!({ token: {}, user: { id: "pt:1", accountType: "partner" } as never, account: null, trigger: "signIn" } as never);
    assert.equal(plain.sv, 0);
  });

  it("akun tanpa kolom bermasalah: pengguna nonaktif tetap 403 (bukan 401), sesi tak bertanda tangan ditolak", async () => {
    const u = await mkUser(`f${t}@a.id`);
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
    assert.equal((await get(u, 0)).status, 403);
    const forged = await perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: "next-auth.session-token=ngawur.ngawur.ngawur" } }));
    assert.equal(forged.status, 401);
    assert.notEqual((await body(forged)).code, "SESSION_REVOKED");
  });
});
