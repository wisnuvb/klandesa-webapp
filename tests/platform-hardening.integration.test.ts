/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Paket F2 (pengerasan keamanan konsol Super Admin), handler asli + MySQL scratch:
 * S1 pembatas atomik (step-up & 2FA tahan permintaan paralel), S2 admin tak bisa dikunci pihak asing + aksi `unlock`,
 * S3 step-up meminta kode 2FA, S4 pencarian tidak bisa membalik penyamaran, serta butir RENDAH (setup 2FA bersyarat,
 * kredit AI atomik, hitungan admin yang bisa masuk, jejak ketat, token atur sandi di fragmen).
 * Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pengerasan keamanan Super Admin F2 (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let encode: typeof import("next-auth/jwt").encode;
  let hashPassword: typeof import("../lib/auth").hashPassword;
  let totp: typeof import("../lib/platform/totp");
  let twoFactor: typeof import("../lib/platform/admins/two-factor");
  let guard: typeof import("../lib/platform/admins/login-guard");
  let svc: typeof import("../lib/platform/admins/service");
  let loginRoute: typeof import("../app/api/auth/login/route");
  let usersRoute: typeof import("../app/api/admin/platform-users/route");
  let userActionRoute: typeof import("../app/api/admin/platform-users/[id]/route");
  let setupRoute: typeof import("../app/api/admin/security/2fa/setup/route");
  let accountsRoute: typeof import("../app/api/admin/accounts/route");
  let residentsRoute: typeof import("../app/api/admin/accounts/residents/route");
  let actionRoute: typeof import("../app/api/admin/accounts/[type]/[id]/[action]/route");
  let setPwRoute: typeof import("../app/api/auth/platform/atur-sandi/route");
  let peekRoute: typeof import("../app/api/auth/platform/atur-sandi/peek/route");
  let accountsLib: typeof import("../lib/platform/accounts/actions");
  let aiCredits: typeof import("../lib/platform/accounts/ai-credits");

  const SECRET = "uji-rahasia-hardening-f2-0123456789abcdef";
  const PW = "Sandi12345";
  const t = Date.now() % 1e6;
  let ipN = 0;
  const ip = () => `10.77.${(t + Math.floor(ipN / 250)) % 250}.${(++ipN % 250) + 1}`;
  const adminIds: number[] = [];
  const emails: string[] = [];
  const keys: string[] = [];
  let villageId = 0;
  const userIds: number[] = [];

  const mkAdmin = async (k: string, o: { password?: string } = {}) => {
    const e = `f2-${k}-${t}@f2.test`;
    emails.push(e);
    const u = await prisma.platformUser.create({ data: { email: e, name: `F2 ${k}`, password: await hashPassword(o.password ?? PW), role: "platform_admin" } });
    adminIds.push(u.id);
    const cookie = await encode({ secret: SECRET, token: { sub: `pl:${u.id}`, id: `pl:${u.id}`, accountType: "platform", role: "platform_admin", email: u.email, name: "F2" } });
    return { id: u.id, email: u.email, cookie };
  };
  const with2fa = async <T extends { id: number }>(a: T) => {
    const secret = totp.generateTotpSecret();
    const { codes, hashes } = totp.generateRecoveryCodes();
    await prisma.platformUser.update({ where: { id: a.id }, data: { totpSecretEnc: totp.encryptTotpSecret(secret, totp.totpAad(a.id)), totpEnabledAt: new Date(), recoveryCodeHashes: hashes as never } });
    return { ...a, secret, recovery: codes };
  };
  const codeFor = (secret: string, nowMs: number) => totp.totpAt(totp.base32Decode(secret), nowMs);
  const wrongFor = (secret: string, nowMs: number) => {
    const ok = new Set([-1, 0, 1].map((d) => codeFor(secret, nowMs + d * 30_000)));
    let n = 100001;
    while (ok.has(String(n))) n += 7;
    return String(n);
  };
  const req = (method: string, url: string, body?: unknown, cookie?: string | null, ipAddr = ip()) =>
    new NextRequest(`http://localhost${url}`, {
      method,
      headers: { "content-type": "application/json", "x-real-ip": ipAddr, ...(cookie ? { cookie: `next-auth.session-token=${cookie}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const str = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));
  const j = async (r: Response) => (await r.json()) as Record<string, any>;
  const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
  const act = (cookie: string, id: number, body: Record<string, unknown>, ipAddr = ip()) => userActionRoute.POST(req("POST", `/api/admin/platform-users/${id}`, body, cookie, ipAddr), ctx(id));
  const login = (e: string, password: string, totpCode?: string, ipAddr = ip()) =>
    loginRoute.POST(req("POST", "/api/auth/login", { email: e, password, ...(totpCode !== undefined ? { totpCode } : {}) }, null, ipAddr));
  const clearKeys = async (id: number, email: string) => {
    await guard.clearAdminLocks(id, email);
  };
  const audits = (where: Record<string, unknown>) => prisma.platformAuditLog.findMany({ where: where as never, orderBy: { id: "asc" } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    delete process.env.BREVO_API_KEY;
    delete process.env.PLATFORM_TOTP_KEY;
    ({ prisma } = await import("../lib/prisma"));
    ({ encode } = await import("next-auth/jwt"));
    ({ hashPassword } = await import("../lib/auth"));
    totp = await import("../lib/platform/totp");
    twoFactor = await import("../lib/platform/admins/two-factor");
    guard = await import("../lib/platform/admins/login-guard");
    svc = await import("../lib/platform/admins/service");
    loginRoute = await import("../app/api/auth/login/route");
    usersRoute = await import("../app/api/admin/platform-users/route");
    userActionRoute = await import("../app/api/admin/platform-users/[id]/route");
    setupRoute = await import("../app/api/admin/security/2fa/setup/route");
    accountsRoute = await import("../app/api/admin/accounts/route");
    residentsRoute = await import("../app/api/admin/accounts/residents/route");
    actionRoute = await import("../app/api/admin/accounts/[type]/[id]/[action]/route");
    setPwRoute = await import("../app/api/auth/platform/atur-sandi/route");
    peekRoute = await import("../app/api/auth/platform/atur-sandi/peek/route");
    accountsLib = await import("../lib/platform/accounts/actions");
    aiCredits = await import("../lib/platform/accounts/ai-credits");
    villageId = (await prisma.village.create({ data: { code: `F2${t}`, name: `Desa F2 ${t}`, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
  });

  after(async () => {
    await prisma.platformAuditLog.deleteMany({ where: { OR: [{ actorId: { in: adminIds } }, { targetId: { in: adminIds.map(String) }, targetType: "platform_user" }, { actorEmail: { in: emails } }] } });
    for (const id of adminIds) await guard.clearAdminLocks(id, "x").catch(() => undefined);
    await prisma.mobileRateLimit.deleteMany({ where: { key: { in: keys } } });
    await prisma.platformAuthToken.deleteMany({ where: { platformUserId: { in: adminIds } } });
    await prisma.resident.deleteMany({ where: { villageId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.village.delete({ where: { id: villageId } }).catch(() => undefined);
    await prisma.platformUser.deleteMany({ where: { id: { in: adminIds } } });
    await prisma.$disconnect();
  });

  describe("S1: pembatas atomik (permintaan paralel tak bisa lolos)", () => {
    it("step-up, SATU IP: 30 sandi salah paralel hanya menilai <= 8 kandidat; sisanya 429; sandi benar dari IP itu ikut ditolak", async () => {
      const a = await mkAdmin("s1a");
      const target = await mkAdmin("s1t");
      const sameIp = ip();
      const results = await Promise.all(
        Array.from({ length: 30 }, (_, i) => act(a.cookie, target.id, { action: "force_logout", reason: "uji paralel 123", confirmPassword: `Salah-${i}-xx` }, sameIp)),
      );
      const statuses = results.map((r) => r.status);
      const evaluated = statuses.filter((s) => s === 403).length;
      assert.ok(evaluated <= 8, `bcrypt dievaluasi ${evaluated}x (maks 8)`);
      assert.ok(evaluated >= 1);
      assert.equal(statuses.filter((s) => s === 429).length, 30 - evaluated);
      const locked = await act(a.cookie, target.id, { action: "force_logout", reason: "uji paralel 123", confirmPassword: PW }, sameIp);
      assert.equal(locked.status, 429, "terkunci: sandi benar pun ditolak dari IP itu");
      assert.ok(locked.headers.get("retry-after"));
      // Pemilik sah (sandi benar) dari IP LAIN tidak terkena kunci penyerang di IP itu.
      const owner = await act(a.cookie, target.id, { action: "force_logout", reason: "uji paralel 123", confirmPassword: PW }, ip());
      assert.equal(owner.status, 200, "kunci per (admin, IP): IP lain tidak terkena");
    });

    it("step-up, IP TERSEBAR: plafon per-admin 24 membatasi tebakan terdistribusi", async () => {
      const a = await mkAdmin("s1x1");
      const target = await mkAdmin("s1x2");
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) => act(a.cookie, target.id, { action: "force_logout", reason: "uji tersebar 123", confirmPassword: `Salah-${i}-yy` })),
      );
      const statuses = results.map((r) => r.status);
      const evaluated = statuses.filter((s) => s === 403).length;
      assert.ok(evaluated <= 24, `bcrypt dievaluasi ${evaluated}x (maks 24)`);
      assert.ok(evaluated >= 9, "dari banyak IP, jatah per-IP (8) tidak lagi membatasi");
      assert.equal(statuses.filter((s) => s === 429).length, 40 - evaluated);
    });

    it("step-up: admin sah tidak terkunci oleh kegagalan sebelumnya yang diselingi sukses (sukses menghapus hitungan)", async () => {
      const a = await mkAdmin("s1b");
      const target = await mkAdmin("s1u");
      for (let round = 0; round < 4; round += 1) {
        for (let i = 0; i < 6; i += 1) assert.equal((await act(a.cookie, target.id, { action: "force_logout", reason: "uji selang-seling", confirmPassword: "Salah-Terus1" })).status, 403);
        assert.equal((await act(a.cookie, target.id, { action: "force_logout", reason: "uji selang-seling", confirmPassword: PW })).status, 200, `ronde ${round}`);
      }
      assert.equal(await prisma.mobileRateLimit.count({ where: { key: guard.stepUpFailKeyAdmin(a.id) } }), 0);
    });

    it("2FA: 30 kode salah paralel (IP berbeda) menilai <= 5; kode benar sesudahnya ditolak 429 sampai dibuka", async () => {
      const a = await with2fa(await mkAdmin("s1c"));
      const row = await prisma.platformUser.findUniqueOrThrow({ where: { id: a.id }, select: twoFactor.TWO_FACTOR_SELECT });
      const now = Date.now();
      const rs = await Promise.all(Array.from({ length: 30 }, () => twoFactor.verifySecondFactor(row, wrongFor(a.secret, now), ip())));
      const invalid = rs.filter((r) => !r.ok && r.reason === "invalid").length;
      const lockedN = rs.filter((r) => !r.ok && r.reason === "locked").length;
      assert.ok(invalid <= 5 && invalid >= 1, `dinilai ${invalid}x`);
      assert.equal(invalid + lockedN, 30);
      const good = await twoFactor.verifySecondFactor(row, codeFor(a.secret, now), ip());
      assert.deepEqual([good.ok, (good as any).reason], [false, "locked"]);
      await clearKeys(a.id, a.email);
      assert.equal((await twoFactor.verifySecondFactor(row, codeFor(a.secret, now), ip())).ok, true);
    });

    it("2FA: login paralel dengan kode salah dari banyak IP: <= 5 TOTP_INVALID, sisanya 429", async () => {
      const a = await with2fa(await mkAdmin("s1d"));
      const now = Date.now();
      const rs = await Promise.all(Array.from({ length: 20 }, () => login(a.email, PW, wrongFor(a.secret, now))));
      const body = await Promise.all(rs.map((r) => j(r)));
      const invalid = body.filter((b) => b.code === "TOTP_INVALID").length;
      assert.ok(invalid <= 5 && invalid >= 1, `dinilai ${invalid}x`);
      assert.equal(rs.filter((r) => r.status === 429).length, 20 - invalid);
    });

    it("2FA: admin sah yang selang-seling salah/benar tak pernah terkunci (sukses menghapus hitungan & mengembalikan jatah IP)", async () => {
      const a = await with2fa(await mkAdmin("s1e"));
      const row = await prisma.platformUser.findUniqueOrThrow({ where: { id: a.id }, select: twoFactor.TWO_FACTOR_SELECT });
      // IP berganti tiap putaran: kegagalan per-IP memang tidak dihapus oleh sukses (hanya jatah sukses itu yang dikembalikan).
      for (let k = 1; k <= 14; k += 1) {
        const now = Date.now() + k * 200_000;
        const here = ip();
        keys.push(guard.totpFailKeyIp(here));
        for (let i = 0; i < 3; i += 1) assert.equal((await twoFactor.verifySecondFactor(row, wrongFor(a.secret, now), here, { now })).ok, false);
        assert.equal((await twoFactor.verifySecondFactor(row, codeFor(a.secret, now), here, { now })).ok, true, `putaran ${k}`);
      }
    });
  });

  describe("S2: admin sah tak bisa dikunci pihak asing; aksi unlock", () => {
    it("banjir kegagalan lintas IP ke email admin tidak mengunci owner; akun non-platform tetap terkunci (kontrol)", async () => {
      const { limiterKey } = await import("../lib/mobile/rate-limit");
      const a = await mkAdmin("s2a");
      // 70 kegagalan terdistribusi (dari 70 IP berbeda), seperti penyerang tak terautentikasi.
      const flood = await Promise.all(Array.from({ length: 12 }, () => login(a.email, "SalahSalah1")));
      assert.ok(flood.every((r) => r.status === 401));
      const key = limiterKey("web-login-email", a.email);
      keys.push(key);
      await prisma.mobileRateLimit.upsert({ where: { key }, create: { key, count: 500, windowStart: new Date() }, update: { count: 500, windowStart: new Date() } });
      const ok = await login(a.email, PW);
      assert.equal(ok.status, 200, "owner tetap bisa masuk dari IP lain");

      const u = await prisma.user.create({ data: { villageId, email: `f2-ctl-${t}@desa.test`, password: await hashPassword(PW), name: "Kontrol", role: "staff" } });
      userIds.push(u.id);
      assert.equal((await login(u.email, PW)).status, 200);
      const ukey = limiterKey("web-login-email", u.email);
      keys.push(ukey);
      await prisma.mobileRateLimit.upsert({ where: { key: ukey }, create: { key: ukey, count: 500, windowStart: new Date() }, update: { count: 500, windowStart: new Date() } });
      assert.equal((await login(u.email, PW)).status, 429, "akun desa tetap dilindungi batas per-email");
    });

    it("hanya KEGAGALAN sandi yang dihitung pada batas per-email (login sukses tidak menaikkan)", async () => {
      const { limiterKey } = await import("../lib/mobile/rate-limit");
      const u = await prisma.user.create({ data: { villageId, email: `f2-cnt-${t}@desa.test`, password: await hashPassword(PW), name: "Hitung", role: "staff" } });
      userIds.push(u.id);
      const key = limiterKey("web-login-email", u.email);
      keys.push(key);
      for (let i = 0; i < 3; i += 1) assert.equal((await login(u.email, PW)).status, 200);
      assert.equal(await prisma.mobileRateLimit.count({ where: { key } }), 0);
      assert.equal((await login(u.email, "salah-salah-1")).status, 401);
      assert.equal((await prisma.mobileRateLimit.findUniqueOrThrow({ where: { key } })).count, 1);
    });

    it("unlock: admin lain membuka kunci 2FA/login/step-up korban (step-up + alasan + audit admin.unlock); 403/400/404", async () => {
      const victim = await with2fa(await mkAdmin("s2v"));
      const helper = await mkAdmin("s2h");
      const now = Date.now();
      // penyerang yang tahu sandi menghabiskan jatah kode: korban sah ditolak
      for (let i = 0; i < 6; i += 1) await login(victim.email, PW, wrongFor(victim.secret, now));
      const blocked = await login(victim.email, PW, codeFor(victim.secret, now));
      assert.equal(blocked.status, 429);
      assert.ok((await prisma.mobileRateLimit.count({ where: { key: guard.totpFailKeyAdmin(victim.id) } })) > 0);

      assert.equal((await act(helper.cookie, victim.id, { action: "unlock", reason: "korban terkunci" })).status, 403, "tanpa sandi");
      assert.equal((await act(helper.cookie, victim.id, { action: "unlock", confirmPassword: PW, reason: "x" })).status, 400, "alasan wajib");
      assert.equal((await act(helper.cookie, 999_999_999, { action: "unlock", confirmPassword: PW, reason: "korban terkunci" })).status, 404);
      const r = await act(helper.cookie, victim.id, { action: "unlock", confirmPassword: PW, reason: "korban terkunci" });
      assert.equal(r.status, 200);
      assert.ok((await j(r)).cleared >= 1);
      assert.equal(await prisma.mobileRateLimit.count({ where: { key: guard.totpFailKeyAdmin(victim.id) } }), 0);
      const log = await audits({ actorId: helper.id, action: "admin.unlock" });
      assert.equal(log.length, 1);
      assert.equal(Number(log[0]!.targetId), victim.id);
      assert.equal(str(log[0]).includes(PW), false);

      const ok = await login(victim.email, PW, codeFor(victim.secret, now));
      assert.equal(ok.status, 200, "korban bisa masuk lagi dengan kode benar");
    });
  });

  describe("S3: step-up meminta kode 2FA", () => {
    it("admin ber-2FA: tanpa kode 403 STEP_UP_TOTP_REQUIRED (tanpa menyentuh pembatas), kode salah 403 STEP_UP_TOTP_INVALID, kode benar lolos; kode sama tak bisa dipakai ulang", async () => {
      const a = await with2fa(await mkAdmin("s3a"));
      const invite = (body: Record<string, unknown>) => usersRoute.POST(req("POST", "/api/admin/platform-users", body, a.cookie));
      const base = (n: string) => ({ email: `f2-inv-${n}-${t}@f2.test`, name: "Admin Undangan", reason: "uji step-up 2FA", confirmPassword: PW });

      const none = await invite(base("n"));
      assert.equal(none.status, 403);
      assert.equal((await j(none)).code, "STEP_UP_TOTP_REQUIRED");
      assert.equal(await prisma.mobileRateLimit.count({ where: { key: guard.stepUpFailKeyAdmin(a.id) } }), 0, "formulir belum lengkap bukan percobaan menebak");

      const wrong = await invite({ ...base("w"), totpCode: wrongFor(a.secret, Date.now()) });
      assert.equal(wrong.status, 403);
      assert.equal((await j(wrong)).code, "STEP_UP_TOTP_INVALID");
      const wrongPw = await invite({ ...base("p"), confirmPassword: "SalahSalah9", totpCode: codeFor(a.secret, Date.now()) });
      assert.equal((await j(wrongPw)).code, "STEP_UP_INVALID", "sandi dinilai lebih dulu; kode tidak dibakar");

      const code = codeFor(a.secret, Date.now());
      const e1 = base("ok");
      const okRes = await invite({ ...e1, totpCode: code });
      assert.equal(okRes.status, 201);
      adminIds.push((await j(okRes)).admin.id);
      emails.push(e1.email);
      const replay = await invite({ ...base("re"), totpCode: code });
      assert.equal(replay.status, 403);
      assert.equal((await j(replay)).code, "STEP_UP_TOTP_INVALID");
      // ruang pakai-sekali step-up terpisah dari login: kode yang baru dipakai konfirmasi masih bisa dipakai masuk
      assert.equal((await login(a.email, PW, code)).status, 200);

      const viaRecovery = await invite({ ...base("rc"), totpCode: a.recovery[0] });
      assert.equal(viaRecovery.status, 201);
      adminIds.push((await j(viaRecovery)).admin.id);
      emails.push(base("rc").email);
    });

    it("admin tanpa 2FA tidak terpengaruh; rute akun (readRiskyBody) juga meminta kode", async () => {
      const plain = await mkAdmin("s3p");
      const u = await prisma.user.create({ data: { villageId, email: `f2-act-${t}@desa.test`, password: "x", name: "Target", role: "staff" } });
      userIds.push(u.id);
      const run = (cookie: string, extra: Record<string, unknown>) =>
        actionRoute.POST(req("POST", `/api/admin/accounts/staff/${u.id}/force-logout`, { reason: "uji rute akun", confirmPassword: PW, ...extra }, cookie), { params: Promise.resolve({ type: "staff", id: String(u.id), action: "force-logout" }) });
      assert.equal((await run(plain.cookie, {})).status, 200);
      const a = await with2fa(await mkAdmin("s3q"));
      assert.equal((await run(a.cookie, {})).status, 403);
      assert.equal((await run(a.cookie, { totpCode: codeFor(a.secret, Date.now()) })).status, 200);
    });

    it("rute ganti sandi/2FA tidak menilai kode dua kali (skipTotp): setup 2FA ke-2 ditolak 409 tanpa menurunkan 2FA aktif", async () => {
      const a = await with2fa(await mkAdmin("s3s"));
      const before = await prisma.platformUser.findUniqueOrThrow({ where: { id: a.id }, select: { totpSecretEnc: true, totpEnabledAt: true } });
      const res = await setupRoute.POST(req("POST", "/api/admin/security/2fa/setup", {}, a.cookie));
      assert.equal(res.status, 409);
      const after = await prisma.platformUser.findUniqueOrThrow({ where: { id: a.id }, select: { totpSecretEnc: true, totpEnabledAt: true } });
      assert.deepEqual(after, before);
      // beginSetup langsung (mis. setup paralel yang terlambat): bersyarat, tidak menimpa
      assert.equal(await twoFactor.beginSetup(a.id, a.email), null);
      assert.deepEqual(await prisma.platformUser.findUniqueOrThrow({ where: { id: a.id }, select: { totpSecretEnc: true, totpEnabledAt: true } }), before);
      const b = await mkAdmin("s3t");
      const begun = await twoFactor.beginSetup(b.id, b.email);
      assert.ok(begun?.secret && begun.uri.startsWith("otpauth://"));
    });
  });

  describe("S4: penyamaran tidak bisa dibalik lewat pencarian", () => {
    it("awalan email tidak cocok ke email asli; email lengkap cocok persis dan dicatat; nama/kode desa tetap awalan", async () => {
      const a = await mkAdmin("s4a");
      const u = await prisma.user.create({ data: { villageId, email: `budi-rahasia-${t}@desa.test`, password: "x", name: `Zaenal Uji ${t}`, role: "staff" } });
      userIds.push(u.id);
      const search = (q: string, cookie = a.cookie) => accountsRoute.GET(req("GET", `/api/admin/accounts?q=${encodeURIComponent(q)}&villageId=${villageId}&type=staff`, undefined, cookie));
      for (const prefix of ["b", "bu", "budi", "budi-rahasia", `budi-rahasia-${t}@desa`]) {
        const d = await j(await search(prefix));
        assert.equal(d.total, 0, `awalan "${prefix}" tidak boleh mencocokkan email asli`);
      }
      const exact = await j(await search(u.email));
      assert.equal(exact.total, 1);
      assert.ok(!JSON.stringify(exact).includes(u.email));
      assert.equal((await j(await search(`zaenal uji`.replace("zaenal", "Zaenal")))).total, 1, "nama awalan tetap jalan");
      assert.equal((await j(await search(`F2${t}`))).total >= 1, true, "kode desa tetap awalan");
      const log = await audits({ actorId: a.id, action: "account.search" });
      assert.equal(log.length, 1);
      assert.equal(str(log).includes(u.email), false, "email lengkap tidak disimpan di jejak");
      assert.equal((log[0]!.metadata as any).results, 1);
    });

    it("batas 60 pencarian/menit per admin (429 + Retry-After); admin lain tidak terkena", async () => {
      const { limiterKey } = await import("../lib/mobile/rate-limit");
      const a = await mkAdmin("s4b");
      const other = await mkAdmin("s4c");
      keys.push(limiterKey("admin-account-search", a.id), limiterKey("admin-resident-search", a.id));
      const go = () => accountsRoute.GET(req("GET", "/api/admin/accounts?q=zzz", undefined, a.cookie));
      for (let i = 0; i < 60; i += 1) assert.equal((await go()).status, 200);
      const over = await go();
      assert.equal(over.status, 429);
      assert.ok(over.headers.get("retry-after"));
      assert.equal((await accountsRoute.GET(req("GET", "/api/admin/accounts?q=zzz", undefined, other.cookie))).status, 200);
    });

    it("pencarian warga dicatat tanpa kueri: nama (biasa), NIK persis (ketat); tanpa NIK di jejak", async () => {
      const a = await mkAdmin("s4d");
      const nik = `32${String(t).padStart(6, "0")}00000099`.slice(0, 16);
      await prisma.resident.create({ data: { villageId, nik, name: `Warga Cari F2 ${t}`, birthplace: "X", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", address: "Jl", phone: "081200000000" } });
      const byName = await residentsRoute.GET(req("GET", `/api/admin/accounts/residents?q=${encodeURIComponent(`Warga Cari F2 ${t}`)}`, undefined, a.cookie));
      assert.equal(byName.status, 200);
      const byNik = await residentsRoute.GET(req("GET", `/api/admin/accounts/residents?q=${nik}`, undefined, a.cookie));
      assert.equal(byNik.status, 200);
      assert.equal((await j(byNik)).residents.length, 1);
      const log = await audits({ actorId: a.id, action: "resident.search" });
      assert.equal(log.length, 2);
      assert.deepEqual(log.map((l) => (l.metadata as any).mode), ["name", "nik"]);
      const blob = str(log);
      assert.ok(!blob.includes(nik) && !blob.includes(`Warga Cari F2 ${t}`), "kueri tidak disimpan");
      assert.equal((log[1]!.metadata as any).results, 1);
    });
  });

  describe("RENDAH", () => {
    it("(a) jejak ketat: bila auditStrict gagal, deactivate/change-email/ai-credits tidak berefek", async () => {
      const u = await prisma.user.create({ data: { villageId, email: `f2-strict-${t}@desa.test`, password: "x", name: "Strict", role: "staff", aiCredits: 10 } });
      userIds.push(u.id);
      const ctxFail = { db: prisma, reason: "uji jejak ketat", audit: async () => true, auditStrict: async () => { throw new Error("audit mati"); } };
      for (const [action, body] of [["deactivate", {}], ["change-email", { newEmail: `f2-baru-${t}@desa.test` }], ["ai-credits", { set: 999 }]] as const) {
        await assert.rejects(accountsLib.runAccountAction(ctxFail as never, "staff", u.id, action, body), /audit mati/, action);
      }
      const now = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
      assert.deepEqual([now.isActive, now.email, now.aiCredits], [true, u.email, 10]);
    });

    it("(c) kredit AI atomik: 10 penambahan paralel tak saling menimpa; klem >= 0", async () => {
      const u = await prisma.user.create({ data: { villageId, email: `f2-ai-${t}@desa.test`, password: "x", name: "AI", role: "staff", aiCredits: 100 } });
      userIds.push(u.id);
      await Promise.all(Array.from({ length: 10 }, () => aiCredits.applyAiCredits(prisma, u.id, { kind: "delta", value: 5 })));
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).aiCredits, 150);
      const r = await aiCredits.applyAiCredits(prisma, u.id, { kind: "delta", value: -9_999 });
      assert.deepEqual([r?.before, r?.after], [150, 0]);
      assert.equal((await aiCredits.applyAiCredits(prisma, u.id, { kind: "set", value: 7 }))?.after, 7);
      assert.equal(await aiCredits.applyAiCredits(prisma, 999_999_999, { kind: "set", value: 1 }), null);
    });

    it("(e) admin undangan yang belum punya sandi tidak dihitung sebagai admin aktif lain", async () => {
      const actor = await mkAdmin("e-actor");
      const target = await mkAdmin("e-target");
      const invited = await svc.inviteAdmin(new Request("http://localhost/x"), { platformUserId: actor.id, email: actor.email }, { email: `f2-e-inv-${t}@f2.test`, name: "Belum Atur Sandi", reason: "uji hitungan" });
      assert.ok(invited.ok);
      if (!invited.ok) return;
      adminIds.push(invited.admin.id);
      emails.push(invited.admin.email);
      const scope = { id: { in: [target.id, invited.admin.id] } };
      const a1 = await svc.setAdminActive(new Request("http://localhost/x"), { platformUserId: actor.id, email: actor.email }, target.id, false, "uji", { scope });
      assert.equal(a1.ok, false);
      assert.equal((a1 as any).status, 409, "satu-satunya yang nyata tak boleh dinonaktifkan");
      // setelah undangan dipakai (sandi dibuat), dia dihitung
      const link = (await prisma.platformAuthToken.findFirstOrThrow({ where: { platformUserId: invited.admin.id } })).id;
      assert.ok(link);
      const fresh = await svc.sendAdminAccessLink(new Request("http://localhost/x"), { platformUserId: actor.id, email: actor.email }, invited.admin.id, "INVITE", "uji kirim ulang");
      assert.ok(fresh.ok);
      const token = new URLSearchParams(new URL((fresh as any).delivery.manualLink).hash.slice(1)).get("token")!;
      const setPw = await setPwRoute.POST(req("POST", "/api/auth/platform/atur-sandi", { token, password: "Baru123456" }, null));
      assert.equal(setPw.status, 200);
      const a2 = await svc.setAdminActive(new Request("http://localhost/x"), { platformUserId: actor.id, email: actor.email }, target.id, false, "uji", { scope });
      assert.equal(a2.ok, true);
    });

    it("(f) token atur sandi di fragmen: peek lewat POST body menampilkan status tanpa memakai token; token ngawur seragam", async () => {
      const actor = await mkAdmin("f-actor");
      const target = await mkAdmin("f-target");
      const r = await svc.sendAdminAccessLink(new Request("http://localhost/x"), { platformUserId: actor.id, email: actor.email }, target.id, "RESET", "uji peek");
      assert.ok(r.ok);
      const link = (r as any).delivery.manualLink as string;
      assert.match(link, /\/auth\/atur-sandi-admin#token=/);
      assert.ok(!new URL(link).search, "tidak ada query string");
      const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token")!;
      const peek = (body: unknown) => peekRoute.POST(req("POST", "/api/auth/platform/atur-sandi/peek", body, null));
      const ok = await j(await peek({ token }));
      assert.equal(ok.valid, true);
      assert.equal(ok.purpose, "RESET");
      assert.ok(!JSON.stringify(ok).includes(target.email), "email disamarkan");
      assert.equal((await j(await peek({ token }))).valid, true, "peek tidak memakai token");
      assert.deepEqual(await j(await peek({ token: "ngawur-ngawur-ngawur-ngawur-ngawur" })), { valid: false });
      assert.deepEqual(await j(await peek({})), { valid: false });
    });
  });
});
