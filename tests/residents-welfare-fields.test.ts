import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  describeAid,
  describeElectricity,
  parseWelfareFields,
  reconcileWelfare,
  resolveHouseOwnership,
} from "../lib/residents/welfare-fields.ts";
import { parseExtraFields } from "../lib/residents/extra-fields.ts";

const ok = (body: unknown) => {
  const r = parseWelfareFields(body);
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.data;
};
const err = (body: unknown) => {
  const r = parseWelfareFields(body);
  assert.ok(!r.ok, "seharusnya ditolak");
  return r.ok ? "" : r.error;
};

describe("kesejahteraan warga: semantik parsial", () => {
  it("kunci yang tidak ada tidak disentuh; body bukan objek = kosong", () => {
    assert.deepEqual(ok({}), {});
    assert.deepEqual(ok({ name: "x" }), {});
    assert.deepEqual(ok(null), {});
    assert.deepEqual(ok("teks"), {});
    assert.deepEqual(ok({ aidPkh: undefined }), {});
  });
  it("null / string kosong mengosongkan kolom bernilai teks", () => {
    assert.deepEqual(ok({ houseOwnership: "" }), { houseOwnership: null });
    assert.deepEqual(ok({ aidOther: "  " }), { aidOther: null });
    assert.deepEqual(ok({ electricityType: null }), { electricityType: null, electricityPowerVa: null });
    assert.deepEqual(ok({ bpjsType: "" }), { bpjsType: null });
  });
});

describe("BPJS", () => {
  it("jenis sah diterima; memilih jenis otomatis menandai peserta BPJS", () => {
    assert.deepEqual(ok({ bpjsType: "MANDIRI" }), { bpjsType: "MANDIRI", isBpjsKis: true });
    assert.deepEqual(ok({ bpjsType: "BANTUAN_PEMERINTAH", isBpjsKis: true }), { bpjsType: "BANTUAN_PEMERINTAH", isBpjsKis: true });
  });
  it("mencabut BPJS membersihkan jenisnya; mengirim jenis sekaligus mencabut = galat", () => {
    assert.deepEqual(ok({ isBpjsKis: false }), { isBpjsKis: false, bpjsType: null });
    assert.match(err({ isBpjsKis: false, bpjsType: "MANDIRI" }), /tidak bisa diisi/);
  });
  it("nilai asing ditolak", () => {
    assert.match(err({ bpjsType: "mandiri" }), /Jenis BPJS tidak valid/);
    assert.match(err({ bpjsType: "PBI" }), /Jenis BPJS tidak valid/);
    assert.match(err({ isBpjsKis: "ya" }), /Peserta BPJS tidak valid/);
  });
  it("mengosongkan jenis saja tidak mengubah status peserta", () => {
    assert.deepEqual(ok({ bpjsType: null }), { bpjsType: null });
  });
});

describe("rumah", () => {
  it("nilai baku, tanpa peduli huruf besar/kecil; 'Numpang' = 'Menumpang'", () => {
    assert.equal(resolveHouseOwnership("milik sendiri"), "Milik Sendiri");
    assert.equal(resolveHouseOwnership("  SEWA "), "Sewa");
    assert.equal(resolveHouseOwnership("Numpang"), "Menumpang");
    assert.equal(resolveHouseOwnership("menumpang"), "Menumpang");
    assert.equal(resolveHouseOwnership("Kontrak"), "Kontrak");
    assert.equal(resolveHouseOwnership("istana"), null);
    assert.equal(resolveHouseOwnership(5), null);
    assert.deepEqual(ok({ houseOwnership: "numpang" }), { houseOwnership: "Menumpang" });
    assert.match(err({ houseOwnership: "istana" }), /Kepemilikan rumah tidak valid/);
  });
});

describe("listrik", () => {
  it("meteran + daya", () => {
    assert.deepEqual(ok({ electricityType: "METERAN", electricityPowerVa: 900 }), { electricityType: "METERAN", electricityPowerVa: 900 });
    assert.deepEqual(ok({ electricityType: "METERAN", electricityPowerVa: "1300" }), { electricityType: "METERAN", electricityPowerVa: 1300 });
  });
  it("pasang sendiri / non meteran tidak punya daya: dibersihkan, atau galat bila daya dikirim", () => {
    assert.deepEqual(ok({ electricityType: "PASANG_SENDIRI" }), { electricityType: "PASANG_SENDIRI", electricityPowerVa: null });
    assert.deepEqual(ok({ electricityType: "NON_METERAN" }), { electricityType: "NON_METERAN", electricityPowerVa: null });
    assert.match(err({ electricityType: "NON_METERAN", electricityPowerVa: 450 }), /hanya untuk jenis listrik Meteran/);
  });
  it("batas daya 1..99999 bilangan bulat", () => {
    for (const bad of [0, -5, 100000, 1.5, "abc", "12.5", {}, [], true]) assert.match(err({ electricityType: "METERAN", electricityPowerVa: bad }), /Daya listrik harus bilangan bulat/, String(bad));
    assert.deepEqual(ok({ electricityType: "METERAN", electricityPowerVa: 99999 }), { electricityType: "METERAN", electricityPowerVa: 99999 });
    assert.deepEqual(ok({ electricityPowerVa: null }), { electricityPowerVa: null });
  });
  it("jenis asing ditolak", () => {
    assert.match(err({ electricityType: "meteran" }), /Jenis listrik tidak valid/);
  });
});

describe("keselarasan dengan data tersimpan (PUT/PATCH)", () => {
  it("daya tanpa jenis meteran, baik di body maupun yang tersimpan, ditolak dengan pesan jelas", () => {
    const only = ok({ electricityPowerVa: 900 });
    assert.ok(!reconcileWelfare(only, null).ok, "tanpa data tersimpan (POST)");
    assert.ok(!reconcileWelfare(only, { electricityType: "PASANG_SENDIRI" }).ok);
    assert.ok(!reconcileWelfare(only, { electricityType: null }).ok);
    assert.ok(reconcileWelfare(only, { electricityType: "METERAN" }).ok, "tersimpan METERAN: boleh ubah daya saja");
    assert.ok(reconcileWelfare(ok({ electricityType: "METERAN", electricityPowerVa: 900 }), null).ok);
    assert.ok(reconcileWelfare(ok({ aidPkh: true }), null).ok);
  });
});

describe("bantuan", () => {
  it("PKH/BPNT boolean; lain-lain teks dirapikan dan dibatasi 255", () => {
    assert.deepEqual(ok({ aidPkh: true, aidBpnt: false, aidOther: "  BLT   Dana  Desa " }), { aidPkh: true, aidBpnt: false, aidOther: "BLT Dana Desa" });
    assert.deepEqual(ok({ aidPkh: null }), { aidPkh: false });
    assert.match(err({ aidPkh: "ya" }), /Bantuan PKH tidak valid/);
    assert.match(err({ aidBpnt: 1 }), /BPNT/);
    assert.match(err({ aidOther: "x".repeat(256) }), /maksimal 255/);
    assert.match(err({ aidOther: 5 }), /tidak valid/);
    assert.deepEqual(ok({ aidOther: "x".repeat(255) }), { aidOther: "x".repeat(255) });
  });
  it("tampilan: urut PKH, BPNT, lain-lain; tanpa bantuan = daftar kosong", () => {
    assert.deepEqual(describeAid({ aidPkh: true, aidBpnt: true, aidOther: "BLT" }), ["PKH", "BPNT/Sembako", "Lain-lain: BLT"]);
    assert.deepEqual(describeAid({ aidPkh: false, aidBpnt: true }), ["BPNT/Sembako"]);
    assert.deepEqual(describeAid({ aidPkh: false, aidBpnt: false, aidOther: "  " }), []);
    assert.deepEqual(describeAid({}), []);
  });
});

describe("tampilan listrik", () => {
  it("meteran memuat daya; selainnya hanya jenis; kosong = '-'", () => {
    assert.equal(describeElectricity("METERAN", 900), "Meteran PLN, 900 VA");
    assert.equal(describeElectricity("METERAN", null), "Meteran PLN");
    assert.equal(describeElectricity("PASANG_SENDIRI", null), "Pasang sendiri");
    assert.equal(describeElectricity("NON_METERAN", null), "Non meteran");
    assert.equal(describeElectricity(null, null), "-");
    assert.equal(describeElectricity(undefined, undefined), "-");
  });
});

describe("parseExtraFields (dipakai POST/PUT/PATCH) ikut memuat kesejahteraan", () => {
  it("menggabungkan dengan field tambahan lain dan meneruskan galat", () => {
    const r = parseExtraFields({ ethnicity: "Jawa", bpjsType: "MANDIRI", electricityType: "METERAN", electricityPowerVa: 450, aidPkh: true });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual({ e: r.data.ethnicity, b: r.data.bpjsType, k: r.data.isBpjsKis, t: r.data.electricityType, p: r.data.electricityPowerVa, a: r.data.aidPkh }, { e: "Jawa", b: "MANDIRI", k: true, t: "METERAN", p: 450, a: true });
    const bad = parseExtraFields({ ethnicity: "Jawa", electricityType: "NON_METERAN", electricityPowerVa: 450 });
    assert.ok(!bad.ok);
  });
  it("body lama tanpa kunci baru tidak berubah perilakunya", () => {
    const r = parseExtraFields({ ethnicity: "Sunda", ktpStatus: "SUDAH_CETAK" });
    assert.ok(r.ok);
    if (r.ok) assert.deepEqual(Object.keys(r.data).sort(), ["ethnicity", "ktpStatus"]);
  });
});
