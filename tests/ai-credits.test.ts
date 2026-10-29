import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AI_CREDIT_MIN_PRICE,
  AI_CREDIT_PACKAGES,
  AI_FREE_CREDITS,
  aiCreditPriceForCredits,
  findAiCreditPackageById,
} from "../lib/ai/credit-packages.ts";

describe("paket kredit AI", () => {
  it("harga dicari dari paket resmi, bukan dihitung dari jumlah kredit kiriman klien", () => {
    assert.equal(aiCreditPriceForCredits(300), 15_000);
    assert.equal(aiCreditPriceForCredits(10_000), 300_000);
    assert.equal(aiCreditPriceForCredits(1), null);
    assert.equal(aiCreditPriceForCredits(99_999_999), null);
    assert.equal(aiCreditPriceForCredits(Number.NaN), null);
  });
  it("makin besar paket makin murah per kredit", () => {
    const perCredit = AI_CREDIT_PACKAGES.map((p) => p.price / p.credits);
    for (let i = 1; i < perCredit.length; i++) assert.ok(perCredit[i] < perCredit[i - 1]);
    assert.equal(perCredit[0], 50);
    assert.equal(perCredit.at(-1), 30);
  });
  it("id paket unik dan bisa dicari", () => {
    const ids = AI_CREDIT_PACKAGES.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(findAiCreditPackageById("pkg2")?.credits, 1000);
    assert.equal(findAiCreditPackageById("nope"), undefined);
  });
  it("harga termurah dan kredit gratis", () => {
    assert.equal(AI_CREDIT_MIN_PRICE, 15_000);
    assert.equal(AI_FREE_CREDITS, 1000);
  });
});
