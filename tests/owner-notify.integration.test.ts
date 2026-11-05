/**
 * Email pemberitahuan ke pemilik: desa baru daftar (trial) dan pembayaran lunas. Isi email (murni) + alur nyata di MySQL
 * scratch dengan Brevo dan LinkQu dipalsukan lewat fetch. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";
import { buildPaymentPaidEmail, buildVillageRegisteredEmail, DEFAULT_OWNER_RECIPIENT, ownerRecipients } from "../lib/notifications/owner-notify";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("isi email pemilik (murni)", () => {
  const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

  it("penerima: bawaan wisnuvb@gmail.com; env menggantikan; alamat rusak diabaikan; kosong/rusak semua -> bawaan", () => {
    assert.deepEqual(ownerRecipients(env({})), [DEFAULT_OWNER_RECIPIENT]);
    assert.equal(DEFAULT_OWNER_RECIPIENT, "wisnuvb@gmail.com");
    assert.deepEqual(ownerRecipients(env({ OWNER_NOTIFY_EMAIL: "A@x.id, b@y.id" })), ["a@x.id", "b@y.id"]);
    assert.deepEqual(ownerRecipients(env({ OWNER_NOTIFY_EMAIL: "bukan-email, c@z.id" })), ["c@z.id"]);
    assert.deepEqual(ownerRecipients(env({ OWNER_NOTIFY_EMAIL: "bukan-email" })), [DEFAULT_OWNER_RECIPIENT]);
  });

  it("pendaftaran: memuat desa, lokasi, kontak, trial; teks dinamis di-escape; tanpa kata sandi", () => {
    const m = buildVillageRegisteredEmail({
      villageName: "Desa <b>Maju</b>", villageCode: "desa-maju", district: "K", regency: "R", province: "P",
      headName: "Budi & Ani", email: "budi@desa.id", phone: null, referralCode: "REF1", trialDays: 14,
      trialExpiry: new Date("2026-11-19T00:00:00Z"), registeredAt: new Date("2026-11-05T03:00:00Z"),
    });
    assert.match(m.subject, /Desa baru daftar \(trial\)/);
    assert.ok(!m.html.includes("<b>Maju</b>"), "HTML tidak di-escape");
    assert.match(m.html, /&lt;b&gt;Maju&lt;\/b&gt;/);
    assert.match(m.text, /Kode referral: REF1/);
    assert.match(m.text, /Telepon: -/);
    assert.ok(!/password|sandi/i.test(m.text));
  });

  it("pembayaran: pembayaran pertama ditandai konversi trial; rincian dan jumlah tampil", () => {
    const base = {
      villageName: "Desa A", villageCode: "a", villageEmail: null, villagePhone: null, invoiceNumber: "INV-1",
      productType: "desa_package", planCode: "lengkap", items: ["Paket Lengkap", "Arsip x2"], amount: 3_500_000,
      paidAt: new Date("2026-11-05T03:00:00Z"), subscriptionStatus: "active", subscriptionExpiry: new Date("2027-11-05T03:00:00Z"),
    };
    const first = buildPaymentPaidEmail({ ...base, firstPayment: true });
    assert.match(first.text, /konversi dari trial/);
    assert.match(first.subject, /3\.500\.000/);
    assert.match(first.text, /Rincian: Paket Lengkap; Arsip x2/);
    assert.ok(!/konversi dari trial/.test(buildPaymentPaidEmail({ ...base, firstPayment: false }).text));
  });
});

describe("Email pemilik pada alur nyata (MySQL + Brevo/LinkQu palsu)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let service: typeof import("../lib/billing/service");
  let register: typeof import("../app/api/auth/register/route");
  const KEY = "kunci-tanda-tangan-uji-0123456789";
  const USER = "uji-owner";
  const t = Date.now() % 1e6;
  const realFetch = globalThis.fetch;
  let seq = 0;
  let ipN = 0;
  type Sent = { to: string; subject: string; text: string };
  const sent: Sent[] = [];
  let brevoFails = false;
  const remote = new Map<string, unknown>();

  const owner = () => sent.filter((s) => s.to === DEFAULT_OWNER_RECIPIENT);
  const waitFor = async (pred: () => boolean, ms = 4000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (pred()) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return pred();
  };
  const settle = () => new Promise((r) => setTimeout(r, 400));

  const sign = (reff: string, amount: number) => createHmac("sha256", KEY).update(`${reff}${amount}${USER}`).digest("hex");
  const makeInvoice = async (villageId?: number, productType = "desa_package", planCode = "lengkap") => {
    seq += 1;
    const village = villageId
      ? await prisma.village.findUniqueOrThrow({ where: { id: villageId } })
      : await prisma.village.create({
          data: { code: `ON${t}${seq}`, name: `Desa ON ${seq}`, district: "k", regency: "r", province: "p", address: "a", email: `on${t}${seq}@uji.test`, subscriptionStatus: "trial", subscriptionExpiry: new Date(Date.now() + 86_400_000) },
        });
    const reff = `${1700000000000 + t}${String(seq).padStart(6, "0")}`;
    const inv = await prisma.billingInvoice.create({
      data: {
        villageId: village.id, invoiceNumber: `INV-ON-${t}-${seq}`, partnerReff: reff, productType, planCode, amount: 100_000, status: "pending",
        items: { create: [{ name: "Paket Lengkap", quantity: 1, unitAmount: 100_000, totalAmount: 100_000 }] },
      },
    });
    remote.set(reff, { rc: "00", rd: "ok", data: { status_trx: "success", status_paid: "paid", amount: "100000" } });
    return { village, inv, reff };
  };
  const callback = (reff: string, over: Record<string, unknown> = {}) =>
    service.handleLinkquCallback({ partner_reff: reff, amount: 100_000, username: USER, status: "SUCCESS", signature: sign(reff, 100_000), ...over } as never);

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.LINKQU_URL = "https://linkqu.test";
    process.env.LINKQU_CLIENT_ID = "cid";
    process.env.LINKQU_CLIENT_SECRET = "csecret";
    process.env.LINKQU_USERNAME = USER;
    process.env.LINKQU_PIN = "1234";
    process.env.LINKQU_SIGNATURE_KEY = KEY;
    process.env.BREVO_API_KEY = "kunci-brevo-uji";
    process.env.BREVO_SENDER_EMAIL = "pengirim@uji.test";
    delete process.env.OWNER_NOTIFY_EMAIL;
    delete process.env.WEBSITE_ORDER_NOTIFY_EMAIL;
    delete process.env.TURNSTILE_SECRET_KEY;
    ({ prisma } = await import("../lib/prisma"));
    service = await import("../lib/billing/service");
    register = await import("../app/api/auth/register/route");
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.host === "linkqu.test") {
        const v = remote.get(url.searchParams.get("partnerreff") ?? "");
        return new Response(JSON.stringify(v ?? { rc: "99", rd: "tidak ditemukan" }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.host === "api.brevo.com") {
        const b = JSON.parse(String(init?.body)) as { to: Array<{ email: string }>; subject: string; textContent?: string };
        if (brevoFails) return new Response("boom", { status: 500 });
        sent.push({ to: b.to[0].email.toLowerCase(), subject: b.subject, text: b.textContent ?? "" });
        return new Response(JSON.stringify({ messageId: "x" }), { status: 201, headers: { "content-type": "application/json" } });
      }
      return realFetch(input as RequestInfo, init);
    }) as typeof fetch;
  });

  after(async () => {
    globalThis.fetch = realFetch;
    await prisma.$disconnect();
  });

  const signup = (email: string, name: string) =>
    register.POST(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": `10.6.${t % 250}.${++ipN}` },
        body: JSON.stringify({
          namaDesa: name, namaKecamatan: "Kec Uji", namaKabupaten: "Kab Uji", provinsi: "Prov Uji", namaKepala: "Pak Kades",
          nomorTelepon: "08123456789", emailDesa: email, password: "Sandi12345", confirmPassword: "Sandi12345", agreeTerms: true, agreePrivacy: true,
        }),
      }),
    );

  it("desa daftar trial -> pemilik menerima email berisi desa, lokasi, kontak; tanpa kata sandi", async () => {
    const before = owner().length;
    const res = await signup(`daftar${t}@uji.test`, `Desa Baru ${t}`);
    assert.equal(res.status, 201);
    assert.ok(await waitFor(() => owner().length > before), "email pemilik tidak terkirim");
    const mail = owner().at(-1)!;
    assert.match(mail.subject, new RegExp(`Desa baru daftar \\(trial\\): Desa Baru ${t}`));
    assert.match(mail.text, /Kec\. Kec Uji, Kab Uji, Prov Uji/);
    assert.match(mail.text, new RegExp(`daftar${t}@uji.test`));
    assert.ok(!/Sandi12345/.test(mail.text));
  });

  it("pendaftaran ditolak (email sudah dipakai) tidak mengirim email pemilik; kegagalan Brevo tidak menggagalkan pendaftaran", async () => {
    const email = `dobel${t}@uji.test`;
    assert.equal((await signup(email, `Desa Dobel ${t}`)).status, 201);
    await settle();
    const before = owner().length;
    assert.equal((await signup(email, `Desa Dobel2 ${t}`)).status, 409);
    await settle();
    assert.equal(owner().length, before, "pendaftaran gagal tidak boleh memberi tahu pemilik");

    brevoFails = true;
    try {
      assert.equal((await signup(`gagal${t}@uji.test`, `Desa Gagal ${t}`)).status, 201, "Brevo error tidak boleh menggagalkan pendaftaran");
      await settle();
    } finally {
      brevoFails = false;
    }
  });

  it("pembayaran lunas pertama -> email 'konversi dari trial'; pembayaran berikutnya desa yang sama -> email biasa", async () => {
    const a = await makeInvoice();
    const before = owner().length;
    assert.equal((await callback(a.reff)).ok, true);
    assert.ok(await waitFor(() => owner().length > before), "email pembayaran tidak terkirim");
    const first = owner().at(-1)!;
    assert.match(first.subject, /Pembayaran lunas/);
    assert.match(first.subject, new RegExp(a.village.name));
    assert.match(first.text, /konversi dari trial/);
    assert.match(first.text, new RegExp(a.inv.invoiceNumber));

    const b = await makeInvoice(a.village.id);
    const mid = owner().length;
    assert.equal((await callback(b.reff)).ok, true);
    assert.ok(await waitFor(() => owner().length > mid));
    assert.ok(!/konversi dari trial/.test(owner().at(-1)!.text));
  });

  it("callback ganda tidak mengirim email kedua; callback ditolak (LinkQu bilang belum lunas) tidak mengirim email", async () => {
    const a = await makeInvoice();
    const before = owner().length;
    assert.equal((await callback(a.reff)).ok, true);
    assert.ok(await waitFor(() => owner().length > before));
    const afterFirst = owner().length;
    assert.equal((await callback(a.reff)).ok, true);
    await settle();
    assert.equal(owner().length, afterFirst, "callback ganda");

    const c = await makeInvoice();
    remote.set(c.reff, { rc: "00", rd: "ok", data: { status_trx: "pending", status_paid: "unpaid", amount: "100000" } });
    assert.equal((await callback(c.reff)).ok, false);
    await settle();
    assert.equal(owner().length, afterFirst, "klaim lunas yang dibantah LinkQu");

    const e = await makeInvoice();
    assert.equal((await callback(e.reff, { status: "EXPIRED" })).ok, true);
    await settle();
    assert.equal(owner().length, afterFirst, "status kedaluwarsa bukan pembayaran");
  });

  it("tagihan Website Desa Kustom tidak mendapat email 'Pembayaran lunas' ganda (sudah punya email pesanan sendiri)", async () => {
    const w = await makeInvoice(undefined, "website_custom", "custom");
    const before = sent.length;
    assert.equal((await callback(w.reff)).ok, true);
    await settle();
    const fresh = sent.slice(before);
    assert.ok(!fresh.some((s) => /Pembayaran lunas/.test(s.subject)), JSON.stringify(fresh.map((s) => s.subject)));
  });

  it("kegagalan Brevo tidak menggagalkan pemrosesan pembayaran (tagihan tetap paid, langganan aktif)", async () => {
    const a = await makeInvoice();
    brevoFails = true;
    try {
      assert.equal((await callback(a.reff)).ok, true);
      await settle();
    } finally {
      brevoFails = false;
    }
    assert.equal((await prisma.billingInvoice.findUniqueOrThrow({ where: { id: a.inv.id } })).status, "paid");
    assert.equal((await prisma.village.findUniqueOrThrow({ where: { id: a.village.id } })).subscriptionStatus, "active");
  });
});
