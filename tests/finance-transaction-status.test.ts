import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isCountedTransactionStatus,
  isSppFlowStatus,
} from "../lib/finance/transaction-status.ts";

describe("status transaksi keuangan", () => {
  it("hanya verified dan approved yang dihitung ke realisasi/saldo", () => {
    assert.equal(isCountedTransactionStatus("verified"), true);
    assert.equal(isCountedTransactionStatus("approved"), true);
    assert.equal(isCountedTransactionStatus("pending"), false);
    assert.equal(isCountedTransactionStatus("rejected"), false);
    assert.equal(isCountedTransactionStatus(null), false);
    assert.equal(isCountedTransactionStatus(undefined), false);
  });

  it("belanja langsung (verified) bukan bagian dari daftar SPP", () => {
    assert.equal(isSppFlowStatus("pending"), true);
    assert.equal(isSppFlowStatus("approved"), true);
    assert.equal(isSppFlowStatus("rejected"), true);
    assert.equal(isSppFlowStatus("verified"), false);
  });
});
