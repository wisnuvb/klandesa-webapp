/** Rute publik lupa/atur kata sandi (handler asli) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { NextRequest } from "next/server";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Rute lupa/atur kata sandi (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let forgot: typeof import("../app/api/auth/lupa-sandi/route");
  let setPw: typeof import("../app/api/auth/atur-sandi/route");
  let links: typeof import("../lib/rbac/access-links");
  let vA = 0;
  const t = Date.now() % 1e6;
  const realFetch = globalThis.fetch;
  const sent: { to: string; subject: string; html: string }[] = [];
  let ipN = 0;

  /** `ip` = IP asli (X-Real-IP, diisi nginx). `xff` boleh dipalsukan klien. */
  const post = (url: string, body: unknown, ip = `10.9.${t % 250}.${++ipN}`, xff?: string) =>
    new NextRequest(`http://localhost${url}`, { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip, "x-forwarded-for": xff ?? ip }, body: JSON.stringify(body) });
  /** Pekerjaan lupa-sandi berjalan di latar setelah respons: tunggu sampai tenang. */
  const settle = async (ms = 400) => new Promise((r) => setTimeout(r, ms));
  /** Tunggu sampai kondisi terpenuhi (maks 4 dtk), lalu beri jeda untuk menangkap duplikat yang terlambat. */
  const settleUntil = async (cond: () => boolean, extraMs = 600) => {
    const end = Date.now() + 4000;
    while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
    await new Promise((r) => setTimeout(r, extraMs));
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_SENDER_EMAIL = "noreply@klandesa.test";
    process.env.NEXT_PUBLIC_SITE_URL = "https://klandesa.com";
    delete process.env.APP_PUBLIC_URL;
    globalThis.fetch = (async (_u: unknown, init?: { body?: string }) => {
      const b = JSON.parse(String(init?.body ?? "{}"));
      sent.push({ to: b.to?.[0]?.email, subject: b.subject, html: b.htmlContent });
      return new Response("{}", { status: 201 });
    }) as typeof fetch;
    ({ prisma } = await import("../lib/prisma"));
    forgot = await import("../app/api/auth/lupa-sandi/route");
    setPw = await import("../app/api/auth/atur-sandi/route");
    links = await import("../lib/rbac/access-links");
    vA = (await prisma.village.create({ data: { code: `RT${t}`, name: "RT", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    await prisma.emailLog.deleteMany({});
    if (vA) await prisma.village.delete({ where: { id: vA } });
    await prisma.$disconnect();
  });

  const mkUser = (email: string, over: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { villageId: vA, email, password: "x", name: "Budi", role: "staff", ...over } });
  const tokenFromEmail = (html: string) => decodeURIComponent(/atur-sandi\?token=([A-Za-z0-9_%-]+)/.exec(html)![1]);

  it("lupa sandi: jawaban SERAGAM terdaftar/tidak/warga/nonaktif; email hanya dikirim ke akun desa aktif; tautan dari konfigurasi", async () => {
    const real = await mkUser(`real${t}@a.id`);
    await mkUser(`warga${t}@a.id`, { role: "citizen" });
    await mkUser(`off${t}@a.id`, { isActive: false });
    sent.length = 0;
    const bodies: string[] = [];
    for (const e of [`real${t}@a.id`, `nobody${t}@a.id`, `warga${t}@a.id`, `off${t}@a.id`]) {
      const res = await forgot.POST(post("/api/auth/lupa-sandi", { email: e }));
      assert.equal(res.status, 200, e);
      bodies.push(JSON.stringify(await res.json()));
    }
    assert.equal(new Set(bodies).size, 1, "jawaban harus identik");
    await settle();
    assert.deepEqual(sent.map((s) => s.to), [`real${t}@a.id`]);
    assert.match(sent[0].html, /https:\/\/my\.klandesa\.com\/auth\/atur-sandi\?token=/);
    assert.ok(await links.peekAuthToken(prisma, tokenFromEmail(sent[0].html)));
    assert.equal(real.isActive, true);
  });

  it("lupa sandi: format email buruk = 400; permintaan beruntun tidak menerbitkan ulang/mengirim ulang (hemat kuota, tautan awal tetap sah)", async () => {
    const bad = await forgot.POST(post("/api/auth/lupa-sandi", { email: "bukan-email" }));
    assert.equal(bad.status, 400);
    const u = await mkUser(`burst${t}@a.id`);
    sent.length = 0;
    // Dua permintaan BERSAMAAN (tanpa menunggu) + satu menyusul: tetap hanya satu email.
    const burst = await Promise.all([1, 2, 3].map(() => forgot.POST(post("/api/auth/lupa-sandi", { email: u.email }))));
    assert.ok(burst.every((r) => r.status === 200));
    await settleUntil(() => sent.length >= 1);
    assert.equal(sent.length, 1, "hanya satu email walau permintaan bersamaan");
    assert.ok(await links.peekAuthToken(prisma, tokenFromEmail(sent[0].html)), "tautan pertama masih berlaku");
  });

  it("lupa sandi: batas per-email TIDAK pernah memberi sinyal (selalu 200 sama) dan tidak bisa dipakai mengunci korban; tautan lama tetap sah", async () => {
    const u = await mkUser(`limit${t}@a.id`);
    const bodies = new Set<string>();
    sent.length = 0;
    for (let i = 0; i < 8; i += 1) {
      // Hilangkan penjaga 2 menit & dedup agar batas per-email yang teruji.
      await prisma.authToken.updateMany({ where: { userId: u.id }, data: { createdAt: new Date(Date.now() - 10 * 60_000) } });
      await prisma.$executeRaw`DELETE FROM mobile_rate_limits WHERE \`key\` LIKE 'once:pw-forgot:%'`;
      await prisma.emailLog.deleteMany({ where: { template: "reset", toHash: (await import("../lib/email/send")).hashRecipient(u.email) } });
      const res = await forgot.POST(post("/api/auth/lupa-sandi", { email: u.email }));
      assert.equal(res.status, 200, `permintaan ${i}`);
      bodies.add(JSON.stringify(await res.json()));
      await settle(250);
    }
    assert.equal(bodies.size, 1);
    assert.equal(sent.length, 5, "email berhenti di batas per-email, tanpa sinyal ke pemanggil");
    // Permintaan publik tidak mencabut tautan lama: SEMUA tautan yang terkirim masih sah sampai salah satunya dipakai.
    const tokens = sent.map((m) => tokenFromEmail(m.html));
    for (const tk of tokens) assert.ok(await links.peekAuthToken(prisma, tk));
    assert.equal((await setPw.POST(post("/api/auth/atur-sandi", { token: tokens[0], password: "SandiBaru2026" }))).status, 200);
    for (const tk of tokens) assert.equal(await links.peekAuthToken(prisma, tk), null, "begitu satu dipakai, semua hangus");
  });

  it("lupa sandi: batas per-IP memakai IP asli — memalsukan X-Forwarded-For tidak melewatinya", async () => {
    const realIp = `10.77.${t % 250}.9`;
    const codes: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      codes.push((await forgot.POST(post("/api/auth/lupa-sandi", { email: `spoof${i}${t}@a.id` }, realIp, `203.0.113.${i + 1}, 198.51.100.${i + 1}`))).status);
    }
    assert.deepEqual(codes, [...Array(10).fill(200), 429, 429]);
  });

  it("atur sandi: sandi lemah tidak menghanguskan tautan; sandi baik bekerja, token sekali pakai, sesi seluler dicabut, ada notifikasi keamanan", async () => {
    const { verifyPassword } = await import("../lib/auth");
    const u = await mkUser(`set${t}@a.id`);
    await prisma.mobileSession.create({ data: { accountType: "staff", accountId: u.id, villageId: vA, role: "staff", refreshHash: `s${t}${u.id}`.padEnd(64, "0").slice(0, 64), familyId: `f${t}`, expiresAt: new Date(Date.now() + 86_400_000) } });
    const { token } = await links.issueAuthToken(prisma, { userId: u.id, purpose: "RESET", ttlMs: 60_000 });

    for (const weak of ["pendek1", "tanpaangka", "12345678"]) {
      assert.equal((await setPw.POST(post("/api/auth/atur-sandi", { token, password: weak }))).status, 400, weak);
    }
    assert.ok(await links.peekAuthToken(prisma, token), "token tetap hidup setelah sandi lemah");

    sent.length = 0;
    const ok = await setPw.POST(post("/api/auth/atur-sandi", { token, password: "SandiBaru2026" }));
    assert.equal(ok.status, 200);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    assert.equal(await verifyPassword("SandiBaru2026", row.password), true);
    const again = await setPw.POST(post("/api/auth/atur-sandi", { token, password: "SandiLain2026" }));
    assert.equal(again.status, 400, "token tak bisa dipakai ulang");
    assert.equal(await verifyPassword("SandiLain2026", (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).password), false);
    assert.ok((await prisma.mobileSession.findMany({ where: { accountId: u.id } })).every((s) => s.revokedAt));
    await new Promise((r) => setTimeout(r, 300));
    assert.ok(sent.some((s) => s.to === u.email && /diganti/i.test(s.subject)), "notifikasi kata sandi diganti terkirim");
    const audit = await prisma.auditLog.findFirst({ where: { userId: u.id, entity: "users" } });
    assert.ok(audit && !JSON.stringify(audit.changes).includes("SandiBaru"), "audit tidak memuat sandi");
  });

  it("atur sandi dari UNDANGAN: akun yang tadinya tak bisa login kini bisa; tidak ada notifikasi 'diganti' (ini sandi pertama)", async () => {
    const { verifyPassword } = await import("../lib/auth");
    const { createOfficialAccount } = await import("../lib/rbac/accounts");
    const pos = await prisma.position.create({ data: { villageId: vA, name: "Kaur", level: 3 } });
    const off = await prisma.official.create({ data: { villageId: vA, positionId: pos.id, nik: `33003${t}0`.padEnd(16, "0").slice(0, 16), name: "Citra", birthplace: "x", birthDate: new Date("1985-01-01"), gender: "F", address: "a", startDate: new Date("2020-01-01"), status: "active" } });
    const c = await createOfficialAccount(prisma, { villageId: vA, officialId: off.id, email: `inv${t}@a.id` });
    assert.ok(c.ok);
    if (!c.ok) return;
    sent.length = 0;
    const d = await links.deliverAccessLink(prisma, { userId: c.data.userId, purpose: "INVITE", byAdmin: true, invitedBy: "Admin" });
    assert.ok(d?.sent);
    const token = tokenFromEmail(sent[0].html);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: c.data.userId } });
    assert.equal(await verifyPassword("SandiPertama1", before.password), false);
    sent.length = 0;
    assert.equal((await setPw.POST(post("/api/auth/atur-sandi", { token, password: "SandiPertama1" }))).status, 200);
    assert.equal(await verifyPassword("SandiPertama1", (await prisma.user.findUniqueOrThrow({ where: { id: c.data.userId } })).password), true);
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(sent.length, 0);
  });

  it("atur sandi: akun nonaktif ditolak (403); token ngawur 400; batas laju per IP -> 429", async () => {
    const u = await mkUser(`inact${t}@a.id`);
    const { token } = await links.issueAuthToken(prisma, { userId: u.id, purpose: "RESET", ttlMs: 60_000 });
    await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
    assert.equal((await setPw.POST(post("/api/auth/atur-sandi", { token, password: "Sandi12345" }))).status, 403);
    assert.equal((await setPw.POST(post("/api/auth/atur-sandi", { token: "ngawur-ngawur-ngawur-ngawur", password: "Sandi12345" }))).status, 400);
    const ip = `10.99.${t % 250}.1`;
    const codes: number[] = [];
    for (let i = 0; i < 22; i += 1) codes.push((await setPw.POST(post("/api/auth/atur-sandi", { token: "ngawur-ngawur-ngawur-ngawur", password: "Sandi12345" }, ip))).status);
    assert.equal(codes.filter((c) => c === 429).length, 2);
  });
});
