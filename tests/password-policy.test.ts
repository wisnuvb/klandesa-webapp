import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PASSWORD_HINT, validateNewPassword } from "../lib/auth/password-policy";
import { validateNewPassword as fromAccounts } from "../lib/rbac/accounts";

describe("aturan kata sandi baru", () => {
  it("menolak terlalu pendek, tanpa angka, tanpa huruf, terlalu panjang, bukan string", () => {
    assert.match(validateNewPassword("abc12")!, /minimal 8/);
    assert.match(validateNewPassword("abcdefgh")!, /huruf dan angka/);
    assert.match(validateNewPassword("12345678")!, /huruf dan angka/);
    assert.match(validateNewPassword("a1".repeat(65))!, /terlalu panjang/);
    assert.ok(validateNewPassword(undefined));
  });
  it("menerima huruf+angka ≥8", () => {
    assert.equal(validateNewPassword("sandi1234"), null);
  });
  it("API (accounts) dan form memakai fungsi yang sama; petunjuk menyebut aturan yang sama", () => {
    assert.equal(fromAccounts, validateNewPassword);
    assert.match(PASSWORD_HINT, /8 karakter/);
    assert.match(PASSWORD_HINT, /huruf dan angka/);
  });
});
