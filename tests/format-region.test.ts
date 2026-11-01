import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { districtLabel, regencyLabel, regionLine } from "../lib/format-region";

describe("format wilayah untuk dokumen cetak", () => {
  it("kecamatan: awalan ditambah hanya bila belum ada", () => {
    assert.equal(districtLabel("Sawangan"), "Kecamatan Sawangan");
    assert.equal(districtLabel("Kecamatan Sawangan"), "Kecamatan Sawangan");
    assert.equal(districtLabel("kecamatan sawangan"), "kecamatan sawangan");
    assert.equal(districtLabel("Kec. Sawangan"), "Kec. Sawangan");
    assert.equal(districtLabel("  Kecamatan   Sawangan "), "Kecamatan Sawangan");
    assert.equal(districtLabel("Kecamatanan Baru"), "Kecamatan Kecamatanan Baru", "kata yang hanya diawali huruf serupa tetap diberi awalan");
  });
  it("kabupaten/kota: Kota dipertahankan, Kotabaru bukan awalan Kota", () => {
    assert.equal(regencyLabel("Karanganyar"), "Kabupaten Karanganyar");
    assert.equal(regencyLabel("Kabupaten Karanganyar"), "Kabupaten Karanganyar");
    assert.equal(regencyLabel("Kota Depok"), "Kota Depok");
    assert.equal(regencyLabel("Kab. Bogor"), "Kab. Bogor");
    assert.equal(regencyLabel("Kota Administrasi Jakarta Timur"), "Kota Administrasi Jakarta Timur");
    assert.equal(regencyLabel("Kotabaru"), "Kabupaten Kotabaru");
  });
  it("baris wilayah tanpa awalan ganda dan tanpa koma menggantung; masukan aneh aman", () => {
    assert.equal(regionLine("Kecamatan Sawangan", "Kota Depok"), "Kecamatan Sawangan, Kota Depok");
    assert.equal(regionLine("Sawangan", "Depok"), "Kecamatan Sawangan, Kabupaten Depok");
    assert.equal(regionLine("", "Kota Depok"), "Kota Depok");
    assert.equal(regionLine("Sawangan", ""), "Kecamatan Sawangan");
    assert.equal(regionLine(null, undefined), "");
    assert.equal(regionLine(5, {}), "");
    assert.doesNotMatch(regionLine("Kecamatan Sawangan", "Kabupaten Bogor"), /Kecamatan Kecamatan|Kabupaten Kabupaten/);
  });
});
