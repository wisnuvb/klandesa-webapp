import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toCsv } from "../lib/custom-data/schema.ts";
import { KK_EXPORT_HEADER, KK_EXPORT_MAX_ROWS, kkExportAuditFilters, kkExportRow } from "../lib/kependudukan/kk-export.ts";
import { parseKkQuery, type KkAggRow } from "../lib/kependudukan/kk-list.ts";

const agg = (o: Partial<KkAggRow> = {}): KkAggRow => ({
  kk: "3508070101100021", ref: 7, activeCount: 3, inactiveCount: 1, headCount: 0, badNik: 1, balita: 1, lansia: 0, dewasa: 2,
  hamil: 1, disabilitas: 0, stunting: 0, headName: "Budi", address: "Jl. Mawar 1", rt: "01", rw: "02", hamlet: "Karangsari", ...o,
});

describe("ekspor daftar KK", () => {
  it("jumlah kolom baris sama dengan judul, dan tanpa NIK", () => {
    const row = kkExportRow(agg(), 1);
    assert.equal(row.length, KK_EXPORT_HEADER.length);
    assert.ok(!KK_EXPORT_HEADER.some((h) => /nik/i.test(h)));
  });
  it("nomor KK berspasi (tetap teks di Excel) dan catatan data berisi lencana", () => {
    const row = kkExportRow(agg(), 5);
    assert.equal(row[0], 5);
    assert.equal(row[1], "3508 0701 0110 0021");
    assert.equal(row[14], "Tanpa kepala keluarga; NIK perlu dicek");
  });
  it("kolom kosong menjadi '-'", () => {
    const row = kkExportRow(agg({ headName: "", address: "", rt: "", rw: "", hamlet: "" }), 1);
    assert.deepEqual(row.slice(2, 7), ["-", "-", "-", "-", "-"]);
  });
  it("CSV menetralkan sel berawalan rumus", () => {
    const csv = toCsv(KK_EXPORT_HEADER, [kkExportRow(agg({ headName: "=HYPERLINK(\"http://x\")" }), 1)]);
    assert.ok(csv.includes(`"'=HYPERLINK`));
  });
  it("batas baris dan ringkasan audit tidak membawa teks pencarian", () => {
    assert.ok(KK_EXPORT_MAX_ROWS >= 5000);
    const f = kkExportAuditFilters(parseKkQuery(new URLSearchParams("search=Budi%20Santoso&rw=2&preset=perhatian")));
    assert.equal(f.search, true);
    assert.ok(!JSON.stringify(f).includes("Budi"));
    assert.equal(f.rw, "2");
  });
});
