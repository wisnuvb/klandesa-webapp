import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeInternalPath } from "../lib/auth/safe-redirect";

describe("safeInternalPath (callbackUrl login)", () => {
  it("meneruskan path internal biasa beserta query dan hash", () => {
    assert.equal(safeInternalPath("/dashboard"), "/dashboard");
    assert.equal(safeInternalPath("/data-warga?page=2#atas"), "/data-warga?page=2#atas");
    assert.equal(safeInternalPath("/absensi/check-in?t=abc%20def"), "/absensi/check-in?t=abc%20def");
  });

  it("menolak URL absolut, protokol-relatif, dan trik backslash/kontrol yang dibaca browser sebagai host lain", () => {
    for (const bad of [
      "https://evil.com",
      "http://evil.com/x",
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "\\\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/\r/evil.com",
      "javascript:alert(1)",
      "evil.com",
      "",
      "   ",
    ]) {
      assert.equal(safeInternalPath(bad, "/x"), "/x", `harus ditolak: ${JSON.stringify(bad)}`);
    }
  });

  it("nilai kosong/null/bukan string memakai fallback", () => {
    assert.equal(safeInternalPath(null), "/dashboard");
    assert.equal(safeInternalPath(undefined, "/mitra"), "/mitra");
    assert.equal(safeInternalPath(42 as unknown as string, "/a"), "/a");
  });
});
