import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  arsipBaseGbForPlan,
  arsipGbForPlanCode,
  computeStorageLimitGb,
  isArsipAddonActive,
  nextArsipExpiry,
  normalizeVillagePlanToDesaTier,
  validateArsipPurchase,
} from "../lib/digitalArchive/storage-limit.ts";

const DAY = 86_400_000;
const now = new Date("2026-11-10T03:00:00.000Z");
const plus = (d: number) => new Date(now.getTime() + d * DAY);

describe("kuota arsip berlangganan", () => {
  it("kuota dasar per paket: Lengkap 5 GB, paket lama tidak berubah", () => {
    assert.equal(arsipBaseGbForPlan("lengkap"), 5);
    assert.equal(arsipBaseGbForPlan("starter"), 5);
    assert.equal(arsipBaseGbForPlan("profesional"), 20);
    assert.equal(arsipBaseGbForPlan("enterprise"), 100);
    assert.equal(normalizeVillagePlanToDesaTier("Lengkap"), "lengkap");
  });
  it("kuota = terbesar dari nilai tersimpan, dasar paket, dan add-on aktif", () => {
    assert.equal(computeStorageLimitGb({ plan: "lengkap", storedGb: 5, activeAddonGb: 0 }), 5);
    assert.equal(computeStorageLimitGb({ plan: "lengkap", storedGb: 5, activeAddonGb: 50 }), 50);
    assert.equal(computeStorageLimitGb({ plan: "lengkap", storedGb: 20, activeAddonGb: 0 }), 20);
    assert.equal(computeStorageLimitGb({ plan: "profesional", storedGb: 1, activeAddonGb: 0 }), 20);
  });
  it("setelah add-on berakhir kuota kembali ke dasar (add-on tidak lagi dihitung)", () => {
    assert.equal(isArsipAddonActive({ status: "active", expiryDate: plus(3) }, now.getTime()), true);
    assert.equal(isArsipAddonActive({ status: "active", expiryDate: plus(-1) }, now.getTime()), false);
    assert.equal(isArsipAddonActive({ status: "expired", expiryDate: plus(3) }, now.getTime()), false);
    assert.equal(isArsipAddonActive(null), false);
    assert.equal(computeStorageLimitGb({ plan: "lengkap", storedGb: 5, activeAddonGb: 0 }), 5);
  });
  it("kode tier arsip dikenali; yang tidak dikenal = 0 GB", () => {
    assert.equal(arsipGbForPlanCode("professional"), 20);
    assert.equal(arsipGbForPlanCode("promax"), 250);
    assert.equal(arsipGbForPlanCode("nope"), 0);
    assert.equal(arsipGbForPlanCode(null), 0);
  });
});

describe("aturan pembelian add-on arsip", () => {
  it("kapasitas yang sudah termasuk tidak dijual (5 GB untuk Lengkap)", () => {
    const r = validateArsipPurchase({ plan: "lengkap", tierCode: "starter", active: null });
    assert.equal(r.ok, false);
    assert.equal(validateArsipPurchase({ plan: "lengkap", tierCode: "professional", active: null }).ok, true);
    assert.equal(validateArsipPurchase({ plan: "profesional", tierCode: "professional", active: null }).ok, false);
  });
  it("saat add-on aktif: boleh perpanjang yang sama atau naik; turun ditolak", () => {
    const active = { planCode: "business", expiryDate: plus(10) };
    assert.equal(validateArsipPurchase({ plan: "lengkap", tierCode: "business", active }).ok, true);
    assert.equal(validateArsipPurchase({ plan: "lengkap", tierCode: "enterprise", active }).ok, true);
    const down = validateArsipPurchase({ plan: "lengkap", tierCode: "professional", active });
    assert.equal(down.ok, false);
    assert.match(down.ok ? "" : down.error, /50 GB/);
  });
  it("tier tidak valid ditolak", () => {
    assert.equal(validateArsipPurchase({ plan: "lengkap", tierCode: "zzz", active: null }).ok, false);
  });
});

describe("masa berlaku add-on arsip", () => {
  it("pembelian baru: 1 bulan dari sekarang", () => {
    const e = nextArsipExpiry({ now, active: null, tierCode: "professional" });
    assert.equal(e.toISOString().slice(0, 10), "2026-12-10");
  });
  it("perpanjangan kapasitas yang sama menyambung sisa waktu", () => {
    const active = { planCode: "professional", expiryDate: new Date("2026-11-20T03:00:00.000Z") };
    assert.equal(nextArsipExpiry({ now, active, tierCode: "professional" }).toISOString().slice(0, 10), "2026-12-20");
  });
  it("upgrade mulai dari sekarang, bukan menyambung", () => {
    const active = { planCode: "professional", expiryDate: new Date("2026-11-20T03:00:00.000Z") };
    assert.equal(nextArsipExpiry({ now, active, tierCode: "business" }).toISOString().slice(0, 10), "2026-12-10");
  });
  it("akhir bulan tidak meluncur ke bulan berikutnya (31 Jan + 1 bulan = 28 Feb)", () => {
    const n = new Date("2027-01-31T03:00:00.000Z");
    assert.equal(nextArsipExpiry({ now: n, active: null, tierCode: "professional" }).toISOString().slice(0, 10), "2027-02-28");
  });
});
