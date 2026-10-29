import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeVillageInfoSettings, normalizeDialNumber, readVillageInfoSettings, sanitizeEmergencyContacts,
  sanitizeServiceHours, summarizeBudget, visibleOfficials,
} from "../lib/mobile/village-info-logic.ts";

describe("nomor telepon", () => {
  it("menyisakan digit dan awalan +", () => {
    assert.equal(normalizeDialNumber(" (0334) 123-456 "), "0334123456");
    assert.equal(normalizeDialNumber("+62 812-3456-7890"), "+6281234567890");
    assert.equal(normalizeDialNumber("112"), "112");
  });
  it("menolak nomor terlalu pendek/panjang atau bukan teks", () => {
    for (const bad of ["12", "", "abc", "1".repeat(17), null, 112]) assert.equal(normalizeDialNumber(bad), null, String(bad));
  });
});

describe("kontak darurat", () => {
  it("membersihkan, membuang duplikat dan entri tidak valid, serta membatasi 10", () => {
    const input = [
      { label: "  Polsek  Yosowilangun ", phone: "0334-111222" },
      { label: "Polsek Yosowilangun", phone: "0334111222" },
      { label: "x", phone: "0334111222" },
      { label: "Puskesmas", phone: "tidak ada" },
      "bukan objek",
      ...Array.from({ length: 20 }, (_, i) => ({ label: `Kontak ${i}`, phone: `08123${i}999` })),
    ];
    const out = sanitizeEmergencyContacts(input);
    assert.equal(out.length, 10);
    assert.deepEqual(out[0], { label: "Polsek Yosowilangun", phone: "0334111222" });
    assert.equal(out.filter((c) => c.label === "Polsek Yosowilangun").length, 1);
  });
  it("bukan array menghasilkan daftar kosong", () => {
    assert.deepEqual(sanitizeEmergencyContacts(undefined), []);
    assert.deepEqual(sanitizeEmergencyContacts({}), []);
  });
});

describe("pengaturan Info Desa", () => {
  it("default: anggaran tidak publik, tanpa kontak", () => {
    assert.deepEqual(readVillageInfoSettings(null), { budgetPublic: false, scorecardPublic: false, emergencyContacts: [], serviceHours: null });
    assert.equal(readVillageInfoSettings({ mobile: { info: { scorecardPublic: true } } }).scorecardPublic, true);
    assert.equal(readVillageInfoSettings({ mobile: { info: { budgetPublic: "true" } } }).budgetPublic, false);
    assert.equal(readVillageInfoSettings({ mobile: { info: { budgetPublic: true } } }).budgetPublic, true);
  });
  it("merge tidak menghapus kunci lain (web atau modul mobile lain)", () => {
    const before = { theme: "x", mobile: { social: { mode: "pre" }, info: { serviceHours: "Senin-Jumat 08.00-14.00" } } };
    const after = mergeVillageInfoSettings(before, { budgetPublic: true, emergencyContacts: [{ label: "Damkar", phone: "113" }] });
    assert.equal((after as { theme: string }).theme, "x");
    const mobile = (after as { mobile: Record<string, unknown> }).mobile;
    assert.deepEqual(mobile.social, { mode: "pre" });
    assert.deepEqual(mobile.info, { serviceHours: "Senin-Jumat 08.00-14.00", budgetPublic: true, emergencyContacts: [{ label: "Damkar", phone: "113" }] });
    assert.deepEqual(before.mobile.info, { serviceHours: "Senin-Jumat 08.00-14.00" }, "input tidak diubah");
  });
  it("jam layanan dirapikan dan dibatasi", () => {
    assert.equal(sanitizeServiceHours("  Senin   -  Jumat "), "Senin - Jumat");
    assert.equal(sanitizeServiceHours("   "), null);
    assert.equal(sanitizeServiceHours("x".repeat(500))?.length, 120);
    assert.equal(sanitizeServiceHours(5), null);
  });
});

describe("ringkasan anggaran", () => {
  it("menjumlahkan per kategori, urut anggaran terbesar, persen satu desimal", () => {
    const s = summarizeBudget([
      { category: "Infrastruktur", budgetAmount: 600, realizedAmount: 300 },
      { category: " Infrastruktur ", budgetAmount: 400, realizedAmount: 100 },
      { category: "Kesehatan", budgetAmount: 300, realizedAmount: 100 },
      { category: "", budgetAmount: 100, realizedAmount: 0 },
    ]);
    assert.equal(s.totalBudget, 1400);
    assert.equal(s.totalRealized, 500);
    assert.equal(s.percent, 35.7);
    assert.deepEqual(s.categories.map((c) => c.name), ["Infrastruktur", "Kesehatan", "Lainnya"]);
    assert.equal(s.categories[0].percent, 40);
  });
  it("angka rusak dianggap nol dan tidak membagi nol", () => {
    const s = summarizeBudget([
      { category: "A", budgetAmount: Number.NaN, realizedAmount: -5 },
      { category: "B", budgetAmount: 0, realizedAmount: 10 },
    ]);
    assert.equal(s.totalBudget, 0);
    assert.equal(s.percent, 0);
    assert.equal(summarizeBudget([]).categories.length, 0);
  });
});

describe("perangkat desa yang tampil", () => {
  const now = new Date("2026-10-24T00:00:00Z");
  const mk = (name: string, level: number, status = "active", endDate: Date | null = null) => ({ name, status, endDate, position: { level } });
  it("hanya aktif dan belum berakhir, urut jenjang lalu nama", () => {
    const out = visibleOfficials(
      [mk("Budi", 2), mk("Ani", 1), mk("Citra", 2), mk("Dedi", 1, "inactive"), mk("Eko", 1, "active", new Date("2026-01-01")), mk("Fajar", 1, "active", new Date("2027-01-01"))],
      now,
    );
    assert.deepEqual(out.map((o) => o.name), ["Ani", "Fajar", "Budi", "Citra"]);
  });
});
