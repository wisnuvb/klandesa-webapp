import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { ALL_WEBHOOK_EVENTS, isWebhookEvent, parseEvents, readEvents, TEST_EVENT } from "../lib/webhooks/events.ts";
import { generateWebhookSecret, signWebhook, signatureHeader, verifyWebhook } from "../lib/webhooks/sign.ts";
import { BlockedAddressError, guardedLookup, isBlockedIp, validateWebhookUrl } from "../lib/webhooks/url-guard.ts";
import { BACKOFF_MINUTES, MAX_ATTEMPTS } from "../lib/webhooks/service.ts";

test("IP non-publik ditolak: IPv4, IPv6, dan bentuk terselubung", () => {
  const blocked = [
    "127.0.0.1", "127.255.255.254", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1",
    "::", "::1", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1", "2002:7f00:1::1", "2001:db8::1", "::127.0.0.1",
  ];
  for (const ip of blocked) assert.ok(isBlockedIp(ip), `${ip} harus ditolak`);
  for (const ip of ["fec0::1", "100::1", "::ffff:0:8.8.8.8", "192.88.99.1", "5f00::1"]) assert.ok(isBlockedIp(ip), `${ip} harus ditolak (daftar-izin IPv6)`);
  const open = ["8.8.8.8", "1.1.1.1", "172.15.0.1", "172.32.0.1", "203.0.114.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"];
  for (const ip of open) assert.ok(!isBlockedIp(ip), `${ip} harus lolos`);
  assert.ok(isBlockedIp("bukan-ip"));
});

test("alamat tujuan: wajib https, tanpa kredensial, tanpa host internal", () => {
  assert.ok(validateWebhookUrl("https://contoh.id/hook").ok);
  assert.ok(validateWebhookUrl("https://sub.contoh.id:8443/a/b?x=1").ok);
  for (const bad of [
    "", "   ", 42, null, "contoh.id/hook", "ftp://contoh.id", "javascript:alert(1)", "https://user:pw@contoh.id/", "https://contoh.id/#frag",
    "https://localhost/", "https://LOCALHOST./", "https://printer.local/", "https://db.internal/", "https://intranet/", "https://127.0.0.1/", "https://[::1]/", "https://169.254.169.254/latest/meta-data",
    "https://10.0.0.5/", "https://[::ffff:10.0.0.5]/", "https://2130706433/", `https://contoh.id/${"a".repeat(600)}`,
  ]) {
    assert.equal(validateWebhookUrl(bad).ok, false, String(bad));
  }
});

test("http polos hanya diizinkan di luar produksi", () => {
  const prev = process.env.NODE_ENV;
  try {
    (process.env as Record<string, string>).NODE_ENV = "production";
    assert.equal(validateWebhookUrl("http://contoh.id/hook").ok, false);
    assert.ok(validateWebhookUrl("https://contoh.id/hook").ok);
    (process.env as Record<string, string>).NODE_ENV = "development";
    assert.ok(validateWebhookUrl("http://contoh.id/hook").ok);
  } finally {
    (process.env as Record<string, string>).NODE_ENV = prev ?? "test";
  }
});

test("alamat IP desimal/heksa diperlakukan sebagai IP internal (URL menormalkannya)", () => {
  assert.equal(validateWebhookUrl("https://0x7f.0.0.1/").ok, false);
  assert.equal(validateWebhookUrl("https://0177.0.0.1/").ok, false);
});

test("guardedLookup menolak nama yang menunjuk ke loopback", async () => {
  const err = await new Promise<unknown>((resolve) => guardedLookup("localhost", {}, (e) => resolve(e)));
  assert.ok(err instanceof BlockedAddressError);
});

test("guardedLookup menolak bila SALAH SATU hasil DNS non-publik (all:true)", async () => {
  const err = await new Promise<unknown>((resolve) => guardedLookup("localhost", { all: true }, (e) => resolve(e)));
  assert.ok(err instanceof BlockedAddressError);
});

test("tanda tangan: cocok, tahan ubah isi/waktu/rahasia, dan menolak kedaluwarsa", () => {
  const secret = generateWebhookSecret();
  assert.match(secret, /^whsec_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(secret, generateWebhookSecret());
  const body = JSON.stringify({ id: "evt_1", type: "pengumuman.terbit", data: { announcementId: 7 } });
  const now = 1_800_000_000;
  const h = signatureHeader(secret, now, body);
  assert.ok(verifyWebhook(secret, h, body, now));
  assert.ok(verifyWebhook(secret, h, body, now + 299));
  assert.equal(verifyWebhook(secret, h, body, now + 301), false, "terlalu lama (replay)");
  assert.equal(verifyWebhook(secret, h, body + " ", now), false, "isi diubah");
  assert.equal(verifyWebhook(generateWebhookSecret(), h, body, now), false, "rahasia lain");
  assert.equal(verifyWebhook(secret, h.replace(/t=\d+/, `t=${now + 1}`), body, now), false, "stempel waktu diubah");
  for (const bad of ["", "v1=abc", `t=${now}`, `t=${now},v1=zz`, `t=${now},v1=${"0".repeat(64)}`]) assert.equal(verifyWebhook(secret, bad, body, now), false, bad);
  assert.equal(signWebhook("a", 1, "x"), signWebhook("a", 1, "x"));
});

test("kejadian: hanya yang dikenal, tanpa duplikat; kejadian uji tidak bisa dilanggan", () => {
  assert.deepEqual(parseEvents(["pengumuman.terbit", "pengumuman.terbit"]), { ok: true, events: ["pengumuman.terbit"] });
  assert.equal(parseEvents([]).ok, false);
  assert.equal(parseEvents("pengumuman.terbit").ok, false);
  assert.equal(parseEvents(["__proto__"]).ok, false);
  assert.equal(parseEvents([TEST_EVENT]).ok, false);
  assert.equal(isWebhookEvent("toString"), false);
  assert.deepEqual(readEvents(["pengumuman.terbit", "ngawur", 3]), ["pengumuman.terbit"]);
  assert.ok(ALL_WEBHOOK_EVENTS.length >= 5);
});

test("jadwal kirim ulang: menaik, berhingga, dan percobaan terakhir menyerah", () => {
  assert.equal(MAX_ATTEMPTS, BACKOFF_MINUTES.length + 1);
  for (let i = 1; i < BACKOFF_MINUTES.length; i++) assert.ok(BACKOFF_MINUTES[i] > BACKOFF_MINUTES[i - 1]);
  assert.ok(BACKOFF_MINUTES[BACKOFF_MINUTES.length - 1] <= 24 * 60);
});

test("postWebhook tidak menyentuh jaringan internal: server lokal tidak pernah menerima permintaan", async () => {
  const { postWebhook } = await import("../lib/webhooks/deliver.ts");
  let hits = 0;
  const server = http.createServer((_q, s) => {
    hits++;
    s.end("ok");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  try {
    for (const url of [`http://127.0.0.1:${port}/`, `http://localhost:${port}/`, `http://[::1]:${port}/`]) {
      const r = await postWebhook(url, {}, "{}");
      assert.equal(r.statusCode, null, url);
      assert.match(r.error ?? "", /internal/i, url);
    }
    assert.equal(hits, 0);
  } finally {
    server.close();
  }
});
