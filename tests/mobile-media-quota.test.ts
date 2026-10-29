import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateMediaQuota, mediaQuotaFullMessage, MOBILE_MEDIA_QUOTA_BYTES, mobileMediaPrefix } from "../lib/mobile/media-quota.ts";

describe("kuota foto seluler per desa", () => {
  it("kuota 5 GB dan prefix mencakup semua folder unggahan seluler", () => {
    assert.equal(MOBILE_MEDIA_QUOTA_BYTES, 5 * 1024 ** 3);
    assert.equal(mobileMediaPrefix("karanganyar"), "villages/karanganyar/mobile-");
    for (const folder of ["mobile-social", "mobile-fees", "mobile-reports"]) {
      assert.ok(`villages/karanganyar/${folder}/2026/10/x.jpg`.startsWith(mobileMediaPrefix("karanganyar")), folder);
    }
  });
  it("unggahan diizinkan selama muat; foto yang tepat memenuhi kuota masih boleh", () => {
    assert.equal(evaluateMediaQuota(0, 2_500_000).ok, true);
    assert.equal(evaluateMediaQuota(MOBILE_MEDIA_QUOTA_BYTES - 1_000, 1_000).ok, true);
    assert.equal(evaluateMediaQuota(MOBILE_MEDIA_QUOTA_BYTES - 1_000, 1_001).ok, false);
    assert.equal(evaluateMediaQuota(MOBILE_MEDIA_QUOTA_BYTES, 1).ok, false);
  });
  it("pemakaian melebihi kuota tidak menghasilkan sisa negatif", () => {
    assert.equal(evaluateMediaQuota(MOBILE_MEDIA_QUOTA_BYTES + 999, 10).remainingBytes, 0);
    assert.equal(evaluateMediaQuota(-5, 10).remainingBytes, MOBILE_MEDIA_QUOTA_BYTES);
  });
  it("pesan untuk warga menunjuk ke perangkat desa, bukan ke Klandesa langsung", () => {
    assert.match(mediaQuotaFullMessage(), /perangkat desa/);
  });
});
