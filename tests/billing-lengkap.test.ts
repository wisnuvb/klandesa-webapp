import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLegacyTier, lengkapLineItems, lengkapNextExpiry, parseRenewalMonths, visibleDesaTiers,
  LENGKAP_INCLUDED_ADDON_CODES, LENGKAP_INCLUDED_MODULE_IDS, LENGKAP_MONTHLY_FEE, LENGKAP_SETUP_FEE,
} from "../lib/billing/lengkap.ts";
import { BILLING_CATALOG, getDesaPackageCharge, mapDesaTierToAddonTier, arsipStorageLimitForDesaTierGb } from "../lib/billing/catalog.ts";

describe("harga Paket Lengkap", () => {
  it("pembelian pertama: satu baris Rp3,5 jt termasuk 12 bulan, tanpa tagihan tahunan tambahan", () => {
    const items = lengkapLineItems({ isRenewal: false });
    assert.equal(items.length, 1);
    assert.equal(items[0].totalAmount, 3_500_000);
    assert.equal(items[0].metadata.months, 12);
  });
  it("perpanjangan: Rp100rb per bulan, tanpa biaya awal", () => {
    for (const [m, total] of [[1, 100_000], [3, 300_000], [6, 600_000], [12, 1_200_000]] as const) {
      const [it] = lengkapLineItems({ isRenewal: true, months: m });
      assert.equal(it.totalAmount, total, `${m} bulan`);
      assert.equal(it.metadata.months, m);
    }
  });
  it("lama perpanjangan yang aneh dikembalikan ke 12 bulan (tidak bisa memilih harga sendiri)", () => {
    for (const bad of [0, -1, 2, 13, 1.5, "abc", null, undefined, Number.NaN, "6; DROP"]) assert.equal(parseRenewalMonths(bad), 12, String(bad));
    assert.equal(parseRenewalMonths("6"), 6);
    assert.equal(lengkapLineItems({ isRenewal: true, months: 999 })[0].totalAmount, 1_200_000);
  });
  it("angka di katalog sama dengan keputusan harga", () => {
    const t = BILLING_CATALOG.desa_package.tiers.lengkap;
    assert.equal(t.setupFee, LENGKAP_SETUP_FEE);
    assert.equal(LENGKAP_SETUP_FEE, 3_500_000);
    assert.equal(LENGKAP_MONTHLY_FEE, 100_000);
    assert.equal(t.annualFee, LENGKAP_MONTHLY_FEE * 12);
  });
  it("paket lama tidak berubah", () => {
    const tiers = BILLING_CATALOG.desa_package.tiers;
    assert.equal(tiers.starter.setupFee, 10_000_000);
    assert.equal(tiers.starter.annualFee, 1_200_000);
    assert.equal(tiers.profesional.setupFee, 45_000_000);
    assert.equal(tiers.enterprise.setupFee, 75_000_000);
  });
  it("pratinjau tagihan UI: beli pertama Rp3,5 jt; perpanjangan Rp1,2 jt (12 bulan)", () => {
    assert.equal(getDesaPackageCharge("lengkap", { subscriptionPaid: false, currentPlan: null }).totalAmount, 3_500_000);
    assert.equal(getDesaPackageCharge("lengkap", { subscriptionPaid: true, currentPlan: "lengkap" }).totalAmount, 1_200_000);
  });
  it("kuota arsip Paket Lengkap setara paket dasar (5 GB)", () => {
    assert.equal(mapDesaTierToAddonTier("lengkap"), "starter");
    assert.equal(arsipStorageLimitForDesaTierGb("lengkap"), 5);
  });
});

describe("masa berlaku", () => {
  const now = new Date(2026, 10, 24, 10, 0, 0);
  it("pembelian pertama: 12 bulan dari sekarang", () => {
    const e = lengkapNextExpiry({ now, currentExpiry: null, months: 12, isRenewal: false });
    assert.deepEqual([e.getFullYear(), e.getMonth(), e.getDate()], [2027, 10, 24]);
  });
  it("perpanjangan sebelum habis: disambung, sisa waktu tidak hangus", () => {
    const current = new Date(2027, 0, 15);
    const e = lengkapNextExpiry({ now, currentExpiry: current, months: 1, isRenewal: true });
    assert.deepEqual([e.getFullYear(), e.getMonth(), e.getDate()], [2027, 1, 15]);
  });
  it("perpanjangan setelah habis: dihitung dari sekarang", () => {
    const e = lengkapNextExpiry({ now, currentExpiry: new Date(2026, 5, 1), months: 3, isRenewal: true });
    assert.deepEqual([e.getFullYear(), e.getMonth(), e.getDate()], [2027, 1, 24]);
  });
  it("tanggal 31 tidak meloncat ke bulan berikutnya", () => {
    const e = lengkapNextExpiry({ now: new Date(2026, 0, 31), currentExpiry: null, months: 1, isRenewal: false });
    assert.deepEqual([e.getMonth(), e.getDate()], [1, 28]);
  });
});

describe("paket yang tampil di halaman Tagihan", () => {
  it("desa baru/trial/habis hanya melihat Paket Lengkap", () => {
    assert.deepEqual(visibleDesaTiers({ plan: "profesional", paid: false }), ["lengkap"]);
    assert.deepEqual(visibleDesaTiers({ plan: null, paid: false }), ["lengkap"]);
    assert.deepEqual(visibleDesaTiers({ plan: "starter", paid: false }), ["lengkap"]);
  });
  it("desa lama yang masih berbayar hanya melihat paketnya sendiri", () => {
    assert.deepEqual(visibleDesaTiers({ plan: "starter", paid: true }), ["starter"]);
    assert.deepEqual(visibleDesaTiers({ plan: "enterprise", paid: true }), ["enterprise"]);
  });
  it("desa Paket Lengkap berbayar melihat Paket Lengkap", () => assert.deepEqual(visibleDesaTiers({ plan: "lengkap", paid: true }), ["lengkap"]));
  it("pengenal paket lama", () => {
    assert.equal(isLegacyTier("Starter"), true);
    assert.equal(isLegacyTier("lengkap"), false);
    assert.equal(isLegacyTier(null), false);
  });
  it("semua modul fitur ikut Paket Lengkap (termasuk akses menu Website); AI dan arsip berbasis kapasitas tidak", () => {
    for (const id of ["partisipasi-rtrw", "keuangan", "bumdes", "pkk", "sdgs", "rpjmdes", "lingkungan", "pertanian", "peta-infrastruktur", "sinkronisasi-data", "website"]) {
      assert.equal(LENGKAP_INCLUDED_MODULE_IDS.has(id), true, id);
    }
    assert.equal(LENGKAP_INCLUDED_MODULE_IDS.has("asisten-ai"), false);
    assert.equal(LENGKAP_INCLUDED_MODULE_IDS.has("arsip"), false);
  });
  it("kode add-on yang dikunci untuk Paket Lengkap ada di katalog", () => {
    for (const code of LENGKAP_INCLUDED_ADDON_CODES) {
      assert.ok(code in BILLING_CATALOG.module_addon, code);
    }
  });
});

import { resolveModuleAccess } from "../lib/modules/entitlements.ts";

describe("hak akses modul Paket Lengkap", () => {
  const base = { subscriptionStatus: "active", subscriptionReadable: true, activeAddons: [] as { moduleCode: string; planCode: string | null; expiryDate: Date }[] };
  it("modul inti ikut paket; Kegiatan RT/RW ikut karena disebut di daftar", () => {
    assert.equal(resolveModuleAccess("data-warga", { ...base, subscriptionPlan: "lengkap" }).entitled, true);
    assert.equal(resolveModuleAccess("partisipasi-rtrw", { ...base, subscriptionPlan: "lengkap" }).entitled, true);
  });
  it("desa starter tetap tidak mendapat Kegiatan RT/RW (paket lama tidak berubah)", () => {
    assert.equal(resolveModuleAccess("partisipasi-rtrw", { ...base, subscriptionPlan: "starter" }).entitled, false);
  });
  it("semua modul fitur terbuka penuh: tanpa batas pemakaian dan tanpa tawaran add-on", () => {
    for (const id of ["keuangan", "bumdes", "pkk", "sdgs", "rpjmdes", "lingkungan", "pertanian", "partisipasi-rtrw", "peta-infrastruktur", "sinkronisasi-data"]) {
      const r = resolveModuleAccess(id, { ...base, subscriptionPlan: "lengkap" });
      assert.equal(r.entitled, true, id);
      assert.equal(r.source, "package", id);
      assert.equal(r.locked, false, id);
      assert.equal(r.hasResourceLimit, false, id);
      assert.equal(r.addonMonthlyFee, null, id);
    }
  });
  it("Website Desa: menu terbuka tanpa tawaran add-on modul (dibeli per template di menu Website)", () => {
    const w = resolveModuleAccess("website", { ...base, subscriptionPlan: "lengkap" });
    assert.equal(w.entitled, true);
    assert.equal(w.addonMonthlyFee, null);
    assert.equal(LENGKAP_INCLUDED_ADDON_CODES.has("website"), true);
  });
  it("desa Starter lama tidak berubah: Keuangan tetap terbatas dan masih ditawarkan sebagai add-on", () => {
    const keu = resolveModuleAccess("keuangan", { ...base, subscriptionPlan: "starter" });
    assert.equal(keu.entitled, true);
    assert.equal(keu.hasResourceLimit, true);
    assert.equal(resolveModuleAccess("lingkungan", { ...base, subscriptionPlan: "starter" }).entitled, false);
  });
  it("langganan tidak terbaca: terkunci", () => {
    assert.equal(resolveModuleAccess("data-warga", { ...base, subscriptionPlan: "lengkap", subscriptionReadable: false }).entitled, false);
  });
});

import { bumdesLimit, keuanganLimit, petaLimit, integrationsLimit, pkkLimit, sdgsLimit } from "../lib/modules/resource-limits.ts";

describe("batas pemakaian modul", () => {
  it("Paket Lengkap tanpa batas di semua modul", () => {
    assert.equal(keuanganLimit("lengkap", "active", false), null);
    assert.equal(bumdesLimit("lengkap", "active", false), null);
    assert.equal(pkkLimit("lengkap", "active", false), null);
    assert.equal(sdgsLimit("lengkap", "active", false), null);
    assert.equal(petaLimit("lengkap", "active", false), null);
    assert.equal(integrationsLimit("lengkap", "active", false), null);
  });
  it("Starter lama tetap dibatasi", () => {
    assert.deepEqual(keuanganLimit("starter", "active", false), { transaksiPerYear: 100 });
    assert.notEqual(petaLimit("starter", "active", false), null);
    assert.notEqual(integrationsLimit("starter", "active", false), null);
  });
});

import { effectivePackageTier } from "../lib/modules/entitlements.ts";

describe("trial Paket Lengkap", () => {
  it("trial berpaket lengkap tidak dinaikkan jadi profesional; trial paket lama tetap", () => {
    assert.equal(effectivePackageTier("lengkap", "trial"), "starter");
    assert.equal(effectivePackageTier("profesional", "trial"), "profesional");
    assert.equal(effectivePackageTier("starter", "trial"), "profesional");
  });
  it("desa trial mendapat hak yang sama dengan Lengkap aktif (tanpa batas, tanpa tawaran add-on)", () => {
    const trial = { subscriptionStatus: "trial", subscriptionReadable: true, activeAddons: [] as { moduleCode: string; planCode: string | null; expiryDate: Date }[], subscriptionPlan: "lengkap" };
    for (const id of ["keuangan", "bumdes", "sdgs", "peta-infrastruktur", "sinkronisasi-data", "website", "lingkungan"]) {
      const r = resolveModuleAccess(id, trial);
      assert.equal(r.entitled, true, id);
      assert.equal(r.hasResourceLimit, false, id);
      assert.equal(r.addonMonthlyFee, null, id);
    }
    assert.equal(petaLimit("lengkap", "trial", false), null);
    assert.equal(integrationsLimit("lengkap", "trial", false), null);
  });
  it("trial bukan pembelian: ditagih Rp3,5 jt walau plan 'lengkap' dan sudah punya expiry", () => {
    assert.equal(getDesaPackageCharge("lengkap", { subscriptionPaid: false, currentPlan: "lengkap", hasPurchasedLengkap: false }).totalAmount, 3_500_000);
    assert.equal(getDesaPackageCharge("lengkap", { subscriptionPaid: false, currentPlan: "lengkap", hasPurchasedLengkap: true }).totalAmount, 1_200_000);
  });
});
