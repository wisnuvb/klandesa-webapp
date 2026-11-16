import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";
import {
  ADS_LANDING_PATH,
  ADS_PRICE,
  adsWhatsAppHref,
  summarizeAdAttribution,
} from "@/lib/marketing/ads-landing";
import { parsePixelId } from "@/lib/marketing/meta-pixel";
import { listStaticMarketingSitemapRoutes } from "@/lib/seo/landing-pages";

const pageSource = readFileSync(path.join(process.cwd(), "app", "(ads)", "desa-digital", "page.tsx"), "utf8");

test("harga di halaman iklan dibaca dari katalog billing, bukan ditulis ulang", () => {
  const l = BILLING_CATALOG.desa_package.tiers.lengkap;
  assert.equal(ADS_PRICE.setup, formatIdr(l.setupFee));
  assert.equal(ADS_PRICE.monthly, formatIdr(l.monthlyFee));
  assert.doesNotMatch(pageSource, /Rp\s?\d/, "halaman tidak boleh memuat angka rupiah tertulis");
});

test("halaman iklan noindex dan tidak ada di sitemap", () => {
  assert.match(pageSource, /index:\s*false/);
  const inSitemap = listStaticMarketingSitemapRoutes().some((r) => r.pathname === ADS_LANDING_PATH);
  assert.equal(inSitemap, false);
});

test("tautan WhatsApp memakai nomor CS dan pesan yang di-encode", () => {
  const href = adsWhatsAppHref();
  assert.match(href, /^https:\/\/wa\.me\/62\d+\?text=/);
  assert.doesNotMatch(href, /\s/);
});

test("ringkasan atribusi iklan hanya memuat UTM dan penanda fbclid, tanpa nilai fbclid", () => {
  assert.equal(summarizeAdAttribution(""), null);
  assert.equal(summarizeAdAttribution("?foo=bar"), null);
  const s = summarizeAdAttribution("?utm_source=facebook&utm_medium=paid&utm_campaign=desa-nov&fbclid=IwAR123SECRET&email=a@b.c");
  assert.equal(s, "utm_source=facebook, utm_medium=paid, utm_campaign=desa-nov, fbclid=ada");
  assert.doesNotMatch(s ?? "", /IwAR123SECRET|a@b\.c/);
});

test("ID Meta Pixel non-angka ditolak (aman untuk dipakai di skrip)", () => {
  assert.equal(parsePixelId(undefined), null);
  assert.equal(parsePixelId(""), null);
  assert.equal(parsePixelId("123456789012345'); alert(1);//"), null);
  assert.equal(parsePixelId("12ab"), null);
  assert.equal(parsePixelId(" 123456789012345 "), "123456789012345");
});
