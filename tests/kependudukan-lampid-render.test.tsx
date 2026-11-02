import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LampidTableView } from "../app/(app)/data-warga/lampid/_components/LampidTableView.tsx";
import { buildLampid } from "../lib/kependudukan/lampid.ts";
import { regionTable, summaryTable } from "../lib/kependudukan/lampid-export.ts";

const h = React.createElement;
const report = buildLampid({
  month: "2026-06",
  group: "dusun",
  active: [{ gender: "Laki-laki", nationality: "Indonesia", hamlet: "Dusun A", rt: "01", rw: "01", count: 10 }],
  events: [{ kind: "LAHIR", date: "2026-06-03", residentId: 1, name: "Budi", nikLast4: "4321", gender: "Laki-laki", nationality: "Indonesia", hamlet: "Dusun A", rt: "01", rw: "01", note: "", source: "mutasi" }],
});

describe("tabel laporan LAMPID", () => {
  it("memberi caption untuk pembaca layar, header berlingkup kolom, dan total", () => {
    const html = renderToStaticMarkup(h(LampidTableView, { table: regionTable(report) }));
    assert.match(html, /<caption class="sr-only">Rincian per dusun<\/caption>/);
    assert.match(html, /<th scope="col"[^>]*>Dusun<\/th>/);
    assert.match(html, /Dusun A/);
    assert.match(html, />Jumlah</);
  });

  it("tampilan cetak memakai caption terlihat dan tanpa pembungkus gulir", () => {
    const html = renderToStaticMarkup(h(LampidTableView, { table: summaryTable(report), print: true }));
    assert.match(html, /<caption class="pb-1 text-left font-semibold">Ringkasan<\/caption>/);
    assert.doesNotMatch(html, /overflow-x-auto/);
    assert.match(html, /Penduduk akhir bulan/);
  });

  it("angka nol di layar diredupkan, di cetak tidak", () => {
    const screen = renderToStaticMarkup(h(LampidTableView, { table: summaryTable(report) }));
    const print = renderToStaticMarkup(h(LampidTableView, { table: summaryTable(report), print: true }));
    assert.match(screen, /text-muted-foreground\/60/);
    assert.doesNotMatch(print, /text-muted-foreground\/60/);
  });
});
