import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PemanfaatanView } from "../app/(app)/aset-desa/pemanfaatan/_components/PemanfaatanView.tsx";
import { dateId, rupiah, sqm } from "../app/(app)/aset-desa/pemanfaatan/_components/types.ts";
import { PesananView } from "../app/(app)/ukm/pesanan/_components/PesananView.tsx";

const h = React.createElement;

describe("layar Tanah kas & sewa dan Pesanan UKM (render server)", () => {
  it("halaman pemanfaatan: judul, tab berperan, tombol kembali, keadaan memuat terumumkan", () => {
    const html = renderToStaticMarkup(h(PemanfaatanView));
    assert.match(html, /<h1[^>]*>.*Tanah kas desa dan pemanfaatan aset/s);
    assert.match(html, /role="tablist"/);
    assert.equal((html.match(/role="tab"/g) ?? []).length, 3);
    assert.match(html, /aria-selected="true"/);
    assert.match(html, /href="\/aset-desa"/);
    assert.match(html, /role="status"/);
    assert.match(html, /pb-24/);
  });
  it("halaman pesanan: penyaring status berlabel, pencarian berlabel, menyebut belum ada pembayaran online", () => {
    const html = renderToStaticMarkup(h(PesananView));
    assert.match(html, /<h1[^>]*>.*Pesanan produk UKM/s);
    assert.match(html, /aria-label="Penyaring status"/);
    assert.equal((html.match(/aria-pressed=/g) ?? []).length, 5);
    assert.match(html, /<label[^>]*for="psn-cari"/);
    assert.match(html, /Belum ada pembayaran online/);
    assert.match(html, /pb-24/);
  });
  it("format rupiah, luas, dan tanggal", () => {
    assert.equal(rupiah("6000000.00"), "Rp6.000.000");
    assert.equal(sqm("1250.50"), "1.250,5 m2");
    assert.equal(sqm(null), "belum tercatat");
    assert.equal(dateId("2026-01-05"), "5 Jan 2026");
    assert.equal(dateId(null), "-");
  });
});
