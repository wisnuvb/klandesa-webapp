import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aiCreditsAlreadyApplied, resolveAiCreditGrant } from "../lib/billing/ai-credit-grant.ts";

// Bentuk data persis seperti yang ditulis checkout: tagihan hanya { userId }, kredit ada di metadata item.
const checkoutInvoice = {
  metadata: { userId: 42 },
  items: [{ metadata: { kind: "ai_credits", credits: 300, userId: 42 } }],
};

describe("resolveAiCreditGrant", () => {
  it("memberi kredit dari item tagihan walau metadata tagihan hanya berisi userId (regresi kredit tak masuk)", () => {
    assert.deepEqual(resolveAiCreditGrant(checkoutInvoice), { ok: true, grant: { userId: 42, credits: 300 } });
  });
  it("userId dari tagihan diutamakan; item hanya cadangan untuk tagihan lama", () => {
    const r = resolveAiCreditGrant({ metadata: {}, items: [{ metadata: { kind: "ai_credits", credits: 1000, userId: "7" } }] });
    assert.deepEqual(r, { ok: true, grant: { userId: 7, credits: 1000 } });
    const r2 = resolveAiCreditGrant({ metadata: { userId: 1 }, items: [{ metadata: { kind: "ai_credits", credits: 300, userId: 9 } }] });
    assert.deepEqual(r2, { ok: true, grant: { userId: 1, credits: 300 } });
  });
  it("tetap mendukung tagihan lama yang menyimpan credits di metadata tagihan", () => {
    const r = resolveAiCreditGrant({ metadata: { userId: 5, credits: 3000 }, items: [] });
    assert.deepEqual(r, { ok: true, grant: { userId: 5, credits: 3000 } });
  });
  it("gagal dengan jelas (bukan diam-diam) bila kredit atau pemilik tidak ada", () => {
    assert.equal(resolveAiCreditGrant({ metadata: { userId: 42 }, items: [] }).ok, false);
    assert.equal(resolveAiCreditGrant({ metadata: {}, items: checkoutInvoice.items }).ok, true); // userId dari item
    assert.equal(resolveAiCreditGrant({ metadata: null, items: [{ metadata: { kind: "ai_credits", credits: 300 } }] }).ok, false);
    assert.equal(resolveAiCreditGrant({ metadata: { userId: 42 }, items: [{ metadata: { kind: "ai_credits", credits: -5 } }] }).ok, false);
    assert.equal(resolveAiCreditGrant({ metadata: { userId: 42 }, items: [{ metadata: { kind: "ai_credits", credits: 1.5 } }] }).ok, false);
    assert.equal(resolveAiCreditGrant({ metadata: { userId: "abc" }, items: [{ metadata: { kind: "ai_credits", credits: 300 } }] }).ok, false);
  });
  it("mengabaikan item bukan kredit", () => {
    const r = resolveAiCreditGrant({ metadata: { userId: 3 }, items: [{ metadata: { kind: "other", credits: 999 } }] });
    assert.equal(r.ok, false);
  });
});

describe("aiCreditsAlreadyApplied", () => {
  it("mengenali penanda sudah-diterapkan", () => {
    assert.equal(aiCreditsAlreadyApplied({ userId: 1 }), false);
    assert.equal(aiCreditsAlreadyApplied(null), false);
    assert.equal(aiCreditsAlreadyApplied({ creditsAppliedAt: "2026-10-30T09:00:00.000Z" }), true);
  });
});
