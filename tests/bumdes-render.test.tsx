import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Findings, StatusPill, rp } from "../app/(app)/bumdes/_components/shared.tsx";
import { AccountSelect } from "../app/(app)/bumdes/_components/AccountSelect.tsx";

const h = React.createElement;

describe("komponen BUMDes (render server)", () => {
  it("rupiah: negatif memakai tanda minus, sen hanya bila ada", () => {
    assert.equal(rp("1500000.00"), "Rp1.500.000");
    assert.equal(rp("1500000.50"), "Rp1.500.000,5");
    assert.equal(rp("-2000"), "−Rp2.000");
    assert.equal(rp(null), "-");
  });

  it("temuan dikelompokkan per tingkat, berteks dan berikon; kosong tidak merender apa pun", () => {
    const html = renderToStaticMarkup(h(Findings, { items: [{ level: "ERROR", message: "Neraca tidak seimbang" }, { level: "WARN", message: "RK belum meniadakan", ref: "Kepmendes 136/2022" }, { level: "INFO", message: "Periode belum ditutup" }] }));
    assert.match(html, /role="alert"/);
    assert.match(html, />Perlu diperbaiki</);
    assert.match(html, />Perlu diperiksa</);
    assert.match(html, />Catatan</);
    assert.match(html, /Kepmendes 136\/2022/);
    assert.equal(renderToStaticMarkup(h(Findings, { items: [] })), "");
  });

  it("lencana status selalu berteks", () => {
    assert.match(renderToStaticMarkup(h(StatusPill, { tone: "off", children: "Dibatalkan" })), />Dibatalkan</);
  });

  it("pilihan akun: hanya akun kas bila diminta, dan bagan lengkap dikelompokkan bila tidak", () => {
    const cash = renderToStaticMarkup(h(AccountSelect, { id: "x", only: "cash", value: "1.1.01.01", onChange: () => undefined }));
    assert.match(cash, /Kas Tunai/);
    assert.doesNotMatch(cash, /Pendapatan Tiket/);
    const all = renderToStaticMarkup(h(AccountSelect, { id: "y", value: "", onChange: () => undefined }));
    assert.match(all, /id="y"/);
  });
});
