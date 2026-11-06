/**
 * Paket F1: rute /api/admin/* lama yang menggerakkan uang/akses WAJIB konfirmasi sandi admin + alasan (`requireStepUp`).
 * Satu cookie sesi curian tidak boleh cukup. Tiap rute diuji: tanpa sandi -> 403 STEP_UP_REQUIRED, sandi salah -> 403 STEP_UP_INVALID,
 * alasan terlalu pendek -> 400 (semuanya tanpa efek), sandi+alasan benar -> sukses + jejak memuat `reason`.
 * Plus regresi pengambilalihan akun mitra lewat persetujuan pendaftaran. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";
import { SKIP, ADMIN_PW, STEP_UP_REASON, setupEnv, makeAdmin, call, auditOf, risky, type Prisma } from "./helpers/platform-admin";

type Admin = Awaited<ReturnType<typeof makeAdmin>>;
type Res = Response;

describe("Step-up rute lama (MySQL nyata)", { skip: SKIP }, () => {
  let prisma: Prisma;
  let encode: typeof import("next-auth/jwt").encode;
  let H: {
    ru: typeof import("../app/api/admin/regional-users/route");
    ruId: typeof import("../app/api/admin/regional-users/[id]/route");
    credits: typeof import("../app/api/admin/users/[id]/ai-credits/route");
    disbPatch: typeof import("../app/api/admin/disbursements/[id]/route");
    disb: typeof import("../app/api/admin/partners/[id]/disbursements/route");
    approve: typeof import("../app/api/admin/partners/[id]/commissions/approve/route");
    rule: typeof import("../app/api/admin/partners/[id]/commission-rule/route");
    villages: typeof import("../app/api/admin/villages/route");
    channels: typeof import("../app/api/admin/payment-channels/route");
    probe: typeof import("../app/api/admin/payment-channels/probe/route");
    appr: typeof import("../app/api/admin/partner-applications/[id]/approve/route");
    packReview: typeof import("../app/api/admin/theme-packs/[id]/review/route");
    tplDecision: typeof import("../app/api/admin/app-templates/[id]/decision/route");
    publicApply: typeof import("../app/api/partner-applications/route");
  };
  const t = Date.now() % 1e6;
  const admins: Admin[] = [];
  const cleanup: (() => Promise<unknown>)[] = [];
  let seq = 0;
  const id = (n: number | bigint | string) => ({ id: String(n) });

  /** Admin baru per kasus: percobaan sandi salah dihitung per admin (batas 8/10 menit). */
  const mkAdmin = async () => {
    seq += 1;
    const a = await makeAdmin(prisma, encode, `f1-${t}-${seq}`);
    admins.push(a);
    return a;
  };

  const codeOf = async (r: Res) => ((await r.json()) as { code?: string }).code;

  /**
   * Pola 4 langkah. `send(admin, body)` memanggil rute dengan body dasar + field step-up yang diberikan;
   * `noEffect()` memverifikasi tidak ada efek; `done()` memeriksa efek setelah sukses.
   */
  async function gate(opts: {
    send: (a: Admin, extra: Record<string, unknown>) => Promise<Res>;
    noEffect: () => Promise<void>;
    okStatus?: number;
    action: string;
  }) {
    const a = await mkAdmin();
    const r1 = await opts.send(a, {});
    assert.equal(r1.status, 403, "tanpa sandi");
    assert.equal(await codeOf(r1), "STEP_UP_REQUIRED");
    await opts.noEffect();
    const r2 = await opts.send(a, { confirmPassword: "sandi-salah-xyz", reason: STEP_UP_REASON });
    assert.equal(r2.status, 403, "sandi salah");
    assert.equal(await codeOf(r2), "STEP_UP_INVALID");
    await opts.noEffect();
    const r3 = await opts.send(a, { confirmPassword: ADMIN_PW, reason: "ab" });
    assert.equal(r3.status, 400, "alasan terlalu pendek");
    await opts.noEffect();
    const r4 = await opts.send(a, { confirmPassword: ADMIN_PW, reason: STEP_UP_REASON });
    assert.equal(r4.status, opts.okStatus ?? 200, await r4.clone().text());
    const rows = await auditOf(prisma, a.user.id, opts.action);
    assert.ok(rows.length >= 1, `jejak ${opts.action} tertulis`);
    assert.equal((rows[0].metadata as { reason?: string }).reason, STEP_UP_REASON, "alasan masuk jejak");
    assert.ok(!JSON.stringify(rows.map((r) => [r.summary, r.metadata])).includes(ADMIN_PW), "sandi admin tidak masuk jejak");
    return { admin: a, res: r4, rows };
  }

  let partnerId: number;
  const partnerIds: number[] = [];
  const villageIds: number[] = [];
  const appIds: bigint[] = [];
  const regionalIds: number[] = [];
  const userIds: number[] = [];

  const entry = (status: string, amount = 100_000) =>
    prisma.partnerCommissionEntry.create({ data: { partnerId, type: "ADJUSTMENT", amount, status, description: `f1 ${t}` } });

  before(async () => {
    const env = await setupEnv();
    prisma = env.prisma;
    encode = env.encode;
    H = {
      ru: await import("../app/api/admin/regional-users/route"),
      ruId: await import("../app/api/admin/regional-users/[id]/route"),
      credits: await import("../app/api/admin/users/[id]/ai-credits/route"),
      disbPatch: await import("../app/api/admin/disbursements/[id]/route"),
      disb: await import("../app/api/admin/partners/[id]/disbursements/route"),
      approve: await import("../app/api/admin/partners/[id]/commissions/approve/route"),
      rule: await import("../app/api/admin/partners/[id]/commission-rule/route"),
      villages: await import("../app/api/admin/villages/route"),
      channels: await import("../app/api/admin/payment-channels/route"),
      probe: await import("../app/api/admin/payment-channels/probe/route"),
      appr: await import("../app/api/admin/partner-applications/[id]/approve/route"),
      packReview: await import("../app/api/admin/theme-packs/[id]/review/route"),
      tplDecision: await import("../app/api/admin/app-templates/[id]/decision/route"),
      publicApply: await import("../app/api/partner-applications/route"),
    };
    const p = await prisma.partner.create({ data: { email: `f1-mitra-${t}@uji.test`, password: "x", name: `Mitra F1 ${t}`, status: "active" } });
    partnerId = p.id;
    partnerIds.push(p.id);
    await prisma.partnerBankAccount.create({ data: { partnerId, bankName: "BCA", accountNumber: "1234567890", accountName: "Mitra F1", isPrimary: true } });
  });

  after(async () => {
    for (const fn of cleanup.reverse()) await fn().catch(() => undefined);
    const ids = admins.map((a) => a.user.id);
    await prisma.platformAuditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.regionalUser.deleteMany({ where: { id: { in: regionalIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.village.deleteMany({ where: { id: { in: villageIds } } });
    await prisma.partnerApplication.deleteMany({ where: { id: { in: appIds } } });
    await prisma.partnerDisbursement.deleteMany({ where: { partnerId: { in: partnerIds } } });
    await prisma.partner.deleteMany({ where: { id: { in: partnerIds } } });
    await prisma.platformUser.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  describe("pemda (regional-users)", () => {
    it("POST: buat akun pemda butuh step-up (pintu belakang akun dengan sandi pilihan penyerang)", async () => {
      const email = `f1-ru-${t}@uji.test`;
      const body = { email, password: "SandiPenyerang-1234", name: "Akun Uji", role: "regional_kabupaten", scopeRegency: "Kab Uji" };
      const { res } = await gate({
        action: "regional_user.create",
        send: (a, extra) => call(H.ru.POST as never, "POST", "/x", a.cookie, { ...body, ...extra }),
        noEffect: async () => assert.equal(await prisma.regionalUser.count({ where: { email } }), 0),
        okStatus: 201,
      });
      regionalIds.push(((await res.json()) as { user: { id: number } }).user.id);
    });

    it("PATCH: reset sandi / ubah peran / aktifkan butuh step-up; ubah nama & nonaktifkan tidak", async () => {
      const u = await prisma.regionalUser.create({ data: { email: `f1-ru2-${t}@uji.test`, password: "x", name: "R", role: "regional_kabupaten", scopeRegency: "Kab" } });
      regionalIds.push(u.id);
      const fresh = () => prisma.regionalUser.findUniqueOrThrow({ where: { id: u.id } });
      const a0 = await mkAdmin();
      // Tanpa step-up: nama & nonaktifkan.
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", a0.cookie, { name: "R Baru" }, id(u.id))).status, 200);
      assert.equal((await call(H.ruId.PATCH as never, "PATCH", "/x", a0.cookie, { isActive: false }, id(u.id))).status, 200);
      // Berisiko: tolak tanpa step-up dan tidak ada efek.
      for (const body of [{ password: "SandiPenyerang-1234" }, { role: "regional_provinsi", scopeProvince: "P" }, { isActive: true }, { scopeRegency: "Lain" }]) {
        const r = await call(H.ruId.PATCH as never, "PATCH", "/x", a0.cookie, body, id(u.id));
        assert.equal(r.status, 403, JSON.stringify(body));
        assert.equal(await codeOf(r), "STEP_UP_REQUIRED");
      }
      const f = await fresh();
      assert.equal(f.password, "x");
      assert.equal(f.isActive, false);
      assert.equal(f.role, "regional_kabupaten");
      assert.equal(f.scopeRegency, "Kab");
      const bad = await call(H.ruId.PATCH as never, "PATCH", "/x", a0.cookie, risky({ password: "SandiPenyerang-1234" }, { confirmPassword: "salah" }), id(u.id));
      assert.equal(bad.status, 403);
      assert.equal((await fresh()).password, "x");
      // Benar: reset sandi + aktifkan, jejak memuat alasan.
      const ok = await call(H.ruId.PATCH as never, "PATCH", "/x", a0.cookie, risky({ password: "SandiResmi-98765", isActive: true }), id(u.id));
      assert.equal(ok.status, 200);
      const after = await fresh();
      assert.notEqual(after.password, "x");
      assert.equal(after.isActive, true);
      const rows = await auditOf(prisma, a0.user.id, "regional_user.reset_password");
      assert.equal((rows[0].metadata as { reason: string }).reason, STEP_UP_REASON);
    });

    it("DELETE: wajib step-up; bawaan hanya menonaktifkan (tidak menghapus permanen)", async () => {
      const u = await prisma.regionalUser.create({ data: { email: `f1-ru3-${t}@uji.test`, password: "x", name: "R", role: "regional_kabupaten", scopeRegency: "Kab" } });
      regionalIds.push(u.id);
      await gate({
        action: "regional_user.deactivate",
        send: (a, extra) => call(H.ruId.DELETE as never, "DELETE", "/x", a.cookie, extra, id(u.id)),
        noEffect: async () => assert.equal((await prisma.regionalUser.findUniqueOrThrow({ where: { id: u.id } })).isActive, true),
      });
      const row = await prisma.regionalUser.findUnique({ where: { id: u.id } });
      assert.ok(row, "baris tetap ada");
      assert.equal(row.isActive, false);
      assert.equal(row.sessionVersion, 1, "sesi dicabut");
    });
  });

  describe("uang mitra", () => {
    it("ai-credits (rute lama PUT): kredit AI tanpa batas butuh step-up", async () => {
      const v = await prisma.village.create({ data: { code: `F1V${t}${++seq}`, name: "Desa F1", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "trial", subscriptionExpiry: new Date(Date.now() + 86_400_000) } });
      villageIds.push(v.id);
      const u = await prisma.user.create({ data: { villageId: v.id, email: `f1-u-${t}@desa.test`, password: "x", name: "Budi", role: "staff", aiCredits: 5 } });
      userIds.push(u.id);
      await gate({
        action: "account.ai_credits",
        send: (a, extra) => call(H.credits.PUT as never, "PUT", "/x", a.cookie, { set: 777, ...extra }, id(u.id)),
        noEffect: async () => assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).aiCredits, 5),
      });
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).aiCredits, 777);
    });

    it("commission-rule PATCH", async () => {
      const p = await prisma.partner.create({ data: { email: `f1-r-${t}@uji.test`, password: "x", name: "Mitra Rule", status: "active" } });
      partnerIds.push(p.id);
      await gate({
        action: "partner.commission_rule_update",
        send: (a, extra) => call(H.rule.PATCH as never, "PATCH", "/x", a.cookie, { subscriptionSharePercent: 99, ...extra }, id(p.id)),
        noEffect: async () => assert.equal(await prisma.partnerCommissionRule.count({ where: { partnerId: p.id } }), 0),
      });
    });

    it("commissions/approve POST", async () => {
      const e = await entry("accrued", 12_345);
      await gate({
        action: "partner.commission_approve",
        send: (a, extra) => call(H.approve.POST as never, "POST", "/x", a.cookie, { ids: [String(e.id)], ...extra }, id(partnerId)),
        noEffect: async () => assert.equal((await prisma.partnerCommissionEntry.findUniqueOrThrow({ where: { id: e.id } })).status, "accrued"),
      });
      assert.equal((await prisma.partnerCommissionEntry.findUniqueOrThrow({ where: { id: e.id } })).status, "approved");
    });

    it("partners/[id]/disbursements POST dan disbursements/[id] PATCH", async () => {
      const e = await entry("approved", 20_000);
      const { res } = await gate({
        action: "disbursement.create",
        send: (a, extra) => call(H.disb.POST as never, "POST", "/x", a.cookie, { commissionEntryIds: [String(e.id)], status: "pending", ...extra }, id(partnerId)),
        noEffect: async () => assert.equal(await prisma.partnerDisbursementItem.count({ where: { commissionEntryId: e.id } }), 0),
      });
      const did = ((await res.json()) as { disbursement: { id: string } }).disbursement.id;
      await gate({
        action: "disbursement.paid",
        send: (a, extra) => call(H.disbPatch.PATCH as never, "PATCH", "/x", a.cookie, { status: "paid", reference: "TRF-F1", ...extra }, id(did)),
        noEffect: async () => assert.equal((await prisma.partnerDisbursement.findUniqueOrThrow({ where: { id: BigInt(did) } })).status, "pending"),
      });
      assert.equal((await prisma.partnerCommissionEntry.findUniqueOrThrow({ where: { id: e.id } })).status, "disbursed");
    });

    it("villages PATCH: tautan mitra->desa (pemicu komisi closing) butuh step-up", async () => {
      const v = await prisma.village.create({ data: { code: `F1L${t}${++seq}`, name: "Desa Link", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "trial", subscriptionExpiry: new Date(Date.now() + 86_400_000) } });
      villageIds.push(v.id);
      await gate({
        action: "village.link_partner",
        send: (a, extra) => call(H.villages.PATCH as never, "PATCH", "/x", a.cookie, { villageCode: v.code, partnerId, ...extra }),
        noEffect: async () => {
          assert.equal((await prisma.village.findUniqueOrThrow({ where: { id: v.id } })).acquiredByPartnerId, null);
          assert.equal(await prisma.partnerCommissionEntry.count({ where: { villageId: v.id, type: "CLOSING" } }), 0);
        },
      });
      assert.equal((await prisma.village.findUniqueOrThrow({ where: { id: v.id } })).acquiredByPartnerId, partnerId);
    });
  });

  describe("pembayaran", () => {
    it("payment-channels PATCH: mematikan kanal butuh step-up", async () => {
      const { listAllLinkquChannels } = await import("../lib/payment/linkqu-channels");
      const ch = listAllLinkquChannels()[0];
      const prev = await prisma.paymentChannelSetting.findUnique({ where: { code: ch.code } });
      cleanup.push(async () => {
        if (prev) await prisma.paymentChannelSetting.update({ where: { code: ch.code }, data: { enabled: prev.enabled, note: prev.note } });
        else await prisma.paymentChannelSetting.deleteMany({ where: { code: ch.code } });
      });
      const enabledNow = async () => (await prisma.paymentChannelSetting.findUnique({ where: { code: ch.code } }))?.enabled ?? true;
      await gate({
        action: "payment_channel.update",
        send: (a, extra) => call(H.channels.PATCH as never, "PATCH", "/x", a.cookie, { code: ch.code, enabled: false, note: "uji f1", ...extra }),
        noEffect: async () => assert.equal(await enabledNow(), prev?.enabled ?? true),
      });
      assert.equal(await enabledNow(), false);
    });

    it("payment-channels/probe POST: tagihan uji produksi butuh step-up (diperiksa sebelum apa pun)", async () => {
      const saved = process.env.LINKQU_URL;
      delete process.env.LINKQU_URL;
      cleanup.push(async () => {
        if (saved !== undefined) process.env.LINKQU_URL = saved;
      });
      const a = await mkAdmin();
      const r1 = await call(H.probe.POST as never, "POST", "/x", a.cookie, { codes: [] });
      assert.equal(r1.status, 403);
      assert.equal(await codeOf(r1), "STEP_UP_REQUIRED");
      const r2 = await call(H.probe.POST as never, "POST", "/x", a.cookie, risky({ codes: [] }, { confirmPassword: "salah" }));
      assert.equal(r2.status, 403);
      assert.equal(await codeOf(r2), "STEP_UP_INVALID");
      // Lolos step-up -> baru kena pemeriksaan konfigurasi (LINKQU_URL kosong -> 400), bukan 403.
      const r3 = await call(H.probe.POST as never, "POST", "/x", a.cookie, risky({ codes: [] }));
      assert.equal(r3.status, 400);
    });
  });

  describe("templat & paket tema", () => {
    it("theme-packs review: menetapkan harga saat menyetujui butuh step-up; menolak tidak", async () => {
      const pack = await prisma.websiteThemePack.create({ data: { key: `f1-${t}`, version: "1.0.0", name: "Tema F1", authorName: "Dev", manifest: {} } });
      cleanup.push(() => prisma.websiteThemePack.deleteMany({ where: { id: pack.id } }));
      const a = await mkAdmin();
      const r1 = await call(H.packReview.POST as never, "POST", "/x", a.cookie, { action: "approve", price: 150_000 }, id(pack.id));
      assert.equal(r1.status, 403);
      assert.equal(await codeOf(r1), "STEP_UP_REQUIRED");
      const r2 = await call(H.packReview.POST as never, "POST", "/x", a.cookie, risky({ action: "approve", price: 150_000 }, { confirmPassword: "salah" }), id(pack.id));
      assert.equal(r2.status, 403);
      const r3 = await call(H.packReview.POST as never, "POST", "/x", a.cookie, risky({ action: "approve", price: 150_000 }), id(pack.id));
      assert.notEqual(r3.status, 403, "lolos step-up (hasil bisnis boleh 4xx lain)");
      const rej = await call(H.packReview.POST as never, "POST", "/x", a.cookie, { action: "reject", note: "Kontras kurang" }, id(pack.id));
      assert.equal(rej.status, 200, "menolak tanpa harga tidak menyentuh uang -> tanpa step-up");
    });

    it("app-templates decision: memberi/mencabut lencana Resmi butuh step-up; menolak tidak", async () => {
      const tpl = await prisma.appTemplate.create({
        data: { lineageKey: `f1${t}`, version: 1, publisherName: "Desa Penerbit", name: "Templat F1", description: "d", manifest: {}, manifestHash: "h".repeat(64), warnings: [] },
      });
      cleanup.push(() => prisma.appTemplate.deleteMany({ where: { id: tpl.id } }));
      const a = await mkAdmin();
      for (const body of [{ decision: "official" }, { decision: "unofficial" }, { decision: "approve", official: true }]) {
        const r = await call(H.tplDecision.POST as never, "POST", "/x", a.cookie, body, id(tpl.id));
        assert.equal(r.status, 403, JSON.stringify(body));
        assert.equal(await codeOf(r), "STEP_UP_REQUIRED");
      }
      const bad = await call(H.tplDecision.POST as never, "POST", "/x", a.cookie, risky({ decision: "official" }, { confirmPassword: "salah" }), id(tpl.id));
      assert.equal(bad.status, 403);
      assert.equal(await codeOf(bad), "STEP_UP_INVALID");
      const pass = await call(H.tplDecision.POST as never, "POST", "/x", a.cookie, risky({ decision: "official" }), id(tpl.id));
      assert.notEqual(pass.status, 403);
      const rej = await call(H.tplDecision.POST as never, "POST", "/x", a.cookie, { decision: "reject", note: "Kolom pribadi tidak ditandai" }, id(tpl.id));
      assert.equal(rej.status, 200);
    });
  });

  describe("persetujuan pendaftaran mitra", () => {
    const mkApp = async (email: string, passwordHash: string | null) => {
      seq += 1;
      const app = await prisma.partnerApplication.create({ data: { name: `Pelamar F1 ${t}-${seq}`, email, phone: "0812", region: "Kab Uji", message: "halo", passwordHash } });
      appIds.push(app.id);
      return app;
    };

    it("butuh step-up: tanpa sandi 403 dan pendaftaran tetap NEW; dengan sandi+alasan akun mitra dibuat", async () => {
      const { hashPassword } = await import("../lib/auth");
      const email = `f1-baru-${t}@uji.test`;
      const app = await mkApp(email, await hashPassword("SandiPelamar-123"));
      const { res } = await gate({
        action: "partner_application.approve",
        send: (a, extra) => call(H.appr.POST as never, "POST", "/x", a.cookie, extra, id(app.id)),
        noEffect: async () => {
          assert.equal((await prisma.partnerApplication.findUniqueOrThrow({ where: { id: app.id } })).status, "NEW");
          assert.equal(await prisma.partner.count({ where: { email } }), 0);
        },
      });
      partnerIds.push(((await res.json()) as { partnerId: number }).partnerId);
      assert.equal((await prisma.partnerApplication.findUniqueOrThrow({ where: { id: app.id } })).status, "APPROVED");
    });

    it("REGRESI takeover: email sudah milik mitra aktif -> 409, sandi/profil/sesi TIDAK berubah, pendaftaran tetap NEW", async () => {
      const { hashPassword } = await import("../lib/auth");
      const victimHash = await hashPassword("SandiAsliMitra-555");
      const victim = await prisma.partner.create({ data: { email: `f1-korban-${t}@uji.test`, password: victimHash, name: "Mitra Asli", phone: "0811", region: "Wilayah Asli", status: "active" } });
      partnerIds.push(victim.id);
      const attackerHash = await hashPassword("SandiPenyerang-999");
      const app = await mkApp(victim.email, attackerHash);
      const a = await mkAdmin();
      const r = await call(H.appr.POST as never, "POST", "/x", a.cookie, risky({}), id(app.id));
      assert.equal(r.status, 409);
      const j = (await r.json()) as { code: string; error: string };
      assert.equal(j.code, "PARTNER_EMAIL_EXISTS");
      assert.match(j.error, /DITOLAK/);
      const after = await prisma.partner.findUniqueOrThrow({ where: { id: victim.id } });
      assert.equal(after.password, victimHash, "hash sandi mitra tidak tertimpa");
      assert.equal(after.sessionVersion, victim.sessionVersion, "sesi mitra tidak dicabut");
      assert.equal(after.name, "Mitra Asli");
      assert.equal(after.region, "Wilayah Asli");
      assert.equal((await prisma.partnerApplication.findUniqueOrThrow({ where: { id: app.id } })).status, "NEW");
      const blocked = await auditOf(prisma, a.user.id, "partner_application.approve_blocked");
      assert.equal(blocked.length, 1);
      assert.equal(await prisma.platformAuditLog.count({ where: { actorId: a.user.id, action: "partner_application.approve" } }), 0);
      assert.ok(!JSON.stringify(blocked.map((r) => [r.summary, r.metadata])).includes(attackerHash));
    });

    it("REGRESI takeover: mitra non-aktif/ditangguhkan juga tidak diaktifkan ulang & email admin platform ditolak", async () => {
      const { hashPassword } = await import("../lib/auth");
      const h = await hashPassword("SandiAsli-111");
      const sus = await prisma.partner.create({ data: { email: `f1-sus-${t}@uji.test`, password: h, name: "Ditangguhkan", status: "suspended" } });
      partnerIds.push(sus.id);
      const a = await mkAdmin();
      const app1 = await mkApp(sus.email, await hashPassword("SandiPenyerang-222"));
      assert.equal((await call(H.appr.POST as never, "POST", "/x", a.cookie, risky({}), id(app1.id))).status, 409);
      const stillSus = await prisma.partner.findUniqueOrThrow({ where: { id: sus.id } });
      assert.equal(stillSus.status, "suspended");
      assert.equal(stillSus.password, h);
      // Email milik admin platform.
      const app2 = await mkApp(a.user.email, await hashPassword("SandiPenyerang-333"));
      assert.equal((await call(H.appr.POST as never, "POST", "/x", a.cookie, risky({}), id(app2.id))).status, 409);
      assert.equal(await prisma.partner.count({ where: { email: a.user.email } }), 0);
    });

    it("formulir publik: email milik mitra -> tetap 201 (tanpa membocorkan), tetapi sandi pelamar TIDAK disimpan & ditandai", async () => {
      const exist = await prisma.partner.create({ data: { email: `f1-pub-${t}@uji.test`, password: "x", name: "Mitra Publik", status: "active" } });
      partnerIds.push(exist.id);
      const send = (email: string) =>
        H.publicApply.POST(
          new NextRequest("http://localhost/api/partner-applications", {
            method: "POST",
            headers: { "content-type": "application/json", "x-real-ip": `10.8.${t % 250}.${++seq}` },
            body: JSON.stringify({ name: "Pelamar", email, phone: "0812345", region: "Kab Uji", message: "Mohon diproses", password: "SandiPelamar-12345", confirmPassword: "SandiPelamar-12345" }),
          }),
        );
      const r1 = await send(exist.email);
      assert.equal(r1.status, 201);
      const a1 = await prisma.partnerApplication.findFirstOrThrow({ where: { email: exist.email }, orderBy: { id: "desc" } });
      appIds.push(a1.id);
      assert.equal(a1.passwordHash, null);
      assert.equal((a1.meta as { emailConflict?: string }).emailConflict, "partner");
      // Email baru: perilaku lama (hash disimpan).
      const fresh = `f1-pubbaru-${t}@uji.test`;
      const r2 = await send(fresh);
      assert.equal(r2.status, 201);
      const a2 = await prisma.partnerApplication.findFirstOrThrow({ where: { email: fresh } });
      appIds.push(a2.id);
      assert.ok(a2.passwordHash && a2.passwordHash.startsWith("$2"));
      assert.equal((a2.meta as { emailConflict?: string } | null)?.emailConflict, undefined);
      // Persetujuan lamaran bertanda tetap ditolak.
      const adm = await mkAdmin();
      assert.equal((await call(H.appr.POST as never, "POST", "/x", adm.cookie, risky({}), id(a1.id))).status, 409);
    });
  });
});
