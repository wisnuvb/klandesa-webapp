import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Pill, ResidentPicker, STEP_STATE_LABEL, WarningList, fmtDate, rupiah, villageTitle } from "../components/app/perencanaan/shared.tsx";

const h = React.createElement;

describe("komponen bersama Musdes/RKP Desa (render server)", () => {
  it("lencana selalu berteks, bukan hanya warna", () => {
    const html = renderToStaticMarkup(h(Pill, { tone: "overdue", children: STEP_STATE_LABEL.overdue }));
    assert.match(html, />Terlambat</);
  });

  it("daftar peringatan memakai role=status dan memuat semua butir; kosong tidak merender apa pun", () => {
    const html = renderToStaticMarkup(h(WarningList, { title: "Belum lengkap", items: ["satu", "dua"] }));
    assert.match(html, /role="status"/);
    assert.match(html, />satu</);
    assert.match(html, />dua</);
    assert.equal(renderToStaticMarkup(h(WarningList, { title: "x", items: [] })), "");
  });

  it("pemilih warga memiliki label dan tidak menampilkan hasil sebelum diketik", () => {
    const html = renderToStaticMarkup(h(ResidentPicker, { onPick: () => undefined }));
    assert.match(html, /<label[^>]*for="resident-picker"/);
    assert.doesNotMatch(html, /Hasil pencarian warga/);
  });

  it("format tanggal dan rupiah", () => {
    assert.equal(fmtDate("2026-09-30"), "30 September 2026");
    assert.equal(fmtDate(null), "-");
    assert.equal(rupiah("1500000.00"), "Rp1.500.000");
    assert.equal(rupiah(null), "-");
    assert.equal(villageTitle("Desa Bedahan"), "Bedahan");
    assert.equal(villageTitle("Karanganyar"), "Karanganyar");
    assert.equal(villageTitle("Desa"), "Desa");
  });
});
