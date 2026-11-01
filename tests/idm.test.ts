import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as XLSX from "xlsx";
import { detectHeaderRow, detectLayout, dimensionOf, firstDataRow, guessMapping, matchRows, parseDelimited, parseScore, readIndicatorRows, readSummaryRows, villageKey, yearFromHeaders } from "../lib/idm/map";
import { deltas, rankIndicators, recommend, scalesDiffer } from "../lib/idm/calc";
import { parseImport } from "../lib/idm/schema";
import { isDimension, isLayout } from "../lib/idm/catalog";
import { TooBigError, readWorkbookLimited } from "../lib/idm/read-xlsx";
import { readWorkbookGrids } from "../lib/residents-import/read-workbook";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

/** Struktur berkas publik "IDM per 31 Desember 2025" (portal data Sumbawa Barat): judul, baris header, baris nomor kolom negatif, lalu data. */
const SUMBAWA = [
  ["Indeks Desa Membangun"],
  ["Menurut Desa"],
  ["Per 31 Desember 2025"],
  [],
  ["No", "Kode Kabupaten", "Nama Kabupaten", "Kode Kecamatan", "Nama Kecamatan", "Kode Desa", "Nama Desa/Kelurahan", "IKS", "IKE", "IKL", "NILAI IDM", "STATUS IDM"],
  [-1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12],
  [1, "52.07", "Kabupaten Sumbawa Barat", "52.07.02", "Kecamatan Taliwang", "52.07.02.1004", "Kelurahan Menala"],
  [8, "52.07", "Kabupaten Sumbawa Barat", "52.07.02", "Kecamatan Taliwang", "52.07.02.2013", "Desa Tamekan", 53, 113, 62, 228, "MAJU"],
  [9, "52.07", "Kabupaten Sumbawa Barat", "52.07.02", "Kecamatan Taliwang", "52.07.02.2011", "Desa Seloto", 76, 128, 76, 280, "MANDIRI"],
  [10, "52.07", "Kabupaten Sumbawa Barat", "52.07.03", "Kecamatan Lain", "52.07.03.2001", "Desa Seloto", 60, 100, 70, 230, "MAJU"],
];

describe("IDM: pembacaan angka dan CSV", () => {
  it("angka desimal koma/titik dan pemisah ribuan", () => {
    assert.equal(parseScore("0,7563"), 0.7563);
    assert.equal(parseScore("0.7563"), 0.7563);
    assert.equal(parseScore(" 53 "), 53);
    assert.equal(parseScore("1.234,56"), 1234.56);
    assert.equal(parseScore("1,234.56"), 1234.56);
    assert.equal(parseScore("1.234.567"), 1234567);
    assert.equal(parseScore(0.123456), 0.1235);
    for (const bad of ["abc", "", "1e3", "0x10", "12%", "1,2,3x", "--1", null, undefined, {}, [], true, Number.NaN, Infinity]) assert.equal(parseScore(bad as never), null, String(bad));
  });
  it("CSV titik koma dengan desimal koma tidak rusak menjadi angka ribuan", () => {
    const g = parseDelimited("﻿No;Kode Desa;Nama Desa;IKS;IKE;IKL;NILAI IDM;STATUS IDM\r\n1;3313042002;\"Desa, Bedahan\";0,7563;0,6120;0,8001;0,7228;MAJU\r\n");
    assert.equal(g.length, 2);
    assert.equal(g[1][2], "Desa, Bedahan");
    assert.equal(parseScore(g[1][3]), 0.7563);
    assert.equal(parseScore(g[1][6]), 0.7228);
  });
  it("CSV koma dengan sel berkutip dan tab", () => {
    assert.deepEqual(parseDelimited('a,b\n"x ""q""",2\n'), [["a", "b"], ['x "q"', "2"]]);
    assert.deepEqual(parseDelimited("a\tb\n1\t2"), [["a", "b"], ["1", "2"]]);
    assert.deepEqual(parseDelimited(""), []);
  });
});

describe("IDM: berkas satu baris per desa (struktur berkas publik)", () => {
  const ws = XLSX.utils.aoa_to_sheet(SUMBAWA);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "230-25");
  const grid = readWorkbookGrids(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer, "array")[0].rows;

  it("baris judul, tata letak, dan pemetaan kolom dikenali otomatis; baris nomor negatif dilewati", () => {
    const hr = detectHeaderRow(grid);
    assert.equal(hr, 4);
    const headers = (grid[hr] ?? []).map((c) => String(c ?? ""));
    assert.equal(detectLayout(headers), "SUMMARY");
    const m = guessMapping(headers, "SUMMARY");
    assert.deepEqual([m.kodeDesa, m.namaDesa, m.kecamatan, m.iks, m.ike, m.ikl, m.idm, m.status], [5, 6, 4, 7, 8, 9, 10, 11]);
    assert.equal(firstDataRow(grid, hr), 6);
    const rows = readSummaryRows(grid, hr, m);
    assert.equal(rows.length, 4);
    const t = rows.find((r) => r.namaDesa === "Desa Tamekan")!;
    assert.deepEqual([t.iks, t.ike, t.ikl, t.idm, t.status], [53, 113, 62, 228, "MAJU"]);
    const k = rows.find((r) => r.namaDesa === "Kelurahan Menala")!;
    assert.deepEqual([k.iks, k.idm, k.status], [null, null, null], "kelurahan tanpa skor tetap terbaca sebagai baris kosong, bukan galat");
  });
  it("pencocokan desa: kode IDM lebih dulu, lalu nama tanpa awalan, lalu kecamatan bila nama kembar", () => {
    const hr = 4;
    const rows = readSummaryRows(grid, hr, guessMapping((grid[hr] ?? []).map((c) => String(c ?? "")), "SUMMARY"));
    assert.equal(matchRows(rows, { name: "Tamekan", district: "x", idmCode: "" }).rows[0].namaDesa, "Desa Tamekan");
    assert.equal(matchRows(rows, { name: "Desa Tamekan", district: "x", idmCode: "" }).by, "nama");
    const byCode = matchRows(rows, { name: "Salah Nama", district: "", idmCode: "52.07.02.2011" });
    assert.equal(byCode.by, "kode");
    assert.equal(byCode.rows[0].namaDesa, "Desa Seloto");
    assert.equal(byCode.rows[0].iks, 76);
    const twin = matchRows(rows, { name: "Seloto", district: "Kecamatan Lain", idmCode: "" });
    assert.equal(twin.rows.length, 1);
    assert.equal(twin.rows[0].kodeDesa, "52.07.03.2001");
    assert.equal(matchRows(rows, { name: "Seloto", district: "Entah", idmCode: "" }).rows.length, 2, "nama kembar tanpa kecamatan cocok: pengguna memilih");
    assert.equal(matchRows(rows, { name: "Tidak Ada", district: "", idmCode: "" }).by, null);
    assert.equal(villageKey("Kelurahan  Menala"), "menala");
  });
  it("kolom bertahun (IKS 2024) dikenali dan tahunnya diambil", () => {
    const headers = ["KODE DESA", "NAMA DESA", "IKS 2024", "IKE 2024", "IKL 2024", "IDM 2024", "STATUS IDM 2024"];
    const m = guessMapping(headers, "SUMMARY");
    assert.deepEqual([m.iks, m.ike, m.ikl, m.idm, m.status], [2, 3, 4, 5, 6]);
    assert.equal(yearFromHeaders(headers, m), 2024);
    assert.equal(yearFromHeaders(["IKS 2024", "IKE 2023"], { iks: 0, ike: 1 }), null, "tahun campur: pengguna mengisi");
  });
  it("nilai bukan angka pada kolom skor ditandai", () => {
    const g = [["Nama Desa", "IKS", "NILAI IDM"], ["Desa X", "tinggi", "0,7"]];
    const r = readSummaryRows(g, 0, guessMapping(["Nama Desa", "IKS", "NILAI IDM"], "SUMMARY"));
    assert.deepEqual(r[0].badScores, ["IKS"]);
    assert.equal(r[0].idm, 0.7);
  });
});

describe("IDM: berkas satu baris per indikator (dapat dipetakan)", () => {
  const g = [
    ["Rumusan IDM Desa X"],
    ["No", "Dimensi", "Indikator", "Skor", "Skor Maksimal", "Keterangan", "Kegiatan"],
    ["IKS", null, null, null],
    [1, "Ketahanan Sosial", "Akses ke pelayanan kesehatan", 2, 5, "Jauh", "Bangun polindes"],
    [2, "Ketahanan Sosial", "Akses pendidikan", 5, 5],
    [3, "Ketahanan Ekonomi", "Keragaman produksi", "1,5", 5, null, "Pelatihan usaha"],
    [4, "Ekologi", "Kualitas lingkungan", 4, 5],
    [5, "", "Tanpa dimensi mewarisi baris atasnya", 3, 5],
    ["", "", "Jumlah", null],
  ];
  it("tata letak, pemetaan, dimensi, dan baris tanpa skor dilewati", () => {
    const hr = detectHeaderRow(g);
    assert.equal(hr, 1);
    const headers = g[hr].map((c) => String(c ?? ""));
    assert.equal(detectLayout(headers), "INDICATORS");
    const m = guessMapping(headers, "INDICATORS");
    assert.deepEqual([m.dimensi, m.kode, m.indikator, m.skor, m.skorMaks, m.keterangan, m.kegiatan], [1, 0, 2, 3, 4, 5, 6]);
    const { rows, skipped } = readIndicatorRows(g, hr, m);
    assert.equal(rows.length, 5);
    assert.equal(skipped, 1, "baris 'Jumlah' (bernama tetapi tanpa skor) dilewati; baris judul kelompok tanpa nama diabaikan");
    assert.deepEqual(rows.map((r) => r.dimension), ["IKS", "IKS", "IKE", "IKL", "IKL"]);
    assert.equal(rows[2].score, 1.5);
    assert.equal(rows[0].suggestion, "Bangun polindes");
    assert.equal(dimensionOf("Indeks Ketahanan Ekonomi"), "IKE");
    assert.equal(dimensionOf("Lain-lain"), "LAIN");
  });
});

describe("IDM: rekomendasi fokus", () => {
  const ind = (id: number, name: string, score: number, max: number | null, dimension: "IKS" | "IKE" | "IKL" | "LAIN" = "IKS") => ({ id, dimension, code: null, name, score, maxScore: max, note: null, suggestion: null });
  it("memeringkat menurut rasio bila semua punya skor maksimal, selain itu skor mentah", () => {
    const withMax = [ind(1, "A", 4, 5), ind(2, "B", 1, 5), ind(3, "C", 1.5, 10)];
    const r = rankIndicators(withMax);
    assert.equal(r.basis, "RASIO");
    assert.deepEqual(r.ranked.map((x) => x.name), ["C", "B", "A"]);
    const mixed = [ind(1, "A", 4, 5), ind(2, "B", 1, null), ind(3, "C", 2, 10)];
    const m = rankIndicators(mixed);
    assert.equal(m.basis, "MENTAH");
    assert.deepEqual(m.ranked.map((x) => x.name), ["B", "C", "A"]);
    assert.equal(rankIndicators([]).ranked.length, 0);
  });
  it("rekomendasi: lima terendah, tiga per dimensi, dimensi terlemah dari skor", () => {
    const items = Array.from({ length: 12 }, (_, i) => ind(i + 1, `I${i}`, i, 10, (["IKS", "IKE", "IKL"] as const)[i % 3]));
    const rec = recommend(items, { year: 2025, iks: 0.8, ike: 0.5, ikl: 0.7, idm: 0.66, status: null });
    assert.equal(rec.overall.length, 5);
    assert.equal(rec.overall[0].name, "I0");
    assert.equal(rec.byDimension.length, 3);
    assert.ok(rec.byDimension.every((g) => g.items.length === 3));
    assert.equal(rec.weakestDimension?.dimension, "IKE");
    const none = recommend([], null);
    assert.equal(none.basis, "TIDAK_ADA");
    const dimOnly = recommend([], { year: 2025, iks: 1, ike: 3, ikl: 2, idm: null, status: null });
    assert.equal(dimOnly.basis, "DIMENSI");
    assert.equal(dimOnly.weakestDimension?.dimension, "IKS");
    assert.equal(recommend([], { year: 2025, iks: 1, ike: null, ikl: null, idm: null, status: null }).weakestDimension, null, "satu dimensi tidak dapat dibandingkan");
  });
  it("perubahan dari tahun sebelumnya dan peringatan beda skala", () => {
    const a = { year: 2025, iks: 0.8, ike: 0.5, ikl: null, idm: 0.7, status: null };
    const b = { year: 2024, iks: 0.7, ike: 0.6, ikl: 0.5, idm: 0.65, status: null };
    const d = deltas(a, b);
    assert.deepEqual(d.map((x) => [x.dimension, x.diff]), [["IKS", 0.1], ["IKE", -0.1], ["IDM", 0.05]]);
    assert.deepEqual(deltas(a, null), []);
    assert.equal(scalesDiffer(a, { ...b, iks: 53, ike: 113, ikl: 62, idm: 228 }), true);
    assert.equal(scalesDiffer(a, b), false);
  });
});

describe("IDM: validasi impor di server", () => {
  const sum = (o: Record<string, unknown> = {}) => ({ year: 2025, layout: "SUMMARY", fileName: "idm.xlsx", summary: { iks: 0.7, ike: "0,6", ikl: 0.8, idm: 0.7, status: "MAJU" }, ...o });
  it("ringkasan sah dan menolak masukan jahat", () => {
    const ok = parseImport(sum());
    assert.ok(ok.ok && ok.value.summary?.ike === 0.6);
    for (const bad of [{ year: 2009 }, { year: 2999 }, { year: "2025; DROP" }, { layout: "LAIN" }, { summary: null }, { summary: { iks: -1 } }, { summary: { iks: 1e9 } }, { summary: { iks: "abc" } }, { summary: { iks: [1] } }, { summary: { status: "x".repeat(41) } }, { summary: {} }, { fileName: "x".repeat(201) }]) {
      assert.equal(parseImport(sum(bad)).ok, false, JSON.stringify(bad));
    }
    assert.equal(parseImport(null).ok, false);
    assert.equal(parseImport([]).ok, false);
    assert.ok(parseImport(sum({ summary: { status: "MANDIRI" } })).ok, "status saja sah");
  });
  it("indikator: batas jumlah, nama wajib, skor angka, dimensi dikenal", () => {
    const one = { dimension: "IKS", code: "1", name: "Akses", score: 2, maxScore: 5, note: "x", suggestion: "y" };
    assert.ok(parseImport({ year: 2025, layout: "INDICATORS", indicators: [one] }).ok);
    assert.ok(!parseImport({ year: 2025, layout: "INDICATORS", indicators: [] }).ok);
    assert.ok(!parseImport({ year: 2025, layout: "INDICATORS", indicators: Array.from({ length: 301 }, () => one) }).ok);
    for (const bad of [{ name: "" }, { name: "x".repeat(301) }, { score: "tinggi" }, { score: -2 }, { score: null }, { maxScore: 0 }, { dimension: "XYZ" }, { suggestion: "x".repeat(1001) }]) {
      const r = parseImport({ year: 2025, layout: "INDICATORS", indicators: [{ ...one, ...bad }] });
      assert.equal(r.ok, false, JSON.stringify(bad));
      assert.ok(!r.ok && Object.keys(r.fieldErrors).some((k) => k.startsWith("indicators.0")), "galat menyebut nomor baris");
    }
    assert.ok(!parseImport({ year: 2025, layout: "INDICATORS", indicators: ["x"] }).ok);
  });
});

describe("IDM: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path}`);
    return roleCan(r.resource, r.action, role);
  };
  it("membaca untuk semua, impor oleh operator, Kepala Desa hanya melihat, hapus oleh admin/sekretaris", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/idm", "GET", role), true);
    assert.equal(gate("/api/idm", "POST", "staff"), true);
    assert.equal(gate("/api/idm", "POST", "village_head"), false);
    assert.equal(gate("/api/idm/2025", "DELETE", "staff"), false);
    assert.equal(gate("/api/idm/2025", "DELETE", "secretary"), true);
  });
});

describe("IDM: penjaga enum dan batas pembacaan XLSX", () => {
  it("kunci prototipe bukan layout/dimensi sah; layout:\"constructor\" ditolak sebelum menyentuh data", () => {
    for (const k of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      assert.equal(isLayout(k), false, k);
      assert.equal(isDimension(k), false, k);
      assert.equal(parseImport({ year: 2025, layout: k, indicators: [{ name: "x", score: 1 }] }).ok, false, k);
      assert.equal(parseImport({ year: 2025, layout: "INDICATORS", indicators: [{ name: "x", score: 1, dimension: k }] }).ok, false, `dimensi ${k}`);
    }
  });
  it("nilai terlalu panjang ditolak per kolom, bukan 500", () => {
    const long = "x".repeat(5000);
    assert.ok(!parseImport({ year: 2025, layout: "SUMMARY", summary: { idm: 1, status: long } }).ok);
    assert.ok(!parseImport({ year: 2025, layout: "SUMMARY", fileName: long, summary: { idm: 1 } }).ok);
    for (const k of ["name", "code", "note", "suggestion"]) assert.ok(!parseImport({ year: 2025, layout: "INDICATORS", indicators: [{ name: "a", score: 1, [k]: long }] }).ok, k);
  });
  it("pembaca XLSX membatasi baris yang diurai dan menolak lembar yang melebihi batas", () => {
    const mk = (n: number) => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(Array.from({ length: n }, (_, i) => [i, `Desa ${i}`])), "S");
      return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    };
    const ok = readWorkbookLimited(mk(50), { maxRows: 100, maxCols: 200, maxSheets: 10 });
    assert.equal(ok[0].grid.length, 50);
    assert.deepEqual(ok[0].grid[3], [3, "Desa 3"]);
    assert.throws(() => readWorkbookLimited(mk(500), { maxRows: 100, maxCols: 200, maxSheets: 10 }), TooBigError);
    const wide = (() => {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([Array.from({ length: 300 }, (_, i) => `c${i}`)]), "W");
      return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    })();
    assert.equal(readWorkbookLimited(wide, { maxRows: 100, maxCols: 50, maxSheets: 10 })[0].grid[0].length, 50, "kolom dipotong");
  });
  it("galat indikator memuat nomor baris berkas asli dan teks ramah (tanpa titik ganda)", () => {
    const r = parseImport({ year: 2025, layout: "INDICATORS", indicators: [{ row: 17, name: "Akses air", score: -3 }, { row: 18, name: "Listrik", score: 9, maxScore: 5 }, { name: "Tanpa nomor baris", score: "x" }] });
    assert.ok(!r.ok);
    if (r.ok) return;
    assert.match(r.fieldErrors["indicators.0"], /^Baris 17 di berkas \(Akses air\): skor harus angka antara 0 dan 99999$/);
    assert.match(r.fieldErrors["indicators.1"], /^Baris 18 di berkas \(Listrik\): skor \(9\) melebihi skor maksimal \(5\)$/);
    assert.match(r.fieldErrors["indicators.2"], /^Baris 3 di berkas/);
    for (const m of Object.values(r.fieldErrors)) assert.doesNotMatch(m, /\.\./);
  });
  it("pembaca indikator menandai skor negatif dan skor di atas maksimum", () => {
    const g = [["No", "Indikator", "Skor", "Skor Maksimal"], [1, "A", -1, 5], [2, "B", 6, 5], [3, "C", 3, 5]];
    const { rows } = readIndicatorRows(g, 0, guessMapping(g[0].map(String), "INDICATORS"));
    assert.deepEqual(rows.map((x) => x.issue), ["skor negatif", "skor 6 melebihi skor maksimal 5", null]);
    assert.equal(rows[0].rowNo, 2, "nomor baris berkas (dasar 1)");
  });
});
