import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyVillageStatus, fillSeries, pctChange, ratio, toNum, daysUntil } from "../lib/platform/metrics/aggregate.ts";
import { buildAttention, type AttentionRaw } from "../lib/platform/metrics/attention.ts";
import {
  formatDateTimeWib, formatDaysLeft, formatDeltaPercent, formatMonthKey, formatNumberId, formatPercent, formatRupiah, formatRupiahCompact, formatSortableWib,
} from "../lib/platform/metrics/format.ts";
import {
  buildInvoiceCsv, INVOICE_CSV_HEADERS, invoiceListSelect, invoiceListWhere, parseInvoiceQuery, productLabel, type InvoiceListItem,
} from "../lib/platform/metrics/invoices.ts";
import { computeMrr } from "../lib/platform/metrics/mrr.ts";
import {
  last12MonthBuckets, parseRevenueRange, resolveMonthComparison, resolveRevenueRange, wibDayKey, wibMonthKey, wibParts, wibStartOfDay, wibStartOfMonth,
} from "../lib/platform/metrics/period.ts";

const D = (iso: string) => new Date(iso);

describe("periode WIB", () => {
  it("batas bulan: 31 Jan 17:30 UTC sudah 1 Feb WIB; 31 Jan 16:59 UTC masih Januari", () => {
    assert.equal(wibMonthKey(D("2031-01-31T17:30:00Z")), "2031-02");
    assert.equal(wibMonthKey(D("2031-01-31T16:59:59Z")), "2031-01");
    assert.equal(wibDayKey(D("2031-01-31T17:00:00Z")), "2031-02-01");
    assert.equal(wibDayKey(D("2026-12-31T16:59:59Z")), "2026-12-31");
    assert.equal(wibMonthKey(D("2026-12-31T17:00:00Z")), "2027-01");
  });
  it("awal hari/bulan WIB dalam UTC", () => {
    assert.equal(wibStartOfDay(D("2026-11-06T02:25:00Z")).toISOString(), "2026-11-05T17:00:00.000Z");
    assert.equal(wibStartOfMonth(2026, 11).toISOString(), "2026-10-31T17:00:00.000Z");
    assert.equal(wibStartOfMonth(2026, 13).toISOString(), "2026-12-31T17:00:00.000Z");
    assert.deepEqual(wibParts(D("2026-11-06T02:25:00Z")), { year: 2026, month: 11, day: 6, hour: 9, minute: 25 });
  });
  it("parseRevenueRange hanya menerima 4 nilai", () => {
    for (const ok of ["30d", "90d", "12m", "ytd"]) assert.equal(parseRevenueRange(ok), ok);
    for (const bad of ["7d", "", null, undefined, "30D", 30]) assert.equal(parseRevenueRange(bad), null);
  });
  it("30d: 30 bucket harian berurutan, terakhir = hari ini WIB, batas eksklusif = besok 00:00 WIB", () => {
    const now = D("2026-11-06T20:00:00Z"); // 7 Nov 03:00 WIB
    const r = resolveRevenueRange("30d", now);
    assert.equal(r.buckets.length, 30);
    assert.equal(r.buckets[29].key, "2026-11-07");
    assert.equal(r.buckets[0].key, "2026-10-09");
    assert.equal(r.to.toISOString(), "2026-11-07T17:00:00.000Z");
    assert.equal(r.prevTo.getTime(), r.from.getTime());
    assert.equal(r.prevTo.getTime() - r.prevFrom.getTime(), r.to.getTime() - r.from.getTime());
    for (let i = 1; i < r.buckets.length; i++) assert.equal(r.buckets[i].start.getTime(), r.buckets[i - 1].end.getTime());
  });
  it("12m: 12 bucket bulanan melewati pergantian tahun, terakhir = bulan berjalan", () => {
    const r = resolveRevenueRange("12m", D("2027-02-10T05:00:00Z"));
    assert.deepEqual(r.buckets.map((b) => b.key), ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
    assert.equal(r.buckets[0].label, "Mar 26");
    assert.equal(r.granularity, "month");
    assert.equal(r.prevTo.getTime(), r.from.getTime());
  });
  it("ytd: Januari s.d. bulan berjalan; pembanding = rentang sama tahun lalu", () => {
    const r = resolveRevenueRange("ytd", D("2026-11-06T02:00:00Z"));
    assert.equal(r.buckets.length, 11);
    assert.equal(r.buckets[0].key, "2026-01");
    assert.equal(r.prevFrom.toISOString(), wibStartOfMonth(2025, 1).toISOString());
    assert.equal(r.prevTo.toISOString(), wibStartOfMonth(2025, 12).toISOString());
    const jan = resolveRevenueRange("ytd", D("2027-01-01T00:00:00Z")); // 1 Jan 07:00 WIB
    assert.equal(jan.buckets.length, 1);
  });
  it("ytd pada 1 Jan 00:30 WIB (31 Des 17:30 UTC) sudah tahun baru", () => {
    const r = resolveRevenueRange("ytd", D("2026-12-31T17:30:00Z"));
    assert.equal(r.buckets[0].key, "2027-01");
    assert.equal(r.buckets.length, 1);
  });
  it("perbandingan bulan: bulan lalu dipotong pada panjang waktu yang sama, tidak melewati akhir bulan lalu", () => {
    const c = resolveMonthComparison(D("2026-03-10T05:00:00Z")); // Maret baru berjalan 9 hari lebih
    assert.equal(c.lastStart.toISOString(), wibStartOfMonth(2026, 2).toISOString());
    assert.ok(c.lastSamePeriodEnd.getTime() <= c.lastEnd.getTime());
    const c2 = resolveMonthComparison(D("2026-03-31T10:00:00Z")); // Feb hanya 28 hari: dipotong di awal Maret
    assert.equal(c2.lastSamePeriodEnd.getTime(), c2.lastEnd.getTime());
  });
  it("last12MonthBuckets berisi 12 kunci unik", () => {
    const b = last12MonthBuckets(D("2026-11-06T02:00:00Z"));
    assert.equal(new Set(b.map((x) => x.key)).size, 12);
    assert.equal(b[11].key, "2026-11");
  });
});

describe("agregasi murni", () => {
  it("fillSeries mengisi bucket kosong dengan 0 dan mengabaikan kunci di luar bucket", () => {
    const b = resolveRevenueRange("12m", D("2026-11-06T02:00:00Z")).buckets;
    const s = fillSeries(b, [{ key: "2026-11", amount: 3_500_000, count: 1 }, { key: "2026-11", amount: 100_000, count: 1 }, { key: "1999-01", amount: 9, count: 9 }]);
    assert.equal(s.length, 12);
    assert.deepEqual([s[11].amount, s[11].count], [3_600_000, 2]);
    assert.equal(s.reduce((t, p) => t + p.amount, 0), 3_600_000);
    assert.equal(s[0].amount, 0);
  });
  it("pctChange/ratio: pembanding 0 = null (bukan 0%)", () => {
    assert.equal(pctChange(150, 100), 0.5);
    assert.equal(pctChange(50, 100), -0.5);
    assert.equal(pctChange(10, 0), null);
    assert.equal(ratio(1, 4), 0.25);
    assert.equal(ratio(0, 0), null);
    assert.equal(ratio(3, 0), null);
  });
  it("toNum menangani BigInt/Decimal-string/null", () => {
    assert.equal(toNum(12n), 12);
    assert.equal(toNum("3500000.00"), 3_500_000);
    assert.equal(toNum(null), 0);
    assert.equal(toNum({ toString: () => "7.5" }), 7.5);
    assert.equal(toNum(Number.NaN), 0);
  });
  it("daysUntil membulatkan ke atas, minimal 0", () => {
    const now = D("2026-11-06T00:00:00Z");
    assert.equal(daysUntil(D("2026-11-06T00:00:01Z"), now), 1);
    assert.equal(daysUntil(D("2026-11-09T00:00:00Z"), now), 3);
    assert.equal(daysUntil(D("2026-11-01T00:00:00Z"), now), 0);
  });
});

describe("klasifikasi status langganan desa", () => {
  const now = D("2026-11-06T00:00:00Z");
  const day = 86_400_000;
  const v = (subscriptionStatus: string, offsetDays: number | null, isActive = true) => ({
    isActive, subscriptionStatus, subscriptionExpiry: offsetDays == null ? null : new Date(now.getTime() + offsetDays * day),
  });
  it("kelas mengikuti status + tanggal (transisi DB malas)", () => {
    assert.equal(classifyVillageStatus(v("active", 30), now), "aktif");
    assert.equal(classifyVillageStatus(v("active", null), now), "aktif");
    assert.equal(classifyVillageStatus(v("ACTIVE", 5), now), "aktif");
    assert.equal(classifyVillageStatus(v("active", -1), now), "kedaluwarsa");
    assert.equal(classifyVillageStatus(v("trial", 3), now), "trial");
    assert.equal(classifyVillageStatus(v("trial", -2), now), "tenggang");
    assert.equal(classifyVillageStatus(v("trial", -8), now), "kedaluwarsa");
    assert.equal(classifyVillageStatus(v("grace", 2), now), "tenggang");
    assert.equal(classifyVillageStatus(v("grace", -1), now), "kedaluwarsa");
    assert.equal(classifyVillageStatus(v("inactive", null), now), "kedaluwarsa");
    assert.equal(classifyVillageStatus(v("cancelled", 10), now), "nonaktif");
    assert.equal(classifyVillageStatus(v("active", 10, false), now), "nonaktif");
  });
});

describe("estimasi MRR/ARR", () => {
  it("Paket Lengkap: tahun pertama = Rp3,5 jt ÷ 12; perpanjangan = Rp100.000", () => {
    const r = computeMrr({ packages: [{ plan: "lengkap", firstYear: true, everPaid: true, count: 2 }, { plan: "lengkap", firstYear: false, everPaid: true, count: 3 }], modules: [], gpsAddonVillages: 0 });
    assert.equal(r.mrr, Math.round(2 * (3_500_000 / 12)) + 300_000);
    assert.equal(r.arr, r.mrr * 12);
    assert.equal(r.activeVillages, 5);
    assert.equal(r.activeWithoutPaidInvoice, 0);
  });
  it("paket lama: biaya tahunan ÷ 12; paket tak dikenal tidak dikarang harganya", () => {
    const r = computeMrr({
      packages: [
        { plan: "starter", firstYear: false, everPaid: false, count: 1 },
        { plan: "Profesional", firstYear: false, everPaid: true, count: 1 },
        { plan: "enterprise", firstYear: false, everPaid: true, count: 1 },
        { plan: "misterius", firstYear: false, everPaid: true, count: 4 },
      ],
      modules: [], gpsAddonVillages: 0,
    });
    // starter tanpa tagihan lunas = aktif manual: TIDAK dihitung, hanya dilaporkan.
    assert.equal(r.mrr, Math.round(3_500_000 / 12) + Math.round(5_000_000 / 12));
    assert.equal(r.activeVillages, 6);
    assert.equal(r.activeWithoutPaidInvoice, 1);
  });
  it("desa aktif tanpa tagihan lunas tidak menyumbang MRR sama sekali", () => {
    const r = computeMrr({ packages: [{ plan: "lengkap", firstYear: false, everPaid: false, count: 5 }], modules: [], gpsAddonVillages: 0 });
    assert.equal(r.mrr, 0);
    assert.equal(r.activeVillages, 0);
    assert.equal(r.activeWithoutPaidInvoice, 5);
  });
  it("kredit AI: total pembelian 90 hari ÷ 3 sebagai baris tersendiri; tanpa pembelian tidak ada baris", () => {
    const r = computeMrr({ packages: [], modules: [], gpsAddonVillages: 0, aiCredit: { villages: 2, total90d: 900_000 } });
    assert.equal(r.mrr, 300_000);
    const line = r.lines.find((l) => l.key === "ai_credit");
    assert.ok(line);
    assert.equal(line.count, 2);
    assert.equal(line.subtotal, 300_000);
    assert.equal(computeMrr({ packages: [], modules: [], gpsAddonVillages: 0, aiCredit: { villages: 0, total90d: 0 } }).lines.length, 0);
  });
  it("add-on: GPS Rp49.000, kapasitas = selisih dari tier paket, arsip harga katalog", () => {
    const r = computeMrr({
      packages: [],
      modules: [
        { moduleCode: "absensi_capacity", planCode: "professional", villagePlan: "lengkap", firstYear: false, count: 2 }, // 99.000 - 49.000
        { moduleCode: "arsip_storage", planCode: "starter", villagePlan: "lengkap", firstYear: false, count: 1 }, // 35.000
        { moduleCode: "arsip_storage", planCode: "tier-fiktif", villagePlan: "lengkap", firstYear: false, count: 5 }, // diabaikan
      ],
      gpsAddonVillages: 3,
    });
    assert.equal(r.mrr, 2 * 50_000 + 35_000 + 3 * 49_000);
  });
  it("modul add-on: ditagih untuk paket lama, GRATIS (tidak dihitung) untuk Paket Lengkap", () => {
    const mods = [
      { moduleCode: "bumdes", planCode: "default", villagePlan: "starter", firstYear: false, count: 1 },
      { moduleCode: "bumdes", planCode: "default", villagePlan: "lengkap", firstYear: false, count: 10 },
      { moduleCode: "kode-liar", planCode: "default", villagePlan: "starter", firstYear: false, count: 9 },
      { moduleCode: "constructor", planCode: null, villagePlan: "starter", firstYear: false, count: 9 },
    ];
    assert.equal(computeMrr({ packages: [], modules: mods, gpsAddonVillages: 0 }).mrr, 49_000);
  });
  it("Website Desa Kustom: tahun pertama Rp1,9 jt ÷ 12, perpanjangan Rp78.000", () => {
    const r = computeMrr({
      packages: [],
      modules: [
        { moduleCode: "website_custom", planCode: "default", villagePlan: "lengkap", firstYear: true, count: 1 },
        { moduleCode: "website_custom", planCode: "default", villagePlan: "lengkap", firstYear: false, count: 2 },
      ],
      gpsAddonVillages: 0,
    });
    assert.equal(r.mrr, Math.round(1_900_000 / 12) + 156_000);
  });
  it("kosong = 0 dengan asumsi tetap disertakan", () => {
    const r = computeMrr({ packages: [], modules: [], gpsAddonVillages: 0 });
    assert.equal(r.mrr, 0);
    assert.ok(r.assumptions.length >= 4);
    assert.ok(r.assumptions.some((a) => a.includes("PERKIRAAN")));
  });
});

describe("pemformat", () => {
  it("rupiah Rp 1.234.567", () => {
    assert.equal(formatRupiah(1234567), "Rp 1.234.567");
    assert.equal(formatRupiah(0), "Rp 0");
    assert.equal(formatRupiah(3_500_000), "Rp 3.500.000");
    assert.equal(formatRupiah(-5000), "-Rp 5.000");
    assert.equal(formatRupiah(1234.6), "Rp 1.235");
    assert.equal(formatRupiah(Number.NaN), "Rp 0");
    assert.equal(formatNumberId(1000000), "1.000.000");
  });
  it("rupiah ringkas", () => {
    assert.equal(formatRupiahCompact(3_500_000), "Rp 3,5 jt");
    assert.equal(formatRupiahCompact(450_000), "Rp 450 rb");
    assert.equal(formatRupiahCompact(1_200_000_000), "Rp 1,2 M");
    assert.equal(formatRupiahCompact(900), "Rp 900");
    assert.equal(formatRupiahCompact(2_000_000), "Rp 2 jt");
  });
  it("persen & delta; null = tak terukur", () => {
    assert.equal(formatPercent(0.125), "12,5%");
    assert.equal(formatPercent(null), "—");
    assert.equal(formatPercent(0), "0,0%");
    assert.equal(formatDeltaPercent(0.123), "+12,3%");
    assert.equal(formatDeltaPercent(-0.5), "-50,0%");
    assert.equal(formatDeltaPercent(0), "0,0%");
    assert.equal(formatDeltaPercent(null), "—");
  });
  it("tanggal WIB", () => {
    assert.equal(formatDateTimeWib("2026-11-06T02:25:00Z"), "6 Nov 2026, 09.25 WIB");
    assert.equal(formatDateTimeWib("2026-12-31T17:05:00Z"), "1 Jan 2027, 00.05 WIB");
    assert.equal(formatDateTimeWib("bukan-tanggal"), "—");
    assert.equal(formatSortableWib("2026-11-06T02:25:48Z"), "2026-11-06 09:25:48");
    assert.equal(formatSortableWib(null), "");
    assert.equal(formatMonthKey("2026-11"), "November 2026");
    assert.equal(formatDaysLeft(0), "hari ini");
    assert.equal(formatDaysLeft(1), "besok");
    assert.equal(formatDaysLeft(5), "5 hari lagi");
  });
});

describe("perlu perhatian", () => {
  const now = D("2026-11-06T00:00:00Z");
  const empty: AttentionRaw = {
    expiring7d: { total: 0, sample: [] }, trialEnding3d: { total: 0, sample: [] },
    pendingOld: { total: 0, amount: 0, sample: [] }, applicationsNew: 0, disbursementsWaiting: { count: 0, amount: 0 },
  };
  it("tidak ada pekerjaan = daftar kosong", () => assert.deepEqual(buildAttention(empty, now), []));
  it("urut urgent > warning > info, tautan ke /admin/desa/<id> dan /admin/mitra", () => {
    const items = buildAttention({
      expiring7d: { total: 2, sample: [{ id: 7, name: "Desa A", expiry: D("2026-11-08T00:00:00Z") }] },
      trialEnding3d: { total: 1, sample: [{ id: 9, name: "Desa B", expiry: D("2026-11-06T12:00:00Z") }] },
      pendingOld: { total: 1, amount: 3_500_000, sample: [{ villageId: 3, villageName: "Desa C", invoiceNumber: "INV-1", productType: "desa_package", amount: 3_500_000, createdAt: D("2026-11-01T00:00:00Z") }] },
      applicationsNew: 4,
      disbursementsWaiting: { count: 1, amount: 500_000 },
    }, now);
    assert.deepEqual(items.map((i) => i.severity), ["urgent", "urgent", "warning", "warning", "info"]);
    assert.equal(items[0].entries[0].href, "/admin/desa/7");
    assert.equal(items[0].entries[0].detail, "Berakhir 2 hari lagi");
    assert.equal(items[1].entries[0].detail, "Trial berakhir besok");
    const pending = items.find((i) => i.key === "pending_invoices")!;
    assert.match(pending.entries[0].detail, /Paket Desa · Rp 3\.500\.000 · 5 hari/);
    assert.equal(items.find((i) => i.key === "partner_applications")!.href, "/admin/mitra");
    assert.equal(items.find((i) => i.key === "disbursements_waiting")!.href, "/admin/mitra");
  });
});

describe("daftar tagihan: parameter, filter, CSV", () => {
  const sp = (q: string) => new URLSearchParams(q);
  it("bawaan: halaman 1, 25 per halaman; pageSize dijepit 1..50", () => {
    const r = parseInvoiceQuery(sp(""));
    assert.ok(r.ok && r.value.page === 1 && r.value.pageSize === 25 && r.value.status === null && r.value.q === "" && r.value.range === null);
    const big = parseInvoiceQuery(sp("pageSize=9999"));
    assert.ok(big.ok && big.value.pageSize === 50);
    const zero = parseInvoiceQuery(sp("pageSize=0"));
    assert.ok(zero.ok && zero.value.pageSize === 1);
  });
  it("menolak status/rentang/halaman tak valid dan memotong q", () => {
    for (const bad of ["status=hacked", "range=7d", "page=0", "page=-1", "page=abc", "page=99999", "page=1.5", "pageSize=x"]) assert.equal(parseInvoiceQuery(sp(bad)).ok, false, bad);
    const long = parseInvoiceQuery(sp(`q=${"a".repeat(500)}`));
    assert.ok(long.ok && long.value.q.length === 60);
    const st = parseInvoiceQuery(sp("status=paid&page=3&q=%20abc%20&range=90d"));
    assert.ok(st.ok && st.value.status === "paid" && st.value.page === 3 && st.value.q === "abc" && st.value.range === "90d");
  });
  it("filter: pencarian memakai awalan; paid diukur dari paidAt, lainnya dari createdAt", () => {
    const now = D("2026-11-06T02:00:00Z");
    assert.deepEqual(invoiceListWhere({ status: null, q: "", range: null }, now), {});
    const w = invoiceListWhere({ status: "paid", q: "Desa", range: "30d" }, now) as { AND: Array<Record<string, unknown>> };
    const json = JSON.stringify(w);
    assert.match(json, /"startsWith":"Desa"/);
    assert.doesNotMatch(json, /"contains"/);
    assert.match(json, /"paidAt"/);
    assert.doesNotMatch(json, /"createdAt"/);
    assert.match(JSON.stringify(invoiceListWhere({ status: "pending", q: "", range: "30d" }, now)), /"createdAt"/);
  });
  it("select tagihan tidak memuat payload mentah, URL bayar, QR, atau VA", () => {
    const keys = Object.keys(invoiceListSelect);
    for (const forbidden of ["rawResponse", "metadata", "paymentUrl", "qrContent", "qrImageUrl", "vaNumber", "partnerReff", "externalTransactionId"]) assert.ok(!keys.includes(forbidden), forbidden);
  });
  it("CSV: BOM, header, angka tetap angka, sel berawalan rumus dinetralkan, kutip/koma aman", () => {
    const item = (over: Partial<InvoiceListItem>): InvoiceListItem => ({
      id: "1", invoiceNumber: "INV-A-1", villageId: 1, villageName: "Desa Biasa", villageCode: "biasa", productType: "desa_package", product: productLabel("desa_package"),
      planCode: "lengkap", amount: 3_500_000, status: "paid", statusLabel: "Lunas", paymentMethod: "qris",
      createdAt: "2026-11-06T02:00:00.000Z", paidAt: "2026-11-06T02:25:48.000Z", ...over,
    });
    const csv = buildInvoiceCsv([
      item({}),
      item({ id: "2", villageName: '=HYPERLINK("http://jahat","klik")', villageCode: "+cmd" }),
      item({ id: "3", villageName: "Desa, \"Koma\"", paidAt: null, status: "pending", statusLabel: "Menunggu bayar" }),
      item({ id: "4", villageName: "@SUM(1+1)" }),
    ]);
    assert.ok(csv.startsWith("﻿"));
    const lines = csv.slice(1).trimEnd().split("\r\n");
    assert.equal(lines[0], INVOICE_CSV_HEADERS.join(","));
    assert.equal(lines[1], "INV-A-1,Desa Biasa,biasa,Paket Desa,lengkap,3500000,Lunas,qris,2026-11-06 09:00:00,2026-11-06 09:25:48");
    assert.ok(lines[2].includes(`"'=HYPERLINK(""http://jahat"",""klik"")"`), lines[2]);
    assert.ok(lines[2].includes(",'+cmd,"), lines[2]);
    assert.ok(lines[3].includes(`"Desa, ""Koma"""`));
    assert.ok(lines[3].endsWith(","));
    assert.ok(lines[4].includes(",'@SUM(1+1),"));
    for (const l of lines.slice(1)) for (const cell of l.split(",")) assert.ok(!/^[=@]/.test(cell), cell);
  });
});
