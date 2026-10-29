import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { closingBonusFor, subscriptionShareFor } from "../lib/partner/commission-math.ts";

describe("bonus closing mitra", () => {
  it("persentase dihitung dari harga paket yang berlaku, jadi ikut berubah saat harga berubah", () => {
    const rule = { closingBonusPercent: 10, closingBonusAmount: 500_000 };
    assert.equal(closingBonusFor(rule, 3_500_000), 350_000);
    assert.equal(closingBonusFor(rule, 4_000_000), 400_000);
  });
  it("persentase mengalahkan nominal tetap; tanpa persentase memakai nominal tetap", () => {
    assert.equal(closingBonusFor({ closingBonusPercent: 5, closingBonusAmount: 500_000 }, 3_500_000), 175_000);
    assert.equal(closingBonusFor({ closingBonusPercent: null, closingBonusAmount: 500_000 }, 3_500_000), 500_000);
  });
  it("persentase 0, harga tidak valid, atau nominal tidak valid menghasilkan 0 (tanpa komisi)", () => {
    assert.equal(closingBonusFor({ closingBonusPercent: 0, closingBonusAmount: 500_000 }, 3_500_000), 0);
    assert.equal(closingBonusFor({ closingBonusPercent: 10, closingBonusAmount: 0 }, 0), 0);
    assert.equal(closingBonusFor({ closingBonusPercent: null, closingBonusAmount: -1 }, 3_500_000), 0);
    assert.equal(closingBonusFor({ closingBonusPercent: null, closingBonusAmount: Number.NaN }, 3_500_000), 0);
  });
  it("pembulatan ke rupiah terdekat", () => {
    assert.equal(closingBonusFor({ closingBonusPercent: 12.5, closingBonusAmount: 0 }, 3_333_333), 416_667);
  });
});

describe("bagi hasil invoice lunas", () => {
  it("persentase dari nilai invoice, termasuk perpanjangan Rp100.000", () => {
    assert.equal(subscriptionShareFor(3_500_000, 10), 350_000);
    assert.equal(subscriptionShareFor(100_000, 10), 10_000);
  });
  it("persentase atau nilai tidak valid menghasilkan 0", () => {
    assert.equal(subscriptionShareFor(100_000, 0), 0);
    assert.equal(subscriptionShareFor(0, 10), 0);
    assert.equal(subscriptionShareFor(100_000, Number.NaN), 0);
  });
});
