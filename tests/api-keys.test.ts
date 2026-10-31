import { test } from "node:test";
import assert from "node:assert/strict";
import { API_KEY_PATTERN, generateApiKey, hashApiKey, keyStatus } from "../lib/api-keys/keys.ts";
import { FixedWindowLimiter } from "../lib/api-keys/rate-limit.ts";
import { ALL_API_SCOPES, isApiScope, parseScopes, readScopes } from "../lib/api-keys/scopes.ts";

test("kunci: bentuk sah, acak, dan hash cocok", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.match(a.secret, API_KEY_PATTERN);
  assert.notEqual(a.secret, b.secret);
  assert.equal(a.prefix, a.secret.slice(0, 12));
  assert.equal(a.hash, hashApiKey(a.secret));
  assert.equal(a.hash.length, 64);
  assert.ok(!a.hash.includes(a.secret.slice(4)), "hash tidak memuat rahasia");
});

test("bentuk kunci menolak sampah dan kunci yang dipotong", () => {
  const { secret } = generateApiKey();
  for (const bad of ["", "kld_", secret.slice(0, -1), `${secret}x`, secret.replace("kld_", "xxx_"), `${secret} `, "Bearer " + secret]) {
    assert.ok(!API_KEY_PATTERN.test(bad), bad);
  }
});

test("scope: hanya yang dikenal, tanpa duplikat, minimal satu", () => {
  assert.deepEqual(parseScopes(["kependudukan:read", "kependudukan:read"]), { ok: true, scopes: ["kependudukan:read"] });
  assert.equal(parseScopes([]).ok, false);
  assert.equal(parseScopes("kependudukan:read").ok, false);
  assert.equal(parseScopes(["kependudukan:write"]).ok, false);
  assert.equal(parseScopes(["__proto__"]).ok, false);
  assert.equal(parseScopes(["constructor"]).ok, false);
  assert.ok(ALL_API_SCOPES.every((s) => s.endsWith(":read") || s.endsWith(":propose")), "hanya baca, atau mengusulkan (menunggu persetujuan manusia)");
  assert.ok(ALL_API_SCOPES.filter((s) => s.endsWith(":propose")).every((s) => s === "data-kustom:propose"), "tulis hanya lewat usulan data kustom");
  assert.ok(!isApiScope("toString"));
});

test("readScopes membuang nilai tak dikenal dari JSON tersimpan", () => {
  assert.deepEqual(readScopes(["kependudukan:read", "lama:hapus", 3]), ["kependudukan:read"]);
  assert.deepEqual(readScopes(null), []);
  assert.deepEqual(readScopes({}), []);
});

test("status kunci: aktif, kedaluwarsa, dicabut (dicabut menang)", () => {
  const now = new Date("2026-10-31T00:00:00Z");
  const past = new Date("2026-10-30T00:00:00Z");
  const future = new Date("2026-11-30T00:00:00Z");
  assert.equal(keyStatus({ revokedAt: null, expiresAt: null }, now), "active");
  assert.equal(keyStatus({ revokedAt: null, expiresAt: future }, now), "active");
  assert.equal(keyStatus({ revokedAt: null, expiresAt: past }, now), "expired");
  assert.equal(keyStatus({ revokedAt: past, expiresAt: future }, now), "revoked");
  assert.equal(keyStatus({ revokedAt: past, expiresAt: past }, now), "revoked");
});

test("pembatas laju: menolak setelah batas, pulih di jendela berikutnya, kunci terpisah", () => {
  const l = new FixedWindowLimiter(3, 1000);
  const t0 = 1_000_000;
  assert.deepEqual([l.check("a", t0).allowed, l.check("a", t0).allowed, l.check("a", t0).allowed], [true, true, true]);
  const blocked = l.check("a", t0 + 10);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(l.check("b", t0 + 10).allowed, true, "kunci lain tidak terpengaruh");
  assert.equal(l.check("a", t0 + 1000).allowed, true, "jendela baru");
  assert.equal(l.check("a", t0 + 1000).remaining, 1);
});
