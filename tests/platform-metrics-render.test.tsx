import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AttentionList, MrrBreakdown, StatusDistribution } from "../components/admin/metrics/DashboardSections.tsx";
import { RevenueChartSection } from "../components/admin/metrics/RevenueChartSection.tsx";
import { DeltaBadge, ErrorState, KpiCard } from "../components/admin/metrics/shared.tsx";
import { buildAttention } from "../lib/platform/metrics/attention.ts";
import { computeMrr } from "../lib/platform/metrics/mrr.ts";
import type { RevenueReport } from "../lib/platform/metrics/revenue.ts";

const h = React.createElement;

const report = (over: Partial<RevenueReport> = {}): RevenueReport => ({
  range: "12m", granularity: "month", timezone: "Asia/Jakarta", from: "2025-12-31T17:00:00.000Z", to: "2026-11-30T17:00:00.000Z", generatedAt: "2026-11-06T02:00:00.000Z",
  series: [{ key: "2026-10", label: "Okt 26", amount: 1_000_000, count: 2 }, { key: "2026-11", label: "Nov 26", amount: 3_500_000, count: 1 }],
  total: { amount: 4_500_000, count: 3, average: 1_500_000 }, previous: { amount: 0, count: 0, from: "", to: "" }, changePct: null,
  byProduct: [], issues: { pending: { count: 0, amount: 0 }, expired: { count: 0, amount: 0 }, failed: { count: 0, amount: 0 } }, latest: [], ...over,
});

describe("render konsol owner (server)", () => {
  it("grafik: ringkasan teks, tombol tabel (aria-pressed), area grafik berlabel; skeleton saat grafik lazy belum dimuat", () => {
    const html = renderToStaticMarkup(h(RevenueChartSection, { report: report() }));
    assert.match(html, /Total Rp 4\.500\.000 dari 3 tagihan lunas/);
    assert.match(html, /belum ada pembanding periode sebelumnya/);
    assert.match(html, /Lihat sebagai tabel/);
    assert.match(html, /aria-pressed="false"/);
    assert.match(html, /role="img"/);
    assert.match(html, /aria-labelledby=/);
  });

  it("state kosong: 'Belum ada pembayaran' tanpa grafik kosong", () => {
    const html = renderToStaticMarkup(h(RevenueChartSection, { report: report({ series: [], total: { amount: 0, count: 0, average: null } }) }));
    assert.match(html, /Belum ada pembayaran/);
    assert.doesNotMatch(html, /role="img"/);
  });

  it("perubahan memakai ikon+teks (bukan warna saja); null = 'Belum ada pembanding'", () => {
    assert.match(renderToStaticMarkup(h(DeltaBadge, { change: 0.25 })), /\+25,0%.*naik/s);
    assert.match(renderToStaticMarkup(h(DeltaBadge, { change: -0.1 })), /-10,0%.*turun/s);
    assert.match(renderToStaticMarkup(h(DeltaBadge, { change: null })), /Belum ada pembanding/);
  });

  it("state galat: role=alert dengan tombol 'Coba lagi'", () => {
    const html = renderToStaticMarkup(h(ErrorState, { message: "Data belum bisa dimuat.", onRetry: () => {} }));
    assert.match(html, /role="alert"/);
    assert.match(html, /Coba lagi/);
  });

  it("KPI: nilai tabular-nums; skeleton saat memuat", () => {
    assert.match(renderToStaticMarkup(h(KpiCard, { title: "MRR perkiraan", icon: null, value: "Rp 1.000", loading: false })), /tabular-nums/);
    const loading = renderToStaticMarkup(h(KpiCard, { title: "MRR", icon: null, value: null, loading: true }));
    assert.match(loading, /animate-pulse|data-slot="skeleton"/);
  });

  it("perhatian: kosong = pesan aman; berisi = tautan ke /admin/desa/<id> dan label tingkat tertulis", () => {
    assert.match(renderToStaticMarkup(h(AttentionList, { items: [] })), /Tidak ada yang perlu ditindaklanjuti/);
    const now = new Date("2026-11-06T00:00:00Z");
    const items = buildAttention({
      expiring7d: { total: 1, sample: [{ id: 42, name: "Desa Maju", expiry: new Date("2026-11-08T00:00:00Z") }] },
      trialEnding3d: { total: 0, sample: [] }, pendingOld: { total: 0, amount: 0, sample: [] }, applicationsNew: 2, disbursementsWaiting: { count: 0, amount: 0 },
    }, now);
    const html = renderToStaticMarkup(h(AttentionList, { items }));
    assert.match(html, /href="\/admin\/desa\/42"/);
    assert.match(html, /Mendesak/);
    assert.match(html, /href="\/admin\/mitra"/);
  });

  it("MRR: rumus & asumsi terlihat, berlabel perkiraan; konversi/churn tanpa data = 'Belum cukup data'", () => {
    const mrr = computeMrr({ packages: [{ plan: "lengkap", firstYear: true, everPaid: true, count: 1 }, { plan: "starter", firstYear: false, everPaid: false, count: 2 }], modules: [], gpsAddonVillages: 0 });
    const html = renderToStaticMarkup(h(MrrBreakdown, { mrr }));
    assert.match(html, /Cara menghitung MRR/);
    assert.match(html, /PERKIRAAN/);
    assert.match(html, /Rp 291\.667/);
    assert.match(html, /belum punya tagihan paket lunas[^<]*jadi tidak dihitung/);

    const villages = {
      total: 0, byStatus: { aktif: 0, trial: 0, tenggang: 0, kedaluwarsa: 0, nonaktif: 0 }, expiring: { d7: 0, d14: 0, d30: 0 }, growth: [],
      conversion: { windowDays: 90, eligible: 0, converted: 0, rate: null }, churn: { windowDays: 30, churned: 0, base: 0, rate: null },
      topProvinces: [], topRegencies: [], bySource: [], byPartner: [], mrr,
    };
    const dist = renderToStaticMarkup(h(StatusDistribution, { villages }));
    assert.equal((dist.match(/Belum cukup data/g) ?? []).length, 2);
    assert.match(dist, /Berlangganan aktif/);
  });
});
