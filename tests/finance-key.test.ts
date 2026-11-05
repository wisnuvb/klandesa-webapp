import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { financeKeyAllowsVillage } from "../lib/finance-village-context";

describe("financeKeyAllowsVillage (FINANCE_API_KEY_VILLAGE_IDS)", () => {
  it("terisi: hanya desa di daftar yang boleh; spasi dan nilai bukan angka diabaikan", () => {
    const env = { FINANCE_API_KEY_VILLAGE_IDS: " 3, 7 ,abc,,9.5" } as unknown as NodeJS.ProcessEnv;
    assert.equal(financeKeyAllowsVillage(3, env), true);
    assert.equal(financeKeyAllowsVillage(7, env), true);
    assert.equal(financeKeyAllowsVillage(8, env), false);
    assert.equal(financeKeyAllowsVillage(9, env), false, "9.5 bukan bilangan bulat");
  });

  it("kosong/tidak ada: perilaku lama dipertahankan (semua desa), supaya integrasi berjalan tidak putus", () => {
    assert.equal(financeKeyAllowsVillage(1, {} as NodeJS.ProcessEnv), true);
    assert.equal(financeKeyAllowsVillage(1, { FINANCE_API_KEY_VILLAGE_IDS: "  " } as unknown as NodeJS.ProcessEnv), true);
  });
});
