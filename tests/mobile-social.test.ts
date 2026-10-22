import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canEditPost, checkCommentContent, checkPostContent, cleanText, containsDisallowedLink, dailyPostLimit, extractHashtags,
  findBannedWord, initialPostStatus, parseCursor, parseYouTubeId, readCustomBannedWords, readSocialMode, splitYouTube,
} from "../lib/mobile/social-logic.ts";

describe("YouTube", () => {
  it("mengenali berbagai bentuk URL", () => {
    const id = "dQw4w9WgXcQ";
    for (const u of [
      `https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?t=10`, `https://m.youtube.com/watch?v=${id}&feature=share`,
      `https://www.youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://music.youtube.com/watch?v=${id}`,
    ]) assert.equal(parseYouTubeId(u), id, u);
  });
  it("menolak selain YouTube dan ID rusak", () => {
    assert.equal(parseYouTubeId("https://evil.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(parseYouTubeId("https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(parseYouTubeId("https://www.youtube.com/watch?v=short"), null);
    assert.equal(parseYouTubeId("javascript:alert(1)"), null);
    assert.equal(parseYouTubeId(null), null);
  });
  it("memisahkan tautan YouTube dari teks", () => {
    const r = splitYouTube("Lihat kegiatan kemarin https://youtu.be/dQw4w9WgXcQ mantap");
    assert.equal(r.youtubeId, "dQw4w9WgXcQ");
    assert.equal(r.text, "Lihat kegiatan kemarin  mantap");
    assert.equal(splitYouTube("tanpa tautan").youtubeId, null);
  });
});

describe("tautan & kata terlarang", () => {
  it("tautan selain YouTube ditolak", () => {
    for (const t of ["klik https://x.test/a", "www.promo.com", "hubungi wa.me/628123", "kunjungi tokoku.shop", "bit.ly/abc"]) assert.equal(containsDisallowedLink(t), true, t);
    for (const t of ["Gotong royong hari Minggu", "Pukul 07.30 di balai desa", "harga 25.000 saja"]) assert.equal(containsDisallowedLink(t), false, t);
  });
  it("filter kata terlarang tahan variasi sederhana", () => {
    assert.equal(findBannedWord("Daftar sl0t g4cor sekarang"), "slot gacor");
    assert.equal(findBannedWord("ada TOGEL malam ini"), "togel");
    assert.equal(findBannedWord("Pinjol cepat cair"), "pinjol");
    assert.equal(findBannedWord("Kerja bakti membersihkan selokan"), null);
    assert.equal(findBannedWord("mari kita bergotong royong", ["gotong"]), null, "tidak cocok sebagian kata");
    assert.equal(findBannedWord("dilarang sampah liar", ["sampah liar"]), "sampah liar");
  });
  it("validasi postingan & komentar", () => {
    assert.equal(checkPostContent("", { hasMedia: false, hasVideo: false }).ok, false);
    assert.equal(checkPostContent("", { hasMedia: true, hasVideo: false }).ok, true);
    assert.equal(checkPostContent("x".repeat(1001), { hasMedia: false, hasVideo: false }).ok, false);
    assert.equal(checkPostContent("kunjungi www.a.com", { hasMedia: false, hasVideo: false }).ok, false);
    assert.equal(checkCommentContent("Mantap pak").ok, true);
    assert.equal(checkCommentContent("").ok, false);
    assert.equal(checkCommentContent("x".repeat(501)).ok, false);
  });
});

describe("aturan lain", () => {
  it("hashtag unik, maks 5, huruf kecil", () => {
    assert.deepEqual(extractHashtags("#GotongRoyong hari ini #gotongroyong #RT03 a#bukan"), ["gotongroyong", "rt03"]);
    assert.equal(extractHashtags("#a #b1 #c2 #d3 #e4 #f5 #g6").length, 5);
  });
  it("batas harian akun baru vs lama", () => {
    const now = new Date("2026-10-22T00:00:00Z");
    assert.equal(dailyPostLimit(new Date("2026-10-20T00:00:00Z"), now), 3);
    assert.equal(dailyPostLimit(new Date("2026-09-01T00:00:00Z"), now), 10);
  });
  it("jendela edit 15 menit", () => {
    const t = new Date("2026-10-22T10:00:00Z").getTime();
    assert.equal(canEditPost(new Date(t), t + 14 * 60_000), true);
    assert.equal(canEditPost(new Date(t), t + 16 * 60_000), false);
  });
  it("mode desa, status awal, cursor, pembersihan teks", () => {
    assert.equal(readSocialMode(undefined), "off");
    assert.equal(readSocialMode({ mobile: { social: { mode: "pre" } } }), "pre");
    assert.equal(readSocialMode({ mobile: { social: { mode: "x" } } }), "off");
    assert.deepEqual(readCustomBannedWords({ mobile: { social: { bannedWords: ["Kata", "ab", 5] } } }), ["kata"]);
    assert.equal(initialPostStatus("pre"), "PENDING");
    assert.equal(initialPostStatus("post"), "PUBLISHED");
    assert.equal(parseCursor("123"), 123n);
    assert.equal(parseCursor("abc"), null);
    assert.equal(parseCursor("1".repeat(30)), null);
    assert.equal(cleanText("a\u0000b\r\n\n\n\n\nc  "), "ab\n\nc");
  });
});

import { displayName, youtubeThumb } from "../lib/mobile/social-logic.ts";
describe("nama tampilan", () => {
  it("ramah privasi", () => {
    assert.equal(displayName("SITI AMINAH PUTRI"), "Siti A.");
    assert.equal(displayName("budi"), "Budi");
    assert.equal(displayName("   "), "Warga");
    assert.equal(youtubeThumb("dQw4w9WgXcQ"), "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });
});
