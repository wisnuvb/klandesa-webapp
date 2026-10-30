import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MEDIA_IMAGE_BYTES,
  detectImageMime,
  isAllowedImageMime,
  isVillageArchiveKey,
  validateImageFile,
} from "../lib/digitalArchive/media.ts";

const bytes = (...b: number[]) => Uint8Array.from([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);

describe("isolasi key penyimpanan per desa", () => {
  const key = "villages/DS001/digital-archives/2026/11/Aset-Gambar/abc-foto.jpg";
  it("menerima key di folder arsip desa sendiri", () => {
    assert.equal(isVillageArchiveKey(key, "DS001"), true);
  });
  it("menolak key milik desa lain, termasuk kode yang awalannya sama", () => {
    assert.equal(isVillageArchiveKey(key, "DS002"), false);
    assert.equal(isVillageArchiveKey(key, "DS00"), false);
    assert.equal(isVillageArchiveKey("villages/DS0010/digital-archives/x.jpg", "DS001"), false);
  });
  it("menolak folder lain milik desa yang sama (mis. foto mobile) dan key kosong/aneh", () => {
    assert.equal(isVillageArchiveKey("villages/DS001/mobile-social/x.jpg", "DS001"), false);
    assert.equal(isVillageArchiveKey("villages/DS001/digital-archives/", "DS001"), false);
    assert.equal(isVillageArchiveKey("", "DS001"), false);
    assert.equal(isVillageArchiveKey(null, "DS001"), false);
    assert.equal(isVillageArchiveKey(undefined, "DS001"), false);
  });
  it("menolak path traversal, backslash, slash ganda, karakter kontrol", () => {
    assert.equal(isVillageArchiveKey("villages/DS001/digital-archives/../../DS002/digital-archives/x.jpg", "DS001"), false);
    assert.equal(isVillageArchiveKey("villages/DS001/digital-archives/a\\b.jpg", "DS001"), false);
    assert.equal(isVillageArchiveKey("villages/DS001/digital-archives//x.jpg", "DS001"), false);
    assert.equal(isVillageArchiveKey("villages/DS001/digital-archives/x\u0000.jpg", "DS001"), false);
  });
  it("menolak kode desa yang memuat slash", () => {
    assert.equal(isVillageArchiveKey("villages/a/b/digital-archives/x.jpg", "a/b"), false);
  });
});

describe("validasi berkas aset gambar", () => {
  it("hanya JPG/PNG/WebP/GIF; SVG ditolak", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/gif", "IMAGE/PNG; charset=x"]) {
      assert.equal(isAllowedImageMime(t), true, t);
    }
    for (const t of ["image/svg+xml", "text/html", "application/pdf", "", "image/bmp"]) {
      assert.equal(isAllowedImageMime(t), false, t);
    }
  });
  it("menolak ukuran 0 dan melebihi batas", () => {
    assert.equal(validateImageFile({ type: "image/png", size: 1024 }), null);
    assert.equal(validateImageFile({ type: "image/png", size: MAX_MEDIA_IMAGE_BYTES }), null);
    assert.match(validateImageFile({ type: "image/png", size: MAX_MEDIA_IMAGE_BYTES + 1 }) ?? "", /terlalu besar/);
    assert.match(validateImageFile({ type: "image/png", size: 0 }) ?? "", /kosong/);
    assert.match(validateImageFile({ type: "image/svg+xml", size: 10 }) ?? "", /Format/);
  });
});

describe("deteksi isi gambar (magic bytes)", () => {
  it("mengenali empat format yang diizinkan", () => {
    assert.equal(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
    assert.equal(detectImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
    assert.equal(detectImageMime(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), "image/gif");
    assert.equal(detectImageMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)), "image/webp");
  });
  it("menolak HTML/SVG/teks yang menyamar sebagai gambar, dan input terlalu pendek", () => {
    assert.equal(detectImageMime(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
    assert.equal(detectImageMime(new TextEncoder().encode("<html><script>alert(1)</script>")), null);
    assert.equal(detectImageMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45)), null); // WAV
    assert.equal(detectImageMime(Uint8Array.from([0xff, 0xd8])), null);
    assert.equal(detectImageMime(null), null);
  });
});
