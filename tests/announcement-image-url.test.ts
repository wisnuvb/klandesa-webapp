import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAnnouncementImageUrl } from "../lib/announcements/image-url.ts";

describe("parseAnnouncementImageUrl", () => {
  it("undefined = tidak diubah, null/kosong = hapus", () => {
    assert.deepEqual(parseAnnouncementImageUrl(undefined), { ok: true, value: undefined });
    assert.deepEqual(parseAnnouncementImageUrl(null), { ok: true, value: null });
    assert.deepEqual(parseAnnouncementImageUrl("  "), { ok: true, value: null });
  });
  it("menerima http(s) dan memangkas spasi", () => {
    assert.deepEqual(parseAnnouncementImageUrl(" https://cdn.example.com/a.jpg "), { ok: true, value: "https://cdn.example.com/a.jpg" });
  });
  it("menolak skema lain, bukan URL, bukan string, dan terlalu panjang", () => {
    for (const bad of ["javascript:alert(1)", "data:image/png;base64,AAAA", "/lokal.jpg", "bukan url", 42, "https://x.id/" + "a".repeat(2000)]) {
      assert.equal(parseAnnouncementImageUrl(bad).ok, false, String(bad).slice(0, 30));
    }
  });
});
