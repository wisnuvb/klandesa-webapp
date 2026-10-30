import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BILLING_CATALOG } from "../lib/billing/catalog.ts";
import {
  isWebsiteCustomActive,
  nextWebsiteCustomExpiry,
  websiteCustomLineItems,
} from "../lib/website-service/subscription.ts";
import { monthsFromInvoiceItems } from "../lib/billing/duration.ts";

const now = new Date("2026-11-10T03:00:00.000Z");
const day = 86_400_000;
const { setupFee, monthlyFee } = BILLING_CATALOG.website_custom;

describe("tagihan layanan Website Desa Kustom", () => {
  it("pembelian pertama: satu baris biaya awal untuk 12 bulan, durasi dari klien diabaikan", () => {
    const items = websiteCustomLineItems({ isRenewal: false, months: 1 });
    assert.equal(items.length, 1);
    assert.equal(items[0].totalAmount, setupFee);
    assert.equal(items[0].metadata.kind, "website_custom_first_term");
    assert.equal(monthsFromInvoiceItems(items), 12);
  });

  it("perpanjangan: biaya bulanan x lama yang dipilih, tanpa biaya awal lagi", () => {
    for (const months of [1, 3, 6, 12]) {
      const items = websiteCustomLineItems({ isRenewal: true, months });
      assert.equal(items.length, 1);
      assert.equal(items[0].totalAmount, monthlyFee * months);
      assert.equal(items[0].metadata.kind, "website_custom_renewal");
      assert.equal(monthsFromInvoiceItems(items), months);
    }
  });

  it("perpanjangan tanpa durasi = 1 bulan; durasi di luar pilihan ditolak", () => {
    assert.equal(websiteCustomLineItems({ isRenewal: true })[0].totalAmount, monthlyFee);
    assert.throws(() => websiteCustomLineItems({ isRenewal: true, months: 7 }), /Durasi/);
  });
});

describe("masa aktif layanan", () => {
  it("aktif hanya bila status active dan belum lewat expiry", () => {
    const future = new Date(now.getTime() + day);
    const past = new Date(now.getTime() - day);
    assert.equal(isWebsiteCustomActive({ status: "active", expiryDate: future }, now.getTime()), true);
    assert.equal(isWebsiteCustomActive({ status: "active", expiryDate: past }, now.getTime()), false);
    assert.equal(isWebsiteCustomActive({ status: "inactive", expiryDate: future }, now.getTime()), false);
    assert.equal(isWebsiteCustomActive(null, now.getTime()), false);
  });

  it("pembelian pertama dan yang sudah habis dihitung dari sekarang", () => {
    const first = nextWebsiteCustomExpiry({ now, currentExpiry: null, months: 12 });
    assert.equal(first.toISOString().slice(0, 10), "2027-11-10");
    const lapsed = nextWebsiteCustomExpiry({ now, currentExpiry: new Date(now.getTime() - 5 * day), months: 3 });
    assert.equal(lapsed.toISOString().slice(0, 10), "2027-02-10");
  });

  it("perpanjangan menyambung sisa masa aktif", () => {
    const current = new Date("2027-01-15T03:00:00.000Z");
    const next = nextWebsiteCustomExpiry({ now, currentExpiry: current, months: 1 });
    assert.equal(next.toISOString().slice(0, 10), "2027-02-15");
  });
});
