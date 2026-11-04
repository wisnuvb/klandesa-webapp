import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_PAGE, parsePageParams } from "../lib/http/pagination.ts";

const p = (qs: string, opts = { defaultPageSize: 10, maxPageSize: 100 }) => parsePageParams(new URLSearchParams(qs), opts);

describe("parsePageParams", () => {
  it("bawaan bila kosong", () => {
    assert.deepEqual(p(""), { page: 1, pageSize: 10, skip: 0 });
  });
  it("menghitung skip dari page & pageSize", () => {
    assert.deepEqual(p("page=3&pageSize=25"), { page: 3, pageSize: 25, skip: 50 });
  });
  it("pageSize dibatasi maksimum (mencegah menarik seluruh tabel)", () => {
    assert.equal(p("pageSize=100000").pageSize, 100);
    assert.equal(p("pageSize=101").pageSize, 100);
    assert.equal(p("pageSize=200", { defaultPageSize: 10, maxPageSize: 200 }).pageSize, 200);
    assert.equal(p("pageSize=Infinity").pageSize, 10);
  });
  it("nilai tak valid jatuh ke bawaan atau batas bawah, tidak pernah NaN/negatif", () => {
    for (const qs of ["pageSize=abc", "pageSize=", "pageSize=NaN", "page=abc", "page=-5", "page=0", "pageSize=0", "pageSize=-10"]) {
      const r = p(qs);
      assert.ok(Number.isInteger(r.page) && r.page >= 1, qs);
      assert.ok(Number.isInteger(r.pageSize) && r.pageSize >= 1 && r.pageSize <= 100, qs);
      assert.ok(Number.isInteger(r.skip) && r.skip >= 0, qs);
    }
    assert.equal(p("pageSize=-10").pageSize, 1);
    assert.equal(p("pageSize=abc").pageSize, 10);
  });
  it("desimal dibulatkan ke bawah", () => {
    assert.deepEqual(p("page=2.9&pageSize=7.8"), { page: 2, pageSize: 7, skip: 7 });
  });
  it("page absurd dibatasi agar skip tidak meluap", () => {
    const r = p("page=999999999999999999999");
    assert.equal(r.page, MAX_PAGE);
    assert.ok(Number.isSafeInteger(r.skip));
  });
});
