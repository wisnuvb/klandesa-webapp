/**
 * Tes integrasi kunci API terhadap MySQL sungguhan (database sementara). Butuh KEP_TEST_DATABASE_URL ke DB ber-nama "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("kunci API (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let keys: typeof import("../lib/api-keys/keys");
  let auth: typeof import("../lib/api-keys/auth");
  let me: typeof import("../app/api/v1/me/route");
  let vA = 0;
  let vB = 0;
  let secretA = "";
  let keyA = 0;

  const req = (secret?: string, path = "/api/v1/me") =>
    new Request(`http://localhost${path}`, { headers: secret ? { authorization: `Bearer ${secret}`, "x-forwarded-for": "203.0.113.9" } : {} });
  const settle = () => new Promise((r) => setTimeout(r, 150)); // log akses ditulis di latar belakang

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    keys = await import("../lib/api-keys/keys");
    auth = await import("../lib/api-keys/auth");
    me = await import("../app/api/v1/me/route");
    const t = Date.now() % 1e6;
    const mk = (c: string, n: string) => prisma.village.create({ data: { code: `${c}${t}`, name: n, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("KA", "Desa A")).id;
    vB = (await mk("KB", "Desa B")).id;
    const r = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "Aplikasi uji", scopes: ["kependudukan:read"], expiresInDays: null });
    assert.ok(r.ok);
    secretA = r.ok ? r.secret : "";
    keyA = r.ok ? r.key.id : 0;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("rahasia tidak disimpan di DB; hanya hash dan awalan", async () => {
    const row = await prisma.apiKey.findUniqueOrThrow({ where: { id: keyA } });
    assert.equal(row.keyHash, keys.hashApiKey(secretA));
    assert.equal(row.keyPrefix, secretA.slice(0, 12));
    assert.ok(!JSON.stringify(row).includes(secretA.slice(5)), "rahasia tidak muncul di baris mana pun");
  });

  it("kunci sah: /api/v1/me mengembalikan desa pemilik kunci, scope, dan header laju", async () => {
    const res = await me.GET(req(secretA));
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.village.id, vA);
    assert.deepEqual(j.key.scopes, ["kependudukan:read"]);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.ok(res.headers.get("x-ratelimit-remaining"));
    assert.ok(!JSON.stringify(j).includes(secretA), "respons tidak memuat kunci");
  });

  it("pemakaian tercatat di log akses desa pemilik (bukan desa lain) dan lastUsedAt terisi", async () => {
    await settle();
    const logs = await prisma.apiAccessLog.findMany({ where: { apiKeyId: keyA } });
    assert.ok(logs.length >= 1);
    assert.equal(logs[0].villageId, vA);
    assert.equal(logs[0].status, 200);
    assert.equal(logs[0].path, "/api/v1/me");
    assert.equal(logs[0].ipAddress, "203.0.113.9");
    assert.equal(await prisma.apiAccessLog.count({ where: { villageId: vB } }), 0);
    assert.ok((await prisma.apiKey.findUniqueOrThrow({ where: { id: keyA } })).lastUsedAt);
  });

  it("tanpa kunci / kunci salah / bentuk salah → 401 dengan galat stabil", async () => {
    for (const s of [undefined, "kld_" + "x".repeat(40), "bukan-kunci"]) {
      const res = await me.GET(req(s));
      assert.equal(res.status, 401);
      assert.equal((await res.json()).error.code, "unauthorized");
    }
  });

  it("scope: tanpa scope yang diminta → 403 insufficient_scope", async () => {
    const r = await auth.requireApiKey(req(secretA), "anggaran:read");
    assert.ok(!r.ok);
    assert.equal(r.response.status, 403);
    assert.equal((await r.response.json()).error.code, "insufficient_scope");
    assert.ok((await auth.requireApiKey(req(secretA), "kependudukan:read")).ok);
  });

  it("kedaluwarsa dan dicabut ditolak dengan kode berbeda", async () => {
    const exp = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "Kedaluwarsa", scopes: ["statistik:read"], expiresInDays: 30 });
    assert.ok(exp.ok);
    await prisma.apiKey.update({ where: { id: exp.ok ? exp.key.id : 0 }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const r1 = await me.GET(req(exp.ok ? exp.secret : ""));
    assert.equal(r1.status, 401);
    assert.equal((await r1.json()).error.code, "key_expired");

    const rev = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "Dicabut", scopes: ["statistik:read"], expiresInDays: null });
    assert.ok(rev.ok);
    assert.equal(await keys.revokeApiKey(prisma, { villageId: vA, id: rev.ok ? rev.key.id : 0, userId: 1 }), true);
    const r2 = await me.GET(req(rev.ok ? rev.secret : ""));
    assert.equal(r2.status, 401);
    assert.equal((await r2.json()).error.code, "key_revoked");
    assert.equal(await keys.revokeApiKey(prisma, { villageId: vA, id: rev.ok ? rev.key.id : 0, userId: 1 }), false, "tak bisa dicabut dua kali");
  });

  it("desa lain tidak bisa mencabut kunci desa ini", async () => {
    assert.equal(await keys.revokeApiKey(prisma, { villageId: vB, id: keyA, userId: 9 }), false);
    assert.equal((await prisma.apiKey.findUniqueOrThrow({ where: { id: keyA } })).revokedAt, null);
    assert.deepEqual(await keys.listApiKeys(prisma, vB), []);
  });

  it("langganan desa tidak aktif → 403", async () => {
    await prisma.village.update({ where: { id: vA }, data: { subscriptionExpiry: new Date(Date.now() - 86_400_000) } });
    const res = await me.GET(req(secretA));
    await prisma.village.update({ where: { id: vA }, data: { subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    assert.ok([402, 403].includes(res.status), `status ${res.status}`);
    assert.equal((await res.json()).error.code, "subscription_inactive");
  });

  it("batas jumlah kunci aktif per desa ditegakkan", async () => {
    let last: Awaited<ReturnType<typeof keys.createApiKey>> | null = null;
    for (let i = 0; i < keys.MAX_ACTIVE_KEYS_PER_VILLAGE + 2; i++) {
      last = await keys.createApiKey(prisma, { villageId: vB, userId: 1, name: `k${i}`, scopes: ["statistik:read"], expiresInDays: null });
      if (!last.ok) break;
    }
    assert.ok(last && !last.ok && last.status === 409);
    assert.equal(await prisma.apiKey.count({ where: { villageId: vB, revokedAt: null } }), keys.MAX_ACTIVE_KEYS_PER_VILLAGE);
  });

  it("validasi nama dan masa berlaku", async () => {
    assert.ok(!(await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "   ", scopes: ["statistik:read"], expiresInDays: null })).ok);
    assert.ok(!(await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "x", scopes: ["statistik:read"], expiresInDays: 7 })).ok);
  });

  it("penghapusan desa ikut menghapus kunci dan lognya", async () => {
    const v = await prisma.village.create({ data: { code: `KZ${Date.now() % 1e6}`, name: "Sementara", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 86_400_000) } });
    const k = await keys.createApiKey(prisma, { villageId: v.id, userId: 1, name: "z", scopes: ["statistik:read"], expiresInDays: null });
    assert.ok(k.ok);
    await me.GET(req(k.ok ? k.secret : ""));
    await settle();
    assert.ok((await prisma.apiAccessLog.count({ where: { villageId: v.id } })) >= 1);
    await prisma.village.delete({ where: { id: v.id } });
    assert.equal(await prisma.apiKey.count({ where: { villageId: v.id } }), 0);
    assert.equal(await prisma.apiAccessLog.count({ where: { villageId: v.id } }), 0);
  });

  it("batas laju: permintaan ke-121 dalam semenit ditolak 429 dengan Retry-After, dan tercatat", async () => {
    const k = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "Beban", scopes: ["statistik:read"], expiresInDays: null });
    assert.ok(k.ok);
    const secret = k.ok ? k.secret : "";
    let firstBlocked = 0;
    for (let i = 1; i <= auth.RATE_LIMIT_PER_MINUTE + 5; i++) {
      const res = await me.GET(req(secret));
      if (res.status === 429 && !firstBlocked) {
        firstBlocked = i;
        assert.ok(Number(res.headers.get("retry-after")) >= 1);
        assert.equal((await res.json()).error.code, "rate_limited");
      }
    }
    assert.equal(firstBlocked, auth.RATE_LIMIT_PER_MINUTE + 1);
    await settle();
    assert.ok((await prisma.apiAccessLog.count({ where: { apiKeyId: k.ok ? k.key.id : 0, status: 429 } })) >= 1);
  });
});
