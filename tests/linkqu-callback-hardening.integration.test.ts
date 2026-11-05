/**
 * Callback LinkQu (audit 2026-11-05): `status` tidak ikut ditandatangani, jadi klaim "paid" dicocokkan dengan checkstatus
 * LinkQu sebelum mengaktifkan; host `url_callback` dibatasi allowlist. Handler asli + MySQL sungguhan, LinkQu dipalsukan lewat
 * fetch. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it, before, after } from "node:test";
import { allowedCallbackHosts, buildLinkquCallbackUrl } from "../lib/linkqu/callback-url";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });

describe("url_callback: allowlist host", () => {
  const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

  it("tanpa konfigurasi: perilaku lama (host permintaan dipakai)", () => {
    assert.deepEqual(allowedCallbackHosts(env({})), []);
    assert.equal(buildLinkquCallbackUrl(h({ host: "my.klandesa.id" }), env({})), "https://my.klandesa.id/api/billing/linkqu/callback");
  });

  it("LINKQU_CALLBACK_HOSTS: host di luar daftar diganti host pertama (pembayaran tetap jalan), bukan ditolak", () => {
    const e = env({ LINKQU_CALLBACK_HOSTS: "my.klandesa.id, staging.klandesa.id" });
    assert.equal(buildLinkquCallbackUrl(h({ "x-forwarded-host": "attacker.example" }), e), "https://my.klandesa.id/api/billing/linkqu/callback");
    assert.equal(buildLinkquCallbackUrl(h({ "x-forwarded-host": "staging.klandesa.id" }), e), "https://staging.klandesa.id/api/billing/linkqu/callback");
    assert.equal(buildLinkquCallbackUrl(h({ host: "MY.KLANDESA.ID" }), e), "https://MY.KLANDESA.ID/api/billing/linkqu/callback");
    assert.equal(buildLinkquCallbackUrl(h({ host: "localhost:3000" }), e), "https://my.klandesa.id/api/billing/linkqu/callback", "host lokal juga tidak boleh dipakai bila ada daftar");
  });

  it("APP_PUBLIC_URL dipakai bila daftar eksplisit tidak ada; host rusak tetap ditolak", () => {
    const e = env({ APP_PUBLIC_URL: "https://my.klandesa.com" });
    assert.equal(buildLinkquCallbackUrl(h({ host: "evil.com" }), e), "https://my.klandesa.com/api/billing/linkqu/callback");
    assert.equal(buildLinkquCallbackUrl(h({ host: "evil.com/x?y=" }), e), null);
  });
});

describe("Callback LinkQu terhadap MySQL nyata", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let service: typeof import("../lib/billing/service");
  const KEY = "kunci-tanda-tangan-uji-0123456789";
  const USER = "uji-linkqu";
  const t = Date.now() % 1e6;
  const realFetch = globalThis.fetch;
  let seq = 0;
  /** Jawaban checkstatus LinkQu palsu per partner_reff; "error" = gangguan jaringan. */
  const remote = new Map<string, unknown>();
  let checkCalls = 0;

  const sign = (reff: string, amount: number) => createHmac("sha256", KEY).update(`${reff}${amount}${USER}`).digest("hex");
  const makeInvoice = async (amount = 100_000) => {
    seq += 1;
    const village = await prisma.village.create({
      data: { code: `LQ${t}${seq}`, name: "Desa LQ", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "trial", subscriptionExpiry: new Date(Date.now() + 86_400_000) },
    });
    const reff = `${1700000000000 + t}${String(seq).padStart(6, "0")}`;
    const inv = await prisma.billingInvoice.create({
      data: { villageId: village.id, invoiceNumber: `INV-${t}-${seq}`, partnerReff: reff, productType: "desa_package", planCode: "profesional", amount, status: "pending" },
    });
    return { village, inv, reff };
  };
  const callback = (reff: string, over: Record<string, unknown> = {}) =>
    service.handleLinkquCallback({ partner_reff: reff, amount: 100_000, username: USER, status: "SUCCESS", signature: sign(reff, 100_000), ...over } as never);
  const linkquSays = (reff: string, data: unknown) => remote.set(reff, data);

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.LINKQU_URL = "https://linkqu.test";
    process.env.LINKQU_CLIENT_ID = "cid";
    process.env.LINKQU_CLIENT_SECRET = "csecret";
    process.env.LINKQU_USERNAME = USER;
    process.env.LINKQU_PIN = "1234";
    process.env.LINKQU_SIGNATURE_KEY = KEY;
    ({ prisma } = await import("../lib/prisma"));
    service = await import("../lib/billing/service");
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.host !== "linkqu.test") return realFetch(input as RequestInfo, init);
      checkCalls += 1;
      const reff = url.searchParams.get("partnerreff") ?? "";
      const v = remote.get(reff);
      if (v === "error") throw new TypeError("fetch failed");
      return new Response(JSON.stringify(v ?? { rc: "99", rd: "tidak ditemukan" }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
  });

  after(async () => {
    globalThis.fetch = realFetch;
    await prisma.$disconnect();
  });

  it("LinkQu membenarkan lunas (nominal sama) -> invoice paid dan langganan aktif", async () => {
    const { inv, reff, village } = await makeInvoice();
    linkquSays(reff, { rc: "00", rd: "ok", data: { status_trx: "success", status_paid: "paid", amount: "100000" } });
    const r = await callback(reff);
    assert.equal(r.ok, true);
    assert.equal((await prisma.billingInvoice.findUnique({ where: { id: inv.id } }))?.status, "paid");
    assert.equal((await prisma.village.findUnique({ where: { id: village.id } }))?.subscriptionStatus, "active");
  });

  it("callback bertanda tangan dengan status diubah jadi paid, tetapi LinkQu bilang belum lunas -> 409, invoice tetap pending", async () => {
    const { inv, reff, village } = await makeInvoice();
    linkquSays(reff, { rc: "00", rd: "ok", data: { status_trx: "pending", status_paid: "unpaid", amount: "100000" } });
    const r = await callback(reff, { status: "SUCCESS" }); // status tidak ikut ditandatangani: tanda tangan tetap sah
    assert.equal(r.ok, false);
    assert.equal((r as { status: number }).status, 409);
    assert.equal((await prisma.billingInvoice.findUnique({ where: { id: inv.id } }))?.status, "pending");
    assert.notEqual((await prisma.village.findUnique({ where: { id: village.id } }))?.subscriptionStatus, "active");
  });

  it("LinkQu menjawab lunas tetapi nominal berbeda -> ditolak", async () => {
    const { inv, reff } = await makeInvoice();
    linkquSays(reff, { rc: "00", rd: "ok", data: { status_trx: "success", status_paid: "paid", amount: "5000" } });
    const r = await callback(reff);
    assert.equal(r.ok, false);
    assert.equal((await prisma.billingInvoice.findUnique({ where: { id: inv.id } }))?.status, "pending");
  });

  it("LinkQu tak terjangkau atau jawabannya tak dikenali -> callback bertanda tangan tetap diterima (pembayaran asli tidak tertahan)", async () => {
    const a = await makeInvoice();
    linkquSays(a.reff, "error");
    assert.equal((await callback(a.reff)).ok, true);
    assert.equal((await prisma.billingInvoice.findUnique({ where: { id: a.inv.id } }))?.status, "paid");

    const b = await makeInvoice();
    linkquSays(b.reff, { rc: "00", rd: "ok", data: { foo: "bar" } });
    assert.equal((await callback(b.reff)).ok, true);
    assert.equal((await prisma.billingInvoice.findUnique({ where: { id: b.inv.id } }))?.status, "paid");
  });

  it("tanda tangan salah ditolak tanpa menanyakan LinkQu; callback non-paid tidak memicu checkstatus; callback ganda idempoten", async () => {
    const { inv, reff } = await makeInvoice();
    const before = checkCalls;
    const bad = await callback(reff, { signature: "00".repeat(32) });
    assert.equal(bad.ok, false);
    assert.equal(checkCalls, before, "tidak ada panggilan ke LinkQu untuk tanda tangan salah");
    const expired = await callback(reff, { status: "EXPIRED" });
    assert.equal(expired.ok, true);
    assert.equal(checkCalls, before, "status non-paid tidak perlu checkstatus");

    const c = await makeInvoice();
    linkquSays(c.reff, { rc: "00", rd: "ok", data: { status_trx: "success", status_paid: "paid", amount: "100000" } });
    assert.equal((await callback(c.reff)).ok, true);
    const callsAfterFirst = checkCalls;
    assert.equal((await callback(c.reff)).ok, true, "callback ganda tetap 200");
    assert.equal(checkCalls, callsAfterFirst, "invoice sudah paid: tidak perlu menanyakan LinkQu lagi");
    void inv;
  });

  it("peristiwa dengan tanda tangan salah dibatasi 20 baris/jam per tagihan", async () => {
    const { inv, reff } = await makeInvoice();
    for (let i = 0; i < 30; i++) await callback(reff, { signature: "ab".repeat(32) });
    const rows = await prisma.billingPaymentEvent.count({ where: { invoiceId: inv.id, signatureValid: false } });
    assert.equal(rows, 20);
  });
});
