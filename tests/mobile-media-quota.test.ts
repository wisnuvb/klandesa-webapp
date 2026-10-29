import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mediaQuotaFullMessage, MOBILE_MEDIA_QUOTA_BYTES, mobileMediaPrefix, reserveCeiling } from "../lib/mobile/media-quota.ts";

describe("kuota foto seluler per desa", () => {
  it("kuota 5 GB dan prefix mencakup semua folder unggahan seluler", () => {
    assert.equal(MOBILE_MEDIA_QUOTA_BYTES, 5 * 1024 ** 3);
    assert.equal(mobileMediaPrefix("karanganyar"), "villages/karanganyar/mobile-");
    for (const folder of ["mobile-social", "mobile-fees", "mobile-reports"]) {
      assert.ok(`villages/karanganyar/${folder}/2026/10/x.jpg`.startsWith(mobileMediaPrefix("karanganyar")), folder);
    }
  });
  it("batas pemesanan: foto yang tepat memenuhi kuota masih boleh, satu byte lebih tidak", () => {
    const fits = (used: number, incoming: number) => used <= reserveCeiling(incoming);
    assert.equal(fits(0, 2_500_000), true);
    assert.equal(fits(MOBILE_MEDIA_QUOTA_BYTES - 1_000, 1_000), true);
    assert.equal(fits(MOBILE_MEDIA_QUOTA_BYTES - 1_000, 1_001), false);
    assert.equal(fits(MOBILE_MEDIA_QUOTA_BYTES, 1), false);
  });
  it("satu unggahan yang sendirian melewati batas menghasilkan ambang negatif (selalu ditolak)", () => {
    assert.ok(reserveCeiling(MOBILE_MEDIA_QUOTA_BYTES + 1) < 0);
    assert.equal(reserveCeiling(100, 1_000), 900);
  });
  it("pesan untuk warga menunjuk ke perangkat desa, bukan ke Klandesa langsung", () => {
    assert.match(mediaQuotaFullMessage(), /perangkat desa/);
  });
});
