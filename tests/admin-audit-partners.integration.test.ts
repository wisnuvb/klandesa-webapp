/**
 * Paket E (retrofit jejak audit): rute uang/akses mitra di /api/admin/* — skema bagi hasil, persetujuan komisi, pencairan,
 * persetujuan pendaftaran mitra, tautan mitra-desa. Handler asli + MySQL scratch. Memeriksa: jejak tertulis dengan action benar,
 * tanpa rahasia (nomor rekening utuh, hash sandi), 401/403 tetap, idempotensi/balapan, kontrak respons tidak berubah.
 * Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { SKIP, setupEnv, makeAdmin, call, auditOf, assertNoSecrets, risky, type Prisma } from "./helpers/platform-admin";

describe("Retrofit audit: rute uang & akses mitra (MySQL nyata)", { skip: SKIP }, () => {
  let prisma: Prisma;
  let H: {
    rule: typeof import("../app/api/admin/partners/[id]/commission-rule/route");
    approve: typeof import("../app/api/admin/partners/[id]/commissions/approve/route");
    disb: typeof import("../app/api/admin/partners/[id]/disbursements/route");
    disbPatch: typeof import("../app/api/admin/disbursements/[id]/route");
    appr: typeof import("../app/api/admin/partner-applications/[id]/approve/route");
    villages: typeof import("../app/api/admin/villages/route");
  };
  let admin: Awaited<ReturnType<typeof makeAdmin>>;
  let support: Awaited<ReturnType<typeof makeAdmin>>;
  const t = Date.now() % 1e6;
  const ACCOUNT = "9876543210123456";
  let partnerId: number;
  const partnerIds: number[] = [];
  const villageIds: number[] = [];
  const appIds: bigint[] = [];
  let seq = 0;

  const entry = (status: string, amount = 100_000) =>
    prisma.partnerCommissionEntry.create({ data: { partnerId, type: "ADJUSTMENT", amount, status, description: `uji ${t}` } });
  const asId = (n: number | bigint | string) => ({ id: String(n) });

  before(async () => {
    const env = await setupEnv();
    prisma = env.prisma;
    H = {
      rule: await import("../app/api/admin/partners/[id]/commission-rule/route"),
      approve: await import("../app/api/admin/partners/[id]/commissions/approve/route"),
      disb: await import("../app/api/admin/partners/[id]/disbursements/route"),
      disbPatch: await import("../app/api/admin/disbursements/[id]/route"),
      appr: await import("../app/api/admin/partner-applications/[id]/approve/route"),
      villages: await import("../app/api/admin/villages/route"),
    };
    admin = await makeAdmin(prisma, env.encode, `aud-p-${t}`);
    support = await makeAdmin(prisma, env.encode, `aud-ps-${t}`, "platform_support");
    const p = await prisma.partner.create({ data: { email: `aud-mitra-${t}@uji.test`, password: "x", name: `Mitra Uji ${t}`, status: "active" } });
    partnerId = p.id;
    partnerIds.push(p.id);
    await prisma.partnerBankAccount.create({ data: { partnerId, bankName: "BCA", accountNumber: ACCOUNT, accountName: "Mitra Uji", isPrimary: true } });
  });

  after(async () => {
    await prisma.platformAuditLog.deleteMany({ where: { actorId: { in: [admin.user.id, support.user.id] } } });
    await prisma.village.deleteMany({ where: { id: { in: villageIds } } });
    await prisma.partnerApplication.deleteMany({ where: { id: { in: appIds } } });
    // Item pencairan menahan entri komisi (Restrict): hapus batch pencairan dulu, baru mitra.
    await prisma.partnerDisbursement.deleteMany({ where: { partnerId: { in: partnerIds } } });
    await prisma.partner.deleteMany({ where: { id: { in: partnerIds } } });
    await prisma.platformUser.deleteMany({ where: { id: { in: [admin.user.id, support.user.id] } } });
    await prisma.$disconnect();
  });

  it("401 tanpa sesi dan 403 untuk peran dukungan tetap berlaku di setiap mutasi", async () => {
    const mk = (c: string | null) => [
      call(H.rule.PATCH as never, "PATCH", "/x", c, { isActive: true }, asId(partnerId)),
      call(H.approve.POST as never, "POST", "/x", c, { approveAll: true }, asId(partnerId)),
      call(H.disb.POST as never, "POST", "/x", c, { commissionEntryIds: [1] }, asId(partnerId)),
      call(H.disbPatch.PATCH as never, "PATCH", "/x", c, { status: "paid" }, asId(1)),
      call(H.appr.POST as never, "POST", "/x", c, {}, asId(1)),
      call(H.villages.PATCH as never, "PATCH", "/x", c, { villageCode: "X" }),
    ];
    for (const r of await Promise.all(mk(null))) assert.equal(r.status, 401);
    for (const r of await Promise.all(mk(support.cookie))) assert.equal(r.status, 403);
    assert.equal((await auditOf(prisma, support.user.id)).length, 0);
  });

  describe("skema bagi hasil", () => {
    it("PATCH valid: jejak partner.commission_rule_update dengan sebelum/sesudah; respons tetap { ok, rule }", async () => {
      const res = await call(H.rule.PATCH as never, "PATCH", "/x", admin.cookie, risky({ closingBonusAmount: 250_000, closingBonusPercent: null, subscriptionSharePercent: 12.5, isActive: true }), asId(partnerId));
      assert.equal(res.status, 200);
      const j = (await res.json()) as { ok: boolean; rule: { subscriptionSharePercent: string } };
      assert.equal(j.ok, true);
      assert.equal(Number(j.rule.subscriptionSharePercent), 12.5);
      const rows = await auditOf(prisma, admin.user.id, "partner.commission_rule_update");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].targetType, "partner");
      assert.equal(rows[0].targetId, String(partnerId));
      assert.match(rows[0].summary, new RegExp(`Mitra Uji ${t}`));
      const md = rows[0].metadata as { before: unknown; after: { subscriptionSharePercent: number; closingBonusAmount: number } };
      assert.equal(md.after.subscriptionSharePercent, 12.5);
      assert.equal(md.after.closingBonusAmount, 250_000);
      assert.ok(md.before);
    });

    it("validasi: persen >100, nominal negatif/raksasa/teks, isActive bukan boolean -> 400 tanpa jejak", async () => {
      const before = (await auditOf(prisma, admin.user.id, "partner.commission_rule_update")).length;
      for (const body of [
        { subscriptionSharePercent: 101 },
        { closingBonusPercent: -1 },
        { closingBonusAmount: -5 },
        { closingBonusAmount: 1e12 },
        { closingBonusAmount: "abc" },
        { closingBonusAmount: true },
        { isActive: "false" },
      ]) {
        const res = await call(H.rule.PATCH as never, "PATCH", "/x", admin.cookie, risky(body), asId(partnerId));
        assert.equal(res.status, 400, JSON.stringify(body));
      }
      assert.equal((await call(H.rule.PATCH as never, "PATCH", "/x", admin.cookie, risky({}), { id: "1.5" })).status, 400, "ID mitra pecahan");
      assert.equal((await auditOf(prisma, admin.user.id, "partner.commission_rule_update")).length, before);
    });
  });

  describe("persetujuan komisi", () => {
    it("approve ids: jejak partner.commission_approve (jumlah+total), mengulang tidak menggandakan apa pun", async () => {
      const a = await entry("accrued", 100_000);
      const b = await entry("accrued", 50_000);
      const body = { ids: [String(a.id), String(b.id), String(a.id)] };
      const r1 = await call(H.approve.POST as never, "POST", "/x", admin.cookie, risky(body), asId(partnerId));
      assert.equal(r1.status, 200);
      assert.deepEqual(await r1.json(), { ok: true, approved: 2 });
      const rows = await auditOf(prisma, admin.user.id, "partner.commission_approve");
      assert.equal(rows.length, 1);
      const md = rows[0].metadata as { count: number; totalIdr: number };
      assert.equal(md.count, 2);
      assert.equal(md.totalIdr, 150_000);
      const r2 = await call(H.approve.POST as never, "POST", "/x", admin.cookie, risky(body), asId(partnerId));
      assert.deepEqual(await r2.json(), { ok: true, approved: 0 });
      assert.equal((await auditOf(prisma, admin.user.id, "partner.commission_approve")).length, 1, "tanpa efek = tanpa jejak baru");
    });

    it("validasi: ids bukan angka / nol / terlalu banyak -> 400; approveAll hanya menyentuh accrued", async () => {
      const bad = (ids: unknown) => call(H.approve.POST as never, "POST", "/x", admin.cookie, risky({ ids }), asId(partnerId));
      assert.equal((await bad(["abc"])).status, 400);
      assert.equal((await bad([0])).status, 400);
      assert.equal((await bad(Array.from({ length: 501 }, (_, i) => i + 1))).status, 400);
      const c = await entry("accrued", 10_000);
      const d = await entry("disbursed", 10_000);
      const res = await call(H.approve.POST as never, "POST", "/x", admin.cookie, risky({ approveAll: true }), asId(partnerId));
      assert.deepEqual(await res.json(), { ok: true, approved: 1 });
      assert.equal((await prisma.partnerCommissionEntry.findUniqueOrThrow({ where: { id: c.id } })).status, "approved");
      assert.equal((await prisma.partnerCommissionEntry.findUniqueOrThrow({ where: { id: d.id } })).status, "disbursed");
    });
  });

  describe("pencairan", () => {
    it("buat batch: jejak disbursement.create dengan rekening disamarkan; balapan pada entri sama -> hanya satu berhasil", async () => {
      const e1 = await entry("approved", 70_000);
      const e2 = await entry("approved", 30_000);
      const body = { commissionEntryIds: [String(e1.id), String(e2.id)], status: "pending" };
      const [r1, r2] = await Promise.all([
        call(H.disb.POST as never, "POST", "/x", admin.cookie, risky(body), asId(partnerId)),
        call(H.disb.POST as never, "POST", "/x", admin.cookie, risky(body), asId(partnerId)),
      ]);
      const codes = [r1.status, r2.status].sort();
      assert.equal(codes[0], 200, "tepat satu batch terbentuk");
      assert.ok(codes[1] === 400 || codes[1] === 409, `yang kalah ditolak (${codes[1]})`);
      assert.equal(await prisma.partnerDisbursementItem.count({ where: { commissionEntryId: { in: [e1.id, e2.id] } } }), 2, "setiap entri tepat satu item");
      const ok = (await [r1, r2].find((r) => r.status === 200)!.json()) as { ok: boolean; disbursement: { id: string; amount: string; items: unknown[] } };
      assert.equal(ok.ok, true);
      assert.equal(Number(ok.disbursement.amount), 100_000);
      assert.equal(ok.disbursement.items.length, 2);

      const rows = (await auditOf(prisma, admin.user.id, "disbursement.create")).filter((r) => (r.metadata as { commissionEntryIds: string[] }).commissionEntryIds.includes(String(e1.id)));
      assert.ok(rows.length >= 1);
      const md = rows[0].metadata as { accountNumberMasked: string; totalIdr: number };
      assert.equal(md.accountNumberMasked, "••••3456");
      assert.equal(md.totalIdr, 100_000);
      assertNoSecrets(rows, [ACCOUNT, "9876543210"]);
    });

    it("validasi: >200 entri, id bukan angka, entri belum approved -> 400", async () => {
      const bad = (ids: unknown) => call(H.disb.POST as never, "POST", "/x", admin.cookie, risky({ commissionEntryIds: ids }), asId(partnerId));
      assert.equal((await bad(Array.from({ length: 201 }, (_, i) => i + 1))).status, 400);
      assert.equal((await bad(["x"])).status, 400);
      const acc = await entry("accrued");
      assert.equal((await bad([String(acc.id)])).status, 400);
    });

    it("PATCH: processing=approve, paid=paid (entri jadi disbursed), paid ulang idempoten, paid->failed 409, tanggal masa depan 400", async () => {
      const e = await entry("approved", 40_000);
      const created = await call(H.disb.POST as never, "POST", "/x", admin.cookie, risky({ commissionEntryIds: [String(e.id)] }), asId(partnerId));
      const did = ((await created.json()) as { disbursement: { id: string } }).disbursement.id;
      const patch = (b: unknown) => call(H.disbPatch.PATCH as never, "PATCH", "/x", admin.cookie, risky(b), asId(did));

      assert.equal((await patch({ status: "processing" })).status, 200);
      assert.equal((await patch({ status: "paid", paidAt: new Date(Date.now() + 5 * 86_400_000).toISOString() })).status, 400);
      assert.equal((await patch({ status: "nonsense" })).status, 400);
      const paid = await patch({ status: "paid", reference: "TRF-123" });
      assert.equal(paid.status, 200);
      const pj = (await paid.json()) as { ok: boolean; disbursement: { status: string; paidAt: string } };
      assert.equal(pj.disbursement.status, "paid");
      assert.equal((await prisma.partnerCommissionEntry.findUniqueOrThrow({ where: { id: e.id } })).status, "disbursed");

      const firstPaidAt = pj.disbursement.paidAt;
      await new Promise((r) => setTimeout(r, 1100));
      const again = (await (await patch({ status: "paid" })).json()) as { disbursement: { paidAt: string } };
      assert.equal(again.disbursement.paidAt, firstPaidAt, "menandai lunas dua kali tidak menggeser tanggal bayar");
      assert.equal((await patch({ status: "failed" })).status, 409);
      assert.equal((await patch({ status: "pending" })).status, 409);

      const rows = (await auditOf(prisma, admin.user.id)).filter((r) => (r.metadata as { disbursementId?: string } | null)?.disbursementId === did);
      assert.deepEqual(rows.map((r) => r.action), ["disbursement.approve", "disbursement.paid", "disbursement.update"]);
      const md = rows[1].metadata as { before: { status: string }; after: { status: string } };
      assert.deepEqual([md.before.status, md.after.status], ["processing", "paid"]);
      assertNoSecrets(rows, [ACCOUNT]);
    });

    it("PATCH failed -> disbursement.reject; 404 untuk ID tak ada; ID tidak valid -> 400", async () => {
      const e = await entry("approved", 20_000);
      const created = await call(H.disb.POST as never, "POST", "/x", admin.cookie, risky({ commissionEntryIds: [String(e.id)] }), asId(partnerId));
      const did = ((await created.json()) as { disbursement: { id: string } }).disbursement.id;
      assert.equal((await call(H.disbPatch.PATCH as never, "PATCH", "/x", admin.cookie, risky({ status: "failed", notes: "gagal transfer" }), asId(did))).status, 200);
      const rows = (await auditOf(prisma, admin.user.id, "disbursement.reject")).filter((r) => (r.metadata as { disbursementId: string }).disbursementId === did);
      assert.equal(rows.length, 1);
      assert.equal((await call(H.disbPatch.PATCH as never, "PATCH", "/x", admin.cookie, risky({ status: "paid" }), asId("999999999"))).status, 404);
      assert.equal((await call(H.disbPatch.PATCH as never, "PATCH", "/x", admin.cookie, risky({ status: "paid" }), asId("12abc"))).status, 400);
    });
  });

  describe("persetujuan pendaftaran mitra", () => {
    const mkApp = async (withHash = true) => {
      seq += 1;
      const { hashPassword } = await import("../lib/auth");
      const hash = await hashPassword("SandiPelamar123");
      const app = await prisma.partnerApplication.create({
        data: { name: `Pelamar ${t}-${seq}`, email: `aud-app-${t}-${seq}@uji.test`, phone: "0812", region: "Kab Uji", message: "halo", passwordHash: withHash ? hash : null },
      });
      appIds.push(app.id);
      return { app, hash };
    };

    it("approve: jejak partner_application.approve tanpa hash/sandi; respons tetap; kedua kali -> 400", async () => {
      const { app, hash } = await mkApp();
      const res = await call(H.appr.POST as never, "POST", "/x", admin.cookie, risky({}), asId(app.id));
      assert.equal(res.status, 200);
      const j = (await res.json()) as { ok: boolean; partnerId: number; tempPassword: string | null; referralCode: string };
      assert.equal(j.ok, true);
      assert.equal(j.tempPassword, null, "pelamar memilih sandi sendiri");
      partnerIds.push(j.partnerId);
      const rows = (await auditOf(prisma, admin.user.id, "partner_application.approve")).filter((r) => r.targetId === `partner_application:${app.id}`);
      assert.equal(rows.length, 1);
      assert.match(rows[0].summary, new RegExp(`Pelamar ${t}-`));
      assertNoSecrets(rows, [hash, "SandiPelamar123", app.email]);
      const again = await call(H.appr.POST as never, "POST", "/x", admin.cookie, risky({}), asId(app.id));
      assert.equal(again.status, 400);
    });

    it("balapan klik ganda: tepat satu persetujuan berhasil, tidak ada mitra ganda", async () => {
      const { app } = await mkApp();
      const [a, b] = await Promise.all([
        call(H.appr.POST as never, "POST", "/x", admin.cookie, risky({}), asId(app.id)),
        call(H.appr.POST as never, "POST", "/x", admin.cookie, risky({}), asId(app.id)),
      ]);
      assert.deepEqual([a.status, b.status].sort(), [200, 400]);
      const ok = (await [a, b].find((r) => r.status === 200)!.json()) as { partnerId: number };
      partnerIds.push(ok.partnerId);
      assert.equal(await prisma.partner.count({ where: { email: app.email } }), 1);
      assert.equal((await prisma.partnerApplication.findUniqueOrThrow({ where: { id: app.id } })).status, "APPROVED");
    });

    it("data lama tanpa hash: sandi sementara tetap dikembalikan ke admin (kontrak UI) tetapi tidak masuk jejak", async () => {
      const { app } = await mkApp(false);
      const res = await call(H.appr.POST as never, "POST", "/x", admin.cookie, risky({}), asId(app.id));
      const j = (await res.json()) as { tempPassword: string; partnerId: number };
      assert.ok(j.tempPassword && j.tempPassword.length >= 8);
      partnerIds.push(j.partnerId);
      const rows = (await auditOf(prisma, admin.user.id, "partner_application.approve")).filter((r) => r.targetId === `partner_application:${app.id}`);
      assert.equal((rows[0].metadata as { tempPasswordIssued: boolean }).tempPasswordIssued, true);
      assertNoSecrets(rows, [j.tempPassword]);
    });
  });

  describe("tautan mitra-desa", () => {
    const mkVillage = async () => {
      seq += 1;
      const v = await prisma.village.create({
        data: { code: `AP${t}${seq}`, name: `Desa AP ${seq}`, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "trial", subscriptionExpiry: new Date(Date.now() + 86_400_000) },
      });
      villageIds.push(v.id);
      return v;
    };

    it("link: jejak village.link_partner + 1 komisi closing; lepas: village.unlink_partner; tautkan ulang tidak menggandakan closing", async () => {
      const v = await mkVillage();
      const link = () => call(H.villages.PATCH as never, "PATCH", "/x", admin.cookie, risky({ villageCode: v.code, partnerId, acquisitionSource: "uji" }));
      const unlink = () => call(H.villages.PATCH as never, "PATCH", "/x", admin.cookie, risky({ villageCode: v.code, partnerId: null }));
      const r1 = await link();
      assert.equal(r1.status, 200);
      const j = (await r1.json()) as { ok: boolean; village: { acquiredByPartnerId: number } };
      assert.equal(j.village.acquiredByPartnerId, partnerId);
      const closing = () => prisma.partnerCommissionEntry.count({ where: { partnerId, villageId: v.id, type: "CLOSING" } });
      assert.equal(await closing(), 1);

      assert.equal((await unlink()).status, 200);
      assert.equal((await link()).status, 200);
      assert.equal(await closing(), 1, "lepas lalu tautkan ulang tidak membuat komisi closing kedua");

      const rows = (await auditOf(prisma, admin.user.id)).filter((r) => r.villageId === v.id);
      assert.deepEqual(rows.map((r) => r.action), ["village.link_partner", "village.unlink_partner", "village.link_partner"]);
      assert.equal(rows[0].targetType, "village");
      assert.match(rows[0].summary, new RegExp(`Mitra Uji ${t}`));
      assert.equal((rows[0].metadata as { closingCommissionExpected: boolean }).closingCommissionExpected, true);
    });

    it("balapan: dua permintaan tautan bersamaan -> satu komisi closing; validasi ID pecahan/negatif -> 400", async () => {
      const v = await mkVillage();
      const link = () => call(H.villages.PATCH as never, "PATCH", "/x", admin.cookie, risky({ villageCode: v.code, partnerId }));
      const rs = await Promise.all([link(), link()]);
      assert.ok(rs.every((r) => r.status === 200 || r.status === 409));
      assert.ok(rs.some((r) => r.status === 200));
      assert.equal(await prisma.partnerCommissionEntry.count({ where: { partnerId, villageId: v.id, type: "CLOSING" } }), 1);
      for (const body of [{ villageCode: v.code, partnerId: 1.5 }, { villageCode: v.code, partnerId: -2 }, { villageId: 0.5 }]) {
        assert.equal((await call(H.villages.PATCH as never, "PATCH", "/x", admin.cookie, risky(body))).status, 400, JSON.stringify(body));
      }
      assert.equal((await call(H.villages.PATCH as never, "PATCH", "/x", admin.cookie, risky({ villageCode: v.code, partnerId: 99999999 }))).status, 404);
    });
  });
});
