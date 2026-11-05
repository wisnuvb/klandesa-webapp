import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvSafeCell, neutralizeFormula } from "../lib/csv-safe";
import { rowsToCsv } from "../lib/integrations/csv";

describe("csv-safe (injeksi rumus spreadsheet)", () => {
  it("menetralkan sel yang diawali = + - @ tab CR", () => {
    for (const evil of ["=HYPERLINK(\"http://x\",\"klik\")", "+cmd|' /C calc'!A0", "-2+3+cmd|' /C calc'!A0", "@SUM(1+1)", "\t=1+1", "\r=1+1"]) {
      assert.ok(neutralizeFormula(evil).startsWith("'"), `harus dinetralkan: ${JSON.stringify(evil)}`);
    }
  });

  it("tidak mengubah data biasa, penanda kosong '-', angka bertanda, dan tipe number", () => {
    for (const ok of ["Budi", "Jl. Mawar No. 1", "-", "-5", "+62812", "1.250.000", "", "a=b", "x+y"]) assert.equal(neutralizeFormula(ok), ok);
    assert.equal(csvSafeCell(-5), "-5");
    assert.equal(csvSafeCell(null), "");
    assert.equal(csvSafeCell(undefined), "");
  });

  it("mengutip koma/kutip/baris baru, dan alwaysQuote mengutip semuanya (termasuk yang sudah dinetralkan)", () => {
    assert.equal(csvSafeCell('a,"b"'), '"a,""b"""');
    assert.equal(csvSafeCell("x\ny"), '"x\ny"');
    assert.equal(csvSafeCell("plain", { alwaysQuote: true }), '"plain"');
    assert.equal(csvSafeCell("=1+1", { alwaysQuote: true }), "\"'=1+1\"");
  });

  it("ekspor integrasi (rowsToCsv) ikut aman, nilai angka tetap angka", () => {
    const csv = rowsToCsv(["nama", "jumlah"], [{ nama: "=cmd()", jumlah: -1500 }, { nama: "Siti", jumlah: 20 }]);
    assert.equal(csv, "nama,jumlah\n'=cmd(),-1500\nSiti,20");
  });
});
