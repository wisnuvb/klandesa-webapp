import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { storageLevel, summarizeStorage } from "../lib/digitalArchive/quota-level.ts";

const GB = 1024 ** 3;

describe("peringatan kuota penyimpanan desa", () => {
  it("di bawah 80% aman, 80% ke atas peringatan, tepat penuh atau lebih = penuh", () => {
    assert.equal(storageLevel(3.9 * GB, 5 * GB), "ok");
    assert.equal(storageLevel(4 * GB, 5 * GB), "warning");
    assert.equal(storageLevel(5 * GB - 1, 5 * GB), "warning");
    assert.equal(storageLevel(5 * GB, 5 * GB), "full");
    assert.equal(storageLevel(6 * GB, 5 * GB), "full");
  });
  it("kuota nol: kosong aman, ada isi dianggap penuh", () => {
    assert.equal(storageLevel(0, 0), "ok");
    assert.equal(storageLevel(1, 0), "full");
  });
  it("ringkasan menjumlah berkas arsip dan foto berbayar, persen dibulatkan", () => {
    const s = summarizeStorage(3 * GB, 1.5 * GB, 5 * GB);
    assert.equal(s.usedBytes, 4.5 * GB);
    assert.equal(s.percent, 90);
    assert.equal(s.level, "warning");
    assert.equal(s.chargedMediaBytes, 1.5 * GB);
  });
  it("angka negatif tidak mengurangi pemakaian", () => {
    const s = summarizeStorage(-5, -10, 5 * GB);
    assert.equal(s.usedBytes, 0);
    assert.equal(s.level, "ok");
  });
});
