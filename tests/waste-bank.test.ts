import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { depositAmount, gramsToKg, kgToGrams, parseItemInput } from "../lib/lingkungan/waste-bank";
import { toCents, fromCents } from "../lib/coop/loan-math";

describe("berat dan nilai setoran", () => {
  it("kgToGrams: sampai 3 desimal, menolak nol/negatif/format aneh/terlalu besar", () => {
    assert.equal(kgToGrams("12.5"), 12_500n);
    assert.equal(kgToGrams(0.25), 250n);
    assert.equal(kgToGrams("0.001"), 1n);
    for (const bad of ["0", "-1", "1,5", "1.2345", "abc", "", "100001", Number.NaN, null, undefined]) assert.equal(kgToGrams(bad), null, String(bad));
    assert.equal(kgToGrams("100000"), 100_000_000n);
    assert.equal(gramsToKg(12_500n), "12.500");
    assert.equal(gramsToKg(7n), "0.007");
  });
  it("nilai = berat x harga dibulatkan ke sen terdekat", () => {
    const price = toCents("3500")!;
    assert.equal(fromCents(depositAmount(kgToGrams("2.5")!, price)), "8750.00");
    assert.equal(fromCents(depositAmount(kgToGrams("0.333")!, toCents("1000")!)), "333.00");
    assert.equal(fromCents(depositAmount(kgToGrams("0.001")!, toCents("0.50")!)), "0.00", "kurang dari setengah sen");
    assert.equal(fromCents(depositAmount(kgToGrams("0.001")!, toCents("5")!)), "0.01", "setengah sen dibulatkan naik");
    assert.equal(fromCents(depositAmount(kgToGrams("100000")!, toCents("9999999999999")!)), "999999999999900000.00", "tak meluap (BigInt)");
  });
});

describe("parseItemInput", () => {
  it("menerima nama dan harga; aktif bawaan", () => {
    const r = parseItemInput({ name: "  Botol  plastik ", pricePerKg: "3500" });
    assert.ok(r.ok && r.value.name === "Botol plastik" && r.value.active === true && r.value.pricePerKg === 350_000n);
  });
  it("menolak nama kosong, harga nol/negatif/aneh, dan status bukan boolean", () => {
    assert.ok(!parseItemInput({ name: "", pricePerKg: 100 }).ok);
    assert.ok(!parseItemInput({ name: "Kardus", pricePerKg: 0 }).ok);
    assert.ok(!parseItemInput({ name: "Kardus", pricePerKg: "-5" }).ok);
    assert.ok(!parseItemInput({ name: "Kardus", pricePerKg: "1e3" }).ok);
    assert.ok(!parseItemInput({ name: "Kardus", pricePerKg: 100, active: "ya" }).ok);
    assert.ok(!parseItemInput(null).ok);
  });
});
