import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  budgetsToGroups,
  groupTransactions,
  mergeRealisasi,
} from "../lib/finance/summary-groups.ts";
import { classifyExpense, classifyIncome } from "../lib/finance/taxonomy.ts";

const budget = (category: string, subCategory: string | null, amount: number) => ({
  category,
  subCategory,
  budgetAmount: amount,
  realizedAmount: 0,
});

describe("klasifikasi pendapatan", () => {
  it("kategori dialog Pendapatan: sub diambil dari akhiran deskripsi", () => {
    assert.deepEqual(classifyIncome("PADes", "pendapatan pasar malam (Hasil Aset Desa)"), {
      kategori: "PADes",
      sub: "Hasil Aset Desa",
    });
    assert.equal(classifyIncome("PADes", "tanpa sub").sub, "Lainnya");
  });

  it("kategori dialog Transaksi dipetakan ke kelompok yang sama", () => {
    assert.deepEqual(classifyIncome("Penerimaan Dana Desa", "tahap 1"), {
      kategori: "Transfer",
      sub: "Dana Desa",
    });
    assert.equal(classifyIncome("Swadaya Masyarakat", "x").kategori, "PADes");
  });

  it("kategori tak dikenal dibiarkan apa adanya", () => {
    assert.deepEqual(classifyIncome("Pendapatan Asli Desa", "x"), {
      kategori: "Pendapatan Asli Desa",
      sub: "Lainnya",
    });
  });
});

describe("klasifikasi belanja", () => {
  it("mengambil sub-kegiatan dari akhiran deskripsi", () => {
    assert.deepEqual(
      classifyExpense("Pelaksanaan Pembangunan Desa", "paving blok (Pembangunan Jalan Desa)"),
      { bidang: "Pelaksanaan Pembangunan Desa", sub: "Pembangunan Jalan Desa" },
    );
  });
});

describe("penggabungan realisasi ke anggaran", () => {
  const tx = (rows: Array<[number, string, string]>) =>
    groupTransactions(rows.map(([amount, group, sub]) => ({ amount, group, sub })));

  it("belanja baru muncul di bidang anggaran meski APBDes ada (huruf beda tetap cocok)", () => {
    const map = budgetsToGroups([budget("Pelaksanaan Pembangunan Desa", "Jalan", 1000)], "Belanja");
    mergeRealisasi(map, tx([[300, "pelaksanaan pembangunan desa ", "Lainnya"]]), true);
    const g = map.get("Pelaksanaan Pembangunan Desa")!;
    assert.equal(g.anggaran, 1000);
    assert.equal(g.realisasi, 300);
    assert.equal(map.size, 1);
  });

  it("belanja di luar anggaran tampil dengan anggaran 0", () => {
    const map = budgetsToGroups([budget("A", "x", 1000)], "Belanja");
    mergeRealisasi(map, tx([[200, "B", "Lainnya"]]), true);
    const g = map.get("B")!;
    assert.equal(g.anggaran, 0);
    assert.equal(g.realisasi, 200);
    assert.equal(g.subs.get("Lainnya")!.anggaran, 0);
  });

  it("tanpa anggaran sama sekali: anggaran = realisasi (per kategori dan sub)", () => {
    const map = budgetsToGroups([], "Belanja");
    mergeRealisasi(map, tx([[100, "B", "S1"], [50, "B", "S2"]]), false);
    const g = map.get("B")!;
    assert.equal(g.anggaran, 150);
    assert.equal(g.realisasi, 150);
    assert.equal(g.subs.get("S1")!.anggaran, 100);
    assert.equal(g.subs.get("S2")!.realisasi, 50);
  });
});
