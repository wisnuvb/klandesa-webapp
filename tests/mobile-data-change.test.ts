import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canApplyAutomatically, canCorrect, isChangeField, residentValueText, validateChange } from "../lib/mobile/data-change-logic.ts";

describe("koreksi data: jenis kolom", () => {
  it("hanya kolom yang dikenal; kolom identitas tidak diterapkan otomatis", () => {
    assert.equal(isChangeField("address"), true);
    for (const bad of ["password", "isAlive", "villageId", "__proto__", "toString", 5, null]) assert.equal(isChangeField(bad), false, String(bad));
    for (const f of ["address", "phone", "occupation", "education", "religion", "maritalStatus"] as const) assert.equal(canApplyAutomatically(f), true, f);
    for (const f of ["name", "birthDate", "nik", "kk", "motherName", "fatherName", "gender", "birthplace"] as const) assert.equal(canApplyAutomatically(f), false, f);
  });
});

describe("koreksi data: validasi nilai", () => {
  it("merapikan spasi dan menolak data yang sama dengan data desa", () => {
    assert.deepEqual(validateChange("address", "  Jl.  Mawar   No 5 ", "Jl. Melati"), { ok: true, value: "Jl. Mawar No 5" });
    assert.equal(validateChange("address", "jl. melati", "Jl. Melati").ok, false);
    assert.equal(validateChange("address", "   ", null).ok, false);
    assert.equal(validateChange("address", 5, null).ok, false);
    assert.equal(validateChange("address", "x".repeat(501), null).ok, false);
  });
  it("telepon: hanya angka dan + di depan, 8–15 digit", () => {
    assert.deepEqual(validateChange("phone", "0812-3456 7890", null), { ok: true, value: "081234567890" });
    assert.deepEqual(validateChange("phone", "+62 812 3456 7890", null), { ok: true, value: "+6281234567890" });
    assert.equal(validateChange("phone", "123", null).ok, false);
    assert.equal(validateChange("phone", "abc", null).ok, false);
  });
  it("NIK/KK harus 16 angka; tanggal lahir harus tanggal nyata di masa lalu", () => {
    assert.equal(validateChange("nik", "3508010101900001", null).ok, true);
    assert.equal(validateChange("nik", "350801010190000", null).ok, false);
    assert.equal(validateChange("kk", "35080101019000AB", null).ok, false);
    assert.equal(validateChange("birthDate", "1990-02-28", null).ok, true);
    assert.equal(validateChange("birthDate", "1990-02-30", null).ok, false);
    assert.equal(validateChange("birthDate", "2999-01-01", null).ok, false);
    assert.equal(validateChange("birthDate", "28-02-1990", null).ok, false);
  });
  it("jenis kelamin dinormalkan", () => {
    assert.deepEqual(validateChange("gender", "perempuan", "Laki-laki"), { ok: true, value: "Perempuan" });
    assert.equal(validateChange("gender", "lainnya", null).ok, false);
  });
  it("nilai tanggal dari DB dibandingkan sebagai TTTT-BB-HH", () => {
    assert.equal(residentValueText(new Date("1990-02-28T00:00:00Z")), "1990-02-28");
    assert.equal(validateChange("birthDate", "1990-02-28", residentValueText(new Date("1990-02-28T00:00:00Z"))).ok, false);
    assert.equal(residentValueText(null), null);
  });
});

describe("koreksi data: siapa boleh", () => {
  const base = { requesterId: 1, requesterKk: "K1", requesterIsHead: false, targetId: 1, targetKk: "K1", targetVillageId: 7, requesterVillageId: 7 };
  it("diri sendiri boleh; anggota lain hanya oleh kepala keluarga di KK yang sama", () => {
    assert.equal(canCorrect(base), true);
    assert.equal(canCorrect({ ...base, targetId: 2 }), false);
    assert.equal(canCorrect({ ...base, targetId: 2, requesterIsHead: true }), true);
    assert.equal(canCorrect({ ...base, targetId: 2, requesterIsHead: true, targetKk: "K2" }), false);
    assert.equal(canCorrect({ ...base, targetId: 2, requesterIsHead: true, requesterKk: null, targetKk: null }), false);
  });
  it("tidak pernah lintas desa", () => {
    assert.equal(canCorrect({ ...base, targetVillageId: 8 }), false);
    assert.equal(canCorrect({ ...base, targetId: 2, requesterIsHead: true, targetVillageId: 8 }), false);
  });
});
