/**
 * Paket E (retrofit jejak audit): rute konfigurasi/konten/akun di /api/admin/* — kanal pembayaran, referral, akun pemda,
 * paket tema, templat aplikasi, blog, katalog kepatuhan, Unsplash. Handler asli + MySQL scratch. Memeriksa: jejak tertulis dengan
 * action benar, tanpa rahasia (sandi), 401/403 tetap, validasi/penguatan keamanan, kontrak respons tidak berubah.
 * Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { SKIP, setupEnv, makeAdmin, call, auditOf, assertNoSecrets, risky, type Prisma } from "./helpers/platform-admin";

describe("Retrofit audit: konfigurasi, konten & akun (MySQL nyata)", { skip: SKIP }, () => {
  let prisma: Prisma;
  let H: {
    channels: typeof import("../app/api/admin/payment-channels/route");
    probe: typeof import("../app/api/admin/payment-channels/probe/route");
    referrals: typeof import("../app/api/admin/referrals/route");
    ru: typeof import("../app/api/admin/regional-users/route");
    ruId: typeof import("../app/api/admin/regional-users/[id]/route");
    packReview: typeof import("../app/api/admin/theme-packs/[id]/review/route");
    tplDecision: typeof import("../app/api/admin/app-templates/[id]/decision/route");
    posts: typeof import("../app/api/admin/blog/posts/route");
    post: typeof import("../app/api/admin/blog/posts/[id]/route");
    publish: typeof import("../app/api/admin/blog/posts/[id]/publish/route");
    katalog: typeof import("../app/api/admin/kepatuhan/katalog/route");
    track: typeof import("../app/api/admin/unsplash/track-download/route");
  };
  let admin: Awaited<ReturnType<typeof makeAdmin>>;
  let support: Awaited<ReturnType<typeof makeAdmin>>;
  const t = Date.now() % 1e6;
  const realFetch = globalThis.fetch;
  const cleanup: (() => Promise<unknown>)[] = [];
  const id = (n: number | bigint | string) => ({ id: String(n) });

  before(async () => {
    const env = await setupEnv();
    prisma = env.prisma;
    H = {
      channels: await import("../app/api/admin/payment-channels/route"),
      probe: await import("../app/api/admin/payment-channels/probe/route"),
      referrals: await import("../app/api/admin/referrals/route"),
      ru: await import("../app/api/admin/regional-users/route"),
      ruId: await import("../app/api/admin/regional-users/[id]/route"),
      packReview: await import("../app/api/admin/theme-packs/[id]/review/route"),
      tplDecision: await import("../app/api/admin/app-templates/[id]/decision/route"),
      posts: await import("../app/api/admin/blog/posts/route"),
      post: await import("../app/api/admin/blog/posts/[id]/route"),
      publish: await import("../app/api/admin/blog/posts/[id]/publish/route"),
      katalog: await import("../app/api/admin/kepatuhan/katalog/route"),
      track: await import("../app/api/admin/unsplash/track-download/route"),
    };
    admin = await makeAdmin(prisma, env.encode, `aud-c-${t}`);
    support = await makeAdmin(prisma, env.encode, `aud-cs-${t}`, "platform_support");
  });

  after(async () => {
    globalThis.fetch = realFetch;
    for (const fn of cleanup.reverse()) await fn().catch(() => undefined);
    await prisma.platformAuditLog.deleteMany({ where: { actorId: { in: [admin.user.id, support.user.id] } } });
    await prisma.platformUser.deleteMany({ where: { id: { in: [admin.user.id, support.user.id] } } });
    await prisma.$disconnect();
  });

  it("401 tanpa sesi dan 403 untuk peran dukungan tetap berlaku di setiap mutasi", async () => {
    const mk = (c: string | null) => [
      call(H.channels.PATCH as never, "PATCH", "/x", c, { code: "X", enabled: true }),
      call(H.probe.POST as never, "POST", "/x", c, {}),
      call(H.referrals.POST as never, "POST", "/x", c, { code: "A", label: "b" }),
      call(H.ru.POST as never, "POST", "/x", c, {}),
      call(H.ruId.PATCH as never, "PATCH", "/x", c, {}, id(1)),
      call(H.ruId.DELETE as never, "DELETE", "/x", c, undefined, id(1)),
      call(H.packReview.POST as never, "POST", "/x", c, { action: "reject" }, id(1)),
      call(H.tplDecision.POST as never, "POST", "/x", c, { decision: "reject" }, id(1)),
      call(H.posts.POST as never, "POST", "/x", c, { title: "a" }),
      call(H.post.PUT as never, "PUT", "/x", c, { title: "a" }, id(1)),
      call(H.publish.POST as never, "POST", "/x", c, {}, id(1)),
      call(H.katalog.PUT as never, "PUT", "/x", c, {}),
      call(H.katalog.DELETE as never, "DELETE", "/x?id=1", c),
      call(H.track.POST as never, "POST", "/x", c, { downloadLocation: "https://api.unsplash.com/photos/a/download" }),
    ];
    for (const r of await Promise.all(mk(null))) assert.equal(r.status, 401);
    for (const r of await Promise.all(mk(support.cookie))) assert.equal(r.status, 403);
    assert.equal((await auditOf(prisma, support.user.id)).length, 0);
  });

  describe("kanal pembayaran", () => {
    it("PATCH: jejak payment_channel.update dengan sebelum/sesudah; kode asing 400; GET tanpa rahasia", async () => {
      const { listAllLinkquChannels } = await import("../lib/payment/linkqu-channels");
      const ch = listAllLinkquChannels()[0];
      cleanup.push(() => prisma.paymentChannelSetting.deleteMany({ where: { code: ch.code } }));
      const off = await call(H.channels.PATCH as never, "PATCH", "/x", admin.cookie, risky({ code: ch.code, enabled: false, note: "gangguan uji" }));
      assert.equal(off.status, 200);
      assert.deepEqual(await off.json(), { ok: true, code: ch.code, enabled: false, note: "gangguan uji" });
      await call(H.channels.PATCH as never, "PATCH", "/x", admin.cookie, risky({ code: ch.code, enabled: true }));
      const rows = await auditOf(prisma, admin.user.id, "payment_channel.update");
      assert.equal(rows.length, 2);
      assert.equal(rows[0].targetId, `payment_channel:${ch.code}`);
      assert.deepEqual((rows[0].metadata as { before: { enabled: boolean }; after: { enabled: boolean } }).before.enabled, true);
      assert.deepEqual((rows[0].metadata as { after: { enabled: boolean } }).after.enabled, false);
      assert.match(rows[0].summary, /dinonaktifkan/);
      assert.match(rows[1].summary, /diaktifkan/);
      assert.equal((await call(H.channels.PATCH as never, "PATCH", "/x", admin.cookie, risky({ code: "BUKAN_KANAL", enabled: false }))).status, 400);
      assert.equal((await call(H.channels.PATCH as never, "PATCH", "/x", admin.cookie, risky({ code: ch.code, enabled: "ya" }))).status, 400);

      const list = await call(H.channels.GET as never, "GET", "/x", admin.cookie);
      const body = (await list.json()) as Record<string, unknown>;
      const dump = JSON.stringify(body);
      for (const k of ["secret", "serverKey", "pin", "clientSecret", "password", "signature"]) assert.ok(!dump.toLowerCase().includes(k.toLowerCase()), `respons GET memuat ${k}`);
    });

    it("probe: dibatasi laju per admin (429 setelah 6 percobaan); LINKQU_URL kosong -> 400", async () => {
      const saved = process.env.LINKQU_URL;
      delete process.env.LINKQU_URL;
      const { limiterKey } = await import("../lib/mobile/rate-limit");
      cleanup.push(async () => {
        await prisma.$executeRaw`DELETE FROM mobile_rate_limits WHERE \`key\` = ${limiterKey("platform-channel-probe", admin.user.id)}`;
        if (saved !== undefined) process.env.LINKQU_URL = saved;
      });
      for (let i = 0; i < 6; i++) assert.equal((await call(H.probe.POST as never, "POST", "/x", admin.cookie, risky({}))).status, 400);
      const limited = await call(H.probe.POST as never, "POST", "/x", admin.cookie, risky({}));
      assert.equal(limited.status, 429);
      assert.ok(limited.headers.get("retry-after"));
    });
  });

  describe("referral", () => {
    it("POST valid: jejak referral.create; landingPath asing, label panjang, kode ganda -> 400 tanpa bocor galat Prisma", async () => {
      const code = `AUD${t}`;
      cleanup.push(async () => {
        const row = await prisma.referralCode.findUnique({ where: { code } });
        await prisma.referralCode.deleteMany({ where: { code } });
        if (row?.partnerId) await prisma.partner.deleteMany({ where: { id: row.partnerId } });
      });
      const body = { code, label: "Uji Audit", ownerName: "Pemilik", ownerEmail: `aud-ref-${t}@uji.test`, commission: "10%" };
      const ok = await call(H.referrals.POST as never, "POST", "/x", admin.cookie, risky(body));
      assert.equal(ok.status, 201);
      const j = (await ok.json()) as { ok: boolean; referralCode: { code: string; partnerId: number | null } };
      assert.equal(j.ok, true);
      assert.equal(j.referralCode.code, code);
      assert.equal(typeof j.referralCode.partnerId, "number");
      const rows = await auditOf(prisma, admin.user.id, "referral.create");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].targetType, "partner");
      assert.match(rows[0].summary, new RegExp(code));
      assertNoSecrets(rows, [`aud-ref-${t}@uji.test`]);

      for (const lp of ["//evil.example", "https://evil.example", "/m/../x", "javascript:alert(1)", "@evil.example"]) {
        const r = await call(H.referrals.POST as never, "POST", "/x", admin.cookie, risky({ ...body, code: `${code}X`, landingPath: lp }));
        assert.equal(r.status, 400, lp);
      }
      assert.equal((await call(H.referrals.POST as never, "POST", "/x", admin.cookie, risky({ ...body, code: `${code}Y`, label: "x".repeat(121) }))).status, 400);
      const dup = await call(H.referrals.POST as never, "POST", "/x", admin.cookie, risky(body));
      assert.equal(dup.status, 400);
      const msg = ((await dup.json()) as { error: string }).error;
      assert.ok(!/prisma|invocation|unique constraint/i.test(msg), `galat bocor: ${msg}`);
    });
  });

  describe("referral: step-up dan mitra tidak aktif", () => {
    it("tanpa konfirmasi sandi -> 403 tanpa efek; mitra ditangguhkan TIDAK diaktifkan ulang oleh kode referral baru", async () => {
      const code = `STP${t}`;
      const email = `stp-ref-${t}@uji.test`;
      const partner = await prisma.partner.create({ data: { email, password: "x", name: "Mitra Ditangguhkan", status: "suspended" } });
      cleanup.push(async () => {
        await prisma.referralCode.deleteMany({ where: { code } });
        await prisma.partner.deleteMany({ where: { id: partner.id } });
      });
      const body = { code, label: "Uji Step", ownerName: "P", ownerEmail: email, commission: "10%" };
      const noStep = await call(H.referrals.POST as never, "POST", "/x", admin.cookie, body);
      assert.equal(noStep.status, 403);
      assert.equal(await prisma.referralCode.count({ where: { code } }), 0);
      const blocked = await call(H.referrals.POST as never, "POST", "/x", admin.cookie, risky(body));
      assert.ok(blocked.status >= 400, `status ${blocked.status}`);
      const after = await prisma.partner.findUnique({ where: { id: partner.id }, select: { status: true } });
      assert.equal(after?.status, "suspended");
    });
  });

  describe("akun pemda", () => {
    const PW = "SandiBaruPemda!234";
    it("POST/PATCH/DELETE: jejak regional_user.* tanpa sandi; sandi pendek/lingkup kurang -> 400; sesi lama dicabut saat reset", async () => {
      const email = `aud-ru-${t}@uji.test`;
      cleanup.push(() => prisma.regionalUser.deleteMany({ where: { email } }));
      const base = { email, name: "Petugas Uji", role: "regional_kabupaten", scopeRegency: "Kab Uji", scopeProvince: "Prov Uji" };

      assert.equal((await call(H.ru.POST as never, "POST", "/x", admin.cookie, risky({ ...base, password: "pendek" }))).status, 400);
      assert.equal((await call(H.ru.POST as never, "POST", "/x", admin.cookie, risky({ ...base, password: PW, email: "bukan-email" }))).status, 400);
      assert.equal((await call(H.ru.POST as never, "POST", "/x", admin.cookie, risky({ ...base, password: PW, scopeRegency: "" }))).status, 400, "kabupaten tanpa wilayah");

      const created = await call(H.ru.POST as never, "POST", "/x", admin.cookie, risky({ ...base, password: PW }));
      assert.equal(created.status, 201);
      const user = ((await created.json()) as { user: { id: number; email: string; role: string; isActive: boolean; password?: string } }).user;
      assert.equal(user.email, email);
      assert.equal(user.password, undefined);
      assert.equal((await call(H.ru.POST as never, "POST", "/x", admin.cookie, risky({ ...base, password: PW }))).status, 409);

      const before = await prisma.regionalUser.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ password: "123" }), id(user.id))).status, 400, "sandi pendek tidak lagi diabaikan diam-diam");
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ isActive: "ya" }), id(user.id))).status, 400);
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ role: "regional_kecamatan" }), id(user.id))).status, 400, "kecamatan tanpa kecamatan");

      const reset = await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ password: "SandiLain!98765" }), id(user.id));
      assert.equal(reset.status, 200);
      const after = await prisma.regionalUser.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(after.sessionVersion, before.sessionVersion + 1);
      assert.notEqual(after.password, before.password);

      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ isActive: false }), id(user.id))).status, 200);
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ name: "Nama Baru" }), id(user.id))).status, 200);
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({ isActive: true }), id(user.id))).status, 200);
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({}), id(987654321))).status, 404);
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", admin.cookie, risky({}), id("12abc"))).status, 400);
      // DELETE bawaan = penghapusan lunak (nonaktif + sesi dicabut); hapus permanen hanya dengan permanent:true.
      const sv = (await prisma.regionalUser.findUniqueOrThrow({ where: { id: user.id } })).sessionVersion;
      const soft = await call(H.ruId.DELETE as never, "DELETE", "/x", admin.cookie, risky(undefined), id(user.id));
      assert.equal(soft.status, 200);
      assert.equal(((await soft.json()) as { permanent: boolean }).permanent, false);
      const kept = await prisma.regionalUser.findUniqueOrThrow({ where: { id: user.id } });
      assert.equal(kept.isActive, false);
      assert.equal(kept.sessionVersion, sv + 1);
      assert.equal((await call(H.ruId.DELETE as never, "DELETE", "/x", admin.cookie, risky({ permanent: true }), id(user.id))).status, 200);
      assert.equal(await prisma.regionalUser.count({ where: { id: user.id } }), 0);
      assert.equal((await call(H.ruId.DELETE as never, "DELETE", "/x", admin.cookie, risky(undefined), id(user.id))).status, 404);

      const rows = (await auditOf(prisma, admin.user.id)).filter((r) => r.action.startsWith("regional_user."));
      assert.deepEqual(
        rows.map((r) => r.action),
        ["regional_user.create", "regional_user.reset_password", "regional_user.deactivate", "regional_user.update", "regional_user.activate", "regional_user.deactivate", "regional_user.delete"],
      );
      assertNoSecrets(rows, [PW, "SandiLain!98765", "$2a$", "$2b$"]);
    });
  });

  describe("paket tema & templat aplikasi", () => {
    it("theme_pack.review: tolak dengan alasan -> jejak; tanpa alasan 422 tanpa jejak", async () => {
      const pack = await prisma.websiteThemePack.create({ data: { key: `aud-${t}`, version: "1.0.0", name: "Tema Uji", authorName: "Dev", manifest: {} } });
      cleanup.push(() => prisma.websiteThemePack.deleteMany({ where: { id: pack.id } }));
      assert.equal((await call(H.packReview.POST as never, "POST", "/x", admin.cookie, { action: "reject" }, id(pack.id))).status, 422);
      assert.equal((await auditOf(prisma, admin.user.id, "theme_pack.review")).length, 0);
      const ok = await call(H.packReview.POST as never, "POST", "/x", admin.cookie, { action: "reject", note: "Kontras warna kurang" }, id(pack.id));
      assert.equal(ok.status, 200);
      assert.deepEqual(await ok.json(), { ok: true, status: "rejected" });
      const rows = await auditOf(prisma, admin.user.id, "theme_pack.review");
      assert.equal(rows.length, 1);
      assert.match(rows[0].summary, /Tema Uji/);
      assert.equal((rows[0].metadata as { review: string }).review, "reject");
      assert.equal((rows[0].metadata as { before: { status: string } }).before.status, "submitted");
    });

    it("app_template.decision: tolak -> jejak; ID melebihi int32 -> 400", async () => {
      const tpl = await prisma.appTemplate.create({
        data: { lineageKey: `aud${t}`, version: 1, publisherName: "Desa Penerbit", name: "Templat Uji", description: "d", manifest: {}, manifestHash: "h".repeat(64), warnings: [] },
      });
      cleanup.push(() => prisma.appTemplate.deleteMany({ where: { id: tpl.id } }));
      assert.equal((await call(H.tplDecision.POST as never, "POST", "/x", admin.cookie, { decision: "reject" }, id(tpl.id))).status, 422);
      assert.equal((await call(H.tplDecision.POST as never, "POST", "/x", admin.cookie, { decision: "x" }, id(tpl.id))).status, 400);
      assert.equal((await call(H.tplDecision.POST as never, "POST", "/x", admin.cookie, { decision: "reject" }, id("9999999999"))).status, 400);
      const ok = await call(H.tplDecision.POST as never, "POST", "/x", admin.cookie, { decision: "reject", note: "Kolom pribadi tidak ditandai" }, id(tpl.id));
      assert.equal(ok.status, 200);
      assert.deepEqual(await ok.json(), { success: true, status: "REJECTED" });
      const rows = await auditOf(prisma, admin.user.id, "app_template.decision");
      assert.equal(rows.length, 1);
      assert.match(rows[0].summary, /Templat Uji/);
      assert.equal((rows[0].metadata as { before: { status: string } }).before.status, "PENDING");
    });
  });

  describe("blog", () => {
    it("create -> update -> publish: jejak blog.create/update/publish; tanggal terbit stabil; URL berbahaya & atribusi dibersihkan", async () => {
      const created = await call(H.posts.POST as never, "POST", "/x", admin.cookie, { title: `Artikel Uji ${t}`, slug: `artikel-uji-${t}` });
      assert.equal(created.status, 201);
      const pid = ((await created.json()) as { id: string }).id;
      cleanup.push(() => prisma.blogPost.deleteMany({ where: { id: BigInt(pid) } }));
      const put = (b: unknown) => call(H.post.PUT as never, "PUT", "/x", admin.cookie, b, id(pid));

      assert.equal((await put({ coverImageUrl: "javascript:alert(1)" })).status, 400);
      assert.equal((await put({ coverImageUrl: "data:text/html,x" })).status, 400);
      assert.equal((await put({ coverImageAttribution: "bukan objek" })).status, 400, "dulu: 200 dengan isi sampah");
      assert.equal((await put({ title: "x".repeat(201) })).status, 400);
      assert.equal((await put({ status: "bebas" })).status, 400);

      const ok = await put({
        title: `Artikel Uji ${t} v2`,
        content: "isi",
        coverImageUrl: "https://images.unsplash.com/photo-1",
        coverImageAttribution: { authorName: "Fotografer", authorUrl: "javascript:alert(1)", photoUrl: "https://unsplash.com/photos/1", ekstra: "x" },
        tags: ["uji", "audit"],
      });
      assert.equal(ok.status, 200);
      const row = await prisma.blogPost.findUniqueOrThrow({ where: { id: BigInt(pid) } });
      assert.deepEqual(row.coverImageAttribution, { authorName: "Fotografer", photoUrl: "https://unsplash.com/photos/1" });

      // status published lewat PUT tanpa tanggal terbit -> tanggal terisi
      assert.equal((await put({ status: "published" })).status, 200);
      const pub1 = await prisma.blogPost.findUniqueOrThrow({ where: { id: BigInt(pid) } });
      assert.ok(pub1.publishedAt);
      await new Promise((r) => setTimeout(r, 1100));
      const again = await call(H.publish.POST as never, "POST", "/x", admin.cookie, {}, id(pid));
      assert.equal(again.status, 200);
      const pub2 = await prisma.blogPost.findUniqueOrThrow({ where: { id: BigInt(pid) } });
      assert.equal(pub2.publishedAt?.getTime(), pub1.publishedAt?.getTime(), "terbit ulang tidak menggeser tanggal");
      assert.equal((await put({ status: "archived" })).status, 200);

      assert.equal((await call(H.publish.POST as never, "POST", "/x", admin.cookie, {}, id("987654321"))).status, 404);
      assert.equal((await call(H.publish.POST as never, "POST", "/x", admin.cookie, {}, id("abc"))).status, 400);
      const dupSlug = await call(H.posts.POST as never, "POST", "/x", admin.cookie, { title: "Lain", slug: `artikel-uji-${t}` });
      assert.equal(dupSlug.status, 201, "slug ganda diberi akhiran");
      cleanup.push(() => prisma.blogPost.deleteMany({ where: { slug: { startsWith: `artikel-uji-${t}` } } }));

      const rows = (await auditOf(prisma, admin.user.id)).filter((r) => r.action.startsWith("blog.") && r.targetId === `blog_post:${pid}`);
      assert.deepEqual(rows.map((r) => r.action), ["blog.create", "blog.update", "blog.publish", "blog.publish", "blog.unpublish"]);
      assert.match(rows[1].summary, /Artikel Uji/);
    });
  });

  describe("katalog kepatuhan", () => {
    it("PUT/DELETE: jejak compliance_catalog.save/delete; input salah 400 tanpa jejak", async () => {
      const bad = await call(H.katalog.PUT as never, "PUT", "/x", admin.cookie, { itemKey: "BUKAN_BUTIR" });
      assert.equal(bad.status, 400);
      assert.equal((await auditOf(prisma, admin.user.id, "compliance_catalog.save")).length, 0);
      const basis = `uji-${t} PMK 7/2026 Pasal 24`;
      cleanup.push(() => prisma.complianceCatalogEntry.deleteMany({ where: { scope: "GLOBAL", basis } }));
      const ok = await call(H.katalog.PUT as never, "PUT", "/x", admin.cookie, { itemKey: "DD_TAHAP2", fromYear: 2026, ruleKind: "FIXED", yearOffset: 0, month: 11, day: 30, basis, verification: "V" });
      assert.equal(ok.status, 200);
      const j = (await ok.json()) as { success: boolean; id: number };
      assert.equal(j.success, true);
      const saved = await auditOf(prisma, admin.user.id, "compliance_catalog.save");
      assert.equal(saved.length, 1);
      assert.equal((saved[0].metadata as { itemKey: string }).itemKey, "DD_TAHAP2");
      assert.equal((await call(H.katalog.DELETE as never, "DELETE", "/x?id=abc", admin.cookie)).status, 400);
      const del = await call(H.katalog.DELETE as never, "DELETE", `/x?id=${j.id}`, admin.cookie);
      assert.equal(del.status, 200);
      const rows = await auditOf(prisma, admin.user.id, "compliance_catalog.delete");
      assert.equal(rows.length, 1);
      assert.equal((rows[0].metadata as { itemKey: string }).itemKey, "DD_TAHAP2");
    });
  });

  describe("Unsplash track-download (anti-SSRF)", () => {
    it("hanya api.unsplash.com/photos/{id}/download; host/skema/port lain ditolak tanpa memanggil jaringan", async () => {
      process.env.UNSPLASH_ACCESS_KEY = "kunci-uji-unsplash";
      const calls: { url: string; redirect?: string }[] = [];
      globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
        calls.push({ url: String(input), redirect: init?.redirect });
        return new Response("{}", { status: 200 });
      }) as typeof fetch;
      const go = (dl: unknown) => call(H.track.POST as never, "POST", "/x", admin.cookie, { downloadLocation: dl });
      for (const dl of [
        "http://169.254.169.254/latest/meta-data",
        "https://api.unsplash.com.evil.example/photos/a/download",
        "https://evil.example/photos/a/download",
        "http://api.unsplash.com/photos/a/download",
        "https://user:pw@api.unsplash.com/photos/a/download",
        "https://api.unsplash.com:8443/photos/a/download",
        "https://api.unsplash.com/search/photos",
        "https://api.unsplash.com/photos/a/../../admin",
        "bukan url",
        "file:///etc/passwd",
      ]) {
        assert.equal((await go(dl)).status, 400, dl);
      }
      assert.equal(calls.length, 0, "tidak ada permintaan keluar untuk tautan tak sah");
      const ok = await go("https://api.unsplash.com/photos/abc123/download?ixid=xyz");
      assert.equal(ok.status, 200);
      assert.equal(calls.length, 1);
      const u = new URL(calls[0].url);
      assert.equal(u.host, "api.unsplash.com");
      assert.equal(u.searchParams.get("client_id"), "kunci-uji-unsplash");
      assert.equal(calls[0].redirect, "manual");
    });
  });
});
