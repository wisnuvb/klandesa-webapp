import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NextRequest } from "next/server";
import { parseListQuery } from "../lib/pkk/list-query.ts";

const q = (qs: string, opts?: { pageSize?: number; maxPageSize?: number }) => parseListQuery(new NextRequest(`http://localhost/api/pkk/x?${qs}`), opts);

describe("parseListQuery (PKK)", () => {
  it("bawaan membatasi pageSize di 100", () => {
    assert.equal(q("pageSize=500").pageSize, 100);
    assert.equal(q("pageSize=100000").pageSize, 100);
  });
  it("rute dropdown boleh meminta sampai 500 (tidak terpotong diam-diam)", () => {
    assert.equal(q("pageSize=500", { maxPageSize: 500 }).pageSize, 500);
    assert.equal(q("pageSize=100000", { maxPageSize: 500 }).pageSize, 500);
  });
  it("nilai tak valid tetap aman", () => {
    for (const qs of ["pageSize=abc", "pageSize=-1", "page=0", "page=abc"]) {
      const r = q(qs, { maxPageSize: 500 });
      assert.ok(r.pageSize >= 1 && r.pageSize <= 500 && r.page >= 1 && r.skip >= 0, qs);
    }
  });
});
