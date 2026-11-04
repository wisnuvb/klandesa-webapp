/**
 * Tes integrasi sinkronisasi notifikasi admin & pemuatan add-on modul terhadap MySQL sementara.
 * Membuktikan: hasil sinkronisasi sama dengan perilaku upsert lama (isi, createdAt tetap, baris usang dihapus),
 * tidak menulis apa pun bila tidak ada perubahan, pembatas 30 detik per desa, dan loadActiveModuleSubs hanya menulis
 * saat ada langganan yang benar-benar kedaluwarsa. Butuh KEP_TEST_DATABASE_URL (nama DB wajib mengandung scratch/test).
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("sinkronisasi notifikasi admin & add-on modul (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let sync: typeof import("../lib/notifications/syncAdminNotifications");
  let modules: typeof import("../lib/modules/require-module");
  let villageId = 0;
  let otherVillageId = 0;
  let route: typeof import("../app/api/notifications/route");
  let readRoute: typeof import("../app/api/notifications/read/route");
  let NextRequest: typeof import("next/server").NextRequest;
  let cookie = "";
  const SECRET = "uji-rahasia-notif-0123456789abcdef";

  const notifs = (vid = villageId, type?: string) =>
    prisma.adminNotification.findMany({ where: { villageId: vid, ...(type ? { type } : {}) }, orderBy: { sourceKey: "asc" } });
  const syncNow = async (vid = villageId) => {
    sync.resetNotificationSyncThrottle();
    await sync.syncAdminNotificationsForVillage(vid);
  };
  const mkMail = (name: string, status = "pending", vid = villageId) =>
    prisma.mailRequest.create({
      data: { villageId: vid, requestNumber: `R-${vid}-${Math.random().toString(36).slice(2, 10)}`, nik: "3508070101900011", name, mailType: "SKTM", purpose: "uji", status },
    });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    route = await import("../app/api/notifications/route");
    readRoute = await import("../app/api/notifications/read/route");
    sync = await import("../lib/notifications/syncAdminNotifications");
    modules = await import("../lib/modules/require-module");
    const t = Date.now() % 1e6;
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a" } });
    villageId = (await mk("N")).id;
    otherVillageId = (await mk("M")).id;
    const u = await prisma.user.create({ data: { villageId, email: `notif${t}@uji.test`, password: "x", name: "Admin", role: "admin" } });
    const { encode } = await import("next-auth/jwt");
    cookie = await encode({
      secret: SECRET,
      token: { sub: String(u.id), id: String(u.id), role: "admin", villageId, villageCode: `N${t}`, accountType: "village", name: "Admin", email: u.email },
    });
  });
  after(async () => {
    await prisma.village.deleteMany({ where: { id: { in: [villageId, otherVillageId] } } });
    await prisma.$disconnect();
  });

  it("membuat notifikasi surat pending dengan isi & createdAt dari sumbernya", async () => {
    const a = await mkMail("Budi");
    const b = await mkMail("Sari");
    await syncNow();
    const rows = await notifs(villageId, "mail_request_pending");
    assert.deepEqual(rows.map((r) => r.sourceKey).sort(), [`mail-req-${a.id}`, `mail-req-${b.id}`].sort());
    const ra = rows.find((r) => r.sourceKey === `mail-req-${a.id}`)!;
    assert.equal(ra.title, "Permohonan surat baru");
    assert.equal(ra.body, "Budi mengajukan SKTM");
    assert.equal(ra.href, "/permohonan-warga");
    assert.equal(ra.createdAt.getTime(), a.requestDate.getTime());
  });

  it("sinkronisasi ulang tanpa perubahan tidak mengubah baris sama sekali (id & createdAt tetap)", async () => {
    const before_ = await notifs();
    await syncNow();
    const after_ = await notifs();
    assert.deepEqual(after_.map((r) => [r.id, r.sourceKey, r.createdAt.getTime()]), before_.map((r) => [r.id, r.sourceKey, r.createdAt.getTime()]));
  });

  it("surat yang selesai diproses hilang dari notifikasi, yang baru muncul, yang berubah isinya diperbarui", async () => {
    const rows = await notifs(villageId, "mail_request_pending");
    const budi = rows.find((r) => r.body?.startsWith("Budi"))!;
    const budiId = Number(budi.sourceKey.replace("mail-req-", ""));
    await prisma.mailRequest.update({ where: { id: budiId }, data: { status: "approved" } });
    const sariId = Number(rows.find((r) => r.body?.startsWith("Sari"))!.sourceKey.replace("mail-req-", ""));
    await prisma.mailRequest.update({ where: { id: sariId }, data: { name: "Sari Ayu" } });
    const baru = await mkMail("Dewi");

    await syncNow();
    const now = await notifs(villageId, "mail_request_pending");
    const keys = now.map((r) => r.sourceKey);
    assert.ok(!keys.includes(`mail-req-${budiId}`), "yang disetujui harus hilang");
    assert.ok(keys.includes(`mail-req-${baru.id}`), "yang baru harus muncul");
    const sari = now.find((r) => r.sourceKey === `mail-req-${sariId}`)!;
    assert.equal(sari.body, "Sari Ayu mengajukan SKTM");
    assert.equal(sari.id, rows.find((r) => r.sourceKey === `mail-req-${sariId}`)!.id, "baris diperbarui di tempat, bukan dibuat ulang");
  });

  it("daftar menjadi kosong -> semua notifikasi tipe itu dihapus", async () => {
    await prisma.mailRequest.updateMany({ where: { villageId }, data: { status: "approved" } });
    await syncNow();
    assert.equal((await notifs(villageId, "mail_request_pending")).length, 0);
  });

  it("sinkronisasi satu desa tidak menyentuh notifikasi desa lain", async () => {
    await mkMail("Warga desa lain", "pending", otherVillageId);
    await syncNow(otherVillageId);
    const other = await notifs(otherVillageId, "mail_request_pending");
    assert.equal(other.length, 1);
    await syncNow(villageId);
    assert.equal((await notifs(otherVillageId, "mail_request_pending")).length, 1);
  });

  it("pembatas: panggilan kedua dalam 30 detik tidak membaca perubahan baru; setelah direset langsung terlihat", async () => {
    sync.resetNotificationSyncThrottle();
    await sync.syncAdminNotificationsForVillage(villageId);
    await mkMail("Setelah sinkron");
    await sync.syncAdminNotificationsForVillage(villageId);
    assert.equal((await notifs(villageId, "mail_request_pending")).length, 0, "dalam jendela 30 dtk belum terbaca");
    await syncNow();
    assert.equal((await notifs(villageId, "mail_request_pending")).length, 1);
  });

  it("sinkronisasi serentak untuk satu desa tidak menggandakan baris (idempotent)", async () => {
    await mkMail("Serentak 1");
    await mkMail("Serentak 2");
    sync.resetNotificationSyncThrottle();
    await Promise.all(Array.from({ length: 10 }, () => sync.syncAdminNotificationsForVillage(villageId)));
    const rows = await notifs(villageId, "mail_request_pending");
    assert.equal(new Set(rows.map((r) => r.sourceKey)).size, rows.length);
  });

  describe("GET /api/notifications (sesi nyata)", () => {
    const get = (qs = "") => route.GET(new NextRequest(`http://localhost/api/notifications${qs}`, { headers: { cookie: `next-auth.session-token=${cookie}` } }));
    const post = (body: unknown) =>
      readRoute.POST(new NextRequest("http://localhost/api/notifications/read", { method: "POST", headers: { cookie: `next-auth.session-token=${cookie}`, "content-type": "application/json" }, body: JSON.stringify(body) }));

    it("mode ringkas hanya mengembalikan jumlah belum dibaca, sama dengan jumlah belum-dibaca di daftar penuh", async () => {
      await prisma.mailRequest.updateMany({ where: { villageId }, data: { status: "approved" } });
      await mkMail("Ringkas 1");
      await mkMail("Ringkas 2");
      await mkMail("Ringkas 3");
      sync.resetNotificationSyncThrottle();

      const summary = await get("?summary=1");
      assert.equal(summary.status, 200);
      const s = await summary.json();
      assert.deepEqual(Object.keys(s), ["unreadCount"], "tanpa daftar/isi notifikasi");

      const full = await (await get()).json();
      assert.equal(s.unreadCount, full.unreadCount);
      assert.equal(full.unreadCount, full.notifications.filter((n: { read: boolean }) => !n.read).length);
      assert.ok(s.unreadCount >= 3);
    });

    it("menandai dibaca menurunkan angka ringkas; milik pengguna lain tidak ikut berubah (per pengguna)", async () => {
      const before_ = (await (await get("?summary=1")).json()).unreadCount as number;
      const full = await (await get()).json();
      const first = full.notifications.find((n: { read: boolean }) => !n.read);
      assert.equal((await post({ notificationId: first.id })).status, 200);
      assert.equal((await (await get("?summary=1")).json()).unreadCount, before_ - 1);

      assert.equal((await post({ all: true })).status, 200);
      assert.equal((await (await get("?summary=1")).json()).unreadCount, 0);
    });

    it("tanpa sesi: 401, baik mode ringkas maupun penuh", async () => {
      const anon = (qs: string) => route.GET(new NextRequest(`http://localhost/api/notifications${qs}`));
      assert.equal((await anon("?summary=1")).status, 401);
      assert.equal((await anon("")).status, 401);
    });
  });

  describe("loadActiveModuleSubs", () => {
    const sub = (moduleCode: string, status: string, expiryOffsetMs: number) =>
      prisma.villageModuleSubscription.create({
        data: { villageId, moduleCode, planCode: "p", status, startDate: new Date(Date.now() - 86_400_000), expiryDate: new Date(Date.now() + expiryOffsetMs) },
      });

    it("mengembalikan hanya yang aktif & belum kedaluwarsa; yang lewat masa berlaku ditandai expired di DB", async () => {
      await sub("bumdes", "active", 3_600_000);
      await sub("pkk", "active", -3_600_000);
      await sub("sdgs", "expired", 3_600_000);

      const result = await modules.loadActiveModuleSubs(villageId);
      assert.deepEqual(result.map((r) => r.moduleCode), ["bumdes"]);

      const pkk = await prisma.villageModuleSubscription.findUnique({ where: { villageId_moduleCode: { villageId, moduleCode: "pkk" } } });
      assert.equal(pkk?.status, "expired");
      const sdgs = await prisma.villageModuleSubscription.findUnique({ where: { villageId_moduleCode: { villageId, moduleCode: "sdgs" } } });
      assert.equal(sdgs?.status, "expired");
    });

    it("tanpa langganan kedaluwarsa tidak ada penulisan (updatedAt tidak berubah)", async () => {
      const before_ = await prisma.villageModuleSubscription.findUnique({ where: { villageId_moduleCode: { villageId, moduleCode: "bumdes" } } });
      await new Promise((r) => setTimeout(r, 1100));
      await modules.loadActiveModuleSubs(villageId);
      const after_ = await prisma.villageModuleSubscription.findUnique({ where: { villageId_moduleCode: { villageId, moduleCode: "bumdes" } } });
      assert.equal(after_?.updatedAt.getTime(), before_?.updatedAt.getTime());
    });

    it("desa tanpa add-on mengembalikan daftar kosong", async () => {
      assert.deepEqual(await modules.loadActiveModuleSubs(otherVillageId), []);
    });
  });
});
