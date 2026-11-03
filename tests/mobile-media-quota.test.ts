import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  archiveQuotaFullMessage,
  chargedCeiling,
  isChargedFolder,
  mediaQuotaFullMessage,
  MOBILE_MEDIA_QUOTA_BYTES,
  mobileFolderOfKey,
  mobileMediaPrefix,
  reserveCeiling,
} from "../lib/mobile/media-quota.ts";

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

  it("hanya foto Warga (media sosial) yang gratis; folder seluler lain memakai kuota Arsip Digital", () => {
    assert.equal(isChargedFolder("mobile-social"), false);
    for (const f of ["mobile-profile", "mobile-reports", "mobile-fees", "mobile-ukm"]) assert.equal(isChargedFolder(f), true, f);
    assert.equal(isChargedFolder("digital-archive"), false); // bukan folder seluler: dihitung lewat DigitalArchive
  });
  it("folder dibaca dari kunci objek milik desa itu saja", () => {
    assert.equal(mobileFolderOfKey("villages/abc/mobile-profile/12/x.jpg", "abc"), "mobile-profile");
    assert.equal(mobileFolderOfKey("villages/abc/mobile-social/2026/11/x.jpg", "abc"), "mobile-social");
    assert.equal(mobileFolderOfKey("villages/xyz/mobile-profile/12/x.jpg", "abc"), null);
    assert.equal(mobileFolderOfKey("villages/abc/archives/x.pdf", "abc"), null);
  });
  it("batas pemesanan kuota arsip bersama: berkas arsip + foto berbayar + foto baru tidak boleh melewati batas", () => {
    const GB = 1024 ** 3;
    const fits = (charged: number, incoming: number, archive: number, limit: number) => charged <= chargedCeiling(incoming, limit, archive);
    assert.equal(fits(0, 300_000, 5 * GB - 300_000, 5 * GB), true);
    assert.equal(fits(0, 300_001, 5 * GB - 300_000, 5 * GB), false);
    assert.equal(fits(1 * GB, 1_000, 4 * GB - 1_000, 5 * GB), true);
    assert.equal(fits(1 * GB + 1, 1_000, 4 * GB - 1_000, 5 * GB), false);
    assert.ok(chargedCeiling(1, 5 * GB, 5 * GB) < 0);
  });
  it("pesan kuota arsip penuh menyebut Arsip Digital dan perangkat desa", () => {
    assert.match(archiveQuotaFullMessage(), /Arsip Digital/);
    assert.match(archiveQuotaFullMessage(), /perangkat desa/);
  });
});
