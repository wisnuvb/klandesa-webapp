import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GUIDE_CATALOG } from "../lib/guides/index.ts";
import { validateGuide } from "../lib/guides/types.ts";

describe("katalog panduan halaman", () => {
  it("setiap panduan lolos validasi struktur", () => {
    for (const e of GUIDE_CATALOG) assert.deepEqual(validateGuide(e.guide), [], e.guide.id);
  });

  it("id panduan unik dan setiap entri punya rute serta ringkasan", () => {
    const ids = GUIDE_CATALOG.map((e) => e.guide.id);
    assert.equal(new Set(ids).size, ids.length, `id ganda: ${ids.join(",")}`);
    for (const e of GUIDE_CATALOG) {
      assert.match(e.href, /^\/[a-z0-9-]+$/, e.guide.id);
      assert.ok(e.summary.trim().length >= 20, e.guide.id);
    }
  });

  it("tiap rute hanya muncul sekali agar kartu di /bantuan tidak ganda", () => {
    const hrefs = GUIDE_CATALOG.map((e) => e.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });
});
