/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Paket D (Keamanan & Admin Platform), handler asli + MySQL scratch: login platform dengan/ tanpa 2FA, pendaftaran/penonaktifan 2FA,
 * kode pemulihan sekali pakai, batas laju kode, kelola admin (undang -> atur sandi -> login, nonaktifkan, paksa keluar, reset),
 * ganti sandi sendiri, penampil jejak audit, dan guard 401/403.
 * Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import type { NextRequest as NextRequestType } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Keamanan & admin platform (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let NextRequest: typeof NextRequestType;
  let encode: typeof import("next-auth/jwt").encode;
  let hashPassword: typeof import("../lib/auth").hashPassword;
  let totp: typeof import("../lib/platform/totp");
  let twoFactor: typeof import("../lib/platform/admins/two-factor");
  let svc: typeof import("../lib/platform/admins/service");
  let loginRoute: typeof import("../app/api/auth/login/route");
  let statusRoute: typeof import("../app/api/admin/security/status/route");
  let setupRoute: typeof import("../app/api/admin/security/2fa/setup/route");
  let enableRoute: typeof import("../app/api/admin/security/2fa/enable/route");
  let disableRoute: typeof import("../app/api/admin/security/2fa/disable/route");
  let recoveryRoute: typeof import("../app/api/admin/security/2fa/recovery-codes/route");
  let passwordRoute: typeof import("../app/api/admin/security/password/route");
  let usersRoute: typeof import("../app/api/admin/platform-users/route");
  let userActionRoute: typeof import("../app/api/admin/platform-users/[id]/route");
  let auditRoute: typeof import("../app/api/admin/audit/route");
  let setPwRoute: typeof import("../app/api/auth/platform/atur-sandi/route");

  const SECRET = "uji-rahasia-keamanan-platform-0123456789abcdef";
  const PW = "Sandi12345";
  const t = Date.now() % 1e6;
  let ipN = 0;
  const nextIp = () => `10.31.${t % 250}.${++ipN % 250}.${Math.floor(ipN / 250)}`.replace(/\.(\d+)\.(\d+)$/, ".$1");
  const createdIds: number[] = [];
  const emailsToClean: string[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (cond: () => Promise<boolean>, ms = 4000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await cond()) return true;
      await sleep(50);
    }
    return false;
  };

  type Admin = { id: number; email: string; name: string };
  const email = (k: string) => `${k}-${t}@pltf.test`;

  async function mkAdmin(k: string, o: { password?: string; role?: string; active?: boolean } = {}): Promise<Admin & { cookie: string }> {
    const e = email(k);
    emailsToClean.push(e);
    const u = await prisma.platformUser.create({
      data: { email: e, name: `Admin ${k}`, password: await hashPassword(o.password ?? PW), role: o.role ?? "platform_admin", isActive: o.active ?? true },
    });
    createdIds.push(u.id);
    return { id: u.id, email: u.email, name: u.name, cookie: await cookieFor(u, u.role) };
  }
  async function cookieFor(u: { id: number; email: string; sessionVersion?: number }, role = "platform_admin", sv?: number) {
    return encode({ secret: SECRET, token: { sub: `pl:${u.id}`, id: `pl:${u.id}`, accountType: "platform", role, email: u.email, name: "P", sv: sv ?? u.sessionVersion ?? 0 } });
  }
  /** Akun dengan 2FA aktif langsung lewat DB (tanpa mengonsumsi langkah TOTP). */
  async function mk2faAdmin(k: string) {
    const a = await mkAdmin(k);
    const secret = totp.generateTotpSecret();
    const { codes, hashes } = totp.generateRecoveryCodes();
    await prisma.platformUser.update({ where: { id: a.id }, data: { totpSecretEnc: totp.encryptTotpSecret(secret, totp.totpAad(a.id)), totpEnabledAt: new Date(), recoveryCodeHashes: hashes as never } });
    return { ...a, secret, recovery: codes };
  }
  const codeAt = (secret: string, offset = 0) => totp.hotp(totp.base32Decode(secret), totp.totpStep(Date.now()) + offset);
  const wrongCode = (secret: string) => {
    const ok = new Set([-2, -1, 0, 1, 2].map((d) => codeAt(secret, d)));
    let n = 111111;
    while (ok.has(String(n))) n++;
    return String(n);
  };

  const req = (method: string, url: string, body?: unknown, cookie?: string | null, ip = nextIp()) =>
    new NextRequest(`http://localhost${url}`, {
      method,
      headers: { "content-type": "application/json", "x-real-ip": ip, "x-forwarded-for": ip, ...(cookie ? { cookie: `next-auth.session-token=${cookie}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const j = async (r: Response) => (await r.json()) as Record<string, any>;
  const login = (e: string, password: string, totpCode?: string, ip = nextIp()) => loginRoute.POST(req("POST", "/api/auth/login", { email: e, password, ...(totpCode !== undefined ? { totpCode } : {}) }, null, ip));
  const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
  const act = (cookie: string | null, id: number | string, body: Record<string, unknown>) => userActionRoute.POST(req("POST", `/api/admin/platform-users/${id}`, body, cookie), ctx(id));
  const dump = (v: unknown) => JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x));
  const auditRows = (where: Record<string, unknown>) => prisma.platformAuditLog.findMany({ where: where as never, orderBy: { id: "asc" } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    process.env.NEXT_PUBLIC_SITE_URL = "https://klandesa.com";
    delete process.env.NEXTAUTH_URL;
    delete process.env.APP_PUBLIC_URL;
    delete process.env.BREVO_API_KEY;
    delete process.env.PLATFORM_TOTP_KEY;
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    ({ encode } = await import("next-auth/jwt"));
    ({ hashPassword } = await import("../lib/auth"));
    totp = await import("../lib/platform/totp");
    twoFactor = await import("../lib/platform/admins/two-factor");
    svc = await import("../lib/platform/admins/service");
    loginRoute = await import("../app/api/auth/login/route");
    statusRoute = await import("../app/api/admin/security/status/route");
    setupRoute = await import("../app/api/admin/security/2fa/setup/route");
    enableRoute = await import("../app/api/admin/security/2fa/enable/route");
    disableRoute = await import("../app/api/admin/security/2fa/disable/route");
    recoveryRoute = await import("../app/api/admin/security/2fa/recovery-codes/route");
    passwordRoute = await import("../app/api/admin/security/password/route");
    usersRoute = await import("../app/api/admin/platform-users/route");
    userActionRoute = await import("../app/api/admin/platform-users/[id]/route");
    auditRoute = await import("../app/api/admin/audit/route");
    setPwRoute = await import("../app/api/auth/platform/atur-sandi/route");
  });

  after(async () => {
    await prisma.platformAuditLog.deleteMany({ where: { OR: [{ actorEmail: { in: emailsToClean } }, { actorId: { in: createdIds } }, { targetId: { in: createdIds.map(String) }, targetType: "platform_user" }] } });
    await prisma.platformUser.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  describe("login platform", () => {
    it("tanpa 2FA tetap jalan (bentuk respons lama) + jejak admin.login; sandi salah = pesan seragam + jejak admin.login_failed", async () => {
      const a = await mkAdmin("l1");
      const res = await login(a.email, PW);
      assert.equal(res.status, 200);
      const body = await j(res);
      assert.equal(body.accountType, "platform");
      assert.equal(body.user.platformUserId, a.id);
      assert.equal(body.user.sessionVersion, 0);
      assert.ok(body.accessToken && body.refreshToken);
      assert.equal(typeof (await prisma.platformUser.findUnique({ where: { id: a.id } }))?.lastLogin?.getTime(), "number");
      const ok = await auditRows({ actorId: a.id, action: "admin.login" });
      assert.equal(ok.length, 1);
      assert.equal((ok[0]!.metadata as { method: string }).method, "password");

      const bad = await login(a.email, "SalahSalah1");
      const ghost = await login(`hantu-${t}@pltf.test`, "SalahSalah1");
      assert.equal(bad.status, 401);
      assert.equal(ghost.status, 401);
      assert.deepEqual(await j(bad), await j(ghost));
      assert.ok(await waitFor(async () => (await auditRows({ actorId: a.id, action: "admin.login_failed" })).length === 1), "kegagalan tercatat (di latar)");
    });

    it("dengan 2FA: sandi benar tanpa kode = TOTP_REQUIRED (bukan masuk); sandi salah/email asing tetap pesan seragam", async () => {
      const a = await mk2faAdmin("l2");
      const noCode = await login(a.email, PW);
      assert.equal(noCode.status, 401);
      const b = await j(noCode);
      assert.equal(b.code, "TOTP_REQUIRED");
      assert.equal(b.accessToken, undefined);
      assert.equal((await login(a.email, PW, "")).status, 401);
      assert.equal((await login(a.email, PW, "   ")).status, 401);

      const wrongPw = await j(await login(a.email, "SalahSalah1"));
      const ghost = await j(await login(`hantu2-${t}@pltf.test`, "SalahSalah1"));
      assert.deepEqual(wrongPw, ghost);
      assert.equal(wrongPw.code, undefined);
    });

    it("kode salah ditolak seragam; kode benar masuk; kode yang sama tak bisa dipakai ulang", async () => {
      const a = await mk2faAdmin("l3");
      const wrong = await login(a.email, PW, wrongCode(a.secret));
      assert.equal(wrong.status, 401);
      assert.equal((await j(wrong)).code, "TOTP_INVALID");
      assert.equal((await login(a.email, PW, "abcdef")).status, 401);

      const good = codeAt(a.secret, 0);
      const ok = await login(a.email, PW, good);
      assert.equal(ok.status, 200);
      assert.equal((await j(ok)).accountType, "platform");
      const replay = await login(a.email, PW, good);
      assert.equal(replay.status, 401, "kode yang sama pada langkah yang sama ditolak");
      assert.equal((await j(replay)).code, "TOTP_INVALID");
      // spasi di tengah diterima untuk kode langkah lain yang belum dipakai
      const next = codeAt(a.secret, 1);
      assert.equal((await login(a.email, PW, `${next.slice(0, 3)} ${next.slice(3)}`)).status, 200);
      const rows = await auditRows({ actorId: a.id, action: "admin.login" });
      assert.deepEqual(rows.map((r) => (r.metadata as { method: string }).method), ["totp", "totp"]);
    });

    it("kode pemulihan: sekali pakai, tercatat, sisa berkurang", async () => {
      const a = await mk2faAdmin("l4");
      const code = a.recovery[0]!;
      const ok = await login(a.email, PW, code.toLowerCase());
      assert.equal(ok.status, 200);
      assert.equal((await login(a.email, PW, code)).status, 401, "kode pemulihan yang sama tak bisa dipakai lagi");
      assert.equal((await login(a.email, PW, a.recovery[1]!)).status, 200);
      const row = await prisma.platformUser.findUnique({ where: { id: a.id }, select: { recoveryCodeHashes: true } });
      assert.equal((row!.recoveryCodeHashes as string[]).length, 8);
      const rows = await auditRows({ actorId: a.id, action: "admin.login" });
      assert.deepEqual(rows.map((r) => (r.metadata as { method: string; recoveryCodesLeft: number }).recoveryCodesLeft), [9, 8]);
    });

    it("kode pemulihan dipakai bersamaan: tepat satu menang", async () => {
      const a = await mk2faAdmin("l5");
      const code = a.recovery[0]!;
      const rs = await Promise.all([1, 2, 3, 4].map(() => login(a.email, PW, code)));
      assert.equal(rs.filter((r) => r.status === 200).length, 1, rs.map((r) => r.status).join(","));
    });

    it("batas laju: 5 kode salah mengunci admin; setelah itu bahkan kode benar ditolak 429", async () => {
      const a = await mk2faAdmin("l6");
      for (let i = 0; i < 5; i++) assert.equal((await login(a.email, PW, wrongCode(a.secret))).status, 401);
      const locked = await login(a.email, PW, codeAt(a.secret, 0));
      assert.equal(locked.status, 429);
      assert.equal((await j(locked)).code, "RATE_LIMITED");
      assert.ok(Number(locked.headers.get("Retry-After")) > 0);
      // kunci tidak membocorkan apa pun ke yang tidak tahu sandi
      const noPw = await login(a.email, "SalahSalah1");
      assert.equal(noPw.status, 401);
      assert.equal((await j(noPw)).code, undefined);
      assert.ok(await waitFor(async () => (await auditRows({ actorId: a.id, action: "admin.login_failed" })).length >= 5));
    });

    it("batas laju per IP: banyak admin dari satu IP yang sama ikut terkunci", async () => {
      const ip = nextIp();
      const admins = await Promise.all(["ip1", "ip2", "ip3"].map(mk2faAdmin));
      for (const a of admins) for (let i = 0; i < 4; i++) assert.equal((await login(a.email, PW, wrongCode(a.secret), ip)).status, 401);
      const victim = await mk2faAdmin("ip4");
      const r = await login(victim.email, PW, codeAt(victim.secret, 0), ip);
      assert.equal(r.status, 429);
      assert.equal((await login(victim.email, PW, codeAt(victim.secret, 0), nextIp())).status, 200, "IP lain tidak terdampak");
    });

    it("akun nonaktif: sandi benar -> 403 (tanpa meminta kode); cabang desa tidak terpengaruh", async () => {
      const a = await mkAdmin("l7", { active: false });
      assert.equal((await login(a.email, PW)).status, 403);
      const v = await prisma.village.create({ data: { code: `PS${t}`, name: "Desa PS", district: "k", regency: "r", province: "p", address: "a" } });
      const ue = `desa-${t}@pltf.test`;
      const u = await prisma.user.create({ data: { villageId: v.id, email: ue, password: await hashPassword(PW), name: "U", role: "admin", isActive: true } });
      const res = await login(ue, PW, "123456");
      assert.equal(res.status, 200);
      assert.equal((await j(res)).accountType, "village");
      await prisma.user.delete({ where: { id: u.id } });
      await prisma.village.delete({ where: { id: v.id } });
    });
  });

  describe("pendaftaran & pengelolaan 2FA", () => {
    it("semua rute 401 tanpa sesi", async () => {
      const calls: Array<() => Promise<Response>> = [
        () => statusRoute.GET(req("GET", "/api/admin/security/status")),
        () => setupRoute.POST(req("POST", "/x", {})),
        () => enableRoute.POST(req("POST", "/x", {})),
        () => disableRoute.POST(req("POST", "/x", {})),
        () => recoveryRoute.POST(req("POST", "/x", {})),
        () => passwordRoute.POST(req("POST", "/x", {})),
        () => usersRoute.GET(req("GET", "/x")),
        () => usersRoute.POST(req("POST", "/x", {})),
        () => userActionRoute.POST(req("POST", "/x", {}), ctx(1)),
        () => auditRoute.GET(req("GET", "/api/admin/audit")),
      ];
      for (const c of calls) assert.equal((await c()).status, 401);
    });

    it("403 tanpa step-up dan untuk peran non-admin-platform", async () => {
      const a = await mkAdmin("t0");
      const support = await mkAdmin("t0s", { role: "platform_support" });
      assert.equal((await enableRoute.POST(req("POST", "/x", { code: "123456" }, a.cookie))).status, 403);
      assert.equal((await disableRoute.POST(req("POST", "/x", {}, a.cookie))).status, 403);
      assert.equal((await recoveryRoute.POST(req("POST", "/x", {}, a.cookie))).status, 403);
      assert.equal((await passwordRoute.POST(req("POST", "/x", { newPassword: "Baru12345" }, a.cookie))).status, 403);
      assert.equal((await usersRoute.POST(req("POST", "/x", { email: "a@b.id", name: "Abc", reason: "uji uji" }, a.cookie))).status, 403);
      assert.equal((await act(a.cookie, a.id, { action: "force_logout", reason: "uji uji" })).status, 403);
      for (const c of [() => statusRoute.GET(req("GET", "/x", undefined, support.cookie)), () => usersRoute.GET(req("GET", "/x", undefined, support.cookie)), () => auditRoute.GET(req("GET", "/x", undefined, support.cookie))]) {
        assert.equal((await c()).status, 403);
      }
    });

    it("alur lengkap: setup -> enable (kode benar + sandi) -> kode pemulihan sekali lihat -> login butuh kode -> regenerasi -> nonaktifkan; semua beraudit tanpa rahasia", async () => {
      const a = await mkAdmin("t1");
      const st0 = await j(await statusRoute.GET(req("GET", "/x", undefined, a.cookie)));
      assert.equal(st0.totpEnabled, false);

      const setup = await setupRoute.POST(req("POST", "/x", {}, a.cookie));
      assert.equal(setup.status, 200);
      assert.match(setup.headers.get("cache-control") ?? "", /no-store/);
      const s = await j(setup);
      assert.match(s.secret, /^[A-Z2-7]{32}$/);
      assert.ok(String(s.uri).startsWith("otpauth://totp/Klandesa:"));
      const pend = await prisma.platformUser.findUnique({ where: { id: a.id } });
      assert.ok(pend!.totpSecretEnc?.startsWith("v1.") && !pend!.totpSecretEnc.includes(s.secret), "rahasia tersimpan terenkripsi");
      assert.equal(pend!.totpEnabledAt, null, "belum aktif sampai dikonfirmasi: login belum meminta kode");
      assert.equal((await login(a.email, PW)).status, 200);

      // kode salah / sandi salah ditolak, tidak mengaktifkan
      const bad = await enableRoute.POST(req("POST", "/x", { code: wrongCode(s.secret), confirmPassword: PW }, a.cookie));
      assert.equal(bad.status, 400);
      assert.equal((await j(bad)).code, "TOTP_INVALID");
      assert.equal((await enableRoute.POST(req("POST", "/x", { code: codeAt(s.secret), confirmPassword: "Salah12345" }, a.cookie))).status, 403);
      assert.equal((await prisma.platformUser.findUnique({ where: { id: a.id } }))!.totpEnabledAt, null);

      const en = await enableRoute.POST(req("POST", "/x", { code: codeAt(s.secret), confirmPassword: PW }, a.cookie));
      assert.equal(en.status, 200);
      const codes: string[] = (await j(en)).recoveryCodes;
      assert.equal(codes.length, 10);
      const st1 = await j(await statusRoute.GET(req("GET", "/x", undefined, a.cookie)));
      assert.equal(st1.totpEnabled, true);
      assert.equal(st1.recoveryCodesLeft, 10);
      assert.equal(JSON.stringify(st1).includes(s.secret), false);
      assert.equal((await setupRoute.POST(req("POST", "/x", {}, a.cookie))).status, 409, "tak bisa setup ulang saat aktif");
      assert.equal((await enableRoute.POST(req("POST", "/x", { code: codeAt(s.secret, 1), confirmPassword: PW }, a.cookie))).status, 409);

      // login kini menuntut kode
      assert.equal((await j(await login(a.email, PW))).code, "TOTP_REQUIRED");
      assert.equal((await login(a.email, PW, codeAt(s.secret, 1))).status, 200);

      // regenerasi: butuh kode (pemulihan #1 dipakai); kode lama hangus
      const noCode = await recoveryRoute.POST(req("POST", "/x", { confirmPassword: PW }, a.cookie));
      assert.equal(noCode.status, 400);
      const regen = await recoveryRoute.POST(req("POST", "/x", { confirmPassword: PW, code: codes[0] }, a.cookie));
      assert.equal(regen.status, 200);
      const fresh: string[] = (await j(regen)).recoveryCodes;
      assert.equal(fresh.length, 10);
      assert.equal(fresh.filter((c) => codes.includes(c)).length, 0);
      assert.equal((await login(a.email, PW, codes[1])).status, 401, "kode pemulihan lama tidak berlaku");

      // nonaktifkan: butuh sandi + kode
      assert.equal((await disableRoute.POST(req("POST", "/x", { confirmPassword: PW, code: wrongCode(s.secret) }, a.cookie))).status, 400);
      assert.equal((await prisma.platformUser.findUnique({ where: { id: a.id } }))!.totpEnabledAt != null, true);
      const dis = await disableRoute.POST(req("POST", "/x", { confirmPassword: PW, code: fresh[0] }, a.cookie));
      assert.equal(dis.status, 200);
      const after_ = await prisma.platformUser.findUnique({ where: { id: a.id } });
      assert.equal(after_!.totpSecretEnc, null);
      assert.equal(after_!.recoveryCodeHashes, null);
      assert.equal((await login(a.email, PW)).status, 200, "tanpa 2FA kembali ke sandi saja");

      const rows = await auditRows({ actorId: a.id, action: { startsWith: "admin.2fa" } });
      assert.deepEqual(rows.map((r) => r.action), ["admin.2fa_enable", "admin.2fa_recovery_regenerate", "admin.2fa_disable"]);
      const dumped = dump(await prisma.platformAuditLog.findMany({ where: { actorId: a.id } }));
      for (const secretText of [s.secret, PW, ...codes, ...fresh, pend!.totpSecretEnc!]) assert.equal(dumped.includes(secretText), false, "jejak tidak boleh memuat rahasia");
    });

    it("kode salah berulang di endpoint 2FA terkunci (dibagi dengan batas login)", async () => {
      const a = await mk2faAdmin("t2");
      for (let i = 0; i < 5; i++) assert.equal((await disableRoute.POST(req("POST", "/x", { confirmPassword: PW, code: wrongCode(a.secret) }, a.cookie))).status, 400);
      const r = await disableRoute.POST(req("POST", "/x", { confirmPassword: PW, code: codeAt(a.secret) }, a.cookie));
      assert.equal(r.status, 429);
      assert.equal((await prisma.platformUser.findUnique({ where: { id: a.id } }))!.totpEnabledAt != null, true);
    });

    it("rahasia server berganti: rahasia TOTP tak terbaca (gagal tertutup), kode pemulihan tetap bisa; skrip reset menormalkan", async () => {
      const a = await mk2faAdmin("t3");
      // simulasi: rahasia tersimpan dienkripsi dengan kunci lain
      const other = totp.deriveTotpKey("rahasia-lama-yang-sudah-diganti-xxxxxxxxxxxxxxxx");
      await prisma.platformUser.update({ where: { id: a.id }, data: { totpSecretEnc: totp.encryptTotpSecret(a.secret, totp.totpAad(a.id), other) } });
      assert.equal((await login(a.email, PW, codeAt(a.secret))).status, 401);
      assert.equal((await login(a.email, PW, a.recovery[0])).status, 200);
      await twoFactor.clearTotp(a.id, { revokeSessions: true });
      assert.equal((await login(a.email, PW)).status, 200);
    });
  });

  describe("kelola admin platform", () => {
    it("daftar: tanpa hash/rahasia, berbatas, memuat status 2FA", async () => {
      const a = await mkAdmin("m0");
      const b = await mk2faAdmin("m0b");
      const res = await usersRoute.GET(req("GET", "/x", undefined, a.cookie));
      assert.equal(res.status, 200);
      const body = await j(res);
      assert.ok(body.admins.length <= 100);
      const row = body.admins.find((x: any) => x.id === b.id);
      assert.equal(row.totpEnabled, true);
      assert.equal(row.isActive, true);
      assert.equal(body.me, a.id);
      const raw = JSON.stringify(body);
      for (const k of ["password", "totpSecretEnc", "recoveryCodeHashes", "sessionVersion"]) assert.equal(raw.includes(k), false, k);
    });

    it("undang -> (email gagal: tautan manual sekali) -> atur sandi -> login; token sekali pakai; sandi lemah tak menghanguskan tautan", async () => {
      const a = await mkAdmin("m1");
      const inviteEmail = email("baru1");
      emailsToClean.push(inviteEmail);
      const base = { email: inviteEmail, name: "Admin Baru", reason: "staf operasional", confirmPassword: PW };
      assert.equal((await usersRoute.POST(req("POST", "/x", { ...base, reason: "x" }, a.cookie))).status, 400);
      assert.equal((await usersRoute.POST(req("POST", "/x", { ...base, email: "ngawur" }, a.cookie))).status, 400);
      assert.equal((await usersRoute.POST(req("POST", "/x", { ...base, email: a.email }, a.cookie))).status, 409, "email admin lain/akun mana pun ditolak");

      const res = await usersRoute.POST(req("POST", "/x", base, a.cookie));
      assert.equal(res.status, 201);
      const body = await j(res);
      assert.equal(body.delivery.sent, false);
      assert.match(body.delivery.manualLink, /\/auth\/atur-sandi-admin#token=/);
      assert.ok(!body.delivery.manualLink.includes("?token="), "token di fragmen, bukan query string");
      createdIds.push(body.admin.id);
      const token = new URLSearchParams(new URL(body.delivery.manualLink).hash.slice(1)).get("token")!;
      assert.equal(JSON.stringify(body).includes("password"), false);

      // belum punya sandi usable
      assert.equal((await login(inviteEmail, PW)).status, 401);
      assert.equal((await login(inviteEmail, "")).status, 400);
      const tok = await prisma.platformAuthToken.findMany({ where: { platformUserId: body.admin.id } });
      assert.equal(tok.length, 1);
      assert.equal(tok[0]!.purpose, "INVITE");
      assert.notEqual(tok[0]!.tokenHash, token, "hanya hash yang tersimpan");
      assert.equal(tok[0]!.createdByPlatformUserId, a.id);

      // sandi lemah: 400 dan tautan masih hidup; token ngawur 400
      const setPw = (tk: string, password: string) => setPwRoute.POST(req("POST", "/api/auth/platform/atur-sandi", { token: tk, password }));
      assert.equal((await setPw(token, "pendek")).status, 400);
      assert.equal((await setPw(token, "hanyahuruf")).status, 400);
      assert.equal((await setPw("ngawur-ngawur-ngawur-ngawur-ngawur", "Baru123456")).status, 400);
      assert.equal((await setPw(token, "Baru123456")).status, 200);
      assert.equal((await setPw(token, "Baru123456")).status, 400, "sekali pakai");
      const ok = await login(inviteEmail, "Baru123456");
      assert.equal(ok.status, 200);
      assert.equal((await j(ok)).user.sessionVersion, 1, "sesi lama dicabut (sessionVersion naik)");

      const rows = await auditRows({ targetType: "platform_user", targetId: String(body.admin.id) });
      assert.deepEqual(rows.map((r) => r.action).filter((x) => !x.startsWith("admin.login")), ["admin.invite", "admin.password_change"]);
      const dumped = dump(rows);
      assert.equal(dumped.includes(token), false);
      assert.equal(dumped.includes("Baru123456"), false);
      assert.equal(dumped.includes("atur-sandi-admin"), false);
    });

    it("undangan lewat Brevo: email terkirim ke penerima dan tautan TIDAK dikembalikan", async () => {
      process.env.BREVO_API_KEY = "kunci-uji";
      process.env.BREVO_SENDER_EMAIL = "noreply@klandesa.test";
      const realFetch = globalThis.fetch;
      const sent: Array<{ to: string; html: string }> = [];
      globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
        const b = JSON.parse(String(init?.body ?? "{}"));
        sent.push({ to: b.to?.[0]?.email, html: b.htmlContent });
        return new Response("{}", { status: 201 });
      }) as typeof fetch;
      try {
        const a = await mkAdmin("m2");
        const e = email("baru2");
        emailsToClean.push(e);
        const res = await usersRoute.POST(req("POST", "/x", { email: e, name: "Admin Dua", reason: "uji kirim email", confirmPassword: PW }, a.cookie));
        assert.equal(res.status, 201);
        const body = await j(res);
        createdIds.push(body.admin.id);
        assert.equal(body.delivery.sent, true);
        assert.equal(body.delivery.manualLink, undefined);
        assert.equal(sent.length, 1);
        assert.equal(sent[0]!.to, e);
        assert.match(sent[0]!.html, /atur-sandi-admin#token=/);
      } finally {
        globalThis.fetch = realFetch;
        delete process.env.BREVO_API_KEY;
        delete process.env.BREVO_SENDER_EMAIL;
      }
    });

    it("nonaktifkan: diri sendiri ditolak; admin lain: sesinya mati, tak bisa login, aktifkan kembali; beraudit", async () => {
      const a = await mkAdmin("m3");
      const b = await mkAdmin("m3b");
      const self = await act(a.cookie, a.id, { action: "deactivate", reason: "uji diri", confirmPassword: PW });
      assert.equal(self.status, 400);
      assert.equal((await prisma.platformUser.findUnique({ where: { id: a.id } }))!.isActive, true);

      assert.equal((await act(a.cookie, b.id, { action: "deactivate", reason: "x", confirmPassword: PW })).status, 400, "alasan wajib");
      assert.equal((await act(a.cookie, b.id, { action: "deactivate", reason: "keluar tim", confirmPassword: "Salah12345" })).status, 403);
      assert.equal((await act(a.cookie, b.id, { action: "deactivate", reason: "keluar tim", confirmPassword: PW })).status, 200);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, b.cookie))).status, 401, "sesi admin nonaktif langsung mati");
      assert.equal((await login(b.email, PW)).status, 403);
      assert.equal((await act(a.cookie, b.id, { action: "deactivate", reason: "keluar tim", confirmPassword: PW })).status, 409);
      assert.equal((await act(a.cookie, b.id, { action: "activate", reason: "kembali bertugas", confirmPassword: PW })).status, 200);
      assert.equal((await login(b.email, PW)).status, 200);
      const rows = await auditRows({ actorId: a.id, targetId: String(b.id) });
      assert.deepEqual(rows.map((r) => r.action), ["admin.deactivate", "admin.activate"]);
      assert.equal((rows[0]!.metadata as { reason: string }).reason, "keluar tim");
    });

    it("admin aktif TERAKHIR tak bisa dinonaktifkan (aturan #8, hitungan dikunci dalam transaksi); id tidak ada 404; aksi/id ngawur 400", async () => {
      // Himpunan uji dipersempit ke email unik agar admin aktif milik tes/agen lain di DB bersama tidak ikut terhitung.
      const scope = { email: { endsWith: `-${t}-last@pltf.test` } };
      const mk = async (k: string, active: boolean) => {
        const e = `${k}-${t}-last@pltf.test`;
        emailsToClean.push(e);
        const u = await prisma.platformUser.create({ data: { email: e, name: k, password: "x", isActive: active } });
        createdIds.push(u.id);
        return u;
      };
      const solo = await mk("solo", true);
      await mk("sudah-nonaktif", false);
      const ghostActor = { platformUserId: -1, email: `uji-${t}@pltf.test` };
      emailsToClean.push(ghostActor.email);
      const r1 = await svc.setAdminActive(req("POST", "/x"), ghostActor, solo.id, false, "uji terakhir", { scope });
      assert.equal(r1.ok, false);
      assert.equal((r1 as { status: number }).status, 409);
      assert.match((r1 as { error: string }).error, /terakhir/);
      assert.equal((await prisma.platformUser.findUnique({ where: { id: solo.id } }))!.isActive, true);

      const second = await mk("kedua", true);
      const r2 = await svc.setAdminActive(req("POST", "/x"), ghostActor, solo.id, false, "uji dua admin", { scope });
      assert.equal(r2.ok, true, "ada admin aktif lain -> boleh");
      const r3 = await svc.setAdminActive(req("POST", "/x"), ghostActor, second.id, false, "uji terakhir lagi", { scope });
      assert.equal(r3.ok, false, "kini second adalah yang terakhir");
      assert.equal((await prisma.platformUser.findUnique({ where: { id: second.id } }))!.isActive, true);

      const a = await mkAdmin("m4b");
      assert.equal((await act(a.cookie, 99999999, { action: "force_logout", reason: "uji uji", confirmPassword: PW })).status, 404);
      assert.equal((await act(a.cookie, "abc", { action: "force_logout", reason: "uji uji", confirmPassword: PW })).status, 400);
      assert.equal((await act(a.cookie, a.id, { action: "hapus", reason: "uji uji", confirmPassword: PW })).status, 400);
    });

    it("paksa keluar: sessionVersion naik, cookie lama 401, login baru sah; diri sendiri juga boleh", async () => {
      const a = await mkAdmin("m6");
      const b = await mkAdmin("m6b");
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, b.cookie))).status, 200);
      assert.equal((await act(a.cookie, b.id, { action: "force_logout", reason: "perangkat hilang", confirmPassword: PW })).status, 200);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, b.cookie))).status, 401);
      const fresh = await cookieFor({ id: b.id, email: b.email }, "platform_admin", 1);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, fresh))).status, 200);
      assert.equal((await act(a.cookie, a.id, { action: "force_logout", reason: "keluar semua perangkat", confirmPassword: PW })).status, 200);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, a.cookie))).status, 401);
      assert.equal((await auditRows({ actorId: a.id, action: "admin.force_logout" })).length, 2);
    });

    it("kirim tautan atur ulang sandi: tautan manual sekali, token lama dicabut, sandi lama tetap berlaku sampai dipakai; tautan tak muncul di jejak", async () => {
      const a = await mkAdmin("m7");
      const b = await mkAdmin("m7b");
      const r1 = await j(await act(a.cookie, b.id, { action: "reset_link", reason: "lupa sandi", confirmPassword: PW }));
      const r2 = await j(await act(a.cookie, b.id, { action: "reset_link", reason: "lupa sandi lagi", confirmPassword: PW }));
      const t1 = new URLSearchParams(new URL(r1.delivery.manualLink).hash.slice(1)).get("token")!;
      const t2 = new URLSearchParams(new URL(r2.delivery.manualLink).hash.slice(1)).get("token")!;
      const setPw = (tk: string) => setPwRoute.POST(req("POST", "/x", { token: tk, password: "Pulih123456" }));
      assert.equal((await setPw(t1)).status, 400, "tautan lama dicabut oleh penerbitan baru");
      assert.equal((await login(b.email, PW)).status, 200);
      assert.equal((await setPw(t2)).status, 200);
      assert.equal((await login(b.email, PW)).status, 401);
      assert.equal((await login(b.email, "Pulih123456")).status, 200);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, b.cookie))).status, 401, "sesi lama dicabut");
      const dumped = dump(await prisma.platformAuditLog.findMany({ where: { targetId: String(b.id), targetType: "platform_user" } }));
      assert.equal(dumped.includes(t1) || dumped.includes(t2) || dumped.includes("Pulih123456"), false);
      // admin nonaktif tidak mendapat tautan
      await prisma.platformUser.update({ where: { id: b.id }, data: { isActive: false } });
      assert.equal((await act(a.cookie, b.id, { action: "reset_link", reason: "uji nonaktif", confirmPassword: PW })).status, 409);
      assert.equal((await setPw(t2)).status, 400);
    });

    it("tautan kedaluwarsa ditolak; akun nonaktif tak bisa mengatur sandi", async () => {
      const b = await mkAdmin("m8");
      const { token } = await (await import("../lib/platform/admins/tokens")).issuePlatformToken(prisma, { platformUserId: b.id, purpose: "RESET", ttlMs: -1000 });
      assert.equal((await setPwRoute.POST(req("POST", "/x", { token, password: "Pulih123456" }))).status, 400);
      const { token: t2 } = await (await import("../lib/platform/admins/tokens")).issuePlatformToken(prisma, { platformUserId: b.id, purpose: "RESET", ttlMs: 60_000 });
      await prisma.platformUser.update({ where: { id: b.id }, data: { isActive: false } });
      assert.equal((await setPwRoute.POST(req("POST", "/x", { token: t2, password: "Pulih123456" }))).status, 403);
    });

    it("reset 2FA admin lain: butuh step-up+alasan, menghapus 2FA, mencabut sesi, beraudit; diri sendiri/akun tanpa 2FA ditolak; login lagi tanpa kode", async () => {
      const a = await mkAdmin("m9");
      const b = await mk2faAdmin("m9b");
      assert.equal((await act(a.cookie, a.id, { action: "reset_2fa", reason: "uji diri", confirmPassword: PW })).status, 400);
      assert.equal((await act(a.cookie, b.id, { action: "reset_2fa", reason: "x", confirmPassword: PW })).status, 400);
      assert.equal((await act(a.cookie, b.id, { action: "reset_2fa", reason: "kehilangan ponsel", confirmPassword: PW })).status, 200);
      const row = await prisma.platformUser.findUnique({ where: { id: b.id } });
      assert.equal(row!.totpEnabledAt, null);
      assert.equal(row!.totpSecretEnc, null);
      assert.equal(row!.sessionVersion, 1);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, b.cookie))).status, 401);
      assert.equal((await login(b.email, PW)).status, 200);
      assert.equal((await act(a.cookie, b.id, { action: "reset_2fa", reason: "kehilangan ponsel", confirmPassword: PW })).status, 409);
      const ra = await auditRows({ actorId: a.id, action: "admin.2fa_reset" });
      assert.equal(ra.length, 1);
      assert.equal(ra[0]!.targetId, String(b.id));
    });
  });

  describe("ganti sandi sendiri", () => {
    it("sandi lama salah 403; sandi lemah/sama 400; berhasil mencabut sesi & beraudit; 2FA aktif menuntut kode", async () => {
      const a = await mkAdmin("p1");
      const post = (body: Record<string, unknown>) => passwordRoute.POST(req("POST", "/x", body, a.cookie));
      assert.equal((await post({ currentPassword: "Salah12345", newPassword: "Baru1234567" })).status, 403);
      assert.equal((await post({ currentPassword: PW, newPassword: "pendek" })).status, 400);
      assert.equal((await post({ currentPassword: PW, newPassword: "hurufsajasaja" })).status, 400);
      assert.equal((await post({ currentPassword: PW, newPassword: PW })).status, 400);
      const ok = await post({ currentPassword: PW, newPassword: "Baru1234567" });
      assert.equal(ok.status, 200);
      assert.equal((await j(ok)).signedOut, true);
      assert.equal((await statusRoute.GET(req("GET", "/x", undefined, a.cookie))).status, 401);
      assert.equal((await login(a.email, PW)).status, 401);
      assert.equal((await login(a.email, "Baru1234567")).status, 200);
      const rows = await auditRows({ actorId: a.id, action: "admin.password_change" });
      assert.equal(rows.length, 1);
      assert.equal(dump(rows).includes("Baru1234567"), false);

      const b = await mk2faAdmin("p2");
      const pb = (body: Record<string, unknown>) => passwordRoute.POST(req("POST", "/x", body, b.cookie));
      assert.equal((await pb({ currentPassword: PW, newPassword: "Baru1234567" })).status, 400, "tanpa kode 2FA ditolak");
      assert.equal((await pb({ currentPassword: PW, newPassword: "Baru1234567", totpCode: codeAt(b.secret) })).status, 200);
    });
  });

  describe("penampil jejak audit", () => {
    it("memfilter, berbatas 100, kursor tanpa tumpang tindih, validasi input, metadata disamarkan", async () => {
      const a = await mkAdmin("a1");
      const marker = `audit-uji-${t}`;
      const data = Array.from({ length: 130 }, (_, i) => ({
        actorId: a.id,
        actorEmail: a.email,
        action: i % 2 ? "village.subscription_extend" : "account.reset_link",
        targetType: "village",
        targetId: i === 0 ? marker : String(i),
        villageId: 777000 + (i % 3),
        summary: `uji ${i}`,
        metadata: i === 1 ? { reason: "x", password: "RAHASIA", resetLink: "https://x/y", nested: { token: "T" } } : { reason: "ok" },
      }));
      await prisma.platformAuditLog.createMany({ data });

      const get = (qs: string) => auditRoute.GET(req("GET", `/api/admin/audit?${qs}`, undefined, a.cookie));
      const big = await j(await get(`actorId=${a.id}&limit=1000`));
      assert.equal(big.items.length, 100);
      assert.ok(big.nextCursor);
      const p2 = await j(await get(`actorId=${a.id}&limit=1000&cursor=${big.nextCursor}`));
      const ids1 = new Set(big.items.map((x: any) => x.id));
      assert.ok(p2.items.every((x: any) => !ids1.has(x.id)), "tanpa tumpang tindih");
      assert.ok(BigInt(p2.items[0].id) < BigInt(big.items[big.items.length - 1].id), "urut id turun");
      assert.equal(big.items.length + p2.items.length >= 130, true);

      const byAction = await j(await get(`actorId=${a.id}&action=village.subscription_extend&limit=100`));
      assert.ok(byAction.items.length > 0 && byAction.items.every((x: any) => x.action === "village.subscription_extend"));
      const byPrefix = await j(await get(`actorId=${a.id}&action=account.&limit=100`));
      assert.ok(byPrefix.items.every((x: any) => x.action.startsWith("account.")));
      const byVillage = await j(await get(`villageId=777001&actorId=${a.id}&limit=100`));
      assert.ok(byVillage.items.length > 0 && byVillage.items.every((x: any) => x.villageId === 777001));
      const byQ = await j(await get(`q=${marker}`));
      assert.equal(byQ.items.length, 1);
      assert.equal(byQ.items[0].targetId, marker);
      const byEmail = await j(await get(`q=${a.email.slice(0, 12)}&limit=5`));
      assert.ok(byEmail.items.length > 0);
      const byDate = await j(await get(`actorId=${a.id}&from=2000-01-01&to=2000-01-02`));
      assert.equal(byDate.items.length, 0);
      const byType = await j(await get(`actorId=${a.id}&targetType=village&limit=3`));
      assert.equal(byType.items.length, 3);

      const redacted = await j(await get(`actorId=${a.id}&limit=100`));
      const withSecret = [...redacted.items, ...p2.items].find((x: any) => x.summary === "uji 1");
      assert.equal(withSecret.metadata.password, "[disamarkan]");
      assert.equal(withSecret.metadata.resetLink, "[disamarkan]");
      assert.equal(withSecret.metadata.nested.token, "[disamarkan]");
      assert.equal(withSecret.metadata.reason, "x");
      assert.equal(JSON.stringify(redacted).includes("RAHASIA"), false);

      for (const bad of ["actorId=abc", "action=Drop%20Table", "targetType=ngawur", "villageId=-1", "cursor=abc", "from=kemarin", "action=" + "a".repeat(81)]) {
        assert.equal((await get(bad)).status, 400, bad);
      }
      await prisma.platformAuditLog.deleteMany({ where: { actorId: a.id } });
    });
  });
});
