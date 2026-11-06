/**
 * Dasbor Owner & Pendapatan (MySQL scratch nyata): angka agregat benar dari data buatan, batas bulan WIB, klasifikasi status,
 * MRR, konversi, churn, perhatian, penggunaan, dan API (401/403, batas halaman, ekspor beraudit & aman rumus).
 * Data pendapatan memakai tahun masa depan (2031/2033/2035) agar tidak bercampur dengan data agen lain di DB bersama;
 * angka global (status desa, mitra) dibandingkan sebagai SELISIH sebelum/sesudah. Butuh KEP_TEST_DATABASE_URL (nama DB memuat scratch/test).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Dasbor Owner & Pendapatan (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let revenue: typeof import("../lib/platform/metrics/revenue");
  let villagesLib: typeof import("../lib/platform/metrics/villages");
  let partnersLib: typeof import("../lib/platform/metrics/partners");
  let usageLib: typeof import("../lib/platform/metrics/usage");
  let attentionLib: typeof import("../lib/platform/metrics/attention");
  let cacheLib: typeof import("../lib/platform/metrics/cache");
  let aggregate: typeof import("../lib/platform/metrics/aggregate");
  let overviewRoute: typeof import("../app/api/admin/overview/route");
  let revenueRoute: typeof import("../app/api/admin/revenue/route");
  let invoicesRoute: typeof import("../app/api/admin/revenue/invoices/route");
  let exportRoute: typeof import("../app/api/admin/revenue/export/route");
  let NextRequest: typeof import("next/server").NextRequest;
  let encode: typeof import("next-auth/jwt").encode;

  const SECRET = "uji-rahasia-metrik-0123456789abcdef";
  const t = Date.now() % 1e6;
  const D = (iso: string) => new Date(iso);
  const villageIds: number[] = [];
  const partnerIds: number[] = [];
  const appEmails: string[] = [];
  let vN = 0;
  let seedN = 0;
  let iN = 0;
  let adminId = 0;
  let adminEmail = "";
  let adminCookie = "";
  let supportCookie = "";
  let villageUserCookie = "";
  let supportId = 0;

  const mkV = async (extra: Record<string, unknown> = {}) => {
    const n = ++vN;
    const v = await prisma.village.create({
      data: { code: `m${t}x${n}`, name: `MetrikDesa${t}-${n}`, district: "k", regency: "Kab Uji Metrik", province: "Prov Uji Metrik", address: "a", ...extra },
    });
    villageIds.push(v.id);
    return v;
  };
  const mkI = (villageId: number, o: { status?: string; productType?: string; planCode?: string; amount: number; paidAt?: Date | null; createdAt?: Date; expiresAt?: Date | null; extra?: Record<string, unknown> }) =>
    prisma.billingInvoice.create({
      data: {
        villageId, invoiceNumber: `INVT-${t}-${++iN}`, partnerReff: `T${t}-${iN}`, productType: o.productType ?? "desa_package", planCode: o.planCode ?? "lengkap",
        amount: o.amount, status: o.status ?? "paid", paidAt: o.paidAt === undefined ? (o.status && o.status !== "paid" ? null : o.createdAt ?? new Date()) : o.paidAt,
        createdAt: o.createdAt ?? new Date(), expiresAt: o.expiresAt ?? null, ...(o.extra ?? {}),
      } as never,
    });
  const req = (path: string, cookie: string | null) =>
    new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie: `next-auth.session-token=${cookie}` } : {} });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    ({ encode } = await import("next-auth/jwt"));
    revenue = await import("../lib/platform/metrics/revenue");
    villagesLib = await import("../lib/platform/metrics/villages");
    partnersLib = await import("../lib/platform/metrics/partners");
    usageLib = await import("../lib/platform/metrics/usage");
    attentionLib = await import("../lib/platform/metrics/attention");
    cacheLib = await import("../lib/platform/metrics/cache");
    aggregate = await import("../lib/platform/metrics/aggregate");
    overviewRoute = await import("../app/api/admin/overview/route");
    revenueRoute = await import("../app/api/admin/revenue/route");
    invoicesRoute = await import("../app/api/admin/revenue/invoices/route");
    exportRoute = await import("../app/api/admin/revenue/export/route");

    const admin = await prisma.platformUser.create({ data: { email: `metrik-admin${t}@uji.test`, password: "x", name: "Admin Metrik", role: "platform_admin" } });
    const support = await prisma.platformUser.create({ data: { email: `metrik-support${t}@uji.test`, password: "x", name: "Support", role: "platform_support" } });
    adminId = admin.id;
    supportId = support.id;
    adminEmail = admin.email;
    const platformToken = (u: { id: number; email: string }, role: string) => ({ sub: `pl:${u.id}`, id: `pl:${u.id}`, accountType: "platform", role, email: u.email, name: "P" });
    adminCookie = await encode({ secret: SECRET, token: platformToken(admin, "platform_admin") as never });
    supportCookie = await encode({ secret: SECRET, token: platformToken(support, "platform_admin") as never }); // JWT bilang admin, DB bilang support
    const v = await mkV();
    const u = await prisma.user.create({ data: { villageId: v.id, email: `metrik-u${t}@uji.test`, password: "x", name: "U", role: "admin" } });
    villageUserCookie = await encode({
      secret: SECRET,
      token: { sub: String(u.id), id: String(u.id), role: "admin", villageId: v.id, villageCode: v.code, accountType: "village", name: "U", email: u.email },
    });
  });

  after(async () => {
    await prisma.platformAuditLog.deleteMany({ where: { actorEmail: adminEmail } });
    await prisma.village.deleteMany({ where: { id: { in: villageIds } } });
    await prisma.partner.deleteMany({ where: { id: { in: partnerIds } } });
    await prisma.partnerApplication.deleteMany({ where: { email: { in: appEmails } } });
    await prisma.platformUser.deleteMany({ where: { id: { in: [adminId, supportId] } } });
    await prisma.$disconnect();
  });

  describe("pendapatan (tahun 2031)", () => {
    const now = D("2031-03-15T05:00:00Z"); // 15 Mar 2031 12:00 WIB
    let vid = 0;
    before(async () => {
      vid = (await mkV()).id;
      await mkI(vid, { amount: 3_500_000, paidAt: D("2031-01-31T17:30:00Z"), createdAt: D("2031-01-31T17:00:00Z") }); // 1 Feb 00:30 WIB -> Februari
      await mkI(vid, { amount: 100_000, paidAt: D("2031-01-31T16:30:00Z"), createdAt: D("2031-01-31T16:00:00Z") }); // 31 Jan 23:30 WIB -> Januari
      await mkI(vid, { productType: "arsip", planCode: "starter", amount: 35_000, paidAt: D("2031-03-10T03:00:00Z"), createdAt: D("2031-03-10T02:00:00Z") });
      await mkI(vid, { productType: "website_custom", planCode: "default", amount: 1_900_000, paidAt: D("2031-03-15T01:00:00Z"), createdAt: D("2031-03-15T00:30:00Z") });
      await mkI(vid, { status: "pending", amount: 50_000, createdAt: D("2031-03-01T00:00:00Z"), expiresAt: D("2031-03-20T00:00:00Z") });
      await mkI(vid, { status: "pending", amount: 70_000, createdAt: D("2031-03-02T00:00:00Z"), expiresAt: D("2031-03-03T00:00:00Z") }); // pending lewat batas = kedaluwarsa
      await mkI(vid, { status: "expired", amount: 80_000, createdAt: D("2031-03-04T00:00:00Z") });
      await mkI(vid, { status: "failed", amount: 90_000, createdAt: D("2031-03-05T00:00:00Z") });
    });

    it("12 bulan: deret bulanan WIB, total, rata-rata, rincian produk, tagihan bermasalah", async () => {
      const r = await revenue.computeRevenue("12m", now);
      assert.equal(r.series.length, 12);
      const by = Object.fromEntries(r.series.map((p) => [p.key, p]));
      assert.deepEqual([by["2031-01"].amount, by["2031-01"].count], [100_000, 1]);
      assert.deepEqual([by["2031-02"].amount, by["2031-02"].count], [3_500_000, 1], "31 Jan 17:30 UTC = 1 Feb WIB");
      assert.deepEqual([by["2031-03"].amount, by["2031-03"].count], [1_935_000, 2]);
      assert.equal(by["2030-12"].amount, 0);
      assert.equal(r.total.amount, 5_535_000);
      assert.equal(r.total.count, 4);
      assert.equal(r.total.average, 1_383_750);
      assert.equal(r.series.reduce((s, p) => s + p.amount, 0), r.total.amount);
      assert.equal(r.changePct, null, "pembanding 0 = tak terhitung");
      assert.deepEqual(r.byProduct.map((p) => [p.productType, p.amount]), [["website_custom", 1_900_000], ["desa_package", 3_600_000], ["arsip", 35_000]].sort((a, b) => (b[1] as number) - (a[1] as number)));
      assert.ok(Math.abs((r.byProduct.reduce((s, p) => s + (p.share ?? 0), 0)) - 1) < 1e-9);
      assert.deepEqual(r.issues.pending, { count: 1, amount: 50_000 });
      assert.deepEqual(r.issues.expired, { count: 2, amount: 150_000 });
      assert.deepEqual(r.issues.failed, { count: 1, amount: 90_000 });
      assert.equal(r.timezone, "Asia/Jakarta");
    });

    it("30 hari: deret harian WIB; pembayaran 31 Jan di luar jendela", async () => {
      const r = await revenue.computeRevenue("30d", now);
      assert.equal(r.series.length, 30);
      const by = Object.fromEntries(r.series.map((p) => [p.key, p.amount]));
      assert.equal(by["2031-03-10"], 35_000);
      assert.equal(by["2031-03-15"], 1_900_000);
      assert.equal(r.total.amount, 1_935_000);
      assert.equal(r.granularity, "day");
    });

    it("ytd 2031: Jan-Mar; perubahan vs tahun lalu null (pembanding 0); pembanding diisi bila ada data", async () => {
      const r = await revenue.computeRevenue("ytd", now);
      assert.deepEqual(r.series.map((p) => p.key), ["2031-01", "2031-02", "2031-03"]);
      assert.equal(r.total.amount, 5_535_000);
      // Tahun depan: 2031 menjadi pembanding.
      const next = await revenue.computeRevenue("ytd", D("2032-03-15T05:00:00Z"));
      assert.equal(next.total.amount, 0);
      assert.equal(next.previous.amount, 5_535_000);
      assert.equal(next.changePct, -1);
    });

    it("cache 60 dtk: hasil kedua identik tanpa memuat ulang, lalu bersih setelah clear", async () => {
      cacheLib.clearMetricsCache();
      const a = await revenue.getRevenue("30d");
      const probe = await mkI(vid, { amount: 4_242, createdAt: new Date(), paidAt: new Date() });
      const b = await revenue.getRevenue("30d");
      assert.equal(b.total.amount, a.total.amount, "dari cache");
      cacheLib.clearMetricsCache();
      const c = await revenue.getRevenue("30d");
      assert.equal(c.total.amount, a.total.amount + 4_242);
      await prisma.billingInvoice.delete({ where: { id: probe.id } });
      cacheLib.clearMetricsCache();
    });
  });

  describe("pertumbuhan & konversi trial -> berbayar (tahun 2033)", () => {
    const now = D("2033-03-15T05:00:00Z");
    before(async () => {
      const f1 = await mkV({ createdAt: D("2033-02-10T03:00:00Z") });
      const f2 = await mkV({ createdAt: D("2033-02-20T03:00:00Z") });
      await mkV({ createdAt: D("2033-02-25T03:00:00Z") });
      await mkV({ createdAt: D("2033-01-31T17:30:00Z") }); // 1 Feb WIB -> Februari
      await mkV({ createdAt: D("2033-01-31T16:30:00Z") }); // Januari WIB
      await mkV({ createdAt: D("2033-03-10T03:00:00Z") }); // trial masih berjalan: belum masuk penyebut konversi
      await mkI(f1.id, { amount: 3_500_000, paidAt: D("2033-02-15T03:00:00Z"), createdAt: D("2033-02-15T03:00:00Z") });
      await mkI(f2.id, { amount: 3_500_000, paidAt: D("2033-02-25T03:00:00Z"), createdAt: D("2033-02-25T03:00:00Z") });
      await mkI(f2.id, { productType: "ai_credits", planCode: "x", amount: 1, paidAt: D("2033-02-25T03:00:00Z"), createdAt: D("2033-02-25T03:00:00Z") });
    });
    it("pendaftaran per bulan WIB + yang berbayar; konversi 90 hari hanya desa dengan trial selesai", async () => {
      const s = await villagesLib.computeVillageStats(now);
      const by = Object.fromEntries(s.growth.map((g) => [g.key, g]));
      assert.deepEqual([by["2033-02"].registered, by["2033-02"].converted], [4, 2]);
      assert.deepEqual([by["2033-01"].registered, by["2033-01"].converted], [1, 0]);
      assert.deepEqual([by["2033-03"].registered, by["2033-03"].converted], [1, 0]);
      assert.equal(s.growth.length, 12);
      assert.deepEqual([s.conversion.eligible, s.conversion.converted], [5, 2]);
      assert.equal(s.conversion.rate, 0.4);
      assert.equal(s.conversion.windowDays, 90);
    });
    it("tanpa desa yang memenuhi syarat: konversi null (bukan 0%)", async () => {
      const s = await villagesLib.computeVillageStats(D("2040-01-01T00:00:00Z"));
      assert.equal(s.conversion.eligible, 0);
      assert.equal(s.conversion.rate, null);
    });
  });

  describe("status langganan, kedaluwarsa, MRR, churn, distribusi (now = 15 Jun 2035)", () => {
    const now = D("2035-06-15T05:00:00Z");
    let before_: Awaited<ReturnType<typeof villagesLib.computeVillageStats>>;
    let after_: Awaited<ReturnType<typeof villagesLib.computeVillageStats>>;
    let partnerId = 0;

    const seed = async () => {
      const partner = await prisma.partner.create({ data: { email: `metrik-mitra${t}-${++seedN}@uji.test`, password: "x", name: `Mitra Metrik ${t}` } });
      partnerId = partner.id;
      partnerIds.push(partner.id);
      const far = D("2036-06-01T00:00:00Z");
      // Berlangganan aktif: A tahun pertama (tagihan awal lunas), B perpanjangan, C paket lama tanpa tagihan.
      const A = await mkV({ subscriptionStatus: "active", subscriptionPlan: "lengkap", subscriptionExpiry: far, absensiGpsAddonActive: true, absensiGpsAddonExpiry: D("2035-07-01T00:00:00Z"), acquisitionSource: `referral:UJI${t}`, acquiredByPartnerId: partnerId });
      const B = await mkV({ subscriptionStatus: "active", subscriptionPlan: "lengkap", subscriptionExpiry: D("2035-06-20T00:00:00Z"), acquisitionSource: "admin" });
      const C = await mkV({ subscriptionStatus: "active", subscriptionPlan: "starter", subscriptionExpiry: null });
      await mkI(A.id, { amount: 3_500_000, paidAt: D("2035-03-01T00:00:00Z"), createdAt: D("2035-03-01T00:00:00Z") });
      await mkI(B.id, { amount: 100_000, planCode: "lengkap", paidAt: D("2033-01-01T00:00:00Z"), createdAt: D("2033-01-01T00:00:00Z") });
      await prisma.villageModuleSubscription.createMany({
        data: [
          { villageId: A.id, moduleCode: "arsip_storage", planCode: "starter", status: "active", startDate: D("2035-06-01T00:00:00Z"), expiryDate: D("2035-12-01T00:00:00Z") },
          { villageId: B.id, moduleCode: "absensi_capacity", planCode: "professional", status: "active", startDate: D("2035-06-01T00:00:00Z"), expiryDate: D("2035-12-01T00:00:00Z") },
          { villageId: C.id, moduleCode: "bumdes", planCode: "default", status: "active", startDate: D("2035-06-01T00:00:00Z"), expiryDate: D("2035-12-01T00:00:00Z") },
          // Add-on yang sudah lewat masa: tidak dihitung.
          { villageId: C.id, moduleCode: "pkk", planCode: "default", status: "active", startDate: D("2035-01-01T00:00:00Z"), expiryDate: D("2035-02-01T00:00:00Z") },
        ],
      });
      // Trial berjalan, trial tenggang, trial lewat tenggang, aktif kedaluwarsa, nonaktif (isActive=false), dibatalkan.
      await mkV({ subscriptionStatus: "trial", subscriptionExpiry: D("2035-06-20T00:00:00Z") });
      await mkV({ subscriptionStatus: "trial", subscriptionExpiry: D("2035-06-12T00:00:00Z") });
      await mkV({ subscriptionStatus: "trial", subscriptionExpiry: D("2035-06-01T00:00:00Z") });
      const churned = await mkV({ subscriptionStatus: "inactive", subscriptionExpiry: D("2035-06-05T00:00:00Z") }); // habis 10 hari lalu, pernah bayar
      const neverPaid = await mkV({ subscriptionStatus: "active", subscriptionExpiry: D("2035-06-05T00:00:00Z") }); // habis tapi tak pernah bayar: bukan churn
      const old = await mkV({ subscriptionStatus: "inactive", subscriptionExpiry: D("2035-04-01T00:00:00Z") }); // lebih dari 30 hari lalu
      await mkI(churned.id, { amount: 3_500_000, paidAt: D("2034-06-05T00:00:00Z"), createdAt: D("2034-06-05T00:00:00Z") });
      await mkI(old.id, { amount: 3_500_000, paidAt: D("2034-04-01T00:00:00Z"), createdAt: D("2034-04-01T00:00:00Z") });
      void neverPaid;
      await mkV({ subscriptionStatus: "active", subscriptionExpiry: far, isActive: false });
      await mkV({ subscriptionStatus: "cancelled", subscriptionExpiry: far });
    };

    // Statistik ini GLOBAL (seluruh tabel desa), sedangkan berkas tes lain berjalan paralel di DB yang sama dan menambah/menghapus
    // desa. Selisih sebelum/sesudah hanya dipercaya bila keadaan dasar sebelum dan sesudah desa uji dibersihkan IDENTIK
    // (tidak ada perubahan pihak lain di sela-selanya); kalau tidak, ulangi. Setelah terbukti stabil, data uji dibuat lagi
    // karena tes lain di blok ini membaca barisnya.
    const cleanupOwn = async (v0: number, p0: number) => {
      await prisma.village.deleteMany({ where: { id: { in: villageIds.slice(v0) } } });
      await prisma.partner.deleteMany({ where: { id: { in: partnerIds.slice(p0) } } });
    };
    before(async () => {
      for (let attempt = 1; attempt <= 8; attempt++) {
        const v0 = villageIds.length;
        const p0 = partnerIds.length;
        before_ = await villagesLib.computeVillageStats(now);
        await seed();
        const measuredPartnerId = partnerId; // after_ mengacu ke mitra dari seed yang DIUKUR, bukan seed ulang di bawah
        after_ = await villagesLib.computeVillageStats(now);
        await cleanupOwn(v0, p0);
        const baseAfter = await villagesLib.computeVillageStats(now);
        if (JSON.stringify(baseAfter) === JSON.stringify(before_) || attempt === 8) {
          await seed();
          partnerId = measuredPartnerId;
          return;
        }
      }
    });

    it("jumlah per status = selisih yang diharapkan (SQL CASE sejalan dengan classifyVillageStatus)", () => {
      const d = (k: keyof typeof after_.byStatus) => after_.byStatus[k] - before_.byStatus[k];
      assert.equal(d("aktif"), 3);
      assert.equal(d("trial"), 1);
      assert.equal(d("tenggang"), 1);
      assert.equal(d("kedaluwarsa"), 1 + 1 + 1 + 1, "trial lewat tenggang + inactive x2 + active kedaluwarsa tak pernah bayar");
      assert.equal(d("nonaktif"), 2);
      assert.equal(after_.total - before_.total, 3 + 3 + 3 + 1 + 1 + 0, "total villages bertambah 3 aktif + 3 trial + 3 habis + 2 nonaktif");
    });

    it("segera berakhir: hanya yang aktif berbayar & belum lewat, jendela kumulatif", () => {
      assert.equal(after_.expiring.d7 - before_.expiring.d7, 1, "B berakhir 5 hari lagi");
      assert.equal(after_.expiring.d14 - before_.expiring.d14, 1);
      assert.equal(after_.expiring.d30 - before_.expiring.d30, 1);
    });

    it("MRR: selisih = tahun pertama + perpanjangan + paket lama + add-on (modul yang lewat masa & modul gratis tak dihitung)", () => {
      const expected = Math.round(3_500_000 / 12) + 100_000 + 100_000 + 49_000 /* GPS */ + 35_000 /* arsip */ + 50_000 /* kapasitas 99rb-49rb */ + 49_000 /* bumdes paket lama */;
      const delta = after_.mrr.mrr - before_.mrr.mrr;
      assert.ok(Math.abs(delta - expected) <= 1, `delta ${delta} vs ${expected}`);
      assert.equal(after_.mrr.arr, after_.mrr.mrr * 12);
      assert.equal(after_.mrr.activeVillages - before_.mrr.activeVillages, 3);
      assert.equal(after_.mrr.activeWithoutPaidInvoice - before_.mrr.activeWithoutPaidInvoice, 1, "paket lama C tanpa tagihan lunas");
    });

    it("churn kasar: kedaluwarsa 30 hari terakhir yang pernah membayar; tak pernah bayar / >30 hari tak dihitung", () => {
      assert.equal(after_.churn.churned - before_.churn.churned, 1);
      assert.equal(after_.churn.windowDays, 30);
      assert.ok(after_.churn.rate != null && after_.churn.rate > 0 && after_.churn.rate < 1);
    });

    it("distribusi: sumber (awalan sebelum ':'), mitra, kabupaten; top 10 berbatas", () => {
      assert.ok(after_.topProvinces.length <= 10 && after_.topRegencies.length <= 10 && after_.bySource.length <= 10 && after_.byPartner.length <= 10);
      const labels = after_.bySource.map((s) => s.label);
      assert.ok(labels.every((l) => !l.includes(":")));
      assert.ok(after_.byPartner.some((p) => p.partnerId === partnerId && p.count === 1 && p.name.includes("Mitra Metrik")));
    });

    it("classifyVillageStatus (TS) memberi kelas yang sama untuk desa uji", async () => {
      const rows = await prisma.village.findMany({ where: { id: { in: villageIds } }, select: { isActive: true, subscriptionStatus: true, subscriptionExpiry: true } });
      const counts: Record<string, number> = {};
      for (const r of rows) {
        if (!r.subscriptionExpiry || r.subscriptionExpiry.getFullYear() < 2034) continue; // hanya desa uji 2035
        const c = aggregate.classifyVillageStatus(r, now);
        counts[c] = (counts[c] ?? 0) + 1;
      }
      assert.deepEqual([counts.aktif, counts.trial, counts.tenggang, counts.nonaktif], [2, 1, 1, 2]);
    });
  });

  describe("perhatian & penggunaan (now = 15 Jun 2035)", () => {
    const now = D("2035-06-15T05:00:00Z");
    it("daftar perhatian: langganan ≤7 hari, trial ≤3 hari, tagihan menunggu >3 hari, mitra baru, pencairan", async () => {
      const before = await attentionLib.fetchAttentionRaw(now);
      const E = await mkV({ subscriptionStatus: "active", subscriptionExpiry: D("2035-06-18T00:00:00Z") });
      const T = await mkV({ subscriptionStatus: "trial", subscriptionExpiry: D("2035-06-16T00:00:00Z") });
      const far = await mkV({ subscriptionStatus: "active", subscriptionExpiry: D("2035-09-18T00:00:00Z") });
      await mkI(far.id, { status: "pending", amount: 123_000, createdAt: D("2035-06-01T00:00:00Z"), expiresAt: D("2035-12-01T00:00:00Z") });
      await mkI(far.id, { status: "pending", amount: 999_000, createdAt: D("2035-06-14T00:00:00Z"), expiresAt: D("2035-12-01T00:00:00Z") }); // baru: bukan >3 hari
      const email = `metrik-app${t}@uji.test`;
      appEmails.push(email);
      await prisma.partnerApplication.create({ data: { name: "Calon Mitra", email, phone: "081", region: "x", message: "m", status: "NEW" } });
      const partner = await prisma.partner.create({ data: { email: `metrik-disb${t}@uji.test`, password: "x", name: "Mitra Cair" } });
      partnerIds.push(partner.id);
      await prisma.partnerDisbursement.create({ data: { partnerId: partner.id, amount: 200_000, status: "pending", bankName: "B", accountNumber: "1", accountName: "N" } });

      const after = await attentionLib.fetchAttentionRaw(now);
      assert.equal(after.expiring7d.total - before.expiring7d.total, 1);
      assert.ok(after.expiring7d.sample.some((s) => s.id === E.id));
      assert.equal(after.trialEnding3d.total - before.trialEnding3d.total, 1);
      assert.ok(after.trialEnding3d.sample.some((s) => s.id === T.id));
      assert.equal(after.pendingOld.total - before.pendingOld.total, 1);
      assert.equal(after.pendingOld.amount - before.pendingOld.amount, 123_000);
      assert.equal(after.applicationsNew - before.applicationsNew, 1);
      assert.equal(after.disbursementsWaiting.count - before.disbursementsWaiting.count, 1);
      assert.equal(after.disbursementsWaiting.amount - before.disbursementsWaiting.amount, 200_000);
      const items = attentionLib.buildAttention(after, now);
      assert.ok(items.length >= 4);
      assert.ok(items.some((i) => i.entries.some((e) => e.href === `/admin/desa/${E.id}`)));
    });

    it("penggunaan: staf aktif 7/30 hari, desa tanpa login (baru <7 hari & yang login baru dikecualikan), batas contoh ≤10", async () => {
      const before = await usageLib.computeUsageStats(now);
      const X = await mkV({ subscriptionStatus: "active", subscriptionExpiry: D("2036-01-01T00:00:00Z"), createdAt: D("2035-01-01T00:00:00Z") });
      const Y = await mkV({ subscriptionStatus: "active", subscriptionExpiry: D("2036-01-01T00:00:00Z"), createdAt: D("2035-01-01T00:00:00Z") });
      const Z = await mkV({ subscriptionStatus: "trial", subscriptionExpiry: D("2036-01-01T00:00:00Z"), createdAt: D("2035-06-12T00:00:00Z") });
      const mkU = (villageId: number, n: string, lastLogin: Date | null, extra: Record<string, unknown> = {}) =>
        prisma.user.create({ data: { villageId, email: `metrik-${n}${t}@uji.test`, password: "x", name: n, role: "staff", lastLogin, ...extra } });
      await mkU(X.id, "x", D("2035-01-10T00:00:00Z"));
      await mkU(Y.id, "y1", D("2035-06-14T00:00:00Z"));
      await mkU(Y.id, "y2", D("2035-06-01T00:00:00Z"));
      await mkU(Y.id, "y3", D("2035-06-14T00:00:00Z"), { isActive: false }); // nonaktif tidak dihitung
      await mkU(Z.id, "z", null, { aiCredits: 5 });
      const after = await usageLib.computeUsageStats(now);
      assert.equal(after.staff.active7d - before.staff.active7d, 1);
      assert.equal(after.staff.active30d - before.staff.active30d, 2);
      assert.equal(after.staff.villagesActive30d - before.staff.villagesActive30d, 1);
      assert.equal(after.staff.total - before.staff.total, 4);
      assert.equal(after.inactiveVillages.total - before.inactiveVillages.total, 1, "hanya X: Y baru login, Z baru berumur 3 hari");
      assert.ok(after.inactiveVillages.sample.length <= 10);
      assert.ok(!after.inactiveVillages.sample.some((s) => s.id === Y.id || s.id === Z.id));
      assert.equal(after.aiCredits.usersLow - before.aiCredits.usersLow, 1);
      assert.ok(after.topModules.length <= 10);
    });

    it("mitra & komisi: tertunda/disetujui/dicairkan per status, yang dibatalkan tak dihitung, mitra teratas", async () => {
      const before = await partnersLib.computePartnerStats();
      const p = await prisma.partner.create({ data: { email: `metrik-top${t}@uji.test`, password: "x", name: `Mitra Teratas ${t}` } });
      partnerIds.push(p.id);
      const e = (status: string, amount: number) => ({ partnerId: p.id, type: "ADJUSTMENT", status, amount });
      await prisma.partnerCommissionEntry.createMany({
        data: [e("accrued", 9_000_000_000_000), e("accrued", 300_000), e("approved", 200_000), e("disbursed", 100_000), e("cancelled", 50_000)],
      });
      const after = await partnersLib.computePartnerStats();
      assert.equal(after.commission.accrued.amount - before.commission.accrued.amount, 9_000_000_300_000);
      assert.equal(after.commission.accrued.count - before.commission.accrued.count, 2);
      assert.equal(after.commission.approved.amount - before.commission.approved.amount, 200_000);
      assert.equal(after.commission.disbursed.amount - before.commission.disbursed.amount, 100_000);
      assert.equal(after.topPartners[0].partnerId, p.id);
      assert.equal(after.topPartners[0].amount, 9_000_000_600_000);
      assert.ok(after.topPartners.length <= 5);
    });
  });

  describe("API", () => {
    it("401 tanpa sesi / sesi akun desa; 403 bila role di DB bukan admin platform", async () => {
      const handlers: Array<[string, (r: import("next/server").NextRequest) => Promise<Response>]> = [
        ["/api/admin/overview", overviewRoute.GET],
        ["/api/admin/revenue", revenueRoute.GET],
        ["/api/admin/revenue/invoices", invoicesRoute.GET],
        ["/api/admin/revenue/export", exportRoute.GET],
      ];
      const auditBefore = await prisma.platformAuditLog.count({ where: { action: "revenue.export", actorEmail: adminEmail } });
      for (const [path, h] of handlers) {
        assert.equal((await h(req(path, null))).status, 401, `${path} tanpa sesi`);
        assert.equal((await h(req(path, villageUserCookie))).status, 401, `${path} akun desa`);
        assert.equal((await h(req(path, supportCookie))).status, 403, `${path} support`);
      }
      assert.equal(await prisma.platformAuditLog.count({ where: { action: "revenue.export", actorEmail: adminEmail } }), auditBefore, "penolakan tidak menulis audit");
    });

    it("overview: bentuk muatan lengkap, angka, dan tanda perkiraan MRR", async () => {
      cacheLib.clearMetricsCache();
      const res = await overviewRoute.GET(req("/api/admin/overview", adminCookie));
      assert.equal(res.status, 200);
      assert.match(res.headers.get("cache-control") ?? "", /no-store/);
      const j = await res.json();
      assert.equal(j.mrrIsEstimate, true);
      assert.equal(j.timezone, "Asia/Jakarta");
      for (const k of ["revenueThisMonth", "revenueLastMonth", "revenueLastMonthSamePeriod", "expiringSoon"]) assert.ok(j.kpis[k] != null, k);
      assert.equal(typeof j.kpis.mrr, "number");
      assert.equal(j.kpis.arr, j.kpis.mrr * 12);
      assert.equal(j.revenue12m.series.length, 12);
      assert.equal(j.villages.growth.length, 12);
      assert.ok(Array.isArray(j.attention));
      assert.ok(j.villages.mrr.assumptions.length > 0);
      assert.ok(j.usage.inactiveVillages.sample.length <= 10);
      assert.ok(!JSON.stringify(j).includes("password"));
    });

    it("revenue: rentang tidak valid -> 400; bawaan 30d; selisih total = tagihan lunas baru (cache dibersihkan)", async () => {
      assert.equal((await revenueRoute.GET(req("/api/admin/revenue?range=7d", adminCookie))).status, 400);
      cacheLib.clearMetricsCache();
      const a = await (await revenueRoute.GET(req("/api/admin/revenue", adminCookie))).json();
      assert.equal(a.range, "30d");
      assert.equal(a.series.length, 30);
      const v = await mkV();
      const before30 = a.total.amount as number;
      await mkI(v.id, { amount: 7_777_777, paidAt: new Date(), createdAt: new Date() });
      cacheLib.clearMetricsCache();
      const b = await (await revenueRoute.GET(req("/api/admin/revenue?range=12m", adminCookie))).json();
      cacheLib.clearMetricsCache();
      assert.equal(b.range, "12m");
      assert.ok(b.total.amount >= 7_777_777);
      assert.ok(b.byProduct.some((p: { productType: string; amount: number }) => p.productType === "desa_package" && p.amount >= 7_777_777));
      assert.equal(b.latest.length > 0, true);
      cacheLib.clearMetricsCache();
      const a30 = await (await revenueRoute.GET(req("/api/admin/revenue?range=30d", adminCookie))).json();
      assert.ok(Math.abs(a30.total.amount - before30 - 7_777_777) < 1_000_000, "tagihan baru Rp 7.777.777 masuk deret 30 hari (toleransi data agen lain)");
      assert.ok(a30.total.amount >= 7_777_777);
    });

    describe("daftar tagihan & ekspor", () => {
      const prefix = () => `MetrikDesa${t}-`;
      let evil: { id: number; name: string };
      before(async () => {
        const v = await mkV({ name: `=HYPERLINK("http://jahat.test","x")${t}` });
        evil = { id: v.id, name: v.name };
        await mkI(v.id, { amount: 1_000, paidAt: D("2031-05-05T03:00:00Z"), createdAt: D("2031-05-05T03:00:00Z"), extra: { rawResponse: { rahasia: "RAHASIA-PAYLOAD" }, paymentUrl: "https://bayar.test/rahasia-url", vaNumber: "8888000011" } });
        const big = await mkV({ name: `Zbanyak${t}` });
        await prisma.billingInvoice.createMany({
          data: Array.from({ length: 55 }, (_, i) => ({
            villageId: big.id, invoiceNumber: `INVB-${t}-${i}`, partnerReff: `B${t}-${i}`, productType: "arsip", planCode: "starter", amount: 35_000,
            status: i % 5 === 0 ? "pending" : "paid", paidAt: i % 5 === 0 ? null : D("2031-06-01T03:00:00Z"), createdAt: new Date(D("2031-06-01T03:00:00Z").getTime() + i * 1000),
          })),
        });
      });

      it("batas halaman: ukuran default 25, maksimum 50, total & halaman terakhir benar", async () => {
        const base = `/api/admin/revenue/invoices?q=Zbanyak${t}`;
        const def = await (await invoicesRoute.GET(req(base, adminCookie))).json();
        assert.equal(def.items.length, 25);
        assert.equal(def.total, 55);
        assert.equal(def.totalPages, 3);
        const max = await (await invoicesRoute.GET(req(`${base}&pageSize=9999`, adminCookie))).json();
        assert.equal(max.pageSize, 50);
        assert.equal(max.items.length, 50);
        const p2 = await (await invoicesRoute.GET(req(`${base}&pageSize=50&page=2`, adminCookie))).json();
        assert.equal(p2.items.length, 5);
        const beyond = await (await invoicesRoute.GET(req(`${base}&page=99`, adminCookie))).json();
        assert.equal(beyond.items.length, 0);
        for (const bad of ["page=0", "page=abc", "status=x", "range=1y", "pageSize=-3"]) {
          assert.equal((await invoicesRoute.GET(req(`/api/admin/revenue/invoices?${bad}`, adminCookie))).status, 400, bad);
        }
      });

      it("filter status & pencarian awalan; urut terbaru; tanpa payload mentah/URL/VA", async () => {
        const q = `q=Zbanyak${t}`;
        const paid = await (await invoicesRoute.GET(req(`/api/admin/revenue/invoices?${q}&status=paid&pageSize=50`, adminCookie))).json();
        assert.equal(paid.total, 44);
        assert.ok(paid.items.every((i: { status: string }) => i.status === "paid"));
        const pend = await (await invoicesRoute.GET(req(`/api/admin/revenue/invoices?${q}&status=pending`, adminCookie))).json();
        assert.equal(pend.total, 11);
        const mid = await (await invoicesRoute.GET(req(`/api/admin/revenue/invoices?q=${encodeURIComponent("bjanyak")}`, adminCookie))).json();
        assert.equal(mid.total, 0, "pencarian = awalan, bukan 'mengandung'");
        const byNumber = await (await invoicesRoute.GET(req(`/api/admin/revenue/invoices?q=INVB-${t}-1`, adminCookie))).json();
        assert.ok(byNumber.total >= 1 && byNumber.items.every((i: { invoiceNumber: string }) => i.invoiceNumber.startsWith(`INVB-${t}-1`)));
        const sorted = await (await invoicesRoute.GET(req(`/api/admin/revenue/invoices?${q}&pageSize=50`, adminCookie))).json();
        const times = sorted.items.map((i: { createdAt: string }) => i.createdAt);
        assert.deepEqual([...times].sort().reverse(), times);

        const res = await invoicesRoute.GET(req(`/api/admin/revenue/invoices?q=${encodeURIComponent("=HYPERLINK")}`, adminCookie));
        const text = await res.text();
        assert.ok(text.includes("HYPERLINK"));
        for (const secret of ["RAHASIA-PAYLOAD", "rahasia-url", "8888000011", "rawResponse", "paymentUrl", "vaNumber"]) assert.ok(!text.includes(secret), secret);
        const item = JSON.parse(text).items[0];
        assert.deepEqual(Object.keys(item).sort(), ["amount", "createdAt", "id", "invoiceNumber", "paidAt", "paymentMethod", "planCode", "product", "productType", "status", "statusLabel", "villageCode", "villageId", "villageName"]);
        assert.equal(typeof item.id, "string");
        assert.equal(item.amount, 1000);
        void prefix;
      });

      it("ekspor CSV: header unduhan, sel rumus dinetralkan, tanpa payload, dan DICATAT di jejak audit (revenue.export)", async () => {
        const before = await prisma.platformAuditLog.count({ where: { action: "revenue.export", actorId: adminId } });
        const res = await exportRoute.GET(req(`/api/admin/revenue/export?q=${encodeURIComponent("=HYPERLINK")}&status=paid`, adminCookie));
        assert.equal(res.status, 200);
        assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
        assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="tagihan-klandesa-\d{4}-\d{2}-\d{2}\.csv"/);
        const bytes = new Uint8Array(await res.arrayBuffer());
        assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "BOM UTF-8 agar Excel membaca huruf Indonesia");
        const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
        assert.equal(csv.charCodeAt(0), 0xfeff);
        assert.ok(csv.slice(1).startsWith("Nomor Tagihan,Desa,Kode Desa"));
        const lines = csv.slice(1).trimEnd().split("\r\n");
        assert.equal(lines.length, 2);
        assert.ok(lines[1].includes(`"'=HYPERLINK(""http://jahat.test"",""x"")${t}"`), lines[1]);
        assert.ok(lines[1].includes(",1000,Lunas,"));
        for (const secret of ["RAHASIA-PAYLOAD", "rahasia-url", "8888000011"]) assert.ok(!csv.includes(secret));
        void evil;

        const rows = await prisma.platformAuditLog.findMany({ where: { action: "revenue.export", actorId: adminId }, orderBy: { id: "desc" } });
        assert.equal(rows.length, before + 1);
        assert.equal(rows[0].actorEmail, adminEmail);
        assert.equal(rows[0].targetType, "system");
        const meta = rows[0].metadata as { rows: number; status: string; q: string };
        assert.equal(meta.rows, 1);
        assert.equal(meta.status, "paid");
        assert.equal(meta.q, "=HYPERLINK");
      });

      it("ekspor menolak parameter tidak valid (400) tanpa menulis audit", async () => {
        const before = await prisma.platformAuditLog.count({ where: { action: "revenue.export", actorId: adminId } });
        assert.equal((await exportRoute.GET(req("/api/admin/revenue/export?status=zzz", adminCookie))).status, 400);
        assert.equal(await prisma.platformAuditLog.count({ where: { action: "revenue.export", actorId: adminId } }), before);
      });
    });
  });
});
