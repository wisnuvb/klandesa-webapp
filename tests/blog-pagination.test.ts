import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLOG_PAGE_SIZE, pageHref, pageItems, parsePageParam, totalPagesOf } from "../lib/blog/pagination.ts";

describe("paginasi blog", () => {
  it("totalPagesOf: minimal 1, pembulatan ke atas, ukuran halaman 12", () => {
    assert.equal(BLOG_PAGE_SIZE, 12);
    assert.equal(totalPagesOf(0), 1);
    assert.equal(totalPagesOf(-3), 1);
    assert.equal(totalPagesOf(Number.NaN), 1);
    assert.equal(totalPagesOf(12), 1);
    assert.equal(totalPagesOf(13), 2);
    assert.equal(totalPagesOf(25), 3);
    assert.equal(totalPagesOf(10, 5), 2);
  });

  it("parsePageParam: tanpa parameter = 1; hanya bilangan bulat positif tanpa nol di depan", () => {
    assert.equal(parsePageParam(undefined), 1);
    assert.equal(parsePageParam("1"), 1);
    assert.equal(parsePageParam("25"), 25);
    for (const bad of ["0", "-1", "01", "1.5", "abc", "", " 2", "2 ", "1e3", "9999999"]) {
      assert.equal(parsePageParam(bad), null, JSON.stringify(bad));
    }
    assert.equal(parsePageParam(["1", "2"]), null);
  });

  it("pageHref: halaman 1 = jalur dasar tanpa query", () => {
    assert.equal(pageHref("/blog", 1), "/blog");
    assert.equal(pageHref("/blog", 0), "/blog");
    assert.equal(pageHref("/blog", 3), "/blog?page=3");
    assert.equal(pageHref("/blog/topik/apbdes", 2), "/blog/topik/apbdes?page=2");
  });

  it("pageItems: semua angka bila sedikit, tanpa elipsis untuk celah satu halaman", () => {
    assert.deepEqual(pageItems(1, 1), [1]);
    assert.deepEqual(pageItems(1, 0), [1]);
    assert.deepEqual(pageItems(2, 4), [1, 2, 3, 4]);
    assert.deepEqual(pageItems(1, 4), [1, 2, 3, 4]); // halaman 3 mengisi celah satu halaman
    assert.deepEqual(pageItems(3, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(pageItems(1, 5), [1, 2, "ellipsis", 5]); // celah dua halaman (3, 4) → elipsis
  });

  it("pageItems: elipsis hanya untuk lompatan ≥2 halaman, awal dan akhir selalu ada", () => {
    assert.deepEqual(pageItems(1, 10), [1, 2, "ellipsis", 10]);
    assert.deepEqual(pageItems(5, 10), [1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    assert.deepEqual(pageItems(10, 10), [1, "ellipsis", 9, 10]);
    assert.deepEqual(pageItems(4, 10), [1, 2, 3, 4, 5, "ellipsis", 10]);
    assert.deepEqual(pageItems(7, 10), [1, "ellipsis", 6, 7, 8, 9, 10]);
  });

  it("pageItems: halaman aktif di luar rentang dijepit; siblings dapat diubah", () => {
    assert.deepEqual(pageItems(99, 10), pageItems(10, 10));
    assert.deepEqual(pageItems(-4, 10), pageItems(1, 10));
    assert.deepEqual(pageItems(5, 10, 2), [1, 2, 3, 4, 5, 6, 7, "ellipsis", 10]);
  });
});
