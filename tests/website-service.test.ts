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

describe("email pemberitahuan pesanan lunas", () => {
  const base = {
    villageName: 'Desa <Karanganyar> & "Co"',
    villageCode: "KRG01",
    villagePhone: "08123456789",
    villageEmail: null,
    invoiceNumber: "INV-KRG01-1-ABC",
    amount: 1_900_000,
    paidAt: new Date("2026-11-10T03:00:00.000Z"),
    months: 12,
    expiry: new Date("2027-11-10T03:00:00.000Z"),
  };

  it("pesanan baru: subjek menyebut pesanan baru dan teks memuat desa, telepon, nominal, tagihan", async () => {
    const { buildWebsiteOrderEmail } = await import("../lib/website-service/order-notification.ts");
    const mail = buildWebsiteOrderEmail({ ...base, kind: "first" });
    assert.match(mail.subject, /Pesanan website baru/);
    assert.match(mail.text, /KRG01/);
    assert.match(mail.text, /08123456789/);
    assert.match(mail.text, /INV-KRG01-1-ABC/);
    assert.match(mail.text, /1\.900\.000/);
    assert.match(mail.text, /Email desa: -/);
  });

  it("perpanjangan: subjek berbeda dan menyebut lama perpanjangan", async () => {
    const { buildWebsiteOrderEmail } = await import("../lib/website-service/order-notification.ts");
    const mail = buildWebsiteOrderEmail({ ...base, kind: "renewal", months: 3 });
    assert.match(mail.subject, /Perpanjangan website/);
    assert.match(mail.text, /3 bulan/);
  });

  it("nama desa di-escape pada HTML", async () => {
    const { buildWebsiteOrderEmail } = await import("../lib/website-service/order-notification.ts");
    const mail = buildWebsiteOrderEmail({ ...base, kind: "first" });
    assert.ok(!mail.html.includes("<Karanganyar>"));
    assert.ok(mail.html.includes("&lt;Karanganyar&gt;"));
  });
});
