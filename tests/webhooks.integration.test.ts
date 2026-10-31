/**
 * Tes integrasi webhook terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke DB ber-nama "scratch"/"test".
 * Pengiriman memakai `Sender` palsu; pemblokiran jaringan internal diuji di webhooks.test.ts.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("webhook keluar (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/webhooks/service");
  let del: typeof import("../lib/webhooks/deliver");
  let sign: typeof import("../lib/webhooks/sign");
  let vA = 0;
  let vB = 0;

  type Sent = { url: string; headers: Record<string, string>; body: string };
  const mkSender = (statusFor: (n: number) => number | "boom") => {
    const sent: Sent[] = [];
    const send: import("../lib/webhooks/deliver").Sender = async (url, headers, body) => {
      sent.push({ url, headers, body });
      const s = statusFor(sent.length);
      return s === "boom" ? { statusCode: null, error: "Koneksi terputus." } : { statusCode: s, error: null };
    };
    return { sent, send };
  };
  const mkEp = async (villageId: number, events: string[], url = "https://contoh.id/hook") => {
    const r = await svc.createEndpoint(prisma, { villageId, userId: 1, name: "Uji", url, events });
    assert.ok(r.ok, r.ok ? "" : r.error);
    return r.ok ? r.data : (undefined as never);
  };
  const later = (min: number) => new Date(Date.now() + min * 60_000 + 5_000);

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/webhooks/service");
    del = await import("../lib/webhooks/deliver");
    sign = await import("../lib/webhooks/sign");
    const t = Date.now() % 1e6;
    const mk = (c: string, n: string) => prisma.village.create({ data: { code: `${c}${t}`, name: n, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("WA", "Desa A")).id;
    vB = (await mk("WB", "Desa B")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("rahasia hanya di respons pembuatan; daftar tidak memuatnya", async () => {
    const { endpoint, secret } = await mkEp(vA, ["pengumuman.terbit"]);
    assert.match(secret, /^whsec_/);
    const list = await svc.listEndpoints(prisma, vA);
    assert.ok(!JSON.stringify(list).includes(secret.slice(8)));
    assert.ok(!("secret" in list[0]));
    await svc.deleteEndpoint(prisma, { villageId: vA, id: endpoint.id });
  });

  it("alamat internal dan masukan buruk ditolak saat mendaftar", async () => {
    for (const url of ["https://127.0.0.1/x", "https://localhost/x", "https://u:p@contoh.id/"]) {
      const r = await svc.createEndpoint(prisma, { villageId: vA, userId: 1, name: "X", url, events: ["pengumuman.terbit"] });
      assert.equal(r.ok, false, url);
    }
    assert.equal((await svc.createEndpoint(prisma, { villageId: vA, userId: 1, name: " ", url: "https://contoh.id/", events: ["pengumuman.terbit"] })).ok, false);
    assert.equal((await svc.createEndpoint(prisma, { villageId: vA, userId: 1, name: "X", url: "https://contoh.id/", events: ["ngawur"] })).ok, false);
    assert.equal(await prisma.webhookEndpoint.count({ where: { villageId: vA } }), 0);
  });

  it("batas jumlah tujuan per desa", async () => {
    const made: number[] = [];
    for (let i = 0; i < svc.MAX_ENDPOINTS_PER_VILLAGE; i++) made.push((await mkEp(vA, ["pengumuman.terbit"])).endpoint.id);
    const over = await svc.createEndpoint(prisma, { villageId: vA, userId: 1, name: "Lebih", url: "https://contoh.id/", events: ["pengumuman.terbit"] });
    assert.equal(over.ok, false);
    assert.equal(!over.ok && over.status, 409);
    await prisma.webhookEndpoint.deleteMany({ where: { id: { in: made } } });
  });

  it("kejadian hanya masuk ke tujuan desa itu yang berlangganan dan aktif", async () => {
    const a1 = await mkEp(vA, ["pengumuman.terbit"]);
    const a2 = await mkEp(vA, ["mutasi.diterapkan"]);
    const a3 = await mkEp(vA, ["pengumuman.terbit"]);
    const b1 = await mkEp(vB, ["pengumuman.terbit"]);
    await svc.updateEndpoint(prisma, { villageId: vA, id: a3.endpoint.id, patch: { isActive: false } });

    const n = await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 5 } });
    assert.equal(n, 1);
    const rows = await prisma.webhookDelivery.findMany({ where: { villageId: { in: [vA, vB] } } });
    assert.deepEqual(rows.map((r) => r.endpointId), [a1.endpoint.id]);
    assert.equal(rows[0].villageId, vA);
    assert.deepEqual(rows[0].payload, { announcementId: 5 });
    assert.equal(await prisma.webhookDelivery.count({ where: { endpointId: b1.endpoint.id } }), 0, "desa lain tidak ikut");
    void a2;
    await prisma.webhookEndpoint.deleteMany({ where: { villageId: { in: [vA, vB] } } });
  });

  it("pengiriman sukses: bertanda tangan sah, isi tanpa data pribadi, status SUCCESS", async () => {
    const { endpoint, secret } = await mkEp(vA, ["mutasi.diterapkan"]);
    await svc.enqueueEvent(prisma, { villageId: vA, type: "mutasi.diterapkan", data: { mutationId: "12", type: "MOVE_OUT", residentId: 99 } });
    const { sent, send } = mkSender(() => 200);
    const r = await del.processDue(prisma, { send });
    assert.deepEqual([r.due, r.success, r.retrying, r.dead], [1, 1, 0, 0]);
    assert.equal(sent.length, 1);

    const s = sent[0];
    assert.equal(s.headers["X-Klandesa-Event"], "mutasi.diterapkan");
    assert.ok(sign.verifyWebhook(secret, s.headers["X-Klandesa-Signature"], s.body), "tanda tangan sah di sisi penerima");
    const parsed = JSON.parse(s.body);
    assert.equal(parsed.type, "mutasi.diterapkan");
    assert.equal(parsed.id, s.headers["X-Klandesa-Event-Id"]);
    assert.deepEqual(parsed.data, { mutationId: "12", type: "MOVE_OUT", residentId: 99 });
    assert.ok(!/nik|nama|name|alamat/i.test(s.body), "kejadian tipis, tanpa data pribadi");

    const row = await prisma.webhookDelivery.findFirstOrThrow({ where: { endpointId: endpoint.id } });
    assert.equal(row.status, "SUCCESS");
    assert.equal(row.attempts, 1);
    assert.ok(row.deliveredAt);
    const ep = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
    assert.equal(ep.consecutiveFailures, 0);
    assert.ok(ep.lastSuccessAt);
    // Tidak dikirim dua kali.
    assert.equal((await del.processDue(prisma, { send })).due, 0);
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("gagal sementara: dijadwal ulang dengan jeda menaik, lalu berhasil", async () => {
    const { endpoint } = await mkEp(vA, ["pengumuman.terbit"]);
    await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 1 } });
    const { sent, send } = mkSender((n) => (n < 3 ? 503 : 204));

    let r = await del.processDue(prisma, { send });
    assert.equal(r.retrying, 1);
    let row = await prisma.webhookDelivery.findFirstOrThrow({ where: { endpointId: endpoint.id } });
    assert.equal(row.status, "PENDING");
    assert.equal(row.lastStatusCode, 503);
    assert.ok(row.nextAttemptAt.getTime() > Date.now() + 30_000, "belum jatuh tempo");
    assert.equal((await del.processDue(prisma, { send })).due, 0, "belum waktunya, tidak dikirim lagi");

    r = await del.processDue(prisma, { send, now: later(1) });
    assert.equal(r.retrying, 1);
    row = await prisma.webhookDelivery.findFirstOrThrow({ where: { endpointId: endpoint.id } });
    assert.equal(row.attempts, 2);
    assert.ok(row.nextAttemptAt.getTime() > Date.now() + 4 * 60_000, "jeda kedua lebih panjang");

    r = await del.processDue(prisma, { send, now: later(6) });
    assert.equal(r.success, 1);
    assert.equal(sent.length, 3);
    assert.equal((await prisma.webhookDelivery.findFirstOrThrow({ where: { endpointId: endpoint.id } })).status, "SUCCESS");
    assert.equal((await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } })).consecutiveFailures, 0, "sukses mengosongkan hitungan gagal");
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("menyerah (DEAD) setelah percobaan terakhir; kirim ulang manual mengantre lagi", async () => {
    const { endpoint } = await mkEp(vA, ["pengumuman.terbit"]);
    await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 2 } });
    const { send } = mkSender(() => "boom");
    for (let i = 0; i < svc.MAX_ATTEMPTS; i++) await del.processDue(prisma, { send, now: later(24 * 60 * (i + 1)) });
    const row = await prisma.webhookDelivery.findFirstOrThrow({ where: { endpointId: endpoint.id } });
    assert.equal(row.status, "DEAD");
    assert.equal(row.attempts, svc.MAX_ATTEMPTS);
    assert.match(row.lastError ?? "", /terputus/);

    assert.equal((await svc.retryDelivery(prisma, { villageId: vB, endpointId: endpoint.id, deliveryId: row.id })).ok, false, "desa lain tidak bisa");
    const ok = await svc.retryDelivery(prisma, { villageId: vA, endpointId: endpoint.id, deliveryId: row.id });
    assert.ok(ok.ok);
    const ok2 = mkSender(() => 200);
    assert.equal((await del.processDue(prisma, { send: ok2.send })).success, 1);
    assert.equal((await svc.retryDelivery(prisma, { villageId: vA, endpointId: endpoint.id, deliveryId: row.id })).ok, false, "yang sudah sukses tidak bisa dikirim ulang");
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("kode 4xx permanen langsung menyerah; 429 tetap dicoba lagi; 410 mematikan tujuan", async () => {
    const { endpoint } = await mkEp(vA, ["pengumuman.terbit"]);
    await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 3 } });
    let r = await del.processDue(prisma, { send: mkSender(() => 404).send });
    assert.equal(r.dead, 1);

    await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 4 } });
    r = await del.processDue(prisma, { send: mkSender(() => 429).send });
    assert.equal(r.retrying, 1);

    await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 5 } });
    r = await del.processDue(prisma, { send: mkSender(() => 410).send });
    assert.equal(r.dead, 1);
    const ep = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
    assert.equal(ep.isActive, false);
    assert.match(ep.disabledReason ?? "", /410/);
    const pending = await prisma.webhookDelivery.count({ where: { endpointId: endpoint.id, status: "PENDING" } });
    assert.equal(pending, 0, "antrean tujuan yang mati dikosongkan");
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("dimatikan otomatis setelah gagal berturut-turut; mengaktifkan lagi mengosongkan hitungan", async () => {
    const { endpoint } = await mkEp(vA, ["pengumuman.terbit"]);
    const { send } = mkSender(() => 500);
    for (let i = 0; i < svc.AUTO_DISABLE_AFTER_FAILURES; i++) {
      await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: i } });
      await del.processDue(prisma, { send, now: later(1) });
    }
    const ep = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpoint.id } });
    assert.equal(ep.isActive, false);
    assert.match(ep.disabledReason ?? "", /otomatis/);
    assert.equal(await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 99 } }), 0, "tujuan mati tidak menerima kejadian");

    const re = await svc.updateEndpoint(prisma, { villageId: vA, id: endpoint.id, patch: { isActive: true } });
    assert.ok(re.ok && re.data.endpoint.isActive && re.data.endpoint.consecutiveFailures === 0);
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("dua pekerja bersamaan tidak mengirim ganda", async () => {
    const { endpoint } = await mkEp(vA, ["pengumuman.terbit"]);
    for (let i = 0; i < 6; i++) await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: i } });
    const { sent, send } = mkSender(() => 200);
    const slow: typeof send = async (u, h, b) => {
      await new Promise((r) => setTimeout(r, 30));
      return send(u, h, b);
    };
    await Promise.all([del.processDue(prisma, { send: slow }), del.processDue(prisma, { send: slow }), del.processDue(prisma, { send: slow })]);
    assert.equal(sent.length, 6, "tiap kejadian terkirim tepat sekali");
    assert.equal(new Set(sent.map((s) => s.headers["X-Klandesa-Delivery"])).size, 6);
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("kejadian uji: dikirim tanpa percobaan ulang dan tanpa perlu berlangganan", async () => {
    const { endpoint, secret } = await mkEp(vA, ["pengumuman.terbit"]);
    const id = await svc.enqueueTestEvent(prisma, { villageId: vA, endpointId: endpoint.id });
    assert.ok(id != null);
    assert.equal(await svc.enqueueTestEvent(prisma, { villageId: vB, endpointId: endpoint.id }), null, "desa lain tidak bisa menguji");
    const ok = mkSender(() => 200);
    const res = await del.sendNow(prisma, id!, ok.send);
    assert.equal(res?.status, "SUCCESS");
    assert.ok(sign.verifyWebhook(secret, ok.sent[0].headers["X-Klandesa-Signature"], ok.sent[0].body));

    const id2 = (await svc.enqueueTestEvent(prisma, { villageId: vA, endpointId: endpoint.id }))!;
    const bad = await del.sendNow(prisma, id2, mkSender(() => 500).send);
    assert.equal(bad?.status, "DEAD");
    assert.equal(bad?.statusCode, 500);
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("mengganti rahasia: rahasia lama tak berlaku; tujuan desa lain tak bisa diubah/dihapus", async () => {
    const { endpoint, secret } = await mkEp(vA, ["pengumuman.terbit"]);
    const r = await svc.updateEndpoint(prisma, { villageId: vA, id: endpoint.id, patch: { rotateSecret: true } });
    assert.ok(r.ok && r.data.secret && r.data.secret !== secret);
    await svc.enqueueEvent(prisma, { villageId: vA, type: "pengumuman.terbit", data: { announcementId: 1 } });
    const s = mkSender(() => 200);
    await del.processDue(prisma, { send: s.send });
    const h = s.sent[0].headers["X-Klandesa-Signature"];
    assert.ok(sign.verifyWebhook(r.ok ? r.data.secret! : "", h, s.sent[0].body));
    assert.equal(sign.verifyWebhook(secret, h, s.sent[0].body), false);

    assert.equal((await svc.updateEndpoint(prisma, { villageId: vB, id: endpoint.id, patch: { name: "Dibajak" } })).ok, false);
    assert.equal(await svc.deleteEndpoint(prisma, { villageId: vB, id: endpoint.id }), false);
    assert.equal(await svc.listDeliveries(prisma, { villageId: vB, endpointId: endpoint.id }), null);
    assert.equal((await svc.listEndpoints(prisma, vB)).length, 0);
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("riwayat lama dibersihkan, yang menunggu tidak", async () => {
    const { endpoint } = await mkEp(vA, ["pengumuman.terbit"]);
    const old = new Date(Date.now() - (svc.DELIVERY_RETENTION_DAYS + 1) * 86_400_000);
    const mk = (status: string) => prisma.webhookDelivery.create({ data: { villageId: vA, endpointId: endpoint.id, eventId: "e", eventType: "pengumuman.terbit", payload: {}, status, createdAt: old } });
    await mk("SUCCESS");
    await mk("DEAD");
    const pending = await mk("PENDING");
    assert.equal(await del.purgeOldDeliveries(prisma), 2);
    assert.equal(await prisma.webhookDelivery.count({ where: { id: pending.id } }), 1);
    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } });
  });

  it("menghapus desa menghapus tujuan dan antreannya (tanpa sisa)", async () => {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `WZ${t}`, name: "Sementara", district: "k", regency: "r", province: "p", address: "a" } });
    const { endpoint } = await mkEp(v.id, ["pengumuman.terbit"]);
    await svc.enqueueEvent(prisma, { villageId: v.id, type: "pengumuman.terbit", data: { announcementId: 1 } });
    await prisma.village.delete({ where: { id: v.id } });
    assert.equal(await prisma.webhookEndpoint.count({ where: { id: endpoint.id } }), 0);
    assert.equal(await prisma.webhookDelivery.count({ where: { endpointId: endpoint.id } }), 0);
  });
});
