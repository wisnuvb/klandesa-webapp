import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import {
  matchScore,
  nodeText,
  normalizeSearch,
  parseNativeOptions,
  type NativeGroup,
  type NativeOption,
} from "../components/ui/select-utils.ts";

const h = React.createElement;

describe("pencarian dropdown", () => {
  it("mengabaikan huruf besar dan aksen", () => {
    assert.equal(normalizeSearch("Jàkarta Sélatan"), "jakarta selatan");
  });

  it("kueri kosong cocok dengan semuanya", () => {
    assert.equal(matchScore("Laki-laki", ""), 1);
    assert.equal(matchScore("Laki-laki", "   "), 1);
  });

  it("semua kata harus ada, urutan bebas", () => {
    assert.ok(matchScore("Kepala Keluarga", "keluarga kepala") > 0);
    assert.equal(matchScore("Kepala Keluarga", "kepala istri"), 0);
  });

  it("awal teks mengalahkan awal kata, dan awal kata mengalahkan tengah kata", () => {
    const awal = matchScore("Kartu Keluarga", "kartu");
    const kata = matchScore("Surat Kartu Keluarga", "kartu");
    const tengah = matchScore("Antarkartu", "kartu");
    assert.ok(awal > kata, "awal teks > awal kata");
    assert.ok(kata > tengah, "awal kata > tengah kata");
  });

  it("tidak memakai pencocokan acak antar-huruf", () => {
    assert.equal(matchScore("Kartu Keluarga", "kkg"), 0);
  });
});

describe("nodeText", () => {
  it("meratakan teks, angka, larik, dan elemen bersarang", () => {
    assert.equal(nodeText("A"), "A");
    assert.equal(nodeText(5), "5");
    assert.equal(nodeText(["1.1 ", h("b", null, "Belanja")]), "1.1 Belanja");
    assert.equal(nodeText(h("div", null, h("span", null, "Ya"), false, null)), "Ya");
  });
});

describe("parseNativeOptions", () => {
  it("membaca <option> langsung, hasil map, dan fragmen", () => {
    const entries = parseNativeOptions([
      h("option", { key: "k", value: "" }, "Pilih…"),
      ...["A", "B"].map((v) => h("option", { key: v, value: v }, `Opsi ${v}`)),
      h(React.Fragment, { key: "f" }, h("option", { value: 3 }, "Tiga")),
    ]) as NativeOption[];
    assert.deepEqual(
      entries.map((e) => [e.value, e.text]),
      [["", "Pilih…"], ["A", "Opsi A"], ["B", "Opsi B"], ["3", "Tiga"]],
    );
  });

  it("nilai <option> tanpa value memakai teksnya, seperti browser", () => {
    const [o] = parseNativeOptions(h("option", null, "  Tanpa   nilai ")) as NativeOption[];
    assert.equal(o.value, "Tanpa nilai");
  });

  it("menangani disabled dan optgroup (termasuk grup yang dimatikan)", () => {
    const entries = parseNativeOptions([
      h("option", { key: "x", value: "x", disabled: true }, "X"),
      h("optgroup", { key: "g1", label: "Pendapatan" }, h("option", { value: "1" }, "Satu")),
      h("optgroup", { key: "g2", label: "Mati", disabled: true }, h("option", { value: "2" }, "Dua")),
    ]);
    assert.equal((entries[0] as NativeOption).disabled, true);
    const g1 = entries[1] as NativeGroup;
    assert.equal(g1.label, "Pendapatan");
    assert.equal(g1.options[0].disabled, false);
    assert.equal((entries[2] as NativeGroup).options[0].disabled, true);
  });

  it("mengabaikan elemen selain option/optgroup", () => {
    const entries = parseNativeOptions([h("div", { key: "d" }, "x"), "teks", null, false]);
    assert.deepEqual(entries, []);
  });
});
