import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parsePositionCreate,
  parsePositionId,
  parsePositionUpdate,
} from "../lib/positions/schema.ts";

describe("validasi jabatan - create", () => {
  it("menerima input form (angka sebagai string) dan merapikan nilai kosong", () => {
    const r = parsePositionCreate({
      name: "  Kaur Keuangan ",
      level: "3",
      description: "",
      salary: "2500000",
      allowance: null,
      isActive: true,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.data.name, "Kaur Keuangan");
      assert.equal(r.data.level, 3);
      assert.equal(r.data.description, null);
      assert.equal(r.data.salary, 2500000);
      assert.equal(r.data.allowance, null);
    }
  });

  it("menolak nama kosong, level di luar 1-5, dan nominal negatif/bukan angka", () => {
    assert.equal(parsePositionCreate({ name: "  ", level: 1 }).ok, false);
    assert.equal(parsePositionCreate({ name: "A" }).ok, false);
    assert.equal(parsePositionCreate({ name: "A", level: 0 }).ok, false);
    assert.equal(parsePositionCreate({ name: "A", level: 6 }).ok, false);
    assert.equal(parsePositionCreate({ name: "A", level: 2.5 }).ok, false);
    assert.equal(
      parsePositionCreate({ name: "A", level: 1, salary: -1 }).ok,
      false,
    );
    assert.equal(
      parsePositionCreate({ name: "A", level: 1, allowance: "abc" }).ok,
      false,
    );
  });
});

describe("validasi jabatan - update", () => {
  it("hanya memuat field yang dikirim", () => {
    const r = parsePositionUpdate({ isActive: false });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.data, { isActive: false });
  });

  it("mengosongkan gaji menjadi null, bukan 0", () => {
    const r = parsePositionUpdate({ salary: "" });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.salary, null);
  });

  it("menolak body kosong dan nilai tidak valid", () => {
    assert.equal(parsePositionUpdate({}).ok, false);
    assert.equal(parsePositionUpdate({ name: "" }).ok, false);
    assert.equal(parsePositionUpdate({ level: 9 }).ok, false);
  });
});

describe("parsePositionId", () => {
  it("hanya menerima bilangan bulat positif", () => {
    assert.equal(parsePositionId("12"), 12);
    assert.equal(parsePositionId("0"), null);
    assert.equal(parsePositionId("-3"), null);
    assert.equal(parsePositionId("1.5"), null);
    assert.equal(parsePositionId("abc"), null);
    assert.equal(parsePositionId(""), null);
  });
});
