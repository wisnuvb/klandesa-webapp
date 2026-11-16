import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SasaranTable, CountButton } from "../app/(app)/pkk/_components/SasaranTable.tsx";
import { buildSasaranReport, type SasaranResident } from "../lib/pkk/sasaran.ts";

const h = React.createElement;
const NOW = new Date(2026, 10, 16, 9);
const p = (age: number, over: Partial<SasaranResident> = {}): SasaranResident => ({
  birthDate: new Date(NOW.getFullYear() - age, 0, 1), gender: "Perempuan", maritalStatus: "Menikah", isPregnant: false, rt: "01", rw: "01", ...over,
});
const report = buildSasaranReport([p(25, { isPregnant: true }), p(2, { gender: "Laki-laki" }), p(70, { gender: "Laki-laki", rt: null })], NOW);
const html = renderToStaticMarkup(h(SasaranTable, { report, caption: "Contoh", onOpen: () => undefined }));

describe("SasaranTable (render server)", () => {
  it("tabel punya keterangan, kepala kolom ber-scope, dan kepala baris per RT", () => {
    assert.match(html, /<caption[^>]*sr-only[^>]*>Contoh<\/caption>/);
    assert.equal((html.match(/scope="col"/g) ?? []).length, 10, "RT/RW + Jumlah warga + 8 kelompok");
    assert.match(html, /scope="row"[^>]*>RT 01 \/ RW 01</);
    assert.match(html, /scope="row"[^>]*>Tanpa RT \(RW 01\)</);
    assert.match(html, /scope="row"[^>]*>Total desa</);
  });
  it("wilayah gulir horizontal dapat difokus keyboard dan diberi nama", () => {
    assert.match(html, /role="region"[^>]*aria-label="Tabel data sasaran per RT"[^>]*tabindex="0"|tabindex="0"[^>]*role="region"/);
  });
  it("kolom tumpang tindih diberi tahu ke pembaca layar, bukan hanya tanda †", () => {
    assert.equal((html.match(/tumpang tindih dengan kolom lain/g) ?? []).length, 3, "ibu hamil, PUS, WUS");
    assert.match(html, /aria-hidden="true"> †/);
  });
  it("angka > 0 adalah tombol berlabel (angka + konteks); nol bukan tombol dan tidak memakai aria-label pada span", () => {
    assert.match(html, /<button[^>]*aria-label="1, lihat daftar: Balita, RT 01 \/ RW 01"/);
    assert.doesNotMatch(html, /<span[^>]*aria-label=/);
    assert.match(renderToStaticMarkup(h(CountButton, { n: 0, label: "Lansia, RT 01", onOpen: () => undefined })), /0<span class="sr-only">, Lansia, RT 01<\/span>/);
    assert.doesNotMatch(renderToStaticMarkup(h(CountButton, { n: 0, label: "x", onOpen: () => undefined })), /<button/);
  });
  it("tombol cukup besar untuk disentuh (min 44px) dan punya cincin fokus", () => {
    const btn = html.match(/<button[^>]*>/)?.[0] ?? "";
    assert.match(btn, /min-h-11/);
    assert.match(btn, /min-w-11/);
    assert.match(btn, /focus-visible:ring-2/);
    assert.match(btn, /cursor-pointer/);
  });
  it("angka memakai tabular-nums dan rata kanan", () => {
    assert.match(html, /text-right tabular-nums/);
  });
});
