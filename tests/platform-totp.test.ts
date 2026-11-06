/** TOTP/2FA admin platform: vektor uji RFC 6238, base32, enkripsi at-rest, kode pemulihan, validasi, penyamaran audit. Murni (tanpa DB). */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  base32Decode,
  base32Encode,
  decryptTotpSecret,
  deriveTotpKey,
  encryptTotpSecret,
  formatSecretForManualEntry,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  hotp,
  matchRecoveryHash,
  normalizeRecoveryCode,
  normalizeTotpCode,
  otpauthUri,
  parseRecoveryHashes,
  totpAt,
  totpStep,
  verifyTotp,
} from "../lib/platform/totp";
import { parseInviteInput, parsePositiveInt, parseReason, isAdminAction } from "../lib/platform/admins/validation";
import { actionLabel, redactMetadata } from "../lib/platform/admins/audit-labels";

// Lampiran B RFC 6238 (rahasia ASCII "12345678901234567890", SHA-1, 8 digit)
const RFC_SECRET = Buffer.from("12345678901234567890", "ascii");
const RFC_VECTORS: Array<[number, string]> = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("TOTP RFC 6238", () => {
  for (const [t, code] of RFC_VECTORS) {
    it(`vektor resmi T=${t} -> ${code}`, () => {
      assert.equal(totpAt(RFC_SECRET, t * 1000, 8), code);
    });
  }

  it("6 digit = 6 digit terakhir dari kode 8 digit (pemotongan dinamis sama)", () => {
    assert.equal(totpAt(RFC_SECRET, 59_000), "287082");
    assert.equal(totpAt(RFC_SECRET, 1111111109_000), "081804");
  });

  it("vektor HOTP RFC 4226 (counter 0..3)", () => {
    assert.deepEqual([0, 1, 2, 3].map((c) => hotp(RFC_SECRET, c)), ["755224", "287082", "359152", "969429"]);
  });

  it("toleransi ±1 langkah diterima, ±2 ditolak; mengembalikan langkah yang cocok", () => {
    const now = 1_700_000_000_000;
    const cur = totpStep(now);
    for (const d of [-1, 0, 1]) {
      const code = hotp(RFC_SECRET, cur + d);
      assert.deepEqual(verifyTotp(RFC_SECRET, code, now), { step: cur + d });
    }
    for (const d of [-2, 2]) assert.equal(verifyTotp(RFC_SECRET, hotp(RFC_SECRET, cur + d), now), null);
  });

  it("input aneh ditolak; spasi/strip diabaikan", () => {
    const now = 1_700_000_000_000;
    const code = totpAt(RFC_SECRET, now);
    assert.ok(verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, now));
    for (const bad of ["", "12345", "1234567", "abcdef", null, undefined, 123456, "12345a", { a: 1 }]) assert.equal(verifyTotp(RFC_SECRET, bad, now), null);
    assert.equal(normalizeTotpCode("123 456"), "123456");
    assert.equal(normalizeTotpCode("12-34-56"), "123456");
  });

  it("kode yang salah ditolak", () => {
    const now = 1_700_000_000_000;
    const good = totpAt(RFC_SECRET, now);
    const wrong = String((Number(good) + 1) % 1_000_000).padStart(6, "0");
    // wrong bisa kebetulan sama dengan kode langkah tetangga; pilih yang pasti bukan salah satu dari tiga kandidat
    const cands = new Set([-1, 0, 1].map((d) => hotp(RFC_SECRET, totpStep(now) + d)));
    let w = wrong;
    while (cands.has(w)) w = String((Number(w) + 1) % 1_000_000).padStart(6, "0");
    assert.equal(verifyTotp(RFC_SECRET, w, now), null);
  });
});

describe("base32 & URI", () => {
  it("vektor RFC 4648", () => {
    assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
    assert.equal(base32Decode("MZXW6YTBOI").toString(), "foobar");
    assert.equal(base32Decode("mzxw 6ytb-oi").toString(), "foobar");
  });
  it("rahasia acak 32 karakter base32, bolak-balik 20 byte, tidak berulang", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    assert.match(a, /^[A-Z2-7]{32}$/);
    assert.notEqual(a, b);
    assert.equal(base32Decode(a).length, 20);
    assert.equal(base32Encode(base32Decode(a)), a);
  });
  it("karakter tidak valid ditolak", () => {
    assert.throws(() => base32Decode("ABC1"));
  });
  it("URI otpauth lengkap dan di-escape", () => {
    const u = otpauthUri({ secretBase32: "ABCDEFGH", accountEmail: "a+b@uji.test" });
    assert.ok(u.startsWith("otpauth://totp/Klandesa:a%2Bb%40uji.test?"));
    const q = new URL(u).searchParams;
    assert.equal(q.get("secret"), "ABCDEFGH");
    assert.equal(q.get("issuer"), "Klandesa");
    assert.equal(q.get("digits"), "6");
    assert.equal(q.get("period"), "30");
    assert.equal(q.get("algorithm"), "SHA1");
    assert.equal(formatSecretForManualEntry("ABCDEFGHIJKL"), "ABCD EFGH IJKL");
  });
});

describe("enkripsi rahasia at-rest (AES-256-GCM)", () => {
  const key = deriveTotpKey("rahasia-server-uji-aaaaaaaaaaaaaaaaaaaaaaaa");
  const secret = generateTotpSecret();

  it("bolak-balik; keluaran berversi, muat di VarChar(255), acak per panggilan, tidak memuat teks asli", () => {
    const a = encryptTotpSecret(secret, "platform-user:1", key);
    const b = encryptTotpSecret(secret, "platform-user:1", key);
    assert.notEqual(a, b);
    assert.ok(a.startsWith("v1."));
    assert.ok(a.length < 255);
    assert.ok(!a.includes(secret));
    assert.equal(decryptTotpSecret(a, "platform-user:1", key), secret);
  });
  it("kunci salah, aad salah (akun lain), data diubah, atau format salah -> null", () => {
    const enc = encryptTotpSecret(secret, "platform-user:1", key);
    assert.equal(decryptTotpSecret(enc, "platform-user:1", deriveTotpKey("rahasia-server-LAIN-bbbbbbbbbbbbbbbbbbbbbbbb")), null);
    assert.equal(decryptTotpSecret(enc, "platform-user:2", key), null);
    const tampered = `${enc.slice(0, -2)}${enc.endsWith("AA") ? "BB" : "AA"}`;
    assert.equal(decryptTotpSecret(tampered, "platform-user:1", key), null);
    for (const bad of [null, undefined, "", "v2.abc", "v1.", "v1.AAAA", "ngawur"]) assert.equal(decryptTotpSecret(bad, "platform-user:1", key), null);
  });
  it("kunci turunan deterministik, 32 byte, beda untuk rahasia berbeda", () => {
    assert.equal(deriveTotpKey("x".repeat(40)).length, 32);
    assert.deepEqual(deriveTotpKey("x".repeat(40)), deriveTotpKey("x".repeat(40)));
    assert.notDeepEqual(deriveTotpKey("x".repeat(40)), deriveTotpKey("y".repeat(40)));
  });
});

describe("kode pemulihan", () => {
  it("10 kode unik berformat 4-4-4-4; hash SHA-256 heksa; tidak ada karakter rancu", () => {
    const { codes, hashes } = generateRecoveryCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10);
    for (const c of codes) assert.match(c, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
    assert.equal(hashes.length, 10);
    for (const h of hashes) assert.match(h, /^[a-f0-9]{64}$/);
    assert.equal(hashes[0], hashRecoveryCode(normalizeRecoveryCode(codes[0]!)!));
    assert.ok(hashes.every((h) => !codes.join("").includes(h)));
  });
  it("cocok tanpa peduli huruf besar/pemisah; ditolak bila format/isi salah; sekali pakai dijamin pemanggil (hash dibuang dari daftar)", () => {
    const { codes, hashes } = generateRecoveryCodes();
    const c = codes[3]!;
    const loose = c.toLowerCase().replace(/-/g, " ");
    const m = matchRecoveryHash(hashes, loose);
    assert.equal(m, hashes[3]);
    const rest = hashes.filter((h) => h !== m);
    assert.equal(matchRecoveryHash(rest, c), null, "kode yang sudah dipakai tidak cocok lagi");
    for (const bad of ["", "abcd", "AAAA-AAAA-AAAA-AAAA", "0000-0000-0000-0000", null, 5, "IIII-OOOO-1111-0000"]) assert.equal(matchRecoveryHash(hashes, bad), null);
  });
  it("parseRecoveryHashes hanya menerima array hash sah", () => {
    assert.deepEqual(parseRecoveryHashes(null), []);
    assert.deepEqual(parseRecoveryHashes({ a: 1 }), []);
    assert.deepEqual(parseRecoveryHashes(["x", 5, "a".repeat(64)]), ["a".repeat(64)]);
  });
});

describe("validasi kelola admin", () => {
  it("alasan 5-300 karakter", () => {
    assert.equal(parseReason("   "), null);
    assert.equal(parseReason("abcd"), null);
    assert.equal(parseReason(" abcde "), "abcde");
    assert.equal(parseReason("x".repeat(301)), null);
    assert.equal(parseReason(12345), null);
  });
  it("undangan: email dinormalkan, nama divalidasi", () => {
    assert.deepEqual(parseInviteInput({ email: "  Budi@Uji.Test ", name: "  Budi   Santoso " }), { ok: true, email: "budi@uji.test", name: "Budi Santoso" });
    assert.equal(parseInviteInput({ email: "bukan-email", name: "Budi" }).ok, false);
    assert.equal(parseInviteInput({ email: "a@b.id", name: "B" }).ok, false);
    assert.equal(parseInviteInput({ email: "a@b.id", name: "<script>" }).ok, false);
    assert.equal(parseInviteInput(null).ok, false);
  });
  it("id & aksi", () => {
    assert.equal(parsePositiveInt("12"), 12);
    for (const bad of ["0", "-1", "1.5", "abc", "", "99999999999", null, undefined]) assert.equal(parsePositiveInt(bad), null);
    assert.equal(isAdminAction("reset_2fa"), true);
    assert.equal(isAdminAction("delete"), false);
  });
});

describe("label & penyamaran jejak audit", () => {
  it("label Indonesia untuk aksi dikenal, awalan untuk lainnya, apa adanya bila asing", () => {
    assert.equal(actionLabel("admin.2fa_enable"), "Aktifkan 2FA");
    assert.equal(actionLabel("partner.approve_application"), "Mitra · approve application");
    assert.equal(actionLabel("zzz.foo"), "zzz.foo");
  });
  it("kunci rahasia disamarkan di seluruh kedalaman; nilai biasa utuh", () => {
    const out = redactMetadata({ reason: "uji", password: "x", nested: { resetLink: "https://a", token: "t", ok: 1, list: [{ secret: "s", id_number: "3201" }] }, recoveryCodes: ["A"] }) as Record<string, unknown>;
    assert.equal(out.reason, "uji");
    assert.equal(out.password, "[disamarkan]");
    assert.equal(out.recoveryCodes, "[disamarkan]");
    const n = out.nested as { resetLink: string; token: string; ok: number; list: Array<Record<string, string>> };
    assert.equal(n.resetLink, "[disamarkan]");
    assert.equal(n.token, "[disamarkan]");
    assert.equal(n.ok, 1);
    assert.deepEqual(n.list[0], { secret: "[disamarkan]", id_number: "[disamarkan]" });
    assert.equal(redactMetadata(null), null);
  });
});
