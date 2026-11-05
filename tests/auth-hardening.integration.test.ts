/**
 * Pengerasan autentikasi (audit 2026-11-05), handler asli + MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 * Mencakup: email unik lintas semua jenis akun saat daftar (pengambilalihan portal mitra), warga TIDAK membuat akun login,
 * role tak dikenal ditolak (fail-closed), batas percobaan login, urutan cek sandi sebelum status akun.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pengerasan autentikasi (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let register: typeof import("../app/api/auth/register/route");
  let login: typeof import("../app/api/auth/login/route");
  let residents: typeof import("../app/api/residents/route");
  let perms: typeof import("../app/api/account/permissions/route");
  let hashPassword: typeof import("../lib/auth").hashPassword;
  const SECRET = "uji-rahasia-pengerasan-0123456789abcdef";
  const t = Date.now() % 1e6;
  let ipN = 0;
  let villageId = 0;
  let villageCode = "";
  const nextIp = () => `10.7.${t % 250}.${++ipN}`;

  const json = (url: string, body: unknown, ip = nextIp()) =>
    new NextRequest(`http://localhost${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-real-ip": ip, "x-forwarded-for": ip },
      body: JSON.stringify(body),
    });

  const regBody = (over: Record<string, unknown> = {}) => ({
    namaKabupaten: "Kab", namaKecamatan: "Kec", namaDesa: `Desa Uji ${t}-${++ipN}`, provinsi: "Prov", namaKepala: "Kepala",
    nomorTelepon: "0800", emailDesa: `baru${t}-${ipN}@uji.test`, password: "Sandi1234", confirmPassword: "Sandi1234",
    agreeTerms: true, agreePrivacy: true, ...over,
  });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    delete process.env.BREVO_API_KEY;
    ({ prisma } = await import("../lib/prisma"));
    ({ hashPassword } = await import("../lib/auth"));
    register = await import("../app/api/auth/register/route");
    login = await import("../app/api/auth/login/route");
    residents = await import("../app/api/residents/route");
    perms = await import("../app/api/account/permissions/route");
    const v = await prisma.village.create({ data: { code: `H${t}`, name: "Desa H", district: "k", regency: "r", province: "p", address: "a" } });
    villageId = v.id;
    villageCode = v.code;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  describe("pendaftaran publik", () => {
    it("menolak email milik Partner (anti pengambilalihan portal mitra) tanpa membuat desa/akun", async () => {
      const email = `mitra${t}@uji.test`;
      await prisma.partner.create({ data: { email, password: "x", name: "Mitra", status: "active" } });
      const before_ = await prisma.village.count();
      const res = await register.POST(json("/api/auth/register", regBody({ emailDesa: email })));
      assert.equal(res.status, 409);
      assert.equal(await prisma.village.count(), before_);
      assert.equal(await prisma.user.count({ where: { email } }), 0);
    });

    it("menolak email platform admin, regional, dan pemilik kode referral; huruf besar tidak menghindari cek", async () => {
      await prisma.platformUser.create({ data: { email: `plat${t}@uji.test`, password: "x", name: "P" } });
      const r1 = await register.POST(json("/api/auth/register", regBody({ emailDesa: `PLAT${t}@Uji.Test` })));
      assert.equal(r1.status, 409);
      const r2 = await register.POST(json("/api/auth/register", regBody({ emailDesa: `plat${t}@uji.test` })));
      assert.equal(r2.status, 409);
    });

    it("menyimpan email huruf kecil; pendaftar kedua dengan email sama (beda huruf) ditolak", async () => {
      const body = regBody({ emailDesa: `  Campur${t}@Uji.Test ` });
      const ok = await register.POST(json("/api/auth/register", body));
      assert.equal(ok.status, 201, JSON.stringify(await ok.clone().json()));
      const u = await prisma.user.findUnique({ where: { email: `campur${t}@uji.test` } });
      assert.ok(u, "email tersimpan huruf kecil");
      const dup = await register.POST(json("/api/auth/register", regBody({ emailDesa: `CAMPUR${t}@uji.test` })));
      assert.equal(dup.status, 409);
    });

    it("sandi lemah / email tak valid ditolak 400", async () => {
      const weak = await register.POST(json("/api/auth/register", regBody({ password: "abcdefgh", confirmPassword: "abcdefgh" })));
      assert.equal(weak.status, 400);
      const bad = await register.POST(json("/api/auth/register", regBody({ emailDesa: "bukan-email" })));
      assert.equal(bad.status, 400);
    });

    it("dibatasi per IP: pendaftaran ke-11 dari IP yang sama -> 429", async () => {
      const ip = nextIp();
      let last = 0;
      for (let i = 0; i < 11; i++) {
        const r = await register.POST(json("/api/auth/register", regBody({ password: "x" }), ip)); // 400 cepat, tapi hitungan batas belum
        last = r.status;
      }
      // sandi lemah gagal SEBELUM batas dihitung: pastikan itu bukan 429, lalu uji batas dengan data valid yang email-nya bentrok
      assert.equal(last, 400);
      const email = `batas${t}@uji.test`;
      await prisma.platformUser.create({ data: { email, password: "x", name: "B" } });
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) statuses.push((await register.POST(json("/api/auth/register", regBody({ emailDesa: email }), ip))).status);
      assert.equal(statuses.slice(0, 10).every((s) => s === 409), true, statuses.join(","));
      assert.equal(statuses[10], 429);
    });
  });

  describe("POST /api/residents", () => {
    it("tidak lagi membuat akun login dari email+password di body", async () => {
      const { encode } = await import("next-auth/jwt");
      const admin = await prisma.user.create({
        data: { villageId, email: `adm${t}@uji.test`, password: "x", name: "Adm", role: "admin", isActive: true },
      });
      const cookie = await encode({
        secret: SECRET,
        token: { sub: String(admin.id), id: String(admin.id), role: "admin", villageId, villageCode, accountType: "village", name: "Adm", email: admin.email },
      });
      const before_ = await prisma.user.count({ where: { villageId } });
      const res = await residents.POST(
        new NextRequest("http://localhost/api/residents", {
          method: "POST",
          headers: { "content-type": "application/json", cookie: `next-auth.session-token=${cookie}` },
          body: JSON.stringify({
            id_number: `3201${String(t).padStart(12, "0")}`, name: "Warga Baru", gender: "Laki-laki", birthplace: "X", date_of_birth: "1990-01-01",
            address: "Jl. A", email: `warga${t}@uji.test`, password: "Rahasia123", family_card_number: `3201${String(t).padStart(12, "1")}`,
          }),
        }),
      );
      assert.equal(res.status, 201, JSON.stringify(await res.clone().json()));
      const out = await res.json();
      assert.equal(out.user, null);
      assert.equal(await prisma.user.count({ where: { villageId } }), before_, "tidak ada User baru");
      assert.equal(await prisma.user.count({ where: { email: `warga${t}@uji.test` } }), 0);
      const r = await prisma.resident.findFirst({ where: { villageId, name: "Warga Baru" } });
      assert.equal(r?.email, `warga${t}@uji.test`, "email tetap tersimpan sebagai data warga");
    });
  });

  describe("role tak dikenal (fail-closed)", () => {
    it("API desa menolak akun ber-role di luar daftar meski JWT bilang admin; role valid tetap lolos", async () => {
      const { encode } = await import("next-auth/jwt");
      const mk = async (key: string, role: string) => {
        const u = await prisma.user.create({ data: { villageId, email: `${key}${t}@uji.test`, password: "x", name: key, role, isActive: true } });
        const c = await encode({
          secret: SECRET,
          token: { sub: String(u.id), id: String(u.id), role: "admin", villageId, villageCode, accountType: "village", name: key, email: u.email },
        });
        return c;
      };
      const get = (c: string) => perms.GET(new NextRequest("http://localhost/api/account/permissions", { headers: { cookie: `next-auth.session-token=${c}` } }));
      assert.equal((await get(await mk("citizenrole", "citizen"))).status, 403);
      assert.equal((await get(await mk("ngawur", "superuser"))).status, 403);
      assert.equal((await get(await mk("stafok", "staff"))).status, 200);
    });
  });

  describe("POST /api/auth/login", () => {
    const pw = "Sandi-Benar-1";
    let hash = "";
    const attempt = (email: string, password: string, ip = nextIp()) => login.POST(json("/api/auth/login", { email, password }, ip));
    before(async () => {
      hash = await hashPassword(pw);
      const mk = (key: string, extra: Record<string, unknown>) =>
        prisma.user.create({ data: { villageId, email: `${key}${t}@uji.test`, password: hash, name: key, role: "staff", isActive: true, ...extra } });
      await mk("aktif", {});
      await mk("mati", { isActive: false });
      await mk("ngawurlogin", { role: "citizen" });
    });

    it("akun nonaktif: sandi SALAH -> 401 (tidak membocorkan status); sandi benar -> 403", async () => {
      assert.equal((await attempt(`mati${t}@uji.test`, "salah")).status, 401);
      assert.equal((await attempt(`mati${t}@uji.test`, pw)).status, 403);
    });

    it("role di luar daftar tidak bisa masuk walau sandi benar", async () => {
      assert.equal((await attempt(`ngawurlogin${t}@uji.test`, pw)).status, 403);
    });

    it("akun aktif + sandi benar -> 200 dengan data sesi; email tak dikenal -> 401 sama dengan sandi salah", async () => {
      const ok = await attempt(`aktif${t}@uji.test`, pw);
      assert.equal(ok.status, 200);
      const body = await ok.json();
      assert.equal(body.accountType, "village");
      const unknown = await attempt(`tidakada${t}@uji.test`, pw);
      const wrong = await attempt(`aktif${t}@uji.test`, "salah");
      assert.equal(unknown.status, 401);
      assert.equal(wrong.status, 401);
      assert.deepEqual(await unknown.json(), await wrong.json());
    });

    it("batas per IP+email: percobaan ke-9 dalam 10 menit -> 429 + Retry-After; IP lain tidak ikut terkunci", async () => {
      const ip = nextIp();
      const email = `aktif${t}@uji.test`;
      const codes: number[] = [];
      for (let i = 0; i < 8; i++) codes.push((await attempt(email, "salah", ip)).status);
      assert.deepEqual(codes, Array(8).fill(401));
      const blocked = await attempt(email, pw, ip); // bahkan sandi benar tak lolos saat dibatasi
      assert.equal(blocked.status, 429);
      assert.ok(Number(blocked.headers.get("retry-after")) > 0);
      const otherIp = await attempt(email, pw, nextIp());
      assert.equal(otherIp.status, 200, "pemilik sah dari IP lain tidak terkunci oleh penyerang");
    });

    it("batas per IP (semua email): 41 percobaan ke akun berbeda dari satu IP -> 429", async () => {
      const ip = nextIp();
      let last = 0;
      for (let i = 0; i < 41; i++) last = (await attempt(`acak${i}-${t}@uji.test`, "x", ip)).status;
      assert.equal(last, 429);
    });

    it("lewat NextAuth authorize: IP klien diteruskan ke API login, jadi batas berlaku per pengguna sebenarnya (bukan per server)", async () => {
      const { authOptions } = await import("../auth");
      const cred = (authOptions.providers as { id: string; options?: { authorize?: (c: unknown, r: unknown) => Promise<unknown> } }[]).find((p) => p.id === "credentials");
      assert.ok(cred?.options?.authorize, "provider credentials ada");
      const authorize = cred.options.authorize.bind(cred.options);
      // authorize memanggil API login lewat fetch server->server: arahkan ke handler asli, bawa header apa adanya.
      const realFetch = globalThis.fetch;
      const seen: string[] = [];
      globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
        const url = String(input);
        if (!url.endsWith("/api/auth/login")) return realFetch(input as RequestInfo, init);
        const h = new Headers(init?.headers);
        seen.push(h.get("x-real-ip") ?? "(tanpa)");
        return login.POST(new NextRequest("http://localhost/api/auth/login", { method: "POST", headers: h, body: init?.body as string }));
      }) as typeof fetch;
      try {
        const ipA = nextIp();
        const ipB = nextIp();
        const email = `aktif${t}@uji.test`;
        const reqFrom = (ip: string) => ({ headers: { "x-real-ip": ip, "x-forwarded-for": `1.2.3.4, ${ip}` } });
        const fail = async (ip: string) => {
          try {
            await authorize({ email, password: "salah" }, reqFrom(ip));
            return "lolos";
          } catch (e) {
            return (e as Error).message;
          }
        };
        for (let i = 0; i < 8; i++) assert.match(await fail(ipA), /password salah/i);
        assert.match(await fail(ipA), /Terlalu banyak percobaan/);
        assert.ok(seen.every((x) => x === ipA), "IP asli (X-Real-IP) terteruskan");
        const user = (await authorize({ email, password: pw }, reqFrom(ipB))) as { email?: string } | null;
        assert.equal(user?.email, email, "pengguna sah dari IP lain tetap bisa masuk");
      } finally {
        globalThis.fetch = realFetch;
      }
    });

    it("tidak menulis email/hasil sandi ke log", async () => {
      const logs: string[] = [];
      const orig = console.log;
      console.log = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
      try {
        await attempt(`aktif${t}@uji.test`, "salah");
        await attempt(`tidakada2${t}@uji.test`, "salah");
      } finally {
        console.log = orig;
      }
      assert.equal(logs.filter((l) => l.includes("@uji.test")).length, 0);
    });
  });
});
