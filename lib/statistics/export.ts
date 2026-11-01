/**
 * Rekap statistik kependudukan menjadi tabel datar, lalu Excel/CSV/halaman cetak.
 * Satu sumber tabel untuk ketiganya supaya angkanya pasti sama dengan yang tampil di layar.
 */
import { toCsv } from "@/lib/custom-data/schema";
import type { StatisticsData } from "./types";

export type Cell = string | number;

export type StatTable = {
  /** Nama sheet Excel (sudah aman). */
  sheet: string;
  title: string;
  columns: string[];
  /** Indeks kolom berisi angka (rata kanan). */
  numeric: number[];
  rows: Cell[][];
  total?: Cell[];
  note?: string;
};

export type ExportMeta = { villageName: string; generatedAt: Date };

const SHEET_ILLEGAL = /[\\/?*[\]:]/g;

/** Nama sheet Excel: tanpa karakter terlarang, maksimal 31 karakter. */
export function safeSheetName(name: string, fallback = "Data"): string {
  const cleaned = name.replace(SHEET_ILLEGAL, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "");
  return (cleaned || fallback).slice(0, 31);
}

/** Potongan nama berkas: huruf kecil, tanda hubung. */
export function slugifyFile(text: string, fallback = "desa"): string {
  const s = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || fallback;
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function statisticFileName(villageName: string, ext: "xlsx" | "csv", date: Date): string {
  const ymd = date.toISOString().slice(0, 10);
  return `statistik-kependudukan-${slugifyFile(villageName)}-${ymd}.${ext}`;
}

/** Persen satu desimal; 0 bila penyebutnya 0 (hindari NaN). */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

function distribution(
  sheet: string,
  title: string,
  firstColumn: string,
  items: ReadonlyArray<readonly [string, number]>,
  opts: { total?: boolean; base?: number; percentHeader?: string; note?: string } = {},
): StatTable {
  const total = items.reduce((sum, [, n]) => sum + n, 0);
  const base = opts.base ?? total;
  const table: StatTable = {
    sheet,
    title,
    columns: [firstColumn, "Jumlah", opts.percentHeader ?? "Persen (%)"],
    numeric: [1, 2],
    rows: items.map(([label, n]) => [label, n, percent(n, base)]),
    note: opts.note,
  };
  if (opts.total !== false) table.total = ["Total", total, percent(total, base)];
  return table;
}

/** Semua tabel statistik, urutannya mengikuti tab di halaman. */
export function buildStatisticTables(data: StatisticsData): StatTable[] {
  const tables: StatTable[] = [
    distribution(
      "Jenis Kelamin",
      "Jenis kelamin",
      "Jenis kelamin",
      data.jenisKelamin.map((x) => [x.name, x.value] as const),
    ),
  ];

  const usiaTotal = data.usia.reduce((s, x) => s + x.total, 0);
  tables.push({
    sheet: "Usia",
    title: "Kelompok usia dan jenis kelamin",
    columns: ["Kelompok usia", "Laki-laki", "Perempuan", "Jumlah", "Persen (%)"],
    numeric: [1, 2, 3, 4],
    rows: data.usia.map((x) => [x.range, x.lakilaki, x.perempuan, x.total, percent(x.total, usiaTotal)]),
    total: [
      "Total",
      data.usia.reduce((s, x) => s + x.lakilaki, 0),
      data.usia.reduce((s, x) => s + x.perempuan, 0),
      usiaTotal,
      percent(usiaTotal, usiaTotal),
    ],
  });

  tables.push(
    distribution("Pendidikan", "Tingkat pendidikan", "Tingkat pendidikan", data.pendidikan.map((x) => [x.tingkat, x.jumlah] as const)),
    distribution("Pekerjaan", "Pekerjaan", "Pekerjaan", data.pekerjaan.map((x) => [x.pekerjaan, x.jumlah] as const)),
    distribution("Perkawinan", "Status perkawinan", "Status perkawinan", data.perkawinan.map((x) => [x.status, x.jumlah] as const)),
    distribution("Agama", "Agama", "Agama", data.agama.map((x) => [x.agama, x.jumlah] as const)),
    distribution("Golongan Darah", "Golongan darah", "Golongan darah", data.golonganDarah.map((x) => [x.golongan, x.jumlah] as const)),
    distribution("Dusun", "Wilayah / dusun", "Dusun", data.wilayah.map((x) => [x.wilayah, x.jumlah] as const)),
    distribution("Kesehatan", "Kesehatan", "Kategori", data.kesehatan.map((x) => [x.kategori, x.jumlah] as const), {
      total: false,
      base: data.summary.totalPenduduk,
      percentHeader: "% dari penduduk",
      note: "Satu orang dapat masuk lebih dari satu kategori, sehingga jumlah tidak dijumlahkan.",
    }),
  );

  const change = data.perubahanPenduduk;
  if (change) {
    tables.push({
      sheet: "Perubahan Penduduk",
      title: "Perubahan penduduk 6 bulan terakhir",
      columns: ["Bulan", "Lahir", "Datang", "Meninggal", "Pindah keluar", "Selisih"],
      numeric: [1, 2, 3, 4, 5],
      rows: change.perBulan.map((m) => [`${m.bulan} ${m.key.slice(0, 4)}`, m.lahir, m.datang, m.meninggal, m.pindah, m.selisih]),
      note: "Dihitung dari mutasi penduduk yang sudah diterapkan (kelahiran, kematian, pindah masuk, pindah keluar).",
    });
  }

  return tables;
}

/** Baris ringkasan: total penduduk dan komposisi jenis kelamin. */
export function buildSummaryRows(data: StatisticsData): Cell[][] {
  const { totalPenduduk, lakiLaki, perempuan } = data.summary;
  const rows: Cell[][] = [
    ["Total penduduk", totalPenduduk, 100],
    ["Laki-laki", lakiLaki, percent(lakiLaki, totalPenduduk)],
    ["Perempuan", perempuan, percent(perempuan, totalPenduduk)],
  ];
  if (data.perubahanPenduduk) {
    rows.push(["Perubahan penduduk bulan ini", data.perubahanPenduduk.bulanIni, data.perubahanPenduduk.persenBulanIni]);
  }
  return rows;
}

export const SOURCE_NOTE = "Sumber: data kependudukan KlanDesa. Hanya penduduk berstatus hidup yang dihitung.";

export type SheetRows = { name: string; rows: Cell[][]; widths: number[] };

/** Sheet Excel: "Ringkasan" lalu satu sheet per tabel. */
export function buildStatisticSheets(data: StatisticsData, meta: ExportMeta): SheetRows[] {
  const when = `Per ${formatLongDate(meta.generatedAt)}`;
  const banner = (title: string): Cell[][] => [[title], [`${meta.villageName} · ${when}`], []];

  const summary: SheetRows = {
    name: "Ringkasan",
    rows: [
      ...banner("Rekap Statistik Kependudukan"),
      ["Keterangan", "Jumlah", "Persen (%)"],
      ...buildSummaryRows(data),
      [],
      [SOURCE_NOTE],
    ],
    widths: [34, 12, 12],
  };

  const sheets: SheetRows[] = [summary];
  const used = new Set([summary.name]);

  for (const t of buildStatisticTables(data)) {
    let name = safeSheetName(t.sheet);
    for (let i = 2; used.has(name); i++) name = safeSheetName(`${t.sheet} ${i}`);
    used.add(name);

    const labelWidth = Math.min(48, Math.max(t.columns[0].length, ...t.rows.map((r) => String(r[0]).length)) + 2);
    sheets.push({
      name,
      rows: [
        ...banner(`Statistik Kependudukan — ${t.title}`),
        t.columns,
        ...t.rows,
        ...(t.total ? [t.total] : []),
        ...(t.note ? [[], [t.note]] : []),
      ],
      widths: [labelWidth, ...t.columns.slice(1).map((c) => Math.max(12, c.length + 2))],
    });
  }

  return sheets;
}

/** CSV format panjang: Dimensi, Kategori, Jumlah, Persen. Satu berkas, mudah dipivot. */
export function buildStatisticCsv(data: StatisticsData): string {
  const rows: Cell[][] = [];
  for (const t of buildStatisticTables(data)) {
    if (t.sheet === "Perubahan Penduduk") {
      t.rows.forEach((r) => rows.push([t.title, r[0], r[5], ""]));
      continue;
    }
    if (t.sheet === "Usia") {
      for (const r of t.rows) {
        rows.push(["Usia (laki-laki)", r[0], r[1], ""], ["Usia (perempuan)", r[0], r[2], ""], ["Usia", r[0], r[3], r[4]]);
      }
      continue;
    }
    t.rows.forEach((r) => rows.push([t.title, r[0], r[1], r[2]]));
  }
  return toCsv(["Dimensi", "Kategori", "Jumlah", "Persen (%)"], rows);
}

export const RESIDENT_EXPORT_HEADER = [
  "No",
  "Nama",
  "NIK",
  "No. KK",
  "Jenis Kelamin",
  "Tanggal Lahir",
  "Usia",
  "Pekerjaan",
  "Status Perkawinan",
  "Agama",
  "Pendidikan",
  "Golongan Darah",
  "Dusun",
  "RT",
  "RW",
] as const;
