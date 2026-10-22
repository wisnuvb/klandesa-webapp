import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateActivationCode, hashActivationCode, lockoutMs, namesMatch, normalizeActivationCode,
  normalizePersonName, parseYmd, readCitizenSignupMode, sameCalendarDay, validatePassword, validateUsername,
} from "../lib/mobile/citizen.ts";

describe("username & password", () => {
  it("username valid dinormalkan huruf kecil", () => {
    assert.deepEqual(validateUsername("  Siti.Aminah_01 "), { ok: true, value: "siti.aminah_01" });
  });
  it("menolak username pendek, simbol, tanda baca berurutan, dan kata terlarang", () => {
    for (const bad of ["abc", "siti aminah", "siti..a", ".siti", "siti_", "admin", "a".repeat(31), 12, null]) {
      assert.equal(validateUsername(bad).ok, false, String(bad));
    }
  });
  it("password: min 8, bukan umum, tidak sama username/NIK", () => {
    assert.equal(validatePassword("pendek").ok, false);
    assert.equal(validatePassword("12345678").ok, false);
    assert.equal(validatePassword("aaaaaaaa").ok, false);
    assert.equal(validatePassword("siti.aminah", { username: "siti.aminah" }).ok, false);
    assert.equal(validatePassword("pw3201010101010001x", { nik: "3201010101010001" }).ok, false);
    assert.equal(validatePassword("kopi-hitam-7").ok, true);
    assert.equal(validatePassword("x".repeat(73)).ok, false);
  });
});

describe("pencocokan identitas", () => {
  it("nama ibu: abaikan huruf besar, tanda baca, gelar, dan aksen", () => {
    assert.equal(normalizePersonName("Hj. Siti  Aminah, S.Pd"), "siti aminah s pd");
    assert.equal(namesMatch("SITI AMINAH", "siti aminah"), true);
    assert.equal(namesMatch("Almh. Siti Aminah", "Siti Aminah"), true);
    assert.equal(namesMatch("Siti", "Sita"), false);
    assert.equal(namesMatch(null, "Siti"), false);
    assert.equal(namesMatch("", ""), false);
  });
  it("tanggal lahir: format ketat, tolak tanggal mustahil", () => {
    assert.deepEqual(parseYmd("1990-02-28"), { y: 1990, m: 2, d: 28 });
    assert.equal(parseYmd("1990-02-30"), null);
    assert.equal(parseYmd("28-02-1990"), null);
  });
  it("tanggal lahir di DB cocok baik tersimpan UTC maupun 00:00 WIB", () => {
    const ymd = { y: 1990, m: 2, d: 28 };
    assert.equal(sameCalendarDay(new Date("1990-02-28T00:00:00Z"), ymd), true);
    assert.equal(sameCalendarDay(new Date("1990-02-27T17:00:00Z"), ymd), true);
    assert.equal(sameCalendarDay(new Date("1990-03-01T00:00:00Z"), ymd), false);
  });
});

describe("kode aktivasi", () => {
  it("format XXXX-XXXX tanpa karakter ambigu dan unik", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const c = generateActivationCode();
      assert.match(c, /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
      seen.add(c);
    }
    assert.ok(seen.size > 190);
  });
  it("normalisasi: huruf besar, buang spasi dan strip; hash stabil", () => {
    assert.equal(normalizeActivationCode(" ab3d-k7mn "), "AB3DK7MN");
    assert.equal(hashActivationCode("AB3DK7MN"), hashActivationCode(normalizeActivationCode("ab3d k7mn")));
    assert.match(hashActivationCode("AB3DK7MN"), /^[0-9a-f]{64}$/);
  });
});

describe("kunci akun & mode pendaftaran desa", () => {
  it("kunci mulai di kegagalan ke-5, berlipat, maksimum 1 jam", () => {
    assert.equal(lockoutMs(4), 0);
    assert.equal(lockoutMs(5), 5 * 60_000);
    assert.equal(lockoutMs(6), 10 * 60_000);
    assert.equal(lockoutMs(20), 60 * 60_000);
  });
  it("mode default auto; approval/closed dibaca dari settings", () => {
    assert.equal(readCitizenSignupMode(null), "auto");
    assert.equal(readCitizenSignupMode({}), "auto");
    assert.equal(readCitizenSignupMode({ mobile: { citizenSignup: "approval" } }), "approval");
    assert.equal(readCitizenSignupMode({ mobile: { citizenSignup: "closed" } }), "closed");
    assert.equal(readCitizenSignupMode({ mobile: { citizenSignup: "weird" } }), "auto");
  });
});
