import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isOwnResidentPhotoUrl, parsePhotoPair, residentPhotoKey, residentPhotoPrefix } from "../lib/residents/photo.ts";
import { mobileMediaPrefix } from "../lib/mobile/media-quota.ts";

const CDN = "https://cdn.example.com/";
const url = (key: string) => `https://cdn.example.com/${key}`;
const mine = (n: string) => url(residentPhotoKey("desa-a", 7, n, "jpg"));

describe("foto profil warga", () => {
  it("disimpan di folder yang ikut terhitung kuota foto desa", () => {
    assert.ok(residentPhotoPrefix("desa-a", 7).startsWith(mobileMediaPrefix("desa-a")));
    assert.equal(residentPhotoKey("desa-a", 7, "abc", "webp"), "villages/desa-a/mobile-profile/7/abc.webp");
  });

  it("menerima URL foto milik warga itu sendiri (CDN dengan atau tanpa garis miring akhir)", () => {
    assert.equal(isOwnResidentPhotoUrl(mine("3f2a-11"), CDN, "desa-a", 7), true);
    assert.equal(isOwnResidentPhotoUrl(mine("3f2a-11"), "https://cdn.example.com", "desa-a", 7), true);
  });

  it("menolak foto warga lain, desa lain, URL luar, dan trik path", () => {
    const other = url(residentPhotoKey("desa-a", 8, "x", "jpg"));
    assert.equal(isOwnResidentPhotoUrl(other, CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(url(residentPhotoKey("desa-b", 7, "x", "jpg")), CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl("https://evil.example.com/pixel.jpg", CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(url("villages/desa-a/mobile-profile/7/../8/x.jpg"), CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(url("villages/desa-a/mobile-profile/70/x.jpg"), CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(mine("x") + "?track=1", CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(url("villages/desa-a/mobile-profile/7/x.svg"), CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(null, CDN, "desa-a", 7), false);
    assert.equal(isOwnResidentPhotoUrl(42, CDN, "desa-a", 7), false);
  });

  it("parsePhotoPair: kedua null berarti hapus; mengatur foto wajib sepasang dan milik sendiri", () => {
    assert.deepEqual(parsePhotoPair({ photo: null, photoThumb: null }, CDN, "desa-a", 7), { ok: true, photo: null, photoThumb: null });
    assert.deepEqual(parsePhotoPair(null, CDN, "desa-a", 7), { ok: true, photo: null, photoThumb: null });
    assert.deepEqual(parsePhotoPair({ photo: mine("a"), photoThumb: mine("b") }, CDN, "desa-a", 7), { ok: true, photo: mine("a"), photoThumb: mine("b") });
    assert.equal(parsePhotoPair({ photo: mine("a") }, CDN, "desa-a", 7).ok, false);
    assert.equal(parsePhotoPair({ photo: mine("a"), photoThumb: "https://evil.example.com/x.jpg" }, CDN, "desa-a", 7).ok, false);
  });
});
