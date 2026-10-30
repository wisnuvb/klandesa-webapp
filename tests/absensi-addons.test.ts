import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  capacityAddonPrice,
  effectiveAttendanceTier,
  effectiveStaffLimit,
  isGpsAddonActive,
  listCapacityOptions,
  nextCapacityExpiry,
  nextGpsAddonExpiry,
  validateCapacityPurchase,
} from "../lib/attendance/addons.ts";
import { buildLinkquCallbackUrl } from "../lib/linkqu/callback-url.ts";

const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
const now = new Date("2026-11-10T03:00:00.000Z");

describe("harga kapasitas absensi = selisih dari yang sudah termasuk", () => {
  it("Paket Lengkap (10 termasuk): 20 = Rp50rb, 30 = Rp100rb, 50 = Rp200rb", () => {
    assert.equal(capacityAddonPrice("lengkap", "professional"), 50_000);
    assert.equal(capacityAddonPrice("lengkap", "business"), 100_000);
    assert.equal(capacityAddonPrice("lengkap", "enterprise"), 200_000);
    assert.equal(capacityAddonPrice("lengkap", "starter"), 0);
  });
  it("desa tanpa tier absensi berbayar membayar harga tier penuh", () => {
    assert.equal(capacityAddonPrice(null, "starter"), 49_000);
  });
  it("kapasitas efektif = terbesar antara paket dan add-on aktif", () => {
    const addon = { code: "business" as const, expiresAt: new Date(now.getTime() + 86_400_000) };
    assert.equal(effectiveStaffLimit("lengkap", null), 10);
    assert.equal(effectiveStaffLimit("lengkap", addon), 30);
    assert.equal(effectiveStaffLimit("enterprise", addon), 50);
    assert.equal(effectiveAttendanceTier("profesional", { code: "starter", expiresAt: addon.expiresAt }), "TIER_11_20");
  });
});

describe("aturan pembelian kapasitas", () => {
  it("menolak kapasitas yang sudah termasuk atau kode tak dikenal", () => {
    assert.equal(validateCapacityPurchase({ plan: "lengkap", code: "starter", active: null }).ok, false);
    assert.equal(validateCapacityPurchase({ plan: "lengkap", code: "promax", active: null }).ok, false);
  });
  it("menolak turun kapasitas selama add-on lebih besar masih aktif, mengizinkan perpanjangan dan naik", () => {
    const active = { code: "business" as const, expiresAt: new Date(now.getTime() + 86_400_000) };
    assert.equal(validateCapacityPurchase({ plan: "lengkap", code: "professional", active }).ok, false);
    const renew = validateCapacityPurchase({ plan: "lengkap", code: "business", active });
    assert.ok(renew.ok && renew.isRenewal && renew.price === 100_000);
    const up = validateCapacityPurchase({ plan: "lengkap", code: "enterprise", active });
    assert.ok(up.ok && !up.isRenewal);
  });
  it("opsi untuk UI: status included/current/lower/available", () => {
    const active = { code: "business" as const, expiresAt: new Date(now.getTime() + 86_400_000) };
    const states = Object.fromEntries(listCapacityOptions("lengkap", active).map((o) => [o.code, o.state]));
    assert.deepEqual(states, { starter: "included", professional: "lower", business: "current", enterprise: "available" });
  });
  it("perpanjangan tier sama menyambung dari expiry; naik tier mulai dari sekarang", () => {
    const expiresAt = new Date("2026-11-20T03:00:00.000Z");
    assert.equal(nextCapacityExpiry({ now, active: { code: "business", expiresAt }, code: "business" }).toISOString(), "2026-12-20T03:00:00.000Z");
    assert.equal(nextCapacityExpiry({ now, active: { code: "business", expiresAt }, code: "enterprise" }).toISOString(), "2026-12-10T03:00:00.000Z");
    assert.equal(nextCapacityExpiry({ now, active: null, code: "professional" }).toISOString(), "2026-12-10T03:00:00.000Z");
  });
});

describe("add-on GPS bermasa berlaku", () => {
  it("NULL expiry = tanpa batas; lewat expiry = nonaktif; flag mati = nonaktif", () => {
    assert.equal(isGpsAddonActive({ absensiGpsAddonActive: true, absensiGpsAddonExpiry: null }, now.getTime()), true);
    assert.equal(isGpsAddonActive({ absensiGpsAddonActive: true, absensiGpsAddonExpiry: new Date("2026-11-01") }, now.getTime()), false);
    assert.equal(isGpsAddonActive({ absensiGpsAddonActive: true, absensiGpsAddonExpiry: new Date("2026-12-01") }, now.getTime()), true);
    assert.equal(isGpsAddonActive({ absensiGpsAddonActive: false, absensiGpsAddonExpiry: null }, now.getTime()), false);
  });
  it("perpanjangan menyambung dari expiry yang masih berlaku, kalau sudah lewat mulai dari sekarang", () => {
    assert.equal(nextGpsAddonExpiry({ now, currentExpiry: new Date("2026-11-20T03:00:00.000Z") }).toISOString(), "2026-12-20T03:00:00.000Z");
    assert.equal(nextGpsAddonExpiry({ now, currentExpiry: new Date("2026-11-01T03:00:00.000Z") }).toISOString(), "2026-12-10T03:00:00.000Z");
    assert.equal(nextGpsAddonExpiry({ now, currentExpiry: null }).toISOString(), "2026-12-10T03:00:00.000Z");
  });
});

describe("url_callback dinamis dari host permintaan", () => {
  it("memakai X-Forwarded-Host + https untuk host publik", () => {
    assert.equal(
      buildLinkquCallbackUrl(h({ "x-forwarded-host": "my.klandesa.id", host: "127.0.0.1:3000", "x-forwarded-proto": "http" })),
      "https://my.klandesa.id/api/billing/linkqu/callback",
    );
  });
  it("host lokal (my.localhost:2042) tetap http kecuali proxy bilang https", () => {
    assert.equal(buildLinkquCallbackUrl(h({ host: "my.localhost:2042" })), "http://my.localhost:2042/api/billing/linkqu/callback");
    assert.equal(
      buildLinkquCallbackUrl(h({ host: "my.localhost:2042", "x-forwarded-proto": "https" })),
      "https://my.localhost:2042/api/billing/linkqu/callback",
    );
  });
  it("menolak host kosong atau berbentuk tidak valid (header injection)", () => {
    assert.equal(buildLinkquCallbackUrl(h({})), null);
    assert.equal(buildLinkquCallbackUrl(h({ host: "evil.com/path?x=" })), null);
    assert.equal(buildLinkquCallbackUrl(h({ host: "a b" })), null);
  });
});

import { addMonths, monthsFromInvoiceItems, parseDurationMonths, priceForMonths } from "../lib/billing/duration.ts";

describe("durasi langganan", () => {
  it("hanya 1/3/6/12 yang valid; kosong = 1; selain itu ditolak", () => {
    assert.equal(parseDurationMonths(undefined), 1);
    assert.equal(parseDurationMonths(""), 1);
    assert.equal(parseDurationMonths("6"), 6);
    assert.equal(parseDurationMonths(12), 12);
    assert.equal(parseDurationMonths(2), null);
    assert.equal(parseDurationMonths(-1), null);
    assert.equal(parseDurationMonths("abc"), null);
  });
  it("harga linear (tanpa diskon) dan dibulatkan", () => {
    assert.equal(priceForMonths(50_000, 1), 50_000);
    assert.equal(priceForMonths(50_000, 3), 150_000);
    assert.equal(priceForMonths(49_000, 12), 588_000);
  });
  it("masa berlaku: perpanjangan menyambung, N bulan, akhir bulan aman", () => {
    const expiresAt = new Date("2026-11-20T03:00:00.000Z");
    assert.equal(nextCapacityExpiry({ now, active: { code: "business", expiresAt }, code: "business", months: 6 }).toISOString(), "2027-05-20T03:00:00.000Z");
    assert.equal(nextCapacityExpiry({ now, active: null, code: "business", months: 12 }).toISOString(), "2027-11-10T03:00:00.000Z");
    assert.equal(nextGpsAddonExpiry({ now, currentExpiry: null, months: 3 }).toISOString(), "2027-02-10T03:00:00.000Z");
    assert.equal(addMonths(new Date("2026-08-31T00:00:00.000Z"), 6).toISOString().slice(0, 10), "2027-02-28");
  });
});

describe("callback mengaktifkan sesuai durasi yang dibayar", () => {
  it("durasi dibaca dari baris tagihan; tanpa catatan atau nilai aneh = 1 bulan", () => {
    assert.equal(monthsFromInvoiceItems([{ metadata: { kind: "absensi_capacity_monthly", months: 3 } }]), 3);
    assert.equal(monthsFromInvoiceItems([{ metadata: null }, { metadata: { months: 12 } }]), 12);
    assert.equal(monthsFromInvoiceItems([{ metadata: { kind: "monthly_fee" } }]), 1);
    assert.equal(monthsFromInvoiceItems([{ metadata: { months: 7 } }]), 1);
    assert.equal(monthsFromInvoiceItems([]), 1);
  });
  it("beli 3 bulan lalu callback: GPS aktif tepat 3 bulan, perpanjangan 3 bulan menyambung sisa", () => {
    const months = monthsFromInvoiceItems([{ metadata: { months: 3 } }]);
    assert.equal(nextGpsAddonExpiry({ now, currentExpiry: null, months }).toISOString(), "2027-02-10T03:00:00.000Z");
    assert.equal(
      nextGpsAddonExpiry({ now, currentExpiry: new Date("2026-11-20T03:00:00.000Z"), months }).toISOString(),
      "2027-02-20T03:00:00.000Z",
    );
  });
});

import { PAYMENT_GATEWAY_DOWN_ERROR, PAYMENT_GENERIC_ERROR, toUserFacingError } from "../lib/billing/user-error.ts";
import { Prisma } from "@prisma/client";

describe("pesan error pembayaran ramah pengguna", () => {
  it("error Prisma (mis. kolom tidak dikenal) tidak bocor ke pengguna", () => {
    const e = new Prisma.PrismaClientValidationError("Invalid `prisma.village.findUnique()` invocation ... Unknown field `absensiGpsAddonExpiry`", {
      clientVersion: "test",
    });
    const r = toUserFacingError(e, "test");
    assert.equal(r.message, PAYMENT_GENERIC_ERROR);
    assert.equal(r.status, 500);
    assert.ok(!r.message.includes("Prisma") && !r.message.includes("prisma"));
  });
  it("gangguan jaringan / timeout ke LinkQu = pesan layanan sibuk", () => {
    assert.equal(toUserFacingError(new TypeError("fetch failed"), "t").message, PAYMENT_GATEWAY_DOWN_ERROR);
    const timeout = new Error("The operation was aborted due to timeout");
    timeout.name = "TimeoutError";
    assert.equal(toUserFacingError(timeout, "t").status, 503);
    assert.equal(toUserFacingError(new Error("Linkqu API error: 522"), "t").message, PAYMENT_GATEWAY_DOWN_ERROR);
  });
  it("signature tidak valid dan env hilang tidak ditampilkan mentah", () => {
    assert.equal(toUserFacingError(new Error("Signature Not Valid"), "t").message, PAYMENT_GENERIC_ERROR);
    assert.notEqual(toUserFacingError(new Error("Missing env: LINKQU_PIN"), "t").message, "Missing env: LINKQU_PIN");
  });
  it("pesan bisnis berbahasa Indonesia diteruskan apa adanya dengan status 400", () => {
    const msg = "Kapasitas 10 perangkat sudah termasuk di paket Anda (10 perangkat).";
    assert.deepEqual(toUserFacingError(new Error(msg), "t"), { message: msg, status: 400 });
  });
});

describe("petunjuk developer untuk error skema/klien Prisma usang", () => {
  it("di development, pesan memuat langkah perbaikan; di luar itu tidak bocor", () => {
    const e = new Prisma.PrismaClientValidationError("Unknown field `absensiGpsAddonExpiry` for select statement", { clientVersion: "t" });
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    try {
      env.NODE_ENV = "development";
      assert.match(toUserFacingError(e, "t").message, /RESTART server dev/);
      env.NODE_ENV = "production";
      assert.equal(toUserFacingError(e, "t").message, PAYMENT_GENERIC_ERROR);
    } finally {
      env.NODE_ENV = prev;
    }
  });
});

import { evaluateCheckoutChannel, evaluateLinkquChannel, listLinkquPaymentOptions } from "../lib/payment/linkqu-channels.ts";
import { isChannelInactiveResponse, markChannelUnavailable, resetChannelHealth } from "../lib/payment/channel-health.ts";

describe("ketersediaan kanal pembayaran", () => {
  const env = process.env as Record<string, string | undefined>;
  const reset = () => {
    delete env.LINKQU_DISABLED_CHANNELS;
    resetChannelHealth();
  };

  it("batas nominal per jenis kanal: e-wallet maks Rp2,5 jt, QRIS boleh sampai Rp20 jt", () => {
    reset();
    assert.equal(evaluateLinkquChannel("PAYDANA", "EWALLET", 3_500_000).available, false);
    assert.match(evaluateLinkquChannel("PAYDANA", "EWALLET", 3_500_000).reason ?? "", /Maksimum Rp 2\.500\.000/);
    assert.equal(evaluateLinkquChannel("PAYDANA", "EWALLET", 10_000).reason, "Minimum Rp 15.000");
    assert.equal(evaluateLinkquChannel("QRIS", "QRIS", 3_500_000).available, true);
    assert.equal(evaluateLinkquChannel("VA_BRI", "VA", 3_500_000).available, true);
  });

  it("LINKQU_DISABLED_CHANNELS menutup kanal; PAYSHOPEE = alias PAYSHOPEEPAY", () => {
    reset();
    env.LINKQU_DISABLED_CHANNELS = " va_danamon , PAYSHOPEE ";
    const o = listLinkquPaymentOptions(50_000);
    assert.equal(o.banks.find((b) => b.id === "danamon")?.available, false);
    assert.equal(o.banks.find((b) => b.id === "bri")?.available, true);
    assert.equal(o.ewallets.find((w) => w.id === "shopeepay")?.available, false);
    assert.equal(o.ewallets.find((w) => w.id === "dana")?.available, true);
    assert.equal(o.methods.va.available, true);
    reset();
  });

  it("metode tidak tersedia bila semua kanalnya tidak tersedia, dengan alasan", () => {
    reset();
    const o = listLinkquPaymentOptions(3_500_000);
    assert.equal(o.methods.ewallet.available, false);
    assert.match(o.methods.ewallet.reason ?? "", /Maksimum/);
    assert.equal(o.methods.qris.available, true);
  });

  it("kanal yang baru ditolak LinkQu disembunyikan sementara, lalu pulih setelah TTL", () => {
    reset();
    const t0 = 1_000_000;
    markChannelUnavailable("PAYSHOPEEPAY", "Sedang tidak tersedia, coba lagi nanti", t0, 60_000);
    assert.equal(evaluateLinkquChannel("PAYSHOPEEPAY", "EWALLET", 50_000, t0 + 1_000).available, false);
    assert.equal(evaluateLinkquChannel("PAYSHOPEEPAY", "EWALLET", 50_000, t0 + 61_000).available, true);
    reset();
  });

  it("hanya penolakan 'kanal tidak aktif' yang menandai kanal (bukan salah parameter)", () => {
    assert.equal(isChannelInactiveResponse({ response_code: "99", response_desc: "Bank Not Supported" }), true);
    assert.equal(isChannelInactiveResponse({ response_code: "43", response_desc: "" }), true);
    assert.equal(isChannelInactiveResponse({ response_code: "01", response_desc: "Parameter Not Valid" }), false);
    assert.equal(isChannelInactiveResponse(undefined), false);
  });

  it("server menolak checkout ke kanal yang tidak tersedia memakai nominal resmi", () => {
    reset();
    const r = evaluateCheckoutChannel({ paymentMethod: "ewallet", retailCode: "PAYDANA" }, 3_500_000);
    assert.equal(r.available, false);
    assert.equal(r.label, "DANA");
    assert.equal(evaluateCheckoutChannel({ paymentMethod: "va", bankCode: "999" }, 50_000).available, false);
    assert.equal(evaluateCheckoutChannel({ paymentMethod: "qris" }, 50_000).available, true);
  });
});

import { displayInvoiceStatus, invoiceStatusWhere } from "../lib/billing/invoice-filters.ts";

describe("riwayat tagihan: status tampilan & filter", () => {
  const t = new Date("2026-11-10T03:00:00.000Z");
  it("pending yang lewat batas bayar tampil sebagai kedaluwarsa; lainnya apa adanya", () => {
    assert.equal(displayInvoiceStatus("pending", new Date("2026-11-10T02:00:00.000Z"), t.getTime()), "expired");
    assert.equal(displayInvoiceStatus("pending", new Date("2026-11-10T04:00:00.000Z"), t.getTime()), "pending");
    assert.equal(displayInvoiceStatus("pending", null, t.getTime()), "pending");
    assert.equal(displayInvoiceStatus("PAID", new Date("2020-01-01"), t.getTime()), "paid");
  });
  it("filter 'kedaluwarsa' mencakup pending yang sudah lewat; 'menunggu' hanya yang masih berlaku", () => {
    assert.deepEqual(invoiceStatusWhere("expired", t), { OR: [{ status: "expired" }, { status: "pending", expiresAt: { lte: t } }] });
    assert.deepEqual(invoiceStatusWhere("pending", t), { status: "pending", OR: [{ expiresAt: null }, { expiresAt: { gt: t } }] });
    assert.deepEqual(invoiceStatusWhere("paid", t), { status: "paid" });
  });
});

import { isKnownLinkquChannelCode, listAllLinkquChannels } from "../lib/payment/linkqu-channels.ts";

describe("status kanal dari panel admin", () => {
  it("kanal yang dimatikan admin tidak tersedia di dialog maupun checkout; kanal lain tidak terpengaruh", () => {
    const off = new Set(["VA_BRI", "PAYDANA"]);
    const o = listLinkquPaymentOptions(49_000, off);
    assert.equal(o.banks.find((b) => b.id === "bri")?.available, false);
    assert.equal(o.banks.find((b) => b.id === "bca")?.available, true);
    assert.equal(o.ewallets.find((w) => w.id === "dana")?.available, false);
    assert.equal(o.ewallets.find((w) => w.id === "linkaja")?.available, true);
    assert.equal(o.methods.va.available, true);
    assert.equal(evaluateCheckoutChannel({ paymentMethod: "va", bankCode: "002" }, 49_000, off).available, false);
    assert.equal(evaluateCheckoutChannel({ paymentMethod: "va", bankCode: "014" }, 49_000, off).available, true);
  });
  it("metode tidak tersedia bila semua kanalnya dimatikan admin", () => {
    const offAllWallets = new Set(["PAYDANA", "PAYLINKAJA", "PAYSHOPEEPAY"]);
    const o = listLinkquPaymentOptions(49_000, offAllWallets);
    assert.equal(o.methods.ewallet.available, false);
    assert.equal(o.methods.ewallet.reason, "Sedang tidak tersedia");
    assert.equal(o.methods.qris.available, true);
  });
  it("registri kanal: kode unik dan dikenali (dipakai validasi API admin)", () => {
    const all = listAllLinkquChannels();
    assert.equal(new Set(all.map((c) => c.code)).size, all.length);
    assert.ok(all.every((c) => isKnownLinkquChannelCode(c.code)));
    assert.equal(isKnownLinkquChannelCode("VA_XYZ"), false);
    assert.deepEqual([...new Set(all.map((c) => c.method))].sort(), ["ewallet", "qris", "va"]);
  });
});
