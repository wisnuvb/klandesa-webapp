import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aggregateResidents, suppressGroups, type ResidentRow } from "../lib/ai/laras-aggregate.ts";

const NOW = new Date("2026-10-31T00:00:00Z");
function row(p: Partial<ResidentRow> = {}): ResidentRow {
  return {
    gender: "Laki-laki",
    birthDate: new Date("1990-01-01"),
    education: "SMA",
    occupation: "Petani",
    religion: "Islam",
    maritalStatus: "Menikah",
    rt: "01",
    rw: "01",
    hamlet: "Krajan",
    desil: null,
    isStunting: false,
    isDisability: false,
    isBpjsKis: false,
    isIlliterate: false,
    isPregnant: false,
    ...p,
  };
}
const many = (n: number, p: Partial<ResidentRow> = {}) => Array.from({ length: n }, () => row(p));

describe("aggregateResidents", () => {
  it("menghitung total dan memfilter RT/jenis kelamin/usia", () => {
    const rows = [...many(10, { rt: "01" }), ...many(8, { rt: "02", gender: "Perempuan" })];
    assert.equal(aggregateResidents(rows, {}, NOW).total, 18);
    assert.equal(aggregateResidents(rows, { rt: "02" }, NOW).total, 8);
    assert.equal(aggregateResidents(rows, { gender: "Perempuan" }, NOW).total, 8);
    assert.equal(aggregateResidents(rows, { ageMin: 60 }, NOW).total, 0);
    assert.equal(aggregateResidents(rows, { ageMin: 30, ageMax: 40 }, NOW).total, 18);
  });
  it("menyamarkan total kecil (privasi) dan tidak membocorkan angka sebenarnya", () => {
    const rows = [...many(50), ...many(2, { isStunting: true })];
    const r = aggregateResidents(rows, { flags: ["stunting"] }, NOW);
    assert.equal(r.total, "<5");
    assert.ok(!JSON.stringify(r).includes('"total":2'));
  });
  it("mengelompokkan berdasarkan RT dan menggabungkan kelompok kecil", () => {
    const rows = [...many(20, { rt: "01" }), ...many(12, { rt: "02" }), ...many(3, { rt: "03" }), ...many(4, { rt: "04" })];
    const r = aggregateResidents(rows, { groupBy: "rt" }, NOW);
    assert.equal(r.total, 39);
    assert.deepEqual(r.groups?.map((g) => g.key), ["01", "02", "lainnya (kelompok kecil digabung)"]);
    assert.equal(r.groups?.at(-1)?.count, 7);
  });
  it("bila sisa kelompok kecil < 5, total disembunyikan agar sisa tidak bisa dihitung mundur", () => {
    const rows = [...many(20, { rt: "01" }), ...many(12, { rt: "02" }), ...many(2, { rt: "03" })];
    const r = aggregateResidents(rows, { groupBy: "rt" }, NOW);
    assert.equal(r.total, null);
    assert.equal(r.groups?.at(-1)?.count, "<5");
    assert.ok(!JSON.stringify(r).includes("34"));
  });
  it("tidak pernah memuat kolom identitas pada hasil", () => {
    const r = aggregateResidents(many(10), { groupBy: "occupation" }, NOW);
    assert.ok(!/nik|kk|name|address|phone/i.test(JSON.stringify(Object.keys(r))));
  });
  it("pengelompokan usia dan desil", () => {
    const rows = [...many(6, { birthDate: new Date("2024-01-01"), desil: "Desil 1" }), ...many(6, { desil: "2" })];
    const age = aggregateResidents(rows, { groupBy: "age_group" }, NOW);
    assert.equal(age.groups?.find((g) => g.key.startsWith("0–4"))?.count, 6);
    const d = aggregateResidents(rows, { groupBy: "desil" }, NOW);
    assert.deepEqual(d.groups?.map((g) => g.key).sort(), ["Desil 1", "Desil 2"]);
  });
});

describe("suppressGroups", () => {
  it("map kosong → total 0", () => {
    assert.deepEqual(suppressGroups(new Map()), { total: 0, groups: [] });
  });
});
