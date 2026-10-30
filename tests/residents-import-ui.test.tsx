import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as XLSX from "xlsx";
import { readWorkbookGrids } from "../lib/residents-import/read-workbook.ts";
import { planWorkbook } from "../lib/residents-import/plan.ts";
import { analyzeBatch, buildSheetRows, statusOf, summarize, type ImportRow } from "../lib/residents-import/batch.ts";
import { summarizeReadiness } from "../lib/residents-import/mobile-readiness.ts";
import { ColumnMappingStep } from "../components/app/data-warga/import/ColumnMappingStep.tsx";
import { ReviewStep } from "../components/app/data-warga/import/ReviewStep.tsx";
import type { ImportWizard } from "../components/app/data-warga/import/useImportWizard.ts";

const NOW = new Date("2026-10-30T00:00:00Z");

async function fixtureWizard(): Promise<ImportWizard> {
  const header = ["Nama", "Nomor NIK", "Jenis Kelamin L/P", "", "Tanggal Lahir", "Agama", "Kawin", "Hub. Keluarga"];
  const data = [
    ["TUMIN", "3508070101590017", "L", "", "1959-01-01", "Islam", 4, "KK"],
    ["ROHMA", "3508074404800001", "", "P", "1970-01-01", "Pastafarian", 2, "Istri"],
    ["RUSAK", "123", "L", "", "", "Islam", 1, "Anak"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  ws["!merges"] = [{ s: { r: 0, c: 2 }, e: { r: 0, c: 3 } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Desa");
  const plans = planWorkbook(readWorkbookGrids(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer));
  const rows = await buildSheetRows(plans[0], { now: NOW });
  const batch = analyzeBatch(rows);
  const noop = () => {};
  return {
    step: "review", fileName: "contoh.xlsx", plans, activeSheet: 0, rows, existing: new Set(["3508070101590017"]), existingCount: 1,
    mode: "skip", saveMapping: true, mergedCount: 0, linkedParents: 0, busy: null, sending: null, result: null,
    summary: summarize(rows, batch), mappingProblems: [], sendableRows: rows, batch, readiness: summarizeReadiness(rows), statusRowCount: 0,
    issuesOf: (r: ImportRow) => r.issues.concat(batch.get(r.key) ?? []),
    statusOfRow: (r: ImportRow) => statusOf(r.issues, batch.get(r.key)),
    setStep: noop, setActiveSheet: noop, setMode: noop, setSaveMapping: noop, reset: noop, loadFile: noop,
    setSheetSelected: noop, setSheetRole: noop, setColumnField: noop, proceedToReview: noop, editCell: noop,
    removeRows: noop, replaceValue: noop, submit: noop, cancelSending: noop, buildReport: () => [],
  } as unknown as ImportWizard;
}

describe("impor warga — UI", () => {
  it("langkah Cocokkan Kolom menampilkan header, contoh isi, dan keyakinan", async () => {
    const html = renderToStaticMarkup(createElement(ColumnMappingStep, { wizard: await fixtureWizard() }));
    assert.match(html, /Nomor NIK/);
    assert.match(html, /3508070101590017/);
    assert.match(html, /Otomatis/);
    assert.match(html, /aria-label="Daftar sheet"/);
  });
  it("langkah Tinjau menandai sel bermasalah dengan label teks (bukan hanya warna) dan tombol hapus berlabel", async () => {
    const html = renderToStaticMarkup(createElement(ReviewStep, { wizard: await fixtureWizard() }));
    assert.match(html, /aria-invalid="true"/); // NIK "123"
    assert.match(html, /NIK harus 16 digit/); // pesan untuk pembaca layar
    assert.match(html, /Error:/);
    assert.match(html, /Pastafarian/);
    assert.match(html, /Nilai belum dikenali/);
    assert.match(html, /Hapus baris 4 dari impor/);
    assert.match(html, /Sudah terdaftar/);
    assert.match(html, /datalist/);
    assert.match(html, /Perempuan/, "gender P di kolom terpisah terbaca");
    assert.match(html, /Kesiapan aplikasi mobile/);
    assert.match(html, /Impor tidak membuat akun/);
    assert.match(html, /Aplikasi mobile<\/th>/);
  });
});
