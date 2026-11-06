/* eslint-disable @typescript-eslint/no-explicit-any -- respons JSON uji tidak bertipe */
/** Pusat Akun super admin (cari akun lintas desa, intervensi, warga baca-saja) dengan handler asli + MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";
import { encode } from "next-auth/jwt";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pusat Akun super admin (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let listRoute: typeof import("../app/api/admin/accounts/route");
  let detailRoute: typeof import("../app/api/admin/accounts/[type]/[id]/route");
  let actionRoute: typeof import("../app/api/admin/accounts/[type]/[id]/[action]/route");
  let residentsRoute: typeof import("../app/api/admin/accounts/residents/route");
  let revealRoute: typeof import("../app/api/admin/accounts/residents/[id]/reveal/route");
  let legacyCredits: typeof import("../app/api/admin/users/[id]/ai-credits/route");
  let permsRoute: typeof import("../app/api/account/permissions/route");
  let mobileLogin: typeof import("../app/api/mobile/v1/auth/login/route");
  let mobileReset: typeof import("../app/api/mobile/v1/auth/password/reset/route");
  const t = Date.now() % 1e6;
  const SECRET = "uji-rahasia-akun-0123456789abcdef-xyz";
  const ADMIN_PW = "KataSandiAdmin-123";
  const realFetch = globalThis.fetch;
  let ipN = 0;
  let vA = 0;
  let vB = 0;
  const adminIds: number[] = [];
  let admin: { id: number; email: string };
  let cookieAdmin = "";

  const ip = () => `10.9.${t % 250}.${(++ipN % 250) + 1}`;
  const platformCookie = async (u: { id: number; email: string }) =>
    `next-auth.session-token=${await encode({ secret: SECRET, token: { sub: `pl:${u.id}`, id: `pl:${u.id}`, accountType: "platform", role: "platform_admin", email: u.email, name: "Owner" } })}`;
  const villageCookie = async (u: { id: number; email: string; role: string }, sv?: number) =>
    `next-auth.session-token=${await encode({ secret: SECRET, token: { id: String(u.id), email: u.email, name: "B", role: u.role, accountType: "village", villageId: vA, ...(sv === undefined ? {} : { sv }) } })}`;

  const req = (path: string, init: { method?: string; cookie?: string; body?: unknown } = {}) =>
    new NextRequest(`http://localhost${path}`, {
      method: init.method ?? "GET",
      headers: { ...(init.cookie ? { cookie: init.cookie } : {}), "x-real-ip": ip(), "content-type": "application/json" },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
  const str = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));
  const json = async (r: Response) => (await r.json()) as Record<string, any>;
  const act = (kind: string, id: number, action: string, body: Record<string, unknown> = {}, cookie = cookieAdmin, pw: string | null = ADMIN_PW) =>
    actionRoute.POST(req(`/api/admin/accounts/${kind}/${id}/${action}`, { method: "POST", cookie, body: { reason: "tiket uji 123", ...(pw === null ? {} : { confirmPassword: pw }), ...body } }), {
      params: Promise.resolve({ type: kind, id: String(id), action }),
    });
  const mkPlatform = async (tag: string) => {
    const { hashPassword } = await import("../lib/auth");
    const u = await prisma.platformUser.create({ data: { email: `pa-${tag}${t}@uji.test`, password: await hashPassword(ADMIN_PW), name: "Owner", role: "platform_admin" } });
    adminIds.push(u.id);
    return u;
  };
  const mkUser = async (tag: string, o: { role?: string; village?: number; active?: boolean; password?: string } = {}) =>
    prisma.user.create({ data: { villageId: o.village ?? vA, email: `pa-${tag}${t}@desa.test`, password: o.password ?? "x", name: `Budi ${tag}${t}`, role: o.role ?? "staff", isActive: o.active ?? true, phone: "081234567890" } });
  let nikSeq = 0;
  const mkResident = (name: string, village = vA) =>
    prisma.resident.create({ data: { villageId: village, nik: `32${String(t).padStart(6, "0")}${String(10_000_000 + ++nikSeq * 7)}`.slice(0, 16), name, birthplace: "X", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", address: "Jl", phone: "081299998888" } });
  const auditFor = (targetId: string, action?: string) =>
    prisma.platformAuditLog.findMany({ where: { targetType: { in: ["user", "resident"] }, targetId, ...(action ? { action } : {}) }, orderBy: { id: "asc" } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    listRoute = await import("../app/api/admin/accounts/route");
    detailRoute = await import("../app/api/admin/accounts/[type]/[id]/route");
    actionRoute = await import("../app/api/admin/accounts/[type]/[id]/[action]/route");
    residentsRoute = await import("../app/api/admin/accounts/residents/route");
    revealRoute = await import("../app/api/admin/accounts/residents/[id]/reveal/route");
    legacyCredits = await import("../app/api/admin/users/[id]/ai-credits/route");
    permsRoute = await import("../app/api/account/permissions/route");
    mobileLogin = await import("../app/api/mobile/v1/auth/login/route");
    mobileReset = await import("../app/api/mobile/v1/auth/password/reset/route");
    const mk = (code: string, name: string) => prisma.village.create({ data: { code, name, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk(`PA${t}`, `Desa Pusat Akun A ${t}`)).id;
    vB = (await mk(`PB${t}`, `Desa Pusat Akun B ${t}`)).id;
    admin = await mkPlatform("main");
    cookieAdmin = await platformCookie(admin);
  });

  after(async () => {
    globalThis.fetch = realFetch;
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    await prisma.platformAuditLog.deleteMany({ where: { actorEmail: { startsWith: "pa-" }, AND: { actorEmail: { endsWith: `${t}@uji.test` } } } });
    await prisma.emailLog.deleteMany({ where: { template: { in: ["reset"] } } }).catch(() => undefined);
    await prisma.mobileSession.deleteMany({ where: { villageId: { in: [vA, vB] } } });
    await prisma.deviceToken.deleteMany({ where: { villageId: { in: [vA, vB] } } });
    await prisma.mobileRateLimit.deleteMany({ where: { key: { startsWith: "admin-resident-reveal" } } }).catch(() => undefined);
    for (const v of [vA, vB]) if (v) await prisma.village.delete({ where: { id: v } });
    await prisma.platformUser.deleteMany({ where: { id: { in: adminIds } } });
    await prisma.$disconnect();
  });

  describe("guard: 401 tanpa sesi, tidak ada data bocor", () => {
    it("semua rute menolak tanpa sesi platform; sesi desa biasa juga ditolak", async () => {
      const u = await mkUser("g1");
      const p = (id: number) => ({ params: Promise.resolve({ type: "staff", id: String(id), action: "deactivate" }) });
      assert.equal((await listRoute.GET(req("/api/admin/accounts"))).status, 401);
      assert.equal((await detailRoute.GET(req("/x"), { params: Promise.resolve({ type: "staff", id: String(u.id) }) })).status, 401);
      assert.equal((await actionRoute.POST(req("/x", { method: "POST", body: { confirmPassword: ADMIN_PW, reason: "tes uji" } }), p(u.id))).status, 401);
      assert.equal((await residentsRoute.GET(req("/x?q=Budi"))).status, 401);
      assert.equal((await revealRoute.POST(req("/x", { method: "POST", body: {} }), { params: Promise.resolve({ id: "1" }) })).status, 401);
      const village = await villageCookie({ id: u.id, email: u.email, role: "admin" });
      assert.equal((await listRoute.GET(req("/api/admin/accounts", { cookie: village }))).status, 401);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).isActive, true);
    });
  });

  describe("pencarian & detail", () => {
    it("cari lintas desa: email/nama/kode desa, filter, tersamar, berbatas, validasi", async () => {
      const a = await mkUser("s1");
      const b = await mkUser("s2", { village: vB, active: false });
      const res = await mkResident(`Warga Cari ${t}`);
      const c = await prisma.citizenAccount.create({ data: { villageId: vA, residentId: res.id, username: `wc${t}`, passwordHash: "x", status: "ACTIVE", lockedUntil: new Date(Date.now() + 600_000) } });

      const r1 = await listRoute.GET(req(`/api/admin/accounts?q=${encodeURIComponent(a.email)}`, { cookie: cookieAdmin }));
      assert.equal(r1.status, 200);
      const raw = JSON.stringify(await r1.clone().json());
      const d1 = await json(r1);
      assert.equal(d1.rows.length, 1);
      assert.equal(d1.rows[0].id, a.id);
      assert.ok(!raw.includes(a.email), "email penuh tidak boleh ada di daftar");
      assert.ok(!raw.includes("081234567890"));
      assert.match(d1.rows[0].emailMasked, /^p\*+@desa\.test$/);

      const byVillage = await json(await listRoute.GET(req(`/api/admin/accounts?q=PB${t}&type=staff`, { cookie: cookieAdmin })));
      assert.deepEqual(byVillage.rows.map((x: any) => x.id), [b.id]);
      const inactive = await json(await listRoute.GET(req(`/api/admin/accounts?villageId=${vB}&status=inactive`, { cookie: cookieAdmin })));
      assert.ok(inactive.rows.every((x: any) => x.status === "inactive"));
      assert.equal(inactive.total, 1);

      const cit = await json(await listRoute.GET(req(`/api/admin/accounts?type=citizen&status=locked&villageId=${vA}`, { cookie: cookieAdmin })));
      assert.equal(cit.rows.length, 1);
      assert.equal(cit.rows[0].id, c.id);
      assert.equal(cit.rows[0].locked, true);
      assert.equal(cit.rows[0].kind, "citizen");

      const all = await json(await listRoute.GET(req(`/api/admin/accounts?villageId=${vA}&page=1`, { cookie: cookieAdmin })));
      assert.ok(all.rows.length <= 25 && all.pageSize === 25);
      assert.ok(all.rows.some((x: any) => x.kind === "citizen") && all.rows.some((x: any) => x.kind === "staff"));

      for (const bad of ["type=zzz", "status=zzz", "page=0", "villageId=abc"]) {
        assert.equal((await listRoute.GET(req(`/api/admin/accounts?${bad}`, { cookie: cookieAdmin }))).status, 400, bad);
      }
    });

    it("detail staf: sesi mobile aktif, status token tanpa token/hash, jejak audit target; 404 & 400", async () => {
      const u = await mkUser("d1");
      await prisma.mobileSession.create({ data: { accountType: "staff", accountId: u.id, villageId: vA, role: "staff", refreshHash: `h${t}d1`.padEnd(64, "0"), familyId: "f1", expiresAt: new Date(Date.now() + 86_400_000) } });
      await prisma.mobileSession.create({ data: { accountType: "staff", accountId: u.id, villageId: vA, role: "staff", refreshHash: `h${t}d2`.padEnd(64, "0"), familyId: "f2", expiresAt: new Date(Date.now() + 86_400_000), revokedAt: new Date() } });
      const { issueAuthToken } = await import("../lib/rbac/access-links");
      const issued = await issueAuthToken(prisma, { userId: u.id, purpose: "RESET", ttlMs: 60_000 });
      const row = await prisma.authToken.findFirstOrThrow({ where: { userId: u.id } });

      const r = await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "staff", id: String(u.id) }) });
      assert.equal(r.status, 200);
      const text = JSON.stringify(await r.clone().json());
      const d = (await json(r)).account;
      assert.equal(d.activeMobileSessions, 1);
      assert.ok(d.pendingTokens.reset && !d.pendingTokens.invite);
      assert.ok(!text.includes(issued.token) && !text.includes(row.tokenHash) && !text.includes(u.email) && !text.includes("081234567890"));
      assert.ok(!text.includes("password") && !text.includes("tokenHash"));

      assert.equal((await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "staff", id: "999999999" }) })).status, 404);
      assert.equal((await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "residents", id: "1" }) })).status, 400);
      assert.equal((await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "staff", id: "abc" }) })).status, 400);
    });
  });

  describe("step-up, alasan, validasi aksi", () => {
    it("403 tanpa/sandi salah, 400 tanpa alasan atau aksi tak dikenal; tidak ada efek & tidak ada jejak", async () => {
      const u = await mkUser("st1");
      assert.equal((await act("staff", u.id, "deactivate", {}, cookieAdmin, null)).status, 403);
      const wrong = await act("staff", u.id, "deactivate", {}, cookieAdmin, "salah-salah");
      assert.equal(wrong.status, 403);
      assert.equal((await json(wrong)).code, "STEP_UP_INVALID");
      const noReason = await actionRoute.POST(req("/x", { method: "POST", cookie: cookieAdmin, body: { confirmPassword: ADMIN_PW, reason: "ab" } }), { params: Promise.resolve({ type: "staff", id: String(u.id), action: "deactivate" }) });
      assert.equal(noReason.status, 400);
      assert.equal((await act("staff", u.id, "hapus-semua")).status, 404);
      assert.equal((await act("citizen", u.id, "reset-link")).status, 404, "reset-link tidak untuk warga");
      assert.equal((await act("staff", 999_999_999, "deactivate")).status, 404);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).isActive, true);
      assert.equal((await auditFor(String(u.id))).length, 0);
    });

    it("429 setelah banyak sandi konfirmasi salah (admin lain tidak terkena)", async () => {
      const victim = await mkPlatform("rl");
      const other = await mkPlatform("rl2");
      const c = await platformCookie(victim);
      const u = await mkUser("st2");
      let last = 0;
      // Helper memakai IP berbeda per permintaan: yang membatasi di sini plafon per-admin (24), bukan jatah per-IP (8).
      for (let i = 0; i < 28; i += 1) last = (await act("staff", u.id, "force-logout", {}, c, "salah")).status;
      assert.equal(last, 429);
      assert.equal((await act("staff", u.id, "force-logout", {}, await platformCookie(other))).status, 200);
    });
  });

  describe("aksi akun staf", () => {
    it("deactivate: nonaktif + sessionVersion naik + sesi mobile & token push dicabut; login web/mobile ditolak; jejak tanpa rahasia", async () => {
      const { hashPassword } = await import("../lib/auth");
      const u = await mkUser("da1", { password: await hashPassword("SandiUji-12345") });
      const other = await mkUser("da2");
      await prisma.mobileSession.createMany({ data: [
        { accountType: "staff", accountId: u.id, villageId: vA, role: "staff", refreshHash: `s${t}a1`.padEnd(64, "0"), familyId: "fa", expiresAt: new Date(Date.now() + 86_400_000) },
        { accountType: "staff", accountId: other.id, villageId: vA, role: "staff", refreshHash: `s${t}a2`.padEnd(64, "0"), familyId: "fb", expiresAt: new Date(Date.now() + 86_400_000) },
      ] });
      await prisma.deviceToken.create({ data: { accountType: "staff", accountId: u.id, villageId: vA, expoToken: `ExponentPushToken[pa${t}]`, platform: "android" } });
      const c = await villageCookie({ id: u.id, email: u.email, role: u.role }, 0);
      const perms = () => permsRoute.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: c } }));
      assert.equal((await perms()).status, 200);

      const r = await act("staff", u.id, "deactivate");
      assert.equal(r.status, 200);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
      assert.equal(after.isActive, false);
      assert.equal(after.sessionVersion, 1);
      assert.ok((await prisma.mobileSession.findFirstOrThrow({ where: { accountId: u.id, accountType: "staff" } })).revokedAt);
      assert.equal((await prisma.mobileSession.findFirstOrThrow({ where: { accountId: other.id, accountType: "staff" } })).revokedAt, null, "akun lain tak terpengaruh");
      assert.ok((await prisma.deviceToken.findFirstOrThrow({ where: { accountId: u.id } })).disabledAt);
      assert.notEqual((await perms()).status, 200, "sesi web lama mati");

      const login = await mobileLogin.POST(req("/api/mobile/v1/auth/login", { method: "POST", body: { identifier: u.email, password: "SandiUji-12345" } }));
      assert.equal(login.status, 403);
      assert.equal((await json(login)).error.code, "ACCOUNT_DISABLED");

      const logs = await auditFor(String(u.id), "account.deactivate");
      assert.equal(logs.length, 1);
      const blob = str(logs[0]);
      assert.ok(!blob.includes(u.email) && !blob.includes("SandiUji") && !blob.includes(ADMIN_PW) && !blob.includes(u.password));
      assert.equal((logs[0].metadata as any).reason, "tiket uji 123");
      assert.equal(logs[0].actorId, admin.id);
      assert.equal(logs[0].villageId, vA);

      assert.equal((await act("staff", u.id, "deactivate")).status, 409, "sudah nonaktif");
      const re = await act("staff", u.id, "activate");
      assert.equal(re.status, 200);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).isActive, true);
      assert.equal((await act("staff", u.id, "activate")).status, 409);
    });

    it("admin desa terakhir: ditolak tanpa force; dengan force=true berhasil dan tercatat", async () => {
      const lone = await prisma.village.create({ data: { code: `PL${t}`, name: "Desa Satu Admin", district: "k", regency: "r", province: "p", address: "a" } });
      try {
        const only = await mkUser("la1", { role: "admin", village: lone.id });
        const r = await act("staff", only.id, "deactivate");
        assert.equal(r.status, 409);
        assert.equal((await json(r)).code, "LAST_ADMIN");
        assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: only.id } })).isActive, true);
        const detail = (await json(await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "staff", id: String(only.id) }) }))).account;
        assert.equal(detail.isLastActiveAdmin, true);

        const second = await mkUser("la2", { role: "admin", village: lone.id });
        assert.equal((await act("staff", only.id, "deactivate")).status, 200, "ada admin lain -> boleh");
        // second kini satu-satunya admin aktif
        assert.equal((await act("staff", second.id, "deactivate")).status, 409);
        assert.equal((await act("staff", second.id, "deactivate", { force: true })).status, 200);
        const log = (await auditFor(String(second.id), "account.deactivate"))[0];
        assert.equal((log.metadata as any).force, true);
      } finally {
        await prisma.village.delete({ where: { id: lone.id } });
      }
    });

    it("force-logout: sessionVersion naik, cookie lama 401 SESSION_REVOKED, sesi mobile dicabut", async () => {
      const u = await mkUser("fl1");
      await prisma.mobileSession.create({ data: { accountType: "staff", accountId: u.id, villageId: vA, role: "staff", refreshHash: `s${t}fl`.padEnd(64, "0"), familyId: "ff", expiresAt: new Date(Date.now() + 86_400_000) } });
      const c = await villageCookie({ id: u.id, email: u.email, role: u.role }, 0);
      const perms = () => permsRoute.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: c } }));
      assert.equal((await perms()).status, 200);
      const r = await act("staff", u.id, "force-logout");
      assert.equal(r.status, 200);
      assert.equal((await json(r)).mobileSessionsRevoked, 1);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).sessionVersion, 1);
      const after = await perms();
      assert.equal(after.status, 401);
      assert.equal((await json(after)).code, "SESSION_REVOKED");
      assert.equal(await prisma.mobileSession.count({ where: { accountId: u.id, accountType: "staff", revokedAt: null } }), 0);
      assert.equal((await auditFor(String(u.id), "account.force_logout")).length, 1);
    });

    it("reset-link tanpa Brevo: tautan manual SEKALI di respons, token tersimpan sebagai hash, jejak & GET detail tidak membocorkan", async () => {
      delete process.env.BREVO_API_KEY;
      delete process.env.BREVO_SENDER_EMAIL;
      const u = await mkUser("rl1");
      const r = await act("staff", u.id, "reset-link");
      assert.equal(r.status, 200);
      const d = await json(r);
      assert.equal(d.sent, false);
      assert.match(d.manualLink, /\/auth\/atur-sandi\?token=/);
      const token = new URL(d.manualLink).searchParams.get("token")!;
      assert.ok(!JSON.stringify(d).includes(u.email));
      const { hashToken, peekAuthToken } = await import("../lib/rbac/access-links");
      assert.ok(await peekAuthToken(prisma, token));
      const row = await prisma.authToken.findFirstOrThrow({ where: { userId: u.id, purpose: "RESET", usedAt: null } });
      assert.equal(row.tokenHash, hashToken(token));
      assert.equal(row.createdByUserId, null);

      const logs = await auditFor(String(u.id), "account.reset_link");
      assert.equal(logs.length, 2, "jejak sebelum efek + hasil");
      const blob = str(logs);
      assert.ok(!blob.includes(token) && !blob.includes("atur-sandi") && !blob.includes(row.tokenHash) && !blob.includes(u.email));
      assert.equal((logs[1].metadata as any).manualLinkShown, true);

      const detail = await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "staff", id: String(u.id) }) });
      const dt = JSON.stringify(await detail.json());
      assert.ok(!dt.includes(token) && !dt.includes(row.tokenHash) && !dt.includes("atur-sandi"));
    });

    it("reset-link dengan Brevo: email terkirim ke alamat akun, tidak ada manualLink; akun nonaktif ditolak", async () => {
      process.env.BREVO_API_KEY = "test-key";
      process.env.BREVO_SENDER_EMAIL = "noreply@klandesa.test";
      const sent: string[] = [];
      globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
        sent.push(JSON.parse(String(init?.body ?? "{}")).to?.[0]?.email);
        return new Response("{}", { status: 201 });
      }) as typeof fetch;
      const u = await mkUser("rl2");
      const r = await act("staff", u.id, "reset-link");
      assert.equal(r.status, 200);
      const d = await json(r);
      assert.equal(d.sent, true);
      assert.ok(!("manualLink" in d));
      assert.deepEqual(sent, [u.email]);
      const off = await mkUser("rl3", { active: false });
      assert.equal((await act("staff", off.id, "reset-link")).status, 409);
      globalThis.fetch = realFetch;
      delete process.env.BREVO_API_KEY;
      delete process.env.BREVO_SENDER_EMAIL;
    });

    it("change-email: validasi, unik, tersamar di jejak, sesi & tautan lama dicabut", async () => {
      const u = await mkUser("ce1");
      const taken = await mkUser("ce2");
      const { issueAuthToken } = await import("../lib/rbac/access-links");
      const old = await issueAuthToken(prisma, { userId: u.id, purpose: "RESET", ttlMs: 60_000 });
      assert.equal((await act("staff", u.id, "change-email", { newEmail: "bukan-email" })).status, 400);
      assert.equal((await act("staff", u.id, "change-email", { newEmail: u.email.toUpperCase() })).status, 400, "sama dengan yang lama");
      const dup = await act("staff", u.id, "change-email", { newEmail: taken.email });
      assert.equal(dup.status, 409);
      assert.equal((await json(dup)).code, "EMAIL_TAKEN");

      const newEmail = `pa-baru-${t}@desa.test`;
      const r = await act("staff", u.id, "change-email", { newEmail: `  ${newEmail.toUpperCase()} ` });
      assert.equal(r.status, 200);
      const after = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
      assert.equal(after.email, newEmail);
      assert.equal(after.sessionVersion, 1);
      const { peekAuthToken } = await import("../lib/rbac/access-links");
      assert.equal(await peekAuthToken(prisma, old.token), null, "tautan ke alamat lama hangus");
      const log = (await auditFor(String(u.id), "account.change_email"))[0];
      const blob = str(log);
      assert.ok(!blob.includes(u.email) && !blob.includes(newEmail));
      assert.match(log.summary, /->/);
      assert.ok(!JSON.stringify(await json(r)).includes(newEmail));
    });

    it("ai-credits: set/delta lewat Pusat Akun (alasan wajib, audit) dan rute lama tetap jalan + kini beraudit", async () => {
      const u = await mkUser("ai1");
      const r1 = await act("staff", u.id, "ai-credits", { set: 50 });
      assert.equal(r1.status, 200);
      assert.equal((await json(r1)).aiCredits, 50);
      assert.equal((await json(await act("staff", u.id, "ai-credits", { delta: -500 }))).aiCredits, 0, "tidak negatif");
      assert.equal((await act("staff", u.id, "ai-credits", {})).status, 400);
      assert.equal((await act("staff", u.id, "ai-credits", { set: "abc" })).status, 400);
      assert.equal((await act("staff", u.id, "ai-credits", { set: 1e12 })).status, 400);

      const before = (await auditFor(String(u.id), "account.ai_credits")).length;
      assert.equal(before, 2);
      const legacy = await legacyCredits.PUT(req("/x", { method: "PUT", cookie: cookieAdmin, body: { delta: 25, confirmPassword: ADMIN_PW, reason: "tiket uji 123" } }), { params: Promise.resolve({ id: String(u.id) }) });
      assert.equal(legacy.status, 200);
      const ld = await json(legacy);
      assert.deepEqual(Object.keys(ld).sort(), ["ok", "updatedBy", "user"]);
      assert.deepEqual(ld.user, { id: u.id, email: u.email, aiCredits: 25 });
      const logs = await auditFor(String(u.id), "account.ai_credits");
      assert.equal(logs.length, 3);
      assert.equal((logs[2].metadata as any).via, "legacy_route");
      assert.equal((await legacyCredits.PUT(req("/x", { method: "PUT", body: { delta: 1 } }), { params: Promise.resolve({ id: String(u.id) }) })).status, 401);
      assert.equal((await legacyCredits.PUT(req("/x", { method: "PUT", cookie: cookieAdmin, body: { delta: 1, confirmPassword: ADMIN_PW, reason: "tiket uji 123" } }), { params: Promise.resolve({ id: "99999999" }) })).status, 404);
      assert.equal((await legacyCredits.PUT(req("/x", { method: "PUT", cookie: cookieAdmin, body: { confirmPassword: ADMIN_PW, reason: "tiket uji 123" } }), { params: Promise.resolve({ id: String(u.id) }) })).status, 400);
    });

    it("unlock staf: hapus pembatas login per-email (hanya milik akun itu)", async () => {
      const { limiterKey } = await import("../lib/mobile/rate-limit");
      const u = await mkUser("ul1");
      const other = await mkUser("ul2");
      const k1 = limiterKey("web-login-email", u.email.toLowerCase());
      const k2 = limiterKey("web-login-email", other.email.toLowerCase());
      await prisma.mobileRateLimit.createMany({ data: [{ key: k1, count: 99, windowStart: new Date() }, { key: k2, count: 99, windowStart: new Date() }] });
      const r = await act("staff", u.id, "unlock");
      assert.equal(r.status, 200);
      assert.equal((await json(r)).cleared, 1);
      assert.equal(await prisma.mobileRateLimit.count({ where: { key: k1 } }), 0);
      assert.equal(await prisma.mobileRateLimit.count({ where: { key: k2 } }), 1);
      await prisma.mobileRateLimit.deleteMany({ where: { key: k2 } });
      assert.equal((await auditFor(String(u.id), "account.unlock")).length, 1);
    });
  });

  describe("aksi akun warga mobile", () => {
    const mkCitizen = async (tag: string, status = "ACTIVE") => {
      const res = await mkResident(`Warga ${tag} ${t}`);
      const c = await prisma.citizenAccount.create({ data: { villageId: vA, residentId: res.id, username: `${tag}${t}`.slice(0, 30), passwordHash: "x", status, failedAttempts: 7, lockedUntil: new Date(Date.now() + 600_000) } });
      return { res, c };
    };

    it("deactivate/activate: bekukan + cabut sesi; aktifkan hanya dari SUSPENDED; force-logout & unlock", async () => {
      const { c } = await mkCitizen("cw1");
      await prisma.mobileSession.create({ data: { accountType: "citizen", accountId: c.id, villageId: vA, role: "citizen", refreshHash: `c${t}1`.padEnd(64, "0"), familyId: "fc", expiresAt: new Date(Date.now() + 86_400_000) } });
      const d = await act("citizen", c.id, "deactivate");
      assert.equal(d.status, 200);
      assert.equal((await prisma.citizenAccount.findUniqueOrThrow({ where: { id: c.id } })).status, "SUSPENDED");
      assert.equal(await prisma.mobileSession.count({ where: { accountType: "citizen", accountId: c.id, revokedAt: null } }), 0);
      assert.equal((await act("citizen", c.id, "deactivate")).status, 409);
      assert.equal((await act("citizen", c.id, "activate")).status, 200);

      const pend = await mkCitizen("cw2", "PENDING_VERIFY");
      assert.equal((await act("citizen", pend.c.id, "activate")).status, 409, "persetujuan pendaftaran = wewenang desa");
      assert.equal((await act("citizen", pend.c.id, "deactivate")).status, 409);

      const un = await act("citizen", c.id, "unlock");
      assert.equal(un.status, 200);
      const row = await prisma.citizenAccount.findUniqueOrThrow({ where: { id: c.id } });
      assert.equal(row.failedAttempts, 0);
      assert.equal(row.lockedUntil, null);
      assert.equal((await act("citizen", c.id, "force-logout")).status, 200);
      assert.equal((await auditFor(`citizen:${c.id}`)).map((l) => l.action).join(","), "account.deactivate,account.activate,citizen.unlock,account.force_logout");

      await prisma.citizenAccount.update({ where: { id: c.id }, data: { deletedAt: new Date() } });
      assert.equal((await act("citizen", c.id, "deactivate")).status, 409, "akun terhapus");
    });

    it("reset-code: kode sekali di respons, DB hanya hash, jejak tanpa kode, kode lama hangus, kode benar-benar bisa dipakai warga", async () => {
      const { res, c } = await mkCitizen("cw3");
      const r1 = await act("citizen", c.id, "reset-code");
      assert.equal(r1.status, 200);
      const { code } = await json(r1);
      assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      const { hashActivationCode, normalizeActivationCode } = await import("../lib/mobile/citizen");
      const rows = await prisma.activationCode.findMany({ where: { residentId: res.id, purpose: "RESET" } });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].codeHash, hashActivationCode(normalizeActivationCode(code)));
      assert.ok(!str(rows).includes(code));
      const logs = await auditFor(`citizen:${c.id}`, "citizen.reset_code");
      assert.equal(logs.length, 1);
      assert.ok(!str(logs).includes(code) && !str(logs).includes(res.nik));
      const detail = JSON.stringify(await (await detailRoute.GET(req("/x", { cookie: cookieAdmin }), { params: Promise.resolve({ type: "citizen", id: String(c.id) }) })).json());
      assert.ok(detail.includes("pendingResetCode") && !detail.includes(code) && !detail.includes(res.nik));

      const r2 = await act("citizen", c.id, "reset-code");
      const code2 = (await json(r2)).code as string;
      const use = (cd: string) => mobileReset.POST(req("/api/mobile/v1/auth/password/reset", { method: "POST", body: { mode: "code", nik: res.nik, code: cd, newPassword: "SandiBaruWarga-77" } }));
      assert.equal((await use(code)).status, 422, "kode lama hangus");
      assert.equal((await use(code2)).status, 204);
      const acc = await prisma.citizenAccount.findUniqueOrThrow({ where: { id: c.id } });
      assert.equal(acc.failedAttempts, 0);
      assert.equal(acc.lockedUntil, null);

      const sus = await mkCitizen("cw4", "SUSPENDED");
      assert.equal((await act("citizen", sus.c.id, "reset-code")).status, 409);
      assert.equal((await act("citizen", c.id, "reset-code", {}, cookieAdmin, "salah")).status, 403);
    });
  });

  describe("warga baca-saja", () => {
    it("pencarian tersamar: nama awalan / NIK persis 16 digit; pencarian longgar ditolak; NIK tak pernah di daftar", async () => {
      const a = await mkResident(`Zuhriyah Uji ${t}`);
      await mkResident(`Zuhriyah Lain ${t}`, vB);
      const r = await residentsRoute.GET(req(`/api/admin/accounts/residents?q=Zuhriyah%20Uji%20${t}`, { cookie: cookieAdmin }));
      assert.equal(r.status, 200);
      const text = JSON.stringify(await r.clone().json());
      const d = await json(r);
      assert.equal(d.residents.length, 1);
      assert.ok(!text.includes(a.nik) && !text.includes("081299998888"));
      assert.equal(d.residents[0].nikMasked, `${"*".repeat(12)}${a.nik.slice(-4)}`);

      const scoped = await json(await residentsRoute.GET(req(`/api/admin/accounts/residents?q=Zuhriyah&villageId=${vB}`, { cookie: cookieAdmin })));
      assert.equal(scoped.residents.length, 1);
      assert.equal(scoped.residents[0].village.id, vB);

      const byNik = await json(await residentsRoute.GET(req(`/api/admin/accounts/residents?q=${a.nik}`, { cookie: cookieAdmin })));
      assert.deepEqual(byNik.residents.map((x: any) => x.id), [a.id]);
      for (const bad of ["q=", "q=zu", `q=${a.nik.slice(0, 10)}`, `q=${a.nik}0`]) {
        assert.equal((await residentsRoute.GET(req(`/api/admin/accounts/residents?${bad}`, { cookie: cookieAdmin }))).status, 400, bad);
      }
    });

    it("reveal: 403 tanpa step-up, 400 tanpa alasan, sukses beraudit (tanpa NIK di jejak), 404, dan 429 setelah 20 pembukaan/10 menit", async () => {
      const a = await mkResident(`Reveal Uji ${t}`);
      const revealer = await mkPlatform("rv");
      const c = await platformCookie(revealer);
      const call = (id: number | string, body: Record<string, unknown>, cookie = c) =>
        revealRoute.POST(req("/x", { method: "POST", cookie, body }), { params: Promise.resolve({ id: String(id) }) });

      assert.equal((await call(a.id, { reason: "tiket uji 1" })).status, 403);
      assert.equal((await call(a.id, { confirmPassword: "salah", reason: "tiket uji 1" })).status, 403);
      assert.equal((await call(a.id, { confirmPassword: ADMIN_PW, reason: "x" })).status, 400);
      assert.equal((await call("abc", { confirmPassword: ADMIN_PW, reason: "tiket uji 1" })).status, 400);
      assert.equal((await call(999_999_999, { confirmPassword: ADMIN_PW, reason: "tiket uji 1" })).status, 404);
      assert.equal((await auditFor(String(a.id), "resident.view_sensitive")).length, 0, "gagal = tanpa data & tanpa jejak palsu");

      const ok = await call(a.id, { confirmPassword: ADMIN_PW, reason: "verifikasi identitas tiket 55" });
      assert.equal(ok.status, 200);
      const d = (await json(ok)).resident;
      assert.equal(d.nik, a.nik);
      assert.equal(d.phone, "081299998888");
      const logs = await auditFor(String(a.id), "resident.view_sensitive");
      assert.equal(logs.length, 1);
      assert.equal(logs[0].targetType, "resident");
      assert.equal(logs[0].actorId, revealer.id);
      assert.equal(logs[0].villageId, vA);
      const blob = str(logs[0]);
      assert.ok(!blob.includes(a.nik) && !blob.includes("081299998888"));
      assert.equal((logs[0].metadata as any).reason, "verifikasi identitas tiket 55");

      let last = 0;
      for (let i = 0; i < 20; i += 1) last = (await call(a.id, { confirmPassword: ADMIN_PW, reason: "tiket uji batas" })).status;
      assert.equal(last, 429, "percobaan ke-21 dalam 10 menit ditolak");
      const logsAfter = await auditFor(String(a.id), "resident.view_sensitive");
      // 20 jatah = 1 percobaan 404 + 1 sukses awal + 18 pembukaan; yang ditolak (429) tidak tercatat sebagai pembukaan.
      assert.equal(logsAfter.length, 19);
    });
  });
});
