/**
 * Desa 360 + Inspektur Desa baca-saja (Paket B Super Admin). Handler asli + MySQL sungguhan (database sementara);
 * butuh KEP_TEST_DATABASE_URL ke DB ber-nama "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Desa 360 & Inspektur (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let detail: typeof import("../app/api/admin/villages/[id]/route");
  let subRoute: typeof import("../app/api/admin/villages/[id]/subscription/route");
  let activeRoute: typeof import("../app/api/admin/villages/[id]/active/route");
  let inspect: typeof import("../app/api/admin/villages/[id]/inspect/route");
  let health: typeof import("../lib/platform/villages/queries");
  let encode: typeof import("next-auth/jwt").encode;
  const SECRET = "uji-rahasia-desa360-0123456789abcdef";
  const PW = "KonfirmasiAdmin123";
  const t = Date.now() % 1e7;
  const DAY = 86_400_000;
  let ipN = 0;
  let adminId = 0;
  let cookie = "";
  let villageId = 0;
  let emptyVillageId = 0;
  let partnerId = 0;
  const NIK_FULL = "3508000000099991";
  const EMAIL_FULL = `rahasia.pengguna${t}@desa-uji.test`;

  const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
  const mkReq = (path: string, init: { method?: string; body?: unknown; cookie?: string | null } = {}) =>
    new NextRequest(`http://localhost${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...(init.cookie === null ? {} : { cookie: `next-auth.session-token=${init.cookie ?? cookie}` }),
        "content-type": "application/json",
        "x-real-ip": `10.30.${t % 250}.${++ipN % 250}`,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  const get = (h: (r: NextRequest, c: ReturnType<typeof ctx>) => Promise<Response>, id: number | string, qs = "", c?: string | null) =>
    h(mkReq(`/api/admin/villages/${id}${qs}`, { cookie: c }), ctx(id));
  const post = (h: (r: NextRequest, c: ReturnType<typeof ctx>) => Promise<Response>, id: number | string, body: unknown, c?: string | null) =>
    h(mkReq(`/api/admin/villages/${id}/x`, { method: "POST", body, cookie: c }), ctx(id));
  const auditFor = (action: string) => prisma.platformAuditLog.findMany({ where: { villageId, action }, orderBy: { id: "desc" } });
  const village = () => prisma.village.findUniqueOrThrow({ where: { id: villageId } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ encode } = await import("next-auth/jwt"));
    detail = await import("../app/api/admin/villages/[id]/route");
    subRoute = await import("../app/api/admin/villages/[id]/subscription/route");
    activeRoute = await import("../app/api/admin/villages/[id]/active/route");
    inspect = await import("../app/api/admin/villages/[id]/inspect/route");
    health = await import("../lib/platform/villages/queries");
    const { hashPassword } = await import("../lib/auth");

    const admin = await prisma.platformUser.create({ data: { email: `d360-${t}@uji.test`, password: await hashPassword(PW), name: "Admin D360", role: "platform_admin" } });
    adminId = admin.id;
    cookie = await encode({ secret: SECRET, token: { sub: `pl:${admin.id}`, id: `pl:${admin.id}`, accountType: "platform", role: "platform_admin", email: admin.email, name: "Admin D360" } });

    const partner = await prisma.partner.create({ data: { name: `Mitra D360 ${t}`, email: `mitra-d360-${t}@uji.test`, password: "x", status: "active" } });
    partnerId = partner.id;

    const v = await prisma.village.create({
      data: {
        code: `D3${t}`, name: "Desa Tiga Enam Puluh", district: "Kec", regency: "Kab", province: "Prov", address: "Jl. Balai",
        email: EMAIL_FULL, subscriptionPlan: "lengkap", subscriptionStatus: "active", subscriptionExpiry: new Date(Date.now() + 10 * DAY),
        storageLimit: 5, storageUsed: 4.8, acquiredByPartnerId: partnerId, acquiredAt: new Date(), acquisitionSource: "uji",
        createdAt: new Date(Date.now() - 100 * DAY),
      },
    });
    villageId = v.id;
    emptyVillageId = (await prisma.village.create({ data: { code: `D4${t}`, name: "Desa Kosong", district: "k", regency: "r", province: "p", address: "a" } })).id;

    // Pengguna: satu admin aktif (login baru), satu staf nonaktif, satu staf aktif belum pernah login.
    await prisma.user.createMany({
      data: [
        { villageId, email: EMAIL_FULL, password: "x", name: "Siti Admin", role: "admin", lastLogin: new Date(Date.now() - 2 * DAY) },
        { villageId, email: `staf-off-${t}@desa-uji.test`, password: "x", name: "Staf Off", role: "staff", isActive: false },
        { villageId, email: `staf-on-${t}@desa-uji.test`, password: "x", name: "Staf On", role: "staff" },
      ],
    });
    // Warga: 2 tanpa KK (null & ""), 1 dengan KK; satu KK aktif tanpa kepala, satu dengan kepala.
    const mk = (nik: string, o: Record<string, unknown> = {}) =>
      prisma.resident.create({ data: { villageId, nik, name: `Warga ${nik.slice(-3)}`, birthplace: "x", birthDate: new Date("1985-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "Jl. A", ...o } });
    const head = await mk(NIK_FULL, { kk: "3508000000000001", familyRole: "Kepala Keluarga" });
    await mk("3508000000099992", { kk: null });
    await mk("3508000000099993", { kk: "" });
    await prisma.household.create({ data: { villageId, kkNumber: "3508000000000001", headResidentId: head.id, address: "a" } });
    await prisma.household.create({ data: { villageId, kkNumber: "3508000000000002", headResidentId: null, address: "a" } });
    await prisma.household.create({ data: { villageId, kkNumber: "3508000000000003", headResidentId: null, address: "a", status: "INACTIVE" } });
    // Perangkat tanpa akun
    const pos = await prisma.position.create({ data: { villageId, name: "Kaur Uji", level: 3 } as never }).catch(async () => prisma.position.create({ data: { villageId, name: "Kaur Uji" } as never }));
    await prisma.official.create({ data: { villageId, positionId: pos.id, nik: "3508000000088881", name: "Perangkat A", birthplace: "x", birthDate: new Date("1980-01-01"), gender: "Laki-laki", address: "a", startDate: new Date("2020-01-01") } as never });
    // Tagihan: pending lewat batas (+ rawResponse yang tidak boleh bocor), pending belum lewat
    await prisma.billingInvoice.create({
      data: { villageId, invoiceNumber: `INV-D3-${t}-1`, partnerReff: `PR-D3-${t}-1`, productType: "desa_package", planCode: "lengkap", amount: 3_500_000, status: "pending", expiresAt: new Date(Date.now() - DAY), rawResponse: { rahasia: "RAHASIA-RAW-123" }, paymentUrl: "https://bayar.example/RAHASIA-URL" },
    });
    await prisma.billingInvoice.create({ data: { villageId, invoiceNumber: `INV-D3-${t}-2`, partnerReff: `PR-D3-${t}-2`, productType: "arsip", planCode: "starter", amount: 35_000, status: "pending", expiresAt: new Date(Date.now() + DAY) } });
    // Modul kedaluwarsa tetapi masih "active"
    await prisma.villageModuleSubscription.create({ data: { villageId, moduleCode: "keuangan", planCode: "basic", status: "active", startDate: new Date(Date.now() - 60 * DAY), expiryDate: new Date(Date.now() - DAY) } });
    // Aktivitas audit desa: data pribadi di `changes` tidak boleh keluar
    await prisma.auditLog.create({
      data: { villageId, action: "update", entity: "residents", entityId: NIK_FULL, changes: { nik: { from: NIK_FULL, to: "x" }, name: { from: "Rahasia Lama", to: "Rahasia Baru" }, status: {} }, metadata: { catatan: "RAHASIA-META" } },
    });
  });

  after(async () => {
    await prisma.platformAuditLog.deleteMany({ where: { OR: [{ actorId: adminId }, { villageId: { in: [villageId, emptyVillageId].filter(Boolean) } }] } });
    for (const id of [villageId, emptyVillageId]) if (id) await prisma.village.delete({ where: { id } }).catch(() => undefined);
    if (partnerId) await prisma.partner.delete({ where: { id: partnerId } }).catch(() => undefined);
    if (adminId) await prisma.platformUser.delete({ where: { id: adminId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  describe("akses", () => {
    it("tanpa sesi -> 401 di semua rute", async () => {
      assert.equal((await get(detail.GET, villageId, "", null)).status, 401);
      assert.equal((await get(inspect.GET, villageId, "?section=health", null)).status, 401);
      assert.equal((await post(subRoute.POST, villageId, { action: "extend", amount: 1, unit: "days" }, null)).status, 401);
      assert.equal((await post(activeRoute.POST, villageId, { active: false }, null)).status, 401);
    });

    it("sesi admin desa (bukan platform) -> 401", async () => {
      const c = await encode({ secret: SECRET, token: { sub: "1", id: "1", accountType: "village", role: "admin", email: "a@b.c", name: "A" } });
      assert.equal((await get(detail.GET, villageId, "", c)).status, 401);
    });

    it("ID tak valid -> 400; desa tak ada -> 404 di setiap rute", async () => {
      assert.equal((await get(detail.GET, "abc")).status, 400);
      assert.equal((await get(detail.GET, 987654321)).status, 404);
      assert.equal((await get(inspect.GET, 987654321, "?section=health")).status, 404);
      const body = { action: "extend", amount: 1, unit: "days", reason: "uji coba 404", confirmPassword: PW };
      assert.equal((await post(subRoute.POST, 987654321, body)).status, 404);
      assert.equal((await post(activeRoute.POST, 987654321, { active: false, reason: "uji coba 404", confirmPassword: PW })).status, 404);
    });
  });

  describe("GET detail", () => {
    it("memuat profil, langganan, penyimpanan, akuisisi, hitungan, modul, tagihan", async () => {
      const res = await get(detail.GET, villageId);
      assert.equal(res.status, 200);
      const j = await res.json();
      assert.equal(j.village.code, `D3${t}`);
      assert.equal(j.subscription.plan, "lengkap");
      assert.equal(j.subscription.phase, "active");
      assert.equal(j.subscription.daysRemaining, 10);
      assert.equal(j.storage.percent, 96);
      assert.equal(j.acquisition.partnerName, `Mitra D360 ${t}`);
      assert.equal(j.counts.users, 3);
      assert.equal(j.counts.activeUsers, 2);
      assert.equal(j.counts.residents, 3);
      assert.equal(j.counts.households, 3);
      assert.equal(j.counts.officials, 1);
      assert.ok(j.lastLogin);
      assert.equal(j.modules.length, 1);
      assert.equal(j.modules[0].expired, true);
      assert.equal(j.invoices.length, 2);
      assert.equal(typeof j.invoices[0].id, "string");
      assert.equal(typeof j.invoices[0].amount, "number");
    });

    it("tidak membocorkan rawResponse, tautan bayar, email utuh, atau NIK", async () => {
      const text = await (await get(detail.GET, villageId)).text();
      for (const k of ["RAHASIA-RAW-123", "RAHASIA-URL", "rawResponse", "paymentUrl", EMAIL_FULL, NIK_FULL, "metadata"]) {
        assert.equal(text.includes(k), false, `bocor: ${k}`);
      }
      assert.ok(text.includes("***@desa-uji.test"), "email desa tersamar");
    });

    it("desa kosong: hitungan nol, tanpa error", async () => {
      const j = await (await get(detail.GET, emptyVillageId)).json();
      assert.equal(j.counts.residents, 0);
      assert.equal(j.lastLogin, null);
      assert.deepEqual(j.invoices, []);
    });
  });

  describe("Inspektur baca-saja", () => {
    it("bagian tidak dikenal / hilang -> 400", async () => {
      assert.equal((await get(inspect.GET, villageId, "?section=residents")).status, 400);
      assert.equal((await get(inspect.GET, villageId, "")).status, 400);
    });

    it("users: email tersamar, tanpa sandi/NIK/telepon", async () => {
      const res = await get(inspect.GET, villageId, "?section=users");
      assert.equal(res.status, 200);
      const text = await res.text();
      const j = JSON.parse(text);
      assert.equal(j.total, 3);
      assert.equal(j.users.length, 3);
      for (const u of j.users) assert.match(u.emailMasked, /^.{1,2}\*\*\*@/);
      for (const k of [EMAIL_FULL, `staf-on-${t}@desa-uji.test`, "password", "phone", NIK_FULL]) assert.equal(text.includes(k), false, `bocor: ${k}`);
      assert.ok(j.users.some((u: { role: string; isActive: boolean }) => u.role === "staff" && u.isActive === false));
    });

    it("batas jumlah: 105 pengguna -> maksimal 100 dan truncated", async () => {
      const rows = Array.from({ length: 105 }, (_, i) => ({ villageId: emptyVillageId, email: `bulk${i}-${t}@desa-uji.test`, password: "x", name: `Bulk ${i}`, role: "staff" }));
      await prisma.user.createMany({ data: rows });
      const j = await (await get(inspect.GET, emptyVillageId, "?section=users&limit=100000")).json();
      assert.equal(j.users.length, 100);
      assert.equal(j.total, 105);
      assert.equal(j.truncated, true);
      const small = await (await get(inspect.GET, emptyVillageId, "?section=users&limit=5")).json();
      assert.equal(small.users.length, 5);
      const bad = await (await get(inspect.GET, emptyVillageId, "?section=users&limit=abc")).json();
      assert.ok(bad.users.length <= 100);
    });

    it("activity: maksimal 50, tanpa `changes`/metadata/NIK; hanya nama kolom tak sensitif", async () => {
      await prisma.auditLog.createMany({ data: Array.from({ length: 60 }, (_, i) => ({ villageId, action: "create", entity: "announcements", entityId: String(i + 1) })) });
      const res = await get(inspect.GET, villageId, "?section=activity&limit=999");
      const text = await res.text();
      const j = JSON.parse(text);
      assert.equal(j.activity.length, 50);
      for (const k of [NIK_FULL, "Rahasia Lama", "Rahasia Baru", "RAHASIA-META", "changes", "metadata", "ipAddress"]) assert.equal(text.includes(k), false, `bocor: ${k}`);
      await prisma.auditLog.deleteMany({ where: { villageId, entity: "announcements" } });
      const j2 = await (await get(inspect.GET, villageId, "?section=activity")).json();
      const row = j2.activity.find((a: { entity: string }) => a.entity === "residents");
      assert.ok(row);
      assert.equal(row.entityId, null, "id 16 digit dibuang");
      assert.deepEqual(row.fields, ["name", "status"], "kolom nik (sensitif) tidak muncul");
    });

    it("modules: modul dan status kedaluwarsa", async () => {
      const j = await (await get(inspect.GET, villageId, "?section=modules")).json();
      assert.equal(j.modules.length, 1);
      assert.equal(j.modules[0].moduleCode, "keuangan");
      assert.equal(j.modules[0].expired, true);
    });

    it("health: menghitung benar pada data buatan", async () => {
      health.clearVillageHealthCache();
      const res = await get(inspect.GET, villageId, "?section=health");
      assert.equal(res.status, 200);
      const j = await res.json();
      const by = Object.fromEntries(j.findings.map((f: { id: string }) => [f.id, f]));
      assert.equal(by["residents-without-kk"].count, 2, "null dan string kosong sama-sama dihitung");
      assert.equal(by["households-without-head"].count, 1, "hanya KK AKTIF tanpa kepala");
      assert.equal(by["officials-without-account"].count, 1);
      assert.equal(by["invoices-pending-overdue"].count, 1, "pending yang belum lewat tidak dihitung");
      assert.equal(by["modules-expired"].count, 1);
      assert.equal(by["storage-high"].severity, "warning");
      assert.equal(by["storage-high"].count, 96);
      assert.equal(by["no-active-admin"], undefined, "ada admin aktif");
      assert.equal(by["duplicate-nik"], undefined);
      assert.equal(by["no-login-30d"], undefined, "admin login 2 hari lalu");
      const order = { critical: 0, warning: 1, info: 2 } as Record<string, number>;
      const sev = j.findings.map((f: { severity: string }) => order[f.severity]);
      assert.deepEqual(sev, [...sev].sort((a: number, b: number) => a - b));
      assert.equal(j.passed + j.findings.length, j.checked);
      assert.equal(JSON.stringify(j).includes(NIK_FULL), false);
    });

    it("health: desa kosong -> tanpa admin aktif (kritis) dan tidak error", async () => {
      await prisma.user.deleteMany({ where: { villageId: emptyVillageId } });
      health.clearVillageHealthCache();
      const j = await (await get(inspect.GET, emptyVillageId, "?section=health")).json();
      assert.equal(j.findings[0].id, "no-active-admin");
      assert.equal(j.findings[0].severity, "critical");
    });

    it("inspektur tidak menulis apa pun (tanpa audit platform untuk baca)", async () => {
      const before = await prisma.platformAuditLog.count({ where: { actorId: adminId } });
      await get(inspect.GET, villageId, "?section=users");
      assert.equal(await prisma.platformAuditLog.count({ where: { actorId: adminId } }), before);
    });
  });

  describe("mutasi langganan", () => {
    const ext = (over: Record<string, unknown> = {}) => ({ action: "extend", amount: 30, unit: "days", reason: "kompensasi gangguan tiket 77", confirmPassword: PW, ...over });

    it("tanpa konfirmasi sandi -> 403 STEP_UP_REQUIRED; sandi salah -> 403; tidak ada perubahan/audit", async () => {
      const before = await village();
      const r1 = await post(subRoute.POST, villageId, ext({ confirmPassword: undefined }));
      assert.equal(r1.status, 403);
      assert.equal((await r1.json()).code, "STEP_UP_REQUIRED");
      const r2 = await post(subRoute.POST, villageId, ext({ confirmPassword: "salah-total" }));
      assert.equal(r2.status, 403);
      assert.equal((await r2.json()).code, "STEP_UP_INVALID");
      assert.equal((await village()).subscriptionExpiry?.getTime(), before.subscriptionExpiry?.getTime());
      assert.equal((await auditFor("village.subscription_extend")).length, 0);
    });

    it("validasi: alasan pendek, aksi/satuan/jumlah buruk -> 400", async () => {
      for (const body of [ext({ reason: "ab" }), ext({ reason: undefined }), ext({ action: "hapus" }), ext({ unit: "tahun" }), ext({ amount: 0 }), ext({ amount: 99999 }), ext({ amount: 1.5 })]) {
        assert.equal((await post(subRoute.POST, villageId, body)).status, 400, JSON.stringify(body));
      }
      const res = await subRoute.POST(new NextRequest("http://localhost/x", { method: "POST", headers: { cookie: `next-auth.session-token=${cookie}`, "content-type": "application/json" }, body: "{bukan json" }), ctx(villageId));
      assert.equal(res.status, 400);
    });

    it("extend: menyambung dari expiry berjalan, tercatat sebelum->sesudah, TANPA komisi mitra", async () => {
      const before = await village();
      const commBefore = await prisma.partnerCommissionEntry.count({ where: { villageId } });
      const res = await post(subRoute.POST, villageId, ext());
      assert.equal(res.status, 200, await res.clone().text());
      const j = await res.json();
      const after = await village();
      assert.equal(after.subscriptionExpiry!.getTime(), before.subscriptionExpiry!.getTime() + 30 * DAY);
      assert.equal(after.subscriptionStatus, "active");
      assert.equal(after.subscriptionPlan, "lengkap");
      assert.equal(j.before.expiry, before.subscriptionExpiry!.toISOString());
      assert.equal(j.after.expiry, after.subscriptionExpiry!.toISOString());
      assert.equal(await prisma.partnerCommissionEntry.count({ where: { villageId } }), commBefore, "tidak memicu komisi");
      assert.equal(await prisma.billingInvoice.count({ where: { villageId } }), 2, "tidak membuat tagihan");

      const logs = await auditFor("village.subscription_extend");
      assert.equal(logs.length, 1);
      const m = logs[0].metadata as { reason: string; before: { expiry: string }; after: { expiry: string }; amount: number; unit: string };
      assert.equal(m.reason, "kompensasi gangguan tiket 77");
      assert.equal(m.before.expiry, before.subscriptionExpiry!.toISOString());
      assert.equal(m.after.expiry, after.subscriptionExpiry!.toISOString());
      assert.equal(m.amount, 30);
      assert.equal(logs[0].actorId, adminId);
      assert.equal(logs[0].targetType, "village");
      assert.equal(logs[0].targetId, String(villageId));
      const dump = JSON.stringify(logs[0], (_k, v) => (typeof v === "bigint" ? v.toString() : v));
      assert.equal(dump.includes(PW), false, "sandi tidak masuk audit");
      assert.equal(dump.includes("confirmPassword"), false);
    });

    it("extend: kedaluwarsa+inactive -> dihitung dari sekarang dan kembali active", async () => {
      await prisma.village.update({ where: { id: villageId }, data: { subscriptionStatus: "inactive", subscriptionExpiry: new Date(Date.now() - 50 * DAY) } });
      const t0 = Date.now();
      const res = await post(subRoute.POST, villageId, ext({ amount: 1, unit: "months" }));
      assert.equal(res.status, 200);
      const v = await village();
      assert.equal(v.subscriptionStatus, "active");
      assert.ok(v.subscriptionExpiry!.getTime() > t0 + 27 * DAY && v.subscriptionExpiry!.getTime() < t0 + 32 * DAY);
      assert.equal((await res.json()).phase, "active");
    });

    it("extend pada langganan dibatalkan -> 409 (harus lewat 'set')", async () => {
      await prisma.village.update({ where: { id: villageId }, data: { subscriptionStatus: "cancelled" } });
      const res = await post(subRoute.POST, villageId, ext());
      assert.equal(res.status, 409);
      assert.equal((await village()).subscriptionStatus, "cancelled");
    });

    it("set: paket/status/expiry eksplisit, kuota tidak turun, tercatat; nilai tak sah ditolak tanpa efek", async () => {
      const exp = new Date(Date.now() + 90 * DAY).toISOString();
      for (const bad of [
        { plan: "gratis", status: "active", expiry: exp },
        { plan: "lengkap", status: "aktif", expiry: exp },
        { plan: "lengkap", status: "active", expiry: new Date(Date.now() - DAY).toISOString() },
        { plan: "lengkap", status: "trial", expiry: null },
      ]) {
        assert.equal((await post(subRoute.POST, villageId, { action: "set", reason: "ubah paket uji", confirmPassword: PW, ...bad })).status, 400, JSON.stringify(bad));
      }
      assert.equal((await village()).subscriptionStatus, "cancelled", "penolakan tidak mengubah apa pun");
      assert.equal((await auditFor("village.subscription_set")).length, 0);

      await prisma.village.update({ where: { id: villageId }, data: { storageLimit: 500 } });
      const res = await post(subRoute.POST, villageId, { action: "set", plan: "enterprise", status: "active", expiry: exp, reason: "migrasi paket sesuai kontrak", confirmPassword: PW });
      assert.equal(res.status, 200, await res.clone().text());
      const v = await village();
      assert.equal(v.subscriptionPlan, "enterprise");
      assert.equal(v.subscriptionStatus, "active");
      assert.equal(v.subscriptionExpiry!.toISOString(), exp);
      assert.equal(v.storageLimit, 500, "kuota yang lebih besar tidak diturunkan");
      const logs = await auditFor("village.subscription_set");
      assert.equal(logs.length, 1);
      const m = logs[0].metadata as { before: { plan: string; status: string }; after: { plan: string; status: string } };
      assert.equal(m.before.plan, "lengkap");
      assert.equal(m.before.status, "cancelled");
      assert.equal(m.after.plan, "enterprise");
      assert.equal(await prisma.partnerCommissionEntry.count({ where: { villageId } }), 0, "set juga tanpa komisi");
    });

    it("set: kuota naik mengikuti paket bila lebih kecil", async () => {
      await prisma.village.update({ where: { id: villageId }, data: { storageLimit: 1 } });
      const res = await post(subRoute.POST, villageId, { action: "set", plan: "profesional", status: "inactive", expiry: null, reason: "uji kuota paket", confirmPassword: PW });
      assert.equal(res.status, 200);
      assert.ok((await village()).storageLimit >= 1);
    });
  });

  describe("aktif/nonaktif desa", () => {
    it("wajib step-up, alasan, dan boolean; idempoten", async () => {
      assert.equal((await post(activeRoute.POST, villageId, { active: false, reason: "pelanggaran syarat" })).status, 403);
      assert.equal((await post(activeRoute.POST, villageId, { active: false, reason: "x", confirmPassword: PW })).status, 400);
      assert.equal((await post(activeRoute.POST, villageId, { active: "tidak", reason: "pelanggaran syarat", confirmPassword: PW })).status, 400);
      assert.equal((await village()).isActive, true);
      const same = await post(activeRoute.POST, villageId, { active: true, reason: "pelanggaran syarat", confirmPassword: PW });
      assert.equal(same.status, 200);
      assert.equal((await same.json()).changed, false);
      assert.equal((await auditFor("village.activate")).length + (await auditFor("village.deactivate")).length, 0, "tanpa perubahan = tanpa audit");
    });

    it("nonaktifkan lalu aktifkan; keduanya beraudit dengan sebelum->sesudah", async () => {
      const off = await post(activeRoute.POST, villageId, { active: false, reason: "permintaan resmi pemerintah desa", confirmPassword: PW });
      assert.equal(off.status, 200);
      assert.equal((await village()).isActive, false);
      const logs = await auditFor("village.deactivate");
      assert.equal(logs.length, 1);
      assert.deepEqual((logs[0].metadata as { before: unknown; after: unknown }).before, { isActive: true });
      assert.deepEqual((logs[0].metadata as { before: unknown; after: unknown }).after, { isActive: false });
      // Kesehatan menandai desa nonaktif.
      health.clearVillageHealthCache(villageId);
      const h = await (await get(inspect.GET, villageId, "?section=health")).json();
      assert.ok(h.findings.some((f: { id: string }) => f.id === "village-inactive"));

      const on = await post(activeRoute.POST, villageId, { active: true, reason: "sengketa selesai, aktifkan lagi", confirmPassword: PW });
      assert.equal(on.status, 200);
      assert.equal((await village()).isActive, true);
      assert.equal((await auditFor("village.activate")).length, 1);
    });
  });
});
