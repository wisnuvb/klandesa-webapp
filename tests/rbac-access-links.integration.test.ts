/** Tautan akses (undangan/atur ulang) + pengirim email hemat kuota terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Tautan akses & pengirim email (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let links: typeof import("../lib/rbac/access-links");
  let mail: typeof import("../lib/email/send");
  let tpl: typeof import("../lib/email/templates");
  let vA = 0;
  let userId = 0;
  const t = Date.now() % 1e6;
  const realFetch = globalThis.fetch;
  const sentBodies: { to: string; subject: string }[] = [];

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    links = await import("../lib/rbac/access-links");
    mail = await import("../lib/email/send");
    tpl = await import("../lib/email/templates");
    vA = (await prisma.village.create({ data: { code: `AL${t}`, name: "Desa <Uji>", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
    userId = (await prisma.user.create({ data: { villageId: vA, email: `u${t}@a.id`, password: "x", name: "Budi", role: "staff" } })).id;
  });
  after(async () => {
    globalThis.fetch = realFetch;
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.EMAIL_DAILY_LIMIT;
    await prisma.emailLog.deleteMany({ where: { template: { in: ["welcome", "invite", "reset", "password-changed", "other"] } } });
    if (vA) await prisma.village.delete({ where: { id: vA } });
    await prisma.$disconnect();
  });

  const stubBrevo = (ok = true) => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.BREVO_SENDER_EMAIL = "noreply@klandesa.test";
    globalThis.fetch = (async (_url: unknown, init?: { body?: string }) => {
      const b = JSON.parse(String(init?.body ?? "{}"));
      sentBodies.push({ to: b.to?.[0]?.email, subject: b.subject });
      return ok ? new Response("{}", { status: 201 }) : new Response(JSON.stringify({ message: "boom" }), { status: 400 });
    }) as typeof fetch;
  };

  it("token: hanya hash di DB, sekali pakai, terbit baru mencabut yang lama, kedaluwarsa & format buruk ditolak", async () => {
    const a = await links.issueAuthToken(prisma, { userId, purpose: "INVITE", ttlMs: 60_000 });
    const row = await prisma.authToken.findFirstOrThrow({ where: { userId, usedAt: null } });
    assert.notEqual(row.tokenHash, a.token);
    assert.equal(row.tokenHash, links.hashToken(a.token));
    assert.ok(!JSON.stringify(row).includes(a.token), "token mentah tidak boleh ada di DB");

    assert.ok(await links.peekAuthToken(prisma, a.token), "peek tidak memakai token");
    assert.ok(await links.peekAuthToken(prisma, a.token));
    const b = await links.issueAuthToken(prisma, { userId, purpose: "INVITE", ttlMs: 60_000 });
    assert.equal(await links.peekAuthToken(prisma, a.token), null, "token lama hangus saat terbit baru");
    assert.deepEqual(await links.consumeAuthToken(prisma, b.token), { userId, purpose: "INVITE" });
    assert.equal(await links.consumeAuthToken(prisma, b.token), null, "tidak bisa dipakai dua kali");

    const exp = await links.issueAuthToken(prisma, { userId, purpose: "RESET", ttlMs: 1_000, now: new Date(Date.now() - 10_000) });
    assert.equal(await links.consumeAuthToken(prisma, exp.token), null, "kedaluwarsa");
    for (const bad of ["", "x", "a".repeat(200), "../etc/passwd", "a b c d e f g h i j k l m n o p"]) {
      assert.equal(await links.peekAuthToken(prisma, bad), null, bad);
      assert.equal(await links.consumeAuthToken(prisma, bad), null, bad);
    }
  });

  it("dua pemakaian bersamaan atas token yang sama: hanya satu menang", async () => {
    const x = await links.issueAuthToken(prisma, { userId, purpose: "RESET", ttlMs: 60_000 });
    const results = await Promise.all(Array.from({ length: 6 }, () => links.consumeAuthToken(prisma, x.token)));
    assert.equal(results.filter(Boolean).length, 1);
  });

  it("tanpa Brevo: undangan tidak hilang — tautan manual dikembalikan, token tersimpan sebagai 'Menunggu aktivasi'", async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    const d = await links.deliverAccessLink(prisma, { userId, purpose: "INVITE", byAdmin: true, invitedBy: "Admin" });
    assert.ok(d && !d.sent && d.reason === "not-configured" && d.manualLink);
    const token = new URL(d!.manualLink!).searchParams.get("token")!;
    assert.match(d!.manualLink!, /\/auth\/atur-sandi\?token=/);
    assert.ok(await links.peekAuthToken(prisma, token));
    const { pendingInviteIds } = await import("../lib/rbac/accounts");
    assert.ok((await pendingInviteIds(prisma, [userId])).has(userId));
  });

  it("dengan Brevo: email terkirim ke alamat akun, tautan TIDAK dikembalikan ke penelepon, log hanya berisi hash", async () => {
    stubBrevo(true);
    sentBodies.length = 0;
    const d = await links.deliverAccessLink(prisma, { userId, purpose: "RESET", byAdmin: true });
    assert.ok(d && d.sent && !d.manualLink);
    assert.deepEqual(sentBodies.map((b) => b.to), [`u${t}@a.id`]);
    const logs = await prisma.emailLog.findMany({ where: { toHash: mail.hashRecipient(`u${t}@a.id`) } });
    assert.ok(logs.length >= 1 && logs.every((l) => !JSON.stringify(l).includes(`u${t}@a.id`)));
  });

  it("Brevo menolak: hasil gagal + tautan manual; kegagalan dicatat FAILED", async () => {
    stubBrevo(false);
    const d = await links.deliverAccessLink(prisma, { userId, purpose: "RESET", byAdmin: true });
    assert.ok(d && !d.sent && d.reason === "failed" && d.manualLink);
    assert.ok(await prisma.emailLog.findFirst({ where: { status: "FAILED", toHash: mail.hashRecipient(`u${t}@a.id`) } }));
  });

  it("hemat kuota: dedup jendela waktu, anggaran harian menahan email biasa tetapi kritis tetap lewat", async () => {
    stubBrevo(true);
    await prisma.emailLog.deleteMany({});
    const content = tpl.welcomeEmail({ name: "N", villageName: "V", trialDays: 14, loginUrl: "https://x/l", onboardingUrl: "https://x/o" });
    const to = `dedupe${t}@a.id`;
    assert.deepEqual(await mail.sendTransactional({ template: "welcome", to, content, dedupeMs: 60_000 }), { ok: true });
    const dup = await mail.sendTransactional({ template: "welcome", to: to.toUpperCase(), content, dedupeMs: 60_000 });
    assert.ok(!dup.ok && dup.reason === "duplicate");

    process.env.EMAIL_DAILY_LIMIT = "3";
    sentBodies.length = 0;
    const r = [];
    for (let i = 0; i < 4; i += 1) r.push(await mail.sendTransactional({ template: "welcome", to: `q${i}${t}@a.id`, content }));
    // 1 sudah terkirim di atas -> 2 lagi lolos (total 3), sisanya ditahan
    assert.equal(r.filter((x) => x.ok).length, 2);
    assert.ok(r.filter((x) => !x.ok).every((x) => !x.ok && x.reason === "quota"));
    assert.equal(sentBodies.length, 2, "yang ditahan tidak memanggil Brevo");
    const critical = await mail.sendTransactional({ template: "reset", to: `crit${t}@a.id`, content });
    assert.deepEqual(critical, { ok: true }, "email kritis memakai ruang cadangan");
    assert.ok(await prisma.emailLog.findFirst({ where: { status: "SKIPPED" } }));
    delete process.env.EMAIL_DAILY_LIMIT;
  });

  it("tindakan admin dibatasi per desa per jam: lewat batas = tak ada token, tak ada email, tak ada tautan", async () => {
    stubBrevo(true);
    sentBodies.length = 0;
    await prisma.authToken.deleteMany({ where: { userId } });
    await prisma.$executeRaw`DELETE FROM mobile_rate_limits WHERE \`key\` LIKE 'access-link-village:%'`;
    const results = [];
    for (let i = 0; i < links.ADMIN_SENDS_PER_HOUR + 2; i += 1) results.push(await links.deliverAccessLink(prisma, { userId, purpose: "RESET", byAdmin: true }));
    assert.equal(results.filter((r) => r?.sent).length, links.ADMIN_SENDS_PER_HOUR);
    const blocked = results.slice(links.ADMIN_SENDS_PER_HOUR);
    assert.ok(blocked.every((r) => r && !r.sent && r.reason === "rate-limit" && !r.manualLink));
    assert.equal(sentBodies.length, links.ADMIN_SENDS_PER_HOUR);
    // Alur publik (byAdmin:false) tidak ikut terkunci oleh batas admin.
    const pub = await links.deliverAccessLink(prisma, { userId, purpose: "RESET", byAdmin: false });
    assert.ok(pub?.sent);
    await prisma.$executeRaw`DELETE FROM mobile_rate_limits WHERE \`key\` LIKE 'access-link-village:%'`;
  });

  it("claimOnce: dari banyak pemanggil bersamaan TEPAT satu menang; jendela/ID berbeda tidak saling mengunci", async () => {
    const { claimOnce } = await import("../lib/rbac/claim-once");
    const id = `u${t}`;
    const wins = await Promise.all(Array.from({ length: 10 }, () => claimOnce("uji", id, 60_000)));
    assert.equal(wins.filter(Boolean).length, 1);
    assert.equal(await claimOnce("uji", id, 60_000), false, "sudah diklaim di jendela yang sama");
    assert.equal(await claimOnce("uji", `${id}-lain`, 60_000), true, "ID lain bebas");
    assert.equal(await claimOnce("uji", id, 60_000, Date.now() + 61_000), true, "jendela berikutnya bebas");
  });

  it("pengirim lama (cron) kini ikut terhitung di anggaran lewat sendBrevoEmail", async () => {
    stubBrevo(true);
    await prisma.emailLog.deleteMany({});
    const { sendBrevoEmail } = await import("../lib/email/brevo");
    assert.deepEqual(await sendBrevoEmail({ to: `cron${t}@a.id`, subject: "s", html: "<p>x</p>", text: "x" }), { ok: true });
    const row = await prisma.emailLog.findFirstOrThrow({});
    assert.equal(row.template, "other");
    assert.equal(row.status, "SENT");
  });
});
