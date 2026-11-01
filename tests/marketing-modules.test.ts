import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MARKETING_GROUPS,
  MARKETING_MODULE_COPY,
  getFlagshipMarketingModules,
  getMarketingModuleCountLabel,
  getMarketingModules,
  groupMarketingModules,
} from "../lib/marketing/modules.ts";

const FALLBACK = "Bagian aplikasi desa dalam Klandesa";

describe("katalog pemasaran modul", () => {
  const modules = getMarketingModules();

  it("setiap modul punya teks pemasaran sendiri (bukan kalimat generik)", () => {
    const missing = modules.filter((m) => m.marketingDescription.startsWith(FALLBACK)).map((m) => m.id);
    assert.deepEqual(missing, [], `Tambahkan teks di MARKETING_MODULE_COPY untuk: ${missing.join(", ")}`);
  });

  it("setiap modul masuk satu kelompok katalog", () => {
    const grouped = groupMarketingModules(modules);
    const other = grouped.find((g) => g.id === "lainnya");
    assert.equal(other, undefined, `Daftarkan di MARKETING_GROUPS: ${other?.modules.map((m) => m.id).join(", ")}`);
    const total = grouped.reduce((n, g) => n + g.modules.length, 0);
    assert.equal(total, modules.length);
  });

  it("tidak ada modul di dua kelompok dan tidak ada id yang tak dikenal", () => {
    const known = new Set(modules.map((m) => m.id));
    const seen = new Set<string>();
    for (const g of MARKETING_GROUPS) {
      for (const id of g.ids) {
        assert.ok(known.has(id), `MARKETING_GROUPS memuat id tak dikenal: ${id}`);
        assert.ok(!seen.has(id), `Modul di dua kelompok: ${id}`);
        seen.add(id);
      }
    }
  });

  it("teks pemasaran tidak menyebut desa percontohan sebagai syarat akses", () => {
    for (const [id, text] of Object.entries(MARKETING_MODULE_COPY)) {
      assert.ok(!/percontohan|pilot/i.test(text ?? ""), `${id}: bahasa pilot sudah usang`);
    }
  });

  it("fitur unggulan semuanya ada dan berjumlah 8", () => {
    assert.equal(getFlagshipMarketingModules(8).length, 8);
  });

  it("label jumlah modul dibulatkan ke bawah per sepuluh", () => {
    assert.match(getMarketingModuleCountLabel(), /^\d+0\+$/);
    assert.ok(Number.parseInt(getMarketingModuleCountLabel(), 10) <= modules.length);
  });
});
