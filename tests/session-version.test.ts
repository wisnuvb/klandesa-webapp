import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSessionRevoked, SESSION_REVOKED_MESSAGE } from "../lib/session-version";
import { jwtPayloadToSession } from "../lib/session-from-token";

describe("versi sesi web (murni)", () => {
  it("sama = sah; lebih kecil atau lebih besar = dicabut; kosong dianggap 0", () => {
    assert.equal(isSessionRevoked(0, 0), false);
    assert.equal(isSessionRevoked(undefined, 0), false, "cookie lama sebelum fitur ini");
    assert.equal(isSessionRevoked(3, 3), false);
    assert.equal(isSessionRevoked(0, 1), true);
    assert.equal(isSessionRevoked(undefined, 1), true);
    assert.equal(isSessionRevoked(2, 1), true);
  });

  it("nilai aneh pada klaim tidak melewati pemeriksaan (string, negatif, pecahan, null, objek)", () => {
    for (const bad of ["1", "0", -1, 1.5, null, {}, [], NaN, Infinity]) {
      assert.equal(isSessionRevoked(bad, 1), true, String(bad));
      assert.equal(isSessionRevoked(bad, 0), false, `${String(bad)} dianggap 0`);
    }
  });

  it("jalur pembacaan sesi lewat getToken membawa sv (kalau tidak, login baru setelah ganti sandi akan dianggap versi 0 dan terkunci)", () => {
    assert.equal(jwtPayloadToSession({ id: "5", sv: 4 })?.user.sessionVersion, 4);
    assert.equal(jwtPayloadToSession({ id: "5" })?.user.sessionVersion, undefined);
    assert.equal(jwtPayloadToSession({ id: "5", sv: "4" as never })?.user.sessionVersion, undefined);
  });

  it("pesan untuk pengguna jelas", () => {
    assert.match(SESSION_REVOKED_MESSAGE, /kata sandi/);
  });
});
